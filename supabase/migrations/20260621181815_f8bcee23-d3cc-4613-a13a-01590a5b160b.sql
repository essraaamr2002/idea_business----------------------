
-- 1) Membership usage tracking (monthly)
CREATE TABLE IF NOT EXISTS public.membership_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL, -- 'YYYY-MM'
  projects_created int NOT NULL DEFAULT 0,
  likes_given int NOT NULL DEFAULT 0,
  comments_given int NOT NULL DEFAULT 0,
  other_interactions int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period)
);
GRANT SELECT ON public.membership_usage TO authenticated;
GRANT ALL ON public.membership_usage TO service_role;
ALTER TABLE public.membership_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self read usage" ON public.membership_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2) Commission ledger (platform revenue)
CREATE TABLE IF NOT EXISTS public.commission_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL, -- 'share_trade' | 'offer_accept' | 'payout' | 'membership'
  source_id uuid,
  payer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commission_ledger TO authenticated;
GRANT ALL ON public.commission_ledger TO service_role;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self read commission" ON public.commission_ledger FOR SELECT TO authenticated USING (auth.uid() = payer_id OR public.has_role(auth.uid(),'admin'));

-- 3) Quota helper
CREATE OR REPLACE FUNCTION public.check_and_consume_quota(_action text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  tier text;
  exp timestamptz;
  cur_period text := to_char(now(),'YYYY-MM');
  row public.membership_usage;
  used int;
  cap int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT membership::text, membership_expires_at INTO tier, exp FROM public.profiles WHERE id = uid;
  -- premium / full = unlimited if not expired
  IF tier IN ('full','premium') AND (exp IS NULL OR exp > now()) THEN
    RETURN true;
  END IF;
  -- ensure row
  INSERT INTO public.membership_usage(user_id, period) VALUES (uid, cur_period)
    ON CONFLICT (user_id, period) DO NOTHING;
  SELECT * INTO row FROM public.membership_usage WHERE user_id = uid AND period = cur_period FOR UPDATE;
  IF _action = 'project' THEN used := row.projects_created; cap := 1;
  ELSIF _action = 'like' THEN used := row.likes_given; cap := 5;
  ELSIF _action = 'comment' THEN used := row.comments_given; cap := 5;
  ELSE used := row.other_interactions; cap := 5;
  END IF;
  IF used >= cap THEN
    RAISE EXCEPTION 'quota_exceeded' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.membership_usage SET
    projects_created = projects_created + CASE WHEN _action='project' THEN 1 ELSE 0 END,
    likes_given      = likes_given      + CASE WHEN _action='like' THEN 1 ELSE 0 END,
    comments_given   = comments_given   + CASE WHEN _action='comment' THEN 1 ELSE 0 END,
    other_interactions = other_interactions + CASE WHEN _action NOT IN ('project','like','comment') THEN 1 ELSE 0 END,
    updated_at = now()
   WHERE user_id = uid AND period = cur_period;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.check_and_consume_quota(text) TO authenticated;

-- 4) Membership subscription via wallet
CREATE OR REPLACE FUNCTION public.subscribe_membership_from_wallet()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  fee numeric := 25;
  bal numeric;
  new_exp timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT balance INTO bal FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF bal IS NULL OR bal < fee THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient', 'balance', COALESCE(bal,0), 'needed', fee);
  END IF;
  UPDATE public.wallets SET balance = balance - fee WHERE user_id = uid;
  INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
    VALUES (uid, -fee, 'membership_fee', 'membership:'||uid::text||':'||to_char(now(),'YYYYMMDD'), bal, bal - fee);
  INSERT INTO public.commission_ledger(source_type, payer_id, amount, currency)
    VALUES ('membership', uid, fee, 'SAR');
  -- extend or start
  SELECT GREATEST(now(), COALESCE(membership_expires_at, now())) + INTERVAL '30 days'
    INTO new_exp FROM public.profiles WHERE id = uid;
  UPDATE public.profiles SET membership = 'full', membership_expires_at = new_exp WHERE id = uid;
  RETURN jsonb_build_object('ok', true, 'expires_at', new_exp, 'balance', bal - fee);
END $$;
GRANT EXECUTE ON FUNCTION public.subscribe_membership_from_wallet() TO authenticated;

-- 5) Activate membership after Fatora payment (service-side)
CREATE OR REPLACE FUNCTION public.activate_membership_paid(p_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_exp timestamptz;
BEGIN
  SELECT GREATEST(now(), COALESCE(membership_expires_at, now())) + INTERVAL '30 days'
    INTO new_exp FROM public.profiles WHERE id = p_user_id;
  UPDATE public.profiles SET membership='full', membership_expires_at=new_exp WHERE id = p_user_id;
  INSERT INTO public.commission_ledger(source_type, payer_id, amount, currency)
    VALUES ('membership', p_user_id, 25, 'SAR');
  RETURN new_exp;
END $$;

-- 6) Daily renewal & downgrade
CREATE OR REPLACE FUNCTION public.renew_memberships_daily()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  bal numeric;
  renewed int := 0;
  downgraded int := 0;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE membership='full' AND membership_expires_at IS NOT NULL AND membership_expires_at <= now() + INTERVAL '1 day' LOOP
    SELECT balance INTO bal FROM public.wallets WHERE user_id = r.id FOR UPDATE;
    IF bal IS NOT NULL AND bal >= 25 THEN
      UPDATE public.wallets SET balance = balance - 25 WHERE user_id = r.id;
      INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
        VALUES (r.id, -25, 'membership_fee', 'auto-renew:'||to_char(now(),'YYYYMMDD'), bal, bal-25);
      INSERT INTO public.commission_ledger(source_type, payer_id, amount, currency)
        VALUES ('membership', r.id, 25, 'SAR');
      UPDATE public.profiles SET membership_expires_at = GREATEST(now(), membership_expires_at) + INTERVAL '30 days' WHERE id = r.id;
      renewed := renewed + 1;
    ELSIF bal IS NULL OR bal < 25 THEN
      IF (SELECT membership_expires_at FROM public.profiles WHERE id = r.id) <= now() THEN
        UPDATE public.profiles SET membership='basic' WHERE id = r.id;
        downgraded := downgraded + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('renewed', renewed, 'downgraded', downgraded);
END $$;

-- 7) Commission charging helper (3.5% from a single party; call twice for both)
CREATE OR REPLACE FUNCTION public.charge_commission(p_user_id uuid, p_base_amount numeric, p_source_type text, p_source_id uuid, p_currency text DEFAULT 'SAR')
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  fee numeric := round((p_base_amount * 0.035)::numeric, 2);
  bal numeric;
BEGIN
  IF fee <= 0 THEN RETURN 0; END IF;
  SELECT balance INTO bal FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF bal IS NULL THEN RETURN 0; END IF;
  -- allow negative? no — clamp to available
  IF bal < fee THEN fee := bal; END IF;
  IF fee <= 0 THEN RETURN 0; END IF;
  UPDATE public.wallets SET balance = balance - fee WHERE user_id = p_user_id;
  INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
    VALUES (p_user_id, -fee, 'commission', p_source_type||':'||COALESCE(p_source_id::text,''), bal, bal - fee);
  INSERT INTO public.commission_ledger(source_type, source_id, payer_id, amount, currency)
    VALUES (p_source_type, p_source_id, p_user_id, fee, COALESCE(p_currency,'SAR'));
  RETURN fee;
END $$;
GRANT EXECUTE ON FUNCTION public.charge_commission(uuid, numeric, text, uuid, text) TO service_role;

-- 8) Modify buy_shares to charge 7% (3.5% buyer + 3.5% from project owner)
CREATE OR REPLACE FUNCTION public.buy_shares(_project_id uuid, _shares integer)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _price numeric;
  _available integer;
  _status project_status;
  _total numeric;
  _balance numeric;
  _order_id uuid;
  _owner uuid;
  _buyer_fee numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='28000'; END IF;
  IF _shares IS NULL OR _shares < 1 THEN RAISE EXCEPTION 'Invalid share count'; END IF;

  SELECT current_price, (shares_total - shares_sold), status, owner_id
    INTO _price, _available, _status, _owner
    FROM public.projects WHERE id = _project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF _status <> 'active' THEN RAISE EXCEPTION 'Project not available for trading'; END IF;
  IF _shares > _available THEN RAISE EXCEPTION 'Not enough shares available'; END IF;

  _total := _price * _shares;
  _buyer_fee := round((_total * 0.035)::numeric, 2);

  SELECT balance INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND OR _balance < (_total + _buyer_fee) THEN RAISE EXCEPTION 'Insufficient wallet balance (includes 3.5%% fee)'; END IF;

  -- debit buyer (price + buyer fee)
  UPDATE public.wallets SET balance = balance - (_total + _buyer_fee) WHERE user_id = _uid;
  INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
    VALUES (_uid, -_total, 'share_buy', 'shares:'||_project_id::text, _balance, _balance - _total);
  INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
    VALUES (_uid, -_buyer_fee, 'commission', 'fee:'||_project_id::text, _balance - _total, _balance - _total - _buyer_fee);
  INSERT INTO public.commission_ledger(source_type, source_id, payer_id, amount, currency)
    VALUES ('share_trade', _project_id, _uid, _buyer_fee, (SELECT currency FROM public.wallets WHERE user_id=_uid));

  UPDATE public.projects SET shares_sold = shares_sold + _shares WHERE id = _project_id;

  INSERT INTO public.project_shares (project_id, user_id, shares)
    VALUES (_project_id, _uid, _shares)
    ON CONFLICT (project_id, user_id) DO UPDATE SET shares = public.project_shares.shares + EXCLUDED.shares;

  INSERT INTO public.share_orders (project_id, user_id, side, shares, price, filled, status)
    VALUES (_project_id, _uid, 'buy', _shares, _price, _shares, 'filled')
    RETURNING id INTO _order_id;

  -- seller-side 3.5%: charged to project owner from their wallet (clamped)
  IF _owner IS NOT NULL AND _owner <> _uid THEN
    PERFORM public.charge_commission(_owner, _total, 'share_trade', _order_id, 'SAR');
  END IF;

  RETURN _order_id;
END $$;
