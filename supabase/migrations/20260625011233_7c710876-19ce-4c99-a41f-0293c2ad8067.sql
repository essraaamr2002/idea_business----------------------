
-- ============================================
-- 🔒 SECURITY FIX
-- ============================================
DROP POLICY IF EXISTS projects_public_read ON public.projects;

CREATE OR REPLACE VIEW public.projects_public AS
SELECT
  id, owner_id, ticker, name, description, sector, country, city,
  status, currency, cover_image_url, target_investment, current_price,
  shares_total, shares_sold, ai_score, views_count, likes_count,
  created_at, updated_at,
  CASE WHEN show_whatsapp = true THEN whatsapp ELSE NULL END AS whatsapp_visible
FROM public.projects
WHERE status IN ('active', 'halted', 'closed');

GRANT SELECT ON public.projects_public TO anon, authenticated;

DROP POLICY IF EXISTS projects_authenticated_read ON public.projects;
DROP POLICY IF EXISTS projects_anon_safe_read ON public.projects;

CREATE POLICY projects_authenticated_read ON public.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY projects_anon_safe_read ON public.projects
  FOR SELECT TO anon USING (status IN ('active','halted','closed'));

REVOKE SELECT (phone, whatsapp) ON public.projects FROM anon;

-- ============================================
-- 🔔 PUSH SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  categories JSONB DEFAULT '["wallet","deals","messages","prices","news"]'::jsonb,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subs_own ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- 🏆 GAMIFICATION
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  icon TEXT,
  points INT DEFAULT 10,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY achievements_public_read ON public.achievements FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY ua_own_read ON public.user_achievements FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY ua_public_read ON public.user_achievements FOR SELECT TO anon USING (true);

CREATE TABLE IF NOT EXISTS public.user_points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason TEXT NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.user_points_log TO authenticated;
GRANT ALL ON public.user_points_log TO service_role;
ALTER TABLE public.user_points_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY upl_own ON public.user_points_log FOR SELECT TO authenticated USING (user_id = auth.uid());

INSERT INTO public.achievements (id, name_ar, description_ar, icon, points, tier, category) VALUES
  ('first_investment', 'أول استثمار', 'قمت بأول استثمار في المنصة', 'rocket', 50, 'bronze', 'investing'),
  ('ten_deals', '10 صفقات مكتملة', 'أكملت 10 صفقات بنجاح', 'trophy', 200, 'gold', 'investing'),
  ('verified_member', 'عضو موثق', 'أكملت توثيق KYC', 'shield-check', 30, 'bronze', 'profile'),
  ('active_investor', 'مستثمر نشط', '5 استثمارات في 30 يوم', 'flame', 150, 'silver', 'investing'),
  ('profile_complete', 'ملف مكتمل', 'أكملت ملفك الشخصي 100%', 'user-check', 20, 'bronze', 'profile'),
  ('first_project', 'أول مشروع', 'نشرت أول مشروع لك', 'lightbulb', 50, 'bronze', 'founding'),
  ('referral_5', 'سفير المنصة', 'دعوت 5 أصدقاء', 'users', 100, 'silver', 'social'),
  ('streak_30', 'مواظبة شهرية', 'دخلت المنصة 30 يوم متتالية', 'calendar-check', 200, 'gold', 'engagement')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ⚙️ INTEGRATION CONFIGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.integration_configs (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  category TEXT NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}'::jsonb,
  last_tested_at TIMESTAMPTZ,
  last_test_ok BOOLEAN,
  last_test_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE ON public.integration_configs TO authenticated;
GRANT ALL ON public.integration_configs TO service_role;
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ic_admin_all ON public.integration_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.integration_configs (id, name_ar, category) VALUES
  ('postal_smtp', 'Postal SMTP (بريد ذاتي)', 'email'),
  ('playsms_gateway', 'PlaySMS Gateway', 'sms'),
  ('jitsi_meet', 'Jitsi Meet (مكالمات فيديو)', 'video'),
  ('ollama_llm', 'Ollama (نماذج ذكاء ذاتية)', 'ai'),
  ('minio_storage', 'MinIO (تخزين S3-متوافق)', 'storage'),
  ('matrix_chat', 'Matrix/Synapse Chat', 'chat'),
  ('n8n_automation', 'n8n (أتمتة سير العمل)', 'automation'),
  ('plausible_analytics', 'Plausible Analytics', 'analytics'),
  ('libretranslate', 'LibreTranslate', 'translation'),
  ('stable_diffusion', 'Stable Diffusion', 'imagegen'),
  ('docuseal_esign', 'DocuSeal (توقيع إلكتروني)', 'esign'),
  ('cal_com', 'Cal.com (جدولة مواعيد)', 'calendar'),
  ('keycloak_auth', 'Keycloak (مصادقة متقدمة)', 'auth'),
  ('metabase_bi', 'Metabase (تقارير وتحليلات)', 'bi'),
  ('meilisearch', 'Meilisearch (بحث فوري)', 'search'),
  ('uptime_kuma', 'Uptime Kuma (مراقبة)', 'monitoring')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 📊 PAGE VIEWS + SEARCH QUERIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.page_views (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  country TEXT,
  device TEXT,
  session_hash TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pv_path_idx ON public.page_views(path);
CREATE INDEX IF NOT EXISTS pv_created_idx ON public.page_views(created_at DESC);

GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY pv_insert_any ON public.page_views FOR INSERT WITH CHECK (true);
CREATE POLICY pv_admin_read ON public.page_views FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.search_queries (
  id BIGSERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  results_count INT DEFAULT 0,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT INSERT ON public.search_queries TO anon, authenticated;
GRANT SELECT ON public.search_queries TO authenticated;
GRANT ALL ON public.search_queries TO service_role;
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY sq_insert_any ON public.search_queries FOR INSERT WITH CHECK (true);
CREATE POLICY sq_admin_read ON public.search_queries FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============================================
-- 🔍 UNIFIED SEARCH FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.unified_search(q TEXT, lim INT DEFAULT 20)
RETURNS TABLE (kind TEXT, id TEXT, title TEXT, snippet TEXT, url TEXT, score REAL)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  (SELECT 'project'::TEXT, p.id::TEXT, p.name,
          LEFT(COALESCE(p.description,''),160),
          '/projects/'||p.id::TEXT,
          1.0::REAL
   FROM public.projects p
   WHERE p.status IN ('active','halted','closed')
     AND (p.name ILIKE '%'||q||'%' OR p.description ILIKE '%'||q||'%' OR p.sector ILIKE '%'||q||'%')
   LIMIT lim)
  UNION ALL
  (SELECT 'article'::TEXT, a.id::TEXT, a.title,
          LEFT(COALESCE(a.excerpt, a.content),160),
          '/blog/'||a.slug,
          1.0::REAL
   FROM public.articles a
   WHERE a.published = true
     AND (a.title ILIKE '%'||q||'%' OR a.content ILIKE '%'||q||'%')
   LIMIT lim)
  UNION ALL
  (SELECT 'user'::TEXT, pr.id::TEXT,
          COALESCE(pr.display_name, pr.pseudonym, 'مستخدم'),
          LEFT(COALESCE(pr.bio,''),160),
          '/u/'||pr.id::TEXT,
          1.0::REAL
   FROM public.profiles pr
   WHERE pr.is_public_profile = true
     AND (pr.display_name ILIKE '%'||q||'%' OR pr.pseudonym ILIKE '%'||q||'%' OR pr.bio ILIKE '%'||q||'%')
   LIMIT lim);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unified_search(TEXT, INT) TO anon, authenticated;

-- ============================================
-- ⭐ POINTS + ACHIEVEMENTS helpers
-- ============================================
CREATE OR REPLACE FUNCTION public.award_points(_user UUID, _points INT, _reason TEXT, _ref_type TEXT DEFAULT NULL, _ref_id TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_points_log(user_id, points, reason, ref_type, ref_id)
  VALUES (_user, _points, _reason, _ref_type, _ref_id);
END; $$;
GRANT EXECUTE ON FUNCTION public.award_points(UUID,INT,TEXT,TEXT,TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.unlock_achievement(_user UUID, _achievement TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pts INT; _inserted BOOLEAN := FALSE;
BEGIN
  INSERT INTO public.user_achievements(user_id, achievement_id) VALUES (_user, _achievement)
  ON CONFLICT (user_id, achievement_id) DO NOTHING
  RETURNING TRUE INTO _inserted;
  IF _inserted THEN
    SELECT points INTO _pts FROM public.achievements WHERE id = _achievement;
    IF _pts IS NOT NULL THEN
      PERFORM public.award_points(_user, _pts, 'achievement:'||_achievement, 'achievement', _achievement);
    END IF;
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END; $$;
GRANT EXECUTE ON FUNCTION public.unlock_achievement(UUID,TEXT) TO authenticated, service_role;
