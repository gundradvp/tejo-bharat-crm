-- Update solar_already_installed on eb_customers based on lead_prospects with valid EP registration
-- Do this in batches to avoid timeout
UPDATE eb_customers ec
SET solar_already_installed = true, updated_at = now()
WHERE ec.solar_already_installed = false
  AND EXISTS (
    SELECT 1 FROM lead_prospects lp
    WHERE lp.sc_number = ec.sc_number
      AND lp.tenant_id = ec.tenant_id
      AND lp.call_status = 'solar_already_installed'
  );