
-- 1) Atomic wallet debit
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id UUID, p_amount NUMERIC, p_reference TEXT DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_balance NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  UPDATE public.wallets SET balance = balance - p_amount, updated_at = now()
   WHERE user_id = p_user_id AND balance >= p_amount
  RETURNING balance INTO new_balance;
  IF new_balance IS NULL THEN RAISE EXCEPTION 'insufficient_funds'; END IF;
  BEGIN
    INSERT INTO public.ledger (user_id, direction, amount, reason, created_at)
    VALUES (p_user_id, 'debit', p_amount, COALESCE(p_reference,'debit'), now());
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN new_balance;
END $$;
REVOKE EXECUTE ON FUNCTION public.debit_wallet(UUID,NUMERIC,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debit_wallet(UUID,NUMERIC,TEXT) TO service_role;

-- 2) Market audit log
CREATE TABLE IF NOT EXISTS public.sm_market_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, action TEXT NOT NULL, listing_id UUID,
  success BOOLEAN NOT NULL DEFAULT true, reason TEXT,
  metadata JSONB, ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sm_audit_user_time ON public.sm_market_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sm_audit_action_time ON public.sm_market_audit_log(action, created_at DESC);
GRANT SELECT ON public.sm_market_audit_log TO authenticated;
GRANT ALL ON public.sm_market_audit_log TO service_role;
ALTER TABLE public.sm_market_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user sees own audit" ON public.sm_market_audit_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin sees all audit" ON public.sm_market_audit_log FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

-- 3) Withdraw lock
ALTER TABLE public.sm_wallets ADD COLUMN IF NOT EXISTS withdraw_locked BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.sm_sync_withdraw_lock() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_open BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.sm_margin_loans
     WHERE account_id = COALESCE(NEW.account_id, OLD.account_id)
       AND status <> 'closed') INTO has_open;
  UPDATE public.sm_wallets SET withdraw_locked = has_open
   WHERE account_id = COALESCE(NEW.account_id, OLD.account_id)
     AND wallet_type = 'trading_cash';
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sm_sync_withdraw_lock() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sm_sync_withdraw_lock ON public.sm_margin_loans;
CREATE TRIGGER trg_sm_sync_withdraw_lock
AFTER INSERT OR UPDATE OF status OR DELETE ON public.sm_margin_loans
FOR EACH ROW EXECUTE FUNCTION public.sm_sync_withdraw_lock();

-- 4) Financed position
CREATE OR REPLACE FUNCTION public.sm_open_financed_position(
  p_user_id UUID, p_listing_id UUID, p_shares INTEGER,
  p_limit_price NUMERIC, p_loan_amount NUMERIC
) RETURNS TABLE (loan_id UUID, order_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_acc_id UUID; v_kyc public.sm_kyc_tier; v_cap NUMERIC;
  v_bal NUMERIC; v_needed_collateral NUMERIC; v_order_value NUMERIC;
  v_loan_id UUID; v_order_id UUID;
BEGIN
  IF p_shares <= 0 OR p_limit_price <= 0 OR p_loan_amount < 0 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  SELECT id, kyc_tier, max_investment_cap INTO v_acc_id, v_kyc, v_cap
    FROM public.sm_accounts WHERE user_id = p_user_id;
  IF v_acc_id IS NULL THEN RAISE EXCEPTION 'no_market_account'; END IF;
  IF v_kyc = 'unverified' THEN RAISE EXCEPTION 'kyc_required'; END IF;
  v_order_value := p_limit_price * p_shares;
  IF v_order_value > v_cap THEN RAISE EXCEPTION 'exceeds_kyc_cap'; END IF;
  v_needed_collateral := p_loan_amount * 1.4;
  SELECT balance INTO v_bal FROM public.sm_wallets
    WHERE account_id = v_acc_id AND wallet_type = 'trading_cash' FOR UPDATE;
  IF v_bal IS NULL THEN RAISE EXCEPTION 'no_trading_wallet'; END IF;
  IF v_bal < v_needed_collateral THEN RAISE EXCEPTION 'insufficient_collateral'; END IF;
  IF v_bal + p_loan_amount < v_order_value THEN RAISE EXCEPTION 'insufficient_buying_power'; END IF;
  IF p_loan_amount > 0 THEN
    INSERT INTO public.sm_margin_loans(account_id, principal_amount, outstanding_balance)
    VALUES (v_acc_id, p_loan_amount, p_loan_amount) RETURNING id INTO v_loan_id;
  END IF;
  INSERT INTO public.sm_orders(listing_id, account_id, side, type, price, quantity, remaining)
  VALUES (p_listing_id, v_acc_id, 'BUY', 'LIMIT', p_limit_price, p_shares, p_shares)
  RETURNING id INTO v_order_id;
  RETURN QUERY SELECT v_loan_id, v_order_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.sm_open_financed_position(UUID,UUID,INTEGER,NUMERIC,NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sm_open_financed_position(UUID,UUID,INTEGER,NUMERIC,NUMERIC) TO service_role;

-- 5) Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sm_trades; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sm_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sm_margin_snapshots; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
