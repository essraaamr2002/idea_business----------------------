
-- ============================================================
-- 1) IBAN: MOD-97 validation + self-generator (ISO 13616/7064)
-- ============================================================

CREATE OR REPLACE FUNCTION public.iban_letter_to_digits(p_iban text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  s text := upper(regexp_replace(p_iban, '\s', '', 'g'));
  out text := '';
  ch text;
  code int;
BEGIN
  FOR i IN 1..length(s) LOOP
    ch := substr(s, i, 1);
    IF ch ~ '[0-9]' THEN
      out := out || ch;
    ELSIF ch ~ '[A-Z]' THEN
      code := ascii(ch) - ascii('A') + 10;
      out := out || code::text;
    ELSE
      RAISE EXCEPTION 'Invalid IBAN character: %', ch;
    END IF;
  END LOOP;
  RETURN out;
END $$;

CREATE OR REPLACE FUNCTION public.validate_iban_mod97(p_iban text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  s text := upper(regexp_replace(p_iban, '\s', '', 'g'));
  rearranged text;
  numeric_str text;
  remainder bigint := 0;
  chunk text;
BEGIN
  IF s !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]+$' THEN RETURN false; END IF;
  IF length(s) < 15 OR length(s) > 34 THEN RETURN false; END IF;
  rearranged := substr(s, 5) || substr(s, 1, 4);
  numeric_str := public.iban_letter_to_digits(rearranged);
  -- Process in chunks to keep within bigint range
  FOR i IN 1..length(numeric_str) BY 9 LOOP
    chunk := remainder::text || substr(numeric_str, i, 9);
    remainder := chunk::bigint % 97;
  END LOOP;
  RETURN remainder = 1;
END $$;

-- Generates a mathematically valid Saudi IBAN: SA + 2 check digits + 2 bank + 18 account
CREATE OR REPLACE FUNCTION public.generate_self_iban(p_country text DEFAULT 'SA')
RETURNS text LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  bank_code text := 'ID';                -- "IDEA" bank identifier (2 letters)
  account text := '';
  base text;                              -- country + '00' + bank + account
  rearr text;
  numeric_str text;
  remainder bigint := 0;
  chunk text;
  check_digits int;
  candidate text;
BEGIN
  -- 18-digit random account number
  FOR i IN 1..18 LOOP
    account := account || floor(random() * 10)::int::text;
  END LOOP;
  base := upper(p_country) || '00' || bank_code || account;
  -- Move first 4 chars to the end, replace check digits with 00
  rearr := substr(base, 5) || substr(base, 1, 2) || '00';
  numeric_str := public.iban_letter_to_digits(rearr);
  FOR i IN 1..length(numeric_str) BY 9 LOOP
    chunk := remainder::text || substr(numeric_str, i, 9);
    remainder := chunk::bigint % 97;
  END LOOP;
  check_digits := 98 - remainder;
  candidate := upper(p_country) || lpad(check_digits::text, 2, '0') || bank_code || account;
  -- Self-check
  IF NOT public.validate_iban_mod97(candidate) THEN
    RAISE EXCEPTION 'IBAN self-check failed for %', candidate;
  END IF;
  RETURN candidate;
END $$;

REVOKE ALL ON FUNCTION public.generate_self_iban(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_iban_mod97(text) TO authenticated, anon;

-- ============================================================
-- 2) Hash Chain on ledger
-- ============================================================

ALTER TABLE public.ledger
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS current_hash text;

CREATE OR REPLACE FUNCTION public.ledger_hash_chain()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  last_hash text;
  payload text;
BEGIN
  SELECT current_hash INTO last_hash
    FROM public.ledger
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  NEW.prev_hash := COALESCE(last_hash, repeat('0', 64));
  payload := COALESCE(NEW.user_id::text,'') || '|' ||
             COALESCE(NEW.amount::text,'')  || '|' ||
             COALESCE(NEW.type,'')          || '|' ||
             COALESCE(NEW.reference,'')     || '|' ||
             COALESCE(NEW.balance_before::text,'') || '|' ||
             COALESCE(NEW.balance_after::text,'')  || '|' ||
             NEW.prev_hash;
  NEW.current_hash := encode(digest(payload, 'sha256'), 'hex');
  RETURN NEW;
END $$;

-- pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS ledger_hash_chain_trg ON public.ledger;
CREATE TRIGGER ledger_hash_chain_trg
  BEFORE INSERT ON public.ledger
  FOR EACH ROW EXECUTE FUNCTION public.ledger_hash_chain();

CREATE OR REPLACE FUNCTION public.verify_ledger_integrity(p_user_id uuid)
RETURNS TABLE(secure boolean, tampered_id uuid) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  expected text := repeat('0', 64);
  calc text;
  payload text;
BEGIN
  FOR r IN
    SELECT id, user_id, amount, type, reference, balance_before, balance_after, prev_hash, current_hash
    FROM public.ledger WHERE user_id = p_user_id
    ORDER BY created_at ASC, id ASC
  LOOP
    payload := COALESCE(r.user_id::text,'') || '|' ||
               COALESCE(r.amount::text,'')  || '|' ||
               COALESCE(r.type,'')          || '|' ||
               COALESCE(r.reference,'')     || '|' ||
               COALESCE(r.balance_before::text,'') || '|' ||
               COALESCE(r.balance_after::text,'')  || '|' ||
               COALESCE(r.prev_hash,'');
    calc := encode(digest(payload, 'sha256'), 'hex');
    IF r.prev_hash IS DISTINCT FROM expected OR r.current_hash IS DISTINCT FROM calc THEN
      RETURN QUERY SELECT false, r.id; RETURN;
    END IF;
    expected := r.current_hash;
  END LOOP;
  RETURN QUERY SELECT true, NULL::uuid;
END $$;

GRANT EXECUTE ON FUNCTION public.verify_ledger_integrity(uuid) TO authenticated;

-- ============================================================
-- 3) Self-IBAN generator wrapper (assigns to current user)
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_self_iban(p_user_id uuid, p_country text DEFAULT 'SA')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing text;
  new_iban text;
  tries int := 0;
BEGIN
  SELECT bank_iban INTO existing FROM public.wallets WHERE user_id = p_user_id;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  INSERT INTO public.wallets (user_id, virtual_iban)
  VALUES (p_user_id, 'IDEA' || gen_random_uuid()::text)
  ON CONFLICT (user_id) DO NOTHING;
  LOOP
    tries := tries + 1;
    new_iban := public.generate_self_iban(p_country);
    BEGIN
      UPDATE public.wallets
      SET bank_iban = new_iban,
          bank_iban_created_at = now(),
          bank_account_id = COALESCE(bank_account_id, 'SELF-' || substr(new_iban, 5))
      WHERE user_id = p_user_id;
      RETURN new_iban;
    EXCEPTION WHEN unique_violation THEN
      IF tries > 5 THEN RAISE; END IF;
    END;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.assign_self_iban(uuid, text) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4) user_security_profiles (fraud detection)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_security_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_ip text,
  device_fingerprint text,
  trust_score int NOT NULL DEFAULT 100,
  suspended_until timestamptz,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_security_profiles TO authenticated;
GRANT ALL ON public.user_security_profiles TO service_role;
ALTER TABLE public.user_security_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sec_self_read ON public.user_security_profiles;
CREATE POLICY sec_self_read ON public.user_security_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sec_admin_all ON public.user_security_profiles;
CREATE POLICY sec_admin_all ON public.user_security_profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- 5) payout_requests (withdrawals to Vodafone Cash / Barq)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('vodafone_cash','barq','bank_iban')),
  destination_masked text NOT NULL,
  destination_enc text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed','failed','refunded')),
  reference text UNIQUE NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payout_requests_user_idx ON public.payout_requests(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payout_self_read ON public.payout_requests;
CREATE POLICY payout_self_read ON public.payout_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS payout_self_insert ON public.payout_requests;
CREATE POLICY payout_self_insert ON public.payout_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS payout_admin_all ON public.payout_requests;
CREATE POLICY payout_admin_all ON public.payout_requests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
