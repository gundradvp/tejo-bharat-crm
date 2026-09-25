CREATE OR REPLACE FUNCTION get_jsp_mandals_for_constituency(p_constituency text, volunteer_filter text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('value', mandal_name, 'label', mandal_name)), '[]'::jsonb)
  INTO result
  FROM (
    SELECT DISTINCT mandal_name
    FROM jsp_kriya_members
    WHERE mandal_name IS NOT NULL AND mandal_name != ''
      AND constituency_name = p_constituency
      AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
    ORDER BY mandal_name
  ) m;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_panchayats_for_mandal(p_mandal text, p_constituency text DEFAULT NULL, volunteer_filter text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('value', panchayat_name, 'label', panchayat_name)), '[]'::jsonb)
  INTO result
  FROM (
    SELECT DISTINCT panchayat_name
    FROM jsp_kriya_members
    WHERE panchayat_name IS NOT NULL AND panchayat_name != ''
      AND mandal_name = p_mandal
      AND (p_constituency IS NULL OR constituency_name = p_constituency)
      AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
    ORDER BY panchayat_name
  ) p;

  RETURN result;
END;
$$;
