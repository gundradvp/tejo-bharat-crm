/*
# Recreate RPC for distinct EB filter values

## Purpose
The EB customer list has 113K+ rows. The current client-side approach fetches all rows
to compute distinct filter values, but Supabase's default response limit caps this at
~1000 rows, so many sections/mandals (like "U.KOTHAPALLI") never appear in the dropdowns.

## Changes
1. Drop existing get_eb_filter_values function (had different return type)
2. Recreate get_eb_filter_values() — SECURITY DEFINER, returns distinct sorted
   values for ero_name, section_name, status, category, mandal_name, sub_station_name
   from eb_customers, scoped to the caller's tenant_id.

## Security
- SECURITY DEFINER with explicit search_path
- Filters by tenant_id derived from the caller's auth.uid()
- No user-supplied parameters — no injection surface
*/

DROP FUNCTION IF EXISTS public.get_eb_filter_values();

CREATE FUNCTION public.get_eb_filter_values()
RETURNS TABLE (
  eros TEXT[],
  sections TEXT[],
  statuses TEXT[],
  categories TEXT[],
  mandals TEXT[],
  sub_stations TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT
      ARRAY[]::TEXT[],
      ARRAY[]::TEXT[],
      ARRAY[]::TEXT[],
      ARRAY[]::TEXT[],
      ARRAY[]::TEXT[],
      ARRAY[]::TEXT[];
    RETURN;
  END IF;

  RETURN QUERY SELECT
    COALESCE(ARRAY_AGG(DISTINCT ero_name) FILTER (WHERE ero_name IS NOT NULL), ARRAY[]::TEXT[]),
    COALESCE(ARRAY_AGG(DISTINCT section_name) FILTER (WHERE section_name IS NOT NULL), ARRAY[]::TEXT[]),
    COALESCE(ARRAY_AGG(DISTINCT status) FILTER (WHERE status IS NOT NULL), ARRAY[]::TEXT[]),
    COALESCE(ARRAY_AGG(DISTINCT category) FILTER (WHERE category IS NOT NULL), ARRAY[]::TEXT[]),
    COALESCE(ARRAY_AGG(DISTINCT mandal_name) FILTER (WHERE mandal_name IS NOT NULL), ARRAY[]::TEXT[]),
    COALESCE(ARRAY_AGG(DISTINCT sub_station_name) FILTER (WHERE sub_station_name IS NOT NULL), ARRAY[]::TEXT[])
  FROM eb_customers
  WHERE tenant_id = v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_eb_filter_values() TO authenticated;
