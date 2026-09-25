import { supabase } from './supabase';

export interface WebSyncProgress {
  step: 'idle' | 'downloading' | 'parsing' | 'checking' | 'enriching' | 'inserting' | 'updating' | 'complete' | 'error';
  message: string;
  totalRows?: number;
  newRows?: number;
  updatedRows?: number;
  percent: number;
}

const MONTH_MAP: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

function parseComplaintDate(dateStr?: string | null): string | null {
  if (!dateStr || dateStr.trim() === '' || dateStr.trim() === '-' || dateStr.trim() === '--') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const mon = MONTH_MAP[parts[1].toUpperCase()] || '01';
    const year = parts[2];
    return `${year}-${mon}-${day}`;
  }
  return null;
}

async function asyncPool<T, R>(poolLimit: number, array: T[], iteratorFn: (item: T) => Promise<R>): Promise<R[]> {
  const ret: Promise<R>[] = [];
  const executing: Promise<any>[] = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    if (poolLimit <= array.length) {
      const e: Promise<any> = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

export interface APEPDCLCircleOption {
  id: string;
  name: string;
  shortName: string;
  isAll?: boolean;
}

export const APEPDCL_CIRCLES: APEPDCLCircleOption[] = [
  { id: 'ALL', name: '🌐 ALL Circles (Entire APEPDCL - All 11 Districts)', shortName: 'All Circles', isAll: true },
  { id: 'KAKINADA', name: 'Kakinada', shortName: 'Kakinada' },
  { id: 'DR.B.R.AMBEDKAR KONASEEMA', name: 'Dr. B.R. Ambedkar Konaseema', shortName: 'Konaseema' },
  { id: 'EAST GODAVARI', name: 'East Godavari (Rajahmundry)', shortName: 'East Godavari' },
  { id: 'WEST GODAVARI', name: 'West Godavari', shortName: 'West Godavari' },
  { id: 'ELURU', name: 'Eluru', shortName: 'Eluru' },
  { id: 'VISAKHAPATNAM', name: 'Visakhapatnam', shortName: 'Visakhapatnam' },
  { id: 'ANAKAPALLI', name: 'Anakapalli', shortName: 'Anakapalli' },
  { id: 'ALLURI SITHARAMARAJU', name: 'Alluri Sitharama Raju (ASR)', shortName: 'ASR' },
  { id: 'VIZIANAGARAM', name: 'Vizianagaram', shortName: 'Vizianagaram' },
  { id: 'PARVATHIPURAM MANYAM', name: 'Parvathipuram Manyam', shortName: 'Parvathipuram' },
  { id: 'SRIKAKULAM', name: 'Srikakulam', shortName: 'Srikakulam' },
];

export interface WebSyncOptions {
  circle?: string;
  htmlContent?: string;
  fileName?: string;
}

export async function runWebPMSuryaSync(
  circleOrOptions: string | WebSyncOptions = 'KAKINADA',
  onProgress?: (progress: WebSyncProgress) => void
): Promise<{ total: number; newCount: number; updatedCount: number }> {
  const options: WebSyncOptions = typeof circleOrOptions === 'string'
    ? { circle: circleOrOptions }
    : circleOrOptions;

  const circle = (options.circle || 'KAKINADA').trim().toUpperCase();
  const isAll = circle === 'ALL';
  const circleLabel = isAll ? 'ALL Circles (Entire APEPDCL - All 11 Districts)' : circle;
  const isFile = Boolean(options.htmlContent);

  let html = '';

  if (options.htmlContent) {
    onProgress?.({
      step: 'downloading',
      message: `Loading HTML file data (${(options.htmlContent.length / (1024 * 1024)).toFixed(1)} MB)...`,
      percent: 25,
    });
    html = options.htmlContent;
  } else {
    // Step 1: Download
    onProgress?.({
      step: 'downloading',
      message: `Connecting to APEPDCL portal for ${circleLabel}...`,
      percent: 10,
    });

    const url = `/api/apepdcl/jw/corporatedashboard/PMSuryadet.jsp?&CmtType=PMSREG&Circle=${encodeURIComponent(circle)}&Divisionval=ALL&SubDivval=ALL&AglType=&Secval=ALL&Pentype=&AppTyp=ALL`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from APEPDCL (HTTP ${response.status}): ${response.statusText}`);
    }

    onProgress?.({
      step: 'downloading',
      message: isAll ? 'Receiving full portal dataset (all 11 circles)...' : 'Receiving portal data stream...',
      percent: 25,
    });

    html = await response.text();
  }

  // Step 2: Parsing
  onProgress?.({
    step: 'parsing',
    message: 'Parsing HTML records...',
    percent: 35,
  });

  if (html.includes('id="root"') || (!html.includes('<tr') && !html.includes('<table'))) {
    throw new Error(
      'APEPDCL Live Sync cannot connect directly across domains in production. Please use the "Upload .html File" button (or PM Surya Ghar JSON Import) to load records.'
    );
  }

  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  let headerParsed = false;
  const records: Record<string, any>[] = [];
  const seenSc = new Set<string>();

  while ((trMatch = trRegex.exec(html)) !== null) {
    const trContent = trMatch[1];
    if (!headerParsed) {
      if (trContent.includes('<th')) {
        headerParsed = true;
        continue;
      }
    }

    const tdMatches = [...trContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    if (tdMatches.length < 10) continue;

    const cells = tdMatches.map((m) => m[1].replace(/<[^>]+>/g, '').trim());

    // Clean SC Number: remove leading single quotes (') or double quotes
    const scNo = (cells[5] || '').replace(/^[\x27\x22]+/, '').trim();
    if (!scNo || seenSc.has(scNo)) continue;
    seenSc.add(scNo);

    const epRegNo = cells[10] && cells[10] !== '-' && cells[10] !== '--' ? cells[10].trim() : null;
    const rowCircle = cells[1] && cells[1] !== '-' ? cells[1].trim() : '';

    records.push({
      serial_number: parseInt(cells[0]) || null,
      circle_name: rowCircle || (isAll ? 'UNKNOWN' : circle),
      division_name: cells[2] || null,
      subdiv_name: cells[3] || null,
      section_name: cells[4] || null,
      sc_number: scNo,
      existing_load_kw: parseFloat(cells[6]) || null,
      existing_solar_load_kw: parseFloat(cells[7]) || null,
      applied_solar_load_kw: parseFloat(cells[8]) || null,
      np_registration_number: cells[9] && cells[9] !== '-' ? cells[9].trim() : null,
      ep_registration_number: epRegNo,
      complaint_date: parseComplaintDate(cells[11]),
      mobile_number: cells[12] && cells[12] !== '-' ? cells[12].trim() : null,
      email: cells[13] && cells[13] !== '-' ? cells[13].trim() : null,
      national_portal_status: cells[14] || null,
      epdcl_portal_status: cells[15] || null,
      call_status: epRegNo ? 'solar_already_installed' : 'not_called',
    });
  }

  if (records.length === 0) {
    throw new Error('No records found in APEPDCL response table.');
  }

  // Step 3: Check Existing in CRM
  onProgress?.({
    step: 'checking',
    message: `Checking ${records.length.toLocaleString('en-IN')} portal records against CRM database...`,
    totalRows: records.length,
    percent: 45,
  });

  const nowIso = new Date().toISOString();
  const dateStr = nowIso.split('T')[0];
  const batchId = crypto.randomUUID();
  const batchLabel = isFile
    ? `APEPDCL File-Import [${isAll ? 'ALL' : circle}] ${dateStr}`
    : `APEPDCL Web-Sync [${isAll ? 'ALL' : circle}] ${dateStr}`;

  const scList = records.map((r) => r.sc_number);
  const existingMap = new Map<string, any>();
  const chunks: string[][] = [];
  for (let i = 0; i < scList.length; i += 200) {
    chunks.push(scList.slice(i, i + 200));
  }

  let checkedCount = 0;
  await asyncPool(6, chunks, async (chunk) => {
    const { data } = await supabase
      .from('lead_prospects')
      .select('id, sc_number, created_at, national_portal_status, epdcl_portal_status, ep_registration_number, applied_solar_load_kw')
      .in('sc_number', chunk);

    if (data) {
      for (const row of data) {
        existingMap.set(row.sc_number, row);
      }
    }
    checkedCount += chunk.length;
    const pct = 45 + Math.round((checkedCount / scList.length) * 20);
    onProgress?.({
      step: 'checking',
      message: `Verified ${Math.min(checkedCount, scList.length).toLocaleString('en-IN')} of ${scList.length.toLocaleString('en-IN')} records...`,
      totalRows: records.length,
      percent: Math.min(pct, 65),
    });
  });

  const newRecords: Record<string, any>[] = [];
  const updatedRecords: Record<string, any>[] = [];

  for (const r of records) {
    const existing = existingMap.get(r.sc_number);
    if (!existing) {
      newRecords.push({
        ...r,
        created_at: nowIso,
        updated_at: nowIso,
        import_batch_id: batchId,
        import_batch_label: batchLabel,
      });
    } else {
      const changed =
        existing.national_portal_status !== r.national_portal_status ||
        existing.epdcl_portal_status !== r.epdcl_portal_status ||
        existing.ep_registration_number !== r.ep_registration_number ||
        existing.applied_solar_load_kw !== r.applied_solar_load_kw;

      if (changed) {
        updatedRecords.push({
          id: existing.id,
          national_portal_status: r.national_portal_status,
          epdcl_portal_status: r.epdcl_portal_status,
          ep_registration_number: r.ep_registration_number,
          applied_solar_load_kw: r.applied_solar_load_kw,
          call_status: r.ep_registration_number ? 'solar_already_installed' : undefined,
          updated_at: nowIso,
        });
      }
    }
  }

  // Step 4: Auto-enrich new records from eb_customers
  if (newRecords.length > 0) {
    onProgress?.({
      step: 'enriching',
      message: `Enriching ${newRecords.length} new prospects with EB customer details...`,
      totalRows: records.length,
      newRows: newRecords.length,
      percent: 70,
    });

    const newScList = newRecords.map((r) => r.sc_number);
    const ebMap = new Map<string, any>();
    const ebChunks: string[][] = [];
    for (let i = 0; i < newScList.length; i += 200) {
      ebChunks.push(newScList.slice(i, i + 200));
    }

    await asyncPool(6, ebChunks, async (chunk) => {
      const { data } = await supabase
        .from('eb_customers')
        .select('sc_number, customer_name, mandal_name, section_name, area_name')
        .in('sc_number', chunk);
      if (data) {
        for (const row of data) {
          ebMap.set(row.sc_number, row);
        }
      }
    });

    for (const r of newRecords) {
      const eb = ebMap.get(r.sc_number);
      if (eb) {
        if (!r.customer_name && eb.customer_name) r.customer_name = eb.customer_name;
        if (!r.mandal_name && eb.mandal_name) r.mandal_name = eb.mandal_name;
        if (!r.section_name && eb.section_name) r.section_name = eb.section_name;
        if (!r.area_name && eb.area_name) r.area_name = eb.area_name;
      }
    }
  }

  // Step 5: Insert NEW records
  let insertedCount = 0;
  if (newRecords.length > 0) {
    onProgress?.({
      step: 'inserting',
      message: `Inserting ${newRecords.length} brand new prospects stamped with today's date...`,
      totalRows: records.length,
      newRows: newRecords.length,
      percent: 80,
    });

    for (let i = 0; i < newRecords.length; i += 250) {
      const batch = newRecords.slice(i, i + 250);
      const { error } = await supabase.from('lead_prospects').insert(batch);
      if (!error) {
        insertedCount += batch.length;
      } else {
        console.error('Error inserting batch in web sync:', error);
      }
      const insertPct = 80 + Math.round((insertedCount / newRecords.length) * 10);
      onProgress?.({
        step: 'inserting',
        message: `Inserted ${Math.min(insertedCount, newRecords.length).toLocaleString('en-IN')} of ${newRecords.length.toLocaleString('en-IN')} new prospects...`,
        totalRows: records.length,
        newRows: insertedCount,
        percent: Math.min(insertPct, 90),
      });
    }
  }

  // Step 6: Update EXISTING records
  let updatedCount = 0;
  if (updatedRecords.length > 0) {
    onProgress?.({
      step: 'updating',
      message: `Updating ${updatedRecords.length.toLocaleString('en-IN')} existing prospects with status changes...`,
      totalRows: records.length,
      newRows: insertedCount,
      updatedRows: updatedRecords.length,
      percent: 90,
    });

    const updateChunks: any[][] = [];
    for (let i = 0; i < updatedRecords.length; i += 50) {
      updateChunks.push(updatedRecords.slice(i, i + 50));
    }

    let batchCount = 0;
    await asyncPool(8, updateChunks, async (batch) => {
      for (const row of batch) {
        const { id, ...updateFields } = row;
        const { error } = await supabase.from('lead_prospects').update(updateFields).eq('id', id);
        if (!error) updatedCount++;
      }
      batchCount += batch.length;
      const updatePct = 90 + Math.round((batchCount / updatedRecords.length) * 9);
      onProgress?.({
        step: 'updating',
        message: `Updated ${Math.min(updatedCount, updatedRecords.length).toLocaleString('en-IN')} of ${updatedRecords.length.toLocaleString('en-IN')} existing prospects...`,
        totalRows: records.length,
        newRows: insertedCount,
        updatedRows: updatedCount,
        percent: Math.min(updatePct, 99),
      });
    });
  }

  onProgress?.({
    step: 'complete',
    message: `Sync Complete! ${insertedCount} new prospects added, ${updatedCount} existing updated.`,
    totalRows: records.length,
    newRows: insertedCount,
    updatedRows: updatedCount,
    percent: 100,
  });

  return { total: records.length, newCount: insertedCount, updatedCount };
}
