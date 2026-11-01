import csv
import json

statement_path = "/Users/durgajo/Desktop/Tejo Bharat/Statements/KM256518330_statement 2.csv"
output_ts_path = "/Users/durgajo/Desktop/Tejo Bharat/Softwares/crm/src/data/bankStatementData.ts"

def parse_amount(val):
    if not val:
        return 0.0
    return float(val.replace(",", "").strip())

def detect_party_info(desc):
    u = desc.upper()
    if "DSR" in u:
        return {
            "party": "DSR Solar Enterprises",
            "partyKey": "dsr",
            "partyCategory": "b2b_channel",
            "isProminent": True
        }
    if "SUNRAY" in u:
        return {
            "party": "Sunray Solar Green Energy",
            "partyKey": "sunray",
            "partyCategory": "b2b_channel",
            "isProminent": True
        }
    if "ECO WATTS" in u or "ECOWATTS" in u:
        return {
            "party": "Eco Watts Solar Solutions",
            "partyKey": "ecowatts",
            "partyCategory": "b2b_channel",
            "isProminent": True
        }
    if "PSK SOLAR" in u:
        return {
            "party": "PSK Solar Energy LLP",
            "partyKey": "psk",
            "partyCategory": "b2b_channel",
            "isProminent": True
        }
    if "VENKATA SIRI" in u:
        return {
            "party": "Venkata Siri Solar",
            "partyKey": "venkatasiri",
            "partyCategory": "b2b_channel",
            "isProminent": True
        }
    if "SINGANA" in u:
        return {
            "party": "Singana Venkataramam",
            "partyKey": "singana",
            "partyCategory": "b2b_channel",
            "isProminent": True
        }
    if "GANTA" in u or "SRINU" in u and ("CASH" in u or "IMPS" in u or "CHRG" not in u):
        return {
            "party": "Gantasrinu",
            "partyKey": "gantasrinu",
            "partyCategory": "b2b_channel",
            "isProminent": True
        }
    if "URDWA" in u:
        return {
            "party": "Urdwa Solar Systems",
            "partyKey": "urdwa",
            "partyCategory": "vendor_procurement",
            "isProminent": True
        }
    if "COSMOVI" in u:
        return {
            "party": "Cosmovi International",
            "partyKey": "cosmovi",
            "partyCategory": "vendor_procurement",
            "isProminent": True
        }
    if "LANDTSUFIN" in u or "SUFIN" in u:
        return {
            "party": "L&T Sufin",
            "partyKey": "sufin",
            "partyCategory": "vendor_procurement",
            "isProminent": True
        }
    if "FESTA" in u:
        return {
            "party": "Festa Solar",
            "partyKey": "festa",
            "partyCategory": "vendor_procurement",
            "isProminent": True
        }
    if "CBS" in u:
        return {
            "party": "CBS Chebrolu",
            "partyKey": "cbs",
            "partyCategory": "b2b_channel",
            "isProminent": True
        }
    if "SKY ENERGY" in u:
        return {
            "party": "Sky Energy",
            "partyKey": "skyenergy",
            "partyCategory": "b2b_channel",
            "isProminent": True
        }
    if "LAKSHMI GREEN" in u:
        return {
            "party": "Lakshmi Green Energy",
            "partyKey": "lakshmigreen",
            "partyCategory": "b2b_channel",
            "isProminent": True
        }
    if "JYOTHSNA" in u:
        return {
            "party": "Jyothsna (Director/Partner)",
            "partyKey": "jyothsna",
            "partyCategory": "operations",
            "isProminent": False
        }
    if "DURGA VARA" in u or "DURGA RAO" in u:
        return {
            "party": "Durga Vara Prasad (Director/Partner)",
            "partyKey": "durgarao",
            "partyCategory": "operations",
            "isProminent": False
        }
    if "GOLLAKOTA" in u or "NAGARJUNA" in u or "VEERAM" in u:
        return {
            "party": "Gollakota (Operations)",
            "partyKey": "gollakota",
            "partyCategory": "operations",
            "isProminent": False
        }
    if "CHRG:" in u or "CHARGE" in u:
        return {
            "party": "Bank Charges & Taxes",
            "partyKey": "charges",
            "partyCategory": "bank_charge",
            "isProminent": False
        }
    if "DREAMPLUG" in u or "AMAZON" in u:
        return {
            "party": "Online / Vendor Purchases",
            "partyKey": "online",
            "partyCategory": "vendor_procurement",
            "isProminent": False
        }
    
    # Default to PM Surya Ghar Loan Disbursal
    return {
        "party": "PM Surya Ghar Loan Disbursal",
        "partyKey": "pmsurya",
        "partyCategory": "loan_tranche",
        "isProminent": True
    }

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
            val_date = r[2].strip() if len(r) > 2 else ""
            desc = r[3].strip() if len(r) > 3 else ""
            ref = r[4].strip() if len(r) > 4 else ""
            amt = parse_amount(r[5])
            dr_cr = r[6].strip().upper()
            bal = parse_amount(r[7]) if len(r) > 7 else 0.0

            party_info = detect_party_info(desc)
            txs.append({
                "id": f"tx-{sl}",
                "sl": int(sl) if sl.isdigit() else len(txs) + 1,
                "date": date,
                "valueDate": val_date,
                "desc": desc,
                "refNo": ref,
                "amount": amt,
                "type": dr_cr,
                "balance": bal,
                "party": party_info["party"],
                "partyKey": party_info["partyKey"],
                "partyCategory": party_info["partyCategory"],
                "isProminent": party_info["isProminent"]
            })

ts_content = f"""// Auto-generated Kotak Mahindra Bank Statement Data
// Statement File: KM256518330_statement 2.csv
// Account: 9989279586 | TEJO BHARAT GLOBAL ENERGY LLP | SARPAVARAM Branch
// Period: 01/08/2026 To 30/10/2026

export interface BankStatementTransaction {{
  id: string;
  sl: number;
  date: string;
  valueDate: string;
  desc: string;
  refNo: string;
  amount: number;
  type: 'CR' | 'DR';
  balance: number;
  party: string;
  partyKey: string;
  partyCategory: 'b2b_channel' | 'loan_tranche' | 'vendor_procurement' | 'operations' | 'bank_charge';
  isProminent: boolean;
}}

export interface BankStatementMetadata {{
  accountNumber: string;
  accountName: string;
  bankName: string;
  branch: string;
  ifsc: string;
  micr: string;
  period: string;
  startDate: string;
  endDate: string;
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  latestBalance: number;
  lastUpdated: string;
}}

export const STATEMENT_METADATA: BankStatementMetadata = {{
  accountNumber: '9989279586',
  accountName: 'TEJO BHARAT GLOBAL ENERGY LLP',
  bankName: 'Kotak Mahindra Bank',
  branch: 'SARPAVARAM, KAKINADA',
  ifsc: 'KKBK0000574',
  micr: '533485002',
  period: '01/08/2026 To 30/10/2026',
  startDate: '01/08/2026',
  endDate: '30/10/2026',
  totalTransactions: {len(txs)},
  totalCredits: {sum(t['amount'] for t in txs if t['type'] == 'CR')},
  totalDebits: {sum(t['amount'] for t in txs if t['type'] == 'DR')},
  latestBalance: {txs[0]['balance'] if txs else 0.0},
  lastUpdated: '2026-10-30T12:12:00.000Z'
}};

export const STATEMENT_PARTIES_LIST = [
  {{ key: 'all', name: 'All Parties', count: {len(txs)} }},
  {{ key: 'dsr', name: 'DSR Solar Enterprises', count: {len([t for t in txs if t['partyKey'] == 'dsr'])}, badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' }},
  {{ key: 'sunray', name: 'Sunray Solar Green Energy', count: {len([t for t in txs if t['partyKey'] == 'sunray'])}, badgeColor: 'bg-amber-100 text-amber-800 border-amber-300' }},
  {{ key: 'ecowatts', name: 'Eco Watts Solar Solutions', count: {len([t for t in txs if t['partyKey'] == 'ecowatts'])}, badgeColor: 'bg-blue-100 text-blue-800 border-blue-300' }},
  {{ key: 'venkatasiri', name: 'Venkata Siri Solar', count: {len([t for t in txs if t['partyKey'] == 'venkatasiri'])}, badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300' }},
  {{ key: 'psk', name: 'PSK Solar Energy LLP', count: {len([t for t in txs if t['partyKey'] == 'psk'])}, badgeColor: 'bg-purple-100 text-purple-800 border-purple-300' }},
  {{ key: 'sufin', name: 'L&T Sufin', count: {len([t for t in txs if t['partyKey'] == 'sufin'])}, badgeColor: 'bg-slate-100 text-slate-800 border-slate-300' }},
  {{ key: 'festa', name: 'Festa Solar', count: {len([t for t in txs if t['partyKey'] == 'festa'])}, badgeColor: 'bg-orange-100 text-orange-800 border-orange-300' }},
  {{ key: 'urdwa', name: 'Urdwa Solar Systems', count: {len([t for t in txs if t['partyKey'] == 'urdwa'])}, badgeColor: 'bg-teal-100 text-teal-800 border-teal-300' }},
  {{ key: 'cosmovi', name: 'Cosmovi International', count: {len([t for t in txs if t['partyKey'] == 'cosmovi'])}, badgeColor: 'bg-rose-100 text-rose-800 border-rose-300' }},
  {{ key: 'cbs', name: 'CBS Chebrolu', count: {len([t for t in txs if t['partyKey'] == 'cbs'])}, badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300' }},
  {{ key: 'gantasrinu', name: 'Gantasrinu', count: {len([t for t in txs if t['partyKey'] == 'gantasrinu'])}, badgeColor: 'bg-lime-100 text-lime-800 border-lime-300' }},
  {{ key: 'singana', name: 'Singana Venkataramam', count: {len([t for t in txs if t['partyKey'] == 'singana'])}, badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300' }},
  {{ key: 'pmsurya', name: 'PM Surya Ghar Loan Disbursals', count: {len([t for t in txs if t['partyKey'] == 'pmsurya'])}, badgeColor: 'bg-sky-100 text-sky-800 border-sky-300' }}
];

export const BANK_STATEMENT_TRANSACTIONS: BankStatementTransaction[] = {json.dumps(txs, indent=2)};
"""

with open(output_ts_path, "w", encoding="utf-8") as f:
    f.write(ts_content)

print(f"Successfully generated {output_ts_path} with {len(txs)} transactions.")
