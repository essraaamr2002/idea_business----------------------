
CREATE TABLE IF NOT EXISTS public.web4_activations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  activated BOOLEAN NOT NULL DEFAULT false,
  mic_granted BOOLEAN NOT NULL DEFAULT false,
  geo_granted BOOLEAN NOT NULL DEFAULT false,
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  last_accuracy_m DOUBLE PRECISION,
  reality_dim SMALLINT NOT NULL DEFAULT 14 CHECK (reality_dim BETWEEN 3 AND 14),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.web4_activations TO authenticated;
GRANT ALL ON public.web4_activations TO service_role;

ALTER TABLE public.web4_activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "web4_self_read" ON public.web4_activations;
CREATE POLICY "web4_self_read" ON public.web4_activations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "web4_self_upsert" ON public.web4_activations;
CREATE POLICY "web4_self_upsert" ON public.web4_activations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "web4_self_update" ON public.web4_activations;
CREATE POLICY "web4_self_update" ON public.web4_activations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "web4_admin_read" ON public.web4_activations;
CREATE POLICY "web4_admin_read" ON public.web4_activations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.web4_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS web4_touch_updated_at ON public.web4_activations;
CREATE TRIGGER web4_touch_updated_at
  BEFORE UPDATE ON public.web4_activations
  FOR EACH ROW EXECUTE FUNCTION public.web4_touch_updated_at();

REVOKE EXECUTE ON FUNCTION public.web4_touch_updated_at() FROM PUBLIC;
