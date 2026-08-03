
-- Badges catalog
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name_ar VARCHAR(50) NOT NULL,
  icon_emoji VARCHAR(10) NOT NULL,
  icon_url TEXT,
  description TEXT NOT NULL,
  points_reward INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges readable by all" ON public.badges FOR SELECT USING (true);

INSERT INTO public.badges (code, name_ar, icon_emoji, description, points_reward) VALUES
  ('BIRD','الطير','🪿','عضو نشط اجتماعياً: تعليقات وإعجابات وإعادة نشر متكررة في المجتمع',150),
  ('DEER','الغزال','🦌','صاحب فكرة/مشروع جذب عروضاً متعددة وتفاعل مكثف مع المهتمين',300),
  ('LION','الأسد','🦁','حضور صامت متكرر، يقرأ ويقدم عروضاً سخية لأصحاب المشاريع',400);

-- Awarded badges (1 per user, no merging)
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id),
  awarded_by VARCHAR(20) NOT NULL DEFAULT 'system_auto',
  scoring_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_badges TO anon, authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_badges readable by all" ON public.user_badges FOR SELECT USING (true);

-- Weekly evaluation function
CREATE OR REPLACE FUNCTION public.evaluate_weekly_badges()
RETURNS TABLE(user_id UUID, code TEXT, score NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  s_bird NUMERIC; s_deer NUMERIC; s_lion NUMERIC; winner NUMERIC;
  win_code TEXT; badge_uuid UUID; snap JSONB;
  min_threshold NUMERIC := 25;
BEGIN
  FOR r IN
    SELECT p.id AS uid, p.created_at
    FROM public.profiles p
    WHERE p.created_at <= now() - interval '7 days'
      AND NOT EXISTS (SELECT 1 FROM public.user_badges ub WHERE ub.user_id = p.id)
  LOOP
    -- BIRD: community engagement (last 30d)
    SELECT
      LEAST(100,
        LEAST(COALESCE((SELECT count(*) FROM public.community_post_comments WHERE user_id=r.uid AND created_at > now()-interval '30 days'),0),40) * 1.2 +
        LEAST(COALESCE((SELECT count(*) FROM public.community_post_likes WHERE user_id=r.uid AND created_at > now()-interval '30 days'),0),80) * 0.5 +
        LEAST(COALESCE((SELECT count(*) FROM public.community_post_reposts WHERE user_id=r.uid AND created_at > now()-interval '30 days'),0),20) * 2.0
      ) INTO s_bird;

    -- DEER: project owner attracting offers
    SELECT
      CASE WHEN (SELECT count(*) FROM public.projects WHERE founder_id=r.uid) = 0 THEN 0
      ELSE LEAST(100,
        LEAST(COALESCE((SELECT count(*) FROM public.investment_offers WHERE owner_id=r.uid AND created_at > now()-interval '30 days'),0),15) * 3.0 +
        LEAST(COALESCE((SELECT count(DISTINCT investor_id) FROM public.investment_offers WHERE owner_id=r.uid AND created_at > now()-interval '30 days'),0),20) * 2.5
      ) END INTO s_deer;

    -- LION: quiet investor giving generous offers
    SELECT LEAST(100,
      LEAST(COALESCE((SELECT count(*) FROM public.investment_offers WHERE investor_id=r.uid AND created_at > now()-interval '30 days'),0),10) * 5.0 +
      LEAST(COALESCE((SELECT COALESCE(sum(amount),0)/10000 FROM public.investment_offers WHERE investor_id=r.uid AND created_at > now()-interval '30 days'),0),40) +
      CASE WHEN COALESCE((SELECT count(*) FROM public.community_posts WHERE user_id=r.uid AND created_at > now()-interval '30 days'),0) <= 2 THEN 15 ELSE 0 END
    ) INTO s_lion;

    winner := GREATEST(s_bird, s_deer, s_lion);
    IF winner < min_threshold THEN CONTINUE; END IF;

    win_code := CASE winner WHEN s_deer THEN 'DEER' WHEN s_lion THEN 'LION' ELSE 'BIRD' END;
    SELECT id INTO badge_uuid FROM public.badges WHERE code = win_code;
    snap := jsonb_build_object('bird',s_bird,'deer',s_deer,'lion',s_lion,'evaluated_at',now());

    INSERT INTO public.user_badges (user_id, badge_id, scoring_snapshot)
    VALUES (r.uid, badge_uuid, snap);

    -- award points
    INSERT INTO public.user_points_log (user_id, points, action_type, reference_id, description)
    SELECT r.uid, b.points_reward, 'badge_awarded', badge_uuid, 'وسام ' || b.name_ar
    FROM public.badges b WHERE b.id = badge_uuid;

    -- notify user
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT r.uid, 'badge_awarded',
      'مبروك! حصلت على وسام ' || b.name_ar || ' ' || b.icon_emoji,
      b.description || E'\n+' || b.points_reward || ' نقطة مكافأة',
      jsonb_build_object('badge_code', b.code, 'points', b.points_reward)
    FROM public.badges b WHERE b.id = badge_uuid;

    -- publish news article
    INSERT INTO public.articles (slug, title, excerpt, content, language, published, published_at, category, event_type, event_ref_id, ai_generated)
    SELECT
      'badge-' || win_code || '-' || substr(r.uid::text,1,8) || '-' || extract(epoch from now())::bigint,
      'وسام ' || b.name_ar || ' ' || b.icon_emoji || ' لعضو جديد في حراج المشاريع',
      'منحت المنصة وسام ' || b.name_ar || ' لأحد أعضائها تقديراً لنشاطه المميز',
      E'## وسام ' || b.name_ar || ' ' || b.icon_emoji || E'\n\n' || b.description || E'\n\nهذا الوسام تلقائي بناءً على تحليل السلوك عبر الوكلاء الستة الأذكياء على المنصة.',
      'ar', true, now(), 'community', 'badge_awarded', badge_uuid, true
    FROM public.badges b WHERE b.id = badge_uuid;

    user_id := r.uid; code := win_code; score := winner;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_weekly_badges() FROM public;
GRANT EXECUTE ON FUNCTION public.evaluate_weekly_badges() TO service_role;

-- Weekly cron: every Sunday 03:00 UTC
SELECT cron.schedule('weekly-badges-eval','0 3 * * 0',$$SELECT public.evaluate_weekly_badges();$$);
