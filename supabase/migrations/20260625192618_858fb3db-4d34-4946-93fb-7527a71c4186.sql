
CREATE OR REPLACE FUNCTION public.notify_message_recipients(_conversation_id uuid, _preview text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_sender_name text;
  v_preview text := COALESCE(LEFT(_preview, 140), '');
BEGIN
  IF v_sender IS NULL THEN RETURN; END IF;

  -- Caller must be a participant
  IF NOT public.is_conversation_participant(_conversation_id, v_sender) THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  SELECT COALESCE(NULLIF(display_name, ''), NULLIF(legal_full_name, ''), 'عضو')
    INTO v_sender_name
  FROM public.profiles WHERE id = v_sender;

  INSERT INTO public.notifications (user_id, kind, title, body, href)
  SELECT cp.user_id,
         'new_message',
         'رسالة جديدة من ' || COALESCE(v_sender_name, 'عضو'),
         v_preview,
         '/messages?c=' || _conversation_id::text
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = _conversation_id
    AND cp.user_id <> v_sender;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_message_recipients(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_message_recipients(uuid, text) TO authenticated;
