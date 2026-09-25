/*
  # Fix search_villages_with_hierarchy return types

  1. Changes
    - Change all INT types to BIGINT to match actual table column types
    - This fixes the "structure of query does not match function result type" error
*/

-- Drop and recreate the function with correct BIGINT types
DROP FUNCTION IF EXISTS search_villages_with_hierarchy(TEXT, UUID, INT);

CREATE FUNCTION search_villages_with_hierarchy(
  search_term TEXT,
  user_tenant_id UUID DEFAULT NULL,
  result_limit INT DEFAULT 50
)
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  name_telugu TEXT,
  area_category TEXT,
  total_wards INT,
  tenant_id UUID,
  mandal_id BIGINT,
  mandal_name TEXT,
  constituency_id BIGINT,
  constituency_name TEXT,
  district_id BIGINT,
  district_name TEXT,
  state_id BIGINT,
  state_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- If user_tenant_id is not provided, get it from the current user's profile
  IF user_tenant_id IS NULL THEN
    SELECT p.tenant_id INTO v_tenant_id
    FROM profiles p
    WHERE p.id = auth.uid();
    
    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Could not determine tenant_id for user %', auth.uid();
    END IF;
  ELSE
    v_tenant_id := user_tenant_id;
  END IF;

  RETURN QUERY
  SELECT 
    v.id,
    v.name,
    v.name_telugu,
    v.area_category,
    v.total_wards,
    v.tenant_id,
    m.id as mandal_id,
    m.name as mandal_name,
    c.id as constituency_id,
    c.name as constituency_name,
    d.id as district_id,
    d.name as district_name,
    s.id as state_id,
    s.name as state_name
  FROM villages v
  JOIN mandals m ON v.mandal_id = m.id AND v.tenant_id = m.tenant_id
  JOIN constituencies c ON m.constituency_id = c.id AND m.tenant_id = c.tenant_id
  JOIN districts d ON c.district_id = d.id AND c.tenant_id = d.tenant_id
  JOIN states s ON d.state_id = s.id AND d.tenant_id = s.tenant_id
  WHERE v.tenant_id = v_tenant_id
  AND (
    v.name ILIKE '%' || search_term || '%' 
    OR v.name_telugu ILIKE '%' || search_term || '%'
  )
  ORDER BY v.name
  LIMIT result_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_villages_with_hierarchy(TEXT, UUID, INT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION search_villages_with_hierarchy IS 
'Search villages by name with full location hierarchy. Auto-detects tenant from auth.uid() if not provided. Uses BIGINT for all ID fields.';
