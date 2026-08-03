
-- Attach protection triggers (functions exist but triggers were not attached)
DROP TRIGGER IF EXISTS protect_profiles_cols ON public.profiles;
CREATE TRIGGER protect_profiles_cols
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profiles_privileged_cols();

DROP TRIGGER IF EXISTS protect_portals_cols ON public.community_portals;
CREATE TRIGGER protect_portals_cols
  BEFORE INSERT OR UPDATE ON public.community_portals
  FOR EACH ROW EXECUTE FUNCTION public.protect_community_portals_cols();

DROP TRIGGER IF EXISTS sync_portal_votes ON public.portal_votes;
CREATE TRIGGER sync_portal_votes
  AFTER INSERT OR DELETE ON public.portal_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_portal_votes_count();

-- Restrict guarantees: only project owners and admins (not all shareholders) can read PII
DROP POLICY IF EXISTS guarantees_restricted_read ON public.project_guarantees;
DROP POLICY IF EXISTS guarantees_owner_admin_read ON public.project_guarantees;
CREATE POLICY guarantees_owner_admin_read ON public.project_guarantees
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Restrict share_orders public read: hide user_id by removing anon access, require auth
DROP POLICY IF EXISTS orders_public_read ON public.share_orders;
DROP POLICY IF EXISTS orders_auth_read ON public.share_orders;
CREATE POLICY orders_auth_read ON public.share_orders
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.share_orders FROM anon;

-- Explicitly deny otp_codes from anon/authenticated (service_role only)
REVOKE ALL ON public.otp_codes FROM anon, authenticated;
GRANT ALL ON public.otp_codes TO service_role;

-- Prevent user role self-escalation: restrict user_roles INSERT/UPDATE/DELETE to admins only
DROP POLICY IF EXISTS roles_user_insert ON public.user_roles;
DROP POLICY IF EXISTS roles_admin_write ON public.user_roles;
CREATE POLICY roles_admin_write ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
