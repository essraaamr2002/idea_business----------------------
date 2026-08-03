
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_public_profile boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pseudonym text;

DROP POLICY IF EXISTS "profiles_public_display_read" ON public.profiles;
CREATE POLICY "profiles_public_display_read" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (is_public_profile = true);

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, display_name, pseudonym, bio, avatar_url, country, city,
  occupation, nationality, verified_green, verified_blue,
  followers_count, is_public_profile, membership, membership_expires_at,
  points, alias_name, use_alias_default, show_whatsapp,
  created_at, updated_at
) ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.profiles WHERE id = auth.uid() LIMIT 1; $$;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_profile(_user_id uuid)
RETURNS SETOF public.profiles
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.profiles WHERE id = _user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE (
  id uuid, display_name text, pseudonym text, bio text, avatar_url text,
  country text, city text, occupation text, nationality text,
  verified_green boolean, verified_blue boolean,
  followers_count integer, membership text, points integer, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, COALESCE(p.pseudonym, p.display_name) AS display_name,
         p.pseudonym, p.bio, p.avatar_url, p.country, p.city,
         p.occupation, p.nationality, p.verified_green, p.verified_blue,
         p.followers_count, p.membership::text, p.points, p.created_at
  FROM public.profiles p
  WHERE p.id = _user_id AND (p.is_public_profile = true OR p.id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.project_purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shares integer NOT NULL CHECK (shares > 0),
  price_per_share numeric NOT NULL CHECK (price_per_share > 0),
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  currency text NOT NULL DEFAULT 'SAR',
  message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','paid','cancelled','completed')),
  response_note text,
  responded_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ppr_owner ON public.project_purchase_requests(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_ppr_buyer ON public.project_purchase_requests(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_ppr_project ON public.project_purchase_requests(project_id);

GRANT SELECT, INSERT, UPDATE ON public.project_purchase_requests TO authenticated;
GRANT ALL ON public.project_purchase_requests TO service_role;
ALTER TABLE public.project_purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ppr_parties_read" ON public.project_purchase_requests
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ppr_buyer_create" ON public.project_purchase_requests
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid() AND buyer_id <> owner_id);
CREATE POLICY "ppr_parties_update" ON public.project_purchase_requests
  FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (buyer_id = auth.uid() OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_ppr_updated_at BEFORE UPDATE ON public.project_purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_user_public_projects(_user_id uuid)
RETURNS TABLE (
  id uuid, name text, ticker text, description text, cover_image_url text,
  sector text, country text, city text, currency text,
  share_price numeric, current_price numeric, shares_total integer, shares_sold integer,
  funding_mode text, target_investment numeric, status text,
  views_count integer, likes_count integer, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.name, p.ticker, p.description, p.cover_image_url,
         p.sector, p.country, p.city, p.currency,
         p.share_price, p.current_price, p.shares_total, p.shares_sold,
         p.funding_mode::text, p.target_investment, p.status::text,
         p.views_count, p.likes_count, p.created_at
  FROM public.projects p
  WHERE p.owner_id = _user_id AND p.status::text IN ('approved','active','funded','listed');
$$;
GRANT EXECUTE ON FUNCTION public.get_user_public_projects(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_user_recent_posts(_user_id uuid, _limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid, content text, media_urls text[], hashtags text[],
  likes_count integer, comments_count integer, shares_count integer,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cp.id, cp.content, cp.media_urls, cp.hashtags,
         COALESCE(cp.likes_count,0), COALESCE(cp.comments_count,0),
         COALESCE(cp.shares_count,0), cp.created_at
  FROM public.community_posts cp
  WHERE cp.user_id = _user_id AND cp.status::text = 'published'
  ORDER BY cp.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 50));
$$;
GRANT EXECUTE ON FUNCTION public.get_user_recent_posts(uuid, integer) TO anon, authenticated;
