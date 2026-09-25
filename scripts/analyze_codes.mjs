import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SYNC_USER_EMAIL = process.env.SYNC_USER_EMAIL || "durga@tejobharat.com";
const SYNC_USER_PASSWORD = process.env.SYNC_USER_PASSWORD || "TejoBharat@2024";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log(`🔐 Authenticating as ${SYNC_USER_EMAIL}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: SYNC_USER_EMAIL,
    password: SYNC_USER_PASSWORD,
  });

  if (authError) {
    console.error("Auth failed:", authError.message);
    process.exit(1);
  }
  console.log("✅ Authenticated!");

  const codeMap = new Map();
  let from = 0;
  const batchSize = 1000;
  let totalProspects = 0;

  while (true) {
    const { data, error } = await supabase
      .from("lead_prospects")
      .select("sc_number, subdiv_name, section_name, village_name, circle_name, division_name")
      .range(from, from + batchSize - 1);
    if (error) { console.error(error); break; }
    if (!data || data.length === 0) break;
    
    totalProspects += data.length;
    for (const row of data) {
      if (!row.sc_number) continue;
      const cleanSc = row.sc_number.trim();
      if (cleanSc.length < 10) continue;
      // User rule: remove last 6 digits, then pick last 4 digits
      const beforeLast6 = cleanSc.slice(0, -6);
      const code = beforeLast6.slice(-4);
      if (code) {
        if (!codeMap.has(code)) {
          codeMap.set(code, {
            code,
            count: 0,
            subdivs: new Set(),
            sections: new Set(),
            villages: new Set(),
            circles: new Set(),
            divisions: new Set(),
          });
        }
        const item = codeMap.get(code);
        item.count++;
        if (row.subdiv_name) item.subdivs.add(row.subdiv_name);
        if (row.section_name) item.sections.add(row.section_name);
        if (row.village_name) item.villages.add(row.village_name);
        if (row.circle_name) item.circles.add(row.circle_name);
        if (row.division_name) item.divisions.add(row.division_name);
      }
    }
    if (data.length < batchSize) break;
    from += batchSize;
  }

  const sorted = Array.from(codeMap.values()).sort((a, b) => b.count - a.count);
  console.log(`\nTotal prospects scanned: ${totalProspects}`);
  console.log(`Total unique area/service codes: ${sorted.length}\n`);

  const outputData = sorted.map(item => ({
    code: item.code,
    count: item.count,
    subdivs: Array.from(item.subdivs),
    sections: Array.from(item.sections),
    villages: Array.from(item.villages).slice(0, 5),
    circles: Array.from(item.circles),
    divisions: Array.from(item.divisions),
  }));

  const outDir = path.resolve(__dirname, "../src/data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.resolve(outDir, "areaCodes.json"), JSON.stringify(outputData, null, 2));
  console.log("Wrote src/data/areaCodes.json successfully.\n");

  console.log("TOP 50 AREA / SERVICE CODES:");
  console.log("---------------------------------------------------------------------------------");
  for (const item of sorted.slice(0, 50)) {
    const subStr = Array.from(item.subdivs).join(", ");
    const secStr = Array.from(item.sections).slice(0, 2).join(", ");
    console.log(`${item.code.padEnd(6)} | ${String(item.count).padStart(5)} prospects | Subdiv: ${subStr.padEnd(20)} | Sec: ${secStr}`);
  }
}
run();
