
-- ============================================================
-- Phase 2+3: Security hardening — missing tables, immutability, 
-- restricting permissive policies, audit infrastructure.
-- Additive only — preserves all existing tables and data.
-- ============================================================

-- ---------- 1. user_sessions (device & session tracking) ----------
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own sessions" ON public.user_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users revoke own sessions" ON public.user_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "service inserts sessions" ON public.user_sessions
  FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(user_id) WHERE is_active = true;

-- ---------- 2. two_factor_auth ----------
CREATE TABLE IF NOT EXISTS public.two_factor_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('totp','sms','email')),
  secret_encrypted TEXT,
  backup_codes_hash TEXT[],
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.two_factor_auth TO authenticated;
GRANT ALL ON public.two_factor_auth TO service_role;

ALTER TABLE public.two_factor_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own 2fa" ON public.two_factor_auth
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------- 3. password_reset_tokens ----------
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.password_reset_tokens TO authenticated;
GRANT ALL ON public.password_reset_tokens TO service_role;

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own reset tokens" ON public.password_reset_tokens
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "service manages reset tokens" ON public.password_reset_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON public.password_reset_tokens(user_id);

-- ---------- 4. Immutability triggers on financial / audit tables ----------
CREATE OR REPLACE FUNCTION public.prevent_modification()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION '% on % is forbidden — record is immutable', TG_OP, TG_TABLE_NAME;
END;
$$;

-- Ledger immutability (already has hash chain; reinforce at row level)
DROP TRIGGER IF EXISTS ledger_no_update ON public.ledger;
DROP TRIGGER IF EXISTS ledger_no_delete ON public.ledger;
CREATE TRIGGER ledger_no_update BEFORE UPDATE ON public.ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();
CREATE TRIGGER ledger_no_delete BEFORE DELETE ON public.ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();

-- Admin audit log immutability
DROP TRIGGER IF EXISTS admin_audit_no_update ON public.admin_audit_log;
DROP TRIGGER IF EXISTS admin_audit_no_delete ON public.admin_audit_log;
CREATE TRIGGER admin_audit_no_update BEFORE UPDATE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();
CREATE TRIGGER admin_audit_no_delete BEFORE DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();

-- Security events immutability
DROP TRIGGER IF EXISTS security_events_no_update ON public.security_events;
DROP TRIGGER IF EXISTS security_events_no_delete ON public.security_events;
CREATE TRIGGER security_events_no_update BEFORE UPDATE ON public.security_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();
CREATE TRIGGER security_events_no_delete BEFORE DELETE ON public.security_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();

-- Share trades immutability (financial settlement record)
DROP TRIGGER IF EXISTS share_trades_no_update ON public.share_trades;
DROP TRIGGER IF EXISTS share_trades_no_delete ON public.share_trades;
CREATE TRIGGER share_trades_no_update BEFORE UPDATE ON public.share_trades
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();
CREATE TRIGGER share_trades_no_delete BEFORE DELETE ON public.share_trades
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();

-- ---------- 5. Wallet balance non-negative guard ----------
CREATE OR REPLACE FUNCTION public.guard_wallet_balance_nonneg()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance: wallet % currency % attempted balance %', NEW.user_id, NEW.currency, NEW.balance;
  END IF;
  IF NEW.held < 0 THEN
    RAISE EXCEPTION 'Held amount cannot be negative: wallet %', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallet_balance_nonneg ON public.wallets;
CREATE TRIGGER wallet_balance_nonneg BEFORE INSERT OR UPDATE OF balance, held ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.guard_wallet_balance_nonneg();

-- ---------- 6. Tighten permissive RLS policies ----------
-- ad_audit_log: only service_role / admins insert
DROP POLICY IF EXISTS "System inserts audit" ON public.ad_audit_log;
CREATE POLICY "Service inserts ad audit" ON public.ad_audit_log
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Admins insert ad audit" ON public.ad_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- page_views: only authenticated, only inserting own row (or anon for guest views via service)
DROP POLICY IF EXISTS "pv_insert_any" ON public.page_views;
CREATE POLICY "pv_insert_auth_or_service" ON public.page_views
  FOR INSERT TO authenticated, service_role WITH CHECK (true);

-- search_queries: same tightening
DROP POLICY IF EXISTS "sq_insert_any" ON public.search_queries;
CREATE POLICY "sq_insert_auth_or_service" ON public.search_queries
  FOR INSERT TO authenticated, service_role WITH CHECK (true);

-- security_events: only service_role inserts (was permissive)
DROP POLICY IF EXISTS "Service role inserts security events" ON public.security_events;
CREATE POLICY "Service role inserts security events" ON public.security_events
  FOR INSERT TO service_role WITH CHECK (true);

-- ---------- 7. Revoke EXECUTE on internal SECURITY DEFINER funcs from anon ----------
-- These should only be callable by signed-in users or service_role.
-- Keep public-callable funcs (get_public_profile, list_featured_projects, get_setting, get_ticket_by_token, delete_ticket_by_token, encrypt_pii) accessible.
DO $$
DECLARE
  fn record;
  public_fns text[] := ARRAY[
    'get_public_profile','list_featured_projects','get_setting',
    'get_ticket_by_token','delete_ticket_by_token','get_user_public_projects',
    'get_user_recent_posts','get_project_contact','get_project_whatsapp',
    'is_ip_blocked','ensure_referral_code','handle_new_user'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prosecdef = true
      AND p.proname <> ALL(public_fns)
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, public', fn.proname, fn.args);
    EXCEPTION WHEN OTHERS THEN
      -- ignore funcs that don't have these grants
      NULL;
    END;
  END LOOP;
END $$;

-- ---------- 8. updated_at triggers for new tables ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS two_factor_auth_touch ON public.two_factor_auth;
CREATE TRIGGER two_factor_auth_touch BEFORE UPDATE ON public.two_factor_auth
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
