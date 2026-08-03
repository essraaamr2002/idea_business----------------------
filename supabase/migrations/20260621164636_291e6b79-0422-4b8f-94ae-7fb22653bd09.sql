
-- 1) Hide phone/whatsapp columns from public SELECT on projects
REVOKE SELECT (phone, whatsapp) ON public.projects FROM anon, authenticated;
-- Owner/admin can still read via get_project_contact RPC (security definer)

-- 2) Server-side atomic buy_shares RPC
CREATE OR REPLACE FUNCTION public.buy_shares(_project_id uuid, _shares integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _price numeric;
  _available integer;
  _status project_status;
  _total numeric;
  _balance numeric;
  _order_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '28000';
  END IF;
  IF _shares IS NULL OR _shares < 1 THEN
    RAISE EXCEPTION 'Invalid share count';
  END IF;

  -- Lock project row and read authoritative price
  SELECT current_price, (shares_total - shares_sold), status
    INTO _price, _available, _status
    FROM public.projects
    WHERE id = _project_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  IF _status <> 'active' THEN
    RAISE EXCEPTION 'Project not available for trading';
  END IF;
  IF _shares > _available THEN
    RAISE EXCEPTION 'Not enough shares available';
  END IF;

  _total := _price * _shares;

  -- Lock wallet and check balance
  SELECT balance INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND OR _balance < _total THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Debit wallet
  UPDATE public.wallets SET balance = balance - _total WHERE user_id = _uid;

  -- Increment shares sold
  UPDATE public.projects SET shares_sold = shares_sold + _shares WHERE id = _project_id;

  -- Upsert project_shares holding
  INSERT INTO public.project_shares (project_id, user_id, shares)
    VALUES (_project_id, _uid, _shares)
    ON CONFLICT (project_id, user_id) DO UPDATE
      SET shares = public.project_shares.shares + EXCLUDED.shares;

  -- Insert filled order at server-verified price
  INSERT INTO public.share_orders (project_id, user_id, side, shares, price, filled, status)
    VALUES (_project_id, _uid, 'buy', _shares, _price, _shares, 'filled')
    RETURNING id INTO _order_id;

  -- Ledger entry (best-effort: ignore if schema mismatch)
  BEGIN
    INSERT INTO public.ledger (user_id, amount, currency, kind, ref_type, ref_id, description)
      VALUES (_uid, -_total, (SELECT currency FROM public.wallets WHERE user_id = _uid), 'share_buy', 'share_order', _order_id, 'Buy ' || _shares || ' shares');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.buy_shares(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_shares(uuid, integer) TO authenticated;
