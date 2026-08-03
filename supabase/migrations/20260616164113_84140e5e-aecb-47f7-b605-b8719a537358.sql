-- Ensure RLS is enabled on realtime.messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Add policy for conversations:<conversation_id> topics
CREATE POLICY "realtime: conversations participants only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'conversations:%' THEN
      public.is_conversation_participant(
        replace(realtime.topic(), 'conversations:', '')::uuid,
        auth.uid()
      )
    ELSE true
  END
);