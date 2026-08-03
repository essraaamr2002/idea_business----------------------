CREATE OR REPLACE FUNCTION public.trg_event_new_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'active'::public.project_status THEN
    PERFORM public.post_live_event(
      'مشروع جديد: ' || COALESCE(NEW.name,'بدون اسم'),
      'تم طرح مشروع جديد على منصة فكرة بزنس' ||
        CASE WHEN NEW.sector IS NOT NULL THEN ' في قطاع ' || NEW.sector ELSE '' END ||
        CASE WHEN NEW.country IS NOT NULL THEN ' — ' || NEW.country ELSE '' END || '.',
      '📢 **مشروع جديد على المنصة**' || E'\n\n' ||
      '**' || COALESCE(NEW.name,'') || '**' || E'\n\n' ||
      COALESCE(left(NEW.description,400),'') || E'\n\n' ||
      '[عرض المشروع](/projects/' || NEW.id::text || ')',
      'new_project', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;