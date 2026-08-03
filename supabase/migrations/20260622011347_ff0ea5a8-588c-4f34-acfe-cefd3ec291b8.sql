
-- 1) community-media: restrict UPDATE to file owner's folder
DROP POLICY IF EXISTS "community_media_update_own" ON storage.objects;
CREATE POLICY "community_media_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'community-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'community-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2) project_guarantees: allow project owner to read their own guarantees
DROP POLICY IF EXISTS "guarantees_owner_read" ON public.project_guarantees;
CREATE POLICY "guarantees_owner_read"
ON public.project_guarantees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_guarantees.project_id
      AND p.owner_id = auth.uid()
  )
);

-- 3) share_orders: open orders visible to all authenticated users (order book)
DROP POLICY IF EXISTS "share_orders_open_public_read" ON public.share_orders;
CREATE POLICY "share_orders_open_public_read"
ON public.share_orders
FOR SELECT
TO authenticated
USING (status = 'open');
