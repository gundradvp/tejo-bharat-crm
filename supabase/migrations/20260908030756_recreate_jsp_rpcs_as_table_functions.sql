DROP FUNCTION IF EXISTS get_jsp_dashboard_stats(text);
DROP FUNCTION IF EXISTS get_jsp_filter_options(text);
DROP FUNCTION IF EXISTS get_jsp_mandals_for_constituency(text, text);
DROP FUNCTION IF EXISTS get_jsp_panchayats_for_mandal(text, text, text);

-- Dashboard stats: returns a TABLE with one row, PostgREST always returns an array
CREATE OR REPLACE FUNCTION get_jsp_dashboard_stats(volunteer_filter text DEFAULT NULL)
RETURNS TABLE(
  total_members bigint,
  completed_payments bigint,
  pending_members bigint,
  total_sadhaks bigint,
  phase_counts jsonb,
  top_sadhaks jsonb,
  assembly_counts jsonb,
  gender_counts jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_members,
    COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed')::bigint AS completed_payments,
    COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'pending')::bigint AS pending_members,
    COUNT(DISTINCT volunteername) FILTER (WHERE volunteername IS NOT NULL)::bigint AS total_sadhaks,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('phase', phase, 'count', cnt))
       FROM (
         SELECT LOWER(TRIM(phase)) AS phase, COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE phase IS NOT NULL AND phase != ''
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY LOWER(TRIM(phase))
       ) p),
      '[]'::jsonb
    ) AS phase_counts,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('volunteername', volunteername, 'volunteer_mobile', vmobile, 'count', cnt))
       FROM (
         SELECT volunteername, MAX(volunteer_mobile) AS vmobile, COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE volunteername IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY volunteername
         ORDER BY cnt DESC
         LIMIT 10
       ) s),
      '[]'::jsonb
    ) AS top_sadhaks,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('assembly_id', assembly_id, 'constituency_name', constituency_name, 'total', total, 'completed', completed, 'pending', pending))
       FROM (
         SELECT
           assembly_id,
           constituency_name,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed') AS completed,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'pending') AS pending
         FROM jsp_kriya_members
         WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY assembly_id, constituency_name
         ORDER BY total DESC
       ) a),
      '[]'::jsonb
    ) AS assembly_counts,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('gender', gender, 'count', cnt))
       FROM (
         SELECT
           CASE
             WHEN LOWER(TRIM(COALESCE(gender, ''))) IN ('m', 'male') THEN 'Male'
             WHEN LOWER(TRIM(COALESCE(gender, ''))) IN ('f', 'female') THEN 'Female'
             WHEN COALESCE(gender, '') = '' THEN 'Unknown'
             ELSE 'Other'
           END AS gender,
           COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY 1
       ) g),
      '[]'::jsonb
    ) AS gender_counts
  FROM jsp_kriya_members
  WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter);
END;
$$;

-- Filter option functions: each returns TABLE with simple columns
CREATE OR REPLACE FUNCTION get_jsp_assembly_options(volunteer_filter text DEFAULT NULL)
RETURNS TABLE(constituency_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT constituency_name::text
    FROM jsp_kriya_members
    WHERE constituency_name IS NOT NULL AND constituency_name != ''
      AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
    ORDER BY constituency_name;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_sadhak_options(volunteer_filter text DEFAULT NULL)
RETURNS TABLE(volunteername text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT volunteername::text
    FROM jsp_kriya_members
    WHERE volunteername IS NOT NULL
      AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
    ORDER BY volunteername;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_mandal_options(p_constituency text, volunteer_filter text DEFAULT NULL)
RETURNS TABLE(mandal_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT mandal_name::text
    FROM jsp_kriya_members
    WHERE mandal_name IS NOT NULL AND mandal_name != ''
      AND constituency_name = p_constituency
      AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
    ORDER BY mandal_name;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_panchayat_options(p_mandal text, p_constituency text DEFAULT NULL, volunteer_filter text DEFAULT NULL)
RETURNS TABLE(panchayat_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT panchayat_name::text
    FROM jsp_kriya_members
    WHERE panchayat_name IS NOT NULL AND panchayat_name != ''
      AND mandal_name = p_mandal
      AND (p_constituency IS NULL OR constituency_name = p_constituency)
      AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
    ORDER BY panchayat_name;
END;
$$;
