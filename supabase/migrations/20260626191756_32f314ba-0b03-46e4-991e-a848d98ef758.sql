
ALTER TABLE public.profiles ALTER COLUMN is_public_profile SET DEFAULT true;
UPDATE public.profiles SET is_public_profile = true WHERE is_public_profile IS DISTINCT FROM true;

CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
 RETURNS TABLE(id uuid, display_name text, pseudonym text, bio text, avatar_url text, country text, city text, occupation text, nationality text, verified_green boolean, verified_blue boolean, followers_count integer, membership text, points integer, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, COALESCE(p.pseudonym, p.display_name) AS display_name,
         p.pseudonym, p.bio, p.avatar_url, p.country, p.city,
         p.occupation, p.nationality, p.verified_green, p.verified_blue,
         p.followers_count, p.membership::text, p.points, p.created_at
  FROM public.profiles p
  WHERE p.id = _user_id
    AND (p.is_public_profile IS DISTINCT FROM false OR p.id = auth.uid());
$function$;
