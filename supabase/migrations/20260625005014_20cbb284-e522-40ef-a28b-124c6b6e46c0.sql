
-- =====================================================
-- MULTI-CURRENCY ARAB WALLET SYSTEM
-- =====================================================

-- 1. Currency configuration
CREATE TABLE public.currency_config (
  code TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  symbol TEXT NOT NULL,
  flag_emoji TEXT,
  decimal_places SMALLINT NOT NULL DEFAULT 2,
  tier SMALLINT NOT NULL DEFAULT 2,
  country_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  receive_only BOOLEAN NOT NULL DEFAULT false,
  min_deposit_minor BIGINT NOT NULL DEFAULT 0,
  min_withdrawal_minor BIGINT NOT NULL DEFAULT 0,
  min_transfer_minor BIGINT NOT NULL DEFAULT 0,
  withdrawal_fee_flat_minor BIGINT NOT NULL DEFAULT 0,
  withdrawal_fee_pct NUMERIC(6,4) NOT NULL DEFAULT 0,
  rate_refresh_minutes INT NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.currency_config TO anon, authenticated;
GRANT ALL ON public.currency_config TO service_role;
ALTER TABLE public.currency_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currency_config_read_all" ON public.currency_config FOR SELECT USING (true);
CREATE POLICY "currency_config_admin_write" ON public.currency_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed Arab currencies
INSERT INTO public.currency_config (code, name_ar, name_en, symbol, flag_emoji, decimal_places, tier, country_code, receive_only, rate_refresh_minutes) VALUES
('SAR','ريال سعودي','Saudi Riyal','ر.س','🇸🇦',2,1,'SA',false,15),
('AED','درهم إماراتي','UAE Dirham','د.إ','🇦🇪',2,1,'AE',false,15),
('KWD','دينار كويتي','Kuwaiti Dinar','د.ك','🇰🇼',3,1,'KW',false,15),
('QAR','ريال قطري','Qatari Riyal','ر.ق','🇶🇦',2,1,'QA',false,15),
('BHD','دينار بحريني','Bahraini Dinar','د.ب','🇧🇭',3,1,'BH',false,15),
('OMR','ريال عُماني','Omani Riyal','ر.ع','🇴🇲',3,1,'OM',false,15),
('EGP','جنيه مصري','Egyptian Pound','ج.م','🇪🇬',2,1,'EG',false,15),
('JOD','دينار أردني','Jordanian Dinar','د.أ','🇯🇴',3,1,'JO',false,15),
('MAD','درهم مغربي','Moroccan Dirham','د.م','🇲🇦',2,2,'MA',false,60),
('TND','دينار تونسي','Tunisian Dinar','د.ت','🇹🇳',3,2,'TN',false,60),
('DZD','دينار جزائري','Algerian Dinar','د.ج','🇩🇿',2,2,'DZ',false,60),
('LYD','دينار ليبي','Libyan Dinar','د.ل','🇱🇾',3,2,'LY',false,60),
('IQD','دينار عراقي','Iraqi Dinar','د.ع','🇮🇶',0,2,'IQ',false,60),
('LBP','ليرة لبنانية','Lebanese Pound','ل.ل','🇱🇧',0,2,'LB',false,60),
('SYP','ليرة سورية','Syrian Pound','ل.س','🇸🇾',0,2,'SY',false,60),
('YER','ريال يمني','Yemeni Riyal','ر.ي','🇾🇪',2,2,'YE',false,60),
('SDG','جنيه سوداني','Sudanese Pound','ج.س','🇸🇩',2,2,'SD',false,60),
('SOS','شلن صومالي','Somali Shilling','S','🇸🇴',2,3,'SO',true,360),
('DJF','فرنك جيبوتي','Djiboutian Franc','Fdj','🇩🇯',0,3,'DJ',true,360),
('KMF','فرنك قمري','Comorian Franc','CF','🇰🇲',0,3,'KM',true,360),
('MRU','أوقية موريتانية','Mauritanian Ouguiya','UM','🇲🇷',2,3,'MR',true,360),
('ILS','شيكل (فلسطين)','Palestinian Shekel','₪','🇵🇸',2,3,'PS',true,360);

-- 2. Currency pair config
CREATE TABLE public.currency_pair_config (
  from_currency TEXT NOT NULL REFERENCES public.currency_config(code),
  to_currency TEXT NOT NULL REFERENCES public.currency_config(code),
  spread_pct NUMERIC(6,4) NOT NULL DEFAULT 0.5,
  fx_fee_pct NUMERIC(6,4) NOT NULL DEFAULT 0.8,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (from_currency, to_currency)
);
GRANT SELECT ON public.currency_pair_config TO authenticated;
GRANT ALL ON public.currency_pair_config TO service_role;
ALTER TABLE public.currency_pair_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pair_read_auth" ON public.currency_pair_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "pair_admin" ON public.currency_pair_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Sub-wallets per user per currency
CREATE TABLE public.wallet_sub_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL REFERENCES public.currency_config(code),
  sub_wallet_code TEXT UNIQUE NOT NULL,
  virtual_account_number TEXT,
  available_minor BIGINT NOT NULL DEFAULT 0 CHECK (available_minor >= 0),
  held_minor BIGINT NOT NULL DEFAULT 0 CHECK (held_minor >= 0),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency)
);
GRANT SELECT, INSERT, UPDATE ON public.wallet_sub_accounts TO authenticated;
GRANT ALL ON public.wallet_sub_accounts TO service_role;
ALTER TABLE public.wallet_sub_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_wallet_owner" ON public.wallet_sub_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "sub_wallet_admin" ON public.wallet_sub_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Live exchange rates
CREATE TABLE public.exchange_rates_live (
  id BIGSERIAL PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  mid_rate NUMERIC(20,10) NOT NULL,
  buy_rate NUMERIC(20,10) NOT NULL,
  sell_rate NUMERIC(20,10) NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX exchange_rates_live_pair_idx ON public.exchange_rates_live (from_currency, to_currency, fetched_at DESC);
GRANT SELECT ON public.exchange_rates_live TO authenticated;
GRANT ALL ON public.exchange_rates_live TO service_role;
ALTER TABLE public.exchange_rates_live ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rates_read_auth" ON public.exchange_rates_live FOR SELECT TO authenticated USING (true);

-- 5. FX transactions
CREATE TABLE public.fx_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  counterparty_id UUID REFERENCES auth.users(id),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  from_amount_minor BIGINT NOT NULL,
  to_amount_minor BIGINT NOT NULL,
  rate_applied NUMERIC(20,10) NOT NULL,
  spread_earned_minor BIGINT NOT NULL DEFAULT 0,
  fee_charged_minor BIGINT NOT NULL DEFAULT 0,
  kind TEXT NOT NULL,
  reference TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fx_transactions TO authenticated;
GRANT ALL ON public.fx_transactions TO service_role;
ALTER TABLE public.fx_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fx_owner_read" ON public.fx_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR counterparty_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 6. Rate locks
CREATE TABLE public.fx_rate_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  locked_rate NUMERIC(20,10) NOT NULL,
  from_amount_minor BIGINT NOT NULL,
  to_amount_minor BIGINT NOT NULL,
  fee_minor BIGINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.fx_rate_locks TO authenticated;
GRANT ALL ON public.fx_rate_locks TO service_role;
ALTER TABLE public.fx_rate_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lock_owner" ON public.fx_rate_locks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. User bank accounts
CREATE TABLE public.user_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  bank_name TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  iban TEXT,
  account_number TEXT,
  swift_code TEXT,
  currency TEXT NOT NULL REFERENCES public.currency_config(code),
  country_code TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_method TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bank_accounts TO authenticated;
GRANT ALL ON public.user_bank_accounts TO service_role;
ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_owner_all" ON public.user_bank_accounts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "bank_admin_read" ON public.user_bank_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 8. EMI partner events
CREATE TABLE public.emi_partner_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature TEXT,
  source_ip TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider, event_id)
);
GRANT ALL ON public.emi_partner_events TO service_role;
ALTER TABLE public.emi_partner_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emi_admin_read" ON public.emi_partner_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 9. Reconciliation log
CREATE TABLE public.fx_reconciliation_log (
  id BIGSERIAL PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  currency TEXT NOT NULL,
  sum_user_balances_minor BIGINT NOT NULL,
  partner_balance_minor BIGINT,
  discrepancy_minor BIGINT,
  status TEXT NOT NULL DEFAULT 'ok',
  notes TEXT
);
GRANT SELECT ON public.fx_reconciliation_log TO authenticated;
GRANT ALL ON public.fx_reconciliation_log TO service_role;
ALTER TABLE public.fx_reconciliation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recon_admin" ON public.fx_reconciliation_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate sub-wallet code: IDB-{CC}-{9 digits}
CREATE OR REPLACE FUNCTION public.generate_sub_wallet_code(p_country TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code TEXT;
BEGIN
  LOOP
    v_code := 'IDB-' || UPPER(COALESCE(p_country,'XX')) || '-' || lpad(floor(random()*1000000000)::text, 9, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.wallet_sub_accounts WHERE sub_wallet_code = v_code);
  END LOOP;
  RETURN v_code;
END $$;

-- Get or create sub-wallet
CREATE OR REPLACE FUNCTION public.wallet_get_or_create_sub(p_user UUID, p_currency TEXT)
RETURNS public.wallet_sub_accounts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.wallet_sub_accounts;
  v_country TEXT;
BEGIN
  SELECT * INTO v_row FROM public.wallet_sub_accounts WHERE user_id = p_user AND currency = p_currency;
  IF FOUND THEN RETURN v_row; END IF;

  SELECT country_code INTO v_country FROM public.currency_config WHERE code = p_currency;

  INSERT INTO public.wallet_sub_accounts (user_id, currency, sub_wallet_code, virtual_account_number, is_primary)
  VALUES (
    p_user, p_currency,
    public.generate_sub_wallet_code(v_country),
    'VA-' || UPPER(p_currency) || '-' || substr(replace(p_user::text,'-',''),1,12),
    NOT EXISTS (SELECT 1 FROM public.wallet_sub_accounts WHERE user_id = p_user)
  )
  RETURNING * INTO v_row;
  RETURN v_row;
END $$;

-- Lock FX rate for 60 seconds
CREATE OR REPLACE FUNCTION public.fx_create_rate_lock(
  p_user UUID, p_from TEXT, p_to TEXT, p_from_amount_minor BIGINT
) RETURNS public.fx_rate_locks LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rate NUMERIC(20,10);
  v_spread NUMERIC(6,4);
  v_fee_pct NUMERIC(6,4);
  v_to_amount BIGINT;
  v_fee BIGINT;
  v_lock public.fx_rate_locks;
BEGIN
  SELECT mid_rate INTO v_rate FROM public.exchange_rates_live
    WHERE from_currency = p_from AND to_currency = p_to
    ORDER BY fetched_at DESC LIMIT 1;
  IF v_rate IS NULL THEN RAISE EXCEPTION 'No FX rate available for % -> %', p_from, p_to; END IF;

  SELECT COALESCE(spread_pct,0.5), COALESCE(fx_fee_pct,0.8)
    INTO v_spread, v_fee_pct
    FROM public.currency_pair_config WHERE from_currency = p_from AND to_currency = p_to;
  v_spread := COALESCE(v_spread, 0.5);
  v_fee_pct := COALESCE(v_fee_pct, 0.8);

  -- Effective rate after spread (sell side)
  v_rate := v_rate * (1 - v_spread/100.0);
  v_fee := (p_from_amount_minor * v_fee_pct / 100)::BIGINT;
  v_to_amount := ((p_from_amount_minor - v_fee) * v_rate)::BIGINT;

  INSERT INTO public.fx_rate_locks (user_id, from_currency, to_currency, locked_rate, from_amount_minor, to_amount_minor, fee_minor, expires_at)
  VALUES (p_user, p_from, p_to, v_rate, p_from_amount_minor, v_to_amount, v_fee, now() + interval '60 seconds')
  RETURNING * INTO v_lock;
  RETURN v_lock;
END $$;

-- Execute cross-currency transfer using lock
CREATE OR REPLACE FUNCTION public.fx_execute_lock(
  p_user UUID, p_lock_id UUID, p_recipient UUID DEFAULT NULL
) RETURNS public.fx_transactions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lock public.fx_rate_locks;
  v_from_sub public.wallet_sub_accounts;
  v_to_sub public.wallet_sub_accounts;
  v_target UUID;
  v_tx public.fx_transactions;
BEGIN
  SELECT * INTO v_lock FROM public.fx_rate_locks WHERE id = p_lock_id AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lock not found'; END IF;
  IF v_lock.consumed_at IS NOT NULL THEN RAISE EXCEPTION 'Lock already consumed'; END IF;
  IF v_lock.expires_at < now() THEN RAISE EXCEPTION 'Rate lock expired'; END IF;

  v_target := COALESCE(p_recipient, p_user);

  v_from_sub := public.wallet_get_or_create_sub(p_user, v_lock.from_currency);
  v_to_sub := public.wallet_get_or_create_sub(v_target, v_lock.to_currency);

  IF v_from_sub.available_minor < v_lock.from_amount_minor THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  UPDATE public.wallet_sub_accounts SET available_minor = available_minor - v_lock.from_amount_minor, updated_at = now()
    WHERE id = v_from_sub.id;
  UPDATE public.wallet_sub_accounts SET available_minor = available_minor + v_lock.to_amount_minor, updated_at = now()
    WHERE id = v_to_sub.id;

  UPDATE public.fx_rate_locks SET consumed_at = now() WHERE id = p_lock_id;

  INSERT INTO public.fx_transactions (user_id, counterparty_id, from_currency, to_currency,
    from_amount_minor, to_amount_minor, rate_applied, fee_charged_minor, kind, reference)
  VALUES (p_user, NULLIF(v_target, p_user), v_lock.from_currency, v_lock.to_currency,
    v_lock.from_amount_minor, v_lock.to_amount_minor, v_lock.locked_rate, v_lock.fee_minor,
    CASE WHEN p_recipient IS NULL OR p_recipient = p_user THEN 'self_convert' ELSE 'p2p_fx' END,
    'FX-' || substr(p_lock_id::text,1,8))
  RETURNING * INTO v_tx;
  RETURN v_tx;
END $$;

-- Daily reconciliation per currency
CREATE OR REPLACE FUNCTION public.fx_run_reconciliation()
RETURNS SETOF public.fx_reconciliation_log LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_sum BIGINT; v_log public.fx_reconciliation_log;
BEGIN
  FOR r IN SELECT code FROM public.currency_config WHERE is_active LOOP
    SELECT COALESCE(SUM(available_minor + held_minor),0) INTO v_sum
      FROM public.wallet_sub_accounts WHERE currency = r.code;
    INSERT INTO public.fx_reconciliation_log (currency, sum_user_balances_minor, partner_balance_minor, discrepancy_minor, status)
    VALUES (r.code, v_sum, NULL, NULL, 'pending_partner_sync')
    RETURNING * INTO v_log;
    RETURN NEXT v_log;
  END LOOP;
END $$;
