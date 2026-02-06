-- Drop and recreate the view with SECURITY INVOKER to fix the linter warning
DROP VIEW IF EXISTS public.project_collaborators_safe;

CREATE VIEW public.project_collaborators_safe
WITH (security_invoker = true) AS
SELECT 
  id,
  project_id,
  user_id,
  role,
  invited_by,
  created_at,
  CASE 
    WHEN public.is_project_owner(auth.uid(), project_id) THEN user_email
    ELSE NULL
  END as user_email
FROM public.project_collaborators;

-- Grant appropriate permissions on the view
GRANT SELECT ON public.project_collaborators_safe TO authenticated;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.project_collaborators_safe IS 'Secure view that hides email addresses from non-owners to prevent email harvesting. Uses SECURITY INVOKER to respect RLS policies.';