CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  alias_name text,
  use_alias_default boolean,
  avatar_url text,
  verified_green boolean,
  verified_blue boolean,
  membership text,
  nationality text,
  country text,
  bio text,
  business_bio text,
  reputation_score integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    -- Respect "use_alias_default": never leak display_name when the user
    -- opted into an alias-only public identity.
    CASE WHEN COALESCE(p.use_alias_default, false) THEN NULL ELSE p.display_name END,
    p.alias_name,
    p.use_alias_default,
    p.avatar_url,
    p.verified_green,
    p.verified_blue,
    p.membership::text,
    p.nationality,
    p.country,
    p.bio,
    p.business_bio,
    COALESCE(p.reputation_score, 0)::int
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon, authenticated;