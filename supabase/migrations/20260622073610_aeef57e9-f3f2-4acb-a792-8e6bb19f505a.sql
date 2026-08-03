
-- Phase 1: Community interactivity features

-- 1) Bookmarks
CREATE TABLE IF NOT EXISTS public.community_post_bookmarks (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_post_bookmarks TO authenticated;
GRANT ALL ON public.community_post_bookmarks TO service_role;
ALTER TABLE public.community_post_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks own all" ON public.community_post_bookmarks
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2) Multi-emoji reactions
CREATE TABLE IF NOT EXISTS public.community_post_reactions (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('like','fire','clap','idea','handshake')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, kind)
);
GRANT SELECT ON public.community_post_reactions TO anon, authenticated;
GRANT INSERT, DELETE ON public.community_post_reactions TO authenticated;
GRANT ALL ON public.community_post_reactions TO service_role;
ALTER TABLE public.community_post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions read all" ON public.community_post_reactions FOR SELECT USING (true);
CREATE POLICY "reactions own write" ON public.community_post_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reactions own delete" ON public.community_post_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS community_post_reactions_post_idx ON public.community_post_reactions(post_id);

-- 3) Polls
CREATE TABLE IF NOT EXISTS public.community_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL UNIQUE REFERENCES public.community_posts(id) ON DELETE CASCADE,
  question text NOT NULL,
  multi boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_polls TO anon, authenticated;
GRANT INSERT ON public.community_polls TO authenticated;
GRANT ALL ON public.community_polls TO service_role;
ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "polls read all" ON public.community_polls FOR SELECT USING (true);
CREATE POLICY "polls owner write" ON public.community_polls
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.community_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  votes_count integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.community_poll_options TO anon, authenticated;
GRANT INSERT ON public.community_poll_options TO authenticated;
GRANT ALL ON public.community_poll_options TO service_role;
ALTER TABLE public.community_poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll options read all" ON public.community_poll_options FOR SELECT USING (true);
CREATE POLICY "poll options owner write" ON public.community_poll_options
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.community_polls cp
    JOIN public.community_posts p ON p.id = cp.post_id
    WHERE cp.id = poll_id AND p.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.community_poll_votes (
  poll_id uuid NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.community_poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, option_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_poll_votes TO authenticated;
GRANT ALL ON public.community_poll_votes TO service_role;
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll votes own" ON public.community_poll_votes
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_poll_option_votes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE oid uuid; delta int;
BEGIN
  IF TG_OP = 'INSERT' THEN oid := NEW.option_id; delta := 1;
  ELSE oid := OLD.option_id; delta := -1; END IF;
  UPDATE public.community_poll_options SET votes_count = GREATEST(0, votes_count + delta) WHERE id = oid;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS poll_votes_count_trg ON public.community_poll_votes;
CREATE TRIGGER poll_votes_count_trg
AFTER INSERT OR DELETE ON public.community_poll_votes
FOR EACH ROW EXECUTE FUNCTION public.bump_poll_option_votes();

-- 4) Post extensions: pinning, hashtags, mentions, share counter, quote
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quote_content text,
  ADD COLUMN IF NOT EXISTS shares_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hashtags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS mentions uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS community_posts_hashtags_gin ON public.community_posts USING gin (hashtags);
CREATE INDEX IF NOT EXISTS community_posts_pinned_idx ON public.community_posts (user_id) WHERE pinned;

-- 5) Trending hashtags
CREATE OR REPLACE FUNCTION public.trending_hashtags(_limit int DEFAULT 10, _hours int DEFAULT 72)
RETURNS TABLE(tag text, post_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(t) AS tag, count(*)::bigint AS post_count
  FROM public.community_posts p, unnest(p.hashtags) AS t
  WHERE p.status = 'published' AND p.created_at > now() - (_hours || ' hours')::interval
  GROUP BY lower(t)
  ORDER BY post_count DESC
  LIMIT _limit
$$;
GRANT EXECUTE ON FUNCTION public.trending_hashtags(int,int) TO anon, authenticated;

-- 6) Increment share counter RPC
CREATE OR REPLACE FUNCTION public.bump_post_share(_post_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.community_posts SET shares_count = shares_count + 1 WHERE id = _post_id;
$$;
GRANT EXECUTE ON FUNCTION public.bump_post_share(uuid) TO anon, authenticated;

-- 7) Mention search RPC (for @ autocomplete) — only safe display fields
CREATE OR REPLACE FUNCTION public.search_mentionable_users(_q text, _limit int DEFAULT 8)
RETURNS TABLE(id uuid, display_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, display_name, avatar_url
  FROM public.profiles
  WHERE display_name IS NOT NULL
    AND (display_name ILIKE '%' || _q || '%' OR alias_name ILIKE '%' || _q || '%')
  ORDER BY points DESC NULLS LAST
  LIMIT _limit
$$;
GRANT EXECUTE ON FUNCTION public.search_mentionable_users(text,int) TO authenticated;
