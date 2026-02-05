-- Create project_collaborators table
CREATE TABLE public.project_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  role TEXT DEFAULT 'editor' CHECK (role IN ('viewer', 'editor')),
  invited_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has access to a project (owner or collaborator)
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects WHERE id = _project_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators WHERE project_id = _project_id AND user_id = _user_id
  )
$$;

-- Function to check if user is project owner
CREATE OR REPLACE FUNCTION public.is_project_owner(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects WHERE id = _project_id AND user_id = _user_id
  )
$$;

-- RLS policies for project_collaborators
CREATE POLICY "Project owners can manage collaborators"
ON public.project_collaborators
FOR ALL
USING (public.is_project_owner(auth.uid(), project_id))
WITH CHECK (public.is_project_owner(auth.uid(), project_id));

CREATE POLICY "Collaborators can view their own collaborations"
ON public.project_collaborators
FOR SELECT
USING (user_id = auth.uid());

-- Update projects policies to include collaborators
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view accessible projects"
ON public.projects
FOR SELECT
USING (public.has_project_access(auth.uid(), id));

-- Update project_notes policies
DROP POLICY IF EXISTS "Users can view their own notes" ON public.project_notes;
CREATE POLICY "Users can view accessible project notes"
ON public.project_notes
FOR SELECT
USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can create their own notes" ON public.project_notes;
CREATE POLICY "Users can create notes in accessible projects"
ON public.project_notes
FOR INSERT
WITH CHECK (public.has_project_access(auth.uid(), project_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.project_notes;
CREATE POLICY "Users can update notes in accessible projects"
ON public.project_notes
FOR UPDATE
USING (public.has_project_access(auth.uid(), project_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.project_notes;
CREATE POLICY "Users can delete notes in accessible projects"
ON public.project_notes
FOR DELETE
USING (public.has_project_access(auth.uid(), project_id) AND auth.uid() = user_id);

-- Update project_calculations policies
DROP POLICY IF EXISTS "Users can view their own calculations" ON public.project_calculations;
CREATE POLICY "Users can view accessible project calculations"
ON public.project_calculations
FOR SELECT
USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can create their own calculations" ON public.project_calculations;
CREATE POLICY "Users can create calculations in accessible projects"
ON public.project_calculations
FOR INSERT
WITH CHECK (public.has_project_access(auth.uid(), project_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own calculations" ON public.project_calculations;
CREATE POLICY "Users can update calculations in accessible projects"
ON public.project_calculations
FOR UPDATE
USING (public.has_project_access(auth.uid(), project_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own calculations" ON public.project_calculations;
CREATE POLICY "Users can delete calculations in accessible projects"
ON public.project_calculations
FOR DELETE
USING (public.has_project_access(auth.uid(), project_id) AND auth.uid() = user_id);

-- Update project_control_charts policies
DROP POLICY IF EXISTS "Users can view their own charts" ON public.project_control_charts;
CREATE POLICY "Users can view accessible project charts"
ON public.project_control_charts
FOR SELECT
USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can create their own charts" ON public.project_control_charts;
CREATE POLICY "Users can create charts in accessible projects"
ON public.project_control_charts
FOR INSERT
WITH CHECK (public.has_project_access(auth.uid(), project_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own charts" ON public.project_control_charts;
CREATE POLICY "Users can update charts in accessible projects"
ON public.project_control_charts
FOR UPDATE
USING (public.has_project_access(auth.uid(), project_id) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own charts" ON public.project_control_charts;
CREATE POLICY "Users can delete charts in accessible projects"
ON public.project_control_charts
FOR DELETE
USING (public.has_project_access(auth.uid(), project_id) AND auth.uid() = user_id);