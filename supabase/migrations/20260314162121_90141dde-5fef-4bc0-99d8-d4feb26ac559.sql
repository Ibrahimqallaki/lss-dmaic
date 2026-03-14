
-- Tollgate checklists table
CREATE TABLE public.tollgate_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL CHECK (phase >= 1 AND phase <= 5),
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tollgate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tollgate items for accessible projects"
  ON public.tollgate_items FOR SELECT TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Editors can manage tollgate items"
  ON public.tollgate_items FOR INSERT TO authenticated
  WITH CHECK (public.is_project_editor(auth.uid(), project_id));

CREATE POLICY "Editors can update tollgate items"
  ON public.tollgate_items FOR UPDATE TO authenticated
  USING (public.is_project_editor(auth.uid(), project_id));

CREATE POLICY "Editors can delete tollgate items"
  ON public.tollgate_items FOR DELETE TO authenticated
  USING (public.is_project_editor(auth.uid(), project_id));

-- Control plans table
CREATE TABLE public.control_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  process_step TEXT NOT NULL,
  characteristic TEXT NOT NULL,
  specification TEXT,
  measurement_method TEXT,
  sample_size TEXT,
  frequency TEXT,
  responsible TEXT,
  reaction_plan TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.control_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view control plans for accessible projects"
  ON public.control_plans FOR SELECT TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Editors can create control plans"
  ON public.control_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

CREATE POLICY "Editors can update control plans"
  ON public.control_plans FOR UPDATE TO authenticated
  USING (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

CREATE POLICY "Editors can delete control plans"
  ON public.control_plans FOR DELETE TO authenticated
  USING (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

-- RACI matrix table
CREATE TABLE public.raci_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity TEXT NOT NULL,
  responsible TEXT,
  accountable TEXT,
  consulted TEXT,
  informed TEXT,
  phase INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.raci_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view RACI for accessible projects"
  ON public.raci_matrix FOR SELECT TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Editors can create RACI"
  ON public.raci_matrix FOR INSERT TO authenticated
  WITH CHECK (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

CREATE POLICY "Editors can update RACI"
  ON public.raci_matrix FOR UPDATE TO authenticated
  USING (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

CREATE POLICY "Editors can delete RACI"
  ON public.raci_matrix FOR DELETE TO authenticated
  USING (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

-- Sigma tracking table
CREATE TABLE public.sigma_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  phase INTEGER NOT NULL,
  sigma_level NUMERIC(5,3) NOT NULL,
  dpmo INTEGER,
  measurement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sigma_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sigma tracking for accessible projects"
  ON public.sigma_tracking FOR SELECT TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Editors can create sigma tracking"
  ON public.sigma_tracking FOR INSERT TO authenticated
  WITH CHECK (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

CREATE POLICY "Editors can update sigma tracking"
  ON public.sigma_tracking FOR UPDATE TO authenticated
  USING (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);

CREATE POLICY "Editors can delete sigma tracking"
  ON public.sigma_tracking FOR DELETE TO authenticated
  USING (public.is_project_editor(auth.uid(), project_id) AND auth.uid() = user_id);
