
-- ============================================================================
-- 1. SERVICE PROVIDERS (مزودو الخدمات المهنية)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  display_name TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  category TEXT NOT NULL,
  subcategories TEXT[] DEFAULT '{}',
  country TEXT,
  city TEXT,
  languages TEXT[] DEFAULT '{ar}',
  hourly_rate NUMERIC(12,2),
  currency TEXT DEFAULT 'SAR',
  portfolio_urls TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_review','active','suspended')),
  kyc_status TEXT NOT NULL DEFAULT 'unsubmitted'
    CHECK (kyc_status IN ('unsubmitted','pending','approved','rejected')),
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  orders_completed INTEGER DEFAULT 0,
  response_time_hours INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_providers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.service_providers TO authenticated;
GRANT ALL ON public.service_providers TO service_role;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_can_view_active_providers" ON public.service_providers
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND kyc_status = 'approved');
CREATE POLICY "owner_can_view_own_provider" ON public.service_providers
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner_can_create_provider" ON public.service_providers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner_can_update_own_provider" ON public.service_providers
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin_full_access_providers" ON public.service_providers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================================
-- 2. KYC للمزودين
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.service_provider_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  id_document_url TEXT,
  business_license_url TEXT,
  selfie_url TEXT,
  portfolio_docs TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','needs_more_info')),
  reviewer_id UUID REFERENCES auth.users,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.service_provider_kyc TO authenticated;
GRANT ALL ON public.service_provider_kyc TO service_role;
ALTER TABLE public.service_provider_kyc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_view_own_kyc" ON public.service_provider_kyc
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner_submit_kyc" ON public.service_provider_kyc
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner_update_kyc" ON public.service_provider_kyc
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status IN ('pending','needs_more_info'));
CREATE POLICY "admin_full_kyc" ON public.service_provider_kyc
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================================
-- 3. SERVICE ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.service_providers ON DELETE RESTRICT,
  service_title TEXT NOT NULL,
  service_description TEXT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'SAR',
  amount_sar NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','in_progress','delivered','completed','disputed','cancelled','refunded')),
  delivery_days INTEGER,
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  auto_release_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.service_orders TO authenticated;
GRANT ALL ON public.service_orders TO service_role;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_view_own_orders" ON public.service_orders
  FOR SELECT TO authenticated USING (client_id = auth.uid());
CREATE POLICY "provider_view_own_orders" ON public.service_orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
CREATE POLICY "client_create_order" ON public.service_orders
  FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "parties_update_order" ON public.service_orders
  FOR UPDATE TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.service_providers p WHERE p.id = provider_id AND p.user_id = auth.uid())
  );
CREATE POLICY "admin_full_orders" ON public.service_orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_orders_client ON public.service_orders(client_id, created_at DESC);
CREATE INDEX idx_orders_provider ON public.service_orders(provider_id, created_at DESC);
CREATE INDEX idx_orders_status ON public.service_orders(status);

-- ============================================================================
-- 4. SERVICE REVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.service_orders ON DELETE CASCADE UNIQUE,
  provider_id UUID NOT NULL REFERENCES public.service_providers ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  provider_response TEXT,
  provider_response_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.service_reviews TO authenticated;
GRANT ALL ON public.service_reviews TO service_role;
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_reviews" ON public.service_reviews
  FOR SELECT TO anon, authenticated USING (is_public = TRUE);
CREATE POLICY "client_write_review" ON public.service_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.service_orders o
      WHERE o.id = order_id AND o.client_id = auth.uid() AND o.status = 'completed'
    )
  );
CREATE POLICY "provider_respond_review" ON public.service_reviews
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
CREATE POLICY "admin_full_reviews" ON public.service_reviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================================
-- 5. ESCROW HOLDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.escrow_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.service_orders ON DELETE CASCADE UNIQUE,
  client_id UUID NOT NULL REFERENCES auth.users,
  provider_user_id UUID NOT NULL REFERENCES auth.users,
  amount_sar NUMERIC(14,2) NOT NULL CHECK (amount_sar > 0),
  platform_fee_sar NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_provider_sar NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'held'
    CHECK (status IN ('held','released','refunded','partial_refund')),
  held_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  release_txn_id TEXT,
  refund_txn_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.escrow_holds TO authenticated;
GRANT ALL ON public.escrow_holds TO service_role;
ALTER TABLE public.escrow_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parties_view_escrow" ON public.escrow_holds
  FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR provider_user_id = auth.uid());
CREATE POLICY "admin_full_escrow" ON public.escrow_holds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================================
-- 6. REFERRAL TIERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referral_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  min_referrals INTEGER NOT NULL,
  max_referrals INTEGER,
  reward_per_referral_sar NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  perks JSONB DEFAULT '[]'::jsonb,
  badge_color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_tiers TO anon, authenticated;
GRANT ALL ON public.referral_tiers TO service_role;
ALTER TABLE public.referral_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_tiers" ON public.referral_tiers
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.referral_tiers (tier_key, name_ar, name_en, min_referrals, max_referrals, reward_per_referral_sar, commission_pct, badge_color, sort_order, perks) VALUES
  ('bronze','برونزي','Bronze',0,4,25,0,'#CD7F32',1,'["مكافأة نقدية لكل إحالة مؤكدة"]'::jsonb),
  ('silver','فضي','Silver',5,19,50,0,'#C0C0C0',2,'["شارة فضية","أولوية دعم"]'::jsonb),
  ('gold','ذهبي','Gold',20,49,75,5,'#FFD700',3,'["شارة ذهبية","عمولة 5% من مشتريات المُحال","صفحة سفير"]'::jsonb),
  ('diamond','ماسي','Diamond',50,NULL,100,10,'#B9F2FF',4,'["شارة ماسية دائمة","عمولة 10%","اسمك في لوحة الشرف","مدير حساب"]'::jsonb)
ON CONFLICT (tier_key) DO NOTHING;

-- ============================================================================
-- 7. MENA CURRENCIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mena_currencies (
  code TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,
  country_ar TEXT NOT NULL,
  country_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  symbol TEXT NOT NULL,
  symbol_new TEXT,
  flag_emoji TEXT,
  decimals INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);
GRANT SELECT ON public.mena_currencies TO anon, authenticated;
GRANT ALL ON public.mena_currencies TO service_role;
ALTER TABLE public.mena_currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_currencies" ON public.mena_currencies
  FOR SELECT TO anon, authenticated USING (is_active = TRUE);

INSERT INTO public.mena_currencies (code, country_code, country_ar, country_en, name_ar, name_en, symbol, symbol_new, flag_emoji, decimals, sort_order) VALUES
  ('SAR','SA','السعودية','Saudi Arabia','ريال سعودي','Saudi Riyal','ر.س','﷼','🇸🇦',2,1),
  ('AED','AE','الإمارات','UAE','درهم إماراتي','UAE Dirham','د.إ','د.إ','🇦🇪',2,2),
  ('QAR','QA','قطر','Qatar','ريال قطري','Qatari Riyal','ر.ق',NULL,'🇶🇦',2,3),
  ('KWD','KW','الكويت','Kuwait','دينار كويتي','Kuwaiti Dinar','د.ك',NULL,'🇰🇼',3,4),
  ('BHD','BH','البحرين','Bahrain','دينار بحريني','Bahraini Dinar','د.ب',NULL,'🇧🇭',3,5),
  ('OMR','OM','عُمان','Oman','ريال عُماني','Omani Rial','ر.ع',NULL,'🇴🇲',3,6),
  ('JOD','JO','الأردن','Jordan','دينار أردني','Jordanian Dinar','د.أ',NULL,'🇯🇴',3,7),
  ('EGP','EG','مصر','Egypt','جنيه مصري','Egyptian Pound','ج.م','£','🇪🇬',2,8),
  ('MAD','MA','المغرب','Morocco','درهم مغربي','Moroccan Dirham','د.م',NULL,'🇲🇦',2,9),
  ('DZD','DZ','الجزائر','Algeria','دينار جزائري','Algerian Dinar','د.ج',NULL,'🇩🇿',2,10),
  ('TND','TN','تونس','Tunisia','دينار تونسي','Tunisian Dinar','د.ت',NULL,'🇹🇳',3,11),
  ('LYD','LY','ليبيا','Libya','دينار ليبي','Libyan Dinar','د.ل',NULL,'🇱🇾',3,12),
  ('LBP','LB','لبنان','Lebanon','ليرة لبنانية','Lebanese Pound','ل.ل',NULL,'🇱🇧',2,13),
  ('IQD','IQ','العراق','Iraq','دينار عراقي','Iraqi Dinar','د.ع',NULL,'🇮🇶',3,14),
  ('SYP','SY','سوريا','Syria','ليرة سورية','Syrian Pound','ل.س',NULL,'🇸🇾',2,15),
  ('YER','YE','اليمن','Yemen','ريال يمني','Yemeni Rial','ر.ي',NULL,'🇾🇪',2,16),
  ('SDG','SD','السودان','Sudan','جنيه سوداني','Sudanese Pound','ج.س',NULL,'🇸🇩',2,17),
  ('DJF','DJ','جيبوتي','Djibouti','فرنك جيبوتي','Djiboutian Franc','ف.ج',NULL,'🇩🇯',0,18),
  ('MRU','MR','موريتانيا','Mauritania','أوقية موريتانية','Mauritanian Ouguiya','أ.م',NULL,'🇲🇷',2,19),
  ('KMF','KM','جزر القمر','Comoros','فرنك قمري','Comorian Franc','ف.ق',NULL,'🇰🇲',0,20),
  ('SOS','SO','الصومال','Somalia','شلن صومالي','Somali Shilling','ش.ص',NULL,'🇸🇴',2,21),
  ('PSP','PS','فلسطين','Palestine','شيكل','Shekel','₪',NULL,'🇵🇸',2,22)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 8. دوال ESCROW الذرّية
-- ============================================================================
CREATE OR REPLACE FUNCTION public.escrow_hold_for_order(
  p_order_id UUID,
  p_platform_fee_pct NUMERIC DEFAULT 5
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_provider_user UUID;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_hold_id UUID;
  v_debit_result JSONB;
BEGIN
  SELECT * INTO v_order FROM public.service_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'invalid_status:%', v_order.status; END IF;

  SELECT user_id INTO v_provider_user FROM public.service_providers WHERE id = v_order.provider_id;
  IF v_provider_user IS NULL THEN RAISE EXCEPTION 'provider_not_found'; END IF;

  v_fee := ROUND(v_order.amount_sar * p_platform_fee_pct / 100.0, 2);
  v_net := v_order.amount_sar - v_fee;

  -- خصم من محفظة العميل باستخدام الدالة الذرّية القائمة
  v_debit_result := public.debit_wallet(v_order.client_id, v_order.amount_sar, 'escrow_hold', jsonb_build_object('order_id', p_order_id));
  IF (v_debit_result->>'success')::BOOLEAN IS NOT TRUE THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO public.escrow_holds (order_id, client_id, provider_user_id, amount_sar, platform_fee_sar, net_provider_sar, status)
  VALUES (p_order_id, v_order.client_id, v_provider_user, v_order.amount_sar, v_fee, v_net, 'held')
  RETURNING id INTO v_hold_id;

  UPDATE public.service_orders
    SET status='accepted', accepted_at=now(),
        auto_release_at=now() + interval '7 days'
    WHERE id = p_order_id;

  RETURN v_hold_id;
END $$;

CREATE OR REPLACE FUNCTION public.escrow_release_for_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold RECORD;
  v_provider_wallet UUID;
BEGIN
  SELECT * INTO v_hold FROM public.escrow_holds WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hold_not_found'; END IF;
  IF v_hold.status <> 'held' THEN RAISE EXCEPTION 'invalid_status:%', v_hold.status; END IF;

  -- إضافة المبلغ الصافي لمحفظة المزود
  SELECT id INTO v_provider_wallet FROM public.wallets WHERE user_id = v_hold.provider_user_id LIMIT 1;
  IF v_provider_wallet IS NULL THEN
    INSERT INTO public.wallets (user_id, balance_available) VALUES (v_hold.provider_user_id, 0) RETURNING id INTO v_provider_wallet;
  END IF;

  UPDATE public.wallets SET balance_available = COALESCE(balance_available,0) + v_hold.net_provider_sar, updated_at = now()
    WHERE id = v_provider_wallet;

  INSERT INTO public.ledger (user_id, type, amount, balance_after, description, reference_id, reference_type)
  SELECT v_hold.provider_user_id, 'escrow_release', v_hold.net_provider_sar,
         (SELECT balance_available FROM public.wallets WHERE id = v_provider_wallet),
         'إطلاق مبلغ من ضمان طلب خدمة', p_order_id, 'service_order';

  UPDATE public.escrow_holds SET status='released', released_at=now() WHERE id = v_hold.id;
  UPDATE public.service_orders SET status='completed', completed_at=now() WHERE id = p_order_id;

  UPDATE public.service_providers SET orders_completed = COALESCE(orders_completed,0) + 1
    WHERE id = (SELECT provider_id FROM public.service_orders WHERE id = p_order_id);

  RETURN TRUE;
END $$;

CREATE OR REPLACE FUNCTION public.escrow_refund_for_order(p_order_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold RECORD;
  v_client_wallet UUID;
BEGIN
  SELECT * INTO v_hold FROM public.escrow_holds WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hold_not_found'; END IF;
  IF v_hold.status NOT IN ('held') THEN RAISE EXCEPTION 'invalid_status:%', v_hold.status; END IF;

  SELECT id INTO v_client_wallet FROM public.wallets WHERE user_id = v_hold.client_id LIMIT 1;
  UPDATE public.wallets SET balance_available = COALESCE(balance_available,0) + v_hold.amount_sar, updated_at = now()
    WHERE id = v_client_wallet;

  INSERT INTO public.ledger (user_id, type, amount, balance_after, description, reference_id, reference_type)
  SELECT v_hold.client_id, 'escrow_refund', v_hold.amount_sar,
         (SELECT balance_available FROM public.wallets WHERE id = v_client_wallet),
         COALESCE('استرداد ضمان: ' || p_reason, 'استرداد ضمان طلب خدمة'), p_order_id, 'service_order';

  UPDATE public.escrow_holds SET status='refunded', refunded_at=now() WHERE id = v_hold.id;
  UPDATE public.service_orders SET status='refunded', cancelled_at=now() WHERE id = p_order_id;
  RETURN TRUE;
END $$;

-- ============================================================================
-- 9. تحديث تلقائي لمعدل تقييم المزود
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recompute_provider_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.service_providers sp
  SET rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM public.service_reviews WHERE provider_id = sp.id AND is_public=TRUE),0),
      rating_count = (SELECT COUNT(*) FROM public.service_reviews WHERE provider_id = sp.id AND is_public=TRUE),
      updated_at = now()
  WHERE sp.id = COALESCE(NEW.provider_id, OLD.provider_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_reviews_rating ON public.service_reviews;
CREATE TRIGGER trg_reviews_rating
AFTER INSERT OR UPDATE OR DELETE ON public.service_reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_provider_rating();

-- ============================================================================
-- 10. إرفاق إحالة تلقائي عند التسجيل
-- ============================================================================
CREATE OR REPLACE FUNCTION public.attach_referral_on_signup(p_new_user_id UUID, p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer UUID;
BEGIN
  IF p_code IS NULL OR p_code = '' THEN RETURN FALSE; END IF;

  SELECT referrer_id INTO v_referrer FROM public.referrals WHERE code = p_code LIMIT 1;
  IF v_referrer IS NULL OR v_referrer = p_new_user_id THEN RETURN FALSE; END IF;

  -- منع التكرار
  IF EXISTS (SELECT 1 FROM public.referral_verifications WHERE referred_id = p_new_user_id) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.referral_verifications (referrer_id, referred_id, code, status, created_at)
  VALUES (v_referrer, p_new_user_id, p_code, 'pending', now());

  UPDATE public.profiles SET referred_by = v_referrer WHERE id = p_new_user_id;
  UPDATE public.referrals SET uses_count = COALESCE(uses_count,0) + 1 WHERE code = p_code;

  RETURN TRUE;
END $$;
REVOKE ALL ON FUNCTION public.attach_referral_on_signup(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_referral_on_signup(UUID, TEXT) TO authenticated, service_role;

-- ============================================================================
-- 11. حساب مستوى المُحيل الحالي
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_referral_progress(p_user_id UUID)
RETURNS TABLE (
  verified_count BIGINT,
  pending_count BIGINT,
  total_reward_sar NUMERIC,
  current_tier TEXT,
  current_tier_ar TEXT,
  current_reward NUMERIC,
  current_commission NUMERIC,
  next_tier TEXT,
  next_tier_ar TEXT,
  next_tier_needed INTEGER,
  progress_pct NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_verified FROM public.referral_verifications
   WHERE referrer_id = p_user_id AND status IN ('verified','rewarded');

  RETURN QUERY
  WITH cur AS (
    SELECT * FROM public.referral_tiers
     WHERE v_verified >= min_referrals AND (max_referrals IS NULL OR v_verified <= max_referrals)
     ORDER BY sort_order DESC LIMIT 1
  ),
  nxt AS (
    SELECT * FROM public.referral_tiers
     WHERE min_referrals > v_verified ORDER BY min_referrals ASC LIMIT 1
  )
  SELECT
    v_verified,
    (SELECT COUNT(*) FROM public.referral_verifications WHERE referrer_id = p_user_id AND status = 'pending'),
    COALESCE((SELECT SUM(reward_per_referral_sar) FROM public.referral_verifications rv
              JOIN public.referral_tiers t ON v_verified >= t.min_referrals
              WHERE rv.referrer_id = p_user_id AND rv.status IN ('verified','rewarded')),0),
    (SELECT tier_key FROM cur),
    (SELECT name_ar FROM cur),
    (SELECT reward_per_referral_sar FROM cur),
    (SELECT commission_pct FROM cur),
    (SELECT tier_key FROM nxt),
    (SELECT name_ar FROM nxt),
    ((SELECT min_referrals FROM nxt) - v_verified)::INTEGER,
    CASE WHEN (SELECT min_referrals FROM nxt) IS NULL THEN 100
         ELSE ROUND(v_verified * 100.0 / (SELECT min_referrals FROM nxt), 1) END;
END $$;
REVOKE ALL ON FUNCTION public.get_user_referral_progress(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_referral_progress(UUID) TO authenticated, service_role;

-- ============================================================================
-- 12. Triggers updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_sp_updated BEFORE UPDATE ON public.service_providers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_spk_updated BEFORE UPDATE ON public.service_provider_kyc FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_so_updated BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_sr_updated BEFORE UPDATE ON public.service_reviews FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_esc_updated BEFORE UPDATE ON public.escrow_holds FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
