
ALTER TABLE public.projects 
ADD COLUMN estimated_savings numeric DEFAULT null,
ADD COLUMN actual_savings numeric DEFAULT null;
