DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'community_posts','community_post_likes','community_post_comments','community_post_reposts',
    'investment_offers','project_purchase_requests'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
  END LOOP;
END $$;