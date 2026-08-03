
-- 1) Message reports table
CREATE TYPE public.message_report_reason AS ENUM ('harassment','scam','spam','inappropriate','other');
CREATE TYPE public.message_report_status AS ENUM ('open','reviewing','resolved','dismissed');

CREATE TABLE public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason public.message_report_reason NOT NULL,
  notes text,
  status public.message_report_status NOT NULL DEFAULT 'open',
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_message_reports_status ON public.message_reports(status, created_at DESC);
CREATE INDEX idx_message_reports_reporter ON public.message_reports(reporter_id);

GRANT SELECT, INSERT ON public.message_reports TO authenticated;
GRANT ALL ON public.message_reports TO service_role;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reporter_can_insert" ON public.message_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "reporter_can_view_own" ON public.message_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "admin_view_all_reports" ON public.message_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "admin_update_reports" ON public.message_reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 2) User preferences: new columns for message notifications + privacy
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS messages_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS messages_push boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS messages_silent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_read_receipts boolean NOT NULL DEFAULT false;

-- 3) Profiles: last_seen_at
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- 4) Block sending if either party blocks the other
CREATE OR REPLACE FUNCTION public.check_block_before_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other_id uuid;
  blocked boolean;
BEGIN
  SELECT user_id INTO other_id FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id LIMIT 1;
  IF other_id IS NULL THEN RETURN NEW; END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = NEW.sender_id AND blocked_id = other_id)
       OR (blocker_id = other_id AND blocked_id = NEW.sender_id)
  ) INTO blocked;
  IF blocked THEN
    RAISE EXCEPTION 'BLOCKED: لا يمكن إرسال الرسالة — تم حظر المحادثة بين الطرفين' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_block_before_message ON public.messages;
CREATE TRIGGER trg_check_block_before_message
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.check_block_before_message();

-- 5) Storage RLS for message-attachments bucket
-- Path convention: {senderUserId}/{conversationId}/{filename}
CREATE POLICY "msg_attach_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "msg_attach_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "msg_attach_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Read: participant of the conversation in the second path segment
CREATE POLICY "msg_attach_participant_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-attachments' AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
        AND cp.conversation_id::text = (storage.foldername(name))[2]
    )
  );
