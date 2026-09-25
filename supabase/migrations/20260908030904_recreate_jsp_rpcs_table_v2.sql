DROP FUNCTION IF EXISTS get_jsp_dashboard_stats(text);
DROP FUNCTION IF EXISTS get_jsp_assembly_options(text);
DROP FUNCTION IF EXISTS get_jsp_sadhak_options(text);
DROP FUNCTION IF EXISTS get_jsp_mandal_options(text, text);
DROP FUNCTION IF EXISTS get_jsp_panchayat_options(text, text, text);

-- Dashboard stats: returns a TABLE with one row
CREATE OR REPLACE FUNCTION get_jsp_dashboard_stats(p_volunteer_filter text DEFAULT NULL)
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
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed')::bigint,
    COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'pending')::bigint,
    COUNT(DISTINCT volunteername) FILTER (WHERE volunteername IS NOT NULL)::bigint,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('phase', p.phase, 'count', p.cnt))
       FROM (
         SELECT LOWER(TRIM(m.phase)) AS phase, COUNT(*) AS cnt
         FROM jsp_kriya_members m
         WHERE m.phase IS NOT NULL AND m.phase != ''
           AND (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
         GROUP BY LOWER(TRIM(m.phase))
       ) p),
      '[]'::jsonb
    ),
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('volunteername', s.volunteername, 'volunteer_mobile', s.vmobile, 'count', s.cnt))
       FROM (
         SELECT m.volunteername, MAX(m.volunteer_mobile) AS vmobile, COUNT(*) AS cnt
         FROM jsp_kriya_members m
         WHERE m.volunteername IS NOT NULL
           AND (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
         GROUP BY m.volunteername
         ORDER BY cnt DESC
         LIMIT 10
       ) s),
      '[]'::jsonb
    ),
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('assembly_id', a.assembly_id, 'constituency_name', a.constituency_name, 'total', a.total, 'completed', a.completed, 'pending', a.pending))
       FROM (
         SELECT
           m.assembly_id,
           m.constituency_name,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(m.status, '')) = 'completed') AS completed,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(m.status, '')) = 'pending') AS pending
         FROM jsp_kriya_members m
         WHERE (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
         GROUP BY m.assembly_id, m.constituency_name
         ORDER BY total DESC
       ) a),
      '[]'::jsonb
    ),
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('gender', g.gender, 'count', g.cnt))
       FROM (
         SELECT
           CASE
             WHEN LOWER(TRIM(COALESCE(m.gender, ''))) IN ('m', 'male') THEN 'Male'
             WHEN LOWER(TRIM(COALESCE(m.gender, ''))) IN ('f', 'female') THEN 'Female'
             WHEN COALESCE(m.gender, '') = '' THEN 'Unknown'
             ELSE 'Other'
           END AS gender,
           COUNT(*) AS cnt
         FROM jsp_kriya_members m
         WHERE (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
         GROUP BY 1
       ) g),
      '[]'::jsonb
    )
  FROM jsp_kriya_members m
  WHERE (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter);
END;
$$;

-- Filter option functions with aliased output columns to avoid ambiguity
CREATE OR REPLACE FUNCTION get_jsp_assembly_options(p_volunteer_filter text DEFAULT NULL)
RETURNS TABLE(assembly_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT m.constituency_name::text
    FROM jsp_kriya_members m
    WHERE m.constituency_name IS NOT NULL AND m.constituency_name != ''
      AND (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
    ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_sadhak_options(p_volunteer_filter text DEFAULT NULL)
RETURNS TABLE(sadhak_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT m.volunteername::text
    FROM jsp_kriya_members m
    WHERE m.volunteername IS NOT NULL
      AND (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
    ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_mandal_options(p_constituency text, p_volunteer_filter text DEFAULT NULL)
RETURNS TABLE(mandal_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT m.mandal_name::text
    FROM jsp_kriya_members m
    WHERE m.mandal_name IS NOT NULL AND m.mandal_name != ''
      AND m.constituency_name = p_constituency
      AND (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
    ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_panchayat_options(p_mandal text, p_constituency text DEFAULT NULL, p_volunteer_filter text DEFAULT NULL)
RETURNS TABLE(panchayat_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT m.panchayat_name::text
    FROM jsp_kriya_members m
    WHERE m.panchayat_name IS NOT NULL AND m.panchayat_name != ''
      AND m.mandal_name = p_mandal
      AND (p_constituency IS NULL OR m.constituency_name = p_constituency)
      AND (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
    ORDER BY 1;
END;
$$;

-- Add indexes to speed up the dashboard queries
CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_volunteername ON jsp_kriya_members(volunteername);
CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_constituency ON jsp_kriya_members(constituency_name);
CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_mandal ON jsp_kriya_members(mandal_name);
CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_status ON jsp_kriya_members(status);
CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_phase ON jsp_kriya_members(phase);
