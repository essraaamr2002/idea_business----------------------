
-- =========================================================
-- 1) Extend profiles with membership fields
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz;

-- =========================================================
-- 2) Extend ledger with metadata + unique deposit guard
-- =========================================================
ALTER TABLE public.ledger
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_deposit_order
  ON public.ledger ((metadata->>'order_id'))
  WHERE type = 'deposit' AND (metadata ? 'order_id');

-- =========================================================
-- 3) projects
-- =========================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  share_price bigint NOT NULL CHECK (share_price > 0),
  total_shares integer NOT NULL CHECK (total_shares > 0),
  shares_sold integer NOT NULL DEFAULT 0 CHECK (shares_sold >= 0),
  currency text NOT NULL DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT ON public.projects TO anon;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects readable by all" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Owner inserts own project" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner updates own project" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner deletes own project" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- 4) project_shares (writes via finalize_payment_success only)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.project_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shares integer NOT NULL CHECK (shares > 0),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  order_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_shares TO authenticated;
GRANT ALL ON public.project_shares TO service_role;
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Investor sees own shares" ON public.project_shares
  FOR SELECT TO authenticated USING (auth.uid() = investor_id);
CREATE POLICY "Owner sees shares in own project" ON public.project_shares
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

-- =========================================================
-- 5) disputes
-- =========================================================
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opener_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  against_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  reason text NOT NULL,
  fee_paid boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties see own disputes" ON public.disputes
  FOR SELECT TO authenticated
  USING (auth.uid() = opener_id OR auth.uid() = against_id);
CREATE POLICY "Authenticated opens dispute" ON public.disputes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = opener_id);
CREATE TRIGGER trg_disputes_updated_at BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- 6) payment_intents
-- =========================================================
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('wallet_topup','subscription','dispute_fee','investment')),
  amount bigint NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed','cancelled')),
  provider text NOT NULL DEFAULT 'fatora',
  transaction_id text,
  related_id uuid,           -- project_id or dispute_id depending on purpose
  shares integer,            -- only for investment
  subscription_days integer, -- only for subscription
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_intents TO authenticated;
GRANT ALL ON public.payment_intents TO service_role;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own intents" ON public.payment_intents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_payment_intents_updated_at BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- 7) finalize_payment_success — atomic, idempotent
-- =========================================================
CREATE OR REPLACE FUNCTION public.finalize_payment_success(
  _order_id        text,
  _provider_txn_id text  DEFAULT NULL,
  _raw             jsonb DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pi public.payment_intents%ROWTYPE;
  _project public.projects%ROWTYPE;
  _ref text;
  _sender_wallet public.wallets%ROWTYPE;
  _receiver_wallet public.wallets%ROWTYPE;
  _first uuid; _second uuid;
BEGIN
  -- Lock the intent row (race-safe vs duplicate webhooks)
  SELECT * INTO _pi
    FROM public.payment_intents
    WHERE order_id = _order_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown order %', _order_id;
  END IF;

  IF _pi.status <> 'pending' THEN
    RETURN 'already_final';
  END IF;

  _ref := 'order:' || _order_id;

  -- ===== wallet_topup =====
  IF _pi.purpose = 'wallet_topup' THEN
    -- Ensure wallet exists + lock
    INSERT INTO public.wallets (user_id, balance) VALUES (_pi.user_id, 0)
      ON CONFLICT (user_id) DO NOTHING;
    PERFORM 1 FROM public.wallets WHERE user_id = _pi.user_id FOR UPDATE;

    UPDATE public.wallets SET balance = balance + _pi.amount
      WHERE user_id = _pi.user_id;

    INSERT INTO public.ledger
      (user_id, wallet_id, amount, type, reference, status,
       balance_before, balance_after, metadata)
    SELECT w.user_id, w.id, _pi.amount, 'deposit', _ref, 'completed',
           w.balance - _pi.amount, w.balance,
           jsonb_build_object('provider', _pi.provider,
                              'order_id', _order_id,
                              'provider_txn_id', _provider_txn_id)
      FROM public.wallets w WHERE w.user_id = _pi.user_id;

  -- ===== subscription =====
  ELSIF _pi.purpose = 'subscription' THEN
    UPDATE public.profiles
       SET membership = 'full',
           membership_expires_at = GREATEST(now(), COALESCE(membership_expires_at, now()))
                                   + make_interval(days => COALESCE(_pi.subscription_days, 30))
     WHERE id = _pi.user_id;

    -- Log fee in ledger (no balance impact on wallet; fee paid via provider directly)
    INSERT INTO public.wallets (user_id, balance) VALUES (_pi.user_id, 0)
      ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.ledger
      (user_id, wallet_id, amount, type, reference, status,
       balance_before, balance_after, metadata)
    SELECT w.user_id, w.id, 0, 'membership_fee', _ref, 'completed',
           w.balance, w.balance,
           jsonb_build_object('provider', _pi.provider,
                              'order_id', _order_id,
                              'amount_paid', _pi.amount,
                              'days', COALESCE(_pi.subscription_days, 30),
                              'provider_txn_id', _provider_txn_id)
      FROM public.wallets w WHERE w.user_id = _pi.user_id;

  -- ===== dispute_fee =====
  ELSIF _pi.purpose = 'dispute_fee' THEN
    IF _pi.related_id IS NULL THEN
      RAISE EXCEPTION 'dispute_fee requires related_id';
    END IF;

    UPDATE public.disputes
       SET fee_paid = true
     WHERE id = _pi.related_id;

    INSERT INTO public.wallets (user_id, balance) VALUES (_pi.user_id, 0)
      ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.ledger
      (user_id, wallet_id, amount, type, reference, status,
       balance_before, balance_after, metadata)
    SELECT w.user_id, w.id, 0, 'dispute_fee', _ref, 'completed',
           w.balance, w.balance,
           jsonb_build_object('provider', _pi.provider,
                              'order_id', _order_id,
                              'amount_paid', _pi.amount,
                              'dispute_id', _pi.related_id,
                              'provider_txn_id', _provider_txn_id)
      FROM public.wallets w WHERE w.user_id = _pi.user_id;

  -- ===== investment =====
  ELSIF _pi.purpose = 'investment' THEN
    IF _pi.related_id IS NULL OR _pi.shares IS NULL THEN
      RAISE EXCEPTION 'investment requires related_id (project_id) and shares';
    END IF;

    SELECT * INTO _project FROM public.projects
      WHERE id = _pi.related_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'project % not found', _pi.related_id;
    END IF;

    IF _project.shares_sold + _pi.shares > _project.total_shares THEN
      RAISE EXCEPTION 'INSUFFICIENT_SHARES';
    END IF;
    IF _project.owner_id = _pi.user_id THEN
      RAISE EXCEPTION 'CANNOT_INVEST_IN_OWN_PROJECT';
    END IF;

    -- Ensure both wallets exist + lock in deterministic order
    INSERT INTO public.wallets (user_id, balance) VALUES (_pi.user_id, 0)
      ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.wallets (user_id, balance) VALUES (_project.owner_id, 0)
      ON CONFLICT (user_id) DO NOTHING;

    IF _pi.user_id < _project.owner_id THEN
      _first := _pi.user_id; _second := _project.owner_id;
    ELSE
      _first := _project.owner_id; _second := _pi.user_id;
    END IF;
    PERFORM 1 FROM public.wallets WHERE user_id = _first FOR UPDATE;
    PERFORM 1 FROM public.wallets WHERE user_id = _second FOR UPDATE;

    -- Credit investor with the paid amount (so transfer can debit it)
    SELECT * INTO _sender_wallet FROM public.wallets WHERE user_id = _pi.user_id;
    UPDATE public.wallets SET balance = _sender_wallet.balance + _pi.amount WHERE id = _sender_wallet.id;

    INSERT INTO public.ledger
      (user_id, wallet_id, amount, type, reference, status,
       balance_before, balance_after, metadata)
    VALUES (_pi.user_id, _sender_wallet.id, _pi.amount, 'deposit', _ref, 'completed',
            _sender_wallet.balance, _sender_wallet.balance + _pi.amount,
            jsonb_build_object('provider', _pi.provider, 'order_id', _order_id,
                               'provider_txn_id', _provider_txn_id,
                               'note', 'investment_funding'));

    -- Debit investor, credit project owner (investment leg)
    SELECT * INTO _sender_wallet FROM public.wallets WHERE user_id = _pi.user_id;
    SELECT * INTO _receiver_wallet FROM public.wallets WHERE user_id = _project.owner_id;

    UPDATE public.wallets SET balance = _sender_wallet.balance - _pi.amount WHERE id = _sender_wallet.id;
    INSERT INTO public.ledger
      (user_id, wallet_id, amount, type, reference, status,
       balance_before, balance_after, counterparty_id, metadata)
    VALUES (_pi.user_id, _sender_wallet.id, -_pi.amount, 'investment', _ref || ':inv', 'completed',
            _sender_wallet.balance, _sender_wallet.balance - _pi.amount, _project.owner_id,
            jsonb_build_object('project_id', _project.id, 'shares', _pi.shares));

    UPDATE public.wallets SET balance = _receiver_wallet.balance + _pi.amount WHERE id = _receiver_wallet.id;
    INSERT INTO public.ledger
      (user_id, wallet_id, amount, type, reference, status,
       balance_before, balance_after, counterparty_id, metadata)
    VALUES (_project.owner_id, _receiver_wallet.id, _pi.amount, 'investment', _ref || ':inv', 'completed',
            _receiver_wallet.balance, _receiver_wallet.balance + _pi.amount, _pi.user_id,
            jsonb_build_object('project_id', _project.id, 'shares', _pi.shares));

    -- Record shares + update project
    INSERT INTO public.project_shares (project_id, investor_id, shares, amount_minor, order_id)
    VALUES (_project.id, _pi.user_id, _pi.shares, _pi.amount, _order_id);

    UPDATE public.projects
       SET shares_sold = shares_sold + _pi.shares
     WHERE id = _project.id;
  END IF;

  -- Mark intent succeeded
  UPDATE public.payment_intents
     SET status         = 'succeeded',
         transaction_id = _provider_txn_id,
         metadata       = COALESCE(_raw, metadata),
         updated_at     = now()
   WHERE id = _pi.id;

  RETURN 'processed';
END $$;

REVOKE EXECUTE ON FUNCTION public.finalize_payment_success(text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_payment_success(text, text, jsonb)
  TO service_role;
