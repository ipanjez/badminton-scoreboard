'use strict';
/**
 * pdf-server.js — Server-side PDF auto-export
 * Reuses public/js/pdf-export.js at runtime via Node.js vm.
 * Patches jsPDF#save() to capture the output buffer instead of
 * triggering a browser download, then writes to /exports/.
 */

const path = require('path');
const fs   = require('fs');
const vm   = require('vm');

// ─── Lazy-init jsPDF for Node.js ───────────────────────────────────────────
let _jsPDF = null;
function getJsPDF() {
  if (_jsPDF) return _jsPDF;
  try {
    const mod = require('jspdf');
    _jsPDF = mod.jsPDF || (mod.default && mod.default.jsPDF) || mod;
    if (typeof _jsPDF !== 'function') throw new Error('jsPDF class not found');
    return _jsPDF;
  } catch (e) {
    console.error('[PDF-Server] jsPDF load error:', e.message);
    return null;
  }
}

// ─── Compiled pdf-export.js sandbox (cached) ───────────────────────────────
let _sandbox = null;
let _pdfExportMtime = 0;

function getSandbox(BASE_DIR) {
  const jsPDF = getJsPDF();
  if (!jsPDF) return null;

  const pdfFile = path.join(BASE_DIR, 'public', 'js', 'pdf-export.js');
  if (!fs.existsSync(pdfFile)) {
    console.error('[PDF-Server] pdf-export.js not found at', pdfFile);
    return null;
  }

  // Re-compile if file has changed (supports live editing)
  let mtime = 0;
  try { mtime = fs.statSync(pdfFile).mtimeMs; } catch (_) {}
  if (_sandbox && mtime === _pdfExportMtime) return _sandbox;

  try {
    const code = fs.readFileSync(pdfFile, 'utf8');
    const sandbox = vm.createContext({
      window: { jspdf: { jsPDF } },
      console,
    });
    vm.runInContext(code, sandbox);
    _sandbox = sandbox;
    _pdfExportMtime = mtime;
    return sandbox;
  } catch (e) {
    console.error('[PDF-Server] Failed to compile pdf-export.js:', e.message);
    return null;
  }
}

// ─── Sanitise a string for use in filenames ─────────────────────────────────
function safe(str, maxLen = 40) {
  return String(str || '')
    .replace(/[^\w\u00C0-\u017E \-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, maxLen);
}

// ─── Build the export filename ───────────────────────────────────────────────
function buildFilename(state) {
  const s = Object.assign({}, state, {
    startTime: state.startTime ||
      (state.matchTimerStart ? new Date(state.matchTimerStart).toISOString() : null),
  });
  const ref  = s.endTime ? new Date(s.endTime) : new Date();
  const pad  = n => String(n).padStart(2, '0');
  const date = `${ref.getFullYear()}${pad(ref.getMonth() + 1)}${pad(ref.getDate())}`;
  const time = `${pad(ref.getHours())}${pad(ref.getMinutes())}${pad(ref.getSeconds())}`;

  const parts = [
    'ScoreSheet',
    safe(s.tournament, 50) || 'Match',
    safe(s.category, 10),
    s.court ? 'Court' + safe(s.court, 15) : '',
    s.matchNo ? 'No' + safe(s.matchNo, 10) : '',
    date,
    time,
  ].filter(Boolean);

  return parts.join('_') + '.pdf';
}

// ─── Main export function ────────────────────────────────────────────────────
function autoExportPDF(state, BASE_DIR) {
  const jsPDFClass = getJsPDF();
  if (!jsPDFClass) {
    console.error('[PDF-Server] Cannot export: jsPDF not available');
    return null;
  }

  const sandbox = getSandbox(BASE_DIR);
  if (!sandbox || typeof sandbox.generateScoreSheet !== 'function') {
    console.error('[PDF-Server] generateScoreSheet not available in sandbox');
    return null;
  }

  // ── Prepare target path ───────────────────────────────────────────────────
  const exportsDir = path.join(BASE_DIR, 'exports');
  if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
  const fname   = buildFilename(state);
  const fpath   = path.join(exportsDir, fname);

  // ── jsPDF v4 defines `save` as an OWN INSTANCE property (not prototype).
  //    Solution: Proxy the constructor so every new instance gets its `save`
  //    overridden to write directly to fpath instead of the CWD.
  let savedOk = false;
  const ProxiedJsPDF = new Proxy(jsPDFClass, {
    construct(Target, args) {
      const inst = new Target(...args);
      inst.save = function () {
        try {
          const buf = Buffer.from(inst.output('arraybuffer'));
          fs.writeFileSync(fpath, buf);
          savedOk = true;
        } catch (e) {
          console.error('[PDF-Server] write error:', e.message);
        }
      };
      return inst;
    }
  });

  // Temporarily swap jsPDF in the sandbox, restore after
  sandbox.window.jspdf.jsPDF = ProxiedJsPDF;

  const stateCopy = JSON.parse(JSON.stringify(state));
  try {
    sandbox.generateScoreSheet(stateCopy);
  } catch (e) {
    console.error('[PDF-Server] generateScoreSheet error:', e.message);
  } finally {
    sandbox.window.jspdf.jsPDF = jsPDFClass; // always restore
  }

  if (savedOk) {
    console.log(`[PDF] ✅ Auto-exported → exports/${fname}`);
    return fpath;
  }
  console.error('[PDF-Server] generateScoreSheet ran but save() was not called');
  return null;
}

module.exports = { autoExportPDF };
