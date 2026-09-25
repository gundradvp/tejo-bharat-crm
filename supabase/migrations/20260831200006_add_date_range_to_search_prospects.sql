/*
# Add date range filter to search_prospects RPC
*/
CREATE OR REPLACE FUNCTION search_prospects(
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

  v_where := 'lp.tenant_id = ' || quote_literal(v_tenant_id);

  IF p_search IS NOT NULL AND p_search <> '' THEN
    v_where := v_where || ' AND ('
    || 'lp.sc_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR lp.customer_name ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR lp.meter_no ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR lp.np_registration_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR lp.ep_registration_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR lp.village_name ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'')';
  END IF;
  IF p_circle IS NOT NULL AND p_circle <> 'all' THEN v_where := v_where || ' AND lp.circle_name = ANY(string_to_array(' || quote_literal(p_circle) || ','',''))'; END IF;
  IF p_division IS NOT NULL AND p_division <> 'all' THEN v_where := v_where || ' AND lp.division_name = ANY(string_to_array(' || quote_literal(p_division) || ','',''))'; END IF;
  IF p_subdiv IS NOT NULL AND p_subdiv <> 'all' THEN v_where := v_where || ' AND lp.subdiv_name = ANY(string_to_array(' || quote_literal(p_subdiv) || ','',''))'; END IF;
  IF p_ero IS NOT NULL AND p_ero <> 'all' THEN v_where := v_where || ' AND lp.ero_name = ANY(string_to_array(' || quote_literal(p_ero) || ','',''))'; END IF;
  IF p_section IS NOT NULL AND p_section <> 'all' THEN v_where := v_where || ' AND lp.section_name = ANY(string_to_array(' || quote_literal(p_section) || ','',''))'; END IF;
  IF p_status IS NOT NULL AND p_status <> 'all' THEN v_where := v_where || ' AND lp.eb_status = ANY(string_to_array(' || quote_literal(p_status) || ','',''))'; END IF;
  IF p_call_status IS NOT NULL AND p_call_status <> 'all' THEN v_where := v_where || ' AND lp.call_status = ANY(string_to_array(' || quote_literal(p_call_status) || ','',''))'; END IF;
  IF p_category IS NOT NULL AND p_category <> 'all' THEN v_where := v_where || ' AND lp.category = ANY(string_to_array(' || quote_literal(p_category) || ','',''))'; END IF;
  IF p_mandal IS NOT NULL AND p_mandal <> 'all' THEN v_where := v_where || ' AND lp.mandal_name = ANY(string_to_array(' || quote_literal(p_mandal) || ','',''))'; END IF;
  IF p_sub_station IS NOT NULL AND p_sub_station <> 'all' THEN v_where := v_where || ' AND lp.sub_station_name = ANY(string_to_array(' || quote_literal(p_sub_station) || ','',''))'; END IF;
  IF p_date_from IS NOT NULL THEN v_where := v_where || ' AND lp.created_at >= ' || quote_literal(p_date_from || ' 00:00:00'); END IF;
  IF p_date_to IS NOT NULL THEN v_where := v_where || ' AND lp.created_at <= ' || quote_literal(p_date_to || ' 23:59:59'); END IF;

  -- Build bill conditions using MAX aggregate subqueries
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
          '(SELECT MAX(eb.%s) FROM eb_customer_bills eb WHERE eb.sc_number = lp.sc_number AND eb.tenant_id = lp.tenant_id) >= %s AND (SELECT MAX(eb.%s) FROM eb_customer_bills eb WHERE eb.sc_number = lp.sc_number AND eb.tenant_id = lp.tenant_id) <= %s',
          quote_ident(v_column), v_value::TEXT, quote_ident(v_column), v_max_value::TEXT
        );
      ELSE
        v_bill_clause := v_bill_clause || format(
          '(SELECT MAX(eb.%s) FROM eb_customer_bills eb WHERE eb.sc_number = lp.sc_number AND eb.tenant_id = lp.tenant_id) %s %s',
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
      'SELECT count(*) FROM lead_prospects lp WHERE %s AND %s',
      v_where, v_bill_clause
    ) INTO total_count;

    EXECUTE format(
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) FROM (
      SELECT lp.id, lp.tenant_id, lp.serial_number, lp.circle_name, lp.division_name,
      lp.subdiv_name, lp.ero_name, lp.section_name, lp.sc_number,
      lp.customer_name, lp.existing_load_kw, lp.existing_solar_load_kw,
      lp.applied_solar_load_kw, lp.np_registration_number, lp.ep_registration_number,
      lp.complaint_date, lp.mobile_number, lp.email, lp.national_portal_status,
      lp.epdcl_portal_status, lp.village_name, lp.bill_amount_1, lp.bill_month_1,
      lp.bill_amount_2, lp.bill_month_2, lp.bill_amount_3, lp.bill_month_3,
      lp.is_existing_customer, lp.linked_customer_id, lp.eb_status,
      lp.call_status, lp.remark, lp.last_called_at, lp.called_by,
      lp.follow_up_date, lp.import_batch_id, lp.import_batch_label,
      lp.created_at, lp.updated_at, lp.category, lp.meter_no,
      lp.mandal_name, lp.sub_station_name, lp.area_name,
      (SELECT json_build_object(''id'', p.id, ''full_name'', p.full_name) FROM profiles p WHERE p.id = lp.called_by) AS called_by_profile
      FROM lead_prospects lp WHERE %s AND %s
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
      SELECT lp.id, lp.tenant_id, lp.serial_number, lp.circle_name, lp.division_name,
      lp.subdiv_name, lp.ero_name, lp.section_name, lp.sc_number,
      lp.customer_name, lp.existing_load_kw, lp.existing_solar_load_kw,
      lp.applied_solar_load_kw, lp.np_registration_number, lp.ep_registration_number,
      lp.complaint_date, lp.mobile_number, lp.email, lp.national_portal_status,
      lp.epdcl_portal_status, lp.village_name, lp.bill_amount_1, lp.bill_month_1,
      lp.bill_amount_2, lp.bill_month_2, lp.bill_amount_3, lp.bill_month_3,
      lp.is_existing_customer, lp.linked_customer_id, lp.eb_status,
      lp.call_status, lp.remark, lp.last_called_at, lp.called_by,
      lp.follow_up_date, lp.import_batch_id, lp.import_batch_label,
      lp.created_at, lp.updated_at, lp.category, lp.meter_no,
      lp.mandal_name, lp.sub_station_name, lp.area_name,
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
