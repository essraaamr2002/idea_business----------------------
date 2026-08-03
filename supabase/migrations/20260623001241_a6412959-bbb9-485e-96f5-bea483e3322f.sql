DROP POLICY IF EXISTS profiles_public_display_read ON public.profiles;

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_barrier = true, security_invoker = true)
AS
SELECT
  id,
  display_name,
  alias_name,
  pseudonym,
  avatar_url,
  bio,
  city,
  country,
  verified_blue,
  verified_green,
  membership,
  followers_count,
  created_at
FROM public.profiles
WHERE is_public_profile = true;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

COMMENT ON VIEW public.public_profiles IS
  'Public-safe projection of profiles. Excludes phone, whatsapp, DOB, KYC, financials, national_id, nationality, occupation.';
