
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cleanup function to retain backups for 7 days only
CREATE OR REPLACE FUNCTION public.cleanup_old_backup_snapshots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  WITH d AS (DELETE FROM public.backup_snapshots WHERE taken_at < now() - interval '7 days' RETURNING 1)
  SELECT count(*) INTO n FROM d;
  RETURN n;
END $$;

-- Unschedule previous versions if they exist (ignore errors)
DO $$ BEGIN
  PERFORM cron.unschedule('backup-snapshot-every-30min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('backup-snapshot-cleanup-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Schedule backup snapshot every 30 minutes
SELECT cron.schedule(
  'backup-snapshot-every-30min',
  '*/30 * * * *',
  $$ SELECT public.take_backup_snapshot(); $$
);

-- Schedule daily cleanup of old snapshots at 03:00
SELECT cron.schedule(
  'backup-snapshot-cleanup-daily',
  '0 3 * * *',
  $$ SELECT public.cleanup_old_backup_snapshots(); $$
);

-- Take an immediate snapshot
SELECT public.take_backup_snapshot();
