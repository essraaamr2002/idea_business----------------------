
-- =====================================================
-- 1) COMMUNITY
-- =====================================================
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  media_urls text[] DEFAULT '{}',
  category text DEFAULT 'general',
  likes_count int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT SELECT ON public.community_posts TO anon;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts read public" ON public.community_posts FOR SELECT USING (status='published' OR user_id = auth.uid());
CREATE POLICY "posts insert own" ON public.community_posts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "posts update own" ON public.community_posts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "posts delete own" ON public.community_posts FOR DELETE USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.protect_community_posts_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_service boolean := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role', false);
BEGIN
  IF TG_OP='INSERT' AND NOT is_service THEN
    NEW.likes_count := 0; NEW.comments_count := 0;
  ELSIF TG_OP='UPDATE' AND NOT is_service THEN
    NEW.likes_count := OLD.likes_count; NEW.comments_count := OLD.comments_count;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_community_posts_protect BEFORE INSERT OR UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.protect_community_posts_counts();

CREATE TABLE public.community_post_likes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_post_likes TO authenticated;
GRANT ALL ON public.community_post_likes TO service_role;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes read" ON public.community_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes insert own" ON public.community_post_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "likes delete own" ON public.community_post_likes FOR DELETE USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.community_posts SET likes_count = likes_count+1 WHERE id = NEW.post_id; RETURN NEW;
  ELSIF TG_OP='DELETE' THEN UPDATE public.community_posts SET likes_count = GREATEST(0, likes_count-1) WHERE id = OLD.post_id; RETURN OLD;
  END IF; RETURN NULL;
END $$;
CREATE TRIGGER trg_post_likes_count AFTER INSERT OR DELETE ON public.community_post_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

CREATE TABLE public.community_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.community_post_comments TO authenticated;
GRANT SELECT ON public.community_post_comments TO anon;
GRANT ALL ON public.community_post_comments TO service_role;
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments read" ON public.community_post_comments FOR SELECT USING (true);
CREATE POLICY "comments insert own" ON public.community_post_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments delete own" ON public.community_post_comments FOR DELETE USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.sync_post_comments_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.community_posts SET comments_count = comments_count+1 WHERE id = NEW.post_id; RETURN NEW;
  ELSIF TG_OP='DELETE' THEN UPDATE public.community_posts SET comments_count = GREATEST(0, comments_count-1) WHERE id = OLD.post_id; RETURN OLD;
  END IF; RETURN NULL;
END $$;
CREATE TRIGGER trg_post_comments_count AFTER INSERT OR DELETE ON public.community_post_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_comments_count();

CREATE TABLE public.community_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_follows TO authenticated;
GRANT ALL ON public.community_follows TO service_role;
ALTER TABLE public.community_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows read" ON public.community_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "follows insert own" ON public.community_follows FOR INSERT WITH CHECK (follower_id = auth.uid());
CREATE POLICY "follows delete own" ON public.community_follows FOR DELETE USING (follower_id = auth.uid());

-- =====================================================
-- 2) MESSAGES
-- =====================================================
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_cid uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id=_cid AND user_id=_uid);
$$;

CREATE POLICY "conv read participants" ON public.conversations FOR SELECT USING (public.is_conversation_participant(id, auth.uid()));
CREATE POLICY "conv participants read" ON public.conversation_participants FOR SELECT USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg read participants" ON public.messages FOR SELECT USING (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "msg insert participants" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "msg update read" ON public.messages FOR UPDATE USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id; RETURN NEW; END $$;
CREATE TRIGGER trg_touch_conv AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_last_message();

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(_other_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); cid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _other_user = me THEN RAISE EXCEPTION 'cannot message self'; END IF;
  SELECT cp1.conversation_id INTO cid
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2 ON cp1.conversation_id=cp2.conversation_id
    WHERE cp1.user_id = me AND cp2.user_id = _other_user
    LIMIT 1;
  IF cid IS NOT NULL THEN RETURN cid; END IF;
  INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO cid;
  INSERT INTO public.conversation_participants(conversation_id,user_id) VALUES (cid,me),(cid,_other_user);
  RETURN cid;
END $$;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- =====================================================
-- 3) KYC VERIFICATIONS (AI)
-- =====================================================
CREATE TABLE public.kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_url text NOT NULL,
  selfie_url text,
  ai_score numeric,
  ai_decision text,
  ai_reasoning text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc read own" ON public.kyc_verifications FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "kyc insert own" ON public.kyc_verifications FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 4) ARCHIVE / BACKUP
-- =====================================================
CREATE TABLE public.archive_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_table text NOT NULL,
  rows_archived bigint NOT NULL DEFAULT 0,
  rows_deleted bigint NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.archive_log TO authenticated;
GRANT ALL ON public.archive_log TO service_role;
ALTER TABLE public.archive_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "archive log admin read" ON public.archive_log FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.backup_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taken_at timestamptz NOT NULL DEFAULT now(),
  stats jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.backup_snapshots TO authenticated;
GRANT ALL ON public.backup_snapshots TO service_role;
ALTER TABLE public.backup_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots admin read" ON public.backup_snapshots FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notifications_archive (LIKE public.notifications INCLUDING ALL);
GRANT SELECT ON public.notifications_archive TO authenticated;
GRANT ALL ON public.notifications_archive TO service_role;
ALTER TABLE public.notifications_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif archive admin" ON public.notifications_archive FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.messages_archive (LIKE public.messages INCLUDING ALL);
GRANT SELECT ON public.messages_archive TO authenticated;
GRANT ALL ON public.messages_archive TO service_role;
ALTER TABLE public.messages_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg archive admin" ON public.messages_archive FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.archive_old_data()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n_notif bigint := 0; n_msg bigint := 0; n_rate bigint := 0;
BEGIN
  WITH moved AS (
    DELETE FROM public.notifications WHERE created_at < now() - interval '90 days' RETURNING *
  ), ins AS (
    INSERT INTO public.notifications_archive SELECT * FROM moved RETURNING 1
  ) SELECT count(*) INTO n_notif FROM ins;
  INSERT INTO public.archive_log(archived_table, rows_archived, rows_deleted) VALUES ('notifications', n_notif, n_notif);

  WITH moved AS (
    DELETE FROM public.messages WHERE created_at < now() - interval '365 days' RETURNING *
  ), ins AS (
    INSERT INTO public.messages_archive SELECT * FROM moved RETURNING 1
  ) SELECT count(*) INTO n_msg FROM ins;
  INSERT INTO public.archive_log(archived_table, rows_archived, rows_deleted) VALUES ('messages', n_msg, n_msg);

  WITH d AS (DELETE FROM public.rate_limit_events WHERE created_at < now() - interval '7 days' RETURNING 1)
  SELECT count(*) INTO n_rate FROM d;
  INSERT INTO public.archive_log(archived_table, rows_archived, rows_deleted) VALUES ('rate_limit_events', 0, n_rate);

  RETURN jsonb_build_object('notifications', n_notif, 'messages', n_msg, 'rate_limit_events', n_rate);
END $$;

CREATE OR REPLACE FUNCTION public.take_backup_snapshot()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'profiles', (SELECT count(*) FROM public.profiles),
    'projects', (SELECT count(*) FROM public.projects),
    'community_posts', (SELECT count(*) FROM public.community_posts),
    'messages', (SELECT count(*) FROM public.messages),
    'conversations', (SELECT count(*) FROM public.conversations),
    'ledger', (SELECT count(*) FROM public.ledger),
    'payment_intents', (SELECT count(*) FROM public.payment_intents),
    'kyc_verifications', (SELECT count(*) FROM public.kyc_verifications)
  ) INTO v_stats;
  INSERT INTO public.backup_snapshots(stats) VALUES (v_stats) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule('archive-old-data-daily', '0 2 * * *', $$SELECT public.archive_old_data();$$);
SELECT cron.schedule('backup-snapshot-weekly', '0 3 * * 0', $$SELECT public.take_backup_snapshot();$$);
