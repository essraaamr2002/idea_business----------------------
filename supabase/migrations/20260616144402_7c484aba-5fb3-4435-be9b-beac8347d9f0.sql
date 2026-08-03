
-- Drop existing schema cleanly (DB is empty)
DROP TABLE IF EXISTS public.portal_votes CASCADE;
DROP TABLE IF EXISTS public.community_portals CASCADE;
DROP TABLE IF EXISTS public.disputes CASCADE;
DROP TABLE IF EXISTS public.payment_intents CASCADE;
DROP TABLE IF EXISTS public.project_shares CASCADE;
DROP TABLE IF EXISTS public.ledger CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.wallet_deposit CASCADE;
DROP FUNCTION IF EXISTS public.wallet_transfer CASCADE;
DROP FUNCTION IF EXISTS public.finalize_payment_success CASCADE;
DROP FUNCTION IF EXISTS public.tg_protect_project_financials CASCADE;
DROP FUNCTION IF EXISTS public.tg_protect_dispute_fields CASCADE;
DROP FUNCTION IF EXISTS public.tg_set_updated_at CASCADE;
DROP FUNCTION IF EXISTS public.update_portal_votes_count CASCADE;
DROP FUNCTION IF EXISTS public.protect_community_portals_cols CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
