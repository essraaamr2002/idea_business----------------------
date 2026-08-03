
-- المرحلة 1: إضافة الإفراج الزمني وربط التذاكر بطلبات السحب
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS eta_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS support_ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- تعيين تاريخ الإفراج (14 يوماً) للسجلات المعلّقة الحالية
UPDATE public.payout_requests
  SET eta_release_at = created_at + interval '14 days'
  WHERE eta_release_at IS NULL;

-- Trigger يضمن وجود ETA على كل طلب جديد
CREATE OR REPLACE FUNCTION public.payout_set_eta()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.eta_release_at IS NULL THEN
    NEW.eta_release_at := COALESCE(NEW.created_at, now()) + interval '14 days';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS payout_set_eta_trg ON public.payout_requests;
CREATE TRIGGER payout_set_eta_trg
  BEFORE INSERT ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.payout_set_eta();

-- منع إكمال السحب قبل انقضاء فترة الإفراج (الأمان: العملاء لا يمكنهم التعديل أصلاً، هذا للإدارة)
CREATE OR REPLACE FUNCTION public.payout_block_early_complete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    IF NEW.eta_release_at IS NOT NULL AND NEW.eta_release_at > now() THEN
      RAISE EXCEPTION 'payout_release_period_not_elapsed: % remaining',
        (NEW.eta_release_at - now());
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS payout_block_early_complete_trg ON public.payout_requests;
CREATE TRIGGER payout_block_early_complete_trg
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.payout_block_early_complete();

-- ============================================================
-- دالة فتح تذكرة دعم مرتبطة بالمحفظة (للعميل من واجهته)
-- ============================================================
CREATE OR REPLACE FUNCTION public.wallet_open_support_ticket(
  p_subject text,
  p_message text,
  p_category text DEFAULT 'wallet_issue'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
  user_email text;
  user_name text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF length(coalesce(p_subject,'')) < 3 OR length(p_subject) > 200 THEN
    RAISE EXCEPTION 'invalid_subject';
  END IF;
  IF length(coalesce(p_message,'')) < 10 OR length(p_message) > 5000 THEN
    RAISE EXCEPTION 'invalid_message';
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = uid;
  SELECT display_name INTO user_name FROM public.profiles WHERE id = uid;

  INSERT INTO public.support_tickets(user_id, name, email, subject, message, status)
  VALUES (
    uid,
    coalesce(user_name, 'عضو'),
    user_email,
    '[' || p_category || '] ' || p_subject,
    p_message,
    'open'
  )
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'ticket_id', new_id);
END $$;

REVOKE ALL ON FUNCTION public.wallet_open_support_ticket(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wallet_open_support_ticket(text, text, text) TO authenticated;

-- ============================================================
-- دالة طلب سحب ذكي تنشئ تذكرة دعم تلقائياً مع ETA
-- ============================================================
CREATE OR REPLACE FUNCTION public.wallet_request_smart_payout(
  p_channel text,
  p_destination text,
  p_amount_minor bigint,
  p_currency text DEFAULT 'SAR'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  payout_id uuid;
  ticket_id uuid;
  ref text;
  masked text;
  w public.wallets;
  user_email text;
  user_name text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_amount_minor < 1000 THEN RAISE EXCEPTION 'amount_too_small'; END IF;
  IF p_channel NOT IN ('vodafone_cash','barq','bank_iban') THEN
    RAISE EXCEPTION 'invalid_channel';
  END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF w.user_id IS NULL THEN RAISE EXCEPTION 'wallet_not_found'; END IF;
  IF w.status <> 'active' THEN RAISE EXCEPTION 'wallet_not_active'; END IF;
  IF (w.balance * 100)::bigint - coalesce((w.held*100)::bigint,0) < p_amount_minor THEN
    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  ref := 'PO-' || to_char(now(),'YYYYMMDD') || '-' || lpad(((floor(random()*1000000000))::bigint)::text, 9, '0');
  masked := CASE
    WHEN length(p_destination) > 4 THEN
      repeat('•', greatest(length(p_destination)-4, 0)) || right(p_destination, 4)
    ELSE p_destination
  END;

  -- حجز المبلغ (يضاف للحقل held)
  UPDATE public.wallets
    SET held = coalesce(held,0) + (p_amount_minor::numeric / 100),
        last_activity_at = now()
    WHERE user_id = uid;

  -- إنشاء طلب السحب
  INSERT INTO public.payout_requests(
    user_id, channel, destination_masked, destination_enc,
    amount_minor, currency, status, reference, eta_release_at
  ) VALUES (
    uid, p_channel, masked, p_destination,
    p_amount_minor, p_currency, 'pending', ref, now() + interval '14 days'
  ) RETURNING id INTO payout_id;

  -- إنشاء تذكرة دعم تلقائية
  SELECT email INTO user_email FROM auth.users WHERE id = uid;
  SELECT display_name INTO user_name FROM public.profiles WHERE id = uid;

  INSERT INTO public.support_tickets(user_id, name, email, subject, message, status)
  VALUES (
    uid,
    coalesce(user_name,'عضو'),
    user_email,
    '[withdrawal] طلب سحب جديد ' || ref,
    format('طلب سحب بمبلغ %s %s إلى %s (%s). تاريخ الإفراج: %s',
           (p_amount_minor::numeric/100)::text, p_currency,
           CASE p_channel WHEN 'vodafone_cash' THEN 'فودافون كاش'
                          WHEN 'barq' THEN 'برق'
                          ELSE 'تحويل بنكي' END,
           masked,
           to_char(now() + interval '14 days', 'YYYY-MM-DD')),
    'open'
  ) RETURNING id INTO ticket_id;

  UPDATE public.payout_requests SET support_ticket_id = ticket_id WHERE id = payout_id;

  -- إشعار للعميل
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (uid, 'payout_requested', 'تم استلام طلب السحب',
          'سيتم مراجعة طلبك خلال 14 يوماً قبل التحويل',
          jsonb_build_object('payout_id', payout_id, 'reference', ref,
                             'eta_release_at', now() + interval '14 days',
                             'ticket_id', ticket_id));

  RETURN jsonb_build_object(
    'ok', true,
    'payout_id', payout_id,
    'reference', ref,
    'ticket_id', ticket_id,
    'destination_masked', masked,
    'eta_release_at', now() + interval '14 days',
    'status', 'pending'
  );
END $$;

REVOKE ALL ON FUNCTION public.wallet_request_smart_payout(text, text, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wallet_request_smart_payout(text, text, bigint, text) TO authenticated;

-- ============================================================
-- دالة اقتراح مبالغ شحن ذكية بناءً على عادات المستخدم
-- ============================================================
CREATE OR REPLACE FUNCTION public.wallet_suggest_topup_amounts()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  avg_amt numeric;
  last_amt numeric;
  suggestions bigint[];
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT avg(amount), max(amount) FILTER (WHERE created_at = (
    SELECT max(created_at) FROM public.payment_intents
    WHERE user_id = uid AND status = 'succeeded' AND purpose = 'wallet_topup'
  ))
  INTO avg_amt, last_amt
  FROM public.payment_intents
  WHERE user_id = uid AND status = 'succeeded' AND purpose = 'wallet_topup';

  IF avg_amt IS NULL THEN
    suggestions := ARRAY[50, 100, 250, 500, 1000]::bigint[];
  ELSE
    suggestions := ARRAY[
      greatest(round(avg_amt*0.5), 50)::bigint,
      round(avg_amt)::bigint,
      round(avg_amt*2)::bigint,
      round(avg_amt*5)::bigint
    ];
  END IF;

  RETURN jsonb_build_object(
    'suggestions', to_jsonb(suggestions),
    'last_amount', last_amt,
    'avg_amount', avg_amt
  );
END $$;

REVOKE ALL ON FUNCTION public.wallet_suggest_topup_amounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wallet_suggest_topup_amounts() TO authenticated;
