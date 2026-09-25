-- Fix prospects with invalid EP registration number that were marked solar_already_installed
UPDATE lead_prospects
SET call_status = 'not_called'
WHERE call_status = 'solar_already_installed'
  AND (ep_registration_number IS NULL
       OR ep_registration_number = ''
       OR trim(ep_registration_number) = '-'
       OR trim(ep_registration_number) = '--'
       OR trim(ep_registration_number) = 'N/A'
       OR trim(ep_registration_number) = 'NA');