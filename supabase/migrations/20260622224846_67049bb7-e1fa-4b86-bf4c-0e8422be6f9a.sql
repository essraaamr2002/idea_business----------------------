
-- Extend the protective trigger on profiles to lock all sensitive privilege columns.
CREATE OR REPLACE FUNCTION public.protect_profile_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_service boolean := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role', false);
  is_admin boolean := COALESCE(public.has_role(auth.uid(), 'admin'::app_role), false);
BEGIN
  IF TG_OP = 'INSERT' AND NOT is_service THEN
    NEW.points := 0;
    NEW.membership := 'basic';
    NEW.membership_expires_at := NULL;
    NEW.kyc_status := COALESCE(OLD.kyc_status, 'unverified');
    NEW.verified_green := false;
    NEW.verified_blue := false;
  ELSIF TG_OP = 'UPDATE' AND NOT is_service AND NOT is_admin THEN
    -- Regular users cannot self-assign privilege fields.
    NEW.points := OLD.points;
    NEW.membership := OLD.membership;
    NEW.membership_expires_at := OLD.membership_expires_at;
    NEW.kyc_status := OLD.kyc_status;
    NEW.verified_green := OLD.verified_green;
    NEW.verified_blue := OLD.verified_blue;
    NEW.followers_count := OLD.followers_count;
  END IF;
  RETURN NEW;
END $function$;
