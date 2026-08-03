-- ============================================================
-- 4-tier membership system
-- ============================================================

-- 1) Extend the enum (must run before functions cast to new values)
ALTER TYPE public.membership_tier ADD VALUE IF NOT EXISTS 'silver';
ALTER TYPE public.membership_tier ADD VALUE IF NOT EXISTS 'gold';
ALTER TYPE public.membership_tier ADD VALUE IF NOT EXISTS 'platinum';

COMMIT;
BEGIN;

-- 2) Plans config table (admin-editable, public readable)
CREATE TABLE IF NOT EXISTS public.membership_plans (
  tier              text PRIMARY KEY,
  name_ar           text NOT NULL,
  name_en           text NOT NULL,
  price_sar         numeric(10,2) NOT NULL DEFAULT 0,
  projects_cap      integer NOT NULL DEFAULT 1,   -- -1 = unlimited
  likes_cap         integer NOT NULL DEFAULT 5,
  comments_cap      integer NOT NULL DEFAULT 5,
  other_cap         integer NOT NULL DEFAULT 5,
  verified_badge    boolean NOT NULL DEFAULT false,
  priority_support  boolean NOT NULL DEFAULT false,
  ai_advanced       boolean NOT NULL DEFAULT false,
  dedicated_manager boolean NOT NULL DEFAULT false,
  sort_order        integer NOT NULL DEFAULT 0,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.membership_plans TO anon, authenticated;
GRANT ALL    ON public.membership_plans TO service_role;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mp_public_read ON public.membership_plans;
CREATE POLICY mp_public_read ON public.membership_plans FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS mp_admin_write ON public.membership_plans;
CREATE POLICY mp_admin_write ON public.membership_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed the 4 tiers (idempotent)
INSERT INTO public.membership_plans
  (tier,       name_ar,     name_en,     price_sar, projects_cap, likes_cap, comments_cap, other_cap, verified_badge, priority_support, ai_advanced, dedicated_manager, sort_order)
VALUES
  ('basic',    'المجانية',  'Free',         0,   1,   5,   5,   5,   false, false, false, false, 1),
  ('silver',   'الفضية',    'Silver',       25,  5,   50,  50,  100, false, false, false, false, 2),
  ('gold',     'الذهبية',   'Gold',         75,  25,  500, 500, 1000,true,  true,  true,  false, 3),
  ('platinum', 'البلاتينية','Platinum',     199, -1,  -1,  -1,  -1,  true,  true,  true,  true,  4)
ON CONFLICT (tier) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  price_sar = EXCLUDED.price_sar,
  projects_cap = EXCLUDED.projects_cap,
  likes_cap = EXCLUDED.likes_cap,
  comments_cap = EXCLUDED.comments_cap,
  other_cap = EXCLUDED.other_cap,
  verified_badge = EXCLUDED.verified_badge,
  priority_support = EXCLUDED.priority_support,
  ai_advanced = EXCLUDED.ai_advanced,
  dedicated_manager = EXCLUDED.dedicated_manager,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_membership_plans_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS membership_plans_updated_at ON public.membership_plans;
CREATE TRIGGER membership_plans_updated_at BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_membership_plans_updated_at();

-- 3) Tier resolver — maps legacy 'full' to 'gold'
CREATE OR REPLACE FUNCTION public.resolve_user_tier(_uid uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; exp timestamptz;
BEGIN
  SELECT membership::text, membership_expires_at INTO t, exp FROM public.profiles WHERE id = _uid;
  IF t IS NULL THEN RETURN 'basic'; END IF;
  -- Expired paid plans fall back to basic
  IF t <> 'basic' AND exp IS NOT NULL AND exp < now() THEN RETURN 'basic'; END IF;
  -- Legacy 'full' value maps to gold
  IF t = 'full' THEN RETURN 'gold'; END IF;
  RETURN t;
END $$;
GRANT EXECUTE ON FUNCTION public.resolve_user_tier(uuid) TO authenticated, service_role;

-- 4) Enforce hard caps per tier
CREATE OR REPLACE FUNCTION public.check_and_consume_quota(_action text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  tier text;
  cur_period text := to_char(now(),'YYYY-MM');
  row public.membership_usage;
  used int;
  cap  int;
  plan public.membership_plans;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  tier := public.resolve_user_tier(uid);
  SELECT * INTO plan FROM public.membership_plans WHERE tier = public.resolve_user_tier(uid);
  IF plan IS NULL THEN
    SELECT * INTO plan FROM public.membership_plans WHERE tier = 'basic';
  END IF;

  -- ensure usage row
  INSERT INTO public.membership_usage(user_id, period) VALUES (uid, cur_period)
    ON CONFLICT (user_id, period) DO NOTHING;
  SELECT * INTO row FROM public.membership_usage WHERE user_id = uid AND period = cur_period FOR UPDATE;

  IF _action = 'project' THEN used := row.projects_created;   cap := plan.projects_cap;
  ELSIF _action = 'like' THEN used := row.likes_given;        cap := plan.likes_cap;
  ELSIF _action = 'comment' THEN used := row.comments_given;  cap := plan.comments_cap;
  ELSE used := row.other_interactions;                        cap := plan.other_cap;
  END IF;

  -- -1 means unlimited
  IF cap >= 0 AND used >= cap THEN
    RAISE EXCEPTION 'quota_exceeded' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.membership_usage SET
    projects_created   = projects_created   + CASE WHEN _action='project' THEN 1 ELSE 0 END,
    likes_given        = likes_given        + CASE WHEN _action='like'    THEN 1 ELSE 0 END,
    comments_given     = comments_given     + CASE WHEN _action='comment' THEN 1 ELSE 0 END,
    other_interactions = other_interactions + CASE WHEN _action NOT IN ('project','like','comment') THEN 1 ELSE 0 END,
    updated_at = now()
   WHERE user_id = uid AND period = cur_period;
  RETURN true;
END $$;

-- 5) Subscribe to a specific tier from wallet
CREATE OR REPLACE FUNCTION public.subscribe_membership_tier(p_tier text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  plan public.membership_plans;
  bal numeric;
  new_exp timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_tier NOT IN ('silver','gold','platinum') THEN
    RAISE EXCEPTION 'invalid_tier';
  END IF;
  SELECT * INTO plan FROM public.membership_plans WHERE tier = p_tier AND active = true;
  IF plan IS NULL THEN RAISE EXCEPTION 'plan_not_found'; END IF;

  SELECT balance INTO bal FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF bal IS NULL OR bal < plan.price_sar THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient',
      'balance', COALESCE(bal,0), 'needed', plan.price_sar, 'tier', p_tier);
  END IF;

  UPDATE public.wallets SET balance = balance - plan.price_sar WHERE user_id = uid;

  INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
    VALUES (uid, -plan.price_sar, 'membership_fee',
            'membership:'||p_tier||':'||uid::text||':'||to_char(now(),'YYYYMMDD'),
            bal, bal - plan.price_sar);

  INSERT INTO public.commission_ledger(source_type, payer_id, amount, currency)
    VALUES ('membership', uid, plan.price_sar, 'SAR');

  SELECT GREATEST(now(), COALESCE(membership_expires_at, now())) + INTERVAL '30 days'
    INTO new_exp FROM public.profiles WHERE id = uid;

  EXECUTE format(
    'UPDATE public.profiles SET membership = %L::public.membership_tier, membership_expires_at = %L WHERE id = %L',
    p_tier, new_exp, uid
  );

  RETURN jsonb_build_object('ok', true, 'tier', p_tier, 'expires_at', new_exp, 'balance', bal - plan.price_sar);
END $$;
GRANT EXECUTE ON FUNCTION public.subscribe_membership_tier(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.subscribe_membership_tier(text) FROM anon, public;

-- 6) Return the user's current caps + usage for the UI
CREATE OR REPLACE FUNCTION public.get_membership_caps()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  tier text;
  plan public.membership_plans;
  cur_period text := to_char(now(),'YYYY-MM');
  u public.membership_usage;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  tier := public.resolve_user_tier(uid);
  SELECT * INTO plan FROM public.membership_plans WHERE membership_plans.tier = tier;
  SELECT * INTO u FROM public.membership_usage WHERE user_id = uid AND period = cur_period;
  RETURN jsonb_build_object(
    'tier', tier,
    'plan', to_jsonb(plan),
    'usage', jsonb_build_object(
      'projects', COALESCE(u.projects_created,0),
      'likes',    COALESCE(u.likes_given,0),
      'comments', COALESCE(u.comments_given,0),
      'other',    COALESCE(u.other_interactions,0)
    )
  );
END $$;
GRANT EXECUTE ON FUNCTION public.get_membership_caps() TO authenticated, service_role;

COMMIT;
BEGIN;