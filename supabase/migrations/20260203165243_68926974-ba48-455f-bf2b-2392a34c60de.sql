-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  current_phase INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Create project_calculations table for storing calculator results
CREATE TABLE public.project_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  phase INTEGER NOT NULL,
  tool_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}',
  results JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_calculations
ALTER TABLE public.project_calculations ENABLE ROW LEVEL SECURITY;

-- Calculations policies
CREATE POLICY "Users can view their own calculations" ON public.project_calculations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calculations" ON public.project_calculations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calculations" ON public.project_calculations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calculations" ON public.project_calculations
  FOR DELETE USING (auth.uid() = user_id);

-- Create project_control_charts table for storing control chart data
CREATE TABLE public.project_control_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  chart_type TEXT NOT NULL,
  chart_name TEXT NOT NULL,
  data_points JSONB NOT NULL DEFAULT '[]',
  control_limits JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_control_charts
ALTER TABLE public.project_control_charts ENABLE ROW LEVEL SECURITY;

-- Control charts policies
CREATE POLICY "Users can view their own charts" ON public.project_control_charts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own charts" ON public.project_control_charts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own charts" ON public.project_control_charts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own charts" ON public.project_control_charts
  FOR DELETE USING (auth.uid() = user_id);

-- Create project_notes table for phase notes and analyses
CREATE TABLE public.project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  phase INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_notes
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- Notes policies
CREATE POLICY "Users can view their own notes" ON public.project_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" ON public.project_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON public.project_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON public.project_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_control_charts_updated_at
  BEFORE UPDATE ON public.project_control_charts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_notes_updated_at
  BEFORE UPDATE ON public.project_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();