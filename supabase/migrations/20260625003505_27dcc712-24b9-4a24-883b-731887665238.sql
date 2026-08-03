
-- ============================================================
-- 1) Extend wallets
-- ============================================================
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS wallet_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS kyc_tier text NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS pin_failed_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS self_frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS self_frozen_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_status_chk') THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_status_chk
      CHECK (status IN ('pending','active','suspended','frozen','closed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_kyc_tier_chk') THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_kyc_tier_chk
      CHECK (kyc_tier IN ('basic','enhanced','high_value'));
  END IF;
END $$;

-- Backfill wallet_code for existing rows
UPDATE public.wallets
  SET wallet_code = 'IDB-' || lpad(((floor(random()*100000000))::bigint)::text, 8, '0')
  WHERE wallet_code IS NULL;

-- ============================================================
-- 2) Helper: ISO 13616 IBAN with MOD-97 (Saudi format)
-- ============================================================
CREATE OR REPLACE FUNCTION public.wallet_generate_iban()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bank_code text := '8888'; -- internal pseudo bank code
  acct text;
  bban text;
  rearranged text;
  numeric_iban text;
  ch text; i int; n int;
  remainder int := 0;
  check_digits int;
BEGIN
  acct := lpad(((floor(random()*100000000000000))::bigint)::text, 14, '0');
  bban := bank_code || acct; -- 18 chars
  -- Move country code + 00 to the end, replace letters by digits (A=10..Z=35)
  rearranged := bban || 'SA' || '00';
  numeric_iban := '';
  FOR i IN 1..length(rearranged) LOOP
    ch := substr(rearranged, i, 1);
    IF ch ~ '[0-9]' THEN
      numeric_iban := numeric_iban || ch;
    ELSE
      numeric_iban := numeric_iban || (ascii(ch) - 55)::text; -- A=10
    END IF;
  END LOOP;
  -- MOD-97 over a long numeric string, process in chunks
  remainder := 0;
  FOR i IN 1..length(numeric_iban) LOOP
    n := substr(numeric_iban, i, 1)::int;
    remainder := (remainder * 10 + n) % 97;
  END LOOP;
  check_digits := 98 - remainder;
  RETURN 'SA' || lpad(check_digits::text, 2, '0') || bban;
END $$;

-- Backfill virtual_iban for wallets that don't have an SA-format one
UPDATE public.wallets
  SET virtual_iban = public.wallet_generate_iban()
  WHERE virtual_iban IS NULL OR virtual_iban NOT LIKE 'SA%';

-- ============================================================
-- 3) deposit_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'SAR',
  reference_code text NOT NULL UNIQUE,
  sender_iban_masked text,
  status text NOT NULL DEFAULT 'pending',
  method text NOT NULL DEFAULT 'bank_transfer', -- bank_transfer | gateway
  gateway_provider text,
  gateway_intent_id text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  confirmed_by uuid REFERENCES auth.users(id),
  confirmed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('pending','awaiting_admin','confirmed','rejected','expired','cancelled'))
);

GRANT SELECT, INSERT, UPDATE ON public.deposit_requests TO authenticated;
GRANT ALL ON public.deposit_requests TO service_role;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own deposits" ON public.deposit_requests
  FOR SELECT TO authenticated USING (wallet_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'accountant'::app_role));
CREATE POLICY "admin updates deposits" ON public.deposit_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'accountant'::app_role));

CREATE INDEX IF NOT EXISTS idx_deposit_requests_user ON public.deposit_requests(wallet_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON public.deposit_requests(status, created_at DESC);

-- ============================================================
-- 4) aml_flags
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aml_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_ref text,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_detected_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  resolution text,
  CHECK (severity IN ('low','medium','high','critical')),
  CHECK (status IN ('open','reviewing','cleared','escalated','reported'))
);

GRANT SELECT, INSERT, UPDATE ON public.aml_flags TO authenticated;
GRANT ALL ON public.aml_flags TO service_role;
ALTER TABLE public.aml_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin reads aml" ON public.aml_flags
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin updates aml" ON public.aml_flags
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "system insert aml" ON public.aml_flags
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_aml_status ON public.aml_flags(status, severity, auto_detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_aml_user ON public.aml_flags(wallet_user_id, auto_detected_at DESC);

-- ============================================================
-- 5) PIN management
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.wallet_set_pin(p_old_pin text, p_new_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); w public.wallets;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_new_pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'pin_format_invalid'; END IF;
  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF w.user_id IS NULL THEN RAISE EXCEPTION 'wallet_not_found'; END IF;
  IF w.pin_hash IS NOT NULL THEN
    IF p_old_pin IS NULL OR public.crypt(p_old_pin, w.pin_hash) <> w.pin_hash THEN
      RAISE EXCEPTION 'old_pin_incorrect';
    END IF;
  END IF;
  UPDATE public.wallets
    SET pin_hash = public.crypt(p_new_pin, public.gen_salt('bf', 10)),
        pin_failed_count = 0,
        pin_locked_until = NULL
    WHERE user_id = uid;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.wallet_verify_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); w public.wallets;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF w.pin_hash IS NULL THEN RAISE EXCEPTION 'pin_not_set'; END IF;
  IF w.pin_locked_until IS NOT NULL AND w.pin_locked_until > now() THEN
    RAISE EXCEPTION 'pin_locked_until_%', w.pin_locked_until;
  END IF;
  IF public.crypt(p_pin, w.pin_hash) = w.pin_hash THEN
    UPDATE public.wallets SET pin_failed_count = 0 WHERE user_id = uid;
    RETURN true;
  ELSE
    UPDATE public.wallets
      SET pin_failed_count = pin_failed_count + 1,
          pin_locked_until = CASE WHEN pin_failed_count + 1 >= 3 THEN now() + interval '15 minutes' ELSE pin_locked_until END
      WHERE user_id = uid;
    RETURN false;
  END IF;
END $$;

-- ============================================================
-- 6) Deposit request creation + admin confirm
-- ============================================================
CREATE OR REPLACE FUNCTION public.wallet_create_deposit_request(p_amount_minor bigint, p_method text DEFAULT 'bank_transfer')
RETURNS public.deposit_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); ref text; row public.deposit_requests;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_amount_minor < 100 THEN RAISE EXCEPTION 'amount_too_small'; END IF;
  IF p_method NOT IN ('bank_transfer','gateway') THEN RAISE EXCEPTION 'invalid_method'; END IF;
  ref := 'DEP-' || to_char(now(),'YYYYMMDD') || '-' || lpad(((floor(random()*1000000000))::bigint)::text, 9, '0');
  INSERT INTO public.deposit_requests(wallet_user_id, amount_minor, reference_code, method, status)
    VALUES (uid, p_amount_minor, ref, p_method,
            CASE WHEN p_method='bank_transfer' THEN 'awaiting_admin' ELSE 'pending' END)
    RETURNING * INTO row;
  RETURN row;
END $$;

CREATE OR REPLACE FUNCTION public.wallet_admin_confirm_deposit(p_request_id uuid, p_sender_iban_masked text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE req public.deposit_requests; bal_before bigint;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'accountant'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO req FROM public.deposit_requests WHERE id = p_request_id FOR UPDATE;
  IF req.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF req.status NOT IN ('awaiting_admin','pending') THEN RAISE EXCEPTION 'invalid_state: %', req.status; END IF;
  IF req.expires_at < now() THEN
    UPDATE public.deposit_requests SET status='expired' WHERE id = p_request_id;
    RAISE EXCEPTION 'expired';
  END IF;

  SELECT (balance*100)::bigint INTO bal_before FROM public.wallets WHERE user_id = req.wallet_user_id FOR UPDATE;
  UPDATE public.wallets
    SET balance = balance + (req.amount_minor::numeric / 100.0),
        last_activity_at = now()
    WHERE user_id = req.wallet_user_id;
  INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
    VALUES (req.wallet_user_id, req.amount_minor, 'deposit', req.reference_code,
            bal_before, bal_before + req.amount_minor);
  UPDATE public.deposit_requests
    SET status='confirmed', confirmed_by=auth.uid(), confirmed_at=now(),
        sender_iban_masked = COALESCE(p_sender_iban_masked, sender_iban_masked)
    WHERE id = p_request_id;
  PERFORM public.log_admin_action('deposit.confirm','deposit_requests', p_request_id::text,
    jsonb_build_object('amount_minor', req.amount_minor, 'user', req.wallet_user_id));
  RETURN jsonb_build_object('ok', true, 'amount_minor', req.amount_minor);
END $$;

-- ============================================================
-- 7) P2P transfer with PIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.wallet_p2p_transfer(p_to_user uuid, p_amount_minor bigint, p_pin text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); ref text; pin_ok boolean; w_to public.wallets;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_to_user = uid THEN RAISE EXCEPTION 'self_transfer_forbidden'; END IF;
  IF p_amount_minor < 100 THEN RAISE EXCEPTION 'amount_too_small'; END IF;

  SELECT * INTO w_to FROM public.wallets WHERE user_id = p_to_user;
  IF w_to.user_id IS NULL THEN RAISE EXCEPTION 'recipient_not_found'; END IF;
  IF w_to.status <> 'active' THEN RAISE EXCEPTION 'recipient_not_active'; END IF;

  pin_ok := public.wallet_verify_pin(p_pin);
  IF NOT pin_ok THEN RAISE EXCEPTION 'pin_incorrect'; END IF;

  ref := 'TXN-' || to_char(now(),'YYYYMMDD') || '-' || lpad(((floor(random()*1000000000))::bigint)::text, 9, '0');
  PERFORM public.wallet_transfer(uid, p_to_user, p_amount_minor, ref, 'wallet_transfer');

  UPDATE public.wallets SET last_activity_at = now() WHERE user_id IN (uid, p_to_user);

  -- notify recipient
  INSERT INTO public.notifications(user_id, type, title, body, data)
    VALUES (p_to_user, 'wallet_credit', 'استلمت تحويلاً',
            'تم استلام مبلغ في محفظتك',
            jsonb_build_object('amount_minor', p_amount_minor, 'reference', ref, 'note', p_note));
  INSERT INTO public.notifications(user_id, type, title, body, data)
    VALUES (uid, 'wallet_debit', 'تم تحويل المبلغ',
            'تم خصم المبلغ من محفظتك',
            jsonb_build_object('amount_minor', p_amount_minor, 'reference', ref));

  RETURN jsonb_build_object('ok', true, 'reference', ref);
END $$;

-- ============================================================
-- 8) Self freeze / unfreeze
-- ============================================================
CREATE OR REPLACE FUNCTION public.wallet_freeze_self(p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  UPDATE public.wallets
    SET self_frozen = true, self_frozen_at = now(), status = 'frozen'
    WHERE user_id = uid;
  INSERT INTO public.security_events(user_id, event_type, severity, resource, details, blocked)
    VALUES (uid, 'wallet.self_freeze', 'high', 'wallet', jsonb_build_object('reason', p_reason), true);
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.wallet_unfreeze_self(p_otp text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  -- Accept any 6-digit string here; OTP issuance/verification is handled in app-layer
  IF p_otp !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'otp_invalid'; END IF;
  UPDATE public.wallets
    SET self_frozen = false, self_frozen_at = NULL, status = 'active'
    WHERE user_id = uid AND self_frozen = true;
  INSERT INTO public.security_events(user_id, event_type, severity, resource, details, blocked)
    VALUES (uid, 'wallet.self_unfreeze', 'info', 'wallet', '{}'::jsonb, false);
  RETURN jsonb_build_object('ok', true);
END $$;

-- ============================================================
-- 9) Lightweight AML check (called from app layer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.wallet_aml_scan(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE flags int := 0; v_count int; v_sum bigint;
BEGIN
  -- Velocity: >10 outgoing tx in last hour
  SELECT count(*) INTO v_count FROM public.ledger
    WHERE user_id = p_user_id AND amount < 0 AND created_at > now() - interval '1 hour';
  IF v_count > 10 THEN
    INSERT INTO public.aml_flags(wallet_user_id, flag_type, severity, details)
      VALUES (p_user_id, 'velocity_outflow_hourly', 'high', jsonb_build_object('count', v_count));
    flags := flags + 1;
  END IF;

  -- Structuring: many tx just below 10,000 SAR (1,000,000 minor) in 24h
  SELECT count(*), COALESCE(sum(abs(amount)),0) INTO v_count, v_sum
    FROM public.ledger
    WHERE user_id = p_user_id AND amount < 0
      AND abs(amount) BETWEEN 800000 AND 999900
      AND created_at > now() - interval '24 hours';
  IF v_count >= 3 THEN
    INSERT INTO public.aml_flags(wallet_user_id, flag_type, severity, details)
      VALUES (p_user_id, 'structuring_suspected', 'critical', jsonb_build_object('count', v_count, 'sum_minor', v_sum));
    flags := flags + 1;
  END IF;
  RETURN flags;
END $$;
