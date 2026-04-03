-- Remove duplicates, keeping only the most recent per (project_id, tool_id)
DELETE FROM public.project_calculations
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id, tool_id) id
  FROM public.project_calculations
  ORDER BY project_id, tool_id, created_at DESC
);

-- Add unique constraint
ALTER TABLE public.project_calculations
ADD CONSTRAINT project_calculations_project_tool_unique UNIQUE (project_id, tool_id);