
CREATE OR REPLACE FUNCTION public.sm_request_withdraw_cash(_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_acc uuid;
  v_cash numeric := 0;
  v_loan_outstanding numeric := 0;
  v_required_collateral numeric := 0;
  v_surplus numeric := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;

  SELECT id INTO v_acc FROM sm_accounts WHERE user_id = v_uid;
  IF v_acc IS NULL THEN RAISE EXCEPTION 'no_account'; END IF;

  SELECT COALESCE(SUM(balance),0) INTO v_cash
    FROM sm_wallets WHERE account_id = v_acc AND wallet_type = 'trading_cash';

  SELECT COALESCE(SUM(outstanding_balance),0) INTO v_loan_outstanding
    FROM sm_margin_loans WHERE account_id = v_acc AND status <> 'closed';

  SELECT COALESCE(SUM(outstanding_balance * collateral_required_pct),0)
    INTO v_required_collateral
    FROM sm_margin_loans WHERE account_id = v_acc AND status <> 'closed';

  v_surplus := GREATEST(v_cash - v_required_collateral, 0);

  IF _amount > v_surplus THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'exceeds_surplus',
      'cash', v_cash,
      'outstanding_loan', v_loan_outstanding,
      'required_collateral', v_required_collateral,
      'withdrawable_surplus', v_surplus
    );
  END IF;

  UPDATE sm_wallets SET balance = balance - _amount, updated_at = now()
    WHERE account_id = v_acc AND wallet_type = 'trading_cash';

  INSERT INTO sm_wallet_ledger(wallet_id, entry_type, amount, currency, ref_type, ref_id, memo)
    SELECT id, 'withdrawal_hold', -_amount, currency, 'withdraw','manual','Cash withdrawal (surplus)'
    FROM sm_wallets WHERE account_id = v_acc AND wallet_type = 'trading_cash';

  RETURN jsonb_build_object(
    'ok', true,
    'withdrawn', _amount,
    'new_cash', v_cash - _amount,
    'remaining_surplus', v_surplus - _amount
  );
END $$;
