CREATE OR REPLACE FUNCTION public.debug_auth_schema()
RETURNS TABLE(column_name TEXT, data_type TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT c.column_name::TEXT, c.data_type::TEXT
    FROM information_schema.columns c
    WHERE c.table_schema = 'auth' AND c.table_name = 'users';
END;
$$;
