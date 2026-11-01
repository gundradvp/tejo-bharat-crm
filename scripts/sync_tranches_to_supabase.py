import json
import re
from urllib.request import Request, urlopen

initial_data_path = "/Users/durgajo/Desktop/Tejo Bharat/Softwares/crm/src/data/gstTrancheInitialData.ts"

with open(initial_data_path, "r", encoding="utf-8") as f:
    text = f.read()

# Extract json array
start_idx = text.find("export const INITIAL_GST_TRANCHE_DISBURSALS: GSTTrancheDisbursalItem[] = [")
if start_idx != -1:
    array_str = text[start_idx + len("export const INITIAL_GST_TRANCHE_DISBURSALS: GSTTrancheDisbursalItem[] = [") - 1:].strip()
    if array_str.endswith(";"):
        array_str = array_str[:-1].strip()
    
    # parse JSON
    try:
        items = json.loads(array_str)
        print(f"Parsed {len(items)} items from INITIAL_GST_TRANCHE_DISBURSALS.")
        
        # Prepare for Supabase upsert
        supabase_url = "https://rlwcqmlspvddfscyngfw.supabase.co/rest/v1/gst_tranche_disbursements"
        headers = {
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd2NxbWxzcHZkZGZzY3luZ2Z3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyNTcyMSwiZXhwIjoyMDkwMjAxNzIxfQ.8xDUtgktqSVGRC97z6OqCJuGF6lKRA00ZwDrmP6TW5U",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd2NxbWxzcHZkZGZzY3luZ2Z3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyNTcyMSwiZXhwIjoyMDkwMjAxNzIxfQ.8xDUtgktqSVGRC97z6OqCJuGF6lKRA00ZwDrmP6TW5U",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
        
        records_to_send = []
        for it in items:
            records_to_send.append({
                "id": it["id"],
                "customer_name": it["customer_name"],
                "category": it["category"],
                "bank_name": it.get("bank_name"),
                "t1_date": it.get("t1_date"),
                "t1_amount": it.get("t1_amount", 0),
                "t1_utr": it.get("t1_utr"),
                "t2_date": it.get("t2_date"),
                "t2_amount": it.get("t2_amount", 0),
                "t2_utr": it.get("t2_utr"),
                "total_amount": it.get("total_amount", 0),
                "est_pending": it.get("est_pending", 0),
                "status": it.get("status"),
                "customer_id": it.get("customer_id"),
                "is_gst_invoiced": it.get("is_gst_invoiced", False),
                "invoice_file": it.get("invoice_file"),
                "invoice_number": it.get("invoice_number"),
                "invoice_date": it.get("invoice_date"),
                "notes": it.get("notes")
            })
        
        # Batch upload in chunks of 50
        for i in range(0, len(records_to_send), 50):
            batch = records_to_send[i:i+50]
            req = Request(supabase_url, data=json.dumps(batch).encode("utf-8"), headers=headers, method="POST")
            with urlopen(req) as resp:
                print(f"Upserted batch {i//50 + 1}: status {resp.status}")
        
        print("All records successfully synced to Supabase gst_tranche_disbursements!")
    except Exception as e:
        print("Error parsing / uploading to Supabase:", e)
