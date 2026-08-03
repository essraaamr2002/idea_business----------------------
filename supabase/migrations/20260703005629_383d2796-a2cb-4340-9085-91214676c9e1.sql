
-- 1) Financing requests table
DO $$ BEGIN
  CREATE TYPE public.sm_financing_status AS ENUM ('pending','auto_rejected','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.sm_financing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.sm_accounts(id) ON DELETE SET NULL,
  deposit_amount numeric(18,2) NOT NULL CHECK (deposit_amount > 0),
  requested_loan numeric(18,2) NOT NULL CHECK (requested_loan > 0),
  leverage_pct numeric(6,4) NOT NULL DEFAULT 1.40,
  status public.sm_financing_status NOT NULL DEFAULT 'pending',
  auto_reasons text[] NOT NULL DEFAULT '{}',
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sm_fin_req_user_idx ON public.sm_financing_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sm_fin_req_status_idx ON public.sm_financing_requests(status, created_at DESC);

GRANT SELECT, INSERT ON public.sm_financing_requests TO authenticated;
GRANT ALL ON public.sm_financing_requests TO service_role;

ALTER TABLE public.sm_financing_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fin_req_own_read" ON public.sm_financing_requests;
CREATE POLICY "fin_req_own_read" ON public.sm_financing_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "fin_req_own_insert" ON public.sm_financing_requests;
CREATE POLICY "fin_req_own_insert" ON public.sm_financing_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "fin_req_admin_update" ON public.sm_financing_requests;
CREATE POLICY "fin_req_admin_update" ON public.sm_financing_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.sm_fin_req_touch() RETURNS trigger
  LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_sm_fin_req_touch ON public.sm_financing_requests;
CREATE TRIGGER trg_sm_fin_req_touch BEFORE UPDATE ON public.sm_financing_requests
  FOR EACH ROW EXECUTE FUNCTION public.sm_fin_req_touch();

-- 2) Safe withdraw RPC: only surplus above collateral requirement is withdrawable
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
    FROM sm_wallets WHERE account_id = v_acc AND wallet_type = 'cash';

  SELECT COALESCE(SUM(outstanding_balance),0) INTO v_loan_outstanding
    FROM sm_margin_loans WHERE account_id = v_acc AND status <> 'closed';

  -- required collateral = 140% of outstanding loans (default req; per-loan may vary)
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
    WHERE account_id = v_acc AND wallet_type = 'cash';

  INSERT INTO sm_wallet_ledger(wallet_id, entry_type, amount, currency, ref_type, ref_id, memo)
    SELECT id, 'withdrawal_hold', -_amount, currency, 'withdraw','manual','Cash withdrawal (surplus)'
    FROM sm_wallets WHERE account_id = v_acc AND wallet_type = 'cash';

  RETURN jsonb_build_object(
    'ok', true,
    'withdrawn', _amount,
    'new_cash', v_cash - _amount,
    'remaining_surplus', v_surplus - _amount
  );
END $$;

REVOKE ALL ON FUNCTION public.sm_request_withdraw_cash(numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sm_request_withdraw_cash(numeric) TO authenticated;
