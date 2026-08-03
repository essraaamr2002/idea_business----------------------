
-- Layer 1: Conversations (one per admin)
CREATE TABLE public.admin_ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_ai_conversations TO authenticated;
GRANT ALL ON public.admin_ai_conversations TO service_role;
ALTER TABLE public.admin_ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.admin_ai_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owner_insert" ON public.admin_ai_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner_update" ON public.admin_ai_conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner_delete" ON public.admin_ai_conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Layer 1: Messages
CREATE TABLE public.admin_ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.admin_ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  parts JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_ai_msgs_conv ON public.admin_ai_messages(conversation_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.admin_ai_messages TO authenticated;
GRANT ALL ON public.admin_ai_messages TO service_role;
ALTER TABLE public.admin_ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select_msg" ON public.admin_ai_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owner_insert_msg" ON public.admin_ai_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner_delete_msg" ON public.admin_ai_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Layer 2: Long-term memory
CREATE TABLE public.admin_ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);
CREATE INDEX idx_admin_ai_mem_user ON public.admin_ai_memory(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_ai_memory TO authenticated;
GRANT ALL ON public.admin_ai_memory TO service_role;
ALTER TABLE public.admin_ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_mem" ON public.admin_ai_memory FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Layer 5: Pending approvals
CREATE TABLE public.admin_ai_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  args JSONB NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','executed','failed')),
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes')
);
CREATE INDEX idx_admin_ai_pa_user ON public.admin_ai_pending_actions(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.admin_ai_pending_actions TO authenticated;
GRANT ALL ON public.admin_ai_pending_actions TO service_role;
ALTER TABLE public.admin_ai_pending_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_select_pa" ON public.admin_ai_pending_actions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owner_insert_pa" ON public.admin_ai_pending_actions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner_update_pa" ON public.admin_ai_pending_actions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Layer 8: Usage analytics
CREATE TABLE public.admin_ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,
  model TEXT,
  duration_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  tools_used TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_ai_usage_user ON public.admin_ai_usage(user_id, created_at DESC);
CREATE INDEX idx_admin_ai_usage_date ON public.admin_ai_usage(created_at DESC);
GRANT SELECT, INSERT ON public.admin_ai_usage TO authenticated;
GRANT ALL ON public.admin_ai_usage TO service_role;
ALTER TABLE public.admin_ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_select_usage" ON public.admin_ai_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owner_insert_usage" ON public.admin_ai_usage FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Updated_at trigger for conversations
CREATE OR REPLACE FUNCTION public.tg_admin_ai_touch_conv()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.admin_ai_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_admin_ai_touch_conv
AFTER INSERT ON public.admin_ai_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_admin_ai_touch_conv();
