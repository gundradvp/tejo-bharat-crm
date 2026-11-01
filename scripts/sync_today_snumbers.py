#!/usr/bin/env python3
"""
=============================================================================
Tejo Bharat — Daily Latest S-Numbers & Ground Reports Downloader
=============================================================================

Zero-dependency script (uses Python standard library concurrent.futures).

1. Fetches latest registered complaints from active APEPDCL offices:
   - Circle Office: 9000-138 (User 2000-100) -> 2,140+ active records
   - Division Office: 4000-20 (User 2000-526) -> 124 active records
2. Identifies newly registered complaints that don't have Ground Reports yet.
3. Downloads full Ground Reports (Panel Serials, Inverter Make/Serial, Net Meter,
   Vendor Name, CFA Central Subsidies) concurrently via multi-threading.
4. Directly updates:
   - crm/public/s_numbers_ground_reports.json (for instant CRM Dashboard display)
   - solar_data/archive/{snum}.json (local file archive)

Usage:
  python3 scripts/sync_today_snumbers.py
  python3 scripts/sync_today_snumbers.py --office=9000-138 --user=2000-100
  python3 scripts/sync_today_snumbers.py --limit=50 --workers=30
"""

import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

CRM_DIR = Path(__file__).resolve().parent.parent
SOFTWARES_DIR = CRM_DIR.parent
SOLAR_DATA_DIR = SOFTWARES_DIR / "solar_data"
PUBLIC_JSON_PATH = CRM_DIR / "public" / "s_numbers_ground_reports.json"

BASE_URL = "https://epccbopn.apeasternpower.com/jw/web/json/plugin/com.phoenix.services.WebserviceRevisedSolarP3GroundReport/service"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "X-Requested-With": "XMLHttpRequest",
}

DEFAULT_OFFICE_USERS = [
    ("9000-138", "2000-100"),
    ("4000-20", "2000-526"),
]

def load_existing_reports():
    """Load existing ground reports into a dict keyed by complain_no"""
    by_snum = {}
    if PUBLIC_JSON_PATH.exists():
        try:
            with open(PUBLIC_JSON_PATH, "r", encoding="utf-8") as f:
                for r in json.load(f):
                    s = r.get("COMP_NO") or r.get("SMAPI_COM")
                    if s:
                        by_snum[s] = r
        except Exception as e:
            print(f"⚠️  Warning reading public json: {e}")
    return by_snum

def fetch_office_complaints(office_id, user_id):
    """Fetch complaints list registered for an office & user"""
    url = f"{BASE_URL}?office_id={office_id}&user_id={user_id}"
    print(f"📡 Querying APEPDCL Gateway (Office: {office_id}, User: {user_id})...")
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=35) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if isinstance(data, list):
                print(f"  ✅ Received {len(data):,} complaints from Office {office_id}")
                return data
            elif isinstance(data, dict):
                print(f"  ℹ️ Dict response: {data.get('status')}")
    except Exception as e:
        print(f"  ❌ Error fetching from office {office_id}: {e}")
    return []

def fetch_single_ground_report(snum, office_id="9000-138", user_id="2000-100"):
    """Fetch full ground report for a single S-number"""
    candidates = [(office_id, user_id), ("4000-20", "2000-526"), ("9000-138", "2000-100")]
    for cur_office, cur_user in candidates:
        url = f"{BASE_URL}?complain_no={snum}&office_id={cur_office}&user_id={cur_user}"
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as resp:
                text = resp.read().decode("utf-8")
                data = json.loads(text)
                if isinstance(data, dict) and data.get("status") != "false" and (data.get("COMP_NO") or data.get("SOLAR_PANEL_PRODUCT_SERIAL_NUMBER")):
                    return data, text
        except Exception:
            pass
    return None, None

def download_ground_reports_parallel(pending_complaints, max_workers=25):
    """Download full ground reports for pending complaints using ThreadPoolExecutor"""
    results = {}
    total = len(pending_complaints)
    if total == 0:
        return results

    print(f"\n⚡ Downloading {total:,} full Ground Reports (Workers: {max_workers})...")
    done_count = 0
    start_time = time.time()
    archive_dir = SOLAR_DATA_DIR / "latest_sync"
    archive_dir.mkdir(parents=True, exist_ok=True)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_item = {
            executor.submit(
                fetch_single_ground_report,
                item.get("COMP_NO") or item.get("SMAPI_COM"),
                item.get("OFFICE_ID") or "9000-138",
                item.get("USER_ID") or "2000-100"
            ): item for item in pending_complaints
        }

        for future in as_completed(future_to_item):
            item = future_to_item[future]
            snum = item.get("COMP_NO") or item.get("SMAPI_COM")
            done_count += 1
            try:
                data, raw_text = future.result()
                if data:
                    results[snum] = data
                    # Save to local archive file
                    with open(archive_dir / f"{snum}.json", "w", encoding="utf-8") as f:
                        f.write(raw_text)
            except Exception:
                pass

            if done_count % 10 == 0 or done_count == total:
                elapsed = time.time() - start_time
                rate = done_count / max(1, elapsed)
                pct = (done_count / total) * 100
                print(f"\r  Progress: {done_count:,} / {total:,} ({pct:.1f}%) | Speed: {rate:.1f}/s | Success: {len(results):,}", end="", flush=True)

    print(f"\n✅ Ground report downloads complete: {len(results):,} new reports downloaded.")
    return results

def run_sync(custom_pairs=None, limit=0, max_workers=25):
    pairs = custom_pairs if custom_pairs else DEFAULT_OFFICE_USERS
    existing_reports = load_existing_reports()
    print(f"📦 Currently loaded Ground Reports in CRM: {len(existing_reports):,}")

    all_complaints = []
    seen_snums = set()

    for office, user in pairs:
        items = fetch_office_complaints(office, user)
        for it in items:
            snum = it.get("COMP_NO") or it.get("SMAPI_COM")
            if snum and snum.startswith("S") and snum not in seen_snums:
                seen_snums.add(snum)
                it["OFFICE_ID"] = office
                it["USER_ID"] = user
                all_complaints.append(it)

    print(f"\n📋 Total unique live complaints retrieved: {len(all_complaints):,}")

    # Check pending
    pending = [c for c in all_complaints if (c.get("COMP_NO") or c.get("SMAPI_COM")) not in existing_reports]
    already_done = len(all_complaints) - len(pending)
    print(f"  • Already verified in CRM : {already_done:,}")
    print(f"  • NEW / Pending to fetch  : {len(pending):,}")

    if limit > 0 and len(pending) > limit:
        print(f"  • Limiting download to    : {limit:,} records")
        pending = pending[:limit]

    # Download pending
    if pending:
        new_downloads = download_ground_reports_parallel(pending, max_workers=max_workers)
        for snum, data in new_downloads.items():
            existing_reports[snum] = data

    # Merge basic complaint info for any that didn't have full reports
    for c in all_complaints:
        snum = c.get("COMP_NO") or c.get("SMAPI_COM")
        if snum and snum not in existing_reports:
            existing_reports[snum] = c

    # Strip heavy redundant static lookup payloads to keep public json light (<3.5 MB)
    for r in existing_reports.values():
        if isinstance(r, dict):
            r.pop("INVERTER_MAKE_DATA", None)

    # Write directly to CRM public folder
    print(f"\n💾 Writing directly to CRM Dashboard: {PUBLIC_JSON_PATH}")
    PUBLIC_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(PUBLIC_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(list(existing_reports.values()), f)

    size_mb = PUBLIC_JSON_PATH.stat().st_size / (1024 * 1024)
    print(f"🎉 Success! CRM Dashboard now has {len(existing_reports):,} total records ({size_mb:.2f} MB).")
    print(f"👉 Refresh http://localhost:5173/s-numbers to see the updated data immediately!")

def main():
    parser = argparse.ArgumentParser(description="Tejo Bharat Daily S-Numbers & Ground Reports Sync")
    parser.add_argument("--office", type=str, default="", help="APEPDCL office ID (e.g. 9000-138 or 4000-20)")
    parser.add_argument("--user", type=str, default="", help="APEPDCL user ID (e.g. 2000-100 or 2000-526)")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of new downloads (0 = all)")
    parser.add_argument("--workers", type=int, default=25, help="Number of worker threads")
    args = parser.parse_args()

    custom_pairs = None
    if args.office and args.user:
        custom_pairs = [(args.office, args.user)]

    run_sync(custom_pairs, limit=args.limit, max_workers=args.workers)

if __name__ == "__main__":
    main()
