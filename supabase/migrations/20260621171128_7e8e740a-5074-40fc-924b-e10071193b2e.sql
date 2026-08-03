
-- 1) Profiles: alias + points
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alias_name text,
  ADD COLUMN IF NOT EXISTS use_alias_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

-- Allow users to update their own alias prefs (existing profile policies cover own update; ensure points is protected)
-- Protect points column: only service_role / triggers may change it. Add a trigger guard.
CREATE OR REPLACE FUNCTION public.protect_profile_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_service boolean := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role', false);
BEGIN
  IF TG_OP = 'UPDATE' AND NOT is_service THEN
    NEW.points := OLD.points;
  ELSIF TG_OP = 'INSERT' AND NOT is_service THEN
    NEW.points := 0;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_profile_points ON public.profiles;
CREATE TRIGGER trg_protect_profile_points
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_points();

-- 2) community_posts: repost / link / alias / reposts_count / title
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS repost_of uuid REFERENCES public.community_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS display_as_alias boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reposts_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'tweet';

-- allow empty content for repost-only or media-only
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_content_check;
ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_content_check CHECK (char_length(content) <= 5000);

-- 3) community_post_comments: parent_id + likes_count
ALTER TABLE public.community_post_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.community_post_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

-- 4) reposts table
CREATE TABLE IF NOT EXISTS public.community_post_reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.community_post_reposts TO authenticated;
GRANT ALL ON public.community_post_reposts TO service_role;
ALTER TABLE public.community_post_reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reposts read" ON public.community_post_reposts FOR SELECT TO authenticated USING (true);
CREATE POLICY "reposts insert own" ON public.community_post_reposts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reposts delete own" ON public.community_post_reposts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 5) Sync reposts_count
CREATE OR REPLACE FUNCTION public.sync_post_reposts_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.community_posts SET reposts_count = reposts_count + 1 WHERE id = NEW.post_id; RETURN NEW;
  ELSIF TG_OP='DELETE' THEN UPDATE public.community_posts SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = OLD.post_id; RETURN OLD;
  END IF; RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_sync_post_reposts_count ON public.community_post_reposts;
CREATE TRIGGER trg_sync_post_reposts_count
  AFTER INSERT OR DELETE ON public.community_post_reposts
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_reposts_count();

-- 6) Points awarder: bump post author + actor points
CREATE OR REPLACE FUNCTION public.award_points(_user_id uuid, _delta integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL OR _delta = 0 THEN RETURN; END IF;
  UPDATE public.profiles SET points = GREATEST(0, points + _delta) WHERE id = _user_id;
END $$;

-- Like trigger: +1 to post author when liked, -1 when unliked
CREATE OR REPLACE FUNCTION public.tg_points_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  IF TG_OP='INSERT' THEN
    SELECT user_id INTO author FROM public.community_posts WHERE id = NEW.post_id;
    PERFORM public.award_points(author, 1);
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    SELECT user_id INTO author FROM public.community_posts WHERE id = OLD.post_id;
    PERFORM public.award_points(author, -1);
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_points_on_like ON public.community_post_likes;
CREATE TRIGGER trg_points_on_like
  AFTER INSERT OR DELETE ON public.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.tg_points_on_like();

-- Comment trigger: +2 to post author when commenting
CREATE OR REPLACE FUNCTION public.tg_points_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  IF TG_OP='INSERT' THEN
    SELECT user_id INTO author FROM public.community_posts WHERE id = NEW.post_id;
    PERFORM public.award_points(author, 2);
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    SELECT user_id INTO author FROM public.community_posts WHERE id = OLD.post_id;
    PERFORM public.award_points(author, -2);
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_points_on_comment ON public.community_post_comments;
CREATE TRIGGER trg_points_on_comment
  AFTER INSERT OR DELETE ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_points_on_comment();

-- Repost trigger: +3 to original author
CREATE OR REPLACE FUNCTION public.tg_points_on_repost()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  IF TG_OP='INSERT' THEN
    SELECT user_id INTO author FROM public.community_posts WHERE id = NEW.post_id;
    PERFORM public.award_points(author, 3);
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    SELECT user_id INTO author FROM public.community_posts WHERE id = OLD.post_id;
    PERFORM public.award_points(author, -3);
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_points_on_repost ON public.community_post_reposts;
CREATE TRIGGER trg_points_on_repost
  AFTER INSERT OR DELETE ON public.community_post_reposts
  FOR EACH ROW EXECUTE FUNCTION public.tg_points_on_repost();

-- New post trigger: +5 to author for posting (only original posts, not reposts)
CREATE OR REPLACE FUNCTION public.tg_points_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' AND NEW.repost_of IS NULL THEN
    PERFORM public.award_points(NEW.user_id, 5);
  ELSIF TG_OP='DELETE' AND OLD.repost_of IS NULL THEN
    PERFORM public.award_points(OLD.user_id, -5);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS trg_points_on_post ON public.community_posts;
CREATE TRIGGER trg_points_on_post
  AFTER INSERT OR DELETE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_points_on_post();

-- 7) Storage policies for community-media bucket
-- Authenticated users can upload to their own folder ({uid}/...)
CREATE POLICY "community_media_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "community_media_read_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'community-media');

CREATE POLICY "community_media_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);
