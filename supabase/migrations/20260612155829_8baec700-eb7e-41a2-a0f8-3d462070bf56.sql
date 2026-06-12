
ALTER POLICY "Users can view their own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can create their own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can update their own profile" ON public.profiles TO authenticated;
ALTER POLICY "Project owners can manage collaborators" ON public.project_collaborators TO authenticated;
ALTER POLICY "Collaborators can view their own collaborations" ON public.project_collaborators TO authenticated;
