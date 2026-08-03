
-- 1. Project AI score & ROI columns
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS ai_score integer,
  ADD COLUMN IF NOT EXISTS ai_score_summary text,
  ADD COLUMN IF NOT EXISTS ai_score_at timestamptz,
  ADD COLUMN IF NOT EXISTS target_roi_pct numeric(5,2);

-- 2. Partnership flag on offers
ALTER TABLE public.investment_offers 
  ADD COLUMN IF NOT EXISTS is_partnership_request boolean NOT NULL DEFAULT false;

-- 3. Sector follows
CREATE TABLE IF NOT EXISTS public.sector_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sector text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sector)
);

GRANT SELECT, INSERT, DELETE ON public.sector_follows TO authenticated;
GRANT ALL ON public.sector_follows TO service_role;

ALTER TABLE public.sector_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage their own sector follows"
  ON public.sector_follows FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Trigger: notify sector followers on new project
CREATE OR REPLACE FUNCTION public.tg_notify_sector_followers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sector IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT sf.user_id,
         'project_sector',
         'مشروع جديد في قطاع ' || NEW.sector,
         COALESCE(NEW.name, 'مشروع جديد'),
         jsonb_build_object('project_id', NEW.id, 'sector', NEW.sector)
  FROM public.sector_follows sf
  WHERE sf.sector = NEW.sector AND sf.user_id <> NEW.owner_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_sector_followers ON public.projects;
CREATE TRIGGER trg_notify_sector_followers
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_sector_followers();

-- 5. RPC for owner insights (security definer, owner-only)
CREATE OR REPLACE FUNCTION public.get_project_owner_insights(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  SELECT owner_id INTO v_owner FROM public.projects WHERE id = p_project_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF v_owner <> v_uid AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'views', (SELECT views_count FROM public.projects WHERE id = p_project_id),
    'likes', (SELECT likes_count FROM public.projects WHERE id = p_project_id),
    'unique_investors', (SELECT COUNT(DISTINCT user_id) FROM public.project_shares WHERE project_id = p_project_id),
    'pending_offers', (SELECT COUNT(*) FROM public.investment_offers WHERE project_id = p_project_id AND status = 'pending'),
    'accepted_offers', (SELECT COUNT(*) FROM public.investment_offers WHERE project_id = p_project_id AND status = 'accepted'),
    'partnership_requests', (SELECT COUNT(*) FROM public.investment_offers WHERE project_id = p_project_id AND is_partnership_request = true),
    'top_countries', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('country', country, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT p.country, COUNT(*) cnt
        FROM public.project_shares ps
        JOIN public.profiles p ON p.id = ps.user_id
        WHERE ps.project_id = p_project_id AND p.country IS NOT NULL
        GROUP BY p.country
        ORDER BY cnt DESC
        LIMIT 5
      ) t
    )
  ) INTO v_result;
  RETURN v_result;
END $$;

-- 6. Update AI score (security definer, owner-only)
CREATE OR REPLACE FUNCTION public.update_project_ai_score(p_project_id uuid, p_score integer, p_summary text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid; v_uid uuid := auth.uid();
BEGIN
  SELECT owner_id INTO v_owner FROM public.projects WHERE id = p_project_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF v_owner <> v_uid AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_score < 0 OR p_score > 100 THEN RAISE EXCEPTION 'invalid score'; END IF;
  UPDATE public.projects
    SET ai_score = p_score, ai_score_summary = p_summary, ai_score_at = now()
    WHERE id = p_project_id;
END $$;
