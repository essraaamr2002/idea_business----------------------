-- Extend articles
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS focus_keyword text,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS seo_score smallint CHECK (seo_score IS NULL OR (seo_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS reading_time_minutes smallint,
  ADD COLUMN IF NOT EXISTS word_count integer,
  ADD COLUMN IF NOT EXISTS indexed_google_at timestamptz,
  ADD COLUMN IF NOT EXISTS indexed_bing_at timestamptz,
  ADD COLUMN IF NOT EXISTS generation_model text,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE INDEX IF NOT EXISTS articles_published_at_idx ON public.articles (published_at DESC) WHERE published = true;
CREATE INDEX IF NOT EXISTS articles_focus_kw_idx ON public.articles (focus_keyword);

-- keyword_queue
CREATE TABLE IF NOT EXISTS public.keyword_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  priority smallint NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  article_type text NOT NULL DEFAULT 'listicle' CHECK (article_type IN ('listicle','how_to','definition','comparison','news','pillar','brand')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','done','failed','skipped')),
  scheduled_for timestamptz,
  article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  attempts smallint NOT NULL DEFAULT 0,
  last_error text,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kq_status_priority_idx ON public.keyword_queue (status, priority, scheduled_for);
CREATE UNIQUE INDEX IF NOT EXISTS kq_keyword_unique ON public.keyword_queue (lower(keyword));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.keyword_queue TO authenticated;
GRANT ALL ON public.keyword_queue TO service_role;
ALTER TABLE public.keyword_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY kq_admin_all ON public.keyword_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- indexing_log
CREATE TABLE IF NOT EXISTS public.indexing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  article_url text NOT NULL,
  engine text NOT NULL CHECK (engine IN ('google','bing','indexnow','sitemap','rss')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','confirmed','failed')),
  response_code integer,
  response_body text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_log_article_idx ON public.indexing_log (article_id, engine);
GRANT SELECT ON public.indexing_log TO authenticated;
GRANT ALL ON public.indexing_log TO service_role;
ALTER TABLE public.indexing_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY ilog_admin_read ON public.indexing_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- distribution_log
CREATE TABLE IF NOT EXISTS public.distribution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('twitter','linkedin','telegram','whatsapp','newsletter','community_feed')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','skipped')),
  post_url text,
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dlog_article_idx ON public.distribution_log (article_id);
GRANT SELECT ON public.distribution_log TO authenticated;
GRANT ALL ON public.distribution_log TO service_role;
ALTER TABLE public.distribution_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY dlog_admin_read ON public.distribution_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));