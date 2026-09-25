# Location Hierarchy Auto-Selection Feature

## Overview
When a user selects a village/panchayat, the system automatically shows and selects the complete hierarchical path, ensuring clarity since the same village name can exist in multiple locations.

## How It Works

### 1. Direct Village Search
Users can search for villages directly by clicking "Search Village Directly" button.

### 2. Search Results Display
When searching, each village in the results shows its complete hierarchy:
```
Village Name (విలేజ్ పేరు)
Mandal Name → Constituency Name → District Name → State Name
Rural/Panchayat • 30 wards
```

### 3. Automatic Hierarchy Population
When a village is selected (either through search or dropdown):
- The system automatically fetches the complete hierarchy
- All parent levels are populated and selected:
  - State dropdown → auto-selected
  - District dropdown → auto-selected
  - Constituency dropdown → auto-selected
  - Mandal dropdown → auto-selected
  - Village dropdown → selected

### 4. Visual Hierarchy Display
A blue banner shows the complete path:
```
📍 Andhra Pradesh › East Godavari › Tuni › Kotananduru › Allipudi
```

## Key Features

### Disambiguation
- Same village names in different locations are clearly distinguished
- Full hierarchy prevents confusion
- Example: "Bandur" exists in multiple mandals - each is uniquely identified

### Data Integrity
- Ensures accurate location data in customer records
- Prevents incorrect location assignment
- Maintains referential integrity across all levels

### User Experience
- Quick search for known villages
- No need to navigate through multiple dropdowns
- Clear visual feedback of selection
- Can switch between search and hierarchy modes

## Technical Implementation

### Database Query
```sql
SELECT v.*, 
  m.name as mandal_name,
  c.name as constituency_name,
  d.name as district_name,
  s.name as state_name
FROM villages v
JOIN mandals m ON v.mandal_id = m.id
JOIN constituencies c ON m.constituency_id = c.id
JOIN districts d ON c.district_id = d.id
JOIN states s ON d.state_id = s.id
WHERE v.name ILIKE '%search%' OR v.name_telugu ILIKE '%search%'
```

### Hierarchy Lookup
When a village is selected by ID:
1. Fetch village record
2. Get mandal from `mandal_id`
3. Get constituency from `constituency_id`
4. Get district from `district_id`
5. Get state from `state_id`
6. Populate all dropdowns automatically

## Use Cases

### Lead Generator Assignment
- Lead generators are assigned to specific villages
- Commission tracked per village
- Hierarchy ensures correct village selection

### Customer Location
- Customer address includes full hierarchy
- Reports can filter by any level (state, district, mandal, village)
- Analytics work at all hierarchical levels

### Service Area Management
- Teams can be assigned to specific areas
- Coverage maps based on location hierarchy
- Territory management across all levels

## Example Scenario

**User Action**: Searches for "Bandur"

**System Response**:
```
Search Results:
1. Bandur (బండూర్)
   BOMMANAHAL → Rayadurg → Anantapur → Andhra Pradesh
   Rural/Panchayat • 30 wards

2. Bandur (బండూర్)
   GOOTY → Gooty → Anantapur → Andhra Pradesh
   Rural/Panchayat • 30 wards
```

**After Selection**: All dropdowns auto-populate with the selected village's hierarchy.

## Benefits

1. **Accuracy**: Eliminates location selection errors
2. **Speed**: Quick search vs. multiple dropdown navigation
3. **Clarity**: Full hierarchy prevents ambiguity
4. **Scalability**: Works with 13,714+ villages
5. **Usability**: Intuitive for both power users and new users
