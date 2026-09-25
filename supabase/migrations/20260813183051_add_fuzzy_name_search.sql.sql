/*
# Add fuzzy name search for EB customers and prospects

## Purpose
Enable fuzzy matching for customer names so that "Gundra Veni", "Gundraveni",
"Veni Gundra", "VeniGundra", and even typos like "Gundar Veni" all find
"Gundra Ganga Veni".

## Approach
1. Enable pg_trgm extension for trigram-based typo tolerance
2. Create fuzzy_name_match() function that:
   a. Does case-insensitive substring match (handles partial names)
   b. Does space-insensitive match ("Gundraveni" matches "Gundra Ganga Veni")
   c. Does token-based match — all search tokens must appear as substrings
      in the name, in ANY order ("Veni Gundra" matches "Gundra Ganga Veni")
   d. Falls back to trigram similarity for typo tolerance (>0.3 threshold)
3. Update both search RPCs to use fuzzy_name_match for name fields,
   and handle the case when no bill conditions are provided (so the RPC
   is always called, not just for bill-filtered queries)
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.fuzzy_name_match(p_name TEXT, p_search TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_name TEXT;
  v_search TEXT;
  v_name_nospace TEXT;
  v_search_nospace TEXT;
  v_tokens TEXT[];
  v_token TEXT;
  v_all_match BOOLEAN;
BEGIN
  IF p_search IS NULL OR trim(p_search) = '' THEN
    RETURN TRUE;
  END IF;
  IF p_name IS NULL THEN
    RETURN FALSE;
  END IF;

  v_name := lower(trim(p_name));
  v_search := lower(trim(p_search));
  v_name_nospace := replace(v_name, ' ', '');
  v_search_nospace := replace(v_search, ' ', '');

  -- 1. Case-insensitive substring match
  IF position(v_search in v_name) > 0 THEN
    RETURN TRUE;
  END IF;

  -- 2. Space-insensitive match ("gundraveni" in "gundragangaveni")
  IF position(v_search_nospace in v_name_nospace) > 0 THEN
    RETURN TRUE;
  END IF;

  -- 3. All tokens appear as substrings (handles word order: "Veni Gundra")
  v_tokens := regexp_split_to_array(v_search, '\s+');
  v_all_match := TRUE;
  FOREACH v_token IN ARRAY v_tokens LOOP
    IF v_token = '' THEN CONTINUE; END IF;
    IF position(v_token in v_name) = 0 THEN
      v_all_match := FALSE;
      EXIT;
    END IF;
  END LOOP;
  IF v_all_match AND array_length(v_tokens, 1) > 0 THEN
    RETURN TRUE;
  END IF;

  -- 4. Trigram similarity for typo tolerance (e.g. "Gundar" vs "Gundra")
  IF similarity(v_name_nospace, v_search_nospace) > 0.3 THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fuzzy_name_match(TEXT, TEXT) TO authenticated;

-- ============================================================
-- Replace filter_eb_customers_by_bills with unified search RPC
-- that handles both bill-filtered and non-bill queries + fuzzy search
-- ============================================================
DROP FUNCTION IF EXISTS public.filter_eb_customers_by_bills(
  JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT
);

CREATE OR REPLACE FUNCTION public.search_eb_customers(
  p_search TEXT DEFAULT NULL,
  p_ero TEXT DEFAULT NULL,
  p_section TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_call_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_mandal TEXT DEFAULT NULL,
  p_sub_station TEXT DEFAULT NULL,
  bill_conditions JSONB DEFAULT '[]'::JSONB,
  p_page_size INT DEFAULT 50,
  p_page_offset INT DEFAULT 0
)
RETURNS TABLE (rows JSON, total_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_where TEXT := '';
  v_bill_clause TEXT := '';
  v_has_bill_cond BOOLEAN := false;
  v_cond JSONB;
  v_column TEXT;
  v_operator TEXT;
  v_value NUMERIC;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT '[]'::JSON, 0::BIGINT;
    RETURN;
  END IF;

  v_where := 'ec.tenant_id = ' || quote_literal(v_tenant_id);

  -- Fuzzy name search + exact matches on SC number / meter / mobile
  IF p_search IS NOT NULL AND p_search <> '' THEN
    v_where := v_where || ' AND ('
      || 'fuzzy_name_match(ec.customer_name, ' || quote_literal(p_search) || ')'
      || ' OR ec.sc_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
      || ' OR ec.meter_no ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
      || ' OR ec.mobile_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
      || ' OR ec.phone ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'')';
  END IF;
  IF p_ero IS NOT NULL AND p_ero <> 'all' THEN v_where := v_where || ' AND ec.ero_name = ' || quote_literal(p_ero); END IF;
  IF p_section IS NOT NULL AND p_section <> 'all' THEN v_where := v_where || ' AND ec.section_name = ' || quote_literal(p_section); END IF;
  IF p_status IS NOT NULL AND p_status <> 'all' THEN v_where := v_where || ' AND ec.status = ' || quote_literal(p_status); END IF;
  IF p_call_status IS NOT NULL AND p_call_status <> 'all' THEN v_where := v_where || ' AND ec.call_status = ' || quote_literal(p_call_status); END IF;
  IF p_category IS NOT NULL AND p_category <> 'all' THEN v_where := v_where || ' AND ec.category = ' || quote_literal(p_category); END IF;
  IF p_mandal IS NOT NULL AND p_mandal <> 'all' THEN v_where := v_where || ' AND ec.mandal_name = ' || quote_literal(p_mandal); END IF;
  IF p_sub_station IS NOT NULL AND p_sub_station <> 'all' THEN v_where := v_where || ' AND ec.sub_station_name = ' || quote_literal(p_sub_station); END IF;

  -- Build bill conditions
  IF jsonb_array_length(bill_conditions) > 0 THEN
    FOR v_cond IN SELECT jsonb_array_elements(bill_conditions) LOOP
      v_column := v_cond->>'column';
      v_operator := v_cond->>'operator';
      v_value := (v_cond->>'value')::NUMERIC;
      IF v_column NOT IN ('bill_amount', 'billed_units') THEN CONTINUE; END IF;
      IF v_operator NOT IN ('gte', 'gt', 'lte', 'lt', 'eq') THEN CONTINUE; END IF;
      IF v_bill_clause <> '' THEN v_bill_clause := v_bill_clause || ' AND '; END IF;
      v_bill_clause := v_bill_clause || format('eb.%s %s %s',
        quote_ident(v_column),
        CASE v_operator WHEN 'gte' THEN '>=' WHEN 'gt' THEN '>' WHEN 'lte' THEN '<=' WHEN 'lt' THEN '<' WHEN 'eq' THEN '=' END,
        v_value::TEXT);
    END LOOP;
  END IF;

  v_has_bill_cond := v_bill_clause <> '';

  IF v_has_bill_cond THEN
    -- With bill filter: customer must have at least one matching bill
    EXECUTE format(
      'SELECT count(*) FROM eb_customers ec WHERE %s AND EXISTS (SELECT 1 FROM eb_customer_bills eb WHERE eb.eb_customer_id = ec.id AND eb.tenant_id = ec.tenant_id AND %s)',
      v_where, v_bill_clause
    ) INTO total_count;

    EXECUTE format(
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) FROM (
        SELECT ec.id, ec.tenant_id, ec.ero_name, ec.section_name, ec.area_name,
               ec.sc_number, ec.sur_name, ec.customer_name, ec.fhp_name,
               ec.address1, ec.address2, ec.address3, ec.address4,
               ec.category, ec.uksc_number, ec.contracted_load, ec.connected_load,
               ec.load_unit, ec.phase, ec.sm_mtr, ec.sub_group,
               ec.trans_struc_code, ec.feeder_no, ec.feeder_name,
               ec.sub_station_name, ec.feeder_type, ec.pol_no,
               ec.service_type, ec.supply_release_date, ec.status,
               ec.phone, ec.sd_amount, ec.multpf, ec.cat_iiib_flag,
               ec.meter_no, ec.meter_make, ec.meter_capacity, ec.metering_side,
               ec.mus_flag, ec.colony_name, ec.assembly_constituency,
               ec.mandal_name, ec.panchayath_name, ec.sc_st_flag,
               ec.aadhaar_number, ec.mobile_number, ec.ir_flag,
               ec.call_status, ec.remark, ec.last_called_at, ec.called_by,
               ec.follow_up_date, ec.created_at, ec.updated_at,
               (SELECT json_build_object(''id'', p.id, ''full_name'', p.full_name) FROM profiles p WHERE p.id = ec.called_by) AS called_by_profile
        FROM eb_customers ec WHERE %s AND EXISTS (SELECT 1 FROM eb_customer_bills eb WHERE eb.eb_customer_id = ec.id AND eb.tenant_id = ec.tenant_id AND %s)
        ORDER BY ec.created_at DESC LIMIT %s OFFSET %s
      ) t',
      v_where, v_bill_clause, p_page_size, p_page_offset
    ) INTO rows;
  ELSE
    -- No bill filter: regular paginated query
    EXECUTE format(
      'SELECT count(*) FROM eb_customers ec WHERE %s', v_where
    ) INTO total_count;

    EXECUTE format(
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) FROM (
        SELECT ec.id, ec.tenant_id, ec.ero_name, ec.section_name, ec.area_name,
               ec.sc_number, ec.sur_name, ec.customer_name, ec.fhp_name,
               ec.address1, ec.address2, ec.address3, ec.address4,
               ec.category, ec.uksc_number, ec.contracted_load, ec.connected_load,
               ec.load_unit, ec.phase, ec.sm_mtr, ec.sub_group,
               ec.trans_struc_code, ec.feeder_no, ec.feeder_name,
               ec.sub_station_name, ec.feeder_type, ec.pol_no,
               ec.service_type, ec.supply_release_date, ec.status,
               ec.phone, ec.sd_amount, ec.multpf, ec.cat_iiib_flag,
               ec.meter_no, ec.meter_make, ec.meter_capacity, ec.metering_side,
               ec.mus_flag, ec.colony_name, ec.assembly_constituency,
               ec.mandal_name, ec.panchayath_name, ec.sc_st_flag,
               ec.aadhaar_number, ec.mobile_number, ec.ir_flag,
               ec.call_status, ec.remark, ec.last_called_at, ec.called_by,
               ec.follow_up_date, ec.created_at, ec.updated_at,
               (SELECT json_build_object(''id'', p.id, ''full_name'', p.full_name) FROM profiles p WHERE p.id = ec.called_by) AS called_by_profile
        FROM eb_customers ec WHERE %s
        ORDER BY ec.created_at DESC LIMIT %s OFFSET %s
      ) t',
      v_where, p_page_size, p_page_offset
    ) INTO rows;
  END IF;

  RETURN QUERY SELECT rows, total_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_eb_customers(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, INT, INT
) TO authenticated;

-- ============================================================
-- Replace filter_prospects_by_bills with unified search RPC
-- ============================================================
DROP FUNCTION IF EXISTS public.filter_prospects_by_bills(
  JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.search_prospects(
  p_search TEXT DEFAULT NULL,
  p_circle TEXT DEFAULT NULL,
  p_division TEXT DEFAULT NULL,
  p_subdiv TEXT DEFAULT NULL,
  p_ero TEXT DEFAULT NULL,
  p_section TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_call_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_mandal TEXT DEFAULT NULL,
  p_sub_station TEXT DEFAULT NULL,
  bill_conditions JSONB DEFAULT '[]'::JSONB,
  p_page_size INT DEFAULT 50,
  p_page_offset INT DEFAULT 0
)
RETURNS TABLE (rows JSON, total_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_where TEXT := '';
  v_bill_clause TEXT := '';
  v_has_bill_cond BOOLEAN := false;
  v_cond JSONB;
  v_column TEXT;
  v_operator TEXT;
  v_value NUMERIC;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT '[]'::JSON, 0::BIGINT;
    RETURN;
  END IF;

  v_where := 'lp.tenant_id = ' || quote_literal(v_tenant_id);

  -- Fuzzy name search + exact on SC/meter/village
  IF p_search IS NOT NULL AND p_search <> '' THEN
    v_where := v_where || ' AND ('
      || 'fuzzy_name_match(lp.customer_name, ' || quote_literal(p_search) || ')'
      || ' OR fuzzy_name_match(lp.village_name, ' || quote_literal(p_search) || ')'
      || ' OR lp.sc_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
      || ' OR lp.meter_no ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
      || ' OR lp.np_registration_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
      || ' OR lp.ep_registration_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'')';
  END IF;
  IF p_circle IS NOT NULL AND p_circle <> 'all' THEN v_where := v_where || ' AND lp.circle_name = ' || quote_literal(p_circle); END IF;
  IF p_division IS NOT NULL AND p_division <> 'all' THEN v_where := v_where || ' AND lp.division_name = ' || quote_literal(p_division); END IF;
  IF p_subdiv IS NOT NULL AND p_subdiv <> 'all' THEN v_where := v_where || ' AND lp.subdiv_name = ' || quote_literal(p_subdiv); END IF;
  IF p_ero IS NOT NULL AND p_ero <> 'all' THEN v_where := v_where || ' AND lp.ero_name = ' || quote_literal(p_ero); END IF;
  IF p_section IS NOT NULL AND p_section <> 'all' THEN v_where := v_where || ' AND lp.section_name = ' || quote_literal(p_section); END IF;
  IF p_status IS NOT NULL AND p_status <> 'all' THEN v_where := v_where || ' AND lp.eb_status = ' || quote_literal(p_status); END IF;
  IF p_call_status IS NOT NULL AND p_call_status <> 'all' THEN v_where := v_where || ' AND lp.call_status = ' || quote_literal(p_call_status); END IF;
  IF p_category IS NOT NULL AND p_category <> 'all' THEN v_where := v_where || ' AND lp.category = ' || quote_literal(p_category); END IF;
  IF p_mandal IS NOT NULL AND p_mandal <> 'all' THEN v_where := v_where || ' AND lp.mandal_name = ' || quote_literal(p_mandal); END IF;
  IF p_sub_station IS NOT NULL AND p_sub_station <> 'all' THEN v_where := v_where || ' AND lp.sub_station_name = ' || quote_literal(p_sub_station); END IF;

  IF jsonb_array_length(bill_conditions) > 0 THEN
    FOR v_cond IN SELECT jsonb_array_elements(bill_conditions) LOOP
      v_column := v_cond->>'column';
      v_operator := v_cond->>'operator';
      v_value := (v_cond->>'value')::NUMERIC;
      IF v_column NOT IN ('bill_amount', 'billed_units') THEN CONTINUE; END IF;
      IF v_operator NOT IN ('gte', 'gt', 'lte', 'lt', 'eq') THEN CONTINUE; END IF;
      IF v_bill_clause <> '' THEN v_bill_clause := v_bill_clause || ' AND '; END IF;
      v_bill_clause := v_bill_clause || format('eb.%s %s %s', quote_ident(v_column),
        CASE v_operator WHEN 'gte' THEN '>=' WHEN 'gt' THEN '>' WHEN 'lte' THEN '<=' WHEN 'lt' THEN '<' WHEN 'eq' THEN '=' END,
        v_value::TEXT);
    END LOOP;
  END IF;

  v_has_bill_cond := v_bill_clause <> '';

  IF v_has_bill_cond THEN
    EXECUTE format(
      'SELECT count(*) FROM lead_prospects lp WHERE %s AND EXISTS (SELECT 1 FROM eb_customer_bills eb WHERE eb.sc_number = lp.sc_number AND eb.tenant_id = lp.tenant_id AND %s)',
      v_where, v_bill_clause
    ) INTO total_count;
    EXECUTE format(
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) FROM (
        SELECT lp.id, lp.tenant_id, lp.serial_number, lp.circle_name, lp.division_name, lp.subdiv_name, lp.section_name, lp.sc_number,
               lp.existing_load_kw, lp.existing_solar_load_kw, lp.applied_solar_load_kw, lp.np_registration_number, lp.ep_registration_number,
               lp.complaint_date, lp.mobile_number, lp.email, lp.national_portal_status, lp.epdcl_portal_status, lp.village_name,
               lp.bill_amount_1, lp.bill_month_1, lp.bill_amount_2, lp.bill_month_2, lp.bill_amount_3, lp.bill_month_3,
               lp.call_status, lp.remark, lp.last_called_at, lp.called_by, lp.follow_up_date, lp.is_existing_customer, lp.linked_customer_id,
               lp.created_at, lp.updated_at, lp.ero_name, lp.mandal_name, lp.sub_station_name, lp.category, lp.customer_name, lp.area_name,
               lp.contracted_load, lp.connected_load, lp.load_unit, lp.phase, lp.eb_status, lp.meter_no, lp.feeder_name,
               lp.panchayath_name, lp.assembly_constituency,
               (SELECT json_build_object(''id'', p.id, ''full_name'', p.full_name) FROM profiles p WHERE p.id = lp.called_by) AS called_by_profile
        FROM lead_prospects lp WHERE %s AND EXISTS (SELECT 1 FROM eb_customer_bills eb WHERE eb.sc_number = lp.sc_number AND eb.tenant_id = lp.tenant_id AND %s)
        ORDER BY lp.created_at DESC LIMIT %s OFFSET %s
      ) t',
      v_where, v_bill_clause, p_page_size, p_page_offset
    ) INTO rows;
  ELSE
    EXECUTE format(
      'SELECT count(*) FROM lead_prospects lp WHERE %s', v_where
    ) INTO total_count;
    EXECUTE format(
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) FROM (
        SELECT lp.id, lp.tenant_id, lp.serial_number, lp.circle_name, lp.division_name, lp.subdiv_name, lp.section_name, lp.sc_number,
               lp.existing_load_kw, lp.existing_solar_load_kw, lp.applied_solar_load_kw, lp.np_registration_number, lp.ep_registration_number,
               lp.complaint_date, lp.mobile_number, lp.email, lp.national_portal_status, lp.epdcl_portal_status, lp.village_name,
               lp.bill_amount_1, lp.bill_month_1, lp.bill_amount_2, lp.bill_month_2, lp.bill_amount_3, lp.bill_month_3,
               lp.call_status, lp.remark, lp.last_called_at, lp.called_by, lp.follow_up_date, lp.is_existing_customer, lp.linked_customer_id,
               lp.created_at, lp.updated_at, lp.ero_name, lp.mandal_name, lp.sub_station_name, lp.category, lp.customer_name, lp.area_name,
               lp.contracted_load, lp.connected_load, lp.load_unit, lp.phase, lp.eb_status, lp.meter_no, lp.feeder_name,
               lp.panchayath_name, lp.assembly_constituency,
               (SELECT json_build_object(''id'', p.id, ''full_name'', p.full_name) FROM profiles p WHERE p.id = lp.called_by) AS called_by_profile
        FROM lead_prospects lp WHERE %s
        ORDER BY lp.created_at DESC LIMIT %s OFFSET %s
      ) t',
      v_where, p_page_size, p_page_offset
    ) INTO rows;
  END IF;

  RETURN QUERY SELECT rows, total_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_prospects(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, INT, INT
) TO authenticated;
