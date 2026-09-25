/*
# Create RPC for filtering EB customers by bill amount/units

## Purpose
The client-side bill filter fetches matching bills into the browser, but Supabase's
default response limit caps this at ~1000 rows. When thousands of bills match a
condition like "units > 1", only a fraction of customer IDs are returned, giving
wrong totals (e.g. 208 instead of the true count).

## Changes
1. New function `filter_eb_customers_by_bills` — SECURITY DEFINER, takes bill
   filter conditions + customer filter criteria + pagination params, returns
   matching eb_customers rows with a total count.
2. Runs the entire query server-side: joins eb_customers to eb_customer_bills
   with the bill conditions, applies customer-level filters, and paginates.
3. Scoped to the caller's tenant_id via auth.uid().

## Parameters
- bill_conditions: array of {column, operator, value} objects
- search, ero, section, status, call_status, category, mandal, sub_station: text filters
- page_size, page_offset: pagination

## Returns
- rows: json (array of eb_customers with called_by_profile)
- total_count: integer

## Security
- SECURITY DEFINER with explicit search_path
- Tenant-scoped via auth.uid() → profiles.tenant_id
- Column names validated against an allowlist (no injection)
- Operator names validated against an allowlist
*/

CREATE OR REPLACE FUNCTION public.filter_eb_customers_by_bills(
  bill_conditions JSONB DEFAULT '[]'::JSONB,
  p_search TEXT DEFAULT NULL,
  p_ero TEXT DEFAULT NULL,
  p_section TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_call_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_mandal TEXT DEFAULT NULL,
  p_sub_station TEXT DEFAULT NULL,
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
  v_sql TEXT;
  v_where TEXT := '';
  v_having TEXT := '';
  v_cond JSONB;
  v_column TEXT;
  v_operator TEXT;
  v_value NUMERIC;
  v_bill_clause TEXT := '';
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT '[]'::JSON, 0::BIGINT;
    RETURN;
  END IF;

  v_where := 'ec.tenant_id = ' || quote_literal(v_tenant_id);

  -- Customer-level filters
  IF p_search IS NOT NULL AND p_search <> '' THEN
    v_where := v_where || ' AND (ec.sc_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
      || ' OR ec.customer_name ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
      || ' OR ec.mobile_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
      || ' OR ec.phone ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
      || ' OR ec.meter_no ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'')';
  END IF;
  IF p_ero IS NOT NULL AND p_ero <> 'all' THEN
    v_where := v_where || ' AND ec.ero_name = ' || quote_literal(p_ero);
  END IF;
  IF p_section IS NOT NULL AND p_section <> 'all' THEN
    v_where := v_where || ' AND ec.section_name = ' || quote_literal(p_section);
  END IF;
  IF p_status IS NOT NULL AND p_status <> 'all' THEN
    v_where := v_where || ' AND ec.status = ' || quote_literal(p_status);
  END IF;
  IF p_call_status IS NOT NULL AND p_call_status <> 'all' THEN
    v_where := v_where || ' AND ec.call_status = ' || quote_literal(p_call_status);
  END IF;
  IF p_category IS NOT NULL AND p_category <> 'all' THEN
    v_where := v_where || ' AND ec.category = ' || quote_literal(p_category);
  END IF;
  IF p_mandal IS NOT NULL AND p_mandal <> 'all' THEN
    v_where := v_where || ' AND ec.mandal_name = ' || quote_literal(p_mandal);
  END IF;
  IF p_sub_station IS NOT NULL AND p_sub_station <> 'all' THEN
    v_where := v_where || ' AND ec.sub_station_name = ' || quote_literal(p_sub_station);
  END IF;

  -- Build bill condition clauses
  IF jsonb_array_length(bill_conditions) > 0 THEN
    FOR v_cond IN SELECT jsonb_array_elements(bill_conditions) LOOP
      v_column := v_cond->>'column';
      v_operator := v_cond->>'operator';
      v_value := (v_cond->>'value')::NUMERIC;

      -- Validate column name against allowlist
      IF v_column NOT IN ('bill_amount', 'billed_units') THEN
        CONTINUE;
      END IF;
      -- Validate operator against allowlist
      IF v_operator NOT IN ('gte', 'gt', 'lte', 'lt', 'eq') THEN
        CONTINUE;
      END IF;

      IF v_bill_clause <> '' THEN
        v_bill_clause := v_bill_clause || ' AND ';
      END IF;
      v_bill_clause := v_bill_clause || format('eb.%s %s %s',
        quote_ident(v_column),
        CASE v_operator
          WHEN 'gte' THEN '>='
          WHEN 'gt' THEN '>'
          WHEN 'lte' THEN '<='
          WHEN 'lt' THEN '<'
          WHEN 'eq' THEN '='
        END,
        v_value::TEXT
      );
    END LOOP;
  END IF;

  -- Build the full query
  IF v_bill_clause <> '' THEN
    -- Customer must have at least one bill matching ALL conditions
    v_sql := format(
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) AS rows, count(*)::bigint AS total_count FROM (
        SELECT ec.*, row_to_json(p) AS called_by_profile
        FROM eb_customers ec
        LEFT JOIN profiles p ON p.id = ec.called_by
        WHERE %s
          AND EXISTS (
            SELECT 1 FROM eb_customer_bills eb
            WHERE eb.eb_customer_id = ec.id
              AND eb.tenant_id = ec.tenant_id
              AND %s
          )
        ORDER BY ec.created_at DESC
        LIMIT %s OFFSET %s
      ) t',
      v_where, v_bill_clause, p_page_size, p_page_offset
    );

    -- Get total count separately
    v_sql := v_sql || format(
      '; SELECT count(*)::bigint INTO total_count_placeholder FROM eb_customers ec WHERE %s AND EXISTS (SELECT 1 FROM eb_customer_bills eb WHERE eb.eb_customer_id = ec.id AND eb.tenant_id = ec.tenant_id AND %s)',
      v_where, v_bill_clause
    );
  END IF;

  -- Execute and return
  IF v_bill_clause = '' THEN
    -- No bill conditions — return empty (shouldn't be called, but handle gracefully)
    RETURN QUERY SELECT '[]'::JSON, 0::BIGINT;
  ELSE
    -- Use a simpler approach: two separate queries
    -- Count query
    EXECUTE format(
      'SELECT count(*) FROM eb_customers ec WHERE %s AND EXISTS (SELECT 1 FROM eb_customer_bills eb WHERE eb.eb_customer_id = ec.id AND eb.tenant_id = ec.tenant_id AND %s)',
      v_where, v_bill_clause
    ) INTO total_count;

    -- Data query with pagination
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
               (SELECT json_build_object(''id'', p.id, ''full_name'', p.full_name)
                FROM profiles p WHERE p.id = ec.called_by) AS called_by_profile
        FROM eb_customers ec
        WHERE %s
          AND EXISTS (
            SELECT 1 FROM eb_customer_bills eb
            WHERE eb.eb_customer_id = ec.id
              AND eb.tenant_id = ec.tenant_id
              AND %s
          )
        ORDER BY ec.created_at DESC
        LIMIT %s OFFSET %s
      ) t',
      v_where, v_bill_clause, p_page_size, p_page_offset
    ) INTO rows;

    RETURN QUERY SELECT rows, total_count;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.filter_eb_customers_by_bills(
  JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT
) TO authenticated;
