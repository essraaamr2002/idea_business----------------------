CREATE OR REPLACE FUNCTION public.tg_protect_project_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the caller is service_role, allow everything
  IF (SELECT count(*) FROM pg_roles WHERE rolname = current_user AND rolname = 'postgres') > 0 THEN
    RETURN NEW;
  END IF;
  
  -- On INSERT: only allow 'draft' or 'pending_review' status for non-admins
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft', 'pending_review') THEN
      NEW.status := 'pending_review';
    END IF;
    RETURN NEW;
  END IF;
  
  -- On UPDATE: prevent non-admins from changing status
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      -- Only allow if user is admin
      IF NOT public.has_role(auth.uid(), 'admin') THEN
        NEW.status := OLD.status;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS tg_protect_project_status ON public.projects;

CREATE TRIGGER tg_protect_project_status
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.tg_protect_project_status();
