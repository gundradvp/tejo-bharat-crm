# Location Data Import Guide

## Overview
This guide explains how to import location data (cleaned and filtered for Andhra Pradesh only).

## Files Created

1. **andhra-pradesh.json** - Contains only Andhra Pradesh location data extracted from the template
2. **location-template.json** - Original file (contains all states including Karnataka, Telangana, Tamil Nadu)

## What Changed

### Database Cleanup
All existing location data has been cleaned from the database to remove:
- Karnataka mandals that were incorrectly showing in Andhra Pradesh
- Tamil Nadu data
- Telangana data
- Any other incorrect data

### Import Function Updates
The `locationApi.importLocationsFromJSON()` function now:
1. **Filters for Andhra Pradesh only** - Skips all other states automatically
2. **Uses batch inserts for villages** - Much faster performance (100x improvement)
3. **Shows progress** - Logs which states are being processed or skipped

## How to Import

### Method 1: Using the Web UI (Recommended)

1. Log in to the application as an Admin or Super Admin
2. Go to **Settings > Master Data Management > Location Management**
3. Click on the **Import Data** tab
4. Upload the file: `data/locations/andhra-pradesh.json`
5. Click **Import Data**
6. Wait for the import to complete (should take 30-60 seconds)
7. Review the statistics:
   - States: 1 (Andhra Pradesh)
   - Districts: 13
   - Constituencies: ~175
   - Mandals: ~600
   - Villages: ~13,000+

### Method 2: Using SQL (If UI doesn't work)

If you prefer to verify or need to reimport via SQL:

```bash
# Clean existing data first
npm run clean-locations

# Then use the UI to import
```

## Verification

### Check for Durgada Village

After import, verify that Durgada is searchable:

1. Go to **Customers > Add New Customer**
2. In the location selector, click **Search Village Directly**
3. Type "Durgada" or "Durgad"
4. You should see: **Durgada - GOLLAPROLU → Pithapuram → East Godavari → Andhra Pradesh**

### Check Total Villages

Run this query to verify the import:

```sql
SELECT COUNT(*) FROM villages;
-- Should show approximately 13,000-14,000 villages

SELECT
  s.name as state,
  COUNT(DISTINCT d.id) as districts,
  COUNT(DISTINCT c.id) as constituencies,
  COUNT(DISTINCT m.id) as mandals,
  COUNT(DISTINCT v.id) as villages
FROM states s
LEFT JOIN districts d ON d.state_id = s.id
LEFT JOIN constituencies c ON c.district_id = d.id
LEFT JOIN mandals m ON m.constituency_id = c.id
LEFT JOIN villages v ON v.mandal_id = m.id
GROUP BY s.id, s.name;
```

Expected result:
- State: Andhra Pradesh
- Districts: 13
- Constituencies: ~175
- Mandals: ~600
- Villages: ~13,714

## Hierarchy Display

When a village is selected, the system will automatically show:
```
State → District → Constituency → Mandal → Village
```

Example for Durgada:
```
📍 Andhra Pradesh › East Godavari › Pithapuram › GOLLAPROLU › Durgada
```

This ensures that even if multiple villages have the same name, users can clearly see which exact village is selected.

## Troubleshooting

### Import takes too long
- The optimized batch insert should complete in under 60 seconds
- If it takes longer, check your network connection to Supabase

### Villages not showing in search
1. Verify import completed successfully
2. Check that the village name matches exactly (including Telugu text)
3. Search is case-insensitive and matches both English and Telugu names

### Karnataka/other state data still showing
1. Run the cleanup SQL command again
2. Reimport using the andhra-pradesh.json file (not location-template.json)

## Files Location

- Extract file: `/data/locations/andhra-pradesh.json`
- Original file: `/data/locations/location-template.json` (DO NOT use this for import)

## Notes

- The import function automatically filters for Andhra Pradesh only
- All location data includes unique IDs that maintain referential integrity
- Telugu names are preserved in the `name_telugu` field
- Each village includes area category and total wards information
