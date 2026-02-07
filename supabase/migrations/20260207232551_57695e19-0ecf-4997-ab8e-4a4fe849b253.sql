-- Drop all existing policies on projects table
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;

-- Recreate policies as PERMISSIVE (explicitly stated)
CREATE POLICY "Users can create their own projects"
ON public.projects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view accessible projects"
ON public.projects
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_project_access(auth.uid(), id));

CREATE POLICY "Users can update their own projects"
ON public.projects
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON public.projects
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Force schema reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';