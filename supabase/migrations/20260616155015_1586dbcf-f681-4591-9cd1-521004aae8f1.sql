DROP POLICY IF EXISTS portals_update ON public.community_portals;
CREATE POLICY portals_update ON public.community_portals
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);