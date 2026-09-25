CREATE OR REPLACE FUNCTION get_jsp_filter_options(volunteer_filter text DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'assemblies', COALESCE(
      (SELECT json_agg(json_build_object('value', constituency_name, 'label', constituency_name))
       FROM (
         SELECT DISTINCT constituency_name
         FROM jsp_kriya_members
         WHERE constituency_name IS NOT NULL AND constituency_name != ''
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         ORDER BY constituency_name
       ) a),
      '[]'::json
    ),
    'sadhaks', COALESCE(
      (SELECT json_agg(json_build_object('value', volunteername, 'label', volunteername))
       FROM (
         SELECT DISTINCT volunteername
         FROM jsp_kriya_members
         WHERE volunteername IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         ORDER BY volunteername
       ) s),
      '[]'::json
    )
  ) INTO result;
  RETURN result;
END;
$$;
