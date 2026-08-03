-- Admin read access on ledger for dispute investigation
CREATE POLICY "ledger_admin_read" ON public.ledger
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Tighten project_guarantees: only admins (and the guarantor themselves where applicable) can read PII rows.
-- Drop the existing owner-read policy and replace with admin-only SELECT.
DROP POLICY IF EXISTS "guarantees_owner_read" ON public.project_guarantees;
DROP POLICY IF EXISTS "project_guarantees_owner_read" ON public.project_guarantees;
DROP POLICY IF EXISTS "Owners can read guarantees" ON public.project_guarantees;
DROP POLICY IF EXISTS "owners_read_guarantees" ON public.project_guarantees;

CREATE POLICY "guarantees_admin_read" ON public.project_guarantees
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
