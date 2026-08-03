
-- Award reputation points (Snap-score-like) on community interactions.
-- Idempotent: every trigger function uses SECURITY DEFINER + search_path.

-- LIKE on post -> +1 to post author (when liker != author), +0 to liker
CREATE OR REPLACE FUNCTION public.trg_award_on_post_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO _author FROM public.community_posts WHERE id = NEW.post_id;
    IF _author IS NOT NULL AND _author <> NEW.user_id THEN
      PERFORM public.award_reputation(_author, 'post_liked', 1, NEW.post_id, 'community_post');
      PERFORM public.award_reputation(NEW.user_id, 'gave_like', 1, NEW.post_id, 'community_post');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS award_on_post_like ON public.community_post_likes;
CREATE TRIGGER award_on_post_like
AFTER INSERT ON public.community_post_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_award_on_post_like();

-- COMMENT on post -> +2 to author, +1 to commenter
CREATE OR REPLACE FUNCTION public.trg_award_on_post_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO _author FROM public.community_posts WHERE id = NEW.post_id;
    IF _author IS NOT NULL AND _author <> NEW.user_id THEN
      PERFORM public.award_reputation(_author, 'post_commented', 2, NEW.post_id, 'community_post');
    END IF;
    PERFORM public.award_reputation(NEW.user_id, 'made_comment', 1, NEW.post_id, 'community_post');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS award_on_post_comment ON public.community_post_comments;
CREATE TRIGGER award_on_post_comment
AFTER INSERT ON public.community_post_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_award_on_post_comment();

-- REPOST -> +3 to author, +1 to reposter
CREATE OR REPLACE FUNCTION public.trg_award_on_post_repost()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO _author FROM public.community_posts WHERE id = NEW.post_id;
    IF _author IS NOT NULL AND _author <> NEW.user_id THEN
      PERFORM public.award_reputation(_author, 'post_reposted', 3, NEW.post_id, 'community_post');
    END IF;
    PERFORM public.award_reputation(NEW.user_id, 'made_repost', 1, NEW.post_id, 'community_post');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS award_on_post_repost ON public.community_post_reposts;
CREATE TRIGGER award_on_post_repost
AFTER INSERT ON public.community_post_reposts
FOR EACH ROW EXECUTE FUNCTION public.trg_award_on_post_repost();

-- NEW POST -> +5
CREATE OR REPLACE FUNCTION public.trg_award_on_new_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
    PERFORM public.award_reputation(NEW.user_id, 'created_post', 5, NEW.id, 'community_post');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS award_on_new_post ON public.community_posts;
CREATE TRIGGER award_on_new_post
AFTER INSERT ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.trg_award_on_new_post();

-- Make sure reputation_score and nationality are publicly readable (they live on profiles
-- with existing public read policies for safe columns); no change required.
