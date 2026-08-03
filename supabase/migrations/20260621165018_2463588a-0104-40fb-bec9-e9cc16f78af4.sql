
-- has_role is SECURITY DEFINER and safe to expose; required by RLS policies on multiple tables
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- Ensure projects table grants exist for Data API (RLS still enforces row visibility)
GRANT SELECT ON public.projects TO anon, authenticated;
GRANT INSERT, UPDATE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

-- Re-revoke sensitive columns from public SELECT (kept hidden; reachable via get_project_contact)
REVOKE SELECT (phone, whatsapp) ON public.projects FROM anon, authenticated;
