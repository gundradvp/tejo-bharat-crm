#!/usr/bin/env python3
import json
import sys
from supabase import create_client

SUPABASE_URL = "https://ctnridgmzwvwcioizspp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0bnJpZGdtend2d2Npb2l6c3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDQxNTksImV4cCI6MjA3ODYyMDE1OX0.aWaddy1jXM3sM7pOWN3bzidc4OP7oXozEXM_kQ1AxMg"
TENANT_ID = "12a7aad5-baea-46ca-8f39-72aa8a367ffe"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def import_locations():
    print("Reading JSON file...")
    with open('./data/locations/location-template.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    stats = {'states': 0, 'districts': 0, 'constituencies': 0, 'mandals': 0, 'villages': 0}

    for state in data.get('states', []):
        state_name = state.get('name') or state.get('state_name')

        if state_name != 'Andhra Pradesh':
            print(f"Skipping: {state_name}")
            continue

        print(f"\nImporting: {state_name}")
        state_id = state.get('id') or state.get('state_id') or 1

        supabase.table('states').upsert({
            'id': state_id,
            'name': state_name,
            'code': state.get('code', 'AP'),
            'tenant_id': TENANT_ID
        }).execute()
        stats['states'] += 1

        for district in state.get('districts', []):
            district_name = district.get('district_name') or district.get('name')
            district_id = district['id']

            supabase.table('districts').upsert({
                'id': district_id,
                'state_id': state_id,
                'name': district_name,
                'tenant_id': TENANT_ID
            }).execute()
            stats['districts'] += 1

            for constituency in district.get('constituencies', []):
                const_id = constituency.get('id') or constituency.get('constituency_id')
                const_name = constituency.get('constituency_name') or constituency.get('name')

                supabase.table('constituencies').upsert({
                    'id': const_id,
                    'district_id': district_id,
                    'name': const_name,
                    'parliament_constituency_id': constituency.get('parliament_constituency_id'),
                    'parliament_constituency_name': constituency.get('parliament_constituency_name'),
                    'tenant_id': TENANT_ID
                }).execute()
                stats['constituencies'] += 1

                for mandal in constituency.get('mandals', []):
                    mandal_id = mandal['id']
                    mandal_name = mandal.get('mandal_name') or mandal.get('name')

                    supabase.table('mandals').upsert({
                        'id': mandal_id,
                        'constituency_id': const_id,
                        'name': mandal_name,
                        'tenant_id': TENANT_ID
                    }).execute()
                    stats['mandals'] += 1

                    # Batch villages
                    villages_batch = []
                    for village in mandal.get('panchayats', []):
                        villages_batch.append({
                            'id': village['id'],
                            'mandal_id': mandal_id,
                            'name': village['name'],
                            'name_telugu': village.get('name_telugu'),
                            'area_category': village.get('area_category', 'Rural/Panchayat'),
                            'total_wards': village.get('total_wards', 0),
                            'tenant_id': TENANT_ID
                        })
                        stats['villages'] += 1

                        if len(villages_batch) >= 50:
                            supabase.table('villages').upsert(villages_batch).execute()
                            villages_batch = []
                            print(f"  Imported {stats['villages']} villages...", end='\r')

                    if villages_batch:
                        supabase.table('villages').upsert(villages_batch).execute()

    print(f"\n\n=== Import Complete ===")
    print(f"States: {stats['states']}")
    print(f"Districts: {stats['districts']}")
    print(f"Constituencies: {stats['constituencies']}")
    print(f"Mandals: {stats['mandals']}")
    print(f"Villages: {stats['villages']}")

    # Verify Durgada
    print("\nSearching for Durgada...")
    result = supabase.table('villages').select('name, name_telugu').or_('name.ilike.%durgada%,name.ilike.%durgad%').limit(10).execute()
    print(f"Found {len(result.data)} matching villages:")
    for v in result.data:
        print(f"  - {v['name']} {v.get('name_telugu', '')}")

if __name__ == '__main__':
    try:
        import_locations()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
