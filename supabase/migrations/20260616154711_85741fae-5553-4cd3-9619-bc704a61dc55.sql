
DROP POLICY IF EXISTS portals_insert ON public.community_portals;
CREATE POLICY portals_insert ON public.community_portals
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND votes_count = 0
    AND package = 'free'
    AND status IN ('published','draft')
  );

DROP POLICY IF EXISTS portals_update ON public.community_portals;
CREATE POLICY portals_update ON public.community_portals
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND votes_count = (SELECT votes_count FROM public.community_portals WHERE id = community_portals.id)
    AND package = (SELECT package FROM public.community_portals WHERE id = community_portals.id)
    AND status = (SELECT status FROM public.community_portals WHERE id = community_portals.id)
  );
