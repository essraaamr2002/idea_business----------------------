
-- Revoke column-level SELECT on sensitive project contact fields from end users.
REVOKE SELECT (phone, whatsapp) ON public.projects FROM anon, authenticated;

-- Revoke column-level SELECT on sensitive guarantor identity fields from end users.
-- Admin role still reads via has_role check at row level + table-level grant remains intact for service_role.
REVOKE SELECT (guarantor_id, guarantor_phone, signed_to_id, signed_to_passport)
  ON public.project_guarantees FROM anon, authenticated;
