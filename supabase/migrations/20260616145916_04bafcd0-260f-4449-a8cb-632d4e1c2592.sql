
-- Ledger (used by /wallet)
CREATE TABLE public.ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount bigint NOT NULL,
  type text NOT NULL,
  reference text,
  status text NOT NULL DEFAULT 'completed',
  balance_before bigint NOT NULL DEFAULT 0,
  balance_after bigint NOT NULL DEFAULT 0,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_user_created ON public.ledger(user_id, created_at DESC);
GRANT SELECT ON public.ledger TO authenticated;
GRANT ALL ON public.ledger TO service_role;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY ledger_self_read ON public.ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Wallet RPCs (service-role only)
CREATE OR REPLACE FUNCTION public.wallet_deposit(p_user_id uuid, p_amount_minor bigint, p_reference text)
RETURNS public.wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.wallets; bal_before bigint;
BEGIN
  IF p_amount_minor <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  INSERT INTO public.wallets (user_id, virtual_iban) VALUES (p_user_id, 'IDEA' || gen_random_uuid()::text) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO bal_before FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  UPDATE public.wallets SET balance = balance + p_amount_minor WHERE user_id = p_user_id RETURNING * INTO w;
  INSERT INTO public.ledger (user_id, amount, type, reference, balance_before, balance_after)
  VALUES (p_user_id, p_amount_minor, 'deposit', p_reference, bal_before, w.balance);
  RETURN w;
END $$;
REVOKE EXECUTE ON FUNCTION public.wallet_deposit(uuid, bigint, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.wallet_transfer(p_from_user uuid, p_to_user uuid, p_amount_minor bigint, p_reference text, p_type text)
RETURNS public.wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w_from public.wallets; w_to public.wallets; bal_from_before bigint; bal_to_before bigint;
BEGIN
  IF p_amount_minor <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF p_from_user = p_to_user THEN RAISE EXCEPTION 'cannot transfer to self'; END IF;
  INSERT INTO public.wallets (user_id, virtual_iban) VALUES (p_to_user, 'IDEA' || gen_random_uuid()::text) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO bal_from_before FROM public.wallets WHERE user_id = p_from_user FOR UPDATE;
  IF bal_from_before IS NULL OR bal_from_before < p_amount_minor THEN RAISE EXCEPTION 'insufficient funds'; END IF;
  SELECT balance INTO bal_to_before FROM public.wallets WHERE user_id = p_to_user FOR UPDATE;
  UPDATE public.wallets SET balance = balance - p_amount_minor WHERE user_id = p_from_user RETURNING * INTO w_from;
  UPDATE public.wallets SET balance = balance + p_amount_minor WHERE user_id = p_to_user RETURNING * INTO w_to;
  INSERT INTO public.ledger (user_id, counterparty_id, amount, type, reference, balance_before, balance_after)
  VALUES (p_from_user, p_to_user, -p_amount_minor, p_type, p_reference, bal_from_before, w_from.balance);
  INSERT INTO public.ledger (user_id, counterparty_id, amount, type, reference, balance_before, balance_after)
  VALUES (p_to_user, p_from_user, p_amount_minor, p_type, p_reference, bal_to_before, w_to.balance);
  RETURN w_from;
END $$;
REVOKE EXECUTE ON FUNCTION public.wallet_transfer(uuid, uuid, bigint, text, text) FROM PUBLIC, anon, authenticated;

-- Community portals (used by /community)
CREATE TABLE public.community_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  package text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'published',
  votes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_portals_status_votes ON public.community_portals(status, votes_count DESC);
GRANT SELECT ON public.community_portals TO anon, authenticated;
GRANT INSERT, UPDATE ON public.community_portals TO authenticated;
GRANT ALL ON public.community_portals TO service_role;
ALTER TABLE public.community_portals ENABLE ROW LEVEL SECURITY;
CREATE POLICY portals_read ON public.community_portals FOR SELECT USING (status = 'published' OR auth.uid() = user_id);
CREATE POLICY portals_insert ON public.community_portals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY portals_update ON public.community_portals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.portal_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL REFERENCES public.community_portals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portal_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.portal_votes TO authenticated;
GRANT ALL ON public.portal_votes TO service_role;
ALTER TABLE public.portal_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY votes_self_read ON public.portal_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY votes_self_insert ON public.portal_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY votes_self_delete ON public.portal_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sync portal vote counter
CREATE OR REPLACE FUNCTION public.sync_portal_votes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_portals SET votes_count = votes_count + 1 WHERE id = NEW.portal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_portals SET votes_count = GREATEST(0, votes_count - 1) WHERE id = OLD.portal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_portal_votes_count() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_portal_votes_count
AFTER INSERT OR DELETE ON public.portal_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_portal_votes_count();

-- Protect privileged columns on community_portals
CREATE OR REPLACE FUNCTION public.protect_community_portals_cols()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_service boolean := current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role';
BEGIN
  IF TG_OP = 'INSERT' AND NOT is_service THEN
    NEW.votes_count := 0;
    NEW.status := COALESCE(NEW.status, 'published');
  ELSIF TG_OP = 'UPDATE' AND NOT is_service THEN
    NEW.votes_count := OLD.votes_count;
    NEW.status := OLD.status;
    NEW.package := OLD.package;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.protect_community_portals_cols() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_protect_portals_ins BEFORE INSERT ON public.community_portals
FOR EACH ROW EXECUTE FUNCTION public.protect_community_portals_cols();
CREATE TRIGGER trg_protect_portals_upd BEFORE UPDATE ON public.community_portals
FOR EACH ROW EXECUTE FUNCTION public.protect_community_portals_cols();
