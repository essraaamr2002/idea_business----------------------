ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_full_name text;

CREATE OR REPLACE FUNCTION public.apply_kyc_approval_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF NEW.status IN ('approved','verified') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    v_name := COALESCE(NULLIF(btrim(NEW.extracted_name), ''), NULLIF(btrim(NEW.pledge_full_name), ''));
    UPDATE public.profiles
       SET legal_full_name = COALESCE(v_name, legal_full_name),
           display_name    = CASE
                               WHEN use_alias_default = true AND alias_name IS NOT NULL AND btrim(alias_name) <> ''
                                 THEN display_name
                               WHEN v_name IS NOT NULL THEN v_name
                               ELSE display_name
                             END,
           verified_green  = true,
           kyc_status      = 'verified'::public.kyc_status,
           updated_at      = now()
     WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_kyc_approval_to_profile ON public.kyc_verifications;
CREATE TRIGGER trg_apply_kyc_approval_to_profile
AFTER INSERT OR UPDATE OF status ON public.kyc_verifications
FOR EACH ROW EXECUTE FUNCTION public.apply_kyc_approval_to_profile();

UPDATE public.profiles p
   SET legal_full_name = COALESCE(p.legal_full_name, NULLIF(btrim(k.extracted_name), ''), NULLIF(btrim(k.pledge_full_name), '')),
       display_name    = CASE
                           WHEN p.use_alias_default = true AND p.alias_name IS NOT NULL AND btrim(p.alias_name) <> ''
                             THEN p.display_name
                           ELSE COALESCE(NULLIF(btrim(k.extracted_name), ''), NULLIF(btrim(k.pledge_full_name), ''), p.display_name)
                         END,
       verified_green  = true,
       kyc_status      = 'verified'::public.kyc_status
  FROM public.kyc_verifications k
 WHERE k.user_id = p.id
   AND k.status IN ('approved','verified');