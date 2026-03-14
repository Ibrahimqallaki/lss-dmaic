DROP VIEW IF EXISTS public.project_collaborators_safe;

CREATE VIEW public.project_collaborators_safe
WITH (security_invoker = true)
AS
SELECT 
  pc.id,
  pc.project_id,
  pc.user_id,
  pc.invited_by,
  pc.created_at,
  CASE 
    WHEN public.is_project_owner(auth.uid(), pc.project_id) THEN pc.user_email
    ELSE NULL
  END as user_email,
  pc.role
FROM public.project_collaborators pc;