CREATE OR REPLACE FUNCTION get_jsp_dashboard_stats(volunteer_filter text DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_members', COUNT(*),
    'completed_payments', COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed'),
    'pending_members', COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'pending'),
    'total_sadhaks', COUNT(DISTINCT volunteername) FILTER (WHERE volunteername IS NOT NULL),
    'phase_counts', COALESCE(
      (SELECT json_agg(json_build_object('phase', phase, 'count', cnt))
       FROM (
         SELECT LOWER(TRIM(phase)) AS phase, COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE phase IS NOT NULL AND phase != ''
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY LOWER(TRIM(phase))
       ) p),
      '[]'::json
    ),
    'top_sadhaks', COALESCE(
      (SELECT json_agg(json_build_object('volunteername', volunteername, 'volunteer_mobile', vmobile, 'count', cnt))
       FROM (
         SELECT volunteername, MAX(volunteer_mobile) AS vmobile, COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE volunteername IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY volunteername
         ORDER BY cnt DESC
         LIMIT 10
       ) s),
      '[]'::json
    ),
    'assembly_counts', COALESCE(
      (SELECT json_agg(json_build_object('assembly_id', assembly_id, 'constituency_name', constituency_name, 'total', total, 'completed', completed, 'pending', pending))
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
      '[]'::json
    ),
    'gender_counts', COALESCE(
      (SELECT json_agg(json_build_object('gender', gender, 'count', cnt))
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
      '[]'::json
    )
  ) INTO result
  FROM jsp_kriya_members
  WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter);

  RETURN result;
END;
$$;
