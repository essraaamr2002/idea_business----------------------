CREATE TABLE IF NOT EXISTS public.stripe_event_log (
  event_id text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_event_log TO service_role;
ALTER TABLE public.stripe_event_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stripe_event_log admin read" ON public.stripe_event_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));