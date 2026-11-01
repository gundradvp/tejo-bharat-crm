import csv
import re
import json
from collections import defaultdict

statement_path = "/Users/durgajo/Desktop/Tejo Bharat/Statements/KM256518330_statement 2.csv"

def parse_amount(val):
    if not val:
        return 0.0
    return float(val.replace(",", "").strip())

txs = []
with open(statement_path, "r", encoding="utf-8", errors="ignore") as f:
    reader = csv.reader(f)
    header_found = False
    for r in reader:
        if not r:
            continue
        if len(r) > 1 and "Transaction Date" in r[1]:
            header_found = True
            continue
        if header_found and len(r) >= 7:
            sl = r[0].strip()
            date = r[1].strip()
            val_date = r[2].strip()
            desc = r[3].strip()
            ref = r[4].strip()
            amt = parse_amount(r[5])
            dr_cr = r[6].strip().upper()
            bal = parse_amount(r[7]) if len(r) > 7 else 0.0
            txs.append({
                "sl": sl,
                "date": date,
                "val_date": val_date,
                "desc": desc,
                "ref": ref,
                "amount": amt,
                "type": dr_cr,
                "balance": bal
            })

print(f"Total transactions: {len(txs)}")
cr_txs = [t for t in txs if t["type"] == "CR"]
dr_txs = [t for t in txs if t["type"] == "DR"]

cr_total = sum(t["amount"] for t in cr_txs)
dr_total = sum(t["amount"] for t in dr_txs)
print(f"Credits (CR): {len(cr_txs)} totalling Rs. {cr_total:,.2f}")
print(f"Debits (DR): {len(dr_txs)} totalling Rs. {dr_total:,.2f}")

print("\n=== DSR TRANSACTIONS ===")
dsr_txs = [t for t in txs if "dsr" in t["desc"].lower()]
for t in dsr_txs:
    print(f"Sl {t['sl']}: Date {t['date']} | {t['type']} Rs. {t['amount']:,.2f} | Ref: {t['ref']} | Desc: {t['desc']}")
dsr_total = sum(t['amount'] for t in dsr_txs)
print(f"Total DSR Amount: Rs. {dsr_total:,.2f}")

print("\n=== EXTRACTING ALL PARTIES FROM TRANSACTIONS ===")
party_txs = defaultdict(list)
for t in txs:
    desc = t["desc"].upper()
    party = "OTHER"
    if "DSR" in desc:
        party = "DSR SOLAR"
    elif "SUNRAY" in desc:
        party = "SUNRAY SOLAR"
    elif "ECO WATTS" in desc or "ECOWATTS" in desc:
        party = "ECO WATTS SOLAR"
    elif "PSK SOLAR" in desc:
        party = "PSK SOLAR"
    elif "LAKSHMI GREEN" in desc:
        party = "LAKSHMI GREEN ENERGY"
    elif "SINGANA" in desc:
        party = "SINGANA VENKATARAMAM"
    elif "GANTA" in desc or "SRINU" in desc:
        party = "GANTASRINU"
    elif "URDWA" in desc:
        party = "URDWA SOLAR"
    elif "NAGARJUNA" in desc or "GOLLAKOTA" in desc:
        party = "GOLLAKOTA NAGARJUNA"
    elif "SURENDRA" in desc:
        party = "SURENDRA"
    elif "JYOTHSNA" in desc:
        party = "JYOTHSNA"
    elif "DURGA RAO" in desc or "GUNDRA" in desc:
        party = "DURGA RAO"
    elif "CASH DEPOSIT" in desc:
        party = "CASH DEPOSIT"
    elif "CHRG:" in desc or "CHARGE" in desc:
        party = "BANK CHARGES"
    elif "TAX" in desc or "GST" in desc:
        party = "TAX / GST"
    elif "SALARY" in desc:
        party = "SALARY"
    elif "UPI" in desc:
        party = "UPI / RETAIL CUSTOMER"
    elif any(k in desc for k in ["NEFT", "RTGS", "IMPS"]):
        # Might be loan tranche or customer transfer
        party = "LOAN TRANCHE / CUSTOMER TRANSFER"
    party_txs[party].append(t)

for p, plist in sorted(party_txs.items(), key=lambda x: sum(i["amount"] for i in x[1]), reverse=True):
    tot = sum(i["amount"] for i in plist)
    print(f"{p}: {len(plist)} txs | Total: Rs. {tot:,.2f}")
