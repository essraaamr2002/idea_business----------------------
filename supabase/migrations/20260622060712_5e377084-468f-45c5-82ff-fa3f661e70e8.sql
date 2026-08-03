DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS comments_public_read ON public.comments;
CREATE POLICY comments_auth_read ON public.comments
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "comments read" ON public.community_post_comments;
CREATE POLICY community_post_comments_auth_read ON public.community_post_comments
  FOR SELECT
  TO authenticated
  USING (true);