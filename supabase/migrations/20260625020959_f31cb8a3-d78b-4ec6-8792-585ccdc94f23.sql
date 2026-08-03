DROP POLICY IF EXISTS projects_authenticated_read ON public.projects;
CREATE POLICY projects_authenticated_read
ON public.projects
FOR SELECT
TO authenticated
USING (
  status = ANY (ARRAY['active'::project_status, 'halted'::project_status, 'closed'::project_status])
  OR owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);