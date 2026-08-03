
-- 1) Fix investment_offers INSERT: owner_id must match the project's actual owner
DROP POLICY IF EXISTS offers_insert_investor ON public.investment_offers;
CREATE POLICY offers_insert_investor ON public.investment_offers
  FOR INSERT TO authenticated
  WITH CHECK (
    investor_id = auth.uid()
    AND owner_id <> auth.uid()
    AND owner_id = (SELECT p.owner_id FROM public.projects p WHERE p.id = project_id)
  );

-- 2) Restrict community_post_likes to authenticated users only
DROP POLICY IF EXISTS "likes insert own" ON public.community_post_likes;
DROP POLICY IF EXISTS "likes delete own" ON public.community_post_likes;
CREATE POLICY "likes insert own" ON public.community_post_likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "likes delete own" ON public.community_post_likes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 3) Set search_path on queue helper functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
