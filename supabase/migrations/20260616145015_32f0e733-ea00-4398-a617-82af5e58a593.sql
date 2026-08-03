
-- 1) Force votes_count = 0 on INSERT, and continue protecting privileged cols on UPDATE
CREATE OR REPLACE FUNCTION public.protect_community_portals_cols()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_service boolean := current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role';
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT is_service THEN
      NEW.votes_count := 0;
      NEW.status := COALESCE(NEW.status, 'published');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT is_service THEN
      NEW.votes_count := OLD.votes_count;
      NEW.status := OLD.status;
      NEW.package := OLD.package;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_portal_cols_ins ON public.community_portals;
CREATE TRIGGER trg_protect_portal_cols_ins
BEFORE INSERT ON public.community_portals
FOR EACH ROW EXECUTE FUNCTION public.protect_community_portals_cols();

-- 2) Protect email column — only owner can read it
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, display_name, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Public profile fields readable" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Owner gets full read (including email) via separate policy + column grant
GRANT SELECT (email) ON public.profiles TO authenticated;
DROP POLICY IF EXISTS "Owner reads own profile fully" ON public.profiles;
-- (RLS row policy already permits the row; the column grant on email applies only when the user owns the row via the public policy above.
--  To enforce email-only-for-owner, we add a column-level grant restriction via a view-less approach: revoke email from authenticated and re-grant only via a SECURITY DEFINER RPC.)
REVOKE SELECT (email) ON public.profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;
