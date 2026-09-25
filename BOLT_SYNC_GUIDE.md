# ⚡ Fast Bolt Project Sync Guide

Use this guide and one-line command whenever you need to update any Bolt.new project with the latest Tejo Bharat CRM code in seconds without dealing with Git or manual uploads.

---

## 🚀 The 1-Line Bolt Sync Command

Open the **Terminal** tab at the bottom of any Bolt project and run:

```bash
node -e 'fetch("https://raw.githubusercontent.com/gundradvp/tejo-bharat-crm/main/sync.js").then(r=>r.text()).then(eval)'
```

---

## 📋 What This Command Does
1. Pulls the latest production files directly from GitHub (`gundradvp/tejo-bharat-crm`).
2. Bypasses browser CORS restrictions using `raw.githubusercontent.com`.
3. Overwrites/adds all 50+ core application files including:
   - **WhatsApp Hub** (`src/components/WhatsApp/*`, `src/lib/whatsapp*`, `src/types/whatsapp.ts`)
   - **Sticky Notes** (`src/components/StickyNotes/*`)
   - **User Activity Tracker** (`src/components/Activity/*`, `src/contexts/UserActivityContext.tsx`)
   - **Role & Access Controls** (Nagarjuna / Admin permissions for Surya Ghar & JSP)
   - **Area Code Catalogs & PM Surya Ghar Web Sync**
   - **Supabase Migrations** (`supabase/migrations/*`)
   - **Vite Configurations & Proxies** (`vite.config.ts`, `package.json`)
4. Rebuilds cleanly inside Bolt's WebContainer.

---

## 🔄 Workflow for Any Future Project

### Step 1: Open Terminal in Bolt
- Open your Bolt project.
- If Vite dev server is running in the terminal, press `Ctrl + C` to stop it.

### Step 2: Run the Sync One-Liner
```bash
node -e 'fetch("https://raw.githubusercontent.com/gundradvp/tejo-bharat-crm/main/sync.js").then(r=>r.text()).then(eval)'
```

### Step 3: Start the App
```bash
npm run dev
```

---

## 🗄️ Supabase Migrations Reminder
When updating a new project connected to a fresh Supabase database, run the SQL migrations located in:
1. `supabase/migrations/20260925014000_add_lost_at_to_customers.sql`
2. `supabase/migrations/20260924100000_create_whatsapp_inbox_tables.sql`
3. `supabase/migrations/20260912000000_create_jsp_sadhaks_table.sql`
