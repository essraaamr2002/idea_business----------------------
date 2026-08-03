
-- 1) SECURITY DEFINER View → security_invoker
ALTER VIEW public.sm_v_active_margin SET (security_invoker = true);

-- 2) Prevent non-admin staff from reading credential-bearing tables via service-role tools:
--    Revoke direct table grants; admins still access via policy + service_role.
REVOKE ALL ON public.integration_configs FROM authenticated, anon;
REVOKE ALL ON public.tenant_provider_configs FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_configs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_provider_configs TO service_role;
