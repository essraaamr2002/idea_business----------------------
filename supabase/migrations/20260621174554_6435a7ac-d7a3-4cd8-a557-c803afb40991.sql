
-- Add 'seo' to app_role enum if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='seo' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'seo';
  END IF;
END $$;

-- Augment articles with category/event_type
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'news',
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS event_ref_id uuid;

-- News email subscribers
CREATE TABLE IF NOT EXISTS public.news_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  unsubscribed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS news_subscribers_email_uniq ON public.news_subscribers (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_subscribers TO authenticated;
GRANT INSERT ON public.news_subscribers TO anon;
GRANT ALL ON public.news_subscribers TO service_role;

ALTER TABLE public.news_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_subscribers_self_read" ON public.news_subscribers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "news_subscribers_insert_anyone" ON public.news_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "news_subscribers_self_update" ON public.news_subscribers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "news_subscribers_admin_delete" ON public.news_subscribers
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_news_subscribers_updated_at
  BEFORE UPDATE ON public.news_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
