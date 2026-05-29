-- Allow all internal users (super_admin, admin, operator) to INSERT and UPDATE kocs
-- Previously kocs_insert_admin / kocs_update_admin used is_admin_or_super_admin(),
-- blocking operators from creating/editing KOCs and using bulk import.

DROP POLICY IF EXISTS "kocs_insert_admin" ON public.kocs;
DROP POLICY IF EXISTS "kocs_update_admin" ON public.kocs;

CREATE POLICY "kocs_insert_internal" ON public.kocs
  FOR INSERT WITH CHECK (public.is_internal_user());

CREATE POLICY "kocs_update_internal" ON public.kocs
  FOR UPDATE USING (public.is_internal_user());
