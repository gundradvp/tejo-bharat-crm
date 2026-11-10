// ==UserScript==
// @name         DCR Portal Network Inspector & Batch Serial Checker
// @namespace    https://tejobharat.com/
// @version      2.0.4
// @description  Captures fetch/XHR on DCR Portal without DevTools + Batch DCR Serial Checker with ErrTbl supply-chain parser & CSV/JSON export.
// @match        https://solardcrportal.nise.res.in/*
// @match        *://*dcr*/*
// @match        *://*.mnre.gov.in/*
// @match        *://*.pmsuryaghar.gov.in/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const MAX_LOGS = 300;
  const MAX_BODY_CHARS = 250000;
  const logs = [];
  let selectedId = null;
  let isOpen = false;
  let panelMode = 'net'; // 'net' | 'batch'
  let filterText = '';
  let activeTab = 'response'; // 'response' | 'payload' | 'headers'
  let renderScheduled = false;
  let nextId = 1;

  // Captured DCR session parameters (auto-filled from /Customer/ValidateDcrItem/ or DOM)
  let dcrAuth = {
    token: '',
    subAgencyId: '',
    invoiceDate: '',
    itemType: 'Solar Panels',
    validateUrl: '/Customer/ValidateDcrItem/',
  };

  // Batch DCR checker state
  let batchInputText = '';
  let batchSize = 1000;
  let batchDelayMs = 400;
  let batchRunning = false;
  let batchStopRequested = false;
  let batchProgress = { done: 0, total: 0 };
  let batchResults = [];
  let batchFilter = '';
  let batchLastMsg = '';

  let ui = null;

  function nowTime() {
    return new Date().toTimeString().split(' ')[0];
  }

  function todayDcrDate() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = months[d.getMonth()];
    const yyyy = d.getFullYear();
    return `${dd}-${mmm}-${yyyy}`;
  }

  function safeStringify(val) {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }

  function prettyFormat(str) {
    if (!str || typeof str !== 'string') return '';
    const trimmed = str.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      } catch {
        return str;
      }
    }
    return str;
  }

  function serializeRequestBody(body) {
    if (body == null) return { text: '', formEntries: null };
    if (typeof body === 'string') return { text: body, formEntries: null };
    if (body instanceof URLSearchParams) return { text: body.toString(), formEntries: null };
    if (body instanceof FormData) {
      const entries = [];
      const formEntries = [];
      for (const [k, v] of body.entries()) {
        if (v instanceof File) {
          entries.push(`${k}: [File: ${v.name}, ${v.size} bytes]`);
        } else {
          const strV = String(v);
          entries.push(`${k}: ${strV}`);
          formEntries.push([k, strV]);
        }
      }
      return { text: entries.join('\n'), formEntries };
    }
    if (body instanceof Blob) return { text: `[Blob: ${body.type || 'unknown'}, ${body.size} bytes]`, formEntries: null };
    if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
      return { text: `[Binary: ${body.byteLength} bytes]`, formEntries: null };
    }
    return { text: safeStringify(body), formEntries: null };
  }

  function normalizeHeaders(headersInit) {
    const out = {};
    if (!headersInit) return out;
    try {
      if (headersInit instanceof Headers) {
        headersInit.forEach((v, k) => { out[k] = v; });
      } else if (Array.isArray(headersInit)) {
        for (const [k, v] of headersInit) out[k] = v;
      } else if (typeof headersInit === 'object') {
        for (const k of Object.keys(headersInit)) out[k] = headersInit[k];
      }
    } catch { /* ignore */ }
    return out;
  }

  function captureDcrContext(url, reqHeaders, formEntries, reqBody) {
    try {
      const tokenHeader = Object.entries(reqHeaders || {}).find(
        ([k]) => k.toLowerCase() === 'requestverificationtoken'
      );
      if (tokenHeader && tokenHeader[1]) {
        dcrAuth.token = String(tokenHeader[1]);
      }

      if (String(url || '').toLowerCase().includes('validatedcritem')) {
        dcrAuth.validateUrl = url;
      }

      if (Array.isArray(formEntries)) {
        for (const [k, v] of formEntries) {
          if (k === 'SubAgencyId' && v) dcrAuth.subAgencyId = v;
          if (k === 'InvoiceDate' && v) dcrAuth.invoiceDate = v;
          if (k === 'ItemType' && v) dcrAuth.itemType = v;
        }
      } else if (typeof reqBody === 'string' && reqBody.includes('SubAgencyId')) {
        const m = reqBody.match(/SubAgencyId[:=]\s*([^\r\n&]+)/);
        if (m && m[1]) dcrAuth.subAgencyId = decodeURIComponent(m[1].trim());
      }
    } catch { /* ignore */ }
  }

  function readDcrContextFromDom() {
    try {
      // Note: Do NOT fall back to input[name="__RequestVerificationToken"] because the header
      // RequestVerificationToken requires the full cookieToken:formToken pair captured from XHR/fetch.
      if (!dcrAuth.subAgencyId) {
        const subEl =
          document.querySelector('#SubAgencyId') ||
          document.querySelector('select[name="SubAgencyId"]') ||
          document.querySelector('input[name="SubAgencyId"]');
        if (subEl && subEl.value) dcrAuth.subAgencyId = subEl.value;
      }
      if (!dcrAuth.invoiceDate) {
        const dateEl = document.querySelector('#InvoiceDate, input[name="InvoiceDate"]');
        dcrAuth.invoiceDate = (dateEl && dateEl.value) || todayDcrDate();
      }
    } catch { /* ignore */ }
  }

  function addLog(entry) {
    logs.unshift(entry);
    if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
    scheduleRender();
  }

  function scheduleRender() {
    if (!ui || renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      renderUI();
    });
  }

  // ============================================================
  // 1. HOOK window.fetch
  // ============================================================
  const origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = async function (input, init = {}) {
      const id = nextId++;
      const start = performance.now();
      let url = '';
      let method = 'GET';
      let reqHeaders = {};
      let serialized = { text: '', formEntries: null };

      try {
        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof URL) {
          url = input.href;
        } else if (input && typeof input === 'object') {
          url = input.url || String(input);
          if (input.method) method = input.method;
          if (input.headers) reqHeaders = { ...reqHeaders, ...normalizeHeaders(input.headers) };
        }
        if (init && init.method) method = init.method;
        if (init && init.headers) reqHeaders = { ...reqHeaders, ...normalizeHeaders(init.headers) };
        if (init && init.body !== undefined) serialized = serializeRequestBody(init.body);
      } catch { /* ignore */ }

      captureDcrContext(url, reqHeaders, serialized.formEntries, serialized.text);

      const entry = {
        id,
        type: 'fetch',
        time: nowTime(),
        method: String(method).toUpperCase(),
        url,
        status: '...',
        durationMs: null,
        reqHeaders,
        reqBody: serialized.text.slice(0, MAX_BODY_CHARS),
        formEntries: serialized.formEntries,
        resHeaders: {},
        resBody: '',
        error: null,
      };
      addLog(entry);

      try {
        const response = await origFetch.apply(this, arguments);
        entry.status = response.status;
        entry.durationMs = Math.round(performance.now() - start);
        entry.resHeaders = normalizeHeaders(response.headers);

        const ct = (response.headers.get('content-type') || '').toLowerCase();
        const isBinary = ct.includes('pdf') || ct.includes('image/') || ct.includes('octet-stream') || ct.includes('zip') || ct.includes('excel') || ct.includes('spreadsheet');

        if (isBinary) {
          entry.resBody = `[Binary response: ${ct || 'unknown'}]`;
          scheduleRender();
        } else {
          try {
            const cloned = response.clone();
            cloned.text().then((txt) => {
              entry.resBody = txt.length > MAX_BODY_CHARS ? txt.slice(0, MAX_BODY_CHARS) + '\n... [truncated]' : txt;
              scheduleRender();
            }).catch(() => {
              entry.resBody = '[Unable to read response body]';
              scheduleRender();
            });
          } catch {
            entry.resBody = '[Unable to clone response]';
          }
        }
        scheduleRender();
        return response;
      } catch (err) {
        entry.status = 'ERR';
        entry.durationMs = Math.round(performance.now() - start);
        entry.error = err && err.message ? err.message : String(err);
        entry.resBody = `Network Error: ${entry.error}`;
        scheduleRender();
        throw err;
      }
    };
  }

  // ============================================================
  // 2. HOOK XMLHttpRequest
  // ============================================================
  const origXHROpen = XMLHttpRequest.prototype.open;
  const origXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  const origXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__tmNet = {
      method: String(method || 'GET').toUpperCase(),
      url: String(url || ''),
      reqHeaders: {},
    };
    return origXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
    if (this.__tmNet && header) {
      this.__tmNet.reqHeaders[header] = value;
    }
    return origXHRSetHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const meta = this.__tmNet || { method: 'GET', url: '', reqHeaders: {} };
    const start = performance.now();
    const serialized = serializeRequestBody(body);

    captureDcrContext(meta.url, meta.reqHeaders, serialized.formEntries, serialized.text);

    const entry = {
      id: nextId++,
      type: 'xhr',
      time: nowTime(),
      method: meta.method,
      url: meta.url,
      status: '...',
      durationMs: null,
      reqHeaders: { ...meta.reqHeaders },
      reqBody: serialized.text.slice(0, MAX_BODY_CHARS),
      formEntries: serialized.formEntries,
      resHeaders: {},
      resBody: '',
      error: null,
    };
    addLog(entry);

    this.addEventListener('loadend', () => {
      entry.status = this.status || 'ERR';
      entry.durationMs = Math.round(performance.now() - start);

      try {
        const rawHeaders = this.getAllResponseHeaders() || '';
        const hMap = {};
        for (const line of rawHeaders.trim().split(/[\r\n]+/)) {
          const idx = line.indexOf(':');
          if (idx > 0) {
            hMap[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          }
        }
        entry.resHeaders = hMap;
      } catch { /* ignore */ }

      try {
        if (!this.responseType || this.responseType === 'text') {
          const txt = this.responseText || '';
          entry.resBody = txt.length > MAX_BODY_CHARS ? txt.slice(0, MAX_BODY_CHARS) + '\n... [truncated]' : txt;
        } else if (this.responseType === 'json') {
          entry.resBody = safeStringify(this.response).slice(0, MAX_BODY_CHARS);
        } else {
          entry.resBody = `[${this.responseType} response]`;
        }
      } catch {
        entry.resBody = '[Unable to read XHR response]';
      }
      scheduleRender();
    });

    return origXHRSend.apply(this, arguments);
  };

  // ============================================================
  // 3. BATCH DCR SERIAL CHECKER & ErrTbl PARSER
  // ============================================================
  function parseSerialList(raw) {
    const tokens = String(raw || '')
      .split(/[\r\n,;\t\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(tokens));
  }

  function parseErrTblHtml(html) {
    const map = new Map();
    if (!html || typeof html !== 'string') return map;
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rows = doc.querySelectorAll('tr');
      for (const tr of rows) {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 2) continue;
        const serial = (tds[0].textContent || '').trim();
        // Convert <br> tags into newlines cleanly before extracting text
        const cloneTd = tds[1].cloneNode(true);
        cloneTd.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
        const remarks = (cloneTd.textContent || '')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .join('\n');
        if (serial) {
          map.set(serial.toUpperCase(), remarks);
        }
      }
    } catch { /* ignore */ }
    return map;
  }

  function extractChainDetails(remarks) {
    if (!remarks) {
      return { status: 'In Stock / Valid', claimedNp: '', manufacturer: '', lastEntity: '', chain: '' };
    }
    const lines = remarks.split('\n').map((l) => l.trim()).filter(Boolean);
    const status = lines[0] || remarks;
    const firstArrowIdx = lines.findIndex((l) => l.includes('->'));
    const trailLine = firstArrowIdx !== -1
      ? lines.slice(firstArrowIdx).filter((l) => !/^stock at\b|^b2c\b/i.test(l)).join(' ')
      : '';

    let claimedNp = '';
    const npMatch = remarks.match(/\b(NP-[A-Z0-9-]+|NP\/Reg-[0-9/]+)\b/i);
    if (npMatch) claimedNp = npMatch[1];

    let manufacturer = '';
    let lastEntity = '';
    let cleanChain = '';

    if (trailLine) {
      const parts = trailLine.split('->').map((p) => p.trim()).filter(Boolean);
      const nonNpParts = parts.filter((p) => !/^NP[-/]/i.test(p));
      if (nonNpParts.length > 0) {
        manufacturer = nonNpParts[0].replace(/\(.*?\)/g, '').replace(/\bClaimed\b/gi, '').trim();
        lastEntity = nonNpParts[nonNpParts.length - 1].replace(/\bClaimed\b/gi, '').trim();
      }
      cleanChain = parts.join(' -> ');
    }

    return { status, claimedNp, manufacturer, lastEntity, chain: cleanChain };
  }

  async function sendDcrChunk(chunk, invDate) {
    const fd = new FormData();
    fd.append('TransQty', String(chunk.length));
    fd.append('ItemId', '');
    fd.append('SubAgencyId', dcrAuth.subAgencyId || '');
    fd.append('InvoiceDate', invDate);
    fd.append('PanelSrNo', chunk.join('\n'));
    fd.append('ItemType', dcrAuth.itemType || 'Solar Panels');
    fd.append('ExistingItems', '[]');

    const res = await window.fetch(dcrAuth.validateUrl || '/Customer/ValidateDcrItem/', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': '*/*',
        'RequestVerificationToken': dcrAuth.token,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: fd,
    });

    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    if (!res.ok || !json) {
      // Auto-split oversized batches down to 20 serials if the portal rejects a large payload
      if (chunk.length > 25 && !batchStopRequested) {
        const mid = Math.ceil(chunk.length / 2);
        await sendDcrChunk(chunk.slice(0, mid), invDate);
        if (!batchStopRequested) {
          await sendDcrChunk(chunk.slice(mid), invDate);
        }
        return;
      }
      batchLastMsg = `HTTP ${res.status} Error (Check Net Log)`;
      for (const sr of chunk) {
        batchResults.push({
          serial: sr,
          status: `HTTP ${res.status} Error`,
          isValid: false,
          claimedNp: '',
          manufacturer: '',
          lastEntity: '',
          chain: '',
          rawRemarks: text.slice(0, 300),
        });
      }
      return;
    }

    const portalMsg = String(json.Msg || '').trim();
    if (portalMsg) batchLastMsg = portalMsg;

    const errMap = parseErrTblHtml(json.ErrTbl || '');
    const msgLower = portalMsg.toLowerCase();
    const isExplicitValid =
      !json.ErrTbl &&
      (msgLower === '' ||
        msgLower.includes('success') ||
        msgLower.includes('valid') ||
        msgLower.includes('verified'));

    for (const sr of chunk) {
      const remarks = errMap.get(sr.toUpperCase()) || '';
      if (remarks) {
        const details = extractChainDetails(remarks);
        batchResults.push({
          serial: sr,
          status: details.status,
          isValid: false,
          claimedNp: details.claimedNp,
          manufacturer: details.manufacturer,
          lastEntity: details.lastEntity,
          chain: details.chain,
          rawRemarks: remarks,
        });
      } else if (json.ErrTbl) {
        // Other serials in this batch failed ErrTbl, so this serial had no error row -> valid in stock
        batchResults.push({
          serial: sr,
          status: 'In Stock / Valid',
          isValid: true,
          claimedNp: '',
          manufacturer: '',
          lastEntity: '',
          chain: '',
          rawRemarks: '',
        });
      } else {
        batchResults.push({
          serial: sr,
          status: isExplicitValid ? 'In Stock / Valid' : `Portal Msg: ${portalMsg || 'Unknown response'}`,
          isValid: isExplicitValid,
          claimedNp: '',
          manufacturer: '',
          lastEntity: '',
          chain: '',
          rawRemarks: portalMsg,
        });
      }
    }
  }

  async function runBatchDcrCheck() {
    if (batchRunning) return;
    readDcrContextFromDom();

    const serials = parseSerialList(batchInputText);
    if (serials.length === 0) {
      alert('Please paste at least one Panel Serial Number.');
      return;
    }
    if (!dcrAuth.token) {
      alert('Full RequestVerificationToken pair not captured yet. Enter 1 serial on the DCR portal and click "Validate" once first.');
      return;
    }
    if (!dcrAuth.subAgencyId) {
      alert('SubAgencyId is empty. Select/trigger Validate once on the DCR portal or paste your SubAgencyId.');
      return;
    }

    batchRunning = true;
    batchStopRequested = false;
    batchResults = [];
    batchLastMsg = '';
    batchProgress = { done: 0, total: serials.length };
    renderUI();

    const size = Math.max(1, Math.min(2000, Number(batchSize) || 1000));
    const delay = Math.max(0, Number(batchDelayMs) || 400);
    const invDate = dcrAuth.invoiceDate || todayDcrDate();

    for (let i = 0; i < serials.length; i += size) {
      if (batchStopRequested) break;
      const chunk = serials.slice(i, i + size);

      try {
        await sendDcrChunk(chunk, invDate);
      } catch (err) {
        batchLastMsg = err && err.message ? err.message : String(err);
        for (const sr of chunk) {
          batchResults.push({
            serial: sr,
            status: `Network Error: ${batchLastMsg}`,
            isValid: false,
            claimedNp: '',
            manufacturer: '',
            lastEntity: '',
            chain: '',
            rawRemarks: '',
          });
        }
      }

      batchProgress.done = Math.min(i + chunk.length, serials.length);
      renderUI();

      if (i + size < serials.length && !batchStopRequested && delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    batchRunning = false;
    renderUI();
  }

  // ============================================================
  // 4. UTILITIES (cURL, Clipboard, CSV/JSON Downloads)
  // ============================================================
  function shellEscape(str) {
    return String(str).replace(/'/g, "'\\''");
  }

  function buildCurl(entry) {
    const fullUrl = entry.url.startsWith('http') ? entry.url : new URL(entry.url, location.origin).href;
    const parts = [`curl -X ${entry.method} '${shellEscape(fullUrl)}'`];
    for (const [k, v] of Object.entries(entry.reqHeaders || {})) {
      parts.push(`  -H '${shellEscape(k)}: ${shellEscape(v)}'`);
    }
    if (Array.isArray(entry.formEntries) && entry.formEntries.length > 0) {
      for (const [k, v] of entry.formEntries) {
        parts.push(`  -F '${shellEscape(k)}=${shellEscape(v)}'`);
      }
    } else if (entry.reqBody && !entry.reqBody.startsWith('[Binary') && !entry.reqBody.startsWith('[Blob')) {
      parts.push(`  --data-raw '${shellEscape(entry.reqBody)}'`);
    }
    return parts.join(' \\\n');
  }

  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1200);
      }
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    });
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvCell(val) {
    const s = String(val ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  }

  function exportBatchCsv() {
    const header = ['Serial Number', 'Error Remarks', 'Status', 'Claimed NP', 'Manufacturer', 'Last Entity', 'Supply Chain'];
    const lines = [header.map(csvCell).join(',')];
    for (const r of batchResults) {
      lines.push([
        r.serial,
        r.rawRemarks || r.status,
        r.status,
        r.claimedNp,
        r.manufacturer,
        r.lastEntity,
        r.chain,
      ].map(csvCell).join(','));
    }
    downloadFile(`dcr_serial_check_${Date.now()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8;');
  }

  function shortUrl(raw) {
    try {
      const u = new URL(raw, location.origin);
      return u.pathname + u.search;
    } catch {
      return raw;
    }
  }

  function statusColor(status) {
    if (status === '...') return '#fbbf24';
    if (status === 'ERR' || Number(status) >= 400) return '#f87171';
    if (Number(status) >= 200 && Number(status) < 300) return '#34d399';
    return '#93c5fd';
  }

  // ============================================================
  // 5. FLOATING SHADOW-DOM UI
  // ============================================================
  function mountUI() {
    if (ui || !document.body) return;
    readDcrContextFromDom();

    const host = document.createElement('div');
    host.id = 'tm-dcr-net-inspector';
    host.style.cssText = 'position:fixed;z-index:2147483647;bottom:14px;right:14px;font-family:system-ui,-apple-system,sans-serif;';
    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        .pill {
          display: flex; align-items: center; gap: 6px;
          background: #0f172a; color: #f8fafc; border: 1px solid #334155;
          padding: 8px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600;
          cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        }
        .pill:hover { background: #1e293b; }
        .panel {
          width: min(980px, 96vw); height: min(620px, 86vh);
          background: #0f172a; color: #e2e8f0; border: 1px solid #334155;
          border-radius: 12px; box-shadow: 0 18px 48px rgba(0,0,0,0.55);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .header {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 8px 12px; background: #1e293b; border-bottom: 1px solid #334155; flex-wrap: wrap;
        }
        .mode-tabs { display: flex; align-items: center; gap: 6px; }
        .mode-btn {
          background: #0f172a; color: #94a3b8; border: 1px solid #334155;
          border-radius: 7px; padding: 5px 10px; font-size: 12px; font-weight: 700; cursor: pointer;
        }
        .mode-btn.active { background: #0d9488; color: #ffffff; border-color: #14b8a6; }
        .controls { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: flex-end; flex-wrap: wrap; }
        .search, .inp {
          background: #0f172a; color: #f8fafc; border: 1px solid #475569;
          border-radius: 6px; padding: 4px 8px; font-size: 12px;
        }
        .search { width: 190px; max-width: 40vw; }
        .btn {
          background: #334155; color: #f8fafc; border: 1px solid #475569;
          border-radius: 6px; padding: 5px 9px; font-size: 11px; font-weight: 600; cursor: pointer;
        }
        .btn:hover { background: #475569; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { background: #0d9488; border-color: #14b8a6; }
        .btn-primary:hover { background: #0f766e; }
        .btn-danger { background: #b91c1c; border-color: #ef4444; }
        .body { display: flex; flex: 1; min-height: 0; }
        .list { width: 42%; border-right: 1px solid #334155; overflow-y: auto; }
        .detail { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .row {
          padding: 7px 10px; border-bottom: 1px solid #1e293b; cursor: pointer;
          display: flex; flex-direction: column; gap: 2px;
        }
        .row:hover { background: #1e293b; }
        .row.active { background: #1e3a5f; border-left: 3px solid #38bdf8; }
        .row-top { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; }
        .method { color: #38bdf8; }
        .time { margin-left: auto; color: #94a3b8; font-weight: 400; font-size: 10px; }
        .url { font-size: 11px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: monospace; }
        .tabs { display: flex; align-items: center; gap: 4px; padding: 6px 10px; background: #1e293b; border-bottom: 1px solid #334155; flex-wrap: wrap; }
        .tab {
          padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
          cursor: pointer; background: transparent; color: #94a3b8; border: none;
        }
        .tab.active { background: #0f172a; color: #38bdf8; }
        .pre-wrap {
          flex: 1; overflow: auto; padding: 10px; margin: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px;
          line-height: 1.45; white-space: pre-wrap; word-break: break-word; color: #e2e8f0;
        }
        .empty { padding: 24px; text-align: center; color: #64748b; font-size: 12px; }
        .batch-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 10px; gap: 8px; }
        .batch-cfg { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 11px; background: #1e293b; padding: 8px 10px; border-radius: 8px; border: 1px solid #334155; }
        .badge-ok { background: #065f46; color: #6ee7b7; padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 10px; }
        .badge-warn { background: #78350f; color: #fde68a; padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 10px; }
        .batch-grid { display: flex; gap: 10px; flex: 1; min-height: 0; }
        .batch-left { width: 32%; display: flex; flex-direction: column; gap: 6px; min-height: 0; }
        .batch-ta {
          flex: 1; width: 100%; resize: none; background: #020617; color: #f8fafc;
          border: 1px solid #475569; border-radius: 8px; padding: 8px;
          font-family: ui-monospace, monospace; font-size: 11px;
        }
        .batch-right { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; min-height: 0; }
        .tbl-wrap { flex: 1; overflow: auto; border: 1px solid #334155; border-radius: 8px; background: #020617; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { position: sticky; top: 0; background: #1e293b; color: #94a3b8; text-align: left; padding: 6px 8px; border-bottom: 1px solid #334155; font-size: 10px; text-transform: uppercase; }
        td { padding: 6px 8px; border-bottom: 1px solid #1e293b; vertical-align: top; color: #e2e8f0; }
        .mono { font-family: ui-monospace, monospace; }
        @media (max-width: 680px) {
          .body, .batch-grid { flex-direction: column; }
          .list, .batch-left { width: 100%; height: 38%; border-right: none; border-bottom: 1px solid #334155; }
        }
      </style>
      <div id="root"></div>
    `;

    document.body.appendChild(host);
    ui = { root: shadow.getElementById('root') };
    renderUI();
  }

  function renderUI() {
    if (!ui || !ui.root) return;

    const prevListEl = ui.root.querySelector('#req-list');
    const prevPreEl = ui.root.querySelector('#detail-pre');
    const prevTblEl = ui.root.querySelector('#batch-tbl-wrap');
    const prevListScroll = prevListEl ? prevListEl.scrollTop : 0;
    const prevPreScroll = prevPreEl ? prevPreEl.scrollTop : 0;
    const prevTblScroll = prevTblEl ? prevTblEl.scrollTop : 0;

    if (!isOpen) {
      ui.root.innerHTML = `<button class="pill" id="toggle-btn">📡 DCR Net Log (${logs.length})</button>`;
      ui.root.querySelector('#toggle-btn').onclick = () => {
        isOpen = true;
        readDcrContextFromDom();
        renderUI();
      };
      return;
    }

    if (panelMode === 'batch') {
      renderBatchMode(prevTblScroll);
      return;
    }

    const q = filterText.trim().toLowerCase();
    const filtered = q
      ? logs.filter((l) =>
          l.url.toLowerCase().includes(q) ||
          l.method.toLowerCase().includes(q) ||
          String(l.status).includes(q) ||
          (l.reqBody && l.reqBody.toLowerCase().includes(q)) ||
          (l.resBody && l.resBody.toLowerCase().includes(q))
        )
      : logs;

    const selected = filtered.find((l) => l.id === selectedId) || logs.find((l) => l.id === selectedId) || filtered[0] || null;
    if (selected && selectedId !== selected.id) selectedId = selected.id;

    let detailBody = '<div class="empty">Send any request on DCR Portal to inspect its URL, headers, payload, and response here.</div>';
    if (selected) {
      if (activeTab === 'response') {
        detailBody = prettyFormat(selected.resBody) || '(empty response)';
      } else if (activeTab === 'payload') {
        detailBody = prettyFormat(selected.reqBody) || '(no request body)';
      } else {
        detailBody =
          `URL: ${selected.url}\nMethod: ${selected.method} | Status: ${selected.status} | Time: ${selected.durationMs ?? '...'}ms\n\n` +
          `=== REQUEST HEADERS ===\n${safeStringify(selected.reqHeaders)}\n\n` +
          `=== RESPONSE HEADERS ===\n${safeStringify(selected.resHeaders)}`;
      }
    }

    ui.root.innerHTML = `
      <div class="panel">
        <div class="header">
          <div class="mode-tabs">
            <button class="mode-btn active" id="mode-net">📡 Net Log (${filtered.length}/${logs.length})</button>
            <button class="mode-btn" id="mode-batch">🔍 Batch DCR Checker</button>
          </div>
          <div class="controls">
            <input class="search" id="search-input" type="text" placeholder="Filter URL, JSON, status..." value="${filterText.replace(/"/g, '&quot;')}" />
            <button class="btn" id="export-btn">⬇️ Save All</button>
            <button class="btn" id="clear-btn">🗑️ Clear</button>
            <button class="btn" id="min-btn">✕ Hide</button>
          </div>
        </div>
        <div class="body">
          <div class="list" id="req-list">
            ${
              filtered.length === 0
                ? '<div class="empty">No matching requests yet.</div>'
                : filtered
                    .map(
                      (l) => `
                <div class="row ${selected && selected.id === l.id ? 'active' : ''}" data-id="${l.id}">
                  <div class="row-top">
                    <span class="method">${l.method}</span>
                    <span style="color:${statusColor(l.status)}">${l.status}</span>
                    <span style="color:#94a3b8">${l.type}</span>
                    <span class="time">${l.durationMs != null ? l.durationMs + 'ms' : '...'} · ${l.time}</span>
                  </div>
                  <div class="url" title="${l.url.replace(/"/g, '&quot;')}">${shortUrl(l.url)}</div>
                </div>`
                    )
                    .join('')
            }
          </div>
          <div class="detail">
            ${
              selected
                ? `
              <div class="tabs">
                <button class="tab ${activeTab === 'response' ? 'active' : ''}" data-tab="response">Response</button>
                <button class="tab ${activeTab === 'payload' ? 'active' : ''}" data-tab="payload">Request Payload</button>
                <button class="tab ${activeTab === 'headers' ? 'active' : ''}" data-tab="headers">Headers & URL</button>
                <div style="margin-left:auto;display:flex;gap:4px;">
                  <button class="btn btn-primary" id="copy-res-btn">📋 Copy Response</button>
                  <button class="btn" id="copy-curl-btn">📋 Copy cURL</button>
                </div>
              </div>
              <pre class="pre-wrap" id="detail-pre"></pre>
            `
                : '<div class="empty">Select a request on the left.</div>'
            }
          </div>
        </div>
      </div>
    `;

    const preEl = ui.root.querySelector('#detail-pre');
    if (preEl) {
      preEl.textContent = detailBody;
      preEl.scrollTop = prevPreScroll;
    }
    const listEl = ui.root.querySelector('#req-list');
    if (listEl) listEl.scrollTop = prevListScroll;

    ui.root.querySelector('#mode-batch').onclick = () => {
      readDcrContextFromDom();
      panelMode = 'batch';
      renderUI();
    };

    const searchInput = ui.root.querySelector('#search-input');
    searchInput.oninput = (e) => {
      filterText = e.target.value;
      const pos = e.target.selectionStart;
      renderUI();
      const nextInput = ui.root.querySelector('#search-input');
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(pos, pos);
      }
    };

    ui.root.querySelector('#min-btn').onclick = () => { isOpen = false; renderUI(); };
    ui.root.querySelector('#clear-btn').onclick = () => { logs.length = 0; selectedId = null; renderUI(); };
    ui.root.querySelector('#export-btn').onclick = () => downloadFile(`dcr_net_log_${Date.now()}.json`, JSON.stringify(logs, null, 2), 'application/json');

    ui.root.querySelectorAll('.row').forEach((el) => {
      el.onclick = () => {
        selectedId = Number(el.getAttribute('data-id'));
        renderUI();
      };
    });

    ui.root.querySelectorAll('.tab').forEach((el) => {
      el.onclick = () => {
        activeTab = el.getAttribute('data-tab');
        renderUI();
      };
    });

    const copyResBtn = ui.root.querySelector('#copy-res-btn');
    if (copyResBtn && selected) {
      copyResBtn.onclick = () => copyText(prettyFormat(selected.resBody) || '', copyResBtn);
    }
    const copyCurlBtn = ui.root.querySelector('#copy-curl-btn');
    if (copyCurlBtn && selected) {
      copyCurlBtn.onclick = () => copyText(buildCurl(selected), copyCurlBtn);
    }
  }

  function renderBatchMode(prevTblScroll) {
    const serialCount = parseSerialList(batchInputText).length;
    const bq = batchFilter.trim().toLowerCase();
    const visibleResults = bq
      ? batchResults.filter((r) =>
          r.serial.toLowerCase().includes(bq) ||
          r.claimedNp.toLowerCase().includes(bq) ||
          r.chain.toLowerCase().includes(bq) ||
          r.status.toLowerCase().includes(bq)
        )
      : batchResults;

    const validCount = batchResults.filter((r) => r.isValid === true || r.status === 'In Stock / Valid').length;
    const claimedCount = batchResults.filter((r) => r.claimedNp).length;
    const errorCount = batchResults.length - validCount - claimedCount;

    ui.root.innerHTML = `
      <div class="panel">
        <div class="header">
          <div class="mode-tabs">
            <button class="mode-btn" id="mode-net">📡 Net Log (${logs.length})</button>
            <button class="mode-btn active" id="mode-batch">🔍 Batch DCR Checker</button>
          </div>
          <div class="controls">
            <span class="${dcrAuth.token ? 'badge-ok' : 'badge-warn'}">
              ${dcrAuth.token ? '✓ Token Ready' : '⚠ Click Validate once on portal to capture token'}
            </span>
            <button class="btn" id="min-btn">✕ Hide</button>
          </div>
        </div>

        <div class="batch-wrap">
          <div class="batch-cfg">
            <label>SubAgencyId: <input class="inp mono" id="cfg-subagency" style="width:230px" value="${(dcrAuth.subAgencyId || '').replace(/"/g, '&quot;')}" placeholder="Auto-captured from request" /></label>
            <label>Date: <input class="inp" id="cfg-date" style="width:98px" value="${(dcrAuth.invoiceDate || todayDcrDate()).replace(/"/g, '&quot;')}" /></label>
            <label>Batch: <input class="inp" id="cfg-size" type="number" min="1" max="2000" style="width:68px" value="${batchSize}" /></label>
            <label>Delay(ms): <input class="inp" id="cfg-delay" type="number" min="0" max="5000" style="width:66px" value="${batchDelayMs}" /></label>
            <div style="margin-left:auto;display:flex;gap:6px;">
              ${
                batchRunning
                  ? `<button class="btn btn-danger" id="stop-batch-btn">⏹ Stop (${batchProgress.done}/${batchProgress.total})</button>`
                  : `<button class="btn btn-primary" id="run-batch-btn" ${serialCount === 0 ? 'disabled' : ''}>▶ Check ${serialCount} Serial(s)</button>`
              }
            </div>
          </div>

          <div class="batch-grid">
            <div class="batch-left">
              <div style="font-size:11px;font-weight:600;color:#cbd5e1;display:flex;justify-content:space-between;">
                <span>Panel Serial Numbers (${serialCount})</span>
                <button class="btn" id="clear-input-btn" style="padding:2px 6px;">Clear</button>
              </div>
              <textarea class="batch-ta" id="batch-input" placeholder="Paste panel serial numbers (one per line, comma, or space separated)...">${batchInputText.replace(/</g, '&lt;')}</textarea>
            </div>

            <div class="batch-right">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span style="font-size:11px;font-weight:700;color:#f8fafc;">Results: ${batchResults.length}</span>
                ${batchResults.length > 0 ? `<span class="badge-ok">Valid: ${validCount}</span><span class="badge-warn">Claimed: ${claimedCount}</span>${errorCount > 0 ? `<span class="badge-warn" style="background:#7f1d1d;color:#fecaca;">Other/Err: ${errorCount}</span>` : ''}` : ''}
                ${batchLastMsg ? `<span style="font-size:10px;color:#94a3b8;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${batchLastMsg.replace(/"/g, '&quot;')}">Msg: ${batchLastMsg.replace(/</g, '&lt;')}</span>` : ''}
                <input class="search" id="batch-filter" style="margin-left:auto;width:170px;" placeholder="Filter serial, NP, vendor..." value="${batchFilter.replace(/"/g, '&quot;')}" />
                <button class="btn btn-primary" id="exp-csv-btn" ${batchResults.length === 0 ? 'disabled' : ''}>⬇️ CSV</button>
                <button class="btn" id="exp-json-btn" ${batchResults.length === 0 ? 'disabled' : ''}>⬇️ JSON</button>
                <button class="btn" id="copy-json-btn" ${batchResults.length === 0 ? 'disabled' : ''}>📋 Copy JSON</button>
              </div>

              <div class="tbl-wrap" id="batch-tbl-wrap">
                ${
                  visibleResults.length === 0
                    ? '<div class="empty">Paste serial numbers on the left and click <strong>Check</strong> to inspect DCR supply chains &amp; claimed NP numbers.</div>'
                    : `<table>
                        <thead>
                          <tr>
                            <th>Serial</th>
                            <th>Status / Claimed NP</th>
                            <th>Supply Chain</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${visibleResults
                            .slice(0, 500)
                            .map(
                              (r) => `
                            <tr>
                              <td class="mono" style="white-space:nowrap;font-weight:700;">${r.serial}</td>
                              <td>
                                <div style="color:${r.status === 'In Stock / Valid' ? '#34d399' : '#fca5a5'};font-weight:600;">${r.status}</div>
                                ${r.claimedNp ? `<div class="mono" style="color:#38bdf8;font-weight:700;margin-top:2px;">${r.claimedNp}</div>` : ''}
                              </td>
                              <td style="color:#cbd5e1;font-size:10.5px;line-height:1.35;">${r.chain || r.rawRemarks || '-'}</td>
                            </tr>`
                            )
                            .join('')}
                        </tbody>
                      </table>
                      ${visibleResults.length > 500 ? `<div style="padding:8px;text-align:center;font-size:10.5px;color:#94a3b8;background:#0f172a;border-top:1px solid #334155;">Showing first 500 of ${visibleResults.length.toLocaleString()} results to keep page fast. Use ⬇️ JSON / ⬇️ CSV for all rows.</div>` : ''}`
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const tblWrap = ui.root.querySelector('#batch-tbl-wrap');
    if (tblWrap) tblWrap.scrollTop = prevTblScroll;

    ui.root.querySelector('#mode-net').onclick = () => { panelMode = 'net'; renderUI(); };
    ui.root.querySelector('#min-btn').onclick = () => { isOpen = false; renderUI(); };

    ui.root.querySelector('#cfg-subagency').oninput = (e) => { dcrAuth.subAgencyId = e.target.value.trim(); };
    ui.root.querySelector('#cfg-date').oninput = (e) => { dcrAuth.invoiceDate = e.target.value.trim(); };
    ui.root.querySelector('#cfg-size').oninput = (e) => { batchSize = Number(e.target.value) || 1000; };
    ui.root.querySelector('#cfg-delay').oninput = (e) => { batchDelayMs = Number(e.target.value) || 0; };

    const ta = ui.root.querySelector('#batch-input');
    ta.oninput = (e) => {
      batchInputText = e.target.value;
      const runBtn = ui.root.querySelector('#run-batch-btn');
      const cnt = parseSerialList(batchInputText).length;
      if (runBtn) {
        runBtn.textContent = `▶ Check ${cnt} Serial(s)`;
        runBtn.disabled = cnt === 0;
      }
    };

    ui.root.querySelector('#clear-input-btn').onclick = () => {
      batchInputText = '';
      batchResults = [];
      renderUI();
    };

    const bf = ui.root.querySelector('#batch-filter');
    bf.oninput = (e) => {
      batchFilter = e.target.value;
      const pos = e.target.selectionStart;
      renderUI();
      const nextBf = ui.root.querySelector('#batch-filter');
      if (nextBf) {
        nextBf.focus();
        nextBf.setSelectionRange(pos, pos);
      }
    };

    const runBtn = ui.root.querySelector('#run-batch-btn');
    if (runBtn) runBtn.onclick = runBatchDcrCheck;

    const stopBtn = ui.root.querySelector('#stop-batch-btn');
    if (stopBtn) stopBtn.onclick = () => { batchStopRequested = true; };

    const expCsvBtn = ui.root.querySelector('#exp-csv-btn');
    if (expCsvBtn) expCsvBtn.onclick = exportBatchCsv;

    const expJsonBtn = ui.root.querySelector('#exp-json-btn');
    if (expJsonBtn) {
      expJsonBtn.onclick = () => downloadFile(`dcr_serial_check_${Date.now()}.json`, JSON.stringify(batchResults, null, 2), 'application/json');
    }

    const copyJsonBtn = ui.root.querySelector('#copy-json-btn');
    if (copyJsonBtn) {
      copyJsonBtn.onclick = () => copyText(JSON.stringify(batchResults, null, 2), copyJsonBtn);
    }
  }

  if (document.body) {
    mountUI();
  } else {
    window.addEventListener('DOMContentLoaded', mountUI, { once: true });
  }
})();
