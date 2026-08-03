DROP POLICY IF EXISTS "posts read public" ON public.community_posts;

CREATE POLICY "posts read authenticated"
ON public.community_posts
FOR SELECT
TO authenticated
USING (status = 'published' OR user_id = auth.uid());