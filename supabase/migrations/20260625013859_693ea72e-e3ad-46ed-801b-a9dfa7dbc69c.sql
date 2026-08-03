
-- =====================================================
-- 1. project_shares
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_shares (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  total_supply numeric NOT NULL,
  circulating_supply numeric NOT NULL DEFAULT 0,
  current_price numeric NOT NULL,
  initial_price numeric NOT NULL,
  open_price numeric,
  high_24h numeric,
  low_24h numeric,
  volume_24h numeric NOT NULL DEFAULT 0,
  market_cap numeric NOT NULL DEFAULT 0,
  all_time_high numeric,
  all_time_low numeric,
  price_change_24h_pct numeric NOT NULL DEFAULT 0,
  min_purchase integer NOT NULL DEFAULT 1,
  lockup_days integer NOT NULL DEFAULT 0,
  is_halted boolean NOT NULL DEFAULT false,
  halt_reason text,
  last_trade_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_shares TO anon, authenticated;
GRANT ALL ON public.project_shares TO service_role;
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY ps_public_read ON public.project_shares FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ps_owner_manage ON public.project_shares FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_shares.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_shares.project_id AND p.owner_id = auth.uid()));

-- =====================================================
-- 2. share_price_history (candles)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.share_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL DEFAULT now(),
  interval text NOT NULL DEFAULT '1m',
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume numeric NOT NULL DEFAULT 0
);
GRANT SELECT ON public.share_price_history TO anon, authenticated;
GRANT ALL ON public.share_price_history TO service_role;
CREATE INDEX IF NOT EXISTS idx_sph_proj_ts ON public.share_price_history(project_id, ts DESC);
ALTER TABLE public.share_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY sph_public_read ON public.share_price_history FOR SELECT TO anon, authenticated USING (true);

-- =====================================================
-- 3. share_orders_v2
-- =====================================================
CREATE TABLE IF NOT EXISTS public.share_orders_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('market','limit','stop','take_profit','oco')),
  side text NOT NULL CHECK (side IN ('buy','sell')),
  quantity numeric NOT NULL CHECK (quantity > 0),
  price numeric,
  stop_price numeric,
  filled_quantity numeric NOT NULL DEFAULT 0,
  avg_fill_price numeric,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','filled','cancelled','expired')),
  leverage numeric NOT NULL DEFAULT 1,
  time_in_force text NOT NULL DEFAULT 'GTC',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  filled_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.share_orders_v2 TO authenticated;
GRANT ALL ON public.share_orders_v2 TO service_role;
CREATE INDEX IF NOT EXISTS idx_so2_book ON public.share_orders_v2(project_id, side, status, price);
CREATE INDEX IF NOT EXISTS idx_so2_user ON public.share_orders_v2(user_id, created_at DESC);
ALTER TABLE public.share_orders_v2 ENABLE ROW LEVEL SECURITY;
-- Public can see the order book (price+qty only via view in code); but for simplicity allow read of active orders
CREATE POLICY so2_book_read ON public.share_orders_v2 FOR SELECT TO anon, authenticated USING (status IN ('pending','partial'));
CREATE POLICY so2_owner_read ON public.share_orders_v2 FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY so2_self_insert ON public.share_orders_v2 FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY so2_self_update ON public.share_orders_v2 FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- 4. share_trades
-- =====================================================
CREATE TABLE IF NOT EXISTS public.share_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  buy_order_id uuid REFERENCES public.share_orders_v2(id),
  sell_order_id uuid REFERENCES public.share_orders_v2(id),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  buyer_fee numeric NOT NULL DEFAULT 0,
  seller_fee numeric NOT NULL DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.share_trades TO anon, authenticated;
GRANT ALL ON public.share_trades TO service_role;
CREATE INDEX IF NOT EXISTS idx_st_proj_ts ON public.share_trades(project_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_st_user ON public.share_trades(buyer_id, executed_at DESC);
ALTER TABLE public.share_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY st_public_read ON public.share_trades FOR SELECT TO anon, authenticated USING (true);

-- =====================================================
-- 5. share_holdings
-- =====================================================
CREATE TABLE IF NOT EXISTS public.share_holdings (
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  avg_buy_price numeric NOT NULL DEFAULT 0,
  total_invested numeric NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);
GRANT SELECT, INSERT, UPDATE ON public.share_holdings TO authenticated;
GRANT ALL ON public.share_holdings TO service_role;
ALTER TABLE public.share_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY sh_self_read ON public.share_holdings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY sh_owner_read ON public.share_holdings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = share_holdings.project_id AND p.owner_id = auth.uid()));

-- =====================================================
-- 6. price_alerts
-- =====================================================
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  condition text NOT NULL CHECK (condition IN ('above','below','change_pct','volume')),
  target_value numeric NOT NULL,
  is_triggered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  triggered_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alerts TO authenticated;
GRANT ALL ON public.price_alerts TO service_role;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY pa_self_all ON public.price_alerts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 7. copy_trading
-- =====================================================
CREATE TABLE IF NOT EXISTS public.copy_trading (
  follower_id uuid NOT NULL,
  trader_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  max_amount_per_trade numeric NOT NULL DEFAULT 1000,
  stop_loss_pct numeric NOT NULL DEFAULT 20,
  total_copied_trades integer NOT NULL DEFAULT 0,
  total_pnl numeric NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, trader_id),
  CHECK (follower_id <> trader_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.copy_trading TO authenticated;
GRANT ALL ON public.copy_trading TO service_role;
ALTER TABLE public.copy_trading ENABLE ROW LEVEL SECURITY;
CREATE POLICY ct_self_manage ON public.copy_trading FOR ALL TO authenticated
  USING (follower_id = auth.uid()) WITH CHECK (follower_id = auth.uid());
CREATE POLICY ct_trader_read ON public.copy_trading FOR SELECT TO authenticated USING (trader_id = auth.uid());

-- =====================================================
-- 8. updated_at trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_ps_touch ON public.project_shares;
CREATE TRIGGER trg_ps_touch BEFORE UPDATE ON public.project_shares
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================
-- 9. place_share_order — matching engine (simplified MVP)
-- Market or limit orders matched against opposite side by best price (price-time FIFO).
-- Partial fills supported. Updates holdings, trades, candles, project_shares.
-- =====================================================
CREATE OR REPLACE FUNCTION public.place_share_order(
  p_project_id uuid,
  p_side text,
  p_type text,
  p_quantity numeric,
  p_price numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_remaining numeric := p_quantity;
  v_counter RECORD;
  v_trade_qty numeric;
  v_trade_price numeric;
  v_total_filled numeric := 0;
  v_weighted_price numeric := 0;
  v_fee_pct numeric := 0.005; -- 0.5%
  v_ps RECORD;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_side NOT IN ('buy','sell') THEN RAISE EXCEPTION 'invalid_side'; END IF;
  IF p_type NOT IN ('market','limit') THEN RAISE EXCEPTION 'invalid_type'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
  IF p_type = 'limit' AND p_price IS NULL THEN RAISE EXCEPTION 'limit_requires_price'; END IF;

  SELECT * INTO v_ps FROM public.project_shares WHERE project_id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shares_not_listed'; END IF;
  IF v_ps.is_halted THEN RAISE EXCEPTION 'trading_halted'; END IF;

  -- Insert order
  INSERT INTO public.share_orders_v2(user_id, project_id, type, side, quantity, price, status)
  VALUES (v_user, p_project_id, p_type, p_side, p_quantity, p_price, 'pending')
  RETURNING id INTO v_order_id;

  -- Match loop
  FOR v_counter IN
    SELECT * FROM public.share_orders_v2
    WHERE project_id = p_project_id
      AND status IN ('pending','partial')
      AND side = CASE WHEN p_side = 'buy' THEN 'sell' ELSE 'buy' END
      AND user_id <> v_user
      AND (
        p_type = 'market'
        OR (p_side = 'buy' AND price <= p_price)
        OR (p_side = 'sell' AND price >= p_price)
      )
    ORDER BY CASE WHEN p_side='buy' THEN price END ASC,
             CASE WHEN p_side='sell' THEN price END DESC,
             created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_trade_qty := LEAST(v_remaining, v_counter.quantity - v_counter.filled_quantity);
    v_trade_price := COALESCE(v_counter.price, v_ps.current_price);

    -- Insert trade
    INSERT INTO public.share_trades(
      project_id, buy_order_id, sell_order_id, buyer_id, seller_id,
      price, quantity, buyer_fee, seller_fee
    ) VALUES (
      p_project_id,
      CASE WHEN p_side='buy' THEN v_order_id ELSE v_counter.id END,
      CASE WHEN p_side='sell' THEN v_order_id ELSE v_counter.id END,
      CASE WHEN p_side='buy' THEN v_user ELSE v_counter.user_id END,
      CASE WHEN p_side='sell' THEN v_user ELSE v_counter.user_id END,
      v_trade_price, v_trade_qty,
      v_trade_qty * v_trade_price * v_fee_pct,
      v_trade_qty * v_trade_price * v_fee_pct
    );

    -- Update counter order
    UPDATE public.share_orders_v2
    SET filled_quantity = filled_quantity + v_trade_qty,
        avg_fill_price = COALESCE(((avg_fill_price * filled_quantity) + (v_trade_price * v_trade_qty)) / NULLIF(filled_quantity + v_trade_qty, 0), v_trade_price),
        status = CASE WHEN filled_quantity + v_trade_qty >= quantity THEN 'filled' ELSE 'partial' END,
        filled_at = CASE WHEN filled_quantity + v_trade_qty >= quantity THEN now() ELSE filled_at END
    WHERE id = v_counter.id;

    -- Update holdings: buyer +qty, seller -qty
    INSERT INTO public.share_holdings(user_id, project_id, quantity, avg_buy_price, total_invested, last_updated_at)
    VALUES (
      CASE WHEN p_side='buy' THEN v_user ELSE v_counter.user_id END,
      p_project_id, v_trade_qty, v_trade_price, v_trade_qty * v_trade_price, now()
    )
    ON CONFLICT (user_id, project_id) DO UPDATE
    SET total_invested = share_holdings.total_invested + EXCLUDED.total_invested,
        quantity = share_holdings.quantity + EXCLUDED.quantity,
        avg_buy_price = (share_holdings.total_invested + EXCLUDED.total_invested) / NULLIF(share_holdings.quantity + EXCLUDED.quantity, 0),
        last_updated_at = now();

    UPDATE public.share_holdings
    SET quantity = quantity - v_trade_qty,
        last_updated_at = now()
    WHERE user_id = CASE WHEN p_side='sell' THEN v_user ELSE v_counter.user_id END
      AND project_id = p_project_id;

    v_weighted_price := v_weighted_price + (v_trade_price * v_trade_qty);
    v_total_filled := v_total_filled + v_trade_qty;
    v_remaining := v_remaining - v_trade_qty;

    -- Update share stats
    UPDATE public.project_shares
    SET current_price = v_trade_price,
        last_trade_at = now(),
        volume_24h = volume_24h + v_trade_qty,
        high_24h = GREATEST(COALESCE(high_24h, v_trade_price), v_trade_price),
        low_24h = LEAST(COALESCE(low_24h, v_trade_price), v_trade_price),
        all_time_high = GREATEST(COALESCE(all_time_high, v_trade_price), v_trade_price),
        all_time_low = LEAST(COALESCE(all_time_low, v_trade_price), v_trade_price),
        market_cap = total_supply * v_trade_price
    WHERE project_id = p_project_id;

    -- Append candle (1-minute resolution; simple append)
    INSERT INTO public.share_price_history(project_id, interval, open, high, low, close, volume)
    VALUES (p_project_id, '1m', v_trade_price, v_trade_price, v_trade_price, v_trade_price, v_trade_qty);
  END LOOP;

  -- Finalize taker order
  UPDATE public.share_orders_v2
  SET filled_quantity = v_total_filled,
      avg_fill_price = CASE WHEN v_total_filled > 0 THEN v_weighted_price / v_total_filled END,
      status = CASE
        WHEN v_total_filled >= p_quantity THEN 'filled'
        WHEN v_total_filled > 0 AND p_type='market' THEN 'partial'
        WHEN v_total_filled > 0 THEN 'partial'
        WHEN p_type='market' THEN 'cancelled'
        ELSE 'pending'
      END,
      filled_at = CASE WHEN v_total_filled >= p_quantity THEN now() END
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'filled', v_total_filled,
    'remaining', p_quantity - v_total_filled,
    'avg_price', CASE WHEN v_total_filled > 0 THEN v_weighted_price / v_total_filled END
  );
END $$;

GRANT EXECUTE ON FUNCTION public.place_share_order(uuid, text, text, numeric, numeric) TO authenticated;

-- =====================================================
-- 10. cancel_share_order
-- =====================================================
CREATE OR REPLACE FUNCTION public.cancel_share_order(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.share_orders_v2
  SET status = 'cancelled'
  WHERE id = p_order_id
    AND user_id = auth.uid()
    AND status IN ('pending','partial');
END $$;
GRANT EXECUTE ON FUNCTION public.cancel_share_order(uuid) TO authenticated;

-- =====================================================
-- 11. list_shares (project) — create if owner
-- =====================================================
CREATE OR REPLACE FUNCTION public.list_project_shares(
  p_project_id uuid,
  p_total_supply numeric,
  p_initial_price numeric,
  p_min_purchase integer DEFAULT 1,
  p_lockup_days integer DEFAULT 0
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.projects WHERE id = p_project_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.project_shares(
    project_id, total_supply, circulating_supply, current_price, initial_price,
    open_price, market_cap, min_purchase, lockup_days
  ) VALUES (
    p_project_id, p_total_supply, 0, p_initial_price, p_initial_price,
    p_initial_price, p_total_supply * p_initial_price, p_min_purchase, p_lockup_days
  )
  ON CONFLICT (project_id) DO UPDATE
  SET total_supply = EXCLUDED.total_supply,
      min_purchase = EXCLUDED.min_purchase,
      lockup_days = EXCLUDED.lockup_days;
  RETURN p_project_id;
END $$;
GRANT EXECUTE ON FUNCTION public.list_project_shares(uuid, numeric, numeric, integer, integer) TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.share_trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.share_orders_v2;
