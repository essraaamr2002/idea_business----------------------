
-- 1) Block direct INSERT into payout_requests. The request_payout()
--    SECURITY DEFINER function (called from a server fn with service_role)
--    is the only sanctioned path: it enforces fund holds, fraud scoring, and
--    payout state machine. Admins can still insert via payout_admin_all.
DROP POLICY IF EXISTS payout_self_insert ON public.payout_requests;
REVOKE INSERT, UPDATE, DELETE ON public.payout_requests FROM anon, authenticated;
GRANT SELECT ON public.payout_requests TO authenticated;
-- service_role retains ALL via prior grant

-- 2) Hard-block role self-assignment. Only service_role and admins (through
--    SECURITY DEFINER admin tooling) may write roles.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
-- Defense in depth: explicit deny policy for non-admin writes
DROP POLICY IF EXISTS roles_no_self_write ON public.user_roles;
CREATE POLICY roles_no_self_write ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS roles_no_self_update ON public.user_roles;
CREATE POLICY roles_no_self_update ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS roles_no_self_delete ON public.user_roles;
CREATE POLICY roles_no_self_delete ON public.user_roles
  AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
