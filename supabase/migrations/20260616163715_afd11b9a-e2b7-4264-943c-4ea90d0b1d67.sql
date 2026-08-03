
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "realtime: messages participants only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'messages:%' THEN
      public.is_conversation_participant(
        replace(realtime.topic(), 'messages:', '')::uuid,
        auth.uid()
      )
    ELSE true
  END
);
