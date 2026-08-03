
-- ============================================================
-- COMPREHENSIVE SECURITY HARDENING
-- ============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. ENCRYPTION KEY STORAGE (service_role only)
CREATE SCHEMA IF NOT EXISTS _security;
REVOKE ALL ON SCHEMA _security FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA _security TO service_role;

CREATE TABLE IF NOT EXISTS _security.enc_keys (
  version int PRIMARY KEY,
  key bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON _security.enc_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON _security.enc_keys TO service_role;

INSERT INTO _security.enc_keys(version, key)
SELECT 1, gen_random_bytes(32)
WHERE NOT EXISTS (SELECT 1 FROM _security.enc_keys WHERE version=1);

-- Helper to fetch active key (SECURITY DEFINER, callers can't see the key)
CREATE OR REPLACE FUNCTION _security.get_active_key()
RETURNS bytea
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = _security
AS $$ SELECT key FROM _security.enc_keys ORDER BY version DESC LIMIT 1 $$;
REVOKE ALL ON FUNCTION _security.get_active_key() FROM PUBLIC, anon, authenticated;

-- Public-schema encrypt/decrypt wrappers
CREATE OR REPLACE FUNCTION public.encrypt_pii(p_plain text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, _security, extensions
AS $$
DECLARE k bytea;
BEGIN
  IF p_plain IS NULL THEN RETURN NULL; END IF;
  k := _security.get_active_key();
  RETURN encode(pgp_sym_encrypt(p_plain, encode(k,'hex')), 'base64');
END $$;
REVOKE ALL ON FUNCTION public.encrypt_pii(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.encrypt_pii(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.decrypt_pii(p_cipher text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, _security, extensions
AS $$
DECLARE k bytea;
BEGIN
  IF p_cipher IS NULL OR p_cipher = '' THEN RETURN NULL; END IF;
  k := _security.get_active_key();
  RETURN pgp_sym_decrypt(decode(p_cipher,'base64'), encode(k,'hex'));
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.decrypt_pii(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrypt_pii(text) TO service_role;

-- Owner-only decryption helpers
CREATE OR REPLACE FUNCTION public.decrypt_my_profile_pii()
RETURNS TABLE(phone text, date_of_birth text, national_id text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, _security, extensions
AS $$
DECLARE k bytea; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  k := _security.get_active_key();
  RETURN QUERY
  SELECT
    CASE WHEN p.phone_enc IS NULL THEN NULL ELSE pgp_sym_decrypt(decode(p.phone_enc,'base64'), encode(k,'hex')) END,
    CASE WHEN p.dob_enc   IS NULL THEN NULL ELSE pgp_sym_decrypt(decode(p.dob_enc,'base64'),   encode(k,'hex')) END,
    CASE WHEN p.national_id_enc IS NULL THEN NULL ELSE pgp_sym_decrypt(decode(p.national_id_enc,'base64'), encode(k,'hex')) END
  FROM public.profiles p WHERE p.id = uid;
END $$;
GRANT EXECUTE ON FUNCTION public.decrypt_my_profile_pii() TO authenticated;

-- 3. ENCRYPTED SHADOW COLUMNS (additive — no breaking changes)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_enc text,
  ADD COLUMN IF NOT EXISTS dob_enc text,
  ADD COLUMN IF NOT EXISTS national_id_enc text;

ALTER TABLE public.kyc_verifications
  ADD COLUMN IF NOT EXISTS national_id_enc text,
  ADD COLUMN IF NOT EXISTS document_url_enc text;

ALTER TABLE public.project_guarantees
  ADD COLUMN IF NOT EXISTS guarantor_passport_enc text,
  ADD COLUMN IF NOT EXISTS guarantor_phone_enc text;

ALTER TABLE public.product_orders
  ADD COLUMN IF NOT EXISTS customer_phone_enc text,
  ADD COLUMN IF NOT EXISTS customer_address_enc text;

-- Auto-encrypt trigger for profiles (encrypts new values into shadow cols)
CREATE OR REPLACE FUNCTION public.tg_encrypt_profile_pii()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, _security, extensions
AS $$
DECLARE k bytea;
BEGIN
  k := _security.get_active_key();
  IF NEW.phone IS NOT NULL AND NEW.phone IS DISTINCT FROM COALESCE(OLD.phone,'') THEN
    NEW.phone_enc := encode(pgp_sym_encrypt(NEW.phone, encode(k,'hex')), 'base64');
  END IF;
  IF NEW.date_of_birth IS NOT NULL AND NEW.date_of_birth IS DISTINCT FROM COALESCE(OLD.date_of_birth, '1900-01-01'::date) THEN
    NEW.dob_enc := encode(pgp_sym_encrypt(NEW.date_of_birth::text, encode(k,'hex')), 'base64');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_encrypt_profile_pii ON public.profiles;
CREATE TRIGGER trg_encrypt_profile_pii BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_encrypt_profile_pii();

-- Backfill existing plain values into encrypted columns (one-time)
UPDATE public.profiles SET phone_enc = public.encrypt_pii(phone) WHERE phone IS NOT NULL AND phone_enc IS NULL;
UPDATE public.profiles SET dob_enc = public.encrypt_pii(date_of_birth::text) WHERE date_of_birth IS NOT NULL AND dob_enc IS NULL;

-- ============================================================
-- 4. SECURITY EVENTS (SIEM-lite)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  ip text,
  country text,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  resource text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocked boolean NOT NULL DEFAULT false,
  user_agent text
);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON public.security_events(ip);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);

GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all security events"
  ON public.security_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users read their own security events"
  ON public.security_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Service role inserts security events"
  ON public.security_events FOR INSERT TO service_role WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text, p_severity text, p_resource text,
  p_details jsonb, p_blocked boolean, p_ip text, p_user_agent text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.security_events(user_id, ip, event_type, severity, resource, details, blocked, user_agent)
  VALUES (auth.uid(), p_ip, p_event_type, COALESCE(p_severity,'info'), p_resource, COALESCE(p_details,'{}'::jsonb), COALESCE(p_blocked,false), p_user_agent)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.log_security_event(text,text,text,jsonb,boolean,text,text) TO authenticated, service_role;

-- ============================================================
-- 5. IP BLOCKLIST (WAF data plane)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ip_blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL UNIQUE,
  reason text,
  blocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ip_blocklist_ip ON public.ip_blocklist(ip);

GRANT SELECT ON public.ip_blocklist TO authenticated;
GRANT ALL ON public.ip_blocklist TO service_role;

ALTER TABLE public.ip_blocklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage blocklist"
  ON public.ip_blocklist FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.is_ip_blocked(p_ip text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ip_blocklist
    WHERE ip = p_ip
      AND (blocked_until IS NULL OR blocked_until > now())
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_ip_blocked(text) TO anon, authenticated, service_role;

-- ============================================================
-- 6. WALLET SECURITY POLICIES + FIREWALL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_security_policies (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_limit_minor bigint NOT NULL DEFAULT 1000000,  -- 10,000 SAR/day default
  per_tx_limit_minor bigint NOT NULL DEFAULT 500000,  -- 5,000 SAR/tx default
  require_otp_above_minor bigint NOT NULL DEFAULT 100000, -- 1,000 SAR
  lockdown boolean NOT NULL DEFAULT false,
  lockdown_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wallet_security_policies TO authenticated;
GRANT ALL ON public.wallet_security_policies TO service_role;

ALTER TABLE public.wallet_security_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own wallet policy"
  ON public.wallet_security_policies FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage wallet policies"
  ON public.wallet_security_policies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Firewall function: call before any outflow
CREATE OR REPLACE FUNCTION public.enforce_wallet_guard(
  p_user_id uuid,
  p_amount_minor bigint,
  p_action text,
  p_ip text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pol public.wallet_security_policies;
  today_out bigint;
  block boolean := false;
  reason text;
BEGIN
  -- Load or create policy with defaults
  INSERT INTO public.wallet_security_policies(user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO pol FROM public.wallet_security_policies WHERE user_id = p_user_id;

  IF pol.lockdown THEN
    block := true; reason := COALESCE('lockdown: '||pol.lockdown_reason,'lockdown');
  ELSIF p_amount_minor > pol.per_tx_limit_minor THEN
    block := true; reason := 'per_tx_limit_exceeded';
  ELSE
    SELECT COALESCE(SUM(ABS(amount))::bigint,0) INTO today_out
      FROM public.ledger
     WHERE user_id = p_user_id
       AND amount < 0
       AND type IN ('payout_hold','payout','ad_spend','wallet_transfer','commission')
       AND created_at::date = CURRENT_DATE;
    IF today_out + p_amount_minor > pol.daily_limit_minor THEN
      block := true; reason := 'daily_limit_exceeded';
    END IF;
  END IF;

  -- IP blocked?
  IF NOT block AND p_ip IS NOT NULL AND public.is_ip_blocked(p_ip) THEN
    block := true; reason := 'ip_blocked';
  END IF;

  -- Log every check
  INSERT INTO public.security_events(user_id, ip, event_type, severity, resource, details, blocked)
  VALUES (
    p_user_id, p_ip,
    'wallet_guard.'||p_action,
    CASE WHEN block THEN 'high' ELSE 'info' END,
    'wallet',
    jsonb_build_object('amount_minor', p_amount_minor, 'reason', reason),
    block
  );

  IF block THEN
    RETURN jsonb_build_object('allowed', false, 'reason', reason);
  END IF;
  RETURN jsonb_build_object(
    'allowed', true,
    'require_otp', (p_amount_minor >= pol.require_otp_above_minor)
  );
END $$;
GRANT EXECUTE ON FUNCTION public.enforce_wallet_guard(uuid,bigint,text,text) TO authenticated, service_role;

-- Patch wallet_transfer & request_payout to invoke the guard
CREATE OR REPLACE FUNCTION public.wallet_transfer(p_from_user uuid, p_to_user uuid, p_amount_minor bigint, p_reference text, p_type text)
 RETURNS wallets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  w_from public.wallets; w_to public.wallets;
  bal_from_before bigint; bal_to_before bigint;
  guard jsonb;
BEGIN
  IF p_amount_minor <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF p_from_user = p_to_user THEN RAISE EXCEPTION 'cannot transfer to self'; END IF;

  -- Firewall guard
  guard := public.enforce_wallet_guard(p_from_user, p_amount_minor, 'transfer', NULL);
  IF NOT (guard->>'allowed')::boolean THEN
    RAISE EXCEPTION 'wallet_firewall_blocked: %', guard->>'reason';
  END IF;

  INSERT INTO public.wallets (user_id, virtual_iban) VALUES (p_to_user, 'IDEA' || gen_random_uuid()::text) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO bal_from_before FROM public.wallets WHERE user_id = p_from_user FOR UPDATE;
  IF bal_from_before IS NULL OR bal_from_before < p_amount_minor THEN RAISE EXCEPTION 'insufficient funds'; END IF;
  SELECT balance INTO bal_to_before FROM public.wallets WHERE user_id = p_to_user FOR UPDATE;
  UPDATE public.wallets SET balance = balance - p_amount_minor WHERE user_id = p_from_user RETURNING * INTO w_from;
  UPDATE public.wallets SET balance = balance + p_amount_minor WHERE user_id = p_to_user RETURNING * INTO w_to;
  INSERT INTO public.ledger (user_id, counterparty_id, amount, type, reference, balance_before, balance_after)
  VALUES (p_from_user, p_to_user, -p_amount_minor, p_type, p_reference, bal_from_before, w_from.balance);
  INSERT INTO public.ledger (user_id, counterparty_id, amount, type, reference, balance_before, balance_after)
  VALUES (p_to_user, p_from_user, p_amount_minor, p_type, p_reference, bal_to_before, w_to.balance);
  RETURN w_from;
END $function$;

CREATE OR REPLACE FUNCTION public.request_payout(p_user_id uuid, p_channel text, p_destination_masked text, p_destination_enc text, p_amount_minor bigint, p_currency text DEFAULT 'SAR'::text, p_ip text DEFAULT NULL::text)
 RETURNS TABLE(payout_id uuid, status text, fraud_score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  bal bigint; fr record; new_id uuid; ref text; guard jsonb;
BEGIN
  IF p_amount_minor <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF p_channel NOT IN ('vodafone_cash','barq','bank_iban') THEN RAISE EXCEPTION 'invalid channel'; END IF;

  -- Firewall guard FIRST
  guard := public.enforce_wallet_guard(p_user_id, p_amount_minor, 'payout', p_ip);
  IF NOT (guard->>'allowed')::boolean THEN
    RAISE EXCEPTION 'wallet_firewall_blocked: %', guard->>'reason';
  END IF;

  SELECT (balance)::bigint INTO bal FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF bal IS NULL OR bal < p_amount_minor THEN RAISE EXCEPTION 'insufficient funds'; END IF;

  SELECT * INTO fr FROM public.evaluate_fraud_risk(p_user_id, p_amount_minor, p_ip);
  IF fr.decision = 'BLOCK_AND_SUSPEND' THEN
    INSERT INTO public.security_events(user_id, ip, event_type, severity, resource, details, blocked)
      VALUES (p_user_id, p_ip, 'fraud.block_and_suspend', 'critical', 'payout', jsonb_build_object('score', fr.score, 'amount_minor', p_amount_minor), true);
    RAISE EXCEPTION 'blocked_by_fraud_engine score=%', fr.score;
  END IF;

  UPDATE public.wallets SET balance = balance - p_amount_minor WHERE user_id = p_user_id;
  ref := 'payout-' || gen_random_uuid()::text;
  INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
  VALUES (p_user_id, -p_amount_minor, 'payout_hold', ref, bal, bal - p_amount_minor);

  INSERT INTO public.payout_requests(user_id, channel, destination_masked, destination_enc,
                                     amount_minor, currency, status, reference)
  VALUES (p_user_id, p_channel, p_destination_masked, p_destination_enc,
          p_amount_minor, p_currency,
          CASE WHEN fr.decision = 'CHALLENGE_MFA' OR (guard->>'require_otp')::boolean THEN 'pending_mfa' ELSE 'pending' END,
          ref)
  RETURNING id INTO new_id;

  RETURN QUERY SELECT new_id,
    (CASE WHEN fr.decision = 'CHALLENGE_MFA' OR (guard->>'require_otp')::boolean THEN 'pending_mfa' ELSE 'pending' END)::text,
    fr.score;
END $function$;

-- Admin RPC: instant wallet lockdown
CREATE OR REPLACE FUNCTION public.admin_wallet_lockdown(p_user_id uuid, p_locked boolean, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.wallet_security_policies(user_id, lockdown, lockdown_reason)
    VALUES (p_user_id, p_locked, p_reason)
    ON CONFLICT (user_id) DO UPDATE SET lockdown = EXCLUDED.lockdown, lockdown_reason = EXCLUDED.lockdown_reason, updated_at = now();
  INSERT INTO public.security_events(user_id, event_type, severity, resource, details, blocked)
    VALUES (p_user_id, CASE WHEN p_locked THEN 'wallet.lockdown' ELSE 'wallet.unlock' END, 'high', 'wallet', jsonb_build_object('reason', p_reason, 'by', auth.uid()), p_locked);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_wallet_lockdown(uuid,boolean,text) TO authenticated;

-- Admin RPC: block IP
CREATE OR REPLACE FUNCTION public.admin_block_ip(p_ip text, p_reason text, p_minutes int DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.ip_blocklist(ip, reason, blocked_by, blocked_until)
    VALUES (p_ip, p_reason, auth.uid(),
            CASE WHEN p_minutes IS NULL THEN NULL ELSE now() + make_interval(mins => p_minutes) END)
    ON CONFLICT (ip) DO UPDATE SET reason = EXCLUDED.reason, blocked_until = EXCLUDED.blocked_until
    RETURNING id INTO v_id;
  INSERT INTO public.security_events(event_type, severity, resource, details, blocked, ip)
    VALUES ('waf.ip_blocked','high','ip', jsonb_build_object('reason',p_reason,'minutes',p_minutes), true, p_ip);
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_block_ip(text,text,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_unblock_ip(p_ip text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.ip_blocklist WHERE ip = p_ip;
  INSERT INTO public.security_events(event_type, severity, resource, details, blocked, ip)
    VALUES ('waf.ip_unblocked','info','ip','{}'::jsonb, false, p_ip);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_unblock_ip(text) TO authenticated;

-- Security stats RPC for dashboard
CREATE OR REPLACE FUNCTION public.security_stats_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'events_24h', (SELECT count(*) FROM public.security_events WHERE created_at > now() - interval '24 hours'),
    'blocked_24h', (SELECT count(*) FROM public.security_events WHERE blocked = true AND created_at > now() - interval '24 hours'),
    'critical_24h', (SELECT count(*) FROM public.security_events WHERE severity IN ('critical','high') AND created_at > now() - interval '24 hours'),
    'unique_ips_24h', (SELECT count(DISTINCT ip) FROM public.security_events WHERE ip IS NOT NULL AND created_at > now() - interval '24 hours'),
    'wallet_lockdowns', (SELECT count(*) FROM public.wallet_security_policies WHERE lockdown = true),
    'blocked_ips', (SELECT count(*) FROM public.ip_blocklist WHERE blocked_until IS NULL OR blocked_until > now()),
    'top_offending_ips', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('ip', ip, 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT ip, count(*) c FROM public.security_events
        WHERE blocked = true AND ip IS NOT NULL AND created_at > now() - interval '24 hours'
        GROUP BY ip ORDER BY count(*) DESC LIMIT 10
      ) t
    ),
    'top_event_types', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('event_type', event_type, 'count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT event_type, count(*) c FROM public.security_events
        WHERE created_at > now() - interval '24 hours'
        GROUP BY event_type ORDER BY count(*) DESC LIMIT 10
      ) t
    )
  ) INTO r;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.security_stats_overview() TO authenticated;
