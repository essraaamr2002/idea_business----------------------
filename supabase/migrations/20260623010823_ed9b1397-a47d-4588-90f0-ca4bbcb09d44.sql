
DROP POLICY IF EXISTS comments_auth_read ON public.comments;
CREATE POLICY comments_auth_read ON public.comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = comments.project_id
        AND (
          p.status IN ('active','halted','closed')
          OR p.owner_id = auth.uid()
        )
    )
    OR comments.user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS community_post_comments_auth_read ON public.community_post_comments;
CREATE POLICY community_post_comments_auth_read ON public.community_post_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = community_post_comments.post_id
        AND (
          cp.status = 'published'
          OR cp.user_id = auth.uid()
        )
    )
    OR community_post_comments.user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );
