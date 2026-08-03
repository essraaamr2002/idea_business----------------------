
-- 1) Realtime: استبدال ELSE true بـ false
DROP POLICY IF EXISTS "realtime: conversations participants only" ON realtime.messages;
CREATE POLICY "realtime: conversations participants only" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN realtime.topic() LIKE 'conversations:%'
        THEN public.is_conversation_participant((replace(realtime.topic(),'conversations:',''))::uuid, auth.uid())
      ELSE false
    END
  );

DROP POLICY IF EXISTS "realtime: messages participants only" ON realtime.messages;
CREATE POLICY "realtime: messages participants only" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN realtime.topic() LIKE 'messages:%'
        THEN public.is_conversation_participant((replace(realtime.topic(),'messages:',''))::uuid, auth.uid())
      ELSE false
    END
  );

-- 2) user_roles: حصر السياسات على authenticated فقط
DROP POLICY IF EXISTS roles_self_read ON public.user_roles;
CREATE POLICY roles_self_read ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS roles_admin_all ON public.user_roles;
CREATE POLICY roles_admin_all ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.user_roles FROM anon;

-- 3) KYC Storage: deny صريح للمستخدمين على UPDATE/DELETE (المشرف فقط)
DROP POLICY IF EXISTS "kyc deny user update" ON storage.objects;
CREATE POLICY "kyc deny user update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "kyc deny user delete" ON storage.objects;
CREATE POLICY "kyc deny user delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(),'admin'));
