
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS marketplace_listed BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.compute_trust_level(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN (
    COALESCE((SELECT COUNT(*) FROM public.project_shares WHERE user_id = _user_id AND shares > 0), 0)
    + COALESCE((SELECT COUNT(*) FROM public.projects WHERE owner_id = _user_id AND shares_sold > 0), 0)
  ) >= 3 THEN 'trusted' ELSE NULL END;
$$;

CREATE OR REPLACE VIEW public.user_trust_stats
WITH (security_invoker = true)
AS
SELECT
  p.id AS user_id,
  COALESCE((SELECT COUNT(*) FROM public.projects pr WHERE pr.owner_id = p.id), 0)::int AS projects_count,
  COALESCE((SELECT COUNT(*) FROM public.project_shares ps WHERE ps.user_id = p.id AND ps.shares > 0), 0)::int AS investments_count,
  COALESCE((SELECT COUNT(*) FROM public.projects pr WHERE pr.owner_id = p.id AND pr.shares_sold > 0), 0)::int AS funded_projects_count,
  public.compute_trust_level(p.id) AS trust_level
FROM public.profiles p;

GRANT SELECT ON public.user_trust_stats TO anon, authenticated;
