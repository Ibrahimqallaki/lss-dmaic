-- Create a secure function to get project collaborators with email protection
CREATE OR REPLACE FUNCTION public.get_project_collaborators_safe(_project_id uuid)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  user_id uuid,
  role text,
  invited_by uuid,
  created_at timestamptz,
  user_email text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    pc.id,
    pc.project_id,
    pc.user_id,
    pc.role,
    pc.invited_by,
    pc.created_at,
    CASE 
      WHEN public.is_project_owner(auth.uid(), pc.project_id) THEN pc.user_email
      ELSE NULL
    END as user_email
  FROM public.project_collaborators pc
  WHERE pc.project_id = _project_id
    AND public.has_project_access(auth.uid(), pc.project_id)
  ORDER BY pc.created_at ASC;
$$;