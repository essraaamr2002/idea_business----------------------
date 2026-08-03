
-- 1) Ad events: allow campaign owners to read events for their own campaigns
CREATE POLICY "ad_events_owner_read"
ON public.ad_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    WHERE c.id = ad_events.campaign_id
      AND c.owner_id = auth.uid()
  )
);

-- 2) Harden has_role(): only ever answers for auth.uid(). Removes the admin
--    impersonation path where an admin caller could query has_role(other_id, role)
--    and have any policy using a user-supplied UUID argument leak info.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    _user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = _role
    );
$function$;
