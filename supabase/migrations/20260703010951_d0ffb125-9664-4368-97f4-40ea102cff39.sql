-- SECURITY NOTE:
-- The previous version embedded a Supabase API key directly in migration source.
-- The cron job is intentionally not created here. Configure the endpoint and API
-- credential through Supabase Vault / deployment secrets, then create the job in
-- the target environment using a deployment-only script.
--
-- Recommended secret names:
--   trust_seal_endpoint
--   trust_seal_api_key
--
-- This migration is retained as a no-op so fresh database deployments do not
-- leak or depend on a credential committed to source control.
DO $$
BEGIN
  RAISE NOTICE 'daily-trust-chain-seal cron setup skipped; configure it with Vault-managed secrets';
END $$;
