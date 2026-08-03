-- Lock down community_portals.package and supervisor_subscriptions financial fields against client tampering

CREATE OR REPLACE FUNCTION public.protect_community_portals_cols()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_service boolean := current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role';
BEGIN
  IF TG_OP = 'INSERT' AND NOT is_service THEN
    NEW.votes_count := 0;
    NEW.status := COALESCE(NEW.status, 'published');
    IF NEW.status NOT IN ('published','draft') THEN NEW.status := 'published'; END IF;
    NEW.package := 'free';
  ELSIF TG_OP = 'UPDATE' AND NOT is_service THEN
    NEW.votes_count := OLD.votes_count;
    NEW.status := OLD.status;
    NEW.package := OLD.package;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.protect_supervisor_subscription_cols()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_service boolean := current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role';
BEGIN
  IF TG_OP = 'INSERT' AND NOT is_service THEN
    NEW.monthly_fee := 500;
    NEW.status := 'pending';
    NEW.next_billing_at := now() + INTERVAL '30 days';
  ELSIF TG_OP = 'UPDATE' AND NOT is_service THEN
    NEW.monthly_fee := OLD.monthly_fee;
    NEW.status := OLD.status;
    NEW.next_billing_at := OLD.next_billing_at;
    NEW.investor_id := OLD.investor_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_supervisor_subscription_cols ON public.supervisor_subscriptions;
CREATE TRIGGER trg_protect_supervisor_subscription_cols
BEFORE INSERT OR UPDATE ON public.supervisor_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.protect_supervisor_subscription_cols();
