# Location Data Import Guide

## Overview

This guide explains how to prepare and import hierarchical location data (States → Districts → Constituencies → Mandals → Villages/Panchayats) into the system.

## Data Storage Location

**Recommended location for JSON files:**
```
/data/locations/
```

Place your location JSON files in this directory for easy access and version control.

## File Format

### Structure

The JSON file must follow this hierarchical structure:

```json
{
  "states": [
    {
      "id": <number>,
      "name": "<state name>",
      "code": "<state code>",
      "districts": [
        {
          "id": <number>,
          "name": "<district name>",
          "constituencies": [
            {
              "id": <number>,
              "name": "<constituency name>",
              "parliament_constituency_id": <number>,
              "parliament_constituency_name": "<parliament name>",
              "mandals": [
                {
                  "id": <number>,
                  "name": "<mandal name>",
                  "panchayats": [
                    {
                      "id": <number>,
                      "name": "<village/panchayat name>",
                      "name_telugu": "<Telugu name>",
                      "area_category": "Rural/Panchayat|Urban",
                      "total_wards": <number>
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Field Name Variations

The import system accepts multiple field name variations:

| Preferred | Alternatives |
|-----------|-------------|
| `name` | `state_name`, `district_name`, `constituency_name`, `mandal_name` |
| `id` | `state_id`, `constituency_id` |
| `panchayats` | Array of villages/panchayats |

## Example Files

### 1. Template File
See: `data/locations/location-template.json`

This shows a complete example with Andhra Pradesh → East Godavari → Rajahmundry City hierarchy.

### 2. Your Data Files

Save your files with descriptive names:
- `data/locations/andhra-pradesh.json` - Full AP state data
- `data/locations/andhra-pradesh-east-godavari.json` - Just East Godavari district
- `data/locations/karnataka.json` - Karnataka state data

## Import Process

### Step 1: Prepare Your JSON File

1. Ensure your JSON is valid (use a JSON validator)
2. Make sure IDs are unique within each level
3. Place the file in `data/locations/` directory

### Step 2: Import via UI

1. Login to the application
2. Navigate to **Settings** (gear icon in navbar)
3. Click **Master Data Management**
4. Click **Location Management**
5. Switch to the **Import Data** tab
6. Click to upload or drag-and-drop your JSON file
7. Click **Import Data**

### Step 3: Review Results

The import will show:
```
Import successful!

Total Records Processed:
  • States: 1
  • Districts: 13
  • Constituencies: 175
  • Mandals: 1,234
  • Villages: 10,567

Summary:
  • Created: 2,345 new records
  • Updated: 9,632 existing records
```

## Important Notes

### Upsert Behavior

The import uses **upsert** logic:
- **Existing records** (same tenant_id + id): Will be **updated** with new data
- **New records**: Will be **created**

This means you can:
- Fix data errors by re-importing with corrections
- Add missing hierarchies
- Update names, codes, and relationships

### ID Management

**Critical:** IDs must remain consistent across imports!

- If you import district ID 4 as "East Godavari" initially
- Later import must use the same ID 4 for "East Godavari"
- Changing IDs will create duplicate records

### Tenant Isolation

Each tenant (company) has separate location data. Imports only affect your tenant's data.

### Bulk vs. Incremental Import

**Full State Import:**
```json
{
  "states": [{
    "id": 1,
    "name": "Andhra Pradesh",
    "districts": [ /* all 13 districts */ ]
  }]
}
```

**Single District Update:**
```json
{
  "states": [{
    "id": 1,
    "name": "Andhra Pradesh",
    "districts": [{
      "id": 4,
      "name": "East Godavari",
      "constituencies": [ /* just this district */ ]
    }]
  }]
}
```

Both work! The second only affects district 4, leaving other districts unchanged.

## Troubleshooting

### Import Failed: Invalid JSON Format

**Problem:** JSON syntax error

**Solution:**
- Validate your JSON using https://jsonlint.com
- Check for missing commas, brackets, or quotes
- Ensure no trailing commas

### No Constituencies Available

**Problem:** Constituencies not linked to correct district

**Solution:**
1. Check the `district_id` in your constituencies data
2. Ensure it matches the parent district's `id`
3. Re-import with corrected relationships

### Duplicate Records

**Problem:** Same location appearing twice

**Solution:**
- Check if you used different IDs for the same location
- Re-import with consistent IDs to merge duplicates

## Data Sources

Common sources for location data:
- Census data
- Election Commission data
- State government portals
- OpenStreetMap (for village boundaries)

## Need Help?

1. Check the template: `data/locations/location-template.json`
2. Review the README: `data/locations/README.md`
3. Contact your system administrator

## Best Practices

1. **Keep backups** of your JSON files in `data/locations/`
2. **Version control** - commit JSON files to git
3. **Start small** - import one district first to test
4. **Verify after import** - use Browse tab to check hierarchy
5. **Document changes** - note what you changed between imports
