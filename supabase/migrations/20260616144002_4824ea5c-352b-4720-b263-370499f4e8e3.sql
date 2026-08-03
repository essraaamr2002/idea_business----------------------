
CREATE OR REPLACE FUNCTION public.protect_community_portals_cols()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.votes_count IS DISTINCT FROM OLD.votes_count THEN
      NEW.votes_count := OLD.votes_count;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.status := OLD.status;
    END IF;
    IF NEW.package IS DISTINCT FROM OLD.package THEN
      NEW.package := OLD.package;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_community_portals_cols_trg ON public.community_portals;
CREATE TRIGGER protect_community_portals_cols_trg
BEFORE UPDATE ON public.community_portals
FOR EACH ROW
EXECUTE FUNCTION public.protect_community_portals_cols();
