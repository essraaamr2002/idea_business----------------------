
-- ============================================================================
-- Secondary Market Module (sm_*)
-- ============================================================================

-- 1) ENUMs
CREATE TYPE public.sm_kyc_tier AS ENUM ('unverified','basic','verified','accredited');
CREATE TYPE public.sm_account_status AS ENUM ('active','suspended','frozen','closed');
CREATE TYPE public.sm_wallet_type AS ENUM ('trading_cash','reserved_margin','platform_treasury');
CREATE TYPE public.sm_ledger_entry AS ENUM (
  'deposit','withdrawal','trade_debit','trade_credit',
  'margin_loan_disbursement','margin_repayment','liquidation_proceeds',
  'listing_fee','dividend','platform_grant'
);
CREATE TYPE public.sm_listing_stage AS ENUM ('idea','project');
CREATE TYPE public.sm_listing_status AS ENUM ('pending_review','active','halted','delisted');
CREATE TYPE public.sm_order_side AS ENUM ('BUY','SELL');
CREATE TYPE public.sm_order_type AS ENUM ('LIMIT','MARKET');
CREATE TYPE public.sm_order_status AS ENUM ('OPEN','PARTIALLY_FILLED','FILLED','CANCELLED','REJECTED');
CREATE TYPE public.sm_margin_status AS ENUM ('healthy','margin_call','liquidating','closed');
CREATE TYPE public.sm_flag_severity AS ENUM ('low','medium','high','critical');

-- ============================================================================
-- 2) Accounts & KYC
-- ============================================================================
CREATE TABLE public.sm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  country_code CHAR(2) NOT NULL DEFAULT 'SA',
  kyc_tier public.sm_kyc_tier NOT NULL DEFAULT 'unverified',
  kyc_verified_at TIMESTAMPTZ,
  max_investment_cap NUMERIC(18,2) NOT NULL DEFAULT 0,
  status public.sm_account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Use trigger instead of CHECK for tier caps (allows future dynamic caps)
CREATE OR REPLACE FUNCTION public.sm_enforce_tier_cap()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.kyc_tier = 'unverified' AND NEW.max_investment_cap <> 0 THEN
    NEW.max_investment_cap := 0;
  ELSIF NEW.kyc_tier = 'basic' AND NEW.max_investment_cap > 5000 THEN
    NEW.max_investment_cap := 5000;
  ELSIF NEW.kyc_tier = 'verified' AND NEW.max_investment_cap > 100000 THEN
    NEW.max_investment_cap := 100000;
  ELSIF NEW.kyc_tier = 'accredited' AND NEW.max_investment_cap > 5000000 THEN
    NEW.max_investment_cap := 5000000;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_sm_accounts_tier BEFORE INSERT OR UPDATE ON public.sm_accounts
  FOR EACH ROW EXECUTE FUNCTION public.sm_enforce_tier_cap();

GRANT SELECT, INSERT, UPDATE ON public.sm_accounts TO authenticated;
GRANT ALL ON public.sm_accounts TO service_role;
ALTER TABLE public.sm_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_acc_own ON public.sm_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY sm_acc_own_ins ON public.sm_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY sm_acc_admin ON public.sm_accounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sm_kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.sm_accounts(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL,
  storage_ref TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sm_kyc_documents TO authenticated;
GRANT ALL ON public.sm_kyc_documents TO service_role;
ALTER TABLE public.sm_kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_kyc_own ON public.sm_kyc_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sm_accounts a WHERE a.id = account_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- ============================================================================
-- 3) Wallets & Ledger
-- ============================================================================
CREATE TABLE public.sm_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.sm_accounts(id) ON DELETE CASCADE,
  wallet_type public.sm_wallet_type NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  balance NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, wallet_type, currency)
);
GRANT SELECT ON public.sm_wallets TO authenticated;
GRANT ALL ON public.sm_wallets TO service_role;
ALTER TABLE public.sm_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_wallet_own ON public.sm_wallets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sm_accounts a WHERE a.id = account_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.sm_wallet_ledger (
  id BIGSERIAL PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.sm_wallets(id),
  entry_type public.sm_ledger_entry NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  balance_after NUMERIC(18,2) NOT NULL,
  reference_id UUID,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sm_ledger_wallet ON public.sm_wallet_ledger(wallet_id, created_at DESC);
GRANT SELECT ON public.sm_wallet_ledger TO authenticated;
GRANT ALL ON public.sm_wallet_ledger TO service_role;
ALTER TABLE public.sm_wallet_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_ledger_own ON public.sm_wallet_ledger FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sm_wallets w JOIN public.sm_accounts a ON a.id=w.account_id
                 WHERE w.id = wallet_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- ============================================================================
-- 4) Listings (ربط بمشروع موجود في projects)
-- ============================================================================
CREATE TABLE public.sm_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  symbol VARCHAR(15) NOT NULL UNIQUE,
  owner_account_id UUID NOT NULL REFERENCES public.sm_accounts(id),
  name VARCHAR(200) NOT NULL,
  stage public.sm_listing_stage NOT NULL,
  status public.sm_listing_status NOT NULL DEFAULT 'pending_review',
  total_shares BIGINT NOT NULL CHECK (total_shares > 0),
  platform_shares BIGINT NOT NULL DEFAULT 0,
  collateral_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  annual_revenue NUMERIC(18,2),
  solvency_score NUMERIC(5,2) CHECK (solvency_score IS NULL OR solvency_score BETWEEN 0 AND 100),
  max_valuation NUMERIC(18,2) NOT NULL DEFAULT 0,
  reference_price NUMERIC(12,4) NOT NULL,
  daily_limit_pct NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  last_price_update_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_sm_platform_pct CHECK (platform_shares = (total_shares * 8) / 100),
  CONSTRAINT chk_sm_stage_revenue CHECK (
    (stage = 'idea' AND annual_revenue IS NULL) OR (stage = 'project')
  )
);
CREATE INDEX idx_sm_listings_status ON public.sm_listings(status);
GRANT SELECT ON public.sm_listings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.sm_listings TO authenticated;
GRANT ALL ON public.sm_listings TO service_role;
ALTER TABLE public.sm_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_list_public ON public.sm_listings FOR SELECT TO anon, authenticated
  USING (status IN ('active','halted'));
CREATE POLICY sm_list_owner_all ON public.sm_listings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sm_accounts a WHERE a.id = owner_account_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sm_accounts a WHERE a.id = owner_account_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.sm_cap_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.sm_listings(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.sm_accounts(id),
  shares_held BIGINT NOT NULL DEFAULT 0 CHECK (shares_held >= 0),
  shares_pledged BIGINT NOT NULL DEFAULT 0 CHECK (shares_pledged <= shares_held),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, account_id)
);
CREATE INDEX idx_sm_cap_listing ON public.sm_cap_table(listing_id);
GRANT SELECT ON public.sm_cap_table TO authenticated;
GRANT ALL ON public.sm_cap_table TO service_role;
ALTER TABLE public.sm_cap_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_cap_own ON public.sm_cap_table FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sm_accounts a WHERE a.id = account_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.sm_price_events (
  id BIGSERIAL PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.sm_listings(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL,
  delta_value NUMERIC(10,6) NOT NULL,
  price_before NUMERIC(12,4) NOT NULL,
  price_after NUMERIC(12,4) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sm_price_events ON public.sm_price_events(listing_id, occurred_at DESC);
GRANT SELECT ON public.sm_price_events TO anon, authenticated;
GRANT ALL ON public.sm_price_events TO service_role;
ALTER TABLE public.sm_price_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_pe_public ON public.sm_price_events FOR SELECT TO anon, authenticated USING (true);

-- ============================================================================
-- 5) Orders & Trades
-- ============================================================================
CREATE TABLE public.sm_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.sm_listings(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.sm_accounts(id),
  side public.sm_order_side NOT NULL,
  type public.sm_order_type NOT NULL,
  price NUMERIC(12,4),
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  remaining BIGINT NOT NULL,
  status public.sm_order_status NOT NULL DEFAULT 'OPEN',
  funded_by_margin_loan_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_sm_limit_price CHECK ((type='LIMIT' AND price IS NOT NULL) OR type='MARKET')
);
CREATE INDEX idx_sm_orders_book ON public.sm_orders(listing_id, side, price) WHERE status IN ('OPEN','PARTIALLY_FILLED');
CREATE INDEX idx_sm_orders_account ON public.sm_orders(account_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.sm_orders TO authenticated;
GRANT ALL ON public.sm_orders TO service_role;
ALTER TABLE public.sm_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_orders_own ON public.sm_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sm_accounts a WHERE a.id = account_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY sm_orders_ins ON public.sm_orders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sm_accounts a WHERE a.id = account_id AND a.user_id = auth.uid()));

CREATE TABLE public.sm_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.sm_listings(id) ON DELETE CASCADE,
  buy_order_id UUID NOT NULL REFERENCES public.sm_orders(id),
  sell_order_id UUID NOT NULL REFERENCES public.sm_orders(id),
  buyer_account_id UUID NOT NULL REFERENCES public.sm_accounts(id),
  seller_account_id UUID NOT NULL REFERENCES public.sm_accounts(id),
  price NUMERIC(12,4) NOT NULL,
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sm_trades_listing_time ON public.sm_trades(listing_id, executed_at DESC);
GRANT SELECT ON public.sm_trades TO anon, authenticated;
GRANT ALL ON public.sm_trades TO service_role;
ALTER TABLE public.sm_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_trades_public ON public.sm_trades FOR SELECT TO anon, authenticated USING (true);

-- ============================================================================
-- 6) Margin Loans
-- ============================================================================
CREATE TABLE public.sm_margin_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.sm_accounts(id),
  principal_amount NUMERIC(18,2) NOT NULL CHECK (principal_amount > 0),
  collateral_required_pct NUMERIC(5,4) NOT NULL DEFAULT 1.40,
  maintenance_pct NUMERIC(5,4) NOT NULL DEFAULT 1.15,
  liquidation_pct NUMERIC(5,4) NOT NULL DEFAULT 1.10,
  outstanding_balance NUMERIC(18,2) NOT NULL,
  status public.sm_margin_status NOT NULL DEFAULT 'healthy',
  disbursed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  CONSTRAINT chk_sm_outstanding CHECK (outstanding_balance >= 0)
);
GRANT SELECT, INSERT ON public.sm_margin_loans TO authenticated;
GRANT ALL ON public.sm_margin_loans TO service_role;
ALTER TABLE public.sm_margin_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_loan_own ON public.sm_margin_loans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sm_accounts a WHERE a.id = account_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY sm_loan_ins ON public.sm_margin_loans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sm_accounts a WHERE a.id = account_id AND a.user_id = auth.uid()));

CREATE TABLE public.sm_margin_snapshots (
  id BIGSERIAL PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.sm_margin_loans(id) ON DELETE CASCADE,
  account_value NUMERIC(18,2) NOT NULL,
  loan_balance NUMERIC(18,2) NOT NULL,
  margin_ratio NUMERIC(8,4) GENERATED ALWAYS AS (
    CASE WHEN loan_balance = 0 THEN NULL ELSE account_value / loan_balance END
  ) STORED,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sm_msnap_loan ON public.sm_margin_snapshots(loan_id, snapshot_at DESC);
GRANT SELECT ON public.sm_margin_snapshots TO authenticated;
GRANT ALL ON public.sm_margin_snapshots TO service_role;
ALTER TABLE public.sm_margin_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_msnap_own ON public.sm_margin_snapshots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sm_margin_loans l JOIN public.sm_accounts a ON a.id=l.account_id
                 WHERE l.id = loan_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.sm_liquidation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.sm_margin_loans(id),
  trigger_ratio NUMERIC(8,4) NOT NULL,
  shares_sold BIGINT NOT NULL,
  proceeds NUMERIC(18,2) NOT NULL,
  resulting_ratio NUMERIC(8,4),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sm_liquidation_events TO authenticated;
GRANT ALL ON public.sm_liquidation_events TO service_role;
ALTER TABLE public.sm_liquidation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_liq_own ON public.sm_liquidation_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sm_margin_loans l JOIN public.sm_accounts a ON a.id=l.account_id
                 WHERE l.id = loan_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- ============================================================================
-- 7) Compliance & Audit
-- ============================================================================
CREATE TABLE public.sm_compliance_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.sm_accounts(id),
  listing_id UUID REFERENCES public.sm_listings(id),
  flag_type VARCHAR(50) NOT NULL,
  severity public.sm_flag_severity NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sm_flags_unresolved ON public.sm_compliance_flags(resolved, severity) WHERE resolved = false;
GRANT SELECT ON public.sm_compliance_flags TO authenticated;
GRANT ALL ON public.sm_compliance_flags TO service_role;
ALTER TABLE public.sm_compliance_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_flags_admin ON public.sm_compliance_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sm_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  payload JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sm_audit_actor ON public.sm_audit_log(actor_id, created_at DESC);
GRANT SELECT ON public.sm_audit_log TO authenticated;
GRANT ALL ON public.sm_audit_log TO service_role;
ALTER TABLE public.sm_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY sm_audit_admin ON public.sm_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============================================================================
-- 8) Analytical Views
-- ============================================================================
CREATE OR REPLACE VIEW public.sm_v_active_margin AS
SELECT DISTINCT ON (ml.id)
  ml.id AS loan_id, ml.account_id, ml.outstanding_balance, ml.status,
  mrs.margin_ratio, mrs.account_value, mrs.loan_balance, mrs.snapshot_at
FROM public.sm_margin_loans ml
LEFT JOIN public.sm_margin_snapshots mrs ON mrs.loan_id = ml.id
WHERE ml.status <> 'closed'
ORDER BY ml.id, mrs.snapshot_at DESC NULLS LAST;
GRANT SELECT ON public.sm_v_active_margin TO authenticated, service_role;

CREATE MATERIALIZED VIEW public.sm_mv_daily_stats AS
SELECT
  listing_id,
  date_trunc('day', executed_at) AS trading_day,
  MIN(price) AS low, MAX(price) AS high,
  (array_agg(price ORDER BY executed_at ASC))[1] AS open_p,
  (array_agg(price ORDER BY executed_at DESC))[1] AS close_p,
  SUM(quantity) AS volume,
  STDDEV(price) AS volatility
FROM public.sm_trades
GROUP BY listing_id, date_trunc('day', executed_at);
CREATE UNIQUE INDEX idx_sm_mv_daily ON public.sm_mv_daily_stats(listing_id, trading_day);
GRANT SELECT ON public.sm_mv_daily_stats TO anon, authenticated, service_role;

-- ============================================================================
-- 9) Smart Functions
-- ============================================================================

-- التقييم العادل: (إيرادات×5) + (ضمانات×1.2) + (ملاءة×معامل)
CREATE OR REPLACE FUNCTION public.sm_calc_max_valuation(
  p_stage public.sm_listing_stage,
  p_annual_revenue NUMERIC,
  p_collateral NUMERIC,
  p_solvency NUMERIC
) RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v NUMERIC := 0;
BEGIN
  IF p_stage = 'idea' THEN
    v := COALESCE(p_collateral,0)*1.2 + COALESCE(p_solvency,0)*1000;
  ELSE
    v := COALESCE(p_annual_revenue,0)*5 + COALESCE(p_collateral,0)*1.2 + COALESCE(p_solvency,0)*2000;
  END IF;
  RETURN GREATEST(v, 1000);
END;$$;

-- فحص حد التذبذب اليومي
CREATE OR REPLACE FUNCTION public.sm_check_daily_limit(
  p_listing_id UUID,
  p_price NUMERIC
) RETURNS BOOLEAN LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE ref NUMERIC; lim NUMERIC;
BEGIN
  SELECT reference_price, daily_limit_pct INTO ref, lim
  FROM public.sm_listings WHERE id = p_listing_id;
  IF ref IS NULL THEN RETURN false; END IF;
  RETURN p_price BETWEEN ref*(1-lim) AND ref*(1+lim);
END;$$;

-- منح 8% أسهم المنصة تلقائيًا عند تفعيل الإدراج
CREATE OR REPLACE FUNCTION public.sm_grant_platform_shares()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE treasury_acc UUID;
BEGIN
  IF NEW.status = 'active' AND OLD.status = 'pending_review' THEN
    -- منح صاحب المشروع (100 - 8)% وحساب الخزينة 8%
    INSERT INTO public.sm_cap_table (listing_id, account_id, shares_held)
    VALUES (NEW.id, NEW.owner_account_id, NEW.total_shares - NEW.platform_shares)
    ON CONFLICT (listing_id, account_id) DO UPDATE SET shares_held = EXCLUDED.shares_held;
    -- حساب الخزينة (النظام)
    SELECT id INTO treasury_acc FROM public.sm_accounts WHERE user_id = '00000000-0000-0000-0000-000000000000' LIMIT 1;
    IF treasury_acc IS NOT NULL THEN
      INSERT INTO public.sm_cap_table (listing_id, account_id, shares_held)
      VALUES (NEW.id, treasury_acc, NEW.platform_shares)
      ON CONFLICT (listing_id, account_id) DO UPDATE SET shares_held = EXCLUDED.shares_held;
    END IF;
    INSERT INTO public.sm_audit_log(action, entity_type, entity_id, payload)
    VALUES('listing_activated','sm_listing',NEW.id, jsonb_build_object('shares',NEW.total_shares,'platform_pct',8));
  END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_sm_listing_activate AFTER UPDATE OF status ON public.sm_listings
  FOR EACH ROW EXECUTE FUNCTION public.sm_grant_platform_shares();

-- ضمان تحديث السعر المرجعي بعد كل صفقة + سجل حدث سعر
CREATE OR REPLACE FUNCTION public.sm_after_trade_update_price()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_price NUMERIC;
BEGIN
  SELECT reference_price INTO old_price FROM public.sm_listings WHERE id = NEW.listing_id;
  UPDATE public.sm_listings
    SET reference_price = NEW.price, last_price_update_at = now()
    WHERE id = NEW.listing_id;
  INSERT INTO public.sm_price_events(listing_id, event_type, delta_value, price_before, price_after)
  VALUES(NEW.listing_id, 'trade',
         CASE WHEN old_price>0 THEN (NEW.price-old_price)/old_price ELSE 0 END,
         old_price, NEW.price);
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_sm_trade_price AFTER INSERT ON public.sm_trades
  FOR EACH ROW EXECUTE FUNCTION public.sm_after_trade_update_price();

-- تحديث الملكية (Cap Table) بعد كل صفقة
CREATE OR REPLACE FUNCTION public.sm_after_trade_move_shares()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- خصم من البائع
  UPDATE public.sm_cap_table
    SET shares_held = shares_held - NEW.quantity, updated_at = now()
    WHERE listing_id = NEW.listing_id AND account_id = NEW.seller_account_id;
  -- إضافة للمشتري
  INSERT INTO public.sm_cap_table(listing_id, account_id, shares_held)
  VALUES(NEW.listing_id, NEW.buyer_account_id, NEW.quantity)
  ON CONFLICT (listing_id, account_id)
  DO UPDATE SET shares_held = public.sm_cap_table.shares_held + EXCLUDED.shares_held,
                updated_at = now();
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_sm_trade_shares AFTER INSERT ON public.sm_trades
  FOR EACH ROW EXECUTE FUNCTION public.sm_after_trade_move_shares();

-- إنشاء محافظ افتراضية عند فتح حساب سوق
CREATE OR REPLACE FUNCTION public.sm_bootstrap_wallets()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sm_wallets(account_id, wallet_type) VALUES
    (NEW.id, 'trading_cash'),
    (NEW.id, 'reserved_margin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_sm_account_wallets AFTER INSERT ON public.sm_accounts
  FOR EACH ROW EXECUTE FUNCTION public.sm_bootstrap_wallets();

-- محرك المطابقة (Price-Time Priority) لأمر جديد
CREATE OR REPLACE FUNCTION public.sm_match_order(p_order_id UUID)
RETURNS TABLE(trades_created INT, total_qty BIGINT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o RECORD; opp RECORD; qty BIGINT; px NUMERIC;
  cnt INT := 0; total BIGINT := 0;
BEGIN
  SELECT * INTO o FROM public.sm_orders WHERE id = p_order_id FOR UPDATE;
  IF o.status NOT IN ('OPEN','PARTIALLY_FILLED') THEN
    RETURN QUERY SELECT 0, 0::BIGINT; RETURN;
  END IF;

  LOOP
    -- ابحث عن أفضل عرض معاكس
    IF o.side = 'BUY' THEN
      SELECT * INTO opp FROM public.sm_orders
        WHERE listing_id = o.listing_id AND side='SELL'
          AND status IN ('OPEN','PARTIALLY_FILLED')
          AND (o.type='MARKET' OR price <= o.price)
          AND account_id <> o.account_id
        ORDER BY price ASC, created_at ASC
        LIMIT 1 FOR UPDATE;
    ELSE
      SELECT * INTO opp FROM public.sm_orders
        WHERE listing_id = o.listing_id AND side='BUY'
          AND status IN ('OPEN','PARTIALLY_FILLED')
          AND (o.type='MARKET' OR price >= o.price)
          AND account_id <> o.account_id
        ORDER BY price DESC, created_at ASC
        LIMIT 1 FOR UPDATE;
    END IF;

    EXIT WHEN opp.id IS NULL OR o.remaining <= 0;

    qty := LEAST(o.remaining, opp.remaining);
    px  := opp.price; -- سعر الطرف الموجود بالدفتر (Maker price)

    -- فحص حد التذبذب
    IF NOT public.sm_check_daily_limit(o.listing_id, px) THEN
      -- إيقاف: خارج نطاق ±daily_limit
      UPDATE public.sm_orders SET status='REJECTED' WHERE id = o.id;
      EXIT;
    END IF;

    INSERT INTO public.sm_trades(listing_id, buy_order_id, sell_order_id, buyer_account_id, seller_account_id, price, quantity)
    VALUES(o.listing_id,
           CASE WHEN o.side='BUY' THEN o.id ELSE opp.id END,
           CASE WHEN o.side='SELL' THEN o.id ELSE opp.id END,
           CASE WHEN o.side='BUY' THEN o.account_id ELSE opp.account_id END,
           CASE WHEN o.side='SELL' THEN o.account_id ELSE opp.account_id END,
           px, qty);

    UPDATE public.sm_orders
      SET remaining = remaining - qty,
          status = CASE WHEN remaining - qty = 0 THEN 'FILLED' ELSE 'PARTIALLY_FILLED' END
      WHERE id = opp.id;
    UPDATE public.sm_orders
      SET remaining = remaining - qty,
          status = CASE WHEN remaining - qty = 0 THEN 'FILLED' ELSE 'PARTIALLY_FILLED' END
      WHERE id = o.id;

    o.remaining := o.remaining - qty;
    cnt := cnt + 1;
    total := total + qty;
  END LOOP;

  RETURN QUERY SELECT cnt, total;
END;$$;

GRANT EXECUTE ON FUNCTION public.sm_calc_max_valuation(public.sm_listing_stage, NUMERIC, NUMERIC, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sm_check_daily_limit(UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sm_match_order(UUID) TO authenticated, service_role;
