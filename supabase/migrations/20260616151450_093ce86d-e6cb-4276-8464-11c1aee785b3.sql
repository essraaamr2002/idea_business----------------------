
-- Money-movement: service role only (callable from server functions using service key)
REVOKE ALL ON FUNCTION public.wallet_deposit(uuid, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_transfer(uuid, uuid, bigint, text, text) FROM PUBLIC, anon, authenticated;

-- Internal trigger functions: nobody calls directly
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_community_portals_cols() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profiles_privileged_cols() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_portal_votes_count() FROM PUBLIC, anon, authenticated;

-- Helpers used by RLS and the app: keep available to signed-in users only
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.get_project_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_contact(uuid) TO authenticated;
