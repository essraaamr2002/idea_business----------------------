
REVOKE EXECUTE ON FUNCTION public.agents_can_use_tool(uuid, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.agents_can_use_tool(uuid, text, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.agents_today_usage(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.agents_today_usage(uuid, text) TO authenticated, service_role;
