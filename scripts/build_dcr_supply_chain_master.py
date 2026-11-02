#!/usr/bin/env python3
"""
=============================================================================
Tejo Bharat — Master DCR Supply Chain & Panel Serial Numbers Builder
=============================================================================

Parses National Portal DCR history chains from panel serial numbers Excel files,
extracts multi-tier supply chain hops (Manufacturer -> Distributor -> Reseller -> Consumer),
maps S-Numbers from Ground Reports, and builds the Master Intelligence Database:
- CRM Public JSON: crm/public/dcr_supply_chain_master.json
- Local Copy: crm/panel_serial_numbers_dcr.xlsx
"""

import os
import sys
import re
import json
import shutil
from pathlib import Path
from collections import Counter, defaultdict
import openpyxl

# Base paths
SCRIPT_DIR = Path(__file__).resolve().parent
CRM_DIR = SCRIPT_DIR.parent
PUBLIC_JSON_PATH = CRM_DIR / "public" / "dcr_supply_chain_master.json"
DIST_JSON_PATH = CRM_DIR / "dist" / "dcr_supply_chain_master.json"
CRM_EXCEL_PATH = CRM_DIR / "panel_serial_numbers_dcr.xlsx"
GROUND_REPORTS_PATH = CRM_DIR / "public" / "s_numbers_ground_reports.json"

DEFAULT_SOURCE_EXCEL = Path("/Users/durgajo/Desktop/Tejo Bharat/panel serial numbers.xlsx")

CORP_TOKENS = {
    'ltd', 'limited', 'pvt', 'private', 'llp', 'enterprises', 'enterprise', 
    'solar', 'energy', 'power', 'solutions', 'systems', 'technologies', 'technology', 
    'tech', 'infra', 'electrical', 'electricals', 'engineering', 'services', 
    'associates', 'agencies', 'agency', 'renewables', 'renewable', 'works', 
    'green', 'batteries', 'battery', 'store', 'traders', 'trading', 
    'industries', 'industry', 'corporation', 'communications', 'holdings', 
    'ventures', 'devloper', 'developer', 'distributors', 'distributor', 
    'controls', 'automations', 'projects', 'greenergy', 'photovoltaic'
}

def clean_entity(raw):
    s = re.sub(r'\(.*?\)', '', raw)
    s = re.sub(r'\bClaimed\b', '', s, flags=re.IGNORECASE)
    return s.strip(' -–\t\r\n,')

def extract_name_and_inv(raw):
    raw_cleaned = re.sub(r'\bClaimed\b', '', raw, flags=re.IGNORECASE).strip()
    m = re.search(r'\(([^)]+)\)', raw_cleaned)
    inv = m.group(1).strip() if m else ''
    name = re.sub(r'\(.*?\)', '', raw_cleaned).strip(' -–\t\r\n,')
    return name, inv

def is_consumer(clean_name, raw_part, is_terminal):
    low = clean_name.lower()
    raw_low = raw_part.lower()
    if any(w in raw_low for w in ['stock at', 'near ', 'mandapam', 'colony', 'street', 'd.no', 'door no']):
        return True
    if 'b2c' in raw_low or raw_low.startswith('np-') or raw_low.startswith('np/'):
        return True
    tokens = set(re.findall(r'[a-z0-9]+', low))
    has_corp = bool(tokens.intersection(CORP_TOKENS))
    if is_terminal:
        return not has_corp
    return False

def build_dcr_master(source_excel_path=DEFAULT_SOURCE_EXCEL):
    print("=" * 70)
    print("🚀 TEJO BHARAT — BUILDING DCR SUPPLY CHAIN & PANEL SERIALS MASTER")
    print(f"📖 Source Excel: {source_excel_path}")
    print("=" * 70)

    if not source_excel_path.exists():
        raise FileNotFoundError(f"Source Excel not found: {source_excel_path}")

    # Copy to CRM root directory
    print(f"\n📂 Syncing source file to CRM: {CRM_EXCEL_PATH}")
    shutil.copy2(source_excel_path, CRM_EXCEL_PATH)

    print("\n📊 Reading Excel sheets...")
    wb = openpyxl.load_workbook(source_excel_path, data_only=True)

    serial_to_dcr = {}
    extra_dcr_serials = set()
    total_excel_rows = 0
    valid_chains = 0

    vendor_inbound = defaultdict(lambda: defaultdict(lambda: {'count': 0, 'invoices': set(), 'mfrs': set(), 'serials': []}))
    vendor_outbound_b2b = defaultdict(lambda: defaultdict(lambda: {'count': 0, 'invoices': set(), 'mfrs': set(), 'serials': []}))
    vendor_b2c_count = Counter()
    vendor_mfrs = defaultdict(Counter)

    mfr_counts = Counter()
    mfr_tier1_buyers = defaultdict(lambda: defaultdict(lambda: {'count': 0, 'invoices': set()}))

    for sname in wb.sheetnames:
        ws = wb[sname]
        print(f"  ➜ Processing Sheet: {sname}...")
        for row in ws.iter_rows(values_only=True):
            if not row:
                continue
            total_excel_rows += 1

            vals = [v for v in row if v is not None and str(v).strip() != ""]
            if not vals:
                continue

            serial = None
            remarks = None

            for v in vals:
                v_str = str(v).strip()
                if "Invalid" in v_str or "->" in v_str or "stock" in v_str:
                    remarks = v_str
                elif not serial and v_str.lower() != "serial number":
                    # Check if cell has space-separated serials
                    parts_space = v_str.split()
                    if len(parts_space) > 1 and all(len(p) > 8 for p in parts_space):
                        for sp in parts_space:
                            sp_clean = sp.strip().rstrip('.0')
                            if sp_clean:
                                extra_dcr_serials.add(sp_clean)
                    else:
                        serial = v_str

            if serial:
                if serial.endswith('.0'):
                    serial = serial[:-2]
                extra_dcr_serials.add(serial)

            if not serial or not remarks or '->' not in remarks:
                continue

            valid_chains += 1

            # Supply trail line (exclude B2C / Stock At line)
            trail_line = ''
            app_id = ''
            for line in remarks.split('\n'):
                line = line.strip()
                if not line or 'stock at' in line.lower() or line.lower().startswith('b2c'):
                    continue
                if '->' in line:
                    trail_line = line
                    break

            if not trail_line:
                continue

            parts = [p.strip() for p in trail_line.split('->') if p.strip()]

            # Extract app_id if terminal is NP- or NP/
            nodes = []
            for p in parts:
                if p.startswith('NP-') or p.startswith('NP/'):
                    app_id = p
                else:
                    nodes.append(p)

            if len(nodes) < 2:
                continue

            # Store for serial mapping
            hops_for_serial = []
            mfr_name, _ = extract_name_and_inv(nodes[0])

            for i, raw_node in enumerate(nodes):
                name, inv = extract_name_and_inv(raw_node)
                is_term = (i == len(nodes) - 1)
                is_cons = is_consumer(name, raw_node, is_term)

                role = 'Distributor'
                if i == 0:
                    role = 'Manufacturer'
                elif is_cons:
                    role = 'End Consumer'
                elif i == len(nodes) - 1:
                    role = 'Vendor (Claimed)'
                else:
                    role = 'Vendor / Reseller'

                hops_for_serial.append({'name': name, 'invoice': inv, 'role': role})

            serial_to_dcr[serial] = {
                'serial': serial,
                'app_id': app_id,
                'raw_chain': trail_line,
                'hops': hops_for_serial
            }

            # Manufacturer ranking tally
            raw_mfr = nodes[0]
            raw_t1 = nodes[1]
            m_name, _ = extract_name_and_inv(raw_mfr)
            t1_name, t1_inv = extract_name_and_inv(raw_t1)
            mfr_counts[m_name] += 1
            mfr_tier1_buyers[m_name][t1_name]['count'] += 1
            if t1_inv:
                mfr_tier1_buyers[m_name][t1_name]['invoices'].add(t1_inv)

            # Track B2B edges
            for i in range(len(nodes) - 1):
                src_raw = nodes[i]
                dst_raw = nodes[i+1]

                src_name, src_inv = extract_name_and_inv(src_raw)
                dst_name, dst_inv = extract_name_and_inv(dst_raw)

                if not src_name or not dst_name:
                    continue

                is_dst_terminal = (i + 1 == len(nodes) - 1)
                is_dst_cons = is_consumer(dst_name, dst_raw, is_dst_terminal)

                vendor_mfrs[src_name][mfr_name] += 1
                vendor_mfrs[dst_name][mfr_name] += 1

                if is_dst_cons:
                    vendor_b2c_count[src_name] += 1
                else:
                    vendor_inbound[dst_name][src_name]['count'] += 1
                    if dst_inv:
                        vendor_inbound[dst_name][src_name]['invoices'].add(dst_inv)
                    vendor_inbound[dst_name][src_name]['mfrs'].add(mfr_name)
                    if len(vendor_inbound[dst_name][src_name]['serials']) < 5:
                        vendor_inbound[dst_name][src_name]['serials'].append(serial)

                    vendor_outbound_b2b[src_name][dst_name]['count'] += 1
                    if dst_inv:
                        vendor_outbound_b2b[src_name][dst_name]['invoices'].add(dst_inv)
                    vendor_outbound_b2b[src_name][dst_name]['mfrs'].add(mfr_name)
                    if len(vendor_outbound_b2b[src_name][dst_name]['serials']) < 5:
                        vendor_outbound_b2b[src_name][dst_name]['serials'].append(serial)

    print(f"\n✅ Total rows evaluated: {total_excel_rows:,}")
    print(f"✅ Total valid DCR chains extracted: {valid_chains:,}")
    print(f"✅ Unique serials with chains: {len(serial_to_dcr):,}")

    # Load ground reports to map S-numbers
    ground_reports = []
    if GROUND_REPORTS_PATH.exists():
        with open(GROUND_REPORTS_PATH, 'r', encoding='utf-8') as f:
            ground_reports = json.load(f)

    print(f"\n🔗 Mapping {len(ground_reports):,} CRM Ground Reports to DCR supply chains...")
    snumber_dcr_map = {}
    matched_snumbers = 0

    # Build reverse lookup maps
    app_to_dcr = {}
    for r in serial_to_dcr.values():
        if r.get('app_id'):
            app_to_dcr[r['app_id']] = r

    for gr in ground_reports:
        sno = (gr.get('COMPLAINT_NO') or gr.get('COMPLAIN_NO') or gr.get('complain_no') or gr.get('COMP_NO') or '').strip().upper()
        if not sno:
            continue

        matched_serial = None
        matched_dcr = None

        # Check by serials
        serials_raw = gr.get('SOLAR_PANEL_PRODUCT_SERIAL_NUMBER') or gr.get('panel_serials_text') or ''
        if serials_raw:
            for s in str(serials_raw).replace(';', ',').replace('\n', ',').split(','):
                s = s.strip()
                if s.endswith('.0'):
                    s = s[:-2]
                if s in serial_to_dcr:
                    matched_serial = s
                    matched_dcr = serial_to_dcr[s]
                    break

        # Check by Application ID
        if not matched_dcr:
            app_id = gr.get('SERIELNUMBER') or gr.get('CONSUMER_SCNO_ID')
            if app_id and app_id in app_to_dcr:
                matched_dcr = app_to_dcr[app_id]
                matched_serial = matched_dcr.get('serial')

        if matched_dcr:
            matched_snumbers += 1
            snumber_dcr_map[sno] = {
                'snumber': sno,
                'complain_no': sno,
                'app_id': matched_dcr.get('app_id'),
                'matched_serial': matched_serial,
                'raw_chain': matched_dcr.get('raw_chain'),
                'hops': matched_dcr.get('hops'),
                'consumer_name': gr.get('COMP_NAME') or gr.get('NAME') or gr.get('consumer_name'),
                'vendor_name': gr.get('VENDOR_NAME') or gr.get('vendor_name'),
                'district': gr.get('DISTRICT_INSTALLATION') or gr.get('district'),
                'section': gr.get('SEC_NAME') or gr.get('section_name'),
                'manufacturer': matched_dcr['hops'][0]['name'] if matched_dcr.get('hops') else None
            }

    print(f"✅ Successfully mapped {matched_snumbers:,} S-Numbers to DCR supply chains!")

    # Build final vendor intelligence dictionary
    all_vendor_names = set(vendor_inbound.keys()) | set(vendor_outbound_b2b.keys()) | set(vendor_b2c_count.keys())
    vendor_intelligence = {}

    for vname in all_vendor_names:
        sups = []
        for sname, sinfo in vendor_inbound[vname].items():
            sups.append({
                'supplier_name': sname,
                'panels_count': sinfo['count'],
                'invoices': sorted(list(sinfo['invoices'])),
                'manufacturers': sorted(list(sinfo['mfrs'])),
                'sample_serials': sinfo['serials']
            })
        sups.sort(key=lambda x: x['panels_count'], reverse=True)

        buyers = []
        for bname, binfo in vendor_outbound_b2b[vname].items():
            buyers.append({
                'buyer_name': bname,
                'panels_count': binfo['count'],
                'invoices': sorted(list(binfo['invoices'])),
                'manufacturers': sorted(list(binfo['mfrs'])),
                'sample_serials': binfo['serials']
            })
        buyers.sort(key=lambda x: x['panels_count'], reverse=True)

        tot_in = sum(s['panels_count'] for s in sups)
        tot_b2b_out = sum(b['panels_count'] for b in buyers)
        tot_b2c_out = vendor_b2c_count[vname]

        vendor_intelligence[vname] = {
            'vendor_name': vname,
            'total_inbound_panels': tot_in,
            'total_outbound_panels': tot_b2b_out + tot_b2c_out,
            'b2b_outbound_panels': tot_b2b_out,
            'b2c_consumer_panels': tot_b2c_out,
            'suppliers': sups,
            'buyers': buyers,
            'manufacturers_handled': dict(vendor_mfrs[vname].most_common(10))
        }

    # Consolidated Venkata Siri
    vs_pvt = vendor_intelligence.get('Venkata Siri Solar Private Limited')
    vs_power = vendor_intelligence.get('Venkata Siri Solar Power')
    if vs_pvt or vs_power:
        comb_sups_dict = defaultdict(lambda: {'count': 0, 'invoices': set(), 'mfrs': set(), 'serials': []})
        comb_buyers_dict = defaultdict(lambda: {'count': 0, 'invoices': set(), 'mfrs': set(), 'serials': []})
        comb_mfrs = Counter()
        comb_b2c = 0

        for vs in [vs_pvt, vs_power]:
            if not vs:
                continue
            comb_b2c += vs['b2c_consumer_panels']
            for m, c in vs['manufacturers_handled'].items():
                comb_mfrs[m] += c
            for s in vs['suppliers']:
                if 'venkata siri' in s['supplier_name'].lower():
                    continue
                cs = comb_sups_dict[s['supplier_name']]
                cs['count'] += s['panels_count']
                cs['invoices'].update(s['invoices'])
                cs['mfrs'].update(s['manufacturers'])
                cs['serials'].extend(s['sample_serials'][:2])
            for b in vs['buyers']:
                if 'venkata siri' in b['buyer_name'].lower():
                    continue
                cb = comb_buyers_dict[b['buyer_name']]
                cb['count'] += b['panels_count']
                cb['invoices'].update(b['invoices'])
                cb['mfrs'].update(b['manufacturers'])
                cb['serials'].extend(b['sample_serials'][:2])

        c_sups = [{
            'supplier_name': k, 'panels_count': v['count'],
            'invoices': sorted(list(v['invoices'])), 'manufacturers': sorted(list(v['mfrs'])),
            'sample_serials': v['serials'][:5]
        } for k, v in comb_sups_dict.items()]
        c_sups.sort(key=lambda x: x['panels_count'], reverse=True)

        c_buyers = [{
            'buyer_name': k, 'panels_count': v['count'],
            'invoices': sorted(list(v['invoices'])), 'manufacturers': sorted(list(v['mfrs'])),
            'sample_serials': v['serials'][:5]
        } for k, v in comb_buyers_dict.items()]
        c_buyers.sort(key=lambda x: x['panels_count'], reverse=True)

        vendor_intelligence['Venkata Siri (All Entities Consolidated)'] = {
            'vendor_name': 'Venkata Siri (All Entities Consolidated)',
            'total_inbound_panels': sum(s['panels_count'] for s in c_sups),
            'total_outbound_panels': sum(b['panels_count'] for b in c_buyers) + comb_b2c,
            'b2b_outbound_panels': sum(b['panels_count'] for b in c_buyers),
            'b2c_consumer_panels': comb_b2c,
            'suppliers': c_sups,
            'buyers': c_buyers,
            'manufacturers_handled': dict(comb_mfrs.most_common(10))
        }

    # Build Manufacturers Ranking
    ranking = []
    total_mfr_panels = sum(mfr_counts.values()) or 1
    for rank, (mfr, count) in enumerate(mfr_counts.most_common(), 1):
        buyers_list = []
        for b_name, b_info in mfr_tier1_buyers[mfr].items():
            buyers_list.append({
                'buyer_name': b_name,
                'panels_count': b_info['count'],
                'sample_invoices': sorted(list(b_info['invoices']))[:3]
            })
        buyers_list.sort(key=lambda x: x['panels_count'], reverse=True)

        ranking.append({
            'rank': rank,
            'manufacturer_name': mfr,
            'total_panels': count,
            'share_percentage': round((count / total_mfr_panels) * 100, 2),
            'tier1_buyers_count': len(buyers_list),
            'top_tier1_buyers': buyers_list[:10]
        })

    # Combine all DCR Serials
    all_dcr_serials_set = set(serial_to_dcr.keys()) | extra_dcr_serials
    # Also keep any existing serials from previous master JSON if exists
    if PUBLIC_JSON_PATH.exists():
        try:
            with open(PUBLIC_JSON_PATH, 'r', encoding='utf-8') as f:
                old_master = json.load(f)
                if isinstance(old_master, dict) and 'dcr_serials_list' in old_master:
                    all_dcr_serials_set.update(old_master['dcr_serials_list'])
        except Exception:
            pass

    sorted_dcr_serials = sorted(list(all_dcr_serials_set))

    # Build Master Export
    master_export = {
        'summary': {
            'total_dcr_chains': valid_chains,
            'total_mapped_snumbers': matched_snumbers,
            'total_entities_tracked': len(vendor_intelligence),
            'total_manufacturers': len(ranking),
            'total_dcr_serials': len(sorted_dcr_serials)
        },
        'vendor_intelligence': vendor_intelligence,
        'snumber_dcr_map': snumber_dcr_map,
        'manufacturers_ranking': ranking,
        'dcr_serials_list': sorted_dcr_serials
    }

    # Save to public and dist
    print(f"\n💾 Saving master export to {PUBLIC_JSON_PATH}...")
    PUBLIC_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(PUBLIC_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(master_export, f, separators=(',', ':'))

    if DIST_JSON_PATH.parent.exists():
        print(f"💾 Saving sync copy to {DIST_JSON_PATH}...")
        with open(DIST_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(master_export, f, separators=(',', ':'))

    print("\n" + "=" * 70)
    print("🎉 DCR SUPPLY CHAIN MASTER UPDATED SUCCESSFULLY!")
    print(f"• Total DCR Chains Tracked:      {valid_chains:,}")
    print(f"• Total Verified Panel Serials:  {len(sorted_dcr_serials):,}")
    print(f"• S-Numbers Linked to DCR:       {matched_snumbers:,}")
    print(f"• Entities & Vendors Tracked:    {len(vendor_intelligence):,}")
    print(f"• Manufacturers Ranked:          {len(ranking):,}")
    print(f"• Master JSON File Size:         {PUBLIC_JSON_PATH.stat().st_size / (1024*1024):.2f} MB")
    print("=" * 70)

if __name__ == '__main__':
    custom_excel = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE_EXCEL
    build_dcr_master(custom_excel)
