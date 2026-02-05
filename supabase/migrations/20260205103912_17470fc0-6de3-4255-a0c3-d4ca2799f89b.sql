-- Drop and recreate INSERT policy for projects as PERMISSIVE (default)
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
CREATE POLICY "Users can create their own projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also fix UPDATE and DELETE policies to be PERMISSIVE
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects"
ON public.projects
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);