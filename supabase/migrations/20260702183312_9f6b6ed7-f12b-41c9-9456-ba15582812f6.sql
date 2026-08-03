
-- 1) Interest accrual columns on margin loans
ALTER TABLE public.sm_margin_loans
  ADD COLUMN IF NOT EXISTS annual_interest_rate NUMERIC(6,4) NOT NULL DEFAULT 0.12,
  ADD COLUMN IF NOT EXISTS last_interest_accrual_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2) Interest accrual ledger
CREATE TABLE IF NOT EXISTS public.sm_margin_interest_accruals (
  id                    BIGSERIAL PRIMARY KEY,
  loan_id               UUID NOT NULL REFERENCES public.sm_margin_loans(id) ON DELETE CASCADE,
  accrual_date          DATE NOT NULL,
  daily_rate            NUMERIC(10,8) NOT NULL,
  principal_at_accrual  NUMERIC(18,2) NOT NULL,
  interest_amount       NUMERIC(18,2) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (loan_id, accrual_date)
);

GRANT SELECT ON public.sm_margin_interest_accruals TO authenticated;
GRANT ALL ON public.sm_margin_interest_accruals TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sm_margin_interest_accruals_id_seq TO authenticated, service_role;

ALTER TABLE public.sm_margin_interest_accruals ENABLE ROW LEVEL SECURITY;

CREATE POLICY sm_interest_owner_read ON public.sm_margin_interest_accruals
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sm_margin_loans ml
    JOIN public.sm_accounts a ON a.id = ml.account_id
    WHERE ml.id = sm_margin_interest_accruals.loan_id
      AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE INDEX IF NOT EXISTS idx_sm_interest_loan_date
  ON public.sm_margin_interest_accruals (loan_id, accrual_date DESC);

-- 3) Compute account value (cash + market value of holdings)
CREATE OR REPLACE FUNCTION public.sm_compute_account_value(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cash_value   NUMERIC := 0;
  shares_value NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(balance), 0) INTO cash_value
  FROM public.sm_wallets
  WHERE account_id = p_account_id AND wallet_type = 'trading_cash';

  SELECT COALESCE(SUM(ct.shares_held * l.reference_price), 0) INTO shares_value
  FROM public.sm_cap_table ct
  JOIN public.sm_listings l ON l.id = ct.listing_id
  WHERE ct.account_id = p_account_id;

  RETURN cash_value + shares_value;
END;
$$;

-- 4) Evaluate margin loan (healthy / margin_call / liquidating) with liquidation size formula
CREATE OR REPLACE FUNCTION public.sm_evaluate_margin_loan(p_loan_id UUID)
RETURNS TABLE (new_status sm_margin_status, current_ratio NUMERIC, liquidation_amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loan RECORD;
  acct_value NUMERIC;
  ratio NUMERIC;
  target_ratio NUMERIC := 1.25;
  x_liquidate NUMERIC := 0;
  decided_status sm_margin_status;
BEGIN
  SELECT * INTO loan FROM public.sm_margin_loans WHERE id = p_loan_id FOR UPDATE;
  IF loan.id IS NULL THEN RETURN; END IF;

  acct_value := public.sm_compute_account_value(loan.account_id);
  ratio := CASE WHEN loan.outstanding_balance = 0 THEN NULL
                ELSE acct_value / loan.outstanding_balance END;

  INSERT INTO public.sm_margin_snapshots (loan_id, account_value, loan_balance)
  VALUES (p_loan_id, acct_value, loan.outstanding_balance);

  IF ratio IS NULL OR ratio >= loan.collateral_required_pct THEN
    decided_status := 'healthy';
  ELSIF ratio >= loan.maintenance_pct THEN
    decided_status := 'margin_call';
  ELSE
    decided_status := 'liquidating';
    x_liquidate := (acct_value - target_ratio * loan.outstanding_balance) / (1 - target_ratio);
    x_liquidate := GREATEST(x_liquidate, 0);
  END IF;

  UPDATE public.sm_margin_loans SET status = decided_status WHERE id = p_loan_id;

  RETURN QUERY SELECT decided_status, ratio, x_liquidate;
END;
$$;

-- 5) Trigger: re-evaluate margin loans of both trade counterparties
CREATE OR REPLACE FUNCTION public.sm_trg_reevaluate_margin_after_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_loan UUID;
BEGIN
  FOR affected_loan IN
    SELECT id FROM public.sm_margin_loans
    WHERE account_id IN (NEW.buyer_account_id, NEW.seller_account_id)
      AND status <> 'closed'
  LOOP
    PERFORM public.sm_evaluate_margin_loan(affected_loan);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sm_trade_reeval_margin ON public.sm_trades;
CREATE TRIGGER trg_sm_trade_reeval_margin
  AFTER INSERT ON public.sm_trades
  FOR EACH ROW EXECUTE FUNCTION public.sm_trg_reevaluate_margin_after_trade();

-- 6) Daily margin interest accrual (called by cron / worker)
CREATE OR REPLACE FUNCTION public.sm_accrue_daily_margin_interest()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loan RECORD;
  daily_rate NUMERIC;
  interest NUMERIC;
  cnt INTEGER := 0;
BEGIN
  FOR loan IN
    SELECT * FROM public.sm_margin_loans
    WHERE status IN ('healthy','margin_call')
  LOOP
    daily_rate := loan.annual_interest_rate / 365.0;
    interest := ROUND(loan.outstanding_balance * daily_rate, 2);

    INSERT INTO public.sm_margin_interest_accruals
      (loan_id, accrual_date, daily_rate, principal_at_accrual, interest_amount)
    VALUES (loan.id, CURRENT_DATE, daily_rate, loan.outstanding_balance, interest)
    ON CONFLICT (loan_id, accrual_date) DO NOTHING;

    UPDATE public.sm_margin_loans
       SET outstanding_balance = outstanding_balance + interest,
           last_interest_accrual_at = now()
     WHERE id = loan.id;

    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;

-- 7) Notify user on margin_call / liquidating status transitions
CREATE OR REPLACE FUNCTION public.sm_trg_notify_margin_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.status IN ('margin_call','liquidating')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN

    SELECT user_id INTO v_user_id FROM public.sm_accounts WHERE id = NEW.account_id;

    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        v_user_id,
        CASE WHEN NEW.status = 'margin_call' THEN 'margin_call' ELSE 'liquidation' END,
        CASE WHEN NEW.status = 'margin_call'
             THEN 'نداء هامش على قرضك'
             ELSE 'بدء تصفية إجبارية لقرضك' END,
        CASE WHEN NEW.status = 'margin_call'
             THEN 'اقتربت نسبة الهامش من الحد الأدنى. الرجاء إيداع أموال أو تقليل المراكز.'
             ELSE 'تم بدء تصفية إجبارية لأسهم لاستعادة تغطية القرض.' END,
        jsonb_build_object('loan_id', NEW.id, 'outstanding', NEW.outstanding_balance, 'status', NEW.status)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sm_margin_status_notify ON public.sm_margin_loans;
CREATE TRIGGER trg_sm_margin_status_notify
  AFTER UPDATE ON public.sm_margin_loans
  FOR EACH ROW EXECUTE FUNCTION public.sm_trg_notify_margin_status();

-- 8) Analytical materialized view: daily OHLCV + volatility per listing
DROP MATERIALIZED VIEW IF EXISTS public.mv_sm_project_daily_stats;
CREATE MATERIALIZED VIEW public.mv_sm_project_daily_stats AS
SELECT
  listing_id,
  date_trunc('day', executed_at)::date AS trading_day,
  MIN(price) AS low,
  MAX(price) AS high,
  (array_agg(price ORDER BY executed_at ASC))[1]  AS open,
  (array_agg(price ORDER BY executed_at DESC))[1] AS close,
  SUM(quantity) AS volume,
  STDDEV(price) AS volatility
FROM public.sm_trades
GROUP BY listing_id, date_trunc('day', executed_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_sm_daily
  ON public.mv_sm_project_daily_stats (listing_id, trading_day);

GRANT SELECT ON public.mv_sm_project_daily_stats TO anon, authenticated;
