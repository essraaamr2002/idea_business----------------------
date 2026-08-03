
CREATE TABLE public.assistant_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL DEFAULT '',
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX assistant_messages_user_agent_idx ON public.assistant_messages(user_id, agent_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_messages TO authenticated;
GRANT ALL ON public.assistant_messages TO service_role;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assistant msgs read" ON public.assistant_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own assistant msgs insert" ON public.assistant_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own assistant msgs delete" ON public.assistant_messages FOR DELETE USING (auth.uid() = user_id);
