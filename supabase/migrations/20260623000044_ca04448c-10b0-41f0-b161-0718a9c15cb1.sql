
-- AI Organization tables
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  rank INT NOT NULL DEFAULT 5,
  system_prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  total_runs INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT ALL ON public.ai_agents TO service_role;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_agents_admin_all ON public.ai_agents FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.ai_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  result TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  duration_ms INT,
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agent_logs TO authenticated;
GRANT ALL ON public.ai_agent_logs TO service_role;
ALTER TABLE public.ai_agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_logs_admin_all ON public.ai_agent_logs FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ai_logs_agent_created ON public.ai_agent_logs(agent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_directives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent TEXT NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  to_agent TEXT NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_directives TO authenticated;
GRANT ALL ON public.ai_directives TO service_role;
ALTER TABLE public.ai_directives ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_directives_admin_all ON public.ai_directives FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ai_directives_status ON public.ai_directives(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_ai_agents_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS trg_ai_agents_updated ON public.ai_agents;
CREATE TRIGGER trg_ai_agents_updated BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.touch_ai_agents_updated_at();
