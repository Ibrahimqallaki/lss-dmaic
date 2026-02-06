-- Create a helper function to check if user has editor role on a project
CREATE OR REPLACE FUNCTION public.is_project_editor(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Owner is always an editor
  SELECT EXISTS (
    SELECT 1 FROM public.projects WHERE id = _project_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators 
    WHERE project_id = _project_id 
      AND user_id = _user_id 
      AND role = 'editor'
  )
$$;

-- Update project_notes policies to enforce editor role for modifications
DROP POLICY IF EXISTS "Users can create notes in accessible projects" ON public.project_notes;
CREATE POLICY "Editors can create notes in accessible projects"
ON public.project_notes
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update notes in accessible projects" ON public.project_notes;
CREATE POLICY "Editors can update notes in accessible projects"
ON public.project_notes
FOR UPDATE
TO authenticated
USING (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete notes in accessible projects" ON public.project_notes;
CREATE POLICY "Editors can delete notes in accessible projects"
ON public.project_notes
FOR DELETE
TO authenticated
USING (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

-- Update project_calculations policies to enforce editor role for modifications
DROP POLICY IF EXISTS "Users can create calculations in accessible projects" ON public.project_calculations;
CREATE POLICY "Editors can create calculations in accessible projects"
ON public.project_calculations
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update calculations in accessible projects" ON public.project_calculations;
CREATE POLICY "Editors can update calculations in accessible projects"
ON public.project_calculations
FOR UPDATE
TO authenticated
USING (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete calculations in accessible projects" ON public.project_calculations;
CREATE POLICY "Editors can delete calculations in accessible projects"
ON public.project_calculations
FOR DELETE
TO authenticated
USING (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

-- Update project_control_charts policies to enforce editor role for modifications
DROP POLICY IF EXISTS "Users can create charts in accessible projects" ON public.project_control_charts;
CREATE POLICY "Editors can create charts in accessible projects"
ON public.project_control_charts
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update charts in accessible projects" ON public.project_control_charts;
CREATE POLICY "Editors can update charts in accessible projects"
ON public.project_control_charts
FOR UPDATE
TO authenticated
USING (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete charts in accessible projects" ON public.project_control_charts;
CREATE POLICY "Editors can delete charts in accessible projects"
ON public.project_control_charts
FOR DELETE
TO authenticated
USING (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);