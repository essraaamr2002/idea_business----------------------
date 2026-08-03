
-- Oracle Engine: AI-generated per-project signals
CREATE TABLE public.oracle_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  dna JSONB NOT NULL DEFAULT '{}'::jsonb,
  fair_value NUMERIC(18,4),
  market_price NUMERIC(18,4),
  signal TEXT CHECK (signal IN ('undervalued','fair','overvalued')),
  success_probability NUMERIC(5,2),
  reasoning TEXT,
  model TEXT DEFAULT 'google/gemini-3-flash-preview',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_oracle_project ON public.oracle_signals(project_id, computed_at DESC);
GRANT SELECT ON public.oracle_signals TO anon, authenticated;
GRANT ALL ON public.oracle_signals TO service_role;
ALTER TABLE public.oracle_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oracle_public_read" ON public.oracle_signals FOR SELECT USING (true);

-- Swarm Intelligence: crowd sentiment per project
CREATE TABLE public.swarm_sentiment (
  project_id UUID PRIMARY KEY,
  buys_24h INT NOT NULL DEFAULT 0,
  sells_24h INT NOT NULL DEFAULT 0,
  bids_24h INT NOT NULL DEFAULT 0,
  watchers INT NOT NULL DEFAULT 0,
  sentiment_score NUMERIC(5,2) NOT NULL DEFAULT 50,
  contrarian_alert BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.swarm_sentiment TO anon, authenticated;
GRANT ALL ON public.swarm_sentiment TO service_role;
ALTER TABLE public.swarm_sentiment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swarm_public_read" ON public.swarm_sentiment FOR SELECT USING (true);

-- Time Machine simulation runs
CREATE TABLE public.sim_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  scenario JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sim_user ON public.sim_runs(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.sim_runs TO authenticated;
GRANT ALL ON public.sim_runs TO service_role;
ALTER TABLE public.sim_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_owner" ON public.sim_runs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Digital Twin portfolios
CREATE TABLE public.digital_twins (
  user_id UUID PRIMARY KEY,
  strategy TEXT NOT NULL DEFAULT 'balanced' CHECK (strategy IN ('conservative','balanced','aggressive')),
  virtual_balance NUMERIC(18,2) NOT NULL DEFAULT 100000,
  performance_pct NUMERIC(8,4) NOT NULL DEFAULT 0,
  holdings JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_lesson TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.digital_twins TO authenticated;
GRANT ALL ON public.digital_twins TO service_role;
ALTER TABLE public.digital_twins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "twin_owner" ON public.digital_twins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Proof-of-Trust chain: daily Merkle seals
CREATE TABLE public.trust_chain_blocks (
  height BIGSERIAL PRIMARY KEY,
  merkle_root TEXT NOT NULL,
  prev_hash TEXT,
  block_hash TEXT NOT NULL,
  event_count INT NOT NULL,
  sealed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trust_chain_blocks TO anon, authenticated;
GRANT ALL ON public.trust_chain_blocks TO service_role;
ALTER TABLE public.trust_chain_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trust_chain_public" ON public.trust_chain_blocks FOR SELECT USING (true);

-- Voice trading command log
CREATE TABLE public.voice_commands_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transcript TEXT NOT NULL,
  parsed JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','executed','rejected','error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.voice_commands_log TO authenticated;
GRANT ALL ON public.voice_commands_log TO service_role;
ALTER TABLE public.voice_commands_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voice_owner" ON public.voice_commands_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
