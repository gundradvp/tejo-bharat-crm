/*
# Fix: Remove wrongly-inserted EB customers from lead_prospects
# Re-enrich only existing prospects with EB data (UPDATE only, no INSERT)
# Add bill import capability for prospects
*/

-- 1. Delete the 111,899 EB-only rows that were inserted as new prospects
--    These are rows that have ero_name but no circle_name (original prospects have circle_name)
DELETE FROM lead_prospects 
WHERE ero_name IS NOT NULL AND circle_name IS NULL;

-- 2. Re-enrich ONLY existing prospects (UPDATE, no INSERT) with EB customer data
UPDATE lead_prospects lp
SET 
  section_name = COALESCE(ec.section_name, lp.section_name),
  ero_name = ec.ero_name,
  mandal_name = ec.mandal_name,
  sub_station_name = ec.sub_station_name,
  category = ec.category,
  customer_name = ec.customer_name,
  area_name = ec.area_name,
  contracted_load = ec.contracted_load,
  connected_load = ec.connected_load,
  load_unit = ec.load_unit,
  phase = ec.phase,
  eb_status = ec.status,
  meter_no = ec.meter_no,
  feeder_name = ec.feeder_name,
  panchayath_name = ec.panchayath_name,
  assembly_constituency = ec.assembly_constituency,
  updated_at = now()
FROM eb_customers ec
WHERE lp.sc_number = ec.sc_number;

-- 3. Create a view for prospect bill history (joins eb_customer_bills by sc_number)
CREATE OR REPLACE VIEW public.prospect_bill_history AS
SELECT 
  lp.id AS prospect_id,
  lp.sc_number,
  lp.tenant_id,
  eb.id AS bill_id,
  eb.bill_month,
  eb.bill_year,
  eb.bill_month_index,
  eb.billed_units,
  eb.bill_amount,
  eb.bill_status,
  eb.created_at AS bill_created_at
FROM lead_prospects lp
INNER JOIN eb_customer_bills eb ON eb.sc_number = lp.sc_number AND eb.tenant_id = lp.tenant_id;

GRANT SELECT ON public.prospect_bill_history TO authenticated;

-- 4. Create RPC to fetch bill history for a specific prospect
CREATE OR REPLACE FUNCTION public.get_prospect_bill_history(p_prospect_id UUID)
RETURNS TABLE (
  bill_month TEXT,
  bill_year INT,
  bill_month_index INT,
  billed_units NUMERIC,
  bill_amount NUMERIC,
  bill_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sc_number TEXT;
  v_tenant_id UUID;
BEGIN
  SELECT sc_number, tenant_id INTO v_sc_number, v_tenant_id FROM lead_prospects WHERE id = p_prospect_id;
  IF v_sc_number IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    eb.bill_month,
    eb.bill_year,
    eb.bill_month_index,
    eb.billed_units,
    eb.bill_amount,
    eb.bill_status,
    eb.created_at
  FROM eb_customer_bills eb
  WHERE eb.sc_number = v_sc_number AND eb.tenant_id = v_tenant_id
  ORDER BY eb.bill_year DESC, eb.bill_month_index DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_prospect_bill_history(UUID) TO authenticated;
