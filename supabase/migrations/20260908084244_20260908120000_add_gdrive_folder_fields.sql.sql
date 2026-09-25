/*
# Add Google Drive Folder Link Fields

1. Purpose
   Allows admins to map each customer to a Google Drive sub-folder containing
   that customer's documents. Also stores the main "Customers" parent folder
   link at the company-settings level.

2. Changes
   - customers.gdrive_folder_url (text, nullable) — per-customer Drive sub-folder URL
   - company_settings.gdrive_customers_folder_url (text, nullable) — main "Customers" parent folder URL
   - company_settings.gdrive_picker_api_key (text, nullable) — Google API key for Picker
   - company_settings.gdrive_picker_client_id (text, nullable) — Google OAuth client ID for Picker

3. Security
   No new tables. Existing RLS policies on customers and company_settings
   remain unchanged — these columns inherit the same row-level access rules.
*/

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS gdrive_folder_url text;

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS gdrive_customers_folder_url text;

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS gdrive_picker_api_key text;

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS gdrive_picker_client_id text;