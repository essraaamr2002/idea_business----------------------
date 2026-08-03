
-- ===== 1) role_permissions =====
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_perms_admin_read" ON public.role_permissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Seed permissions per role
INSERT INTO public.role_permissions(role, permission) VALUES
  -- admin = full access
  ('admin','*'),
  -- accountant
  ('accountant','wallets.read'),('accountant','wallets.adjust'),('accountant','wallets.freeze'),
  ('accountant','ledger.read'),('accountant','commissions.read'),
  ('accountant','payouts.read'),('accountant','payouts.approve'),
  ('accountant','manual_payouts.execute'),('accountant','settings.read'),
  -- moderator
  ('moderator','community.read'),('moderator','community.hide'),('moderator','community.delete'),
  ('moderator','members.read'),('moderator','members.suspend'),('moderator','members.ban'),
  ('moderator','projects.read'),('moderator','projects.approve'),('moderator','projects.archive'),
  ('moderator','ads.read'),('moderator','ads.pause'),
  -- support
  ('support','members.read'),('support','tickets.read'),('support','tickets.reply'),
  ('support','disputes.read'),('support','disputes.note'),
  ('support','kyc.read')
ON CONFLICT DO NOTHING;

-- has_permission()
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND (rp.permission = _perm OR rp.permission = '*')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','moderator','accountant','support','seo')
  );
$$;

-- ===== 2) admin_audit_log =====
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_table text,
  target_id text,
  diff jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_read" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_log(created_at DESC);

CREATE OR REPLACE FUNCTION public.log_admin_action(_action text, _table text, _target text, _diff jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.admin_audit_log(actor_id, action, target_table, target_id, diff)
  VALUES (auth.uid(), _action, _table, _target, _diff)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- ===== 3) platform_settings =====
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  category text NOT NULL,
  label text NOT NULL,
  description text,
  value_type text NOT NULL DEFAULT 'string',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_staff_read" ON public.platform_settings FOR SELECT TO authenticated
  USING (public.is_admin_staff(auth.uid()));
CREATE POLICY "settings_admin_write" ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.get_setting(_key text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT value FROM public.platform_settings WHERE key = _key; $$;

-- ===== 4) Seed 200+ settings =====
INSERT INTO public.platform_settings(key,value,category,label,description,value_type) VALUES
-- Commissions (15)
('commission_buyer_pct','"7"','commissions','نسبة عمولة المشتري %','تخصم من المشتري عند الشراء','percent'),
('commission_seller_pct','"3"','commissions','نسبة عمولة البائع %','تخصم من البائع عند البيع','percent'),
('commission_investment_pct','"7"','commissions','نسبة عمولة الاستثمار %','من قيمة الصفقة','percent'),
('commission_payout_pct','"1"','commissions','نسبة رسوم السحب %','تخصم عند سحب الرصيد','percent'),
('commission_supervisor_pct','"10"','commissions','نسبة عمولة المشرف الميداني %',null,'percent'),
('commission_idea_owner_pct','"70"','commissions','نسبة صاحب الفكرة من العضوية المفتوحة %',null,'percent'),
('commission_platform_pct','"30"','commissions','نسبة المنصة من العضوية المفتوحة %',null,'percent'),
('commission_ads_referral_pct','"5"','commissions','عمولة إحالة الإعلانات %',null,'percent'),
('commission_min_fee_minor','"100"','commissions','حد أدنى للعمولة (هللة)',null,'number'),
('commission_max_fee_minor','"5000000"','commissions','حد أعلى للعمولة (هللة)',null,'number'),
('commission_currency','"SAR"','commissions','عملة العمولة الافتراضية',null,'string'),
('commission_round_up','true','commissions','تقريب العمولة لأعلى',null,'boolean'),
('commission_apply_on_top_up','false','commissions','تطبيق العمولة على الإيداع',null,'boolean'),
('commission_apply_on_internal_transfer','false','commissions','تطبيق العمولة على التحويل الداخلي',null,'boolean'),
('commission_taxable','false','commissions','شامل ضريبة القيمة المضافة',null,'boolean'),

-- Fees (12)
('lawyer_retainer_minor','"300000"','fees','أتعاب المحامي (هللة)','3000 ريال','number'),
('supervisor_monthly_minor','"100000"','fees','اشتراك المشرف الشهري (هللة)','1000 ريال','number'),
('membership_open_monthly_minor','"2500"','fees','اشتراك العضوية المفتوحة الشهري (هللة)','25 ريال','number'),
('membership_full_monthly_minor','"5000"','fees','اشتراك العضوية الكاملة (هللة)','50 ريال','number'),
('listing_fee_minor','"0"','fees','رسوم إدراج مشروع',null,'number'),
('featured_listing_fee_minor','"50000"','fees','رسوم تمييز مشروع','500 ريال','number'),
('top_pin_fee_minor','"20000"','fees','رسوم تثبيت أعلى الواجهة',null,'number'),
('dispute_filing_fee_minor','"10000"','fees','رسوم فتح نزاع',null,'number'),
('kyc_resubmit_fee_minor','"0"','fees','رسوم إعادة تقديم KYC',null,'number'),
('payout_min_amount_minor','"5000"','fees','حد أدنى للسحب','50 ريال','number'),
('payout_max_amount_minor','"10000000"','fees','حد أعلى للسحب اليومي',null,'number'),
('refund_window_hours','"48"','fees','مدة استرداد الرسوم بالساعات',null,'number'),

-- Limits (30)
('free_membership_projects','3','limits','عدد المشاريع المسموح بها للعضوية المجانية',null,'number'),
('free_membership_likes','20','limits','عدد الإعجابات اليومية للمجاني',null,'number'),
('free_membership_comments','10','limits','عدد التعليقات اليومية للمجاني',null,'number'),
('free_membership_reposts','5','limits','عدد إعادات النشر اليومية للمجاني',null,'number'),
('full_membership_likes','200','limits','إعجابات يومية للعضوية الكاملة',null,'number'),
('full_membership_comments','100','limits','تعليقات يومية للعضوية الكاملة',null,'number'),
('full_membership_reposts','50','limits','إعادات نشر يومية للكاملة',null,'number'),
('max_post_media_count','8','limits','أقصى عدد مرفقات بمنشور',null,'number'),
('max_post_chars','5000','limits','أقصى عدد حروف بالمنشور',null,'number'),
('max_project_images','12','limits','أقصى عدد صور للمشروع',null,'number'),
('max_project_chars','20000','limits','أقصى حروف وصف المشروع',null,'number'),
('max_offers_per_user_daily','20','limits','أقصى عدد عروض استثمار يومياً',null,'number'),
('max_share_orders_per_min','5','limits','أقصى أوامر بيع/شراء بالدقيقة',null,'number'),
('max_messages_per_min','30','limits','أقصى رسائل بالدقيقة',null,'number'),
('max_login_attempts','10','limits','أقصى محاولات تسجيل دخول',null,'number'),
('max_signup_per_ip_daily','5','limits','أقصى تسجيلات من نفس IP يومياً',null,'number'),
('max_ad_daily_budget','1000','limits','أقصى ميزانية يومية للإعلان',null,'number'),
('max_ad_duration_days','60','limits','أقصى مدة حملة إعلانية',null,'number'),
('min_ad_daily_budget','10','limits','حد أدنى ميزانية يومية',null,'number'),
('max_wallet_balance_minor','"100000000"','limits','حد أقصى لرصيد المحفظة (هللة)',null,'number'),
('max_kyc_attempts','3','limits','محاولات KYC قبل القفل',null,'number'),
('max_support_tickets_open','5','limits','أقصى تذاكر مفتوحة للمستخدم',null,'number'),
('max_disputes_open','3','limits','أقصى نزاعات مفتوحة للمستخدم',null,'number'),
('max_referrals_daily','50','limits','أقصى إحالات يومياً',null,'number'),
('max_news_subscribers','100000','limits','حد أقصى لمشتركي النشرة',null,'number'),
('max_uploads_size_mb','25','limits','أقصى حجم رفع (ميجا)',null,'number'),
('max_avatar_size_mb','5','limits','أقصى حجم صورة شخصية',null,'number'),
('max_search_results','100','limits','حد أقصى لنتائج البحث',null,'number'),
('rate_limit_post_per_hour','30','limits','منشورات بالساعة',null,'number'),
('rate_limit_comment_per_hour','60','limits','تعليقات بالساعة',null,'number'),

-- Features (30)
('feature_ads_enabled','true','features','تفعيل قسم الإعلانات',null,'boolean'),
('feature_news_enabled','true','features','تفعيل قسم الأخبار',null,'boolean'),
('feature_community_enabled','true','features','تفعيل قسم المجتمع',null,'boolean'),
('feature_market_enabled','true','features','تفعيل السوق الموازي',null,'boolean'),
('feature_referrals_enabled','true','features','تفعيل نظام الإحالات',null,'boolean'),
('feature_supervisor_enabled','true','features','تفعيل خدمة المشرف',null,'boolean'),
('feature_legal_enabled','true','features','تفعيل التوكيل القانوني',null,'boolean'),
('feature_disputes_enabled','true','features','تفعيل قسم النزاعات',null,'boolean'),
('feature_portals_enabled','true','features','تفعيل البوابات المجتمعية',null,'boolean'),
('feature_ai_assistant_enabled','true','features','تفعيل المساعد الذكي',null,'boolean'),
('feature_ai_articles_enabled','true','features','توليد مقالات AI تلقائياً',null,'boolean'),
('feature_watchlist_enabled','true','features','تفعيل قائمة المتابعة',null,'boolean'),
('feature_messages_enabled','true','features','تفعيل المراسلات',null,'boolean'),
('feature_tickets_enabled','true','features','تفعيل تذاكر الدعم',null,'boolean'),
('feature_brand_pages_enabled','true','features','تفعيل صفحات الماركات',null,'boolean'),
('feature_kyc_enabled','true','features','تفعيل التحقق KYC',null,'boolean'),
('feature_guarantees_enabled','true','features','تفعيل ضمانات المشاريع',null,'boolean'),
('feature_payouts_enabled','true','features','تفعيل السحوبات',null,'boolean'),
('feature_top_ups_enabled','true','features','تفعيل الإيداع',null,'boolean'),
('feature_two_factor_enabled','true','features','تفعيل المصادقة الثنائية',null,'boolean'),
('feature_otp_login_enabled','true','features','تفعيل دخول OTP',null,'boolean'),
('feature_google_login_enabled','true','features','تفعيل دخول جوجل',null,'boolean'),
('feature_apple_login_enabled','false','features','تفعيل دخول آبل',null,'boolean'),
('feature_referral_bonuses_enabled','true','features','مكافآت الإحالة',null,'boolean'),
('feature_dark_mode_default','false','features','الوضع الداكن افتراضياً',null,'boolean'),
('feature_arabic_default','true','features','العربية افتراضياً',null,'boolean'),
('feature_news_subscribe_enabled','true','features','اشتراك النشرة الإخبارية',null,'boolean'),
('feature_invest_offers_enabled','true','features','عروض الاستثمار',null,'boolean'),
('feature_share_orders_enabled','true','features','تداول الأسهم',null,'boolean'),
('feature_manual_payouts_enabled','true','features','التحويل اليدوي لصاحب الفكرة',null,'boolean'),

-- KYC (12)
('kyc_required_for_payout','true','kyc','KYC مطلوب للسحب',null,'boolean'),
('kyc_required_for_offer','true','kyc','KYC مطلوب لتقديم عرض',null,'boolean'),
('kyc_required_for_supervisor','true','kyc','KYC مطلوب لطلب مشرف',null,'boolean'),
('kyc_required_for_legal','true','kyc','KYC مطلوب لطلب محامي',null,'boolean'),
('kyc_required_for_market','false','kyc','KYC مطلوب للتداول',null,'boolean'),
('kyc_document_types','["national_id","passport","iqama"]','kyc','أنواع الوثائق المقبولة',null,'json'),
('kyc_review_sla_hours','48','kyc','مدة مراجعة KYC بالساعات',null,'number'),
('kyc_min_age','18','kyc','الحد الأدنى للعمر',null,'number'),
('kyc_block_countries','[]','kyc','دول محظورة (ISO)',null,'json'),
('kyc_require_selfie','true','kyc','طلب صورة شخصية',null,'boolean'),
('kyc_auto_approve_low_risk','false','kyc','موافقة تلقائية للمنخفض',null,'boolean'),
('kyc_provider','"manual"','kyc','مزود التحقق','manual أو absher','string'),

-- Email & Branding (15)
('email_from_name','"فكرة بزنس"','email','اسم المرسل',null,'string'),
('email_from_address','"no-reply@busniss.org"','email','بريد المرسل',null,'string'),
('email_reply_to','"support@busniss.org"','email','بريد الردود',null,'string'),
('email_signature_html','"<p>فريق فكرة بزنس</p>"','email','توقيع البريد HTML',null,'textarea'),
('email_brand_color','"#16a34a"','email','لون العلامة بالبريد',null,'string'),
('email_logo_url','""','email','رابط شعار البريد',null,'string'),
('terms_url','"/terms"','branding','رابط الشروط',null,'string'),
('privacy_url','"/privacy"','branding','رابط الخصوصية',null,'string'),
('support_url','"/support"','branding','رابط الدعم',null,'string'),
('platform_name','"فكرة بزنس"','branding','اسم المنصة',null,'string'),
('platform_tagline','"الاستثمار الجماعي الذكي"','branding','الشعار الفرعي',null,'string'),
('platform_support_phone','"+966500000000"','branding','رقم الدعم',null,'string'),
('platform_whatsapp','""','branding','رقم واتساب الدعم',null,'string'),
('platform_address','"الرياض، السعودية"','branding','العنوان',null,'string'),
('platform_country_default','"SA"','branding','الدولة الافتراضية',null,'string'),

-- AI (12)
('ai_model_default','"google/gemini-2.5-flash"','ai','نموذج AI الافتراضي',null,'string'),
('ai_articles_model','"google/gemini-3-flash-preview"','ai','نموذج توليد المقالات',null,'string'),
('ai_assistant_model','"google/gemini-2.5-flash"','ai','نموذج المساعد',null,'string'),
('ai_max_tokens_default','2048','ai','أقصى عدد رموز',null,'number'),
('ai_temperature_default','0.7','ai','درجة الإبداع',null,'number'),
('ai_articles_per_day','5','ai','أقصى مقالات يومياً',null,'number'),
('ai_moderation_enabled','true','ai','تفعيل فلتر المحتوى',null,'boolean'),
('ai_arabic_strict','true','ai','الكتابة بالعربية حصراً',null,'boolean'),
('ai_image_gen_enabled','false','ai','توليد الصور',null,'boolean'),
('ai_voice_enabled','false','ai','التحويل صوتي',null,'boolean'),
('ai_max_context_messages','20','ai','حد سياق المحادثة',null,'number'),
('ai_quota_per_user_daily','50','ai','حد استخدام المستخدم يومياً',null,'number'),

-- Security (15)
('signup_open','true','security','السماح بالتسجيل الجديد',null,'boolean'),
('email_confirm_required','true','security','تأكيد البريد الإلكتروني',null,'boolean'),
('password_min_length','8','security','الحد الأدنى لكلمة السر',null,'number'),
('password_require_symbols','true','security','رموز خاصة بكلمة السر',null,'boolean'),
('password_require_numbers','true','security','أرقام بكلمة السر',null,'boolean'),
('session_max_hours','720','security','مدة الجلسة بالساعات',null,'number'),
('lockout_after_failed_logins','5','security','قفل بعد محاولات فاشلة',null,'number'),
('lockout_duration_min','15','security','مدة القفل بالدقائق',null,'number'),
('ip_blocklist','[]','security','قائمة IP المحظورة',null,'json'),
('country_blocklist','[]','security','دول محظورة',null,'json'),
('require_2fa_for_admin','true','security','إلزام 2FA للإدارة',null,'boolean'),
('require_2fa_for_payout','true','security','إلزام 2FA للسحب',null,'boolean'),
('audit_retention_days','365','security','مدة حفظ سجل التدقيق',null,'number'),
('captcha_on_signup','true','security','كابتشا عند التسجيل',null,'boolean'),
('captcha_on_login','false','security','كابتشا عند الدخول',null,'boolean'),

-- Ads (12)
('ads_default_budget','100','ads','ميزانية افتراضية',null,'number'),
('ads_review_required','true','ads','مراجعة قبل التشغيل',null,'boolean'),
('ads_min_duration_days','1','ads','حد أدنى لمدة الحملة',null,'number'),
('ads_default_cta','"اعرف المزيد"','ads','نص الزر الافتراضي',null,'string'),
('ads_allowed_media_types','["image","video"]','ads','أنواع الميديا المسموح بها',null,'json'),
('ads_max_targeting_countries','50','ads','أقصى عدد دول مستهدفة',null,'number'),
('ads_age_min','18','ads','أقل عمر مستهدف',null,'number'),
('ads_age_max','75','ads','أعلى عمر مستهدف',null,'number'),
('ads_impression_cap_daily','100000','ads','حد ظهور يومي',null,'number'),
('ads_clickthrough_min_rate','0.005','ads','معدل أدنى للنقرات',null,'number'),
('ads_charge_model','"cpm"','ads','نموذج التسعير','cpm أو cpc','string'),
('ads_auto_pause_low_budget','true','ads','إيقاف تلقائي عند نفاد الميزانية',null,'boolean'),

-- Disputes & Legal (10)
('disputes_sla_days','7','disputes','مدة الرد على النزاع',null,'number'),
('disputes_auto_close_days','30','disputes','إغلاق تلقائي بعد أيام',null,'number'),
('disputes_categories','["financial","quality","delivery","other"]','disputes','أنواع النزاعات',null,'json'),
('legal_default_lawyer','""','disputes','محامي افتراضي',null,'string'),
('legal_retainer_required','true','disputes','إلزامية دفع الأتعاب مسبقاً',null,'boolean'),
('legal_court_jurisdiction','"الرياض"','disputes','الاختصاص القضائي',null,'string'),
('legal_payment_terms','"دفعة واحدة"','disputes','شروط الدفع',null,'string'),
('legal_response_sla_hours','24','disputes','مدة الرد القانوني',null,'number'),
('legal_evidence_max_files','10','disputes','أقصى مرفقات أدلة',null,'number'),
('legal_evidence_max_size_mb','50','disputes','حجم المرفقات',null,'number'),

-- Payments (12)
('payment_provider_default','"fatora"','payments','مزود الدفع الافتراضي',null,'string'),
('payment_providers_enabled','["fatora"]','payments','مزودي الدفع المفعّلين',null,'json'),
('payment_test_mode','false','payments','وضع الاختبار',null,'boolean'),
('payment_currencies','["SAR","USD","AED"]','payments','العملات المدعومة',null,'json'),
('payment_success_redirect','"/payment/success"','payments','مسار النجاح',null,'string'),
('payment_failure_redirect','"/payment/failure"','payments','مسار الفشل',null,'string'),
('payment_webhook_timeout_sec','30','payments','مهلة الويبهوك',null,'number'),
('payment_min_top_up_minor','"1000"','payments','حد أدنى للإيداع (هللة)',null,'number'),
('payment_max_top_up_minor','"10000000"','payments','حد أعلى للإيداع',null,'number'),
('payment_auto_settle','true','payments','تسوية تلقائية',null,'boolean'),
('payment_vat_pct','"15"','payments','نسبة ضريبة القيمة المضافة',null,'percent'),
('payment_invoice_prefix','"INV"','payments','بادئة الفواتير',null,'string'),

-- Referrals (8)
('referrals_signup_bonus_minor','"1000"','referrals','مكافأة التسجيل (هللة)',null,'number'),
('referrals_first_invest_bonus_minor','"2500"','referrals','مكافأة أول استثمار',null,'number'),
('referrals_max_bonus_per_user_minor','"50000"','referrals','أقصى مكافآت للمستخدم',null,'number'),
('referrals_code_length','8','referrals','طول كود الإحالة',null,'number'),
('referrals_require_kyc','true','referrals','اشتراط KYC للحصول',null,'boolean'),
('referrals_expiry_days','30','referrals','مدة صلاحية كود الإحالة',null,'number'),
('referrals_share_url_template','"https://busniss.org/r/{code}"','referrals','قالب رابط المشاركة',null,'string'),
('referrals_message_template','"انضم لـ فكرة بزنس عبر رابطي: {url}"','referrals','قالب الرسالة',null,'textarea'),

-- Notifications (10)
('notify_on_new_post','true','notifications','إشعار عند منشور جديد',null,'boolean'),
('notify_on_comment','true','notifications','إشعار عند تعليق',null,'boolean'),
('notify_on_like','false','notifications','إشعار عند إعجاب',null,'boolean'),
('notify_on_new_offer','true','notifications','إشعار عرض جديد',null,'boolean'),
('notify_on_kyc_status','true','notifications','إشعار حالة KYC',null,'boolean'),
('notify_on_payout','true','notifications','إشعار حالة السحب',null,'boolean'),
('notify_on_dispute_update','true','notifications','إشعار النزاعات',null,'boolean'),
('notify_email_enabled','true','notifications','إشعارات بريد',null,'boolean'),
('notify_push_enabled','false','notifications','إشعارات Push',null,'boolean'),
('notify_sms_enabled','false','notifications','إشعارات SMS',null,'boolean'),

-- Integrations (15)
('integration_salla_enabled','false','integrations','تفعيل سلة',null,'boolean'),
('integration_salla_store_url','""','integrations','رابط متجر سلة',null,'string'),
('integration_salla_api_token','""','integrations','توكن سلة',null,'string'),
('integration_wordpress_enabled','false','integrations','تفعيل ووردبريس',null,'boolean'),
('integration_wordpress_url','""','integrations','رابط موقع ووردبريس',null,'string'),
('integration_wordpress_app_password','""','integrations','كلمة سر التطبيق',null,'string'),
('integration_zapier_webhook','""','integrations','Webhook زابير',null,'string'),
('integration_n8n_webhook','""','integrations','Webhook n8n',null,'string'),
('integration_make_webhook','""','integrations','Webhook Make',null,'string'),
('integration_slack_webhook','""','integrations','Webhook سلاك',null,'string'),
('integration_discord_webhook','""','integrations','Webhook ديسكورد',null,'string'),
('integration_telegram_bot_token','""','integrations','توكن بوت تيليجرام',null,'string'),
('integration_telegram_chat_id','""','integrations','معرف محادثة تيليجرام',null,'string'),
('integration_custom_webhook_url','""','integrations','رابط Webhook مخصص',null,'string'),
('integration_custom_webhook_secret','""','integrations','مفتاح Webhook مخصص',null,'string'),

-- Marketing pixels (12)
('pixel_meta_id','""','marketing','معرف بكسل ميتا/فيسبوك',null,'string'),
('pixel_meta_access_token','""','marketing','توكن CAPI ميتا',null,'string'),
('pixel_instagram_id','""','marketing','معرف انستقرام (Meta)',null,'string'),
('pixel_tiktok_id','""','marketing','معرف بكسل تيك توك',null,'string'),
('pixel_tiktok_access_token','""','marketing','توكن أحداث تيك توك',null,'string'),
('pixel_snapchat_id','""','marketing','معرف بكسل سناب شات',null,'string'),
('pixel_snapchat_access_token','""','marketing','توكن أحداث سناب',null,'string'),
('pixel_google_analytics_id','""','marketing','معرف Google Analytics',null,'string'),
('pixel_google_ads_id','""','marketing','معرف Google Ads',null,'string'),
('pixel_twitter_id','""','marketing','معرف بكسل تويتر/X',null,'string'),
('pixel_linkedin_id','""','marketing','معرف بكسل لينكدإن',null,'string'),
('pixel_pinterest_id','""','marketing','معرف بكسل بنترست',null,'string'),

-- Language (5)
('lang_default','"ar"','language','اللغة الافتراضية',null,'string'),
('lang_enabled','["ar","en"]','language','اللغات المدعومة',null,'json'),
('lang_rtl_default','true','language','اتجاه RTL افتراضي',null,'boolean'),
('lang_auto_detect','true','language','اكتشاف لغة المتصفح',null,'boolean'),
('lang_translation_provider','"none"','language','مزود الترجمة',null,'string')

ON CONFLICT (key) DO NOTHING;

-- ===== 5) Fix ad_events insert policy (security) =====
DROP POLICY IF EXISTS "ad_events_no_client_insert" ON public.ad_events;
CREATE POLICY "ad_events_no_client_insert" ON public.ad_events FOR INSERT TO authenticated
  WITH CHECK (false);

-- ===== 6) share_orders admin SELECT =====
DROP POLICY IF EXISTS "share_orders_admin_read" ON public.share_orders;
CREATE POLICY "share_orders_admin_read" ON public.share_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
