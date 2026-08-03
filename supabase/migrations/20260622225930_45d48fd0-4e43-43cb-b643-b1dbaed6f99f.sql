
DROP POLICY IF EXISTS "Authenticated or service can record conversion" ON public.ad_conversions;
CREATE POLICY "Authenticated users record their conversions"
  ON public.ad_conversions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
