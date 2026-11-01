#!/usr/bin/env python3
"""
=============================================================================
Tejo Bharat — State-Wide PM Surya Ghar S-Numbers & Ground Reports Downloader
=============================================================================

Capabilities:
1. Scans state-wide PM Surya Ghar applications (98,078 S-numbers across all 11 circles).
2. Audits which S-numbers already have Ground Reports (panel serials, inverter specs, etc.).
3. Downloads missing Ground Reports concurrently with high-speed async HTTP (aiohttp).
4. Updates CRM's public/s_numbers_ground_reports.json for instant CRM searching.

Usage:
  python3 scripts/download_state_ground_reports.py --status
  python3 scripts/download_state_ground_reports.py --circle=KAKINADA --status
  python3 scripts/download_state_ground_reports.py --circle=KAKINADA --download --concurrency=25
  python3 scripts/download_state_ground_reports.py --all --download --limit=500
  python3 scripts/download_state_ground_reports.py --live --circle=ALL
"""

import os
import sys
import re
import json
import glob
import time
import argparse
import asyncio
from pathlib import Path

# Try to import aiohttp for async downloads
try:
    import aiohttp
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
SOFTWARES_DIR = BASE_DIR
CRM_DIR = SOFTWARES_DIR / "crm"
SOLAR_DATA_DIR = SOFTWARES_DIR / "solar_data"
FETCH_BILLS_DIR = SOFTWARES_DIR.parent / "Customers" / "FetchBills"
STATE_HTML_PATH = FETCH_BILLS_DIR / "pmsurya_all_circles.html"
GROUND_JSON_PATH = CRM_DIR / "public" / "s_numbers_ground_reports.json"

BASE_URL = "https://epccbopn.apeasternpower.com/jw/web/json/plugin/com.phoenix.services.WebserviceRevisedSolarP3GroundReport/service"
STATE_URL = "https://epccbopn.apeasternpower.com/jw/corporatedashboard/PMSuryadet.jsp?&CmtType=PMSREG&Circle=ALL&Divisionval=ALL&SubDivval=ALL&AglType=&Secval=ALL&Pentype=&AppTyp=ALL"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "X-Requested-With": "XMLHttpRequest",
}

def load_existing_ground_reports():
    """Load all existing ground reports from disk (solar_data, pithapuram_data, public JSON)"""
    by_snum = {}
    
    # 1. From CRM public JSON if exists
    if GROUND_JSON_PATH.exists():
        try:
            with open(GROUND_JSON_PATH, "r", encoding="utf-8") as f:
                for r in json.load(f):
                    s = r.get("COMP_NO") or r.get("SMAPI_COM")
                    if s:
                        by_snum[s] = r
        except Exception as e:
            print(f"⚠️  Warning reading {GROUND_JSON_PATH}: {e}")

    # 2. From solar_data directory
    if SOLAR_DATA_DIR.exists():
        for fp in glob.glob(str(SOLAR_DATA_DIR / "**" / "S*.json")):
            try:
                with open(fp, "r", errors="ignore") as f:
                    d = json.load(f)
                    if isinstance(d, dict):
                        s = d.get("COMP_NO") or d.get("SMAPI_COM")
                        if s and s.startswith("S"):
                            by_snum[s] = d
            except:
                pass

    return by_snum

def parse_state_html(html_path):
    """Parse table records from state HTML file"""
    if not os.path.exists(html_path):
        raise FileNotFoundError(f"State HTML file not found at: {html_path}")

    print(f"📖 Reading state HTML from: {html_path} ({os.path.getsize(html_path) / (1024*1024):.1f} MB)...")
    with open(html_path, "r", errors="ignore") as f:
        content = f.read()

    tr_regex = re.compile(r"<tr[^>]*>(.*?)</tr>", re.DOTALL | re.IGNORECASE)
    td_regex = re.compile(r"<td[^>]*>(.*?)</td>", re.DOTALL | re.IGNORECASE)

    records = []
    seen = set()

    for tr in tr_regex.finditer(content):
        row_text = tr.group(1)
        if "<th" in row_text.lower():
            continue
        tds = td_regex.findall(row_text)
        if len(tds) < 11:
            continue

        clean_tds = [re.sub(r"<[^>]+>", "", t).strip() for t in tds]
        snum = clean_tds[10] if len(clean_tds) > 10 else ""
        if not snum or not snum.startswith("S") or snum in seen:
            continue
        seen.add(snum)

        records.append({
            "snum": snum,
            "circle": clean_tds[1] if len(clean_tds) > 1 else "",
            "division": clean_tds[2] if len(clean_tds) > 2 else "",
            "subdiv": clean_tds[3] if len(clean_tds) > 3 else "",
            "section": clean_tds[4] if len(clean_tds) > 4 else "",
            "scno": clean_tds[5] if len(clean_tds) > 5 else "",
            "load_kw": clean_tds[8] if len(clean_tds) > 8 else "",
            "comp_date": clean_tds[11] if len(clean_tds) > 11 else "",
            "mobile": clean_tds[12] if len(clean_tds) > 12 else "",
            "np_status": clean_tds[14] if len(clean_tds) > 14 else "",
            "ep_status": clean_tds[15] if len(clean_tds) > 15 else "",
        })

    return records

async def download_ground_reports_async(pending_records, concurrency=30, office_id="4000-20", user_id="2000-526"):
    """Download ground reports concurrently using aiohttp"""
    if not HAS_AIOHTTP:
        print("❌ Error: aiohttp is required for parallel downloading. Run: pip install aiohttp")
        return []

    print(f"\n⚡ Starting async downloads for {len(pending_records):,} S-numbers (Concurrency: {concurrency})...")
    out_dir = SOLAR_DATA_DIR / f"state_{office_id}"
    out_dir.mkdir(parents=True, exist_ok=True)

    semaphore = asyncio.Semaphore(concurrency)
    results = []
    total = len(pending_records)
    done_count = 0
    start_time = time.time()

    candidate_offices = [office_id, "9000-138", "4000-10"]

    async def fetch_one(session, rec):
        nonlocal done_count
        snum = rec["snum"]
        dest_file = out_dir / f"{snum}.json"

        async with semaphore:
            for cur_office in candidate_offices:
                url = f"{BASE_URL}?complain_no={snum}&office_id={cur_office}&user_id={user_id}"
                try:
                    async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                        if resp.status == 200:
                            text = await resp.text()
                            try:
                                data = json.loads(text)
                                if isinstance(data, dict) and data.get("status") != "false" and (data.get("COMP_NO") or data.get("SOLAR_PANEL_PRODUCT_SERIAL_NUMBER")):
                                    # Write file
                                    with open(dest_file, "w", encoding="utf-8") as f:
                                        f.write(text)
                                    results.append(data)
                                    break
                            except:
                                pass
                except:
                    pass

            done_count += 1
            if done_count % 25 == 0 or done_count == total:
                elapsed = time.time() - start_time
                rate = done_count / max(1, elapsed)
                pct = (done_count / total) * 100
                print(f"\r  Progress: {done_count:,} / {total:,} ({pct:.1f}%) | Speed: {rate:.1f}/s | Success: {len(results):,}", end="", flush=True)

    connector = aiohttp.TCPConnector(limit=concurrency + 10, ttl_dns_cache=300)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [fetch_one(session, r) for r in pending_records]
        await asyncio.gather(*tasks)

    print(f"\n✅ Download completed! {len(results):,} new Ground Reports saved.")
    return results

def main():
    parser = argparse.ArgumentParser(description="Tejo Bharat State-Wide S-Numbers & Ground Reports Hub")
    parser.add_argument("--circle", type=str, default="ALL", help="Circle name (e.g. KAKINADA, EAST GODAVARI, or ALL)")
    parser.add_argument("--status", action="store_true", help="Show audit of state S-numbers vs downloaded reports")
    parser.add_argument("--download", action="store_true", help="Download missing ground reports for the selected circle")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of downloads (0 for all)")
    parser.add_argument("--concurrency", type=int, default=30, help="Concurrent async downloads")
    parser.add_argument("--office-id", type=str, default="4000-20", help="APEPDCL office ID")
    parser.add_argument("--user-id", type=str, default="2000-526", help="APEPDCL user ID")
    args = parser.parse_args()

    # 1. Load existing ground reports
    existing_reports = load_existing_ground_reports()
    print(f"📦 Existing Ground Reports in disk/CRM: {len(existing_reports):,}")

    # 2. Parse state-wide HTML
    records = parse_state_html(STATE_HTML_PATH)
    print(f"🌐 Total Unique S-Numbers in State Registry: {len(records):,}")

    # Filter circle
    circle_filter = args.circle.strip().upper()
    if circle_filter != "ALL":
        records = [r for r in records if circle_filter in r["circle"].upper()]
        print(f"🎯 Filtered for Circle [{circle_filter}]: {len(records):,} S-numbers")

    # Audit
    have_count = sum(1 for r in records if r["snum"] in existing_reports)
    missing = [r for r in records if r["snum"] not in existing_reports]

    print("\n" + "=" * 60)
    print(f"📊 AUDIT REPORT: Circle = {circle_filter}")
    print("=" * 60)
    print(f"  Total S-Numbers in Registry : {len(records):,}")
    print(f"  Ground Reports Downloaded   : {have_count:,} ({have_count / max(1, len(records)) * 100:.1f}%)")
    print(f"  Ground Reports PENDING      : {len(missing):,}")
    print("=" * 60)

    if args.download and missing:
        to_download = missing if args.limit == 0 else missing[:args.limit]
        print(f"\n🚀 Downloading {len(to_download):,} pending reports...")
        new_downloads = asyncio.run(download_ground_reports_async(to_download, args.concurrency, args.office_id, args.user_id))

        if new_downloads:
            # Refresh combined public JSON
            print("\n🔄 Updating CRM's public/s_numbers_ground_reports.json...")
            for d in new_downloads:
                s = d.get("COMP_NO") or d.get("SMAPI_COM")
                if s:
                    existing_reports[s] = d
            
            with open(GROUND_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(list(existing_reports.values()), f)
            print(f"✅ Successfully updated CRM ground reports index: {len(existing_reports):,} total verified records.")

if __name__ == "__main__":
    main()
