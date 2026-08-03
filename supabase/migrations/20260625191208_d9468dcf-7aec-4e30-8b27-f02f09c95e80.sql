
-- Price change alert notifications for watchlist users
CREATE OR REPLACE FUNCTION public.notify_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_price NUMERIC;
  pct NUMERIC;
  proj_name TEXT;
  w RECORD;
  threshold NUMERIC := 5; -- percent
BEGIN
  IF NEW.price IS NULL OR NEW.price <= 0 THEN RETURN NEW; END IF;

  SELECT price INTO prev_price
  FROM public.price_history
  WHERE project_id = NEW.project_id AND id <> NEW.id
  ORDER BY created_at DESC
  LIMIT 1;

  IF prev_price IS NULL OR prev_price <= 0 THEN RETURN NEW; END IF;

  pct := ROUND(((NEW.price - prev_price) / prev_price) * 100, 2);
  IF ABS(pct) < threshold THEN RETURN NEW; END IF;

  SELECT name INTO proj_name FROM public.projects WHERE id = NEW.project_id;

  FOR w IN
    SELECT DISTINCT w.user_id
    FROM public.watchlist w
    WHERE w.project_id = NEW.project_id
  LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, href)
    VALUES (
      w.user_id,
      'price_alert',
      'تنبيه تغير السعر: ' || COALESCE(proj_name,'مشروع'),
      'تغير السعر بنسبة ' || pct || '% (' || prev_price || ' → ' || NEW.price || ')',
      '/projects/' || NEW.project_id
    );

    -- Best-effort email enqueue; ignore errors
    BEGIN
      PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
        'template', 'price_alert',
        'user_id', w.user_id,
        'project_id', NEW.project_id,
        'project_name', proj_name,
        'previous_price', prev_price,
        'new_price', NEW.price,
        'change_pct', pct
      ));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_price_change ON public.price_history;
CREATE TRIGGER trg_notify_price_change
AFTER INSERT ON public.price_history
FOR EACH ROW EXECUTE FUNCTION public.notify_price_change();

-- Helpful index for the "previous price" lookup
CREATE INDEX IF NOT EXISTS idx_price_history_project_created
  ON public.price_history (project_id, created_at DESC);

-- Helpful index for watchlist fan-out
CREATE INDEX IF NOT EXISTS idx_watchlist_project ON public.watchlist (project_id);
