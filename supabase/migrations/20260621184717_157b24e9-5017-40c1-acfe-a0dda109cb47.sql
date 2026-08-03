
-- Fix mutable search_path on price helpers
CREATE OR REPLACE FUNCTION public._ad_price_impression()
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT 0.01::numeric $$;

CREATE OR REPLACE FUNCTION public._ad_price_click()
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT 0.50::numeric $$;

-- Tighten newsletter subscription INSERT policy (was WITH CHECK true)
DROP POLICY IF EXISTS news_subscribers_insert_anyone ON public.news_subscribers;
CREATE POLICY news_subscribers_insert_anyone
ON public.news_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 5 AND 254
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);
