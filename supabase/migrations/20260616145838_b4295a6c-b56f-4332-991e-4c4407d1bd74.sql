-- Reset
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TABLE IF EXISTS public.portal_votes CASCADE;
DROP TABLE IF EXISTS public.community_portals CASCADE;
DROP TABLE IF EXISTS public.ledger CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.wallet_deposit(uuid, bigint, text) CASCADE;
DROP FUNCTION IF EXISTS public.wallet_transfer(uuid, uuid, bigint, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.touch_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.sync_portal_votes_count() CASCADE;
DROP FUNCTION IF EXISTS public.protect_community_portals_cols() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_email() CASCADE;

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'seo', 'user');
CREATE TYPE public.membership_tier AS ENUM ('basic', 'full');
CREATE TYPE public.kyc_status AS ENUM ('pending', 'submitted', 'verified', 'rejected');
CREATE TYPE public.project_status AS ENUM ('draft', 'pending_review', 'active', 'halted', 'closed');
CREATE TYPE public.txn_type AS ENUM ('deposit','withdrawal','share_buy','share_sell','commission','dispute_fee','supervisor_fee','membership_fee','transfer_in','transfer_out');
CREATE TYPE public.order_side AS ENUM ('buy','sell');
CREATE TYPE public.order_status AS ENUM ('open','filled','cancelled','partial');
CREATE TYPE public.dispute_status AS ENUM ('open','in_review','lawyer_assigned','resolved','escalated','closed');
CREATE TYPE public.ticket_status AS ENUM ('open','in_progress','closed');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT, bio TEXT, avatar_url TEXT, country TEXT, city TEXT,
  phone TEXT, whatsapp TEXT, date_of_birth DATE, occupation TEXT,
  monthly_income NUMERIC, net_worth NUMERIC,
  kyc_status kyc_status NOT NULL DEFAULT 'pending',
  kyc_document_url TEXT, kyc_selfie_url TEXT,
  verified_green BOOLEAN NOT NULL DEFAULT false,
  verified_blue BOOLEAN NOT NULL DEFAULT false,
  membership membership_tier NOT NULL DEFAULT 'basic',
  membership_expires_at TIMESTAMPTZ,
  followers_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

CREATE POLICY profiles_self_read ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY profiles_self_insert ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE VIEW public.public_profiles WITH (security_invoker = true) AS
SELECT id, display_name, avatar_url, bio, verified_green, verified_blue, membership, followers_count, created_at FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

CREATE POLICY roles_self_read ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY roles_admin_all ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  virtual_iban TEXT UNIQUE,
  currency TEXT NOT NULL DEFAULT 'SAR',
  balance NUMERIC NOT NULL DEFAULT 0,
  held NUMERIC NOT NULL DEFAULT 0,
  bank_iban TEXT, bank_account_id TEXT, bank_iban_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallet_self_read ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY wallet_admin_all ON public.wallets FOR ALL USING (public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX wallets_bank_iban_unique ON public.wallets (bank_iban) WHERE bank_iban IS NOT NULL;

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT UNIQUE, name TEXT NOT NULL, description TEXT, cover_image_url TEXT,
  sector TEXT, country TEXT NOT NULL, city TEXT, phone TEXT, whatsapp TEXT,
  currency TEXT NOT NULL DEFAULT 'SAR',
  is_existing BOOLEAN NOT NULL DEFAULT false,
  total_cost NUMERIC NOT NULL,
  owner_contribution_pct NUMERIC NOT NULL DEFAULT 0,
  distribution_frequency TEXT NOT NULL DEFAULT 'monthly',
  expected_revenue NUMERIC, revenue_frequency TEXT,
  expected_profit NUMERIC, profit_frequency TEXT,
  expense_assets TEXT, expense_movables TEXT, expense_fixed TEXT, expense_variable TEXT,
  has_guarantee BOOLEAN NOT NULL DEFAULT false,
  guarantee_amount NUMERIC DEFAULT 0,
  shares_total INT NOT NULL DEFAULT 1000,
  share_price NUMERIC NOT NULL,
  shares_sold INT NOT NULL DEFAULT 0,
  current_price NUMERIC NOT NULL,
  status project_status NOT NULL DEFAULT 'pending_review',
  views_count INT NOT NULL DEFAULT 0,
  likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX projects_status_idx ON public.projects(status);
CREATE INDEX projects_sector_idx ON public.projects(sector);
GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
REVOKE SELECT (phone, whatsapp) ON public.projects FROM anon;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_public_read ON public.projects FOR SELECT USING (status IN ('active','halted','closed') OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY projects_owner_insert ON public.projects FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY projects_owner_update ON public.projects FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shares INT NOT NULL DEFAULT 0,
  avg_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.project_shares TO authenticated;
GRANT ALL ON public.project_shares TO service_role;
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY shares_self_read ON public.project_shares FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.project_guarantees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  guarantee_type TEXT NOT NULL, document_url TEXT,
  signed_to_name TEXT, signed_to_id TEXT, signed_to_passport TEXT,
  guarantor_name TEXT, guarantor_id TEXT, guarantor_nationality TEXT, guarantor_phone TEXT,
  amount NUMERIC, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.project_guarantees TO authenticated;
GRANT ALL ON public.project_guarantees TO service_role;
ALTER TABLE public.project_guarantees ENABLE ROW LEVEL SECURITY;
CREATE POLICY guarantees_restricted_read ON public.project_guarantees FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_guarantees.project_id AND p.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.project_shares s WHERE s.project_id = project_guarantees.project_id AND s.user_id = auth.uid() AND s.shares > 0)
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
);
CREATE POLICY guarantees_owner_insert ON public.project_guarantees FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type txn_type NOT NULL, amount NUMERIC NOT NULL, currency TEXT NOT NULL DEFAULT 'SAR',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT, metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY txn_self_read ON public.transactions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.share_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side order_side NOT NULL, shares INT NOT NULL, price NUMERIC NOT NULL,
  filled INT NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.share_orders TO anon;
GRANT SELECT, INSERT, UPDATE ON public.share_orders TO authenticated;
GRANT ALL ON public.share_orders TO service_role;
ALTER TABLE public.share_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_public_read ON public.share_orders FOR SELECT USING (true);
CREATE POLICY orders_self_insert ON public.share_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY orders_self_update ON public.share_orders FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE public.price_history (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL, volume NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX price_history_project_idx ON public.price_history(project_id, created_at DESC);
GRANT SELECT ON public.price_history TO anon, authenticated;
GRANT ALL ON public.price_history TO service_role;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY price_public_read ON public.price_history FOR SELECT USING (true);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL, likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_public_read ON public.comments FOR SELECT USING (true);
CREATE POLICY comments_self_insert ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY comments_self_modify ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY comments_self_delete ON public.comments FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY likes_read ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY likes_self ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY likes_self_del ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, amount_claimed NUMERIC,
  fee_amount NUMERIC NOT NULL DEFAULT 1500,
  fee_currency TEXT NOT NULL DEFAULT 'USD',
  fee_paid BOOLEAN NOT NULL DEFAULT false,
  lawyer_name TEXT, lawyer_country TEXT,
  status dispute_status NOT NULL DEFAULT 'open',
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY disputes_self_read ON public.disputes FOR SELECT USING (auth.uid() = claimant_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY disputes_self_insert ON public.disputes FOR INSERT WITH CHECK (auth.uid() = claimant_id);
CREATE POLICY disputes_admin_update ON public.disputes FOR UPDATE USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE public.supervisor_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  monthly_fee NUMERIC NOT NULL DEFAULT 500,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',
  supervisor_name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_billing_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days'
);
GRANT SELECT, INSERT, UPDATE ON public.supervisor_subscriptions TO authenticated;
GRANT ALL ON public.supervisor_subscriptions TO service_role;
ALTER TABLE public.supervisor_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sup_self_read ON public.supervisor_subscriptions FOR SELECT USING (auth.uid() = investor_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY sup_self_insert ON public.supervisor_subscriptions FOR INSERT WITH CHECK (auth.uid() = investor_id);

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT, email TEXT, whatsapp TEXT,
  subject TEXT NOT NULL, message TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  attachment_url TEXT, admin_reply TEXT,
  replied_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.support_tickets TO anon, authenticated;
GRANT SELECT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tickets_self_read ON public.support_tickets FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY tickets_anyone_insert ON public.support_tickets FOR INSERT WITH CHECK (length(subject) BETWEEN 1 AND 200 AND length(message) BETWEEN 1 AND 5000 AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY tickets_admin_update ON public.support_tickets FOR UPDATE USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL, excerpt TEXT, content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'ar',
  published BOOLEAN NOT NULL DEFAULT false,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  views_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY articles_public_read ON public.articles FOR SELECT USING (published = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'seo'));
CREATE POLICY articles_seo_manage ON public.articles FOR ALL USING (public.has_role(auth.uid(),'seo') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.otp_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  phone text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL DEFAULT 'signup',
  attempts integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_phone_purpose ON public.otp_codes(phone, purpose, created_at DESC);
GRANT ALL ON public.otp_codes TO service_role;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payment_intents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'fatora',
  order_id text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  purpose text NOT NULL DEFAULT 'wallet_topup',
  status text NOT NULL DEFAULT 'pending',
  checkout_url text, transaction_id text, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pi_user ON public.payment_intents(user_id, created_at DESC);
GRANT SELECT ON public.payment_intents TO authenticated;
GRANT ALL ON public.payment_intents TO service_role;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY pi_self_read ON public.payment_intents FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Trigger: auto-create profile + wallet + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wallets (user_id, virtual_iban)
  VALUES (NEW.id, 'IDEA' || to_char(now(),'YYYYMMDD') || lpad((floor(random()*1000000000))::text, 10, '0'))
  ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Contact info helper (owner/shareholder/admin/moderator only)
CREATE OR REPLACE FUNCTION public.get_project_contact(_project_id uuid)
RETURNS TABLE(phone text, whatsapp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.phone, p.whatsapp FROM public.projects p
  WHERE p.id = _project_id
    AND (p.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.project_shares s WHERE s.project_id = p.id AND s.user_id = auth.uid() AND s.shares > 0)
         OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
$$;
GRANT EXECUTE ON FUNCTION public.get_project_contact(uuid) TO authenticated;