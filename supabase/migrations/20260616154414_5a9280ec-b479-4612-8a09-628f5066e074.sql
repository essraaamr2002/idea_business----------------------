
-- otp_codes: explicit deny-by-default for end-users (service_role still bypasses RLS).
DROP POLICY IF EXISTS otp_codes_service_only_read ON public.otp_codes;
CREATE POLICY otp_codes_service_only_read ON public.otp_codes
  FOR SELECT TO authenticated USING (false);

-- project_guarantees: forbid clients from writing raw passport/phone in clear text.
-- They must go through a server function that AES-encrypts the values first.
CREATE OR REPLACE FUNCTION public.protect_project_guarantees_sensitive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_service boolean := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role', false);
BEGIN
  IF NOT is_service THEN
    -- block raw PII writes from end-users
    IF TG_OP = 'INSERT' THEN
      NEW.guarantor_passport := NULL;
      NEW.guarantor_phone    := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.guarantor_passport := OLD.guarantor_passport;
      NEW.guarantor_phone    := OLD.guarantor_phone;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_project_guarantees_sensitive ON public.project_guarantees;
CREATE TRIGGER trg_protect_project_guarantees_sensitive
  BEFORE INSERT OR UPDATE ON public.project_guarantees
  FOR EACH ROW EXECUTE FUNCTION public.protect_project_guarantees_sensitive();
