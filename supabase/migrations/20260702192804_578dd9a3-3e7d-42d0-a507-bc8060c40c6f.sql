
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
  v_debit_ok BOOLEAN;
BEGIN
  SELECT * INTO v_order FROM public.service_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'invalid_status:%', v_order.status; END IF;

  SELECT user_id INTO v_provider_user FROM public.service_providers WHERE id = v_order.provider_id;
  IF v_provider_user IS NULL THEN RAISE EXCEPTION 'provider_not_found'; END IF;

  v_fee := ROUND(v_order.amount_sar * p_platform_fee_pct / 100.0, 2);
  v_net := v_order.amount_sar - v_fee;

  -- خصم من محفظة العميل عبر debit_wallet الذرّية
  v_debit_ok := public.debit_wallet(v_order.client_id, v_order.amount_sar, 'escrow_hold:' || p_order_id::text);
  IF NOT v_debit_ok THEN
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
  v_bal_before NUMERIC;
  v_bal_after NUMERIC;
BEGIN
  SELECT * INTO v_hold FROM public.escrow_holds WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hold_not_found'; END IF;
  IF v_hold.status <> 'held' THEN RAISE EXCEPTION 'invalid_status:%', v_hold.status; END IF;

  -- إضافة المبلغ الصافي لمحفظة المزود
  INSERT INTO public.wallets (user_id, balance, currency, status)
  VALUES (v_hold.provider_user_id, 0, 'SAR', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(balance,0) INTO v_bal_before FROM public.wallets WHERE user_id = v_hold.provider_user_id;
  v_bal_after := v_bal_before + v_hold.net_provider_sar;
  UPDATE public.wallets SET balance = v_bal_after, last_activity_at = now()
    WHERE user_id = v_hold.provider_user_id;

  INSERT INTO public.ledger (user_id, type, amount, reference, balance_before, balance_after, status, metadata)
  VALUES (
    v_hold.provider_user_id, 'escrow_release',
    (v_hold.net_provider_sar * 100)::BIGINT,
    'escrow_release:' || p_order_id::text,
    (v_bal_before * 100)::BIGINT, (v_bal_after * 100)::BIGINT,
    'completed',
    jsonb_build_object('order_id', p_order_id, 'net_sar', v_hold.net_provider_sar, 'fee_sar', v_hold.platform_fee_sar)
  );

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
  v_bal_before NUMERIC;
  v_bal_after NUMERIC;
BEGIN
  SELECT * INTO v_hold FROM public.escrow_holds WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hold_not_found'; END IF;
  IF v_hold.status <> 'held' THEN RAISE EXCEPTION 'invalid_status:%', v_hold.status; END IF;

  INSERT INTO public.wallets (user_id, balance, currency, status)
  VALUES (v_hold.client_id, 0, 'SAR', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(balance,0) INTO v_bal_before FROM public.wallets WHERE user_id = v_hold.client_id;
  v_bal_after := v_bal_before + v_hold.amount_sar;
  UPDATE public.wallets SET balance = v_bal_after, last_activity_at = now()
    WHERE user_id = v_hold.client_id;

  INSERT INTO public.ledger (user_id, type, amount, reference, balance_before, balance_after, status, metadata)
  VALUES (
    v_hold.client_id, 'escrow_refund',
    (v_hold.amount_sar * 100)::BIGINT,
    'escrow_refund:' || p_order_id::text,
    (v_bal_before * 100)::BIGINT, (v_bal_after * 100)::BIGINT,
    'completed',
    jsonb_build_object('order_id', p_order_id, 'reason', p_reason)
  );

  UPDATE public.escrow_holds SET status='refunded', refunded_at=now() WHERE id = v_hold.id;
  UPDATE public.service_orders SET status='refunded', cancelled_at=now() WHERE id = p_order_id;
  RETURN TRUE;
END $$;

REVOKE ALL ON FUNCTION public.escrow_hold_for_order(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.escrow_release_for_order(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.escrow_refund_for_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escrow_hold_for_order(UUID, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.escrow_release_for_order(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.escrow_refund_for_order(UUID, TEXT) TO authenticated, service_role;
