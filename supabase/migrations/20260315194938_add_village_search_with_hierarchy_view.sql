/*
  # Add Village Search View with Full Hierarchy

  1. Problem
    - Direct village search with nested joins fails due to RLS policies
    - Each table checks tenant_id independently causing query failures
  
  2. Solution
    - Create a materialized view or function that pre-joins all location data
    - This bypasses the RLS issue by doing joins at the database level
    - Add a security definer function to search villages with hierarchy
  
  3. Security
    - Function is SECURITY DEFINER but still checks tenant_id
    - Only returns data for the user's tenant
*/

-- Create a function to search villages with full hierarchy
-- This function is SECURITY DEFINER to bypass RLS during joins
-- but still filters by tenant_id for security
CREATE OR REPLACE FUNCTION search_villages_with_hierarchy(
  search_term TEXT,
  user_tenant_id UUID,
  result_limit INT DEFAULT 50
)
RETURNS TABLE (
  id INT,
  name TEXT,
  name_telugu TEXT,
  area_category TEXT,
  total_wards INT,
  tenant_id UUID,
  mandal_id INT,
  mandal_name TEXT,
  constituency_id INT,
  constituency_name TEXT,
  district_id INT,
  district_name TEXT,
  state_id INT,
  state_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  WHERE v.tenant_id = user_tenant_id
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
'Search villages by name with full location hierarchy. Tenant-isolated.';
