
-- Add WITH CHECK to portals_update so non-admin owners cannot escalate
-- their package or status via UPDATE. The existing trigger
-- protect_community_portals_cols already resets these to OLD values, but
-- making the policy explicit is defense in depth.
DROP POLICY IF EXISTS portals_update ON public.community_portals;
CREATE POLICY portals_update ON public.community_portals
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND package = (SELECT package FROM public.community_portals cp WHERE cp.id = community_portals.id)
    AND status  = (SELECT status  FROM public.community_portals cp WHERE cp.id = community_portals.id)
    AND votes_count = (SELECT votes_count FROM public.community_portals cp WHERE cp.id = community_portals.id)
  );
