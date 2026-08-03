
-- 1) Per-user conversation state (pin/archive/mute/delete)
CREATE TABLE IF NOT EXISTS public.conversation_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  pinned boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  muted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  last_read_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_state TO authenticated;
GRANT ALL ON public.conversation_state TO service_role;
ALTER TABLE public.conversation_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs own all" ON public.conversation_state FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2) User blocks
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks owner read" ON public.user_blocks FOR SELECT USING (blocker_id = auth.uid());
CREATE POLICY "blocks owner insert" ON public.user_blocks FOR INSERT WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "blocks owner delete" ON public.user_blocks FOR DELETE USING (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a)
  );
$$;

-- 3) Quick replies (templates)
CREATE TABLE IF NOT EXISTS public.quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  body  text NOT NULL CHECK (char_length(body)  BETWEEN 1 AND 2000),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quick_replies TO authenticated;
GRANT ALL ON public.quick_replies TO service_role;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qr own all" ON public.quick_replies FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4) Message attachments columns
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url  text,
  ADD COLUMN IF NOT EXISTS attachment_type text;

-- 5) Block-aware insert trigger for messages
CREATE OR REPLACE FUNCTION public.tg_block_message_if_blocked()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE other_uid uuid;
BEGIN
  SELECT user_id INTO other_uid
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id
    LIMIT 1;
  IF other_uid IS NOT NULL AND public.is_blocked_between(NEW.sender_id, other_uid) THEN
    RAISE EXCEPTION 'BLOCKED: لا يمكنك إرسال رسالة لهذا المستخدم';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_msg_block_check ON public.messages;
CREATE TRIGGER trg_msg_block_check BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_block_message_if_blocked();
