DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_guarantees'
      AND policyname = 'guarantees_owner_insert'
  ) THEN
    CREATE POLICY guarantees_owner_insert
    ON public.project_guarantees
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_guarantees.project_id
          AND p.owner_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_guarantees'
      AND policyname = 'guarantees_owner_update'
  ) THEN
    CREATE POLICY guarantees_owner_update
    ON public.project_guarantees
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_guarantees.project_id
          AND p.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_guarantees.project_id
          AND p.owner_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_guarantees'
      AND policyname = 'guarantees_owner_delete'
  ) THEN
    CREATE POLICY guarantees_owner_delete
    ON public.project_guarantees
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_guarantees.project_id
          AND p.owner_id = auth.uid()
      )
    );
  END IF;
END $$;