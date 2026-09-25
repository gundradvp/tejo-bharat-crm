# WhatsApp Cloud API & CRM Integration - Complete Setup Guide
**Tejo Bharat Global Energy LLP**  
*Document Version: 1.0 | Last Updated: September 2026*

---

## 1. Overview & Architecture

This guide details the complete end-to-end setup for connecting WhatsApp Cloud API with the Tejo Bharat Solar CRM, enabling bidirectional messaging (inbound customer replies and outbound marketing/utility messages).

```
┌─────────────────────────────────┐
│     Customer on WhatsApp        │
│   (e.g., +91 90002 73028)       │
└───────────────▲─────────────────┘
                │ Inbound / Outbound WhatsApp Messages
                ▼
┌─────────────────────────────────┐
│       Meta Graph Cloud API      │
│  Business No: +91 81211 04043   │
│  WABA ID: 4556284211311438      │
│  Phone ID: 1365414523316262     │
└───────────────▲─────────────────┘
                │
     Outbound   │ Webhook POST Events
     REST Calls │ (override_callback_uri)
                ▼
┌───────────────────────────────────────────────┐
│            Supabase Cloud                     │
│  Edge Function: whatsapp-webhook              │
│  Tables: whatsapp_messages & whatsapp_chats   │
└───────────────▲───────────────────────────────┘
                │ Realtime / Postgres Sync
                ▼
┌───────────────────────────────────────────────┐
│            Tejo Bharat Solar CRM              │
│         (http://localhost:5173)               │
│   WhatsApp Hub: Live Inbox, Templates, Leads  │
└───────────────────────────────────────────────┘
```

---

## 2. Meta Business Manager Setup

### A. System User & Permissions
To communicate with Meta Cloud API in production, use a **System User** (not a personal user token that expires after 24 hours).

1. Go to **[Meta Business Settings](https://business.facebook.com/settings)**.
2. Navigate to **Users &rarr; System users**.
3. Click **Add** to create a system user (e.g. `Employee` or `Tejocrmwhatsapp`) with the **Admin/Employee system user** role.

### B. Assign Assets to System User (Crucial Step!)
If the system user is not assigned to your production WhatsApp Business Account, Meta will reject API requests with `GraphMethodException` or empty data.

1. Under **System users**, select the user (`Employee`).
2. Click **Assign assets**.
3. Under **Apps**, select your App (`Tejo Bharat`) and enable **Full access**.
4. Under **WhatsApp accounts**, select your business account: **`Tejo Bharat Global Energy`** (do not select a test account) and enable **Full control** / **Manage WhatsApp account**.
5. Click **Save changes**.

### C. Generate Permanent Access Token
1. On the same System User panel, click **Generate token**.
2. Select your App: **Tejo Bharat**.
3. Token Expiration: **Never** (or 60 days).
4. Select the following 3 permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `business_management`
5. Click **Generate Token** and store it securely.

---

## 3. Account & Phone Number Identifiers

Keep these IDs handy for configuration:

| Parameter | Value | Location in Meta |
| :--- | :--- | :--- |
| **Meta App ID** | `1832306094067661` | Meta Developers &rarr; App Dashboard |
| **WABA Name** | `Tejo Bharat Global Energy` | Business Settings &rarr; WhatsApp accounts |
| **WABA ID** | `4556284211311438` | Under WABA Name in Business Settings |
| **Display Phone Number** | `+91 81211 04043` | WhatsApp Manager &rarr; Phone numbers |
| **Phone Number ID** | `1365414523316262` | Under phone number in WhatsApp Manager |
| **Verify Token** | `tejo_bharat_whatsapp_secure_2026` | Custom secure string configured on webhook |

---

## 4. Supabase Database & Edge Function

### A. Database Tables
Ensure the tables exist in Supabase Postgres:

```sql
-- 1. WhatsApp Chats Table
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  phone_number TEXT NOT NULL,
  sc_number TEXT,
  circle_name TEXT,
  mandal_name TEXT,
  applied_load_kw NUMERIC,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_direction TEXT,
  unread_count INT DEFAULT 0,
  status TEXT DEFAULT 'open',
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'inbound' or 'outbound'
  type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  sender_name TEXT,
  sender_phone TEXT,
  receiver_phone TEXT,
  status TEXT DEFAULT 'delivered',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### B. Supabase Edge Function (`whatsapp-webhook`)
Location: `supabase/functions/whatsapp-webhook/index.ts`

- Supports **GET**: Verification handshake responding with `hub.challenge` when `hub.verify_token` matches.
- Supports **POST**: Parses inbound customer messages from Meta (`entry[].changes[].value.messages[]`), looks up customer records in `lead_prospects` / `eb_customers`, upserts `whatsapp_chats`, and inserts `whatsapp_messages`.

### C. Deploying Edge Function with No JWT Verification
Since Meta Webhook requests originate from Facebook's servers without a Supabase Bearer token, you **must disable JWT verification**:

```bash
supabase functions deploy whatsapp-webhook --project-ref rlwcqmlspvddfscyngfw --no-verify-jwt
```

---

## 5. Webhook Linking & Meta Routing (The Critical Fix)

Meta requires two levels of webhook subscriptions:

### Step 1: Subscribe WABA to the Meta App
Subscribe the WhatsApp Business Account so the Meta App listens to its events:
```bash
curl -X POST "https://graph.facebook.com/v20.0/4556284211311438/subscribed_apps?subscribed_fields=messages" \
  -H "Authorization: Bearer <PERMANENT_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"subscribed_fields": ["messages"]}'
```
Expected output: `{"success": true}`

### Step 2: Bind the Production Phone Number ID (Crucial!)
If you only configure webhooks at the App level, incoming messages sent to the real phone number may not reach Supabase. You must set an **explicit phone-level override**:
```bash
curl -X POST "https://graph.facebook.com/v20.0/1365414523316262" \
  -H "Authorization: Bearer <PERMANENT_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_configuration": {
      "override_callback_uri": "https://rlwcqmlspvddfscyngfw.supabase.co/functions/v1/whatsapp-webhook",
      "verify_token": "tejo_bharat_whatsapp_secure_2026"
    }
  }'
```
Expected output: `{"success": true}`

Verify with:
```bash
curl -s -H "Authorization: Bearer <PERMANENT_ACCESS_TOKEN>" \
  "https://graph.facebook.com/v20.0/1365414523316262?fields=webhook_configuration"
```
Response will confirm:
```json
{
  "webhook_configuration": {
    "phone_number": "https://rlwcqmlspvddfscyngfw.supabase.co/functions/v1/whatsapp-webhook",
    "application": "https://rlwcqmlspvddfscyngfw.supabase.co/functions/v1/whatsapp-webhook"
  },
  "id": "1365414523316262"
}
```

---

## 6. CRM Application Configuration

In `/Users/durgajo/Desktop/Tejo Bharat/Softwares/crm/.env`:

```env
VITE_SUPABASE_URL=https://rlwcqmlspvddfscyngfw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_WHATSAPP_PHONE_ID=1365414523316262
VITE_WHATSAPP_WABA_ID=4556284211311438
VITE_WHATSAPP_ACCESS_TOKEN=<PERMANENT_SYSTEM_USER_ACCESS_TOKEN>
VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN=tejo_bharat_whatsapp_secure_2026
```

In `src/lib/whatsappStorage.ts`, ensure `DEFAULT_SETTINGS` uses these environment variables with proper fallback defaults.

---

## 7. Testing & Verification Runbook

### Outbound Message Test:
```bash
curl -X POST "https://graph.facebook.com/v20.0/1365414523316262/messages" \
  -H "Authorization: Bearer <PERMANENT_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "919000273028",
    "type": "text",
    "text": { "body": "Test message from Tejo Bharat Solar" }
  }'
```

### Inbound Message Test:
1. Open WhatsApp on any customer mobile phone.
2. Send a WhatsApp message to `+91 81211 04043`.
3. Check the Supabase table:
```sql
SELECT id, chat_id, content, sender_name, created_at 
FROM public.whatsapp_messages 
ORDER BY created_at DESC LIMIT 5;
```
4. View the live conversation in the CRM at `http://localhost:5173` &rarr; **WhatsApp Hub** &rarr; **Live Chat Inbox**.

---

## 8. Troubleshooting Checklist

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **`(#132000) Number of parameters does not match`** | Named template variables (`{{customer_name}}`) sent without `parameter_name` | Include `parameter_name: "customer_name"` in the API body params |
| **Incoming messages show two ticks (✓✓) but CRM gets nothing** | Phone number not bound to webhook override | Run the `POST /{PHONE_NUMBER_ID}` with `override_callback_uri` (Section 5, Step 2) |
| **Webhook returns 403 Forbidden on Supabase** | Supabase Edge Function has JWT Verification enabled | Redeploy using `--no-verify-jwt` |
| **`Unsupported request - method type: post`** | System User does not have WhatsApp Account asset assigned | Go to Business Settings &rarr; System Users &rarr; Assign Assets &rarr; Tejo Bharat Global Energy &rarr; Full Control |
| **Token expires after 24 hours** | Developer "Try It Out" temporary token was used | Generate a Permanent Token under Business Settings &rarr; System Users |
