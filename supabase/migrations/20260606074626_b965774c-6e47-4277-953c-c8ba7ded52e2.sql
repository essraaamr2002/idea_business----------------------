
-- Wallets table
CREATE TABLE public.wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Ledger table (double-entry)
CREATE TABLE public.ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  type text NOT NULL,
  reference text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  balance_before bigint NOT NULL,
  balance_after bigint NOT NULL,
  counterparty_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT amount_non_zero CHECK (amount <> 0),
  CONSTRAINT type_allowed CHECK (type IN ('deposit','investment','share_trade','subscription','escrow','withdrawal','refund'))
);

-- Unique reference per side (deposit single; transfer two rows differ by sign)
CREATE UNIQUE INDEX ledger_reference_signed_uidx
  ON public.ledger (reference, (sign(amount)));

CREATE INDEX ledger_user_created_idx ON public.ledger (user_id, created_at DESC);

GRANT SELECT ON public.ledger TO authenticated;
GRANT ALL ON public.ledger TO service_role;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ledger" ON public.ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER wallets_set_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ DEPOSIT FUNCTION ============
CREATE OR REPLACE FUNCTION public.wallet_deposit(
  p_user_id uuid,
  p_amount_minor bigint,
  p_reference text
)
RETURNS public.ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_existing public.ledger%ROWTYPE;
  v_ledger public.ledger%ROWTYPE;
  v_before bigint;
BEGIN
  IF p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: amount must be positive';
  END IF;

  -- Idempotency: return existing deposit
  SELECT * INTO v_existing FROM public.ledger
    WHERE reference = p_reference AND amount > 0 AND type = 'deposit'
    LIMIT 1;
  IF FOUND THEN RETURN v_existing; END IF;

  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id, balance) VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

  -- Lock the wallet row
  SELECT * INTO v_wallet FROM public.wallets
    WHERE user_id = p_user_id FOR UPDATE;

  v_before := v_wallet.balance;

  UPDATE public.wallets SET balance = v_before + p_amount_minor
    WHERE id = v_wallet.id;

  INSERT INTO public.ledger
    (user_id, wallet_id, amount, type, reference, status, balance_before, balance_after)
  VALUES
    (p_user_id, v_wallet.id, p_amount_minor, 'deposit', p_reference, 'completed', v_before, v_before + p_amount_minor)
  RETURNING * INTO v_ledger;

  RETURN v_ledger;
END $$;

REVOKE ALL ON FUNCTION public.wallet_deposit(uuid, bigint, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_deposit(uuid, bigint, text) TO service_role;

-- ============ TRANSFER FUNCTION ============
CREATE OR REPLACE FUNCTION public.wallet_transfer(
  p_from_user uuid,
  p_to_user uuid,
  p_amount_minor bigint,
  p_reference text,
  p_type text
)
RETURNS TABLE(debit_id uuid, credit_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender public.wallets%ROWTYPE;
  v_receiver public.wallets%ROWTYPE;
  v_debit public.ledger%ROWTYPE;
  v_credit public.ledger%ROWTYPE;
  v_existing_debit public.ledger%ROWTYPE;
  v_existing_credit public.ledger%ROWTYPE;
  v_first_user uuid;
  v_second_user uuid;
BEGIN
  IF p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: amount must be positive';
  END IF;
  IF p_from_user = p_to_user THEN
    RAISE EXCEPTION 'SAME_WALLET: cannot transfer to self';
  END IF;
  IF p_type NOT IN ('investment','share_trade','subscription','escrow') THEN
    RAISE EXCEPTION 'INVALID_TYPE: %', p_type;
  END IF;

  -- Idempotency
  SELECT * INTO v_existing_debit FROM public.ledger
    WHERE reference = p_reference AND amount < 0 LIMIT 1;
  IF FOUND THEN
    SELECT * INTO v_existing_credit FROM public.ledger
      WHERE reference = p_reference AND amount > 0 LIMIT 1;
    debit_id := v_existing_debit.id;
    credit_id := v_existing_credit.id;
    RETURN NEXT; RETURN;
  END IF;

  -- Ensure both wallets exist
  INSERT INTO public.wallets (user_id, balance) VALUES (p_from_user, 0)
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.wallets (user_id, balance) VALUES (p_to_user, 0)
    ON CONFLICT (user_id) DO NOTHING;

  -- Lock in deterministic order to prevent deadlock
  IF p_from_user < p_to_user THEN
    v_first_user := p_from_user; v_second_user := p_to_user;
  ELSE
    v_first_user := p_to_user; v_second_user := p_from_user;
  END IF;

  PERFORM 1 FROM public.wallets WHERE user_id = v_first_user FOR UPDATE;
  PERFORM 1 FROM public.wallets WHERE user_id = v_second_user FOR UPDATE;

  SELECT * INTO v_sender FROM public.wallets WHERE user_id = p_from_user;
  SELECT * INTO v_receiver FROM public.wallets WHERE user_id = p_to_user;

  IF v_sender.balance < p_amount_minor THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;

  -- Debit sender
  UPDATE public.wallets SET balance = v_sender.balance - p_amount_minor WHERE id = v_sender.id;
  INSERT INTO public.ledger
    (user_id, wallet_id, amount, type, reference, status, balance_before, balance_after, counterparty_id)
  VALUES
    (p_from_user, v_sender.id, -p_amount_minor, p_type, p_reference, 'completed',
     v_sender.balance, v_sender.balance - p_amount_minor, p_to_user)
  RETURNING * INTO v_debit;

  -- Credit receiver
  UPDATE public.wallets SET balance = v_receiver.balance + p_amount_minor WHERE id = v_receiver.id;
  INSERT INTO public.ledger
    (user_id, wallet_id, amount, type, reference, status, balance_before, balance_after, counterparty_id)
  VALUES
    (p_to_user, v_receiver.id, p_amount_minor, p_type, p_reference, 'completed',
     v_receiver.balance, v_receiver.balance + p_amount_minor, p_from_user)
  RETURNING * INTO v_credit;

  debit_id := v_debit.id;
  credit_id := v_credit.id;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.wallet_transfer(uuid, uuid, bigint, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_transfer(uuid, uuid, bigint, text, text) TO service_role;

-- Profile auto-create on signup (so transfers can find users)
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
