
-- Core schema needed by current app routes (index, auth, community, wallet)

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

-- Wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own wallet" ON public.wallets;
CREATE POLICY "Users read own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Ledger
CREATE TABLE IF NOT EXISTS public.ledger (
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
CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON public.ledger(user_id, created_at DESC);
GRANT SELECT ON public.ledger TO authenticated;
GRANT ALL ON public.ledger TO service_role;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own ledger" ON public.ledger;
CREATE POLICY "Users read own ledger" ON public.ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Wallet RPCs (called via service role)
CREATE OR REPLACE FUNCTION public.wallet_deposit(p_user_id uuid, p_amount_minor bigint, p_reference text)
RETURNS public.wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.wallets;
DECLARE bal_before bigint;
BEGIN
  IF p_amount_minor <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  INSERT INTO public.wallets (user_id, balance) VALUES (p_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO bal_before FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  UPDATE public.wallets SET balance = balance + p_amount_minor, updated_at = now() WHERE user_id = p_user_id RETURNING * INTO w;
  INSERT INTO public.ledger (user_id, amount, type, reference, balance_before, balance_after)
  VALUES (p_user_id, p_amount_minor, 'deposit', p_reference, bal_before, w.balance);
  RETURN w;
END $$;

CREATE OR REPLACE FUNCTION public.wallet_transfer(p_from_user uuid, p_to_user uuid, p_amount_minor bigint, p_reference text, p_type text)
RETURNS public.wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w_from public.wallets;
DECLARE w_to public.wallets;
DECLARE bal_from_before bigint;
DECLARE bal_to_before bigint;
BEGIN
  IF p_amount_minor <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF p_from_user = p_to_user THEN RAISE EXCEPTION 'cannot transfer to self'; END IF;
  INSERT INTO public.wallets (user_id, balance) VALUES (p_to_user, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO bal_from_before FROM public.wallets WHERE user_id = p_from_user FOR UPDATE;
  IF bal_from_before IS NULL OR bal_from_before < p_amount_minor THEN RAISE EXCEPTION 'insufficient funds'; END IF;
  SELECT balance INTO bal_to_before FROM public.wallets WHERE user_id = p_to_user FOR UPDATE;
  UPDATE public.wallets SET balance = balance - p_amount_minor, updated_at = now() WHERE user_id = p_from_user RETURNING * INTO w_from;
  UPDATE public.wallets SET balance = balance + p_amount_minor, updated_at = now() WHERE user_id = p_to_user RETURNING * INTO w_to;
  INSERT INTO public.ledger (user_id, counterparty_id, amount, type, reference, balance_before, balance_after)
  VALUES (p_from_user, p_to_user, -p_amount_minor, p_type, p_reference, bal_from_before, w_from.balance);
  INSERT INTO public.ledger (user_id, counterparty_id, amount, type, reference, balance_before, balance_after)
  VALUES (p_to_user, p_from_user, p_amount_minor, p_type, p_reference, bal_to_before, w_to.balance);
  RETURN w_from;
END $$;

REVOKE EXECUTE ON FUNCTION public.wallet_deposit(uuid, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_transfer(uuid, uuid, bigint, text, text) FROM PUBLIC, anon, authenticated;

-- Community portals
CREATE TABLE IF NOT EXISTS public.community_portals (
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
CREATE INDEX IF NOT EXISTS idx_portals_status_votes ON public.community_portals(status, votes_count DESC);
GRANT SELECT ON public.community_portals TO anon, authenticated;
GRANT INSERT, UPDATE ON public.community_portals TO authenticated;
GRANT ALL ON public.community_portals TO service_role;
ALTER TABLE public.community_portals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads published portals" ON public.community_portals;
CREATE POLICY "Anyone reads published portals" ON public.community_portals
  FOR SELECT USING (status = 'published' OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own portals" ON public.community_portals;
CREATE POLICY "Users insert own portals" ON public.community_portals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own portals" ON public.community_portals;
CREATE POLICY "Users update own portals" ON public.community_portals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Portal votes
CREATE TABLE IF NOT EXISTS public.portal_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid NOT NULL REFERENCES public.community_portals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portal_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.portal_votes TO authenticated;
GRANT ALL ON public.portal_votes TO service_role;
ALTER TABLE public.portal_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own votes" ON public.portal_votes;
CREATE POLICY "Users read own votes" ON public.portal_votes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own votes" ON public.portal_votes;
CREATE POLICY "Users insert own votes" ON public.portal_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own votes" ON public.portal_votes;
CREATE POLICY "Users delete own votes" ON public.portal_votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sync vote counter
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
DROP TRIGGER IF EXISTS trg_portal_votes_count ON public.portal_votes;
CREATE TRIGGER trg_portal_votes_count
AFTER INSERT OR DELETE ON public.portal_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_portal_votes_count();

-- Protect privileged columns on community_portals (from previous security finding)
CREATE OR REPLACE FUNCTION public.protect_community_portals_cols()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' <> 'service_role' THEN
    NEW.votes_count := OLD.votes_count;
    NEW.status := OLD.status;
    NEW.package := OLD.package;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.protect_community_portals_cols() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_portal_cols ON public.community_portals;
CREATE TRIGGER trg_protect_portal_cols
BEFORE UPDATE ON public.community_portals
FOR EACH ROW EXECUTE FUNCTION public.protect_community_portals_cols();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_wallets_updated ON public.wallets;
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_portals_updated ON public.community_portals;
CREATE TRIGGER trg_portals_updated BEFORE UPDATE ON public.community_portals
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
