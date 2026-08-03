
CREATE TABLE IF NOT EXISTS public.web4_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('accepted','denied','error','partial','verified')),
  mic_state TEXT,
  geo_state TEXT,
  reality_dim SMALLINT,
  broadcast_agents BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web4_audit_user_idx ON public.web4_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS web4_audit_time_idx ON public.web4_audit_log(created_at DESC);

GRANT SELECT, INSERT ON public.web4_audit_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.web4_audit_log_id_seq TO authenticated;
GRANT ALL ON public.web4_audit_log TO service_role;
GRANT ALL ON SEQUENCE public.web4_audit_log_id_seq TO service_role;

ALTER TABLE public.web4_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "web4_audit_self_insert" ON public.web4_audit_log;
CREATE POLICY "web4_audit_self_insert" ON public.web4_audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "web4_audit_self_read" ON public.web4_audit_log;
CREATE POLICY "web4_audit_self_read" ON public.web4_audit_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "web4_audit_admin_read" ON public.web4_audit_log;
CREATE POLICY "web4_audit_admin_read" ON public.web4_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
