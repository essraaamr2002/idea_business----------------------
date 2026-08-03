CREATE OR REPLACE FUNCTION public.tg_notify_sector_followers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.sector IS NULL OR btrim(NEW.sector) = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.notifications (user_id, kind, title, body, href)
    SELECT DISTINCT
      sf.user_id,
      'project_sector',
      'مشروع جديد في قطاع ' || NEW.sector,
      COALESCE(NEW.name, 'مشروع جديد'),
      '/projects/' || NEW.id::text
    FROM public.sector_follows sf
    WHERE sf.sector = NEW.sector
      AND sf.user_id <> NEW.owner_id;
  EXCEPTION WHEN OTHERS THEN
    -- Notifications are best-effort and must never block project launch.
    RAISE WARNING 'tg_notify_sector_followers skipped for project %, error: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;