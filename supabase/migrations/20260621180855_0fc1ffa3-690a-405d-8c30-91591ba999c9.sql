
-- ====== ENUM ======
DO $$ BEGIN
  CREATE TYPE public.ad_status AS ENUM ('draft','pending_payment','active','paused','completed','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ====== ad_campaigns ======
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  headline text NOT NULL,
  body text,
  media_url text,
  media_type text CHECK (media_type IN ('image','video') OR media_type IS NULL),
  cta_label text NOT NULL DEFAULT 'اعرف المزيد',
  cta_url text NOT NULL,
  daily_budget numeric NOT NULL CHECK (daily_budget > 0),
  total_budget numeric NOT NULL CHECK (total_budget > 0),
  currency text NOT NULL DEFAULT 'SAR',
  duration_days integer NOT NULL CHECK (duration_days BETWEEN 1 AND 60),
  start_at timestamptz,
  end_at timestamptz,
  status public.ad_status NOT NULL DEFAULT 'draft',
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  spent numeric NOT NULL DEFAULT 0,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_self_select" ON public.ad_campaigns
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "ads_self_insert" ON public.ad_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "ads_self_update" ON public.ad_campaigns
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status_end ON public.ad_campaigns(status, end_at);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_owner ON public.ad_campaigns(owner_id, created_at DESC);

CREATE TRIGGER ad_campaigns_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Protect counters and status from client tampering
CREATE OR REPLACE FUNCTION public.protect_ad_campaigns_cols()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_service boolean := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role', false);
BEGIN
  IF TG_OP = 'INSERT' AND NOT is_service THEN
    NEW.impressions := 0;
    NEW.clicks := 0;
    NEW.spent := 0;
    NEW.status := 'draft';
    NEW.start_at := NULL;
    NEW.end_at := NULL;
    NEW.rejection_reason := NULL;
  ELSIF TG_OP = 'UPDATE' AND NOT is_service THEN
    NEW.impressions := OLD.impressions;
    NEW.clicks := OLD.clicks;
    NEW.spent := OLD.spent;
    NEW.rejection_reason := OLD.rejection_reason;
    -- Only allow pausing/resuming an active/paused campaign from client
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT ((OLD.status = 'active' AND NEW.status = 'paused')
           OR (OLD.status = 'paused' AND NEW.status = 'active')) THEN
        NEW.status := OLD.status;
      END IF;
    END IF;
    NEW.start_at := OLD.start_at;
    NEW.end_at := OLD.end_at;
    NEW.owner_id := OLD.owner_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_protect_ad_campaigns ON public.ad_campaigns;
CREATE TRIGGER tg_protect_ad_campaigns
  BEFORE INSERT OR UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.protect_ad_campaigns_cols();

-- ====== ad_events ======
CREATE TABLE IF NOT EXISTS public.ad_events (
  id bigserial PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('impression','click')),
  country text,
  age_bracket text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ad_events TO service_role;
-- intentionally no grants to anon/authenticated; access only via SECURITY DEFINER RPC

ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_events_admin_read" ON public.ad_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_ad_events_campaign_day ON public.ad_events(campaign_id, created_at DESC);

-- ====== Pricing constants (very simple v1) ======
-- 1 impression = 0.01 currency unit, 1 click = 0.50 currency unit
CREATE OR REPLACE FUNCTION public._ad_price_impression() RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 0.01::numeric $$;
CREATE OR REPLACE FUNCTION public._ad_price_click() RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 0.50::numeric $$;

-- ====== record_ad_event ======
CREATE OR REPLACE FUNCTION public.record_ad_event(p_campaign_id uuid, p_kind text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_viewer uuid := auth.uid();
  v_country text;
  v_dob date;
  v_age int;
  v_bracket text;
  v_cost numeric;
  v_campaign public.ad_campaigns;
  v_today_spend numeric;
BEGIN
  IF p_kind NOT IN ('impression','click') THEN RAISE EXCEPTION 'invalid kind'; END IF;

  SELECT * INTO v_campaign FROM public.ad_campaigns WHERE id = p_campaign_id FOR UPDATE;
  IF v_campaign.id IS NULL OR v_campaign.status <> 'active' THEN RETURN; END IF;
  IF v_campaign.end_at IS NOT NULL AND v_campaign.end_at < now() THEN RETURN; END IF;

  IF v_viewer IS NOT NULL THEN
    SELECT country, date_of_birth INTO v_country, v_dob FROM public.profiles WHERE id = v_viewer;
    IF v_dob IS NOT NULL THEN
      v_age := EXTRACT(YEAR FROM age(v_dob))::int;
      v_bracket := CASE
        WHEN v_age < 18 THEN '<18'
        WHEN v_age < 25 THEN '18-24'
        WHEN v_age < 35 THEN '25-34'
        WHEN v_age < 45 THEN '35-44'
        WHEN v_age < 55 THEN '45-54'
        ELSE '55+' END;
    END IF;
  END IF;

  -- Light per-viewer dedupe: ignore repeat impression of the same campaign within 1 minute
  IF p_kind = 'impression' AND v_viewer IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.ad_events
      WHERE campaign_id = p_campaign_id AND viewer_id = v_viewer
        AND kind = 'impression' AND created_at > now() - INTERVAL '1 minute'
    ) THEN RETURN; END IF;
  END IF;

  v_cost := CASE WHEN p_kind = 'impression' THEN public._ad_price_impression() ELSE public._ad_price_click() END;

  -- Daily budget guard
  SELECT COALESCE(SUM(CASE WHEN kind='impression' THEN public._ad_price_impression() ELSE public._ad_price_click() END),0)
    INTO v_today_spend
    FROM public.ad_events
    WHERE campaign_id = p_campaign_id AND created_at::date = CURRENT_DATE;
  IF v_today_spend + v_cost > v_campaign.daily_budget THEN RETURN; END IF;

  -- Total budget guard
  IF v_campaign.spent + v_cost > v_campaign.total_budget THEN
    UPDATE public.ad_campaigns SET status = 'completed' WHERE id = p_campaign_id;
    RETURN;
  END IF;

  INSERT INTO public.ad_events(campaign_id, viewer_id, kind, country, age_bracket)
    VALUES (p_campaign_id, v_viewer, p_kind, v_country, v_bracket);

  UPDATE public.ad_campaigns
    SET impressions = impressions + (CASE WHEN p_kind='impression' THEN 1 ELSE 0 END),
        clicks      = clicks      + (CASE WHEN p_kind='click'      THEN 1 ELSE 0 END),
        spent       = spent + v_cost
    WHERE id = p_campaign_id;
END $$;

GRANT EXECUTE ON FUNCTION public.record_ad_event(uuid, text) TO anon, authenticated;

-- ====== pick_active_ads ======
CREATE OR REPLACE FUNCTION public.pick_active_ads(p_limit int DEFAULT 5)
RETURNS TABLE(
  id uuid, owner_id uuid, project_id uuid, headline text, body text,
  media_url text, media_type text, cta_label text, cta_url text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_viewer uuid := auth.uid();
  v_country text;
  v_age int;
BEGIN
  IF v_viewer IS NOT NULL THEN
    SELECT p.country,
           CASE WHEN p.date_of_birth IS NULL THEN NULL ELSE EXTRACT(YEAR FROM age(p.date_of_birth))::int END
      INTO v_country, v_age
      FROM public.profiles p WHERE p.id = v_viewer;
  END IF;

  RETURN QUERY
  SELECT c.id, c.owner_id, c.project_id, c.headline, c.body,
         c.media_url, c.media_type, c.cta_label, c.cta_url
    FROM public.ad_campaigns c
   WHERE c.status = 'active'
     AND (c.end_at IS NULL OR c.end_at > now())
     AND c.spent < c.total_budget
     -- country targeting (empty => all)
     AND (
       NOT (c.targeting ? 'countries')
       OR jsonb_array_length(COALESCE(c.targeting->'countries','[]'::jsonb)) = 0
       OR (v_country IS NOT NULL AND c.targeting->'countries' @> to_jsonb(ARRAY[v_country]))
     )
     -- age targeting (NULL => skip)
     AND (
       v_age IS NULL
       OR NOT (c.targeting ? 'age_min')
       OR v_age >= COALESCE((c.targeting->>'age_min')::int, 0)
     )
     AND (
       v_age IS NULL
       OR NOT (c.targeting ? 'age_max')
       OR v_age <= COALESCE((c.targeting->>'age_max')::int, 200)
     )
     -- daily budget not exhausted
     AND (
       SELECT COALESCE(SUM(CASE WHEN kind='impression' THEN public._ad_price_impression() ELSE public._ad_price_click() END),0)
         FROM public.ad_events e
        WHERE e.campaign_id = c.id AND e.created_at::date = CURRENT_DATE
     ) < c.daily_budget
   ORDER BY random()
   LIMIT GREATEST(p_limit, 1);
END $$;

GRANT EXECUTE ON FUNCTION public.pick_active_ads(int) TO anon, authenticated;

-- ====== launch_ad_campaign ======
CREATE OR REPLACE FUNCTION public.launch_ad_campaign(p_campaign_id uuid)
RETURNS TABLE(status public.ad_status, balance numeric, needed numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_campaign public.ad_campaigns;
  v_bal numeric;
  v_ref text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO v_campaign FROM public.ad_campaigns WHERE id = p_campaign_id FOR UPDATE;
  IF v_campaign.id IS NULL THEN RAISE EXCEPTION 'campaign not found'; END IF;
  IF v_campaign.owner_id <> v_uid THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_campaign.status NOT IN ('draft','pending_payment') THEN RAISE EXCEPTION 'campaign already launched'; END IF;

  SELECT w.balance INTO v_bal FROM public.wallets w WHERE w.user_id = v_uid FOR UPDATE;
  IF v_bal IS NULL OR v_bal < v_campaign.total_budget THEN
    UPDATE public.ad_campaigns SET status = 'pending_payment' WHERE id = p_campaign_id;
    RETURN QUERY SELECT 'pending_payment'::public.ad_status, COALESCE(v_bal,0), v_campaign.total_budget; RETURN;
  END IF;

  v_ref := 'ad:' || p_campaign_id::text;
  UPDATE public.wallets SET balance = balance - v_campaign.total_budget WHERE user_id = v_uid;
  INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
    VALUES (v_uid, -(v_campaign.total_budget * 100)::bigint, 'ad_spend', v_ref, (v_bal*100)::bigint, ((v_bal - v_campaign.total_budget)*100)::bigint);

  UPDATE public.ad_campaigns
     SET status = 'active',
         start_at = now(),
         end_at = now() + (v_campaign.duration_days || ' days')::interval
   WHERE id = p_campaign_id;

  RETURN QUERY SELECT 'active'::public.ad_status, v_bal - v_campaign.total_budget, v_campaign.total_budget;
END $$;

GRANT EXECUTE ON FUNCTION public.launch_ad_campaign(uuid) TO authenticated;

-- ====== pause/resume ======
CREATE OR REPLACE FUNCTION public.pause_ad_campaign(p_campaign_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.ad_campaigns SET status='paused'
   WHERE id = p_campaign_id AND owner_id = auth.uid() AND status = 'active';
END $$;
GRANT EXECUTE ON FUNCTION public.pause_ad_campaign(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.resume_ad_campaign(p_campaign_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.ad_campaigns SET status='active'
   WHERE id = p_campaign_id AND owner_id = auth.uid() AND status = 'paused'
     AND (end_at IS NULL OR end_at > now()) AND spent < total_budget;
END $$;
GRANT EXECUTE ON FUNCTION public.resume_ad_campaign(uuid) TO authenticated;
