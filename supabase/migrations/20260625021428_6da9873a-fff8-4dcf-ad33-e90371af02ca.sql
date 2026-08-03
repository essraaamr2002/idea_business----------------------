
-- 1) share_orders_v2: restrict order book read to authenticated only
DROP POLICY IF EXISTS so2_book_read ON public.share_orders_v2;
CREATE POLICY so2_book_read ON public.share_orders_v2
  FOR SELECT TO authenticated
  USING (status = ANY (ARRAY['pending'::text, 'partial'::text]));

-- 2) community_post_reactions: restrict read to authenticated
DROP POLICY IF EXISTS "reactions read all" ON public.community_post_reactions;
CREATE POLICY "reactions read authenticated" ON public.community_post_reactions
  FOR SELECT TO authenticated
  USING (true);

-- 3) community_posts: prevent owner from changing status (and inflating counters).
-- Trigger reverts privileged columns to OLD values for non-admin owners.
CREATE OR REPLACE FUNCTION public.community_posts_guard_owner_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role) THEN
    RETURN NEW;
  END IF;
  -- non-admin owner: cannot change status or denormalized counters
  NEW.status         := OLD.status;
  NEW.likes_count    := OLD.likes_count;
  NEW.reposts_count  := OLD.reposts_count;
  NEW.comments_count := OLD.comments_count;
  NEW.user_id        := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_posts_guard_owner_update ON public.community_posts;
CREATE TRIGGER community_posts_guard_owner_update
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.community_posts_guard_owner_update();

-- 4) Fix mutable search_path on touch_updated_at
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

-- 5) Replace always-true write policies. service_role bypasses RLS, so drop
--    its policies; tighten authenticated ones with explicit user predicates.
DROP POLICY IF EXISTS pv_insert_auth_or_service ON public.page_views;
CREATE POLICY pv_insert_auth ON public.page_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS sq_insert_auth_or_service ON public.search_queries;
CREATE POLICY sq_insert_auth ON public.search_queries
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Service role inserts security events" ON public.security_events;
DROP POLICY IF EXISTS "service inserts sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "service manages reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Service inserts ad audit" ON public.ad_audit_log;
