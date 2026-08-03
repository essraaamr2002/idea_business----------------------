
-- Daily backup snapshot: counts of key tables stored as JSON for audit/restore reference
CREATE OR REPLACE FUNCTION public.create_backup_snapshot()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'projects', (SELECT count(*) FROM public.projects),
    'profiles', (SELECT count(*) FROM public.profiles),
    'wallets', (SELECT count(*) FROM public.wallets),
    'ledger', (SELECT count(*) FROM public.ledger),
    'invoices', (SELECT count(*) FROM public.invoices),
    'articles', (SELECT count(*) FROM public.articles),
    'transactions', (SELECT count(*) FROM public.transactions),
    'support_tickets', (SELECT count(*) FROM public.support_tickets),
    'kyc_verifications', (SELECT count(*) FROM public.kyc_verifications),
    'snapshot_taken_at', now()
  ) INTO v_stats;
  INSERT INTO public.backup_snapshots (taken_at, stats) VALUES (now(), v_stats) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_backup_snapshot() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_backup_snapshot() TO service_role;

-- Schedule daily at 02:00 UTC
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  END IF;
  PERFORM cron.unschedule('daily-backup-snapshot') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='daily-backup-snapshot');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule('daily-backup-snapshot','0 2 * * *', $$SELECT public.create_backup_snapshot();$$);
