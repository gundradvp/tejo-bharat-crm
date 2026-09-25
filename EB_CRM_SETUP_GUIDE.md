# EB Customers CRM — Setup Guide

## IMPORTANT: Run the Database Migration First

Before using the EB Customers CRM, you **must** create the database tables.

### How to apply the migration

1. Log in to your **Supabase Dashboard** at https://supabase.com/dashboard
2. Select your project (`rlwcqmlspvddfscyngfw`)
3. Go to **SQL Editor** (left sidebar)
4. Click **New query**
5. Open the file `create_eb_crm_tables.sql` (or `supabase/migrations/20260812000001_create_eb_customers_crm_tables.sql`)
6. Copy the entire SQL content and paste it into the SQL Editor
7. Click **Run**

This creates two tables:
- `eb_customers` — stores all 45 EB data columns plus CRM calling fields
- `eb_customer_calls` — call history log per customer

Both tables have Row Level Security (RLS) enabled with tenant-scoped policies, matching your existing app's security model.

### After the migration

1. Navigate to **EB Customers** in the app (lightning bolt icon in the navbar)
2. Click **Import Excel**
3. Upload your Excel/CSV file with the 113,000 EB records
4. The import runs in the background — you can navigate away while it works
5. Once complete, browse, search, filter, and call customers from the CRM

### Supported columns

The import maps these Excel/CSV headers automatically:

| Excel Header | Stored As |
|---|---|
| ERO Name | ero_name |
| Section Name | section_name |
| Area Name | area_name |
| SCNO | sc_number |
| SUR Name | sur_name |
| Name | customer_name |
| FHP Name | fhp_name |
| Address1-4 | address1-4 |
| Category | category |
| UKSCNO | uksc_number |
| Contracted Load | contracted_load |
| Connected Load | connected_load |
| Load Unit | load_unit |
| Phase | phase |
| SM_MTR | sm_mtr |
| SubGroup | sub_group |
| TRANS STRUC CODE | trans_struc_code |
| Feeder No / Name | feeder_no / feeder_name |
| Sub Station Name | sub_station_name |
| Feeder Type | feeder_type |
| Pol No | pol_no |
| Service Type | service_type |
| Supply Release Date | supply_release_date |
| Status | status |
| Phone | phone |
| SD Amount | sd_amount |
| MULTPF | multpf |
| CATIIIB Flag | cat_iiib_flag |
| Meter No / Make / Capacity | meter_no / meter_make / meter_capacity |
| Metering Side | metering_side |
| MUSFLAG | mus_flag |
| Colony Name | colony_name |
| Assembly Constency | assembly_constituency |
| Mandal Name | mandal_name |
| Panchayath Name | panchayath_name |
| SC ST Flag | sc_st_flag |
| Aadhaar No | aadhaar_number |
| Mobile No | mobile_number |
| IR FLAG | ir_flag |

Duplicate SC numbers (within the same tenant) are automatically updated on re-import.
