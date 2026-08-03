
-- ============ Fraud Detection Engine ============
CREATE OR REPLACE FUNCTION public.evaluate_fraud_risk(
  p_user_id uuid,
  p_amount_minor bigint,
  p_ip text DEFAULT NULL
) RETURNS TABLE(score int, decision text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prof public.user_security_profiles;
  s int := 0;
  recent_count int;
  recent_sum bigint;
  d text;
BEGIN
  SELECT * INTO prof FROM public.user_security_profiles WHERE user_id = p_user_id;
  IF prof.user_id IS NULL THEN
    INSERT INTO public.user_security_profiles(user_id, last_ip, trust_score, last_seen)
    VALUES (p_user_id, p_ip, 50, now());
    s := s + 20; -- new profile
  ELSE
    IF prof.suspended_until IS NOT NULL AND prof.suspended_until > now() THEN
      RETURN QUERY SELECT 100, 'BLOCK_AND_SUSPEND'::text; RETURN;
    END IF;
    IF p_ip IS NOT NULL AND prof.last_ip IS NOT NULL AND p_ip <> prof.last_ip THEN s := s + 50; END IF;
    UPDATE public.user_security_profiles SET last_ip = COALESCE(p_ip, last_ip), last_seen = now() WHERE user_id = p_user_id;
  END IF;

  -- Velocity: > 5 outflows in last 10 minutes
  SELECT count(*), COALESCE(sum(abs(amount)),0) INTO recent_count, recent_sum
  FROM public.ledger
  WHERE user_id = p_user_id AND created_at > now() - INTERVAL '10 minutes' AND amount < 0;
  IF recent_count > 5 THEN s := s + 40; END IF;
  IF recent_sum > 5000000 THEN s := s + 30; END IF; -- > 50,000 minor units in 10m
  IF p_amount_minor > 10000000 THEN s := s + 20; END IF; -- big single tx

  IF s >= 90 THEN d := 'BLOCK_AND_SUSPEND';
  ELSIF s >= 60 THEN d := 'CHALLENGE_MFA';
  ELSE d := 'ALLOW';
  END IF;

  IF d = 'BLOCK_AND_SUSPEND' THEN
    UPDATE public.user_security_profiles
      SET suspended_until = now() + INTERVAL '1 hour', trust_score = GREATEST(0, trust_score - 30)
      WHERE user_id = p_user_id;
  END IF;

  RETURN QUERY SELECT s, d;
END $$;

REVOKE ALL ON FUNCTION public.evaluate_fraud_risk(uuid, bigint, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_fraud_risk(uuid, bigint, text) TO service_role;

-- ============ Payout Request ============
CREATE OR REPLACE FUNCTION public.request_payout(
  p_user_id uuid,
  p_channel text,
  p_destination_masked text,
  p_destination_enc text,
  p_amount_minor bigint,
  p_currency text DEFAULT 'SAR',
  p_ip text DEFAULT NULL
) RETURNS TABLE(payout_id uuid, status text, fraud_score int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bal bigint;
  fr record;
  new_id uuid;
  ref text;
BEGIN
  IF p_amount_minor <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF p_channel NOT IN ('vodafone_cash','barq','bank_iban') THEN RAISE EXCEPTION 'invalid channel'; END IF;

  SELECT (balance)::bigint INTO bal FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF bal IS NULL OR bal < p_amount_minor THEN RAISE EXCEPTION 'insufficient funds'; END IF;

  SELECT * INTO fr FROM public.evaluate_fraud_risk(p_user_id, p_amount_minor, p_ip);
  IF fr.decision = 'BLOCK_AND_SUSPEND' THEN
    RAISE EXCEPTION 'blocked_by_fraud_engine score=%', fr.score;
  END IF;

  -- Hold the funds: debit wallet, record ledger row
  UPDATE public.wallets SET balance = balance - p_amount_minor WHERE user_id = p_user_id;
  ref := 'payout-' || gen_random_uuid()::text;
  INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
  VALUES (p_user_id, -p_amount_minor, 'payout_hold', ref, bal, bal - p_amount_minor);

  INSERT INTO public.payout_requests(user_id, channel, destination_masked, destination_enc,
                                     amount_minor, currency, status, reference)
  VALUES (p_user_id, p_channel, p_destination_masked, p_destination_enc,
          p_amount_minor, p_currency,
          CASE WHEN fr.decision = 'CHALLENGE_MFA' THEN 'pending_mfa' ELSE 'pending' END,
          ref)
  RETURNING id INTO new_id;

  RETURN QUERY SELECT new_id, (CASE WHEN fr.decision = 'CHALLENGE_MFA' THEN 'pending_mfa' ELSE 'pending' END)::text, fr.score;
END $$;

REVOKE ALL ON FUNCTION public.request_payout(uuid,text,text,text,bigint,text,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_payout(uuid,text,text,text,bigint,text,text) TO service_role;

-- ============ Complete / Cancel Payout (admin only) ============
CREATE OR REPLACE FUNCTION public.complete_payout(
  p_payout_id uuid,
  p_success boolean,
  p_reason text DEFAULT NULL
) RETURNS public.payout_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pr public.payout_requests;
  bal bigint;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO pr FROM public.payout_requests WHERE id = p_payout_id FOR UPDATE;
  IF pr.id IS NULL THEN RAISE EXCEPTION 'payout not found'; END IF;
  IF pr.status NOT IN ('pending','pending_mfa') THEN RAISE EXCEPTION 'already finalized: %', pr.status; END IF;

  IF p_success THEN
    UPDATE public.payout_requests SET status='completed', reason=p_reason, updated_at=now() WHERE id = p_payout_id RETURNING * INTO pr;
    INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
    SELECT pr.user_id, 0, 'payout_settled', pr.reference,
           (SELECT balance::bigint FROM public.wallets WHERE user_id = pr.user_id),
           (SELECT balance::bigint FROM public.wallets WHERE user_id = pr.user_id);
  ELSE
    -- Refund the hold
    SELECT balance::bigint INTO bal FROM public.wallets WHERE user_id = pr.user_id FOR UPDATE;
    UPDATE public.wallets SET balance = balance + pr.amount_minor WHERE user_id = pr.user_id;
    INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
    VALUES (pr.user_id, pr.amount_minor, 'payout_refund', pr.reference, bal, bal + pr.amount_minor);
    UPDATE public.payout_requests SET status='failed', reason=p_reason, updated_at=now() WHERE id = p_payout_id RETURNING * INTO pr;
  END IF;
  RETURN pr;
END $$;

REVOKE ALL ON FUNCTION public.complete_payout(uuid, boolean, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payout(uuid, boolean, text) TO service_role;

-- ============ Fatora deposit processor (idempotent) ============
CREATE OR REPLACE FUNCTION public.process_fatora_deposit(
  p_user_id uuid,
  p_order_id text,
  p_amount_minor bigint,
  p_transaction_id text,
  p_currency text DEFAULT 'SAR'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing public.payment_intents;
  w public.wallets;
BEGIN
  IF p_amount_minor <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  SELECT * INTO existing FROM public.payment_intents WHERE order_id = p_order_id;
  IF existing.id IS NOT NULL AND existing.status = 'succeeded' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true);
  END IF;

  IF existing.id IS NULL THEN
    INSERT INTO public.payment_intents(user_id, provider, order_id, amount, currency, purpose, status, transaction_id)
    VALUES (p_user_id, 'fatora', p_order_id, (p_amount_minor::numeric)/100, p_currency, 'wallet_topup', 'succeeded', p_transaction_id);
  ELSE
    UPDATE public.payment_intents SET status='succeeded', transaction_id=p_transaction_id, updated_at=now() WHERE id=existing.id;
  END IF;

  SELECT * INTO w FROM public.wallet_deposit(p_user_id, p_amount_minor, 'fatora:' || p_order_id);
  RETURN jsonb_build_object('ok', true, 'balance', w.balance);
END $$;

REVOKE ALL ON FUNCTION public.process_fatora_deposit(uuid, text, bigint, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_fatora_deposit(uuid, text, bigint, text, text) TO service_role;
