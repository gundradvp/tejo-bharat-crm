# Location Management System Guide

## Overview

The Location Management System provides a hierarchical structure for managing locations in India across five levels:
- **State** → **District** → **Constituency** → **Mandal** → **Village/Panchayat**

This system is integrated with Lead Generator Management to provide accurate location tracking and filtering.

## Features

### 1. Hierarchical Location Master Data
- Five-level location hierarchy
- Tenant-isolated data
- Fast cascading lookups with indexed foreign keys
- Support for both English and Telugu names (for villages)
- Area category classification (Rural/Panchayat, Municipality)

### 2. Location Management Interface

#### Access
Navigate to **Settings → Location Master Data** (Admin only)

#### Three Main Tabs

**a) Browse Locations**
- Interactive tree view of all locations
- Expand/collapse hierarchy levels
- View complete location structure
- Quick navigation through states, districts, constituencies, mandals, and villages

**b) Import Data**
- Bulk import from JSON files
- Automatic hierarchy processing
- Real-time import progress
- Import statistics display
- Error handling and reporting

**c) Search**
- Full-text search across all location levels
- Search by English or Telugu names
- Results grouped by location type
- Fast indexed search

### 3. Lead Generator Integration

#### Cascading Location Selector
When adding or editing lead generators:
- Start by selecting a **State**
- Then choose a **District** (auto-populated based on state)
- Select a **Constituency** (optional, based on district)
- Pick a **Mandal** (optional, based on constituency)
- Choose a **Village/Panchayat** (optional, based on mandal)

The system auto-fills subsequent dropdowns based on previous selections.

#### Location-Based Filtering
Filter lead generators by:
- **State**: View all lead generators in a specific state
- **District**: Narrow down to a specific district
- **Clear Filters**: Remove all location filters instantly

### 4. Data Import Format

#### JSON Structure
```json
{
  "states": [
    {
      "id": 1,
      "name": "Andhra Pradesh",
      "code": "AP",
      "districts": [
        {
          "id": 2,
          "district_name": "Anantapur",
          "constituencies": [
            {
              "id": 148,
              "name": "Rayadurg",
              "parliament_constituency_id": 2,
              "parliament_constituency_name": "Anantapur",
              "mandals": [
                {
                  "id": 577,
                  "name": "BOMMANAHAL",
                  "panchayats": [
                    {
                      "id": 2056,
                      "name": "Bandur",
                      "name_telugu": "బండూర్",
                      "area_category": "Rural/Panchayat",
                      "total_wards": 30
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

#### Alternative Flat Format (constituencies.json style)
```json
[
  {
    "state_id": 1,
    "parliament_constituency_id": 2,
    "parliament_constituency_name": "Srikakulam",
    "constituency_id": 1,
    "constituency_name": "Ichchapuram",
    "id": 3,
    "mandal_name": "KAVITI"
  }
]
```

### 5. Database Structure

#### Tables Created
- `states`: State-level data
- `districts`: District data with state references
- `constituencies`: Constituency data with district references
- `mandals`: Mandal/Tehsil data with constituency references
- `villages`: Village/Panchayat data with mandal references

#### Lead Generators Enhancement
Added columns:
- `state_id` (references states)
- `district_id` (references districts)
- `constituency_id` (references constituencies)
- `mandal_id` (references mandals)
- `village_id` (references villages)

Old text-based fields (`state`, `district`, `mandal`, `village`) are kept for backward compatibility.

## Usage Workflows

### Workflow 1: Import Location Data

1. Prepare your JSON file with location data
2. Go to **Settings → Location Master Data**
3. Click the **Import Data** tab
4. Upload your JSON file
5. Click **Import Data** button
6. Review import statistics
7. Go to **Browse Locations** to verify imported data

### Workflow 2: Add Lead Generator with Location

1. Go to **Lead Generators** page
2. Click **Add Lead Generator**
3. Fill in basic details (name, phone, email)
4. In the **Location Details** section:
   - Select State
   - Select District (auto-populated)
   - Select Constituency (optional)
   - Select Mandal (optional)
   - Select Village/Panchayat (optional)
5. Complete remaining fields
6. Click **Add Lead Generator**

### Workflow 3: Filter Lead Generators by Location

1. Go to **Lead Generators** page
2. Use the location filter dropdowns:
   - Select a State to see all lead generators in that state
   - Optionally select a District to narrow down further
3. Click **Clear Filters** to reset

### Workflow 4: Search Locations

1. Go to **Settings → Location Master Data**
2. Click the **Search** tab
3. Enter search term (works with English and Telugu)
4. Press **Search** or hit Enter
5. View results grouped by location type

## Benefits

1. **Data Consistency**: No typos or variations in location names
2. **Easy Filtering**: Quickly find lead generators by location
3. **Scalability**: Handles thousands of locations efficiently
4. **Hierarchical Navigation**: Intuitive drill-down through location levels
5. **Bilingual Support**: Telugu names for villages/panchayats
6. **Tenant Isolation**: Each tenant has separate location data
7. **Fast Performance**: Indexed lookups for quick cascading dropdowns

## Technical Details

### Performance Optimizations
- Composite indexes on foreign keys
- Indexed name fields for search
- Efficient cascading queries
- Client-side caching of location data

### Security
- Row Level Security (RLS) enabled on all tables
- Tenant isolation at database level
- Admin-only write access
- All users have read access within their tenant

### API Functions
- `locationApi.getStates()`
- `locationApi.getDistrictsByState(stateId)`
- `locationApi.getConstituenciesByDistrict(districtId)`
- `locationApi.getMandalsByConstituency(constituencyId)`
- `locationApi.getVillagesByMandal(mandalId)`
- `locationApi.searchLocations(searchTerm)`
- `locationApi.importLocationsFromJSON(jsonData, tenantId)`

### React Hooks
- `useStates()` - Load all states
- `useDistricts(stateId)` - Load districts for a state
- `useConstituencies(districtId)` - Load constituencies
- `useMandals(constituencyId)` - Load mandals
- `useVillages(mandalId)` - Load villages
- `useLocationHierarchy(villageId)` - Get full location path

## Troubleshooting

### Import Issues
- **Error: Invalid JSON format**: Ensure JSON is properly formatted
- **Error: Foreign key violation**: Check that parent records exist before children
- **No data showing**: Verify tenant_id is set correctly in imported data

### Performance Issues
- If location dropdowns are slow, check database indexes
- Clear browser cache if seeing stale data
- Ensure proper pagination for large datasets

### Display Issues
- If Telugu characters show as boxes, check UTF-8 encoding
- If dropdowns don't cascade, verify foreign key relationships
- If filters don't work, check that location IDs are properly saved

## Future Enhancements

Potential additions:
- Bulk edit locations
- Location history tracking
- Geographic coordinates (lat/long)
- Map visualization
- Location-based reporting
- Export functionality
- Location analytics dashboard
