CREATE OR REPLACE FUNCTION public.protect_profiles_privileged_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE is_service boolean := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role', false);
BEGIN
  IF TG_OP = 'INSERT' AND NOT is_service THEN
    NEW.kyc_status := 'unverified';
    NEW.verified_blue := false;
    NEW.verified_green := false;
    NEW.membership := 'basic';
    NEW.membership_expires_at := NULL;
    NEW.followers_count := 0;
  ELSIF TG_OP = 'UPDATE' AND NOT is_service THEN
    NEW.kyc_status := OLD.kyc_status;
    NEW.kyc_document_url := OLD.kyc_document_url;
    NEW.kyc_selfie_url := OLD.kyc_selfie_url;
    NEW.verified_blue := OLD.verified_blue;
    NEW.verified_green := OLD.verified_green;
    NEW.membership := OLD.membership;
    NEW.membership_expires_at := OLD.membership_expires_at;
    NEW.followers_count := OLD.followers_count;
  END IF;
  RETURN NEW;
END $$;