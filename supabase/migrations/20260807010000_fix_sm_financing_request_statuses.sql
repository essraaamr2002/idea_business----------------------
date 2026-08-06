-- Align legacy production tables with the statuses used by the application.
-- Some databases created this column as text with a CHECK constraint, while
-- newer databases use the sm_financing_status enum.
DO $migration$
DECLARE
  status_type text;
BEGIN
  SELECT c.data_type
    INTO status_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'sm_financing_requests'
    AND c.column_name = 'status';

  IF status_type IN ('text', 'character varying', 'character') THEN
    ALTER TABLE public.sm_financing_requests
      DROP CONSTRAINT IF EXISTS sm_financing_requests_status_check;

    -- Preserve existing rows while mapping known legacy spellings.
    UPDATE public.sm_financing_requests
    SET status = CASE
      WHEN status IN ('pending', 'auto_rejected', 'approved', 'rejected', 'cancelled') THEN status
      WHEN status IN ('auto-rejected', 'automatic_rejected') THEN 'auto_rejected'
      WHEN status IN ('canceled', 'cancel') THEN 'cancelled'
      ELSE 'pending'
    END;

    ALTER TABLE public.sm_financing_requests
      ADD CONSTRAINT sm_financing_requests_status_check
      CHECK (status IN ('pending', 'auto_rejected', 'approved', 'rejected', 'cancelled'));
  END IF;
END
$migration$;

NOTIFY pgrst, 'reload schema';
