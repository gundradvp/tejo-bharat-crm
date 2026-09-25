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
      (SELECT json_agg(json_build_object('value', assembly_id::text, 'label', constituency_name))
       FROM (
         SELECT DISTINCT assembly_id, constituency_name
         FROM jsp_kriya_members
         WHERE assembly_id IS NOT NULL
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
    ),
    'mandals', COALESCE(
      (SELECT json_agg(json_build_object('value', mandal_name, 'label', mandal_name))
       FROM (
         SELECT DISTINCT mandal_name
         FROM jsp_kriya_members
         WHERE mandal_name IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         ORDER BY mandal_name
       ) m),
      '[]'::json
    ),
    'panchayats', COALESCE(
      (SELECT json_agg(json_build_object('value', panchayat_name, 'label', panchayat_name))
       FROM (
         SELECT DISTINCT panchayat_name
         FROM jsp_kriya_members
         WHERE panchayat_name IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         ORDER BY panchayat_name
       ) p),
      '[]'::json
    )
  ) INTO result;
  RETURN result;
END;
$$;
