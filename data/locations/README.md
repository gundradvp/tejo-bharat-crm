# Location Data Import

This folder contains location hierarchy data for import into the system.

## File Structure

Place your location JSON files here for easy access during import. The system expects a hierarchical structure:

- **States** (top level)
  - **Districts** (within states)
    - **Constituencies** (within districts)
      - **Mandals** (within constituencies)
        - **Panchayats/Villages** (within mandals)

## How to Import

1. Place your JSON file in this folder
2. Go to **Settings > Master Data Management > Location Management**
3. Click on the **Import Data** tab
4. Upload your JSON file
5. Click **Import Data**

## File Format

See `location-template.json` for the expected format.

## Example Files

- `location-template.json` - Template showing the expected structure
- `andhra-pradesh.json` - Your Andhra Pradesh location data (place here)
- `karnataka.json` - Karnataka location data (if needed)

## Notes

- The import uses **upsert** logic - existing records will be updated, new records will be created
- Make sure IDs are consistent across imports to properly update existing data
- The system tracks both created and updated records during import
