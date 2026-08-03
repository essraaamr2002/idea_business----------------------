
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.future_lab_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool TEXT NOT NULL CHECK (tool IN ('oracle','time_machine','twin','voice_trader','trust_chain')),
  title TEXT NOT NULL,
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_flh_user_created ON public.future_lab_history(user_id, created_at DESC);
CREATE INDEX idx_flh_tool ON public.future_lab_history(tool);
CREATE INDEX idx_flh_title_trgm ON public.future_lab_history USING gin (title gin_trgm_ops);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.future_lab_history TO authenticated;
GRANT ALL ON public.future_lab_history TO service_role;
ALTER TABLE public.future_lab_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own history select" ON public.future_lab_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own history insert" ON public.future_lab_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own history delete" ON public.future_lab_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.notification_prefs (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  inapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  dm_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  journalist_digest BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs" ON public.notification_prefs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
