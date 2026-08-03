
CREATE OR REPLACE FUNCTION public.charge_commission(p_user_id uuid, p_base_amount numeric, p_source_type text, p_source_id uuid, p_currency text DEFAULT 'SAR'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  fee numeric := round((p_base_amount * 0.15)::numeric, 2);
  bal numeric;
BEGIN
  IF fee <= 0 THEN RETURN 0; END IF;
  SELECT balance INTO bal FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF bal IS NULL THEN RETURN 0; END IF;
  IF bal < fee THEN fee := bal; END IF;
  IF fee <= 0 THEN RETURN 0; END IF;
  UPDATE public.wallets SET balance = balance - fee WHERE user_id = p_user_id;
  INSERT INTO public.ledger(user_id, amount, type, reference, balance_before, balance_after)
    VALUES (p_user_id, -fee, 'commission', p_source_type||':'||COALESCE(p_source_id::text,''), bal, bal - fee);
  INSERT INTO public.commission_ledger(source_type, source_id, payer_id, amount, currency)
    VALUES (p_source_type, p_source_id, p_user_id, fee, COALESCE(p_currency,'SAR'));
  RETURN fee;
END $function$;

CREATE OR REPLACE FUNCTION public.buy_shares(_project_id uuid, _shares integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _price numeric; _available integer; _status project_status;
  _total numeric; _balance numeric; _order_id uuid; _owner uuid; _buyer_fee numeric;
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
  _buyer_fee := round((_total * 0.15)::numeric, 2);

  SELECT balance INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND OR _balance < (_total + _buyer_fee) THEN RAISE EXCEPTION 'Insufficient wallet balance (includes 15%% platform fee)'; END IF;

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

  IF _owner IS NOT NULL AND _owner <> _uid THEN
    PERFORM public.charge_commission(_owner, _total, 'share_trade', _order_id, 'SAR');
  END IF;

  RETURN _order_id;
END $function$;
