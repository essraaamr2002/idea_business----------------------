REVOKE ALL ON FUNCTION public.create_project_from_wizard(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_project_from_wizard(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_project_from_wizard(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_from_wizard(jsonb) TO service_role;