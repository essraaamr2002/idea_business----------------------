
-- 1) Meta overrides per route path
CREATE TABLE IF NOT EXISTS public.seo_meta_overrides (
  route_path TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  keywords TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  canonical_url TEXT,
  json_ld JSONB,
  noindex BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_meta_overrides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_meta_overrides TO authenticated;
GRANT ALL ON public.seo_meta_overrides TO service_role;
ALTER TABLE public.seo_meta_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read meta" ON public.seo_meta_overrides FOR SELECT TO anon USING (true);
CREATE POLICY "auth read meta" ON public.seo_meta_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "seo or admin manage meta" ON public.seo_meta_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'seo'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'seo'));

-- 2) Archive jobs log (periodic SEO snapshots & sitemap pings)
CREATE TABLE IF NOT EXISTS public.seo_archive_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'sitemap_refresh',
  status TEXT NOT NULL DEFAULT 'pending',
  url TEXT,
  http_status INT,
  response_excerpt TEXT,
  items_count INT,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.seo_archive_jobs TO authenticated;
GRANT ALL ON public.seo_archive_jobs TO service_role;
ALTER TABLE public.seo_archive_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo or admin read jobs" ON public.seo_archive_jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'seo'));
CREATE POLICY "seo or admin insert jobs" ON public.seo_archive_jobs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'seo'));

-- 3) Keyword research saves
CREATE TABLE IF NOT EXISTS public.seo_keyword_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_keyword TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'ar',
  ideas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.seo_keyword_research TO authenticated;
GRANT ALL ON public.seo_keyword_research TO service_role;
ALTER TABLE public.seo_keyword_research ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo or admin read kw" ON public.seo_keyword_research FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'seo'));
CREATE POLICY "seo or admin write kw" ON public.seo_keyword_research FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'seo'));
CREATE POLICY "seo or admin delete kw" ON public.seo_keyword_research FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'seo'));

-- 4) AI generation log
CREATE TABLE IF NOT EXISTS public.seo_ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'article',
  output TEXT,
  tokens_used INT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.seo_ai_generations TO authenticated;
GRANT ALL ON public.seo_ai_generations TO service_role;
ALTER TABLE public.seo_ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo or admin read ai" ON public.seo_ai_generations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'seo'));
CREATE POLICY "seo or admin write ai" ON public.seo_ai_generations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'seo'));

-- 5) Articles management for SEO role (admin already covered)
DO $$ BEGIN
  CREATE POLICY "seo manage articles" ON public.articles FOR ALL TO authenticated
    USING (public.has_role(auth.uid(),'seo'))
    WITH CHECK (public.has_role(auth.uid(),'seo'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6) updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_seo_meta_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS seo_meta_overrides_updated_at ON public.seo_meta_overrides;
CREATE TRIGGER seo_meta_overrides_updated_at BEFORE UPDATE ON public.seo_meta_overrides
  FOR EACH ROW EXECUTE FUNCTION public.tg_seo_meta_updated_at();

-- 7) Schedule daily sitemap refresh (pings the public sitemap endpoint to bust cache and logs result)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule prior if exists
DO $$ BEGIN
  PERFORM cron.unschedule('seo-daily-sitemap-refresh');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'seo-daily-sitemap-refresh',
  '0 3 * * *',
  $cron$
  WITH req AS (
    SELECT net.http_get(url := 'https://busniss.org/api/public/sitemap') AS request_id
  )
  INSERT INTO public.seo_archive_jobs(kind, status, url, started_at, finished_at)
  SELECT 'sitemap_refresh', 'queued', 'https://busniss.org/api/public/sitemap', now(), now()
  FROM req;
  $cron$
);
