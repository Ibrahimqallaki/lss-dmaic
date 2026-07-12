
CREATE TABLE public.benefit_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  period_month DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'realized',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT benefit_category_chk CHECK (category IN ('realized','forecast','avoidance'))
);

CREATE INDEX benefit_entries_project_idx ON public.benefit_entries(project_id, period_month);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefit_entries TO authenticated;
GRANT ALL ON public.benefit_entries TO service_role;

ALTER TABLE public.benefit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage benefit entries"
  ON public.benefit_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_benefit_entries_updated_at
  BEFORE UPDATE ON public.benefit_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
