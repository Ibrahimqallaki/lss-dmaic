-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Also notify for config reload to ensure policies are refreshed
NOTIFY pgrst, 'reload config';