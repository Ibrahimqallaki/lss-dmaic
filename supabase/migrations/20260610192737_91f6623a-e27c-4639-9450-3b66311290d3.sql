
DROP POLICY IF EXISTS "Users can view accessible project notes" ON public.project_notes;
CREATE POLICY "Users can view accessible project notes" ON public.project_notes FOR SELECT TO authenticated USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can view accessible project calculations" ON public.project_calculations;
CREATE POLICY "Users can view accessible project calculations" ON public.project_calculations FOR SELECT TO authenticated USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can view accessible project charts" ON public.project_control_charts;
CREATE POLICY "Users can view accessible project charts" ON public.project_control_charts FOR SELECT TO authenticated USING (public.has_project_access(auth.uid(), project_id));

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
