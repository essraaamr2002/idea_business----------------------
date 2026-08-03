
-- 1) Extend ad_campaigns
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS objective text NOT NULL DEFAULT 'clicks' CHECK (objective IN ('views','clicks','conversions','investors','shares')),
  ADD COLUMN IF NOT EXISTS schedule_start timestamptz,
  ADD COLUMN IF NOT EXISTS schedule_end timestamptz,
  ADD COLUMN IF NOT EXISTS daypart jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS bid_strategy text NOT NULL DEFAULT 'auto' CHECK (bid_strategy IN ('auto','manual')),
  ADD COLUMN IF NOT EXISTS bid_amount numeric(10,4),
  ADD COLUMN IF NOT EXISTS device_targeting jsonb NOT NULL DEFAULT '{"mobile":true,"desktop":true,"tablet":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS city_targeting text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quality_score integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS marketplace_link_type text CHECK (marketplace_link_type IN ('project','share','portal','product','none')),
  ADD COLUMN IF NOT EXISTS marketplace_link_id uuid,
  ADD COLUMN IF NOT EXISTS review_state text NOT NULL DEFAULT 'pending' CHECK (review_state IN ('pending','approved','changes_requested')),
  ADD COLUMN IF NOT EXISTS conversions_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_alert_sent_at timestamptz;

-- 2) ad_conversions
CREATE TABLE IF NOT EXISTS public.ad_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('signup','purchase','share_buy','investment','project_view','contact')),
  value numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_conversions_campaign ON public.ad_conversions(campaign_id, created_at DESC);
GRANT SELECT, INSERT ON public.ad_conversions TO authenticated;
GRANT ALL ON public.ad_conversions TO service_role;
ALTER TABLE public.ad_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own conversions" ON public.ad_conversions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = campaign_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone can record conversion" ON public.ad_conversions FOR INSERT TO authenticated WITH CHECK (true);

-- 3) ad_blocked_keywords
CREATE TABLE IF NOT EXISTS public.ad_blocked_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_blocked_keywords TO authenticated;
GRANT ALL ON public.ad_blocked_keywords TO service_role;
ALTER TABLE public.ad_blocked_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed can read keywords" ON public.ad_blocked_keywords FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage keywords" ON public.ad_blocked_keywords FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4) ad_support_tickets
CREATE TABLE IF NOT EXISTS public.ad_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_reply text,
  admin_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_support_user ON public.ad_support_tickets(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.ad_support_tickets TO authenticated;
GRANT ALL ON public.ad_support_tickets TO service_role;
ALTER TABLE public.ad_support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own tickets" ON public.ad_support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create tickets" ON public.ad_support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner or admin update" ON public.ad_support_tickets FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_ad_support_tickets_updated_at BEFORE UPDATE ON public.ad_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) ad_audit_log
CREATE TABLE IF NOT EXISTS public.ad_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_audit_campaign ON public.ad_audit_log(campaign_id, created_at DESC);
GRANT SELECT, INSERT ON public.ad_audit_log TO authenticated;
GRANT ALL ON public.ad_audit_log TO service_role;
ALTER TABLE public.ad_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin reads audit" ON public.ad_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = campaign_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "System inserts audit" ON public.ad_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- 6) Functions
CREATE OR REPLACE FUNCTION public.compute_ad_quality_score(p_campaign_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.ad_campaigns;
  ctr numeric := 0;
  conv_rate numeric := 0;
  base int := 50;
  score int;
BEGIN
  SELECT * INTO c FROM public.ad_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF c.impressions > 100 THEN
    ctr := (c.clicks::numeric / NULLIF(c.impressions,0)::numeric) * 100;
  END IF;
  IF c.clicks > 0 THEN
    conv_rate := (c.conversions_count::numeric / NULLIF(c.clicks,0)::numeric) * 100;
  END IF;
  -- weighted: base + CTR contribution (up to +30) + conversion (up to +20)
  score := base + LEAST(30, (ctr * 6)::int) + LEAST(20, (conv_rate * 2)::int);
  IF c.rejection_reason IS NOT NULL THEN score := score - 20; END IF;
  score := GREATEST(0, LEAST(100, score));
  UPDATE public.ad_campaigns SET quality_score = score WHERE id = p_campaign_id;
  RETURN score;
END $$;

CREATE OR REPLACE FUNCTION public.record_ad_conversion(p_campaign_id uuid, p_kind text, p_value numeric DEFAULT 0, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_kind NOT IN ('signup','purchase','share_buy','investment','project_view','contact') THEN
    RAISE EXCEPTION 'invalid conversion kind';
  END IF;
  INSERT INTO public.ad_conversions(campaign_id, user_id, kind, value, metadata)
    VALUES (p_campaign_id, auth.uid(), p_kind, COALESCE(p_value,0), COALESCE(p_metadata,'{}'::jsonb))
    RETURNING id INTO v_id;
  UPDATE public.ad_campaigns SET conversions_count = conversions_count + 1 WHERE id = p_campaign_id;
  PERFORM public.compute_ad_quality_score(p_campaign_id);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.duplicate_ad_campaign(p_source_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); src public.ad_campaigns; new_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO src FROM public.ad_campaigns WHERE id = p_source_id;
  IF src.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF src.owner_id <> v_uid AND NOT public.has_role(v_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.ad_campaigns(
    owner_id, project_id, headline, body, media_url, media_type, cta_label, cta_url,
    daily_budget, total_budget, currency, duration_days, targeting,
    objective, daypart, bid_strategy, bid_amount, device_targeting, city_targeting, interests,
    marketplace_link_type, marketplace_link_id
  ) VALUES (
    v_uid, src.project_id, src.headline || ' (نسخة)', src.body, src.media_url, src.media_type, src.cta_label, src.cta_url,
    src.daily_budget, src.total_budget, src.currency, src.duration_days, src.targeting,
    src.objective, src.daypart, src.bid_strategy, src.bid_amount, src.device_targeting, src.city_targeting, src.interests,
    src.marketplace_link_type, src.marketplace_link_id
  ) RETURNING id INTO new_id;
  INSERT INTO public.ad_audit_log(campaign_id, actor_id, action, diff)
    VALUES (new_id, v_uid, 'duplicated', jsonb_build_object('source', p_source_id));
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.check_ad_content_blocked(p_text text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE bad text;
BEGIN
  IF p_text IS NULL OR length(p_text) = 0 THEN RETURN NULL; END IF;
  SELECT keyword INTO bad FROM public.ad_blocked_keywords
    WHERE position(lower(keyword) IN lower(p_text)) > 0 LIMIT 1;
  RETURN bad;
END $$;

-- 7) Audit trigger on ad_campaigns
CREATE OR REPLACE FUNCTION public.tg_audit_ad_campaign()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_audit_log(campaign_id, actor_id, action, diff)
      VALUES (NEW.id, auth.uid(), 'created', jsonb_build_object('status', NEW.status, 'budget', NEW.total_budget));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.ad_audit_log(campaign_id, actor_id, action, diff)
        VALUES (NEW.id, auth.uid(), 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_audit_ad_campaign ON public.ad_campaigns;
CREATE TRIGGER tg_audit_ad_campaign AFTER INSERT OR UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_ad_campaign();
