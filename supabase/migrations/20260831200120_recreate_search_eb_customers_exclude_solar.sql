DROP FUNCTION IF EXISTS search_eb_customers(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN,TEXT,TEXT,TEXT,JSONB,INT,INT);

CREATE FUNCTION search_eb_customers(
  p_search TEXT DEFAULT NULL,
  p_ero TEXT DEFAULT NULL,
  p_section TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_call_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_mandal TEXT DEFAULT NULL,
  p_sub_station TEXT DEFAULT NULL,
  p_area TEXT DEFAULT NULL,
  p_exclude_solar BOOLEAN DEFAULT FALSE,
  p_import_batch_id TEXT DEFAULT NULL,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  bill_conditions JSONB DEFAULT '[]'::JSONB,
  p_page_size INT DEFAULT 50,
  p_page_offset INT DEFAULT 0
)
RETURNS TABLE(rows JSON, total_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_max_value NUMERIC;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT '[]'::JSON, 0::BIGINT;
    RETURN;
  END IF;

  v_where := 'ec.tenant_id = ' || quote_literal(v_tenant_id);

  IF p_search IS NOT NULL AND p_search <> '' THEN
    v_where := v_where || ' AND ('
    || 'fuzzy_name_match(ec.customer_name, ' || quote_literal(p_search) || ')'
    || ' OR ec.sc_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.meter_no ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.mobile_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.phone ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.area_name ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.address1 ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.address2 ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.address3 ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.address4 ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'')';
  END IF;
  IF p_ero IS NOT NULL AND p_ero <> 'all' THEN v_where := v_where || ' AND ec.ero_name = ANY(string_to_array(' || quote_literal(p_ero) || ','',''))'; END IF;
  IF p_section IS NOT NULL AND p_section <> 'all' THEN v_where := v_where || ' AND ec.section_name = ANY(string_to_array(' || quote_literal(p_section) || ','',''))'; END IF;
  IF p_status IS NOT NULL AND p_status <> 'all' THEN v_where := v_where || ' AND ec.status = ANY(string_to_array(' || quote_literal(p_status) || ','',''))'; END IF;
  IF p_call_status IS NOT NULL AND p_call_status <> 'all' THEN v_where := v_where || ' AND ec.call_status = ANY(string_to_array(' || quote_literal(p_call_status) || ','',''))'; END IF;
  IF p_category IS NOT NULL AND p_category <> 'all' THEN v_where := v_where || ' AND ec.category = ANY(string_to_array(' || quote_literal(p_category) || ','',''))'; END IF;
  IF p_mandal IS NOT NULL AND p_mandal <> 'all' THEN v_where := v_where || ' AND ec.mandal_name = ANY(string_to_array(' || quote_literal(p_mandal) || ','',''))'; END IF;
  IF p_sub_station IS NOT NULL AND p_sub_station <> 'all' THEN v_where := v_where || ' AND ec.sub_station_name = ANY(string_to_array(' || quote_literal(p_sub_station) || ','',''))'; END IF;
  IF p_area IS NOT NULL AND p_area <> 'all' THEN v_where := v_where || ' AND ec.area_name = ANY(string_to_array(' || quote_literal(p_area) || ','',''))'; END IF;
  IF p_exclude_solar THEN v_where := v_where || ' AND (ec.solar_already_installed = false OR ec.solar_already_installed IS NULL)'; END IF;
  IF p_import_batch_id IS NOT NULL THEN v_where := v_where || ' AND ec.import_batch_id = ' || quote_literal(p_import_batch_id); END IF;
  IF p_date_from IS NOT NULL THEN v_where := v_where || ' AND ec.created_at >= ' || quote_literal(p_date_from || ' 00:00:00'); END IF;
  IF p_date_to IS NOT NULL THEN v_where := v_where || ' AND ec.created_at <= ' || quote_literal(p_date_to || ' 23:59:59'); END IF;

  IF jsonb_array_length(bill_conditions) > 0 THEN
    FOR v_cond IN SELECT jsonb_array_elements(bill_conditions) LOOP
      v_column := v_cond->>'column';
      v_operator := v_cond->>'operator';
      v_value := (v_cond->>'value')::NUMERIC;
      v_max_value := NULLIF(v_cond->>'max_value', '')::NUMERIC;
      IF v_column NOT IN ('bill_amount', 'billed_units') THEN CONTINUE; END IF;
      IF v_operator NOT IN ('gte', 'gt', 'lte', 'lt', 'eq', 'between') THEN CONTINUE; END IF;
      IF v_bill_clause <> '' THEN v_bill_clause := v_bill_clause || ' AND '; END IF;
      IF v_operator = 'between' AND v_max_value IS NOT NULL THEN
        v_bill_clause := v_bill_clause || format(
          '(SELECT MAX(eb.%s) FROM eb_customer_bills eb WHERE eb.eb_customer_id = ec.id AND eb.tenant_id = ec.tenant_id) >= %s AND (SELECT MAX(eb.%s) FROM eb_customer_bills eb WHERE eb.eb_customer_id = ec.id AND eb.tenant_id = ec.tenant_id) <= %s',
          quote_ident(v_column), v_value::TEXT, quote_ident(v_column), v_max_value::TEXT
        );
      ELSE
        v_bill_clause := v_bill_clause || format(
          '(SELECT MAX(eb.%s) FROM eb_customer_bills eb WHERE eb.eb_customer_id = ec.id AND eb.tenant_id = ec.tenant_id) %s %s',
          quote_ident(v_column),
          CASE v_operator WHEN 'gte' THEN '>=' WHEN 'gt' THEN '>' WHEN 'lte' THEN '<=' WHEN 'lt' THEN '<' WHEN 'eq' THEN '=' WHEN 'between' THEN '>=' END,
          v_value::TEXT
        );
      END IF;
    END LOOP;
  END IF;

  v_has_bill_cond := v_bill_clause <> '';

  IF v_has_bill_cond THEN
    EXECUTE format(
      'SELECT count(*) FROM eb_customers ec WHERE %s AND %s',
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
      ec.follow_up_date, ec.solar_already_installed,
      ec.import_batch_id, ec.import_batch_label,
      ec.created_at, ec.updated_at,
      (SELECT json_build_object(''id'', p.id, ''full_name'', p.full_name) FROM profiles p WHERE p.id = ec.called_by) AS called_by_profile
      FROM eb_customers ec WHERE %s AND %s
      ORDER BY ec.created_at DESC LIMIT %s OFFSET %s
      ) t',
      v_where, v_bill_clause, p_page_size, p_page_offset
    ) INTO rows;
  ELSE
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
      ec.follow_up_date, ec.solar_already_installed,
      ec.import_batch_id, ec.import_batch_label,
      ec.created_at, ec.updated_at,
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
