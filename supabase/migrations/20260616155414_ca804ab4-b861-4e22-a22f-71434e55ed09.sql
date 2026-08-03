
-- =============================================================
-- Security hardening: revoke EXECUTE on internal SECURITY DEFINER
-- functions; keep only the RPCs actually called by clients.
-- =============================================================

-- Internal-only (called by triggers or by other SECURITY DEFINER fns
-- via the service role through server functions). Revoke from public/anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_community_portals_cols() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_portal_votes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profiles_privileged_cols() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ledger_hash_chain() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_supervisor_subscription_cols() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_project_guarantees_sensitive() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_self_iban(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_self_iban(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_deposit(uuid, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_transfer(uuid, uuid, bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_fatora_deposit(uuid, text, bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.request_payout(uuid, text, text, text, bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_payout(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.evaluate_fraud_risk(uuid, bigint, text) FROM PUBLIC, anon, authenticated;

-- Pure helper math functions (IMMUTABLE) — safe but no need to be exposed
REVOKE EXECUTE ON FUNCTION public.iban_letter_to_digits(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_iban_mod97(text) FROM PUBLIC, anon;

-- Authenticated-callable RPCs (still SECURITY DEFINER, callable by signed-in users only)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_ledger_integrity(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_project_contact(uuid) FROM PUBLIC, anon;

-- =============================================================
-- Account-level firewall: rate-limit table for sensitive actions
-- (login attempts, payout requests, transfers, OTP). Server functions
-- can call check_rate_limit() before processing.
-- =============================================================
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip text,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_events_lookup
  ON public.rate_limit_events (action, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rate_limit_events_ip_lookup
  ON public.rate_limit_events (action, ip, created_at DESC);

GRANT ALL ON public.rate_limit_events TO service_role;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
-- No policies = no client access; service_role bypasses RLS.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_ip text,
  p_action text,
  p_max int,
  p_window_seconds int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt
  FROM public.rate_limit_events
  WHERE action = p_action
    AND created_at > now() - make_interval(secs => p_window_seconds)
    AND ((p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (p_ip IS NOT NULL AND ip = p_ip));
  IF cnt >= p_max THEN
    RETURN false;
  END IF;
  INSERT INTO public.rate_limit_events(user_id, ip, action)
  VALUES (p_user_id, p_ip, p_action);
  -- opportunistic cleanup
  DELETE FROM public.rate_limit_events
  WHERE created_at < now() - INTERVAL '1 day';
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, text, int, int) FROM PUBLIC, anon, authenticated;
