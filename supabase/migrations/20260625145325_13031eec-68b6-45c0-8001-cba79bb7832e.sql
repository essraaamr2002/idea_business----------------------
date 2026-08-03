
-- 1) FULL-TEXT SEARCH
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS search_tsv tsvector;
CREATE OR REPLACE FUNCTION public.projects_search_tsv_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.sector, '') || ' ' || coalesce(NEW.country, '')), 'C');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_projects_search_tsv ON public.projects;
CREATE TRIGGER trg_projects_search_tsv
  BEFORE INSERT OR UPDATE OF name, description, sector, country ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_search_tsv_update();
CREATE INDEX IF NOT EXISTS idx_projects_search_tsv ON public.projects USING GIN(search_tsv);
CREATE INDEX IF NOT EXISTS idx_projects_status_created ON public.projects(status, created_at DESC);

-- 2) MARKET AUDIT TRAIL
CREATE TABLE IF NOT EXISTS public.market_audit_trail (
  id BIGSERIAL PRIMARY KEY, actor_id UUID, action TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip INET, user_agent TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.market_audit_trail TO authenticated;
GRANT ALL ON public.market_audit_trail TO service_role;
ALTER TABLE public.market_audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY mat_self_read ON public.market_audit_trail FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_mat_actor ON public.market_audit_trail(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mat_entity ON public.market_audit_trail(entity_type, entity_id);

-- 3) RATE LIMITS
CREATE TABLE IF NOT EXISTS public.market_rate_limits (
  id BIGSERIAL PRIMARY KEY, key TEXT NOT NULL, bucket_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 1, UNIQUE(key, bucket_start)
);
GRANT ALL ON public.market_rate_limits TO service_role;
ALTER TABLE public.market_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.rl_check(_key TEXT, _limit INT, _window_seconds INT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bucket TIMESTAMPTZ; _count INT;
BEGIN
  _bucket := date_trunc('second', now()) - (extract(epoch FROM now())::int % _window_seconds) * interval '1 second';
  INSERT INTO public.market_rate_limits(key, bucket_start, count) VALUES (_key, _bucket, 1)
  ON CONFLICT (key, bucket_start) DO UPDATE SET count = market_rate_limits.count + 1
  RETURNING count INTO _count;
  RETURN _count <= _limit;
END; $$;
GRANT EXECUTE ON FUNCTION public.rl_check(TEXT,INT,INT) TO authenticated, service_role;

-- 4) IDEMPOTENCY KEYS
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key TEXT PRIMARY KEY, user_id UUID, endpoint TEXT NOT NULL,
  response JSONB, status_code INT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours'
);
GRANT ALL ON public.idempotency_keys TO service_role;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_idem_expires ON public.idempotency_keys(expires_at);

-- 5) DEVELOPER WEBHOOKS
CREATE TABLE IF NOT EXISTS public.developer_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL,
  url TEXT NOT NULL, secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['*'], enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_webhooks TO authenticated;
GRANT ALL ON public.developer_webhooks TO service_role;
ALTER TABLE public.developer_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY dw_owner ON public.developer_webhooks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id BIGSERIAL PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.developer_webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL, payload JSONB NOT NULL, status_code INT, response TEXT,
  attempts INT NOT NULL DEFAULT 0, delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY wd_owner_read ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.developer_webhooks w WHERE w.id = webhook_id AND w.user_id = auth.uid()));

-- 6) PARTNER API KEYS
CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL,
  name TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE, prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read:public'],
  last_used_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.partner_api_keys TO authenticated;
GRANT ALL ON public.partner_api_keys TO service_role;
ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY pak_owner ON public.partner_api_keys FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7) PRICE WATCH RULES
CREATE TABLE IF NOT EXISTS public.price_watch_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL,
  project_id UUID, condition TEXT NOT NULL CHECK (condition IN ('above','below','change_pct')),
  threshold NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT true,
  triggered_count INT NOT NULL DEFAULT 0, last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_watch_rules TO authenticated;
GRANT ALL ON public.price_watch_rules TO service_role;
ALTER TABLE public.price_watch_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY pwr_owner ON public.price_watch_rules FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 8) REALTIME EVENTS
CREATE TABLE IF NOT EXISTS public.realtime_events (
  id BIGSERIAL PRIMARY KEY, channel TEXT NOT NULL, event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb, user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.realtime_events TO authenticated;
GRANT ALL ON public.realtime_events TO service_role;
ALTER TABLE public.realtime_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY re_read ON public.realtime_events FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_re_channel ON public.realtime_events(channel, created_at DESC);
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='realtime_events';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_events';
  END IF;
END $$;
ALTER TABLE public.realtime_events REPLICA IDENTITY FULL;

-- 9) SYSTEM HEALTH CHECKS
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id BIGSERIAL PRIMARY KEY, service TEXT NOT NULL, status TEXT NOT NULL,
  latency_ms INT, detail JSONB, checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_health_checks TO authenticated;
GRANT ALL ON public.system_health_checks TO service_role;
ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY shc_admin ON public.system_health_checks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 10) FEATURE FLAGS
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percent INT NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  audience JSONB NOT NULL DEFAULT '{}'::jsonb, description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY ff_public_read ON public.feature_flags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ff_admin_write ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 11) A/B EXPERIMENTS
CREATE TABLE IF NOT EXISTS public.ab_experiments (
  key TEXT PRIMARY KEY, variants TEXT[] NOT NULL, weights INT[],
  active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ab_experiments TO anon, authenticated;
GRANT ALL ON public.ab_experiments TO service_role;
ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY abe_public ON public.ab_experiments FOR SELECT TO anon, authenticated USING (active);

CREATE TABLE IF NOT EXISTS public.ab_assignments (
  user_id UUID NOT NULL,
  experiment_key TEXT NOT NULL REFERENCES public.ab_experiments(key) ON DELETE CASCADE,
  variant TEXT NOT NULL, assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, experiment_key)
);
GRANT SELECT, INSERT ON public.ab_assignments TO authenticated;
GRANT ALL ON public.ab_assignments TO service_role;
ALTER TABLE public.ab_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY aba_self ON public.ab_assignments FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 12) GEO INTELLIGENCE
CREATE TABLE IF NOT EXISTS public.geo_intelligence (
  ip INET PRIMARY KEY, country TEXT, city TEXT, asn TEXT,
  is_proxy BOOLEAN DEFAULT false, is_tor BOOLEAN DEFAULT false,
  risk_score INT DEFAULT 0, last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.geo_intelligence TO service_role;
ALTER TABLE public.geo_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY gi_admin ON public.geo_intelligence FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 13) JOB QUEUE
CREATE TABLE IF NOT EXISTS public.job_queue (
  id BIGSERIAL PRIMARY KEY, job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
  attempts INT NOT NULL DEFAULT 0, max_attempts INT NOT NULL DEFAULT 3,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.job_queue TO service_role;
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_jq_pending ON public.job_queue(status, scheduled_for) WHERE status = 'pending';

-- soft delete columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_projects_not_deleted ON public.projects(created_at DESC) WHERE deleted_at IS NULL;

-- 14) MARKET STATS MATERIALIZED VIEW
DROP MATERIALIZED VIEW IF EXISTS public.market_stats_mv;
CREATE MATERIALIZED VIEW public.market_stats_mv AS
SELECT
  count(*) AS total_projects,
  count(*) FILTER (WHERE status = 'active') AS active_projects,
  count(*) FILTER (WHERE created_at > now()-interval '24 hours') AS new_24h,
  coalesce(avg(NULLIF(ai_score,0)),0) AS avg_ai_score,
  coalesce(avg(NULLIF(share_price,0)),0) AS avg_share_price,
  count(DISTINCT owner_id) AS unique_owners,
  now() AS refreshed_at
FROM public.projects
WHERE deleted_at IS NULL;
GRANT SELECT ON public.market_stats_mv TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_market_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN REFRESH MATERIALIZED VIEW public.market_stats_mv; END; $$;
GRANT EXECUTE ON FUNCTION public.refresh_market_stats() TO service_role;

-- 15) PRICE WATCH TRIGGER
CREATE OR REPLACE FUNCTION public.notify_price_watchers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; _change_pct NUMERIC;
BEGIN
  IF NEW.share_price IS NULL OR OLD.share_price IS NULL OR OLD.share_price = 0 THEN RETURN NEW; END IF;
  _change_pct := ((NEW.share_price - OLD.share_price) / OLD.share_price) * 100;
  FOR r IN SELECT * FROM public.price_watch_rules WHERE active AND (project_id IS NULL OR project_id = NEW.id) LOOP
    IF (r.condition = 'above'      AND NEW.share_price >= r.threshold) OR
       (r.condition = 'below'      AND NEW.share_price <= r.threshold) OR
       (r.condition = 'change_pct' AND abs(_change_pct) >= r.threshold) THEN
      INSERT INTO public.realtime_events(channel, event, payload, user_id)
      VALUES ('price_alerts','triggered',
        jsonb_build_object('project_id', NEW.id, 'price', NEW.share_price, 'change_pct', _change_pct, 'rule_id', r.id),
        r.user_id);
      UPDATE public.price_watch_rules
        SET triggered_count = triggered_count + 1, last_triggered_at = now()
        WHERE id = r.id;
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_price_watchers ON public.projects;
CREATE TRIGGER trg_notify_price_watchers
  AFTER UPDATE OF share_price ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.notify_price_watchers();
