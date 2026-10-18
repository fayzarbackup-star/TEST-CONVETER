/**
 * Fayzar — হুবহু-লেআউট মাস্টার .docx নির্মাতা (FayzarFaithfulDocx)
 * ================================================================
 * Part-17.5 (ধাপ ৪): লেআউট-নকশা (FayzarLayoutIR) → ইউনিকোড মাস্টার .docx (SutonnyOMJ)।
 * এরপর বিজয় ও Word 2003 .doc — চালু একক রপ্তানি-পথে (FayzarExport.produce, opt.masterDocx)।
 *
 *  • প্রতিটি মূল পাতা = আলাদা সেকশন (মূলের পাতার মাপ ও মাপা মার্জিন), পাতা-ভাঙনে পরের পাতা
 *  • 'flow' সারি = অনুচ্ছেদ (বাম-ইনডেন্ট = মাপা দূরত্ব); 'grid' সারি = অদৃশ্য টেবিল (কলাম = মাপা অবস্থান)
 *  • লেখা + সমীকরণ: ExportDualEngine.renderDocxRuns (প্রমাণিত OMML-পথ; বাংলা/ইংরেজি আলাদা রান — বিজয়-নিরাপদ)
 *  • চিত্র: item.image ({dataUrl, pxW, pxH}) থাকলে word/media-তে, মাপা প্রস্থে
 */
(function (global) {
  'use strict';
  // [প্যাক-১১ গেট-ফাংশন] GRIDFIRST, FORMFIX, PLEADER ডিফল্ট-চালু; যেকোনো সুইচ বা নিয়ম window.__FZ_OFF_<নাম> (FZ_OFF=<নাম>) দিয়ে বন্ধযোগ্য।
  const fzOn = (k) => !(typeof globalThis !== 'undefined' ? globalThis['__FZ_OFF_' + k] : global['__FZ_OFF_' + k]);
  // গণিত-পাতা উচ্চতা-হিসাব সুইচ: শুধু globalThis.__FZ_ON_MATHH সত্য হলে সক্রিয়
  const mathHOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_MATHH : global.__FZ_ON_MATHH);
  // B9/B4 ফরমকিট সুইচ: শুধু globalThis.__FZ_ON_FORMKIT সত্য হলে সক্রিয়
  const formKitOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_FORMKIT : global.__FZ_ON_FORMKIT);
  // B8 পাতার বর্ডার দূরত্ব সুইচ: শুধু globalThis.__FZ_ON_PGBORDER সত্য হলে সক্রিয়
  const pgBorderOn = () => !!(
    (typeof globalThis !== 'undefined' && globalThis.__FZ_ON_PGBORDER) ||
    (typeof window !== 'undefined' && window.__FZ_ON_PGBORDER) ||
    (global && global.__FZ_ON_PGBORDER) ||
    (typeof process !== 'undefined' && process && process.env && (process.env.__FZ_ON_PGBORDER === '1' || process.env.__FZ_ON_PGBORDER === 'true'))
  );
  // B2 টেবিল রেখা-জাল সুইচ: শুধু globalThis.__FZ_ON_TABLEGRID সত্য হলে সক্রিয়
  const tableGridOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_TABLEGRID : global.__FZ_ON_TABLEGRID);
  // WORK_PLAN F3 (FAITHFUL #১৭): হুবহু-মোড → স্টুডিও সুইচ (__FZ_ON_FAITHFUL_STUDIO)
  const faithfulStudioOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_FAITHFUL_STUDIO : global.__FZ_ON_FAITHFUL_STUDIO)
    || !!(typeof process !== 'undefined' && process.env && process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('FAITHFUL_STUDIO'));

  /**
   * WORK_PLAN F3: স্টুডিওতে লেখা সম্পাদনার আগে প্রতিটি IR আইটেমের মূল লেখা/লাইন কাঠামোর স্ন্যাপশট সংরক্ষণ,
   * যাতে কেবল লেখা বদলালেও অবস্থান, ফাঁক ও আকারের সব XML অপরিবর্তিত থাকে।
   */
  function snapshotIrLayout(ir) {
    if (!faithfulStudioOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((page) => {
      (page.bands || []).forEach((band) => {
        (band.cells || []).forEach((cell) => {
          (cell.items || []).forEach((it) => {
            if (!it || typeof it !== 'object' || it._fzLayoutSnap) return;
            it._fzLayoutSnap = {
              text: it.text != null ? String(it.text) : '',
              lines: Array.isArray(it.lines) ? it.lines.slice() : null,
              tabLines: Array.isArray(it.tabLines) ? it.tabLines.slice() : null,
              rows: Array.isArray(it.rows)
                ? it.rows.map((r) => (Array.isArray(r) ? r.map((c) => (c && typeof c === 'object' ? Object.assign({}, c) : c)) : r))
                : null
            };
          });
        });
      });
    });
    return ir;
  }

  function layoutItem(it) {
    if (!faithfulStudioOn() || !it || !it._fzLayoutSnap) return it;
    const s = it._fzLayoutSnap;
    const copy = Object.assign({}, it, {
      text: s.text,
      lines: s.lines ? s.lines.slice() : s.lines,
      tabLines: s.tabLines ? s.tabLines.slice() : s.tabLines
    });
    if (s.rows) copy.rows = s.rows.map((r) => (Array.isArray(r) ? r.slice() : r));
    return copy;
  }

  function syncEditedTextFields(item) {
    if (!faithfulStudioOn() || !item || !item._fzLayoutSnap) return item;
    const s = item._fzLayoutSnap;
    const curText = item.text != null ? String(item.text) : '';
    const textChanged = curText !== s.text;
    const linesSame = Array.isArray(item.lines) && Array.isArray(s.lines)
      && item.lines.length === s.lines.length && item.lines.every((v, i) => v === s.lines[i]);
    const tabLinesSame = Array.isArray(item.tabLines) && Array.isArray(s.tabLines)
      && item.tabLines.length === s.tabLines.length && item.tabLines.every((v, i) => v === s.tabLines[i]);
    const out = Object.assign({}, item);
    if (textChanged && linesSame) {
      out.lines = curText.split('\n');
    } else if (!textChanged && Array.isArray(item.lines) && (!s.lines || !linesSame)) {
      out.text = item.lines.join('\n');
    }
    if (textChanged && tabLinesSame && Array.isArray(item.tabLines)) {
      out.tabLines = curText.split('\n');
    } else if (!textChanged && Array.isArray(item.tabLines) && (!s.tabLines || !tabLinesSame)) {
      out.text = item.tabLines.join('\n');
    }
    return out;
  }

  function isTableEdited(item) {
    if (!item || !item._fzLayoutSnap || !Array.isArray(item.rows) || !Array.isArray(item._fzLayoutSnap.rows)) return false;
    const a = item.rows, b = item._fzLayoutSnap.rows;
    if (a.length !== b.length) return true;
    for (let r = 0; r < a.length; r++) {
      if (!Array.isArray(a[r]) || !Array.isArray(b[r]) || a[r].length !== b[r].length) return true;
      for (let c = 0; c < a[r].length; c++) {
        const va = a[r][c] && typeof a[r][c] === 'object' ? a[r][c].text : a[r][c];
        const vb = b[r][c] && typeof b[r][c] === 'object' ? b[r][c].text : b[r][c];
        if (String(va == null ? '' : va) !== String(vb == null ? '' : vb)) return true;
      }
    }
    return false;
  }

  function renderEditedTableXml(item, extraBeforePt, ctx) {
    const snapRows = item._fzLayoutSnap.rows;
    const curRows = item.rows;
    const tokenRows = snapRows.map((r, ri) => r.map((c, ci) => {
      const origStr = c && typeof c === 'object' ? String(c.text || '') : String(c == null ? '' : c);
      return origStr;
    }));
    const baseItem = Object.assign({}, item, { rows: tokenRows, _fzLayoutSnap: null });
    let xml = tableXml(baseItem, extraBeforePt, ctx);
    for (let ri = 0; ri < snapRows.length; ri++) {
      for (let ci = 0; ci < (snapRows[ri] || []).length; ci++) {
        const origCell = snapRows[ri][ci];
        const newCell = curRows[ri] && curRows[ri][ci] !== undefined ? curRows[ri][ci] : origCell;
        const origStr = origCell && typeof origCell === 'object' ? String(origCell.text || '') : String(origCell == null ? '' : origCell);
        const newStr = newCell && typeof newCell === 'object' ? String(newCell.text || '') : String(newCell == null ? '' : newCell);
        if (origStr !== newStr && origStr) {
          xml = xml.replace(`>${esc(origStr)}</w:t>`, `>${esc(newStr)}</w:t>`);
        }
      }
    }
    return xml;
  }

  function extractBlocks(ir) {
    if (!faithfulStudioOn() || !ir || !Array.isArray(ir.pages)) return [];
    const IR = pick('FayzarLayoutIR');
    if (IR && typeof IR.extractBlocks === 'function') return IR.extractBlocks(ir);
    snapshotIrLayout(ir);
    const blocks = [];
    let idx = 0;
    ir.pages.forEach((page, pi) => {
      (page.bands || []).forEach((band, bi) => {
        (band.cells || []).forEach((cell, ci) => {
          (cell.items || []).forEach((it, ii) => {
            if (!it || it.kind === 'figure') return;
            const text = it.kind === 'table'
              ? (it.rows || []).map((r) => (r || []).map((c) => (c && typeof c === 'object' ? String(c.text || '') : String(c == null ? '' : c))).join('\t')).join('\n')
              : (Array.isArray(it.tabLines) && it.tabLines.length ? it.tabLines.join('\n') : (Array.isArray(it.lines) && it.lines.length ? it.lines.join('\n') : String(it.text || '')));
            blocks.push({
              id: `p${pi}-b${bi}-c${ci}-i${ii}`,
              index: idx++,
              pageIndex: pi,
              bandIndex: bi,
              cellIndex: ci,
              itemIndex: ii,
              kind: it.kind || 'para',
              type: it.type || (it.kind === 'table' ? 'table' : 'body'),
              text,
              rect: it.rect ? Object.assign({}, it.rect) : null,
              fontPt: it.fontPt || 12,
              align: it.align || 'l',
              bold: !!it.bold
            });
          });
        });
      });
    });
    return blocks;
  }

  function updateBlockText(ir, target, newText) {
    if (!faithfulStudioOn() || !ir || !Array.isArray(ir.pages)) return ir;
    const IR = pick('FayzarLayoutIR');
    if (IR && typeof IR.updateBlockText === 'function') return IR.updateBlockText(ir, target, newText);
    snapshotIrLayout(ir);
    let idx = 0;
    const isNumTarget = typeof target === 'number' || (typeof target === 'string' && /^\d+$/.test(target.trim()));
    const targetIdx = isNumTarget ? Number(target) : -1;
    const targetId = typeof target === 'string' && !isNumTarget ? target.trim() : (target && typeof target === 'object' && target.id ? String(target.id) : null);
    for (let pi = 0; pi < ir.pages.length; pi++) {
      const bands = ir.pages[pi].bands || [];
      for (let bi = 0; bi < bands.length; bi++) {
        const cells = bands[bi].cells || [];
        for (let ci = 0; ci < cells.length; ci++) {
          const items = cells[ci].items || [];
          for (let ii = 0; ii < items.length; ii++) {
            const it = items[ii];
            if (!it || it.kind === 'figure') continue;
            const curId = `p${pi}-b${bi}-c${ci}-i${ii}`;
            const curIdx = idx++;
            const coordMatch = target && typeof target === 'object'
              && target.pageIndex === pi && target.bandIndex === bi && target.cellIndex === ci && target.itemIndex === ii;
            const indexObjMatch = target && typeof target === 'object' && typeof target.index === 'number' && target.index === curIdx;
            if (curIdx === targetIdx || curId === targetId || coordMatch || indexObjMatch) {
              if (it.kind === 'table') {
                const rowLines = Array.isArray(newText) ? newText : String(newText == null ? '' : newText).split('\n');
                it.rows = (it.rows || []).map((row, rIdx) => {
                  const cols = Array.isArray(rowLines[rIdx]) ? rowLines[rIdx] : (rowLines[rIdx] !== undefined ? String(rowLines[rIdx]).split('\t') : []);
                  return row.map((cellVal, cIdx) => {
                    const nextVal = cols[cIdx] !== undefined ? cols[cIdx] : (cellVal && typeof cellVal === 'object' ? cellVal.text : cellVal);
                    if (cellVal && typeof cellVal === 'object' && !Array.isArray(cellVal)) {
                      return Object.assign({}, cellVal, { text: String(nextVal == null ? '' : nextVal) });
                    }
                    return String(nextVal == null ? '' : nextVal);
                  });
                });
              } else {
                const str = String(newText == null ? '' : newText);
                it.text = str;
                if (Array.isArray(it.tabLines) && it.tabLines.length) it.tabLines = str.split('\n');
                if (Array.isArray(it.lines)) it.lines = str.split('\n');
              }
              return ir;
            }
          }
        }
      }
    }
    return ir;
  }

  // বাহ্যিক নির্ভরতা ছাড়া অফলাইন/Node পরিবেশে .docx ZIP তৈরি ও পড়ার হালকা JSZip বিকল্প
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();
  function crc32Bytes(u8) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function strToU8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(String(str));
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(String(str), 'utf8'));
    const s = unescape(encodeURIComponent(String(str)));
    const u8 = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
  }
  function u8ToStr(u8) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(u8);
    if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('utf8');
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return decodeURIComponent(escape(s));
  }
  function b64ToU8(b64) {
    const clean = String(b64 || '').replace(/^data:[^;]+;base64,/i, '').replace(/[^A-Za-z0-9+/=]/g, '');
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(clean, 'base64'));
    const bin = atob(clean);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  function u8ToB64(u8) {
    if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');
    let bin = '';
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return btoa(bin);
  }
  class MiniJSZip {
    constructor() { this.files = {}; }
    file(name, data, opts) {
      const cleanName = String(name || '').replace(/^\/+/, '');
      if (arguments.length === 1) return this.files[cleanName] || null;
      let bytes;
      if (opts && opts.base64) bytes = b64ToU8(data);
      else if (data instanceof Uint8Array) bytes = new Uint8Array(data);
      else if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) bytes = new Uint8Array(data);
      else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) bytes = new Uint8Array(data);
      else bytes = strToU8(data == null ? '' : String(data));
      this.files[cleanName] = {
        name: cleanName,
        _data: bytes,
        async(type) {
          const t = String(type || 'string').toLowerCase();
          if (t === 'string' || t === 'text') return Promise.resolve(u8ToStr(bytes));
          if (t === 'base64') return Promise.resolve(u8ToB64(bytes));
          if (t === 'uint8array') return Promise.resolve(new Uint8Array(bytes));
          if (t === 'arraybuffer') return Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
          if (t === 'nodebuffer' && typeof Buffer !== 'undefined') return Promise.resolve(Buffer.from(bytes));
          return Promise.resolve(bytes);
        }
      };
      return this;
    }
    async generateAsync(opts) {
      const o = opts || {};
      const entries = Object.keys(this.files).map((k) => {
        const f = this.files[k];
        const nameBytes = strToU8(f.name);
        const dataBytes = f._data;
        const crc = crc32Bytes(dataBytes);
        return { nameBytes, dataBytes, crc };
      });
      let localSize = 0, cdSize = 0;
      entries.forEach((e) => {
        e.offset = localSize;
        localSize += 30 + e.nameBytes.length + e.dataBytes.length;
        cdSize += 46 + e.nameBytes.length;
      });
      const total = localSize + cdSize + 22;
      const out = new Uint8Array(total);
      const dv = new DataView(out.buffer);
      let p = 0;
      entries.forEach((e) => {
        dv.setUint32(p, 0x04034b50, true);
        dv.setUint16(p + 4, 20, true);
        dv.setUint16(p + 6, 0x0800, true);
        dv.setUint16(p + 8, 0, true);
        dv.setUint16(p + 10, 0, true);
        dv.setUint16(p + 12, 0, true);
        dv.setUint32(p + 14, e.crc, true);
        dv.setUint32(p + 18, e.dataBytes.length, true);
        dv.setUint32(p + 22, e.dataBytes.length, true);
        dv.setUint16(p + 26, e.nameBytes.length, true);
        dv.setUint16(p + 28, 0, true);
        out.set(e.nameBytes, p + 30);
        out.set(e.dataBytes, p + 30 + e.nameBytes.length);
        p += 30 + e.nameBytes.length + e.dataBytes.length;
      });
      const cdStart = p;
      entries.forEach((e) => {
        dv.setUint32(p, 0x02014b50, true);
        dv.setUint16(p + 4, 20, true);
        dv.setUint16(p + 6, 20, true);
        dv.setUint16(p + 8, 0x0800, true);
        dv.setUint16(p + 10, 0, true);
        dv.setUint16(p + 12, 0, true);
        dv.setUint16(p + 14, 0, true);
        dv.setUint32(p + 16, e.crc, true);
        dv.setUint32(p + 20, e.dataBytes.length, true);
        dv.setUint32(p + 24, e.dataBytes.length, true);
        dv.setUint16(p + 28, e.nameBytes.length, true);
        dv.setUint16(p + 30, 0, true);
        dv.setUint16(p + 32, 0, true);
        dv.setUint16(p + 34, 0, true);
        dv.setUint16(p + 36, 0, true);
        dv.setUint32(p + 38, 0, true);
        dv.setUint32(p + 42, e.offset, true);
        out.set(e.nameBytes, p + 46);
        p += 46 + e.nameBytes.length;
      });
      dv.setUint32(p, 0x06054b50, true);
      dv.setUint16(p + 4, 0, true);
      dv.setUint16(p + 6, 0, true);
      dv.setUint16(p + 8, entries.length, true);
      dv.setUint16(p + 10, entries.length, true);
      dv.setUint32(p + 12, cdSize, true);
      dv.setUint32(p + 16, cdStart, true);
      dv.setUint16(p + 20, 0, true);
      const t = String(o.type || (typeof Blob !== 'undefined' ? 'blob' : 'uint8array')).toLowerCase();
      if (t === 'blob' && typeof Blob !== 'undefined') {
        const blob = new Blob([out], { type: o.mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        Object.defineProperty(blob, '_u8', { value: out, enumerable: false });
        return blob;
      }
      if (t === 'base64') return u8ToB64(out);
      if (t === 'arraybuffer') return out.buffer;
      if (t === 'nodebuffer' && typeof Buffer !== 'undefined') return Buffer.from(out);
      return out;
    }
    static async loadAsync(input) {
      let u8;
      if (!input) throw new Error('খালি ইনপুট');
      if (input._u8 instanceof Uint8Array) u8 = input._u8;
      else if (input instanceof Uint8Array) u8 = input;
      else if (typeof ArrayBuffer !== 'undefined' && input instanceof ArrayBuffer) u8 = new Uint8Array(input);
      else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) u8 = new Uint8Array(input);
      else if (typeof Blob !== 'undefined' && input instanceof Blob && typeof input.arrayBuffer === 'function') {
        u8 = new Uint8Array(await input.arrayBuffer());
      } else if (typeof input === 'string') {
        u8 = b64ToU8(input);
      } else if (typeof input === 'object' && ArrayBuffer.isView(input)) {
        u8 = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      } else {
        throw new Error('অসমর্থিত ZIP ইনপুট');
      }
      const zip = new MiniJSZip();
      const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
      let eocdPos = -1;
      for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { eocdPos = i; break; }
      }
      if (eocdPos >= 0) {
        const count = dv.getUint16(eocdPos + 10, true);
        let cdPos = dv.getUint32(eocdPos + 16, true);
        for (let i = 0; i < count && cdPos + 46 <= u8.length; i++) {
          if (dv.getUint32(cdPos, true) !== 0x02014b50) break;
          const method = dv.getUint16(cdPos + 10, true);
          const compSize = dv.getUint32(cdPos + 20, true);
          const nameLen = dv.getUint16(cdPos + 28, true);
          const extraLen = dv.getUint16(cdPos + 30, true);
          const commentLen = dv.getUint16(cdPos + 32, true);
          const localOff = dv.getUint32(cdPos + 42, true);
          const name = u8ToStr(u8.subarray(cdPos + 46, cdPos + 46 + nameLen));
          const lNameLen = dv.getUint16(localOff + 26, true);
          const lExtraLen = dv.getUint16(localOff + 28, true);
          const dataStart = localOff + 30 + lNameLen + lExtraLen;
          const compBytes = u8.subarray(dataStart, dataStart + compSize);
          let dataBytes = compBytes;
          if (method === 8 && typeof require === 'function') {
            try { dataBytes = new Uint8Array(require('zlib').inflateRawSync(compBytes)); } catch (_) {}
          }
          if (!name.endsWith('/')) zip.file(name, dataBytes);
          cdPos += 46 + nameLen + extraLen + commentLen;
        }
        return zip;
      }
      let pos = 0;
      while (pos + 30 <= u8.length && dv.getUint32(pos, true) === 0x04034b50) {
        const method = dv.getUint16(pos + 8, true);
        const compSize = dv.getUint32(pos + 18, true);
        const nameLen = dv.getUint16(pos + 26, true);
        const extraLen = dv.getUint16(pos + 28, true);
        const name = u8ToStr(u8.subarray(pos + 30, pos + 30 + nameLen));
        const dataStart = pos + 30 + nameLen + extraLen;
        const compBytes = u8.subarray(dataStart, dataStart + compSize);
        let dataBytes = compBytes;
        if (method === 8 && typeof require === 'function') {
          try { dataBytes = new Uint8Array(require('zlib').inflateRawSync(compBytes)); } catch (_) {}
        }
        if (!name.endsWith('/')) zip.file(name, dataBytes);
        pos = dataStart + compSize;
      }
      return zip;
    }
  }

  const NAMED_HEX = {
    gray: 'F2F2F2', grey: 'F2F2F2', lightgray: 'F2F2F2', lightgrey: 'F2F2F2',
    darkgray: '808080', darkgrey: '808080', placeholder: '808080', muted: '808080',
    blue: '1F4E79', navy: '003366', headerblue: '1F4E79',
    red: 'FF0000', white: 'FFFFFF', black: '000000', yellow: 'FFF2CC', green: 'E2EFDA'
  };
  function normHex(c) {
    if (!c || typeof c !== 'string') return null;
    const s = c.trim().replace(/^#/, '');
    if (NAMED_HEX[s.toLowerCase()]) return NAMED_HEX[s.toLowerCase()];
    if (/^[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase();
    if (/^[0-9A-Fa-f]{3}$/.test(s)) return s.split('').map((x) => x + x).join('').toUpperCase();
    return null;
  }
  function isDarkHex(hex) {
    const h = normHex(hex);
    if (!h) return false;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 150;
  }
  function isPlaceholderStr(s) {
    const t = String(s || '').trim();
    if (!t) return false;
    if (/^⟦\s*ph\s*[:：]([\s\S]*?)⟧$/i.test(t)) return true;
    return /^(?:\(\s*(?:বাংলায়|ইংরেজিতে|বাংলা|ইংরেজি|In\s+Bangla|In\s+English|ঐচ্ছিক|Optional)[^)]*\)|DD\s*[/.\-]\s*MM\s*[/.\-]\s*YYYY|YYYY\s*[/.\-]\s*MM\s*[/.\-]\s*DD|দিন\s*[/.\-]\s*মাস\s*[/.\-]\s*বছর|(?:এখানে\s+)?লিখুন\.{0,3}|নির্বাচন\s+করুন\.{0,3}|Select.*|Enter.*|(?:উদাঃ|যেমন\s*[:ঃ]|e\.g\.)\s*.+)$/i.test(t);
  }
  function stripPlaceholderWrap(s) {
    return String(s || '').replace(/^⟦\s*ph\s*[:：]([\s\S]*?)⟧$/i, '$1').trim();
  }
  function parseInlineBoxes(text) {
    const s = String(text || '').trim();
    if (!s) return null;
    const brkRe = /^([^[\]□]*?)\s*((?:\[\s*[^\][\s]{0,2}\s*\]\s*){4,})$/;
    const m1 = brkRe.exec(s);
    if (m1) {
      const cells = [...m1[2].matchAll(/\[\s*([^\][\s]{0,2})\s*\]/g)].map((x) => x[1] || '');
      return { label: m1[1].trim(), cells };
    }
    const sqRe = /^([^□☐]*?)\s*(?:([০-৯0-9]{1,2})\s+)?((?:[□☐]\s*){4,})$/;
    const m2 = sqRe.exec(s);
    if (m2) {
      const pre = m2[2] ? m2[2].split('') : [];
      const rest = (m2[3].match(/[□☐]/g) || []).map(() => '');
      return { label: m2[1].trim(), cells: pre.concat(rest) };
    }
    return null;
  }
  const MCQ_SPLIT_RE = /\s+(?=(?:\([ক-হa-dA-DiIvVxX]+\)|[ক-হa-dA-D][.)।])\s*\S)/g;
  const MCQ_TEST_RE = /(?:^|\s)(?:\([ক-হa-dA-DiIvVxX]+\)|[ক-হa-dA-D][.)।])\s*\S/g;
  function tabifyMcqBuilder(lines, lineSegs, availW, indPt) {
    const ls = (lines || []).filter((l) => String(l || '').trim());
    if (!ls.length || !ls.some((l) => (String(l).match(MCQ_TEST_RE) || []).length >= 2)) return null;
    const out = [], stops = [];
    const baseInd = indPt || 0, w = Math.max(120, (availW || 450) - baseInd);
    ls.forEach((l, i) => {
      const parts = String(l).trim().split(MCQ_SPLIT_RE).map((p) => p.trim()).filter(Boolean);
      if (parts.length < 2) { out.push(l); return; }
      out.push(parts.join('	'));
      const segs = lineSegs && lineSegs[i] ? lineSegs[i] : null;
      if (segs && segs.length === parts.length) {
        segs.slice(1).forEach((s) => stops.push(s.x));
      } else if (segs && segs.length > parts.length) {
        const gaps = [];
        for (let k = 1; k < segs.length; k++) gaps.push({ k, g: segs[k].x - (segs[k - 1].x + (segs[k - 1].w || 0)), x: segs[k].x });
        gaps.sort((a, b) => b.g - a.g);
        gaps.slice(0, parts.length - 1).sort((a, b) => a.k - b.k).forEach((g) => stops.push(g.x));
      } else {
        for (let k = 1; k < parts.length; k++) stops.push(Math.round((baseInd + (w * k) / parts.length) * 10) / 10);
      }
    });
    if (!stops.length) return null;
    stops.sort((a, b) => a - b);
    const merged = [];
    for (const s of stops) { if (!merged.length || s - merged[merged.length - 1] > 8) merged.push(s); }
    return { lines: out, stops: merged };
  }
  const TRAIL_MARK_RE = /^(.*?\S)(?:	|\s{2,})(\(?[০-৯0-9]+(?:\.[০-৯0-9]+)?(?:\s*[×*xX]\s*[০-৯0-9]+\s*=\s*[০-৯0-9]+)?\)?|\[[০-৯0-9]+\])\s*$/;
  const Q_TRAIL_MARK_RE = /^(.*[?।:ঃ)])\s+(\(?[০-৯0-9]{1,3}\)?|\[[০-৯0-9]{1,3}\])\s*$/;

  /**
   * সমীকরণের ধরন শনাক্তকরণ (ভগ্নাংশ/স্ট্যাকড > মূল/বড়-চিহ্ন > সূচক/সহগ > সাধারণ সমীকরণ)।
   * @returns 'frac' | 'rad' | 'sup' | 'math' | null
   */
  function mathKindOf(text, hint) {
    let hk = null;
    if (hint && typeof hint === 'object') {
      if (hint.mathKind === 'frac' || hint.eqType === 'frac' || hint.isFraction) hk = 'frac';
      else if (hint.mathKind === 'rad' || hint.mathKind === 'sqrt' || hint.eqType === 'rad') hk = 'rad';
      else if (hint.mathKind === 'sup' || hint.mathKind === 'script' || hint.eqType === 'sup') hk = 'sup';
      else if (hint.hasEquation || hint.mathKind === 'math' || hint.eqType === 'math') hk = 'math';
    }
    const t = String(text || '');
    let tk = null;
    if (t) {
      if (/\\(?:d|t|c)?frac(?![A-Za-z])|\\(?:d|t|c)?binom(?![A-Za-z])|\\(?:over|atop|stackrel|overset|underset)(?![A-Za-z])|\\begin\{(?:p|b|B|v|V)?matrix\}|\\begin\{(?:cases|array|aligned|split)\}|(?:\\(?:sum|prod|coprod|int|oint|iint|bigcup|bigcap|lim)(?![A-Za-z])|[∑∏∐∫∮∬⋃⋂])\s*(?:[_^⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]|\\(?:limits|nolimits))|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞⁄]|\$[^$]*\/[^$]*\$|⟦eq[^⟧]*\/[^⟧]*⟧|\([^()\n]+\)\s*\/\s*\([^()\n]+\)|\{[^{}\n]+\}\s*\/\s*\{[^{}\n]+\}/.test(t)) tk = 'frac';
      else if (/\\sqrt(?![A-Za-z])|[√∛∜]|\\(?:sum|prod|coprod|int|oint|iint|bigcup|bigcap|lim)(?![A-Za-z])|[∑∏∐∫∮∬⋃⋂]/.test(t)) tk = 'rad';
      else if (/\^\{[^}]*\}|_\{[^}]*\}|<sup\b|<sub\b|[A-Za-z0-9)\]\u0980-\u09FF]\s*[\^_]\s*[A-Za-z0-9(+\-\u09E6-\u09EF]|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₔₕₖₗₘₙₚₛₜ]/i.test(t)) tk = 'sup';
      else if (/(\$|\\(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|sin|cos|tan|cot|sec|csc|log|ln|infty|pm|mp|times|div|neq|leq|geq|approx|equiv|in|notin|subset|subseteq|cup|cap|emptyset|angle|triangle|perp|parallel)(?![A-Za-z])|⟦eq|[\u2200-\u22FF])/.test(t)) tk = 'math';
    }
    if (!tk) return hk;
    if (!hk) return tk;
    const rank = { frac: 4, rad: 3, sup: 2, math: 1 };
    return rank[tk] >= rank[hk] ? tk : hk;
  }

  /** ভগ্নাংশের লব বা হরের ভেতরে আরেকটি ভগ্নাংশ (নেস্টেড) আছে কিনা — একই লাইনের একাধিক ভগ্নাংশকে নেস্টেড ধরা হয় না */
  function hasNestedFrac(t) {
    const s = String(t || '');
    const re = /\\(?:d|t|c)?frac(?![A-Za-z])/g;
    let m;
    while ((m = re.exec(s)) !== null) {
      let i = m.index + m[0].length;
      for (let arg = 0; arg < 2; arg++) {
        while (i < s.length && /\s/.test(s[i])) i++;
        if (s[i] !== '{') break;
        let depth = 1, start = ++i;
        while (i < s.length && depth > 0) {
          if (s[i] === '{') depth++;
          else if (s[i] === '}') depth--;
          i++;
        }
        const inner = s.slice(start, i - 1);
        if (/\\(?:d|t|c)?frac(?![A-Za-z])|\\(?:over|atop)(?![A-Za-z])|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞⁄]/.test(inner)) return true;
      }
    }
    return false;
  }

  /** এক লাইনের সমীকরণের ধরন অনুযায়ী বাড়তি উচ্চতা (pt): ভগ্নাংশ/স্ট্যাকড > মূল > সূচক > সাধারণ */
  function mathLineExtraPt(text, fs, hint) {
    const f = fs || 12, t = String(text || ''), k = mathKindOf(t, hint);
    if (!k) return 0;
    if (k === 'frac') {
      return f * (hasNestedFrac(t) ? 1.45 : 1.05);
    }
    if (k === 'rad') {
      const innerSup = /\\sqrt\s*(?:\[[^\]]*\])?\s*\{[^}]*[\^_⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]|√\s*\(?[^)\s]*[\^_⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]/.test(t);
      return f * (innerSup ? 0.55 : 0.45);
    }
    if (k === 'sup') {
      const both = (/\^|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]|<sup\b/i.test(t)) && (/_|[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₔₕₖₗₘₙₚₛₜ]|<sub\b/i.test(t));
      return f * (both ? 0.38 : 0.28);
    }
    return f * 0.12;
  }

  /** সমীকরণ-যুক্ত লেখার দৃশ্যমান প্রস্থের অনুমানের জন্য LaTeX কমান্ড সংক্ষেপ */
  function mathVisStr(s) {
    let out = String(s || '')
      .replace(/\\sqrt\s*(?:\[[^\]]*\])?\s*\{([^{}]*)\}/g, '√$1')
      .replace(/[\^_]\s*\{([^{}]*)\}/g, '$1');
    for (let d = 0; d < 4 && /\\(?:d|t|c)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/.test(out); d++) {
      out = out.replace(/\\(?:d|t|c)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, a, b) => (a.length >= b.length ? a : b));
    }
    return out
      .replace(/\\(?:left|right)\s*([()[\]{}|.])/g, '$1')
      .replace(/\\[A-Za-z]+/g, 'm')
      .replace(/[\${}^_]|⟦eq:?|⟧/g, '');
  }

  function hasEqItem(it) {
    if (!it) return false;
    if (it.hasEquation || it.mathKind) return true;
    if (mathKindOf(it.text, it)) return true;
    const ls = it.tabLines || it.lines;
    return Array.isArray(ls) && ls.some((l) => !!mathKindOf(l, it));
  }

  /** অনুচ্ছেদের সমীকরণ-জনিত মোট বাড়তি উচ্চতা (pt) */
  function mathExtraH(it, nLines) {
    if (!it || it.kind === 'figure' || it.kind === 'table') return 0;
    const fs = it.fontPt || 12, baseLh = lineH(it);
    const rawLs = (it.tabLines && it.tabLines.length)
      ? it.tabLines
      : ((it.keepLines ? it.lines : null) || (it.lines && it.lines.length ? it.lines : String(it.text || '').split('\n')));
    const ls = rawLs.length ? rawLs : [String(it.text || '')];
    let extra = 0;
    for (let i = 0; i < ls.length; i++) {
      const ex = mathLineExtraPt(ls[i], fs, ls.length === 1 ? it : null);
      if (ex > 0) {
        const effEx = baseLh > fs * 1.15 ? Math.max(0, (fs * 1.15 + ex) - baseLh) : ex;
        extra += effEx;
      }
    }
    if (extra === 0 && ls.length > 1) {
      const hEx = mathLineExtraPt('', fs, it);
      if (hEx > 0) extra = baseLh > fs * 1.15 ? Math.max(0, (fs * 1.15 + hEx) - baseLh) : hEx;
    }
    if (extra === 0 && it.mathExtraPt > 0) {
      extra = baseLh > fs * 1.15 ? Math.max(0, (fs * 1.15 + it.mathExtraPt) - baseLh) : it.mathExtraPt;
    }
    return extra;
  }

  /** টেবিল-সারির সমীকরণ-জনিত বাড়তি উচ্চতা (pt) */
  function rowMathExtraPt(row, fs) {
    if (!Array.isArray(row)) return 0;
    let mx = 0;
    for (let k = 0; k < row.length; k++) {
      const c = String(row[k] || '');
      if (!c) continue;
      const cellEx = c.split('\n').reduce((a, ln) => a + mathLineExtraPt(ln, fs), 0);
      if (cellEx > mx) mx = cellEx;
    }
    return mx;
  }

  const FONT = 'SutonnyOMJ';
  const UNI_SENTINEL = 'FzUnicodeFace';
  // B7: হুবহু-মোডে ইউনিকোড ফন্ট বাছাই (সুইচ __FZ_ON_FONTPICK)
  const UNICODE_FONTS = ['SutonnyOMJ', 'Kalpurush', 'Nikosh', 'SolaimanLipi'];
  let _activeDocxFont = null;
  const fontPickOn = () => !!(
    (typeof globalThis !== 'undefined' && globalThis.__FZ_ON_FONTPICK) ||
    (typeof window !== 'undefined' && window.__FZ_ON_FONTPICK) ||
    (global && global.__FZ_ON_FONTPICK) ||
    (typeof process !== 'undefined' && process && process.env && (process.env.__FZ_ON_FONTPICK === '1' || process.env.__FZ_ON_FONTPICK === 'true'))
  );
  function resolveDocxFont(src) {
    if (!fontPickOn()) return FONT;
    const cand = (typeof src === 'string' && src) ||
      (src && (src.font || src.unicodeFont || src.fontFamily)) ||
      _activeDocxFont ||
      (typeof globalThis !== 'undefined' && globalThis.__FZ_UNICODE_FONT) ||
      (global && global.__FZ_UNICODE_FONT) ||
      FONT;
    return UNICODE_FONTS.indexOf(cand) !== -1 ? cand : FONT;
  }
  const tw = (pt) => Math.max(0, Math.round((pt || 0) * 20));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const emu = (pt) => Math.round((pt || 0) * 12700);
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const pick = (n) => (typeof global !== 'undefined' && global[n]) || (typeof window !== 'undefined' && window[n]) || null;
  const JC = { l: 'left', c: 'center', r: 'right', j: 'both' };
  // সংখ্যা-বাক্সের ঘর-চিহ্ন — layout-ir.js-এর BOX_MARK/BOX_SEP-এর সাথে এক
  const BOX_MARK = '\u0001box:', BOX_SEP = '\u0002';

  // Part-17.9 + g41: লেখার অংশ-বিশেষ — **মোটা**, *বাঁকা* (ইটালিক লেবেল), ^{উপরে} (2^{nd}, O ^{(ve-)}) — Gemini-র চিহ্ন ⇒ আলাদা রান
  const MARK = /(<u>[^<]*<\/u>|\*\*[^*]+\*\*|\*[^*\s][^*]*?\*|\^\{[^}]*\})/;
  function runsFor(text, item) {
    if (formKitOn()) {
      if ((text == null || text === '') && item && typeof item.placeholder === 'string' && item.placeholder) {
        return runsFor(item.placeholder, Object.assign({}, item, { placeholder: false, color: item.color || '808080' }));
      }
      if (item && item.placeholder === true && !item.color) {
        item = Object.assign({}, item, { color: '808080' });
      }
      if (item && !item.color && (item.fill || item.shade) && isDarkHex(item.fill || item.shade)) {
        item = Object.assign({}, item, { color: 'FFFFFF' });
      }
      if (typeof text === 'string' && /⟦\s*ph\s*[:：][^⟧]+⟧/i.test(text)) {
        return text.split(/(⟦\s*ph\s*[:：][^⟧]+⟧)/i).filter(Boolean).map((seg) => {
          const pm = /^⟦\s*ph\s*[:：]([\s\S]*?)⟧$/i.exec(seg);
          return pm ? runsFor(pm[1].trim(), Object.assign({}, item, { color: '808080' })) : runsFor(seg, item);
        }).join('');
      }
    }
    // a03 (২০২৬-১০-১২): Gemini খালি চেকবক্সকে "⟦ ⟧" (প্রম্পটের পূরণ-চিহ্ন দেখে) বা "[ ]" লেখে ⇒ মূলের মতো বাক্স-চিহ্ন □
    // (অ-বাংলা রানে — বিজয়-পথে অক্ষত)। ⟦c×N⟧ পূরণ-চিহ্ন layout-tags আগেই খোলে
    // f2 (২০২৬-১০-১২): Gemini কখনো HTML-চিহ্ন দেয় ("<u>www.bnswc.gov.bd</u>" হুবহু ছাপা হতো) ⇒ <b>/<i>/<sup> আমাদের চিহ্নে,
    // <u> নিচে-দাগের রানে; অন্য অচেনা ট্যাগ বাদ
    const t0 = String(text == null ? '' : text).replace(/[[⟦]\s?[\]⟧]/g, '□')
      .replace(/<b>([^<]*)<\/b>/gi, '**$1**').replace(/<i>([^<]*)<\/i>/gi, '*$1*').replace(/<sup>([^<]*)<\/sup>/gi, '^{$1}')
      .replace(/<U>/g, '<u>').replace(/<\/U>/g, '</u>')
      .replace(/<\/?(?!u>)(?:b|i|sup|sub|span|font|strong|em|br)\b[^>]*>/gi, '');
    if (!MARK.test(t0)) return runsPlain(t0.replace(/\*\*/g, ''), item);
    return t0.split(MARK).filter((s) => s !== '').map((s) => {
      let mk;
      if ((mk = /^<u>([^<]*)<\/u>$/.exec(s))) return runsFor(mk[1], Object.assign({}, item, { underline: true }));
      if ((mk = /^\*\*([^*]+)\*\*$/.exec(s))) return runsFor(mk[1], Object.assign({}, item, { bold: true }));
      if ((mk = /^\*([^*\s][^*]*?)\*$/.exec(s))) return runsFor(mk[1], Object.assign({}, item, { italic: true }));
      if ((mk = /^\^\{([^}]*)\}$/.exec(s))) return runsPlain(mk[1], Object.assign({}, item, { sup: true }));
      return runsPlain(s.replace(/\*\*/g, ''), item);
    }).join('');
  }

  function runsPlain(text, item) {
    // B9: লাল '*' (আবশ্যক ক্ষেত্রের তারকা চিহ্ন) — সাদা লেখার শিরোনাম-ব্যান্ড ছাড়া অন্য কোথাও একক '*' লাল রঙে
    if (formKitOn() && !item._noStar && String(text || '').includes('*') && normHex(item.color) !== 'FFFFFF') {
      return String(text).split(/(\*)/).filter((s) => s !== '')
        .map((s) => runsPlain(s, s === '*' ? Object.assign({}, item, { color: item.starColor || 'FF0000', _noStar: true }) : Object.assign({}, item, { _noStar: true }))).join('');
    }
    // ২০২৬-১০-১৩: বিন্দু-সারি (≥৬) মোটা — সাধারণ ওজনে SutonnyOMJ-এর বিন্দু খুদে/ধূসর (মূলে কালো, f2/a03 পূরণ-লাইন ছোট দেখাত)
    // ২০২৬-১০-১৪ (মালিকের a17/a02 Word-যাচাই: "'....' গুলো এখনও বোল্ড", মূলে চিকন) ⇒ ডিফল্ট বন্ধ; FZ_ON=DOTBOLD-এ পুরোনো
    if (globalThis.__FZ_ON_DOTBOLD && !item.bold && /[.…·]{6,}/.test(text)) {
      return String(text).split(/([.…·]{6,})/).filter((s) => s !== '')
        .map((s) => runsPlain(s, /^[.…·]{6,}$/.test(s) ? Object.assign({}, item, { bold: true }) : item)).join('');
    }
    const E = pick('ExportDualEngine');
    const style = { sz: Math.round((item.fontPt || 12) * 2), b: !!item.bold, i: !!item.italic, u: !!item.underline };
    // Part-17.7: renderDocxRuns নামে "sutonny" থাকলেই বিজয়-এনকোড করে ফেলে ⇒ মাস্টার ইউনিকোড রাখতে নিরপেক্ষ নাম দিয়ে পরে বদল
    // g41: লেখার রং (গাঢ় পটিতে সাদা) — rPr-এ sz-এর ঠিক আগে (স্কিমা-ক্রম)
    // শুধু-লেখার পেছনে পটি (shadeRun): rPr-এর শেষে (lang থাকলে তার আগে)
    const rShadeVal = formKitOn() ? normHex(item.fill || item.shade) : (item.shade || '');
    const runShd = item.shadeRun && /^[0-9A-F]{6}$/i.test(rShadeVal || '') ? `<w:shd w:val="clear" w:color="auto" w:fill="${rShadeVal}"/>` : '';
    const sup = item.sup ? '<w:vertAlign w:val="superscript"/>' : '';
    const rColVal = formKitOn() ? (normHex(item.color) || item.color) : item.color;
    const colored = (xml) => {
      let x = rColVal ? xml.replace(/<w:sz /g, `<w:color w:val="${rColVal}"/><w:sz `) : xml;
      // স্কিমা-ক্রম: … shd, vertAlign, …, lang
      if (runShd || sup) x = x.replace(/(<w:lang[^>]*\/>)?<\/w:rPr>/g, (m0, lang) => `${runShd}${sup}${lang || ''}</w:rPr>`);
      return x;
    };
    const outFont = resolveDocxFont(item);
    if (E && typeof E.renderDocxRuns === 'function') {
      return colored(E.renderDocxRuns(text, { font: UNI_SENTINEL, keepLoneRo: true }, style).split(`"${UNI_SENTINEL}"`).join(`"${outFont}"`));
    }
    return colored(`<w:r><w:rPr><w:rFonts w:ascii="${outFont}" w:hAnsi="${outFont}" w:cs="${outFont}"/>${style.b ? '<w:b/>' : ''}${style.i ? '<w:i/>' : ''}${style.u ? '<w:u w:val="single"/>' : ''}<w:sz w:val="${style.sz}"/><w:szCs w:val="${style.sz}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`);
  }

  // Part-17.9: লাইন-উচ্চতা — মাপা লাইন-দূরত্ব (ফন্টের ২ গুণের কম হলে), নইলে Word-এর single (≈১.১৫×ফন্ট, ক্যালিব্রেটেড); কম নয় (কাটা পড়া ঠেকাতে)
  // ২০২৬-১০-১২: মাপা লাইন-দূরত্ব ফন্টের ১.১৫ গুণের কম হলেও সেটিই (≥০.৮৫ গুণ) — Word-এ যাচাই: ১২pt SutonnyOMJ "ঠিক" ১০pt-এও
  // কালি কাটে না (৯pt-এ ০.৩%)। আগে সর্বনিম্ন ১.১৫ ধরায় f2-এর ৫ লাইনের অংশ ৬৯pt (মূলে ৫৮) ⇒ নিচের সব ২১pt নামত
  const lineH = (it) => {
    const fs = it.fontPt || 12, ls = it.lineSpacingPt;
    return ls && ls >= (it.lineRule === "exact" ? 6 : fs * 0.85) && ls < fs * 2 ? ls : fs * 1.15;
  };
  /** আউটপুটে একটি অংশের অনুমিত উচ্চতা (pt) — "ঠিক" লাইন-উচ্চতা থাকায় অনুচ্ছেদের হিসাব নির্ভুল */
  /**
   * টেবিলের সারি-উচ্চতা (pt) — itemH ও tableXml একই হিসাব ব্যবহার করে।
   * সাধারণ নিয়ম: মাপা উচ্চতা ÷ সারি, ফাঁকা সারি ০.৪ ভাগ (আলাদা ছোট টেবিলের মাঝের ফাঁক)।
   * B2 (২০২৬-১০-১১): ফাঁকা সারি থাকলে আর সমান ভাগে লেখার সারি স্বাভাবিকের ১.৮ গুণের বেশি ফুলে উঠলে
   * (ক্যাশমেমোর লম্বা লেখার-জায়গা, ⟦rows×N⟧ ফরম) ⇒ লেখার সারি স্বাভাবিক উচ্চতায়, বাকি উচ্চতা ফাঁকা সারিগুলোতে সমান।
   */
  // মূল অক্ষর-গোনা মোড়ানো-লাইন (কার/হসন্ত/চন্দ্রবিন্দু আলাদা প্রস্থ নেয় না)
  // ঘরের ভেতরের ছক (subTable) ≈ ৪টি ছোট লাইন (মোড়ানো শিরোনাম + ফাঁকা সারি) — HTML-চিহ্নের দৈর্ঘ্য নয়
  const wrapLines = (txt, fs, cwPt) => String(txt || '').replace(/<table\b[\s\S]*?(<\/table>|$)/gi, '\n.\n.\n.\n.\n').split('\n').reduce((a, ln) => a + (Math.ceil((mathHOn() ? mathVisStr(ln) : ln).replace(/[ঁ-ঃ়া-্ৗ]/g, '').length * fs * 0.45 / Math.max(20, cwPt)) || 1), 0);
  /**
   * a18: জোড়া ঘর — লম্বা লেখা নিজের কলামে না আঁটলে আর ডানের ঘর ফাঁকা হলে ডানে জোড়া (gridSpan), যতক্ষণ না আঁটে।
   * (মূলে "বিঃদ্রঃ…" চার কলাম জুড়ে; প্রথম সরু ঘরে বসালে সারি ৩ গুণ লম্বা ⇒ পাতা উপচাত।) ফেরত: প্রতি কলামে span, ঢাকা ঘর ০
   */
  function rowSpans(r, ri, nCols, colWPt, fs, marPt, figRows, fullV, vMergesRow) {
    const sp = new Array(nCols).fill(1);
    const blank = (j) => !(r[j] && String(r[j]).trim()) && !(tableGridOn() && vMergesRow && vMergesRow[j]);
    const boxPosOn = globalThis.__FZ_ON_BOXPOS && !globalThis.__FZ_OFF_BOXPOS;
    const wraps = (txt, cwPt) => (!boxPosOn || !/^\s*□\s/m.test(String(txt || ""))) ? wrapLines(txt, fs, cwPt) > 1
      : String(txt || "").split("\n").some((ln) => wrapLines(ln, fs, cwPt) > 1);
    for (let k = 0; k < nCols; k++) {
      if (!sp[k] || blank(k) || figRows.has(ri) || String(r[k]).startsWith(BOX_MARK)) continue;
      let w = colWPt(k), j = k + 1;
      // a17 p6: মাপা পূর্ণ-উচ্চতার খাড়া দাগ (layout-ir fullVRule) পেরিয়ে জোড়া নয়
      while (j < nCols && blank(j) && !(fullV && fullV.length === nCols - 1 && fullV[j - 1]) && wraps(r[k], w - 2 * marPt)) { w += colWPt(j); sp[k]++; sp[j] = 0; j++; }
    }
    return sp;
  }

  function tableRowHeights(it, marPt) {
    const rows = it.rows && it.rows.length ? it.rows : [['']];
    const fs = it.fontPt || 11, nCols = Math.max(...rows.map((r) => r.length));
    // f1: ভাঁজ-করা ফরম-ছক — মাপা উচ্চতা লাইন-সংখ্যার অনুপাতে ভাগ ("অন্তত", লেখা কাটা পড়ে না)
    if (it.rowWeights && it.rowWeights.length === rows.length && it.heightPt) {
      const tot = it.rowWeights.reduce((a, b) => a + b, 0);
      const res = it.rowWeights.map((w, ri) => ({ h: Math.max(fs * 1.2 * w + (mathHOn() ? rowMathExtraPt(rows[ri], fs) : 0), it.heightPt * w / tot), exact: false }));
      res.fitted = true;
      return res;
    }
    const figRows = new Set((it.cellFigures || []).map((f) => f.cell[0]));
    const empty = rows.map((r, ri) => !r.some((c) => c && String(c).trim()) && !figRows.has(ri));
    // a18: রেখা-ভাগ থেকে মাপা সারি-উচ্চতা (layout-ir rowBandHeights) — মোট = মাপা টেবিল-উচ্চতা (planPage ছোট করলে সেই অনুপাতে)
    const rbh = it.rowHeightsPt;
    if (rbh && rbh.length === rows.length && it.heightPt) {
      const tot = rbh.reduce((a, b) => a + b, 0);
      if (tot > 0) {
        let scaledRbh = rbh.slice();
        if (it.heightPt < tot) {
          let diff = tot - it.heightPt;
          const tallEmpty = scaledRbh.map((h, ri) => (empty[ri] && h > 40 ? ri : -1)).filter((ri) => ri >= 0);
          if (tallEmpty.length) {
            tallEmpty.forEach((ri) => { const cut = Math.min(diff, scaledRbh[ri] * 0.25); scaledRbh[ri] -= cut; diff -= cut; });
          }
          const remTot = scaledRbh.reduce((a, b) => a + b, 0);
          if (diff > 0.5 && remTot > 0) scaledRbh = scaledRbh.map((h) => h * (it.heightPt / remTot));
        } else if (it.heightPt > tot) {
          scaledRbh = scaledRbh.map((h) => h * (it.heightPt / tot));
        }
        const minF = it.noVRules ? 1.2 : 1.15;
        const res = scaledRbh.map((h, ri) => ({ h: Math.max(empty[ri] ? 2 : fs * minF, h), exact: empty[ri] }));
        // a07 (২০২৬-১০-১৩): রেখা-ভাগ ভুল জায়গায় (৬ লাইনের সারি ৩০pt, পাশের ১২ লাইনের সারি ২৮৩pt) ⇒ "অন্তত" সারি Word-এ
        // লেখার মাপে বাড়ত, টেবিল +৬০pt, পাতা উপচাত। লেখার চেয়ে নিচু সারিকে লেখার উচ্চতা, ঘাটতি বাড়তি-জায়গাওয়ালা সারি থেকে (মোট একই)
        const fr = it.colFractions && it.colFractions.length === nCols ? it.colFractions : null;
        const cwp = (k) => (it.widthPt || 400) * (fr ? fr[k] : 1 / nCols);
        const nat = rows.map((r, ri) => {
          if (empty[ri] || figRows.has(ri)) return 0;
          const sp = (it.gridSpans && it.gridSpans[ri]) ? it.gridSpans[ri].slice() : rowSpans(r, ri, nCols, cwp, fs, marPt || 5.4, figRows, it.fullVRule);
          let n = 1;
          // সরু ঘরে (<১৫০pt) শব্দ-মোড়ানোয় অপচয় ⇒ ০.৯ প্রস্থ (a07 "কমিউনিকেশন দক্ষতা…" অনুমান ২, Word ৩); মূলের পূর্ণ-প্রস্থ
          // লাইন ('\n', a19) অনুমানে ১.০১ হলে ২ নয় ⇒ ০.১৫ ছাড়
          // বিন্দু-সারি অক্ষরের অর্ধেক চওড়া (আর line-fit ঘরে আঁটাতে ছোট করে) ⇒ অর্ধেক গোনা
          const ffTrh = !!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_FB0);
          const est = (txt, cw) => String(txt || '').split('\n').reduce((a, ln) => a + Math.max(1, Math.ceil((mathHOn() ? mathVisStr(ln) : ln).replace(/[ঁ-ঃ়া-্ৗ]/g, '').replace(/([._…·])\1{5,}/g, (s) => s.slice(0, s.length >> 1)).length * fs * 0.45 / Math.max(20, cw) - 0.15)), 0);
          // [Rule FB0: FZ_OFF=FORMFIX / FZ_OFF=FB0] gridFirst ছকের সরু কলামে (<70pt) প্রকৃত সেল-মার্জিন (0 বা 1.4pt) দিয়ে লাইন-মোড়ানো হিসাব এবং ১-লাইনের ছোট শিরোনামে 0.9 সংকোচন পরিহার।
          r.forEach((c, k) => { if (!sp[k]) return; let w = 0; for (let j = k; j < k + sp[k] && j < nCols; j++) w += cwp(j); const effM = ffTrh && it.gridFirst && !it.borderless && w < 70 ? (w < 25 ? 0 : 1.4) : (marPt || 5.4); const cw = w - 2 * effM; const isShortHdr = ffTrh && ri === 0 && !String(c || '').includes('\n') && String(c || '').trim().length <= 16; n = Math.max(n, est(c, (cw < 150 && !isShortHdr) ? cw * 0.9 : cw)); });
          const mEx = mathHOn() ? rowMathExtraPt(r, fs) : 0;
          return { n, mEx, h: fs * 1.25 * n + 3 + mEx };
        });
        let need = 0;
        // বাড়ানো শুধু বহু-লাইনের সারি (মোট একই ⇒ অনুমান বেশি হলেও শুধু টেবিলের ভেতরে সরে); বাড়তি জায়গা এক-লাইনের সারি থেকেও (a19)
        // শুধু স্পষ্ট ঘাটতি (a07 ২.৫×, a19 ১.৫×); অনুমানের ভুলে (a18 ১.১৮×) নয়
        res.forEach((x, ri) => { if (!x.exact && nat[ri] && ((nat[ri].n >= 2 && nat[ri].h > x.h * 1.25 + 2) || (nat[ri].mEx > 0 && nat[ri].h - 3 > x.h))) { const tgt = nat[ri].n >= 2 ? nat[ri].h : nat[ri].h - 3; need += tgt - x.h; x.h = tgt; } });
        if (need > 0) {
          const slack = res.map((x, ri) => (x.exact || !nat[ri] ? 0 : Math.max(0, x.h - nat[ri].h)));
          const S = slack.reduce((a, b) => a + b, 0);
          if (S > 0) { const k = Math.min(1, need / S); res.forEach((x, ri) => { x.h -= slack[ri] * k; }); }
        }
        res.fitted = true;
        return res;
      }
    }
    const nE = empty.filter(Boolean).length;
    const rowH = it.heightPt ? it.heightPt / (rows.length - nE + nE * 0.4) : 0;
    const old = rows.map((r, ri) => (empty[ri] ? { h: rowH * 0.4, exact: !!rowH } : { h: rowH, exact: false, legacy: true }));
    if (!rowH || (!nE && rows.length < 4) || nE === rows.length || figRows.size) return old;
    const fr = it.colFractions && it.colFractions.length === nCols ? it.colFractions : null;
    const wPt = it.widthPt || 400;
    const colWPt = (k) => wPt * (fr ? fr[k] : 1 / nCols);
    const natural = (r, ri) => {
      let lines = 1;
      // a18: জোড়া ঘর হলে জোড়া প্রস্থে মাপা (tableXml-এর সাথে একই হিসাব)
      const sp = rowSpans(r, ri, nCols, colWPt, fs, marPt || 5.4, figRows, it.fullVRule);
      r.forEach((c, k) => {
        if (!sp[k]) return;
        let w = 0;
        for (let j = k; j < k + sp[k] && j < nCols; j++) w += colWPt(j);
        // বহু-লাইনের ঘর ('\n'): প্রতিটি লাইনের মোড়ানো-লাইন যোগ
        lines = Math.max(lines, wrapLines(c, fs, w - 2 * (marPt || 5.4)));
      });
      return fs * 1.25 * lines + 3 + (mathHOn() ? rowMathExtraPt(r, fs) : 0);
    };
    const nat = rows.map((r, ri) => (empty[ri] ? 0 : natural(r, ri)));
    // a07: ফাঁকা সারি নেই, সারির লাইন-সংখ্যা ভিন্ন (১/২/৩) ⇒ সমান ভাগে বহু-লাইনের সারি "অন্তত" উচ্চতা ছাড়িয়ে টেবিল লম্বা
    // হতো (এক পাতা ⇒ দুই)। মাপা উচ্চতা স্বাভাবিক-উচ্চতার অনুপাতে ভাগ (মোট স্বাভাবিক ≤ মাপা হলে)
    if (!nE && rowH && rows.length >= 4 && !figRows.size) {
      const sum = nat.reduce((a, b) => a + b, 0);
      if (sum <= it.heightPt && Math.max(...nat) > Math.min(...nat) * 1.5) {
        const res = nat.map((n) => ({ h: n * it.heightPt / sum, exact: false }));
        res.fitted = true;
        return res;
      }
      return old;
    }
    const maxNat = Math.max(...rows.map((r, ri) => (empty[ri] ? 0 : nat[ri] - (mathHOn() ? rowMathExtraPt(r, fs) : 0))));
    if (rowH < maxNat * 1.8) return old;
    const rest = (it.heightPt - nat.reduce((a, b) => a + b, 0)) / nE;
    if (rest < fs * 1.2) return old;
    const out = rows.map((r, ri) => (empty[ri] ? { h: rest, exact: true } : { h: nat[ri], exact: false }));
    out.fitted = true;
    return out;
  }

  // a03 (২০২৬-১০-১২): নিচের-দাগ (layout-ir applyHorizontalRules) — লেখার নিচ থেকে মূলের দূরত্বে (Word-সীমা ≤৩১pt)
  const textH = (it) => {
    if (faithfulStudioOn()) it = layoutItem(it);
    let n = (it.tabLines || (it.keepLines ? it.lines : null) || it.lines || []).length || 1;
    if (mathHOn() && n === 1 && !it.tabLines && (!it.lines || !it.lines.length) && String(it.text || '').includes('\n')) {
      n = String(it.text).split('\n').length;
    }
    const ml = it.diag && it.diag.lines;
    if (!it.tabLines && ml >= 3 && ml >= n * 2) n = ml;
    return n * lineH(it) + (mathHOn() ? mathExtraH(it, n) : 0);
  };
  const ruleSpace = (it) => (it.ruleBelow && it.rect ? Math.max(0, Math.min(31, Math.round(it.ruleBelow.srcY - (it.rect.y + textH(it))))) : 0);
  const ruleExtra = (it) => (it.ruleBelow ? ruleSpace(it) + it.ruleBelow.sz / 8 : 0);

  function itemH(it) {
    if (faithfulStudioOn()) it = layoutItem(it);
    if (formKitOn()) {
      if (it.kind === 'box_row' || it.type === 'box_row' || Array.isArray(it.boxes) || it.boxCount > 0) return (it.heightPt || 18) + 2;
      if (it.kind === 'photo_box' || it.type === 'photo_box' || it.photoBox) return (it.heightPt || (it.rect && it.rect.h) || 105) + 4;
    }
    if (it.kind === 'figure') return (it.heightPt || 0) + 2;
    if (it.kind === 'table') {
      const rh = tableRowHeights(it);
      // ২০২৬-১০-১৩: বর্ডারের ছাড় — Word-মাপে (plan-vs-word) সীমানাহীন টেবিল ঠিক সারির যোগফল, সীমানাওয়ালা ≤০.৫pt বেশি (আগে সবই +১ ⇒ প্রতি টেবিলে লাইন ১pt নিচে জমত)
      // "অন্তত" সারিতে Word প্রতি সারিতে বর্ডারের পুরুত্ব (০.৭৫) যোগ করে (a02 ৫ সারি ⇒ +৪.৫pt); "ঠিক" সারিতে নয়
      const rows = it.rows && it.rows.length ? it.rows : [['']];
      const nE = rows.filter((r) => !r.some((c) => c && String(c).trim())).length;
      const rowH = it.heightPt ? it.heightPt / (rows.length - nE + nE * 0.4) : 0;
      const fs = it.fontPt || 11;
      // (tableXml এখন "অন্তত"-সারি থেকে বর্ডার বাদ দেয় ⇒ মাপা উচ্চতা-অনুযায়ী সারি; বাড়তি শুধু যেখানে সারির উচ্চতা লেখা নেই)
      const noH = rh.fitted ? 0 : rows.filter((r) => r.some((c) => c && String(c).trim()) && !(rowH > fs * 1.3)).length;
      const bx = it.borderless ? 0 : 0.5 + 0.75 * noH;
      if (rh.fitted) return rh.reduce((a, x) => a + x.h, 0) + bx;
      // পুরোনো হিসাব অপরিবর্তিত (চিত্র-ঘরের সারিও এখানে "ফাঁকা" গোনা হতো); MATHH চালু থাকলে সারির সমীকরণ-উচ্চতাসহ
      return rows.reduce((a, r) => a + (!r.some((c) => c && String(c).trim()) ? rowH * 0.4 : Math.max(rowH, (it.fontPt || 11) * 1.25 + (mathHOn() ? rowMathExtraPt(r, it.fontPt || 11) : 0))), 0) + bx;
    }
    // a04: Gemini লাইন-বিরতি দেয়নি (১৩ লাইনের অনুচ্ছেদ "১ লাইন") ⇒ উচ্চতা ১৬pt ধরে পরের অংশের আগে ১৮০pt ফাঁক বসত।
    // মাপা লাইন Gemini-র ≥২ গুণ (≥৩) হলে মাপা লাইন-সংখ্যা (textH)
    return textH(it) + ruleExtra(it) + raExtra(it);
  }

  /**
   * Part-17.9: পাতার উল্লম্ব নকশা — প্রতিটি অংশের "আগের ফাঁক" = মূলে ওপর-থেকে-ওপর দূরত্ব − আগের অংশের আউটপুট-উচ্চতা।
   * (আগে কালি-থেকে-কালি ফাঁক + Word-এর লাইন-উচ্চতা ⇒ প্রতি লাইনে বাড়তি জমে পাতা উপচাত/নিচে সরত।)
   * উচ্চতা পাতার চেয়ে বেশি হলে শুধু ফাঁকগুলো আনুপাতিক ছোট (লেখা নয়)।
   */
  /**
   * ২০২৬-১০-১৩: "ঠিক" লাইনে Word কালি বসায় লাইন-শুরুর নিচে — মাপা (qa/golden/ink-offset.mjs, ২৩১ লাইন): ≈০.১২×ফন্ট,
   * লাইন ১.১৫×ফন্টের চেয়ে উঁচু হলে বাড়তির ~৬০% আরও। মূলের মাপা শুরু = কালি-শুরু ⇒ লাইন-শুরু এটুকু ওপরে
   */
  // লাইনের লেখা অনুযায়ী: মাত্রার ওপরের চিহ্ন (ি ী ৈ ৌ ঁ রেফ) থাকলে কালি-শুরু ≈০.১১×ফন্ট, না থাকলে মাত্রা-রেখা ≈০.৩৩×ফন্ট
  // (মাপা: ১৮/১২ ফরমের ২৩০ লাইন; a12-এ চিহ্নহীন লাইন সব ৩pt নিচে ছিল); শুধু লাতিন ≈০.২২ (অনুমান)
  const inkOff = (it) => {
    if (faithfulStudioOn()) it = layoutItem(it);
    if (it.kind !== 'para') return 0;
    const fs = it.fontPt || 12;
    const ls = (it.tabLines && it.tabLines.length) ? it.tabLines : (it.lines && it.lines.length ? it.lines : String(it.text || '').split('\n'));
    const t = String(ls[0] || it.text || '');
    const k = /[িীৈৌঁ]|র্/.test(t) ? 0.11 : /[ঀ-৿]/.test(t) ? 0.33 : /[A-Za-z]/.test(t) ? 0.22 : 0.12;
    const mOff = mathHOn() ? 0.35 * mathLineExtraPt(t, fs, ls.length <= 1 ? it : null) : 0;
    return k * fs + 0.6 * Math.max(0, lineH(it) - 1.15 * fs) + mOff;
  };

  // ২০২৬-১০-১৩: ওপরের ছোট রেখা (layout-ir ruleAbove, স্বাক্ষর-দাগ) — বর্ডার + ফাঁক লেখার আগে; লাইন-শুরু ততটুকু আগে
  const raSpace = (it) => (it.ruleAbove && it.rect ? clamp(Math.round(it.rect.y - inkOff(it) - it.ruleAbove.srcY - it.ruleAbove.sz / 8), 0, 31) : 0);
  const raExtra = (it) => (it.ruleAbove ? raSpace(it) + it.ruleAbove.sz / 8 : 0);
  const lead = (it) => inkOff(it) + raExtra(it);

  function planPage(page) {
    // ২০২৬-১০-১৩: আগের-ফাঁক আসল চলমান অবস্থান (cur) থেকে — আগে আগের অংশের মাপা শুরু থেকে ধরা হতো, ফলে একবার ঠেলা খেলে
    // (আউটপুট-উচ্চতা মূলের ফাঁকের চেয়ে বেশি) বাকি পাতার সব লাইন সেই পরিমাণ নিচে থেকে যেত (a03: +১ → +২.২ → +৬.৭pt)
    let cur = page.margins.top;
    const els = [];
    // পাতার ক্রমে প্রতিটি অংশের মাপা শুরু (গ্রিড = ব্যান্ডের শুরু) — প্রবাহের প্রতিটি অংশ সাধারণত আলাদা ব্যান্ডে, তাই "পরের শুরু" এখান থেকে
    const tops = [];
    page.bands.forEach((b) => (b.kind === 'grid' ? tops.push({ top: b.y0 }) : b.cells[0].items.forEach((x) => tops.push({ it: x, top: x.rect ? x.rect.y : null }))));
    const nextTop = (x) => { const i = tops.findIndex((t) => t.it === x); const n = i >= 0 ? tops[i + 1] : null; return n && n.top != null ? n.top : null; };
    page.bands.forEach((band) => {
      if (band.kind === 'grid') {
        // ব্যান্ডের শুরু = মাপা শুরু, তবে ঘরের প্রথম লেখার লাইন-শুরু (কালি − inkOff) তার আগে হলে সেখান থেকে
        const firsts = band.cells.map((c) => c.items[0]).filter((it) => it && it.rect).map((it) => it.rect.y - lead(it));
        const b0 = Math.min(band.y0, ...firsts);
        const before = Math.max(0, b0 - cur);
        const start = cur + before;
        const cells = band.cells.map((c) => {
          let cy = start; const its = [];
          c.items.forEach((it) => {
            const tgt = it.rect ? it.rect.y - lead(it) : cy;
            const h = itemH(it);
            const bf = Math.max(0, tgt - cy);
            its.push({ it, before: bf, h }); cy += bf + h;
          });
          return { cell: c, its, total: cy - start };
        });
        const h = Math.max(0, ...cells.map((x) => x.total));
        els.push({ band, cells, before, h });
        cur = start + h;
      } else {
        let prevBot = null;
        band.cells[0].items.forEach((it0) => {
          let it = it0;
          const top = it.rect ? it.rect.y : cur;
          let h = itemH(it);
          // a14 (২০২৬-১০-১৩): ছবি (সিল/স্বাক্ষর) মূলে আগের লেখার পাশে, তার সাথে খাড়াভাবে মেশানো ⇒ নিচে সাজালে পাতা উপচাত।
          // মূলের জায়গায় ভাসমান (পাতা-সাপেক্ষ), প্রবাহে প্রায় শূন্য উচ্চতা
          const pb = prevBot; prevBot = it.rect ? Math.max(prevBot || 0, it.rect.y + it.rect.h) : prevBot;
          // a19: নিচের মার্জিনে ঢোকা ছবি (CamScanner লোগো) প্রবাহে পরের পাতায় যেত ⇒ সেটিও ভাসমান
          const inBottom = it.rect && it.rect.y + it.rect.h > page.heightPt - page.margins.bottom - 1;
          if (it.kind === 'figure' && it.rect && ((pb != null && it.rect.y < pb - 4) || inBottom) && it.image && it.image.dataUrl) {
            els.push({ it: Object.assign({}, it, { floatAt: { x: it.rect.x, y: it.rect.y } }), before: 0, h: 1 });
            cur += 1;
            return;
          }
          // f2 (২০২৬-১০-১২): বহু-লাইনের অনুচ্ছেদ পরের অংশের মাপা শুরু পেরোলে (মূলে লাইন ঘন: ৫ লাইন ৪৮pt-এ) পরের সব নামত।
          // লাইন-দূরত্ব মূলের জায়গায় আঁটানো (≥ফন্টের ০.৮৫ — Word-এ কালি কাটে না)
          const nt = it.rect ? nextTop(it0) : null;
          const eqIt = mathHOn() && hasEqItem(it);
          if (it.kind === 'para' && !eqIt && nt != null && nt > top && nt - top < h - 0.5) {
            const n = Math.round(textH(it) / lineH(it)), fs = it.fontPt || 12;
            const isRuleLn = (it.lines || []).length === 1 && /^([─━═=_\-.…·])\1{5,}$/.test(String(it.lines[0] || "").replace(/\s+/g, ""));
          const pitch = n >= 2 ? Math.max(fs * 0.85, (nt - top) / n) : (isRuleLn ? Math.max(6, nt - top) : 0);
            if (pitch && pitch < lineH(it) - 0.1) { it = Object.assign({}, it, { lineSpacingPt: pitch, lineRule: 'exact' }); h = itemH(it); }
          } else if (eqIt && it.kind === 'para' && nt != null && nt > top && nt - top < h - 0.5 && it.lineSpacingPt > (it.fontPt || 12) * 1.25) {
            // সমীকরণ-অনুচ্ছেদে exact নয় (সমীকরণ কেটে যায়); তবে বাড়তি lineSpacingPt থাকলে atLeast রেখেই কমানো
            const fs = it.fontPt || 12, mEx = mathExtraH(it);
            const n = Math.max(1, Math.round((textH(it) - mEx) / lineH(it)));
            const pitch = n >= 2 ? Math.max(fs * 1.15, (nt - top - mEx) / n) : fs * 1.15;
            if (pitch < it.lineSpacingPt - 0.1) { it = Object.assign({}, it, { lineSpacingPt: pitch }); h = itemH(it); }
          }
          const before = it.rect ? Math.max(0, top - lead(it) - cur) : (mathHOn() ? Math.max(0, it.spaceBeforePt || 0) : 0);
          els.push({ it, before, h });
          cur += before + h;
        });
      }
    });
    const avail = page.heightPt - page.margins.top - page.margins.bottom;
    const sumH = els.reduce((a, e) => a + e.h, 0);
    // ২০২৬-১০-১২: আগে মোট > ৯৭% হলেই সব ফাঁক সমান অনুপাতে ছোট হতো (a02 f ০.৮৩৬ ⇒ লেখা ধাপে ধাপে ২০pt ওপরে; ১২/২০ ফরম)।
    // এখন সীমা = মূলের মাপা নিচের মার্জিন (sectPr আরও কম লেখে ⇒ সেই ছাড়টুকুই নিরাপত্তা)। বাড়তি হলে শুধু নিচ থেকে
    // ফাঁক ছোট (প্রতিটি ≤৬০%) — ওপরের লাইনগুলো মূলের জায়গায় থাকে; তাতেও না হলে বাকিটা সমান অনুপাতে
    // ছাড়: ফ্রেমহীন পাতায় ২pt (sectPr নিচের মার্জিন আরও ≥৬pt কম লেখে ⇒ Word-এ বাড়তি ছাড়); ফ্রেমের পাতায় মার্জিন অপরিবর্তিত ⇒ ৮pt
    // (a02: Word-এর ~৩pt সরণে শেষ লাইন পরের পাতায়)। আগে ১২pt ছিল — a15-এর "PDF-এ বাড়তি পাতা" আসলে measure-doc-এর দোষ
    // (মাপের পরে PDF); ১২pt-এ নিচের লাইন অকারণে ২৬pt পর্যন্ত উঠত
    // বাক্স-মোড়কের বর্ডার + শেষের ১pt অনুচ্ছেদ (emitSeq) — ভরা পাতায় এটুকুতেই শেষ লাইন পরের পাতায় যেত (f2)
    // (+৩pt ছাড়: বাক্সের ভেতরের অংশে Word-এর সামান্য বাড়তি উচ্চতা মাপা যায় না)
    // ২০২৬-১০-১৩: emitSeq-এর carry এখন নকশার হিসাবে নির্ভুল ⇒ শুধু বর্ডারের পুরুত্ব (আগে +৩ ও প্রতি বাক্সে +১ ⇒ f2-এর শেষ লাইন অকারণে ওপরে)
    const boxExtra = (page.boxes || []).reduce((a, b) => a + 2 * (b.sz || 6) / 8, 0);
    // ২০২৬-১০-১৩: সীমা = আসল ছাপা-সীমা (sectPr নিচের মার্জিন, তলা ১০pt) − ৬pt, যদি মাপা মার্জিনের সীমার চেয়ে নিচে হয় —
    // f2: মূলের লেখা নিচ থেকে ১৬pt পর্যন্ত ⇒ পুরোনো সীমায় শেষ ৩ লাইন ৭–২১pt ওপরে উঠত
    const mb0 = page.margins.bottom, sectBottom = page.frame ? mb0 : Math.min(mb0, Math.max(10, mb0 - 36));
    // ২০২৬-১০-১৪ (a02): ৩pt ছাড়ে docx শেষ লাইন সীমার ০.৭৫pt ভেতরে, .doc ~১pt নিচে ⇒ ২ পাতা; ছাড় ৬pt (FZ_OFF=LIM6)
    // [Rule FB0B: FZ_OFF=FORMFIX / FZ_OFF=FB0B] বর্ডার-ফ্রেমযুক্ত পাতায় (page.frame, যেমন a02) নিচের মার্জিনের আগে ১৬pt নিরাপত্তা-ছাড় রাখা যাতে আসল Word/.doc-এ শেষ লাইন ২য় পাতায় না যায়।
    const framePad = (fzOn('FORMFIX') && !globalThis.__FZ_OFF_FB0B) ? 16 : 6;
    const lim = page.frame
      ? page.heightPt - mb0 - framePad
      : Math.max(page.heightPt - mb0 - 2, page.heightPt - sectBottom - (globalThis.__FZ_OFF_LIM6 ? 3 : 6));
    let need = page.margins.top + els.reduce((a, e) => a + e.before, 0) + sumH + boxExtra - lim;
    if (globalThis.__FZ_ON_TXTTFREV && !globalThis.__FZ_OFF_TXTTF && need > 0) {
      els.forEach((e) => {
        if (e.it && e.it.kind === "table" && e.it._fontBase && e.it.fontPt > e.it._fontBase) {
          const oldH = e.h;
          e.it = Object.assign({}, e.it, { fontPt: e.it._fontBase });
          e.h = itemH(e.it);
          need -= (oldH - e.h);
        }
      });
    }
    const rawBefore = mathHOn() ? els.map((e) => e.before) : null;
    const maxCutRatio = mathHOn() ? 0.75 : 0.6;
    for (let k = els.length - 1; k >= 0 && need > 0; k--) {
      const cut = Math.min(els[k].before * maxCutRatio, need);
      els[k].before -= cut; need -= cut;
    }
    const sumB = els.reduce((a, e) => a + e.before, 0);
    let f = need > 0 && sumB > 0 ? Math.max(0, (sumB - need) / sumB) : 1;
    // a04: স্ক্যান-পাতার টেবিল কাগজের কিনারা পর্যন্ত ⇒ ফাঁক শূন্য করেও লেখা+টেবিল পাতার চেয়ে লম্বা (শেষ সারি পরের পাতায়,
    // বাকি সব পাতা এক ঘর সরে)। তখন পাতার সরাসরি টেবিলগুলোর মাপা উচ্চতা আনুপাতিক ছোট (≥৮০%; সারি "অন্তত" ⇒ লেখা কাটে না)।
    // অনুমিত উচ্চতা ছাড়াও মাপা অবস্থান দেখা হয়: টেবিলের নিচ ছাপা-সীমা (+৫% ছাড়) পেরোলে যতটুকু বেশি ততটুকু ছোট
    // (২%-এ Word-মাপে আঁটত, কিন্তু PDF-রপ্তানির পুনর্বিন্যাসে শেষ সারি পরের পাতায় যেত — a04)
    const tabs = els.filter((e) => e.it && e.it.kind === 'table' && e.it.heightPt);
    const tabH = tabs.reduce((a, e) => a + e.h, 0);
    const limit = page.heightPt - page.margins.bottom - avail * 0.05;
    // ২০২৬-১০-১৩: শুধু যখন নকশার লেখাও আসল ছাপা-সীমার (sectPr নিচের মার্জিন) ৫%-এর মধ্যে — a03 পাতা-২-এ শেষ টেবিল
    // মূলেই নিচে (৭৭৫), অথচ নকশা ৪৪pt ছাড়ে ⇒ সব টেবিল ছোট হয়ে নিচের লাইনগুলো ১০pt ওপরে উঠত
    const realLimit = page.heightPt - sectBottom;
    const planEnd = page.margins.top + els.reduce((a, e) => a + e.before, 0) + sumH + boxExtra;
    // ২০২৬-১০-১৪ (a10): নকশা-শেষ সীমার ২১pt ভেতরে (৭৬১ বনাম ৭৮২) অথচ ৫%-ছাড়ে টেবিল ৯৭.৫% ⇒ পাতা-১ ৪৬ (ছোট না করলে ৭৪, উপচায় না)।
    // ছাড় ৮pt (FZ_OFF=OVER8 ⇒ পুরোনো ৫%); a18 (৭৭৭ বনাম ৭৬০) আগের মতোই ছোট হয়
    let over = planEnd < realLimit - (globalThis.__FZ_OFF_OVER8 ? avail * 0.05 : 8) ? 0 : Math.max(0, ...tabs.filter((e) => e.it.rect).map((e) => e.it.rect.y + e.it.rect.h - limit));
    // a18: Word-মাপে ১২pt ছাড়ে আঁটলেও PDF-রপ্তানির পুনর্বিন্যাসে শেষ লাইন পরের পাতায় ⇒ টেবিল-সংকোচনের লক্ষ্য ৯৪%
    // ২০২৬-১০-১৪: সব টেবিলের সারি-উচ্চতা মাপা লাইন থেকে (layout-ir হুবহু ধরন) ⇒ অনুমান-ভুলের ঝুঁকি কম, লক্ষ্য ৯৮.৫% (FZ_OFF=TFIT98)
    const allMeasured = tabs.length && tabs.every((e) => Array.isArray(e.it.rowHeightsPt) && e.it.rowHeightsExact);
    const gfOrForm = !!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_FB0C && tabs.some((e) => e.it.gridFirst));
    if (allMeasured) over = Math.max(0, planEnd - (realLimit - (gfOrForm ? 2 : 6)));
    // ২০২৬-১০-১৪: ৯৪% ⇒ ৯৭% (f1 +১.৭, a07 +২.২, a18 +০.২; a03/a10/a16/a17 অপরিবর্তিত, পাতা উপচায়নি) — FZ_OFF=TFIT97
    const tTarget = allMeasured ? sumH - over : avail * (allMeasured && !globalThis.__FZ_OFF_TFIT98 ? 0.985 : !globalThis.__FZ_OFF_TFIT97 ? 0.97 : 0.94);
    if (globalThis.__FZ_PLANLOG) globalThis.__FZ_PLANLOG.push({ avail, sumH, tabH, tTarget, over, planEnd, realLimit, limit, mTop: page.margins.top, mBot: page.margins.bottom, H: page.heightPt });
    if (!globalThis.__FZ_OFF_TSHRINK && ((sumH > tTarget && !globalThis.__FZ_ON_TSHRINKOVER) || over > 0) && tabH) {
      const s = Math.max(0.8, Math.min(1, (tTarget - (sumH - tabH)) / tabH, 1 - over / tabH));
      if (s < 1) tabs.forEach((e) => { e.it = Object.assign({}, e.it, { heightPt: e.it.heightPt * s }); e.h *= s; });
    }
    if (mathHOn()) {
      // পাতা-পরিকল্পনা: সমীকরণের বাড়তি উচ্চতাসহ পাতায় আঁটানো (ফাঁক কমানো সর্বোচ্চ ৭৫%); এক পাতার ধারণক্ষমতা ছাড়ালে সঠিক আইটেম-সীমায় পাতা ভাঙা
      const curSumH = els.reduce((a, e) => a + e.h, 0);
      const cap = Math.max(120, lim - page.margins.top - boxExtra);
      if (curSumH <= cap + 4) {
        f = 1;
      } else {
        // এক পাতার ধারণক্ষমতার বেশি বিষয়বস্তু ⇒ প্রতিটি পাতায় যতটা ধরে বসিয়ে সঠিক স্থানে পাতা-ভাঙন (ফাঁক কমানো সর্বোচ্চ ৭৫%)
        let pUsed = 0, chunkStart = 0;
        for (let i = 0; i < els.length; i++) {
          els[i].before = rawBefore[i];
          const bMin = i === chunkStart ? 0 : els[i].before * 0.25;
          if (i > chunkStart && pUsed + bMin + els[i].h > cap) {
            let cNeed = Math.max(0, els.slice(chunkStart, i).reduce((a, x) => a + x.before + x.h, 0) - cap);
            for (let k = i - 1; k >= chunkStart && cNeed > 0; k--) {
              const cut = Math.min(els[k].before * 0.75, cNeed);
              els[k].before -= cut; cNeed -= cut;
            }
            els[i].pageBreak = true;
            els[i].before = 0;
            if (els[i].it) els[i].it = Object.assign({}, els[i].it, { pageBreakBefore: true });
            else if (els[i].band) els[i].band = Object.assign({}, els[i].band, { pageBreakBefore: true });
            chunkStart = i;
            pUsed = els[i].h;
          } else {
            pUsed += (i === chunkStart ? 0 : els[i].before) + els[i].h;
          }
        }
        // শেষ খণ্ডের ফাঁক সমন্বয় (সর্বোচ্চ ৭৫% কমানো)
        let lastNeed = Math.max(0, els.slice(chunkStart).reduce((a, x) => a + x.before + x.h, 0) - cap);
        for (let k = els.length - 1; k >= chunkStart && lastNeed > 0; k--) {
          const cut = Math.min(els[k].before * 0.75, lastNeed);
          els[k].before -= cut; lastNeed -= cut;
        }
        f = 1;
      }
    }
    return { els, f };
  }

  function enterGapXml(pt) {
    if (!pt || pt < 1.5) return '';
    let xml = '';
    let rem = pt;
    while (rem >= 14) {
      xml += '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t></w:t></w:r></w:p>';
      rem -= 14;
    }
    if (rem >= 1.5) {
      const szVal = Math.max(2, Math.min(24, Math.round((rem / 1.2) * 2)));
      xml += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:rPr><w:sz w:val="${szVal}"/><w:szCs w:val="${szVal}"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="${szVal}"/><w:szCs w:val="${szVal}"/></w:rPr><w:t></w:t></w:r></w:p>`;
    }
    return xml;
  }

  function pPr(item, extraBeforePt, sectPrXml) {
    if (faithfulStudioOn()) item = layoutItem(item);
    const totalBefore = (item.spaceBeforePt || 0) + (extraBeforePt || 0);
    const useEnter = !globalThis.__FZ_OFF_ENTERGAP && (globalThis.__FZ_ON_ENTERGAP || mathHOn() || (typeof process !== 'undefined' && process.env.FZ_ON && process.env.FZ_ON.includes('ENTERGAP')));
    const before = useEnter || (mathHOn() && item.pageBreakBefore) ? 0 : tw(totalBefore);
    const fs = item.fontPt || 12;
    // সমীকরণ থাকলে Word-এ exact লাইনে উপর-নিচ কেটে যায় ⇒ atLeast বা auto
    const hasEq = !globalThis.__FZ_OFF_EQCLIP && (
      /(\$|\\frac|\\sqrt|\\sum|\\int|⟦eq|[\u2200-\u22FF])/.test(String(item.text || ''))
      || (item.lines && item.lines.some((l) => /(\$|\\frac|\\sqrt|\\sum|\\int|⟦eq|[\u2200-\u22FF])/.test(l)))
      || !!item.hasEquation
      || (mathHOn() && hasEqItem(item))
    );
    // লাইন-দূরত্ব: মাপা দূরত্ব সাধারণ (≈১.২×ফন্ট)-এর চেয়ে বেশি হলে "অন্তত" সেই দূরত্ব (কাটা পড়ার ঝুঁকি নেই)
    // Part-17.8/17.9: লেখার অনুচ্ছেদে "ঠিক" লাইন-উচ্চতা (lineH) — উচ্চতা অনুমানযোগ্য, পাতার হিসাব মেলে
    const exactPt = !hasEq && item.kind === 'para' && item.lineRule !== 'auto' ? lineH(item) : 0;
    const line = hasEq
      ? (item.lineSpacingPt && item.lineSpacingPt > fs * 1.3 ? `w:line="${tw(item.lineSpacingPt)}" w:lineRule="atLeast"` : 'w:line="240" w:lineRule="auto"')
      : (exactPt ? `w:line="${tw(exactPt)}" w:lineRule="exact"`
        : (item.lineSpacingPt && item.lineSpacingPt > fs * 1.3 && item.lineSpacingPt < fs * 3
          ? `w:line="${tw(item.lineSpacingPt)}" w:lineRule="atLeast"` : 'w:line="240" w:lineRule="auto"'));
    let ind = '';
    if (item.align === 'c' && item.centerShiftPt != null) {
      // Part-17.7: মাঝে-বসানো — কেন্দ্র মূলের কেন্দ্রে (এক পাশে দ্বিগুণ ইনডেন্ট)
      const sh = item.centerShiftPt;
      if (Math.abs(sh) >= 2) ind = sh > 0 ? `<w:ind w:left="${tw(sh * 2)}"/>` : `<w:ind w:right="${tw(-sh * 2)}"/>`;
    } else if (item.align === 'r' && item.rightIndentPt != null) {
      if (item.rightIndentPt >= 2) ind = `<w:ind w:right="${tw(item.rightIndentPt)}"/>`;
    } else if (item.indentPt || item.firstIndentPt || item.justRightPt >= 2) {
      const fi = item.firstIndentPt || 0;
      // ২০২৬-১০-১৩: দুপাশে-সমান লেখার ডান-প্রান্ত মূলের মাপে (justRightPt) — নইলে Word মার্জিন পর্যন্ত টেনে ৩০pt বেশি চওড়া (a13)
      const jr = item.align === 'j' && item.justRightPt >= 2 ? ` w:right="${tw(item.justRightPt)}"` : '';
      ind = `<w:ind w:left="${tw((item.indentPt || 0) + (fi < 0 ? -fi : 0))}"${jr}${fi > 0 ? ` w:firstLine="${tw(fi)}"` : (fi < 0 ? ` w:hanging="${tw(-fi)}"` : '')}/>`;
    }
    // Part-17.8 + B4: মাপা ট্যাব-অবস্থান (বাঁ/ডান/মাঝ ও লিডার সমর্থনসহ)
    const fmtTabStop = (x) => {
      if (formKitOn() && x && typeof x === 'object') {
        const pos = x.pos != null ? x.pos : (x.x != null ? x.x : 0);
        const val = x.val || (x.align === 'r' || x.type === 'right' ? 'right' : (x.align === 'c' || x.type === 'center' ? 'center' : 'left'));
        const ldr = x.leader ? ` w:leader="${x.leader}"` : '';
        return `<w:tab w:val="${val}"${ldr} w:pos="${tw(pos)}"/>`;
      }
      return `<w:tab w:val="left" w:pos="${tw(x)}"/>`;
    };
    const tabs = item.tabLines && item.tabStops && item.tabStops.length
      ? '<w:tabs>' + item.tabStops.map(fmtTabStop).join('') + '</w:tabs>' : '';
    // হাতে-ভাঙা লাইনে "দুপাশে সমান" দিলে Word লাইনগুলো টেনে ছড়ায় ⇒ বাঁয়ে
    const jc = item.align === 'j' && item.keepLines && !item.keepJust && item.lines && item.lines.length > 1 ? 'left' : (JC[item.align] || 'left');
    // g41 + B9: অনুচ্ছেদ-ছায়া (ধূসর/রঙিন পটি, shade বা fill) — স্কিমা-ক্রমে tabs-এর আগে
    const pShadeVal = formKitOn() ? normHex(item.fill || item.shade) : item.shade;
    const shd = pShadeVal && !item.shadeRun && /^[0-9A-F]{6}$/i.test(pShadeVal) ? `<w:shd w:val="clear" w:color="auto" w:fill="${pShadeVal}"/>` : '';
    // নিচের-দাগ: bottom + between একই (পাশাপাশি একই-বর্ডারের অনুচ্ছেদ Word এক দল ধরে শুধু শেষে bottom আঁকে)
    const rbVal = formKitOn() && item.ruleBelow ? (item.ruleBelow.dashDot || item.ruleBelow.style === 'dotDash' || item.ruleBelow.style === 'dashDot' ? 'dotDash' : (item.ruleBelow.dashed || item.ruleBelow.style === 'dashed' ? 'dashed' : 'single')) : 'single';
    const raVal = formKitOn() && item.ruleAbove ? (item.ruleAbove.dashDot || item.ruleAbove.style === 'dotDash' || item.ruleAbove.style === 'dashDot' ? 'dotDash' : (item.ruleAbove.dashed || item.ruleAbove.style === 'dashed' ? 'dashed' : 'single')) : 'single';
    const rb = item.ruleBelow ? `w:val="${rbVal}" w:sz="${item.ruleBelow.sz || 6}" w:space="${ruleSpace(item)}" w:color="${(formKitOn() && normHex(item.ruleBelow.color)) || '000000'}"` : '';
    const ra = item.ruleAbove ? `<w:top w:val="${raVal}" w:sz="${item.ruleAbove.sz || 6}" w:space="${raSpace(item)}" w:color="${(formKitOn() && normHex(item.ruleAbove.color)) || '000000'}"/>` : '';
    const bdr = rb || ra ? `<w:pBdr>${ra}${rb ? `<w:bottom ${rb}/><w:between ${rb}/>` : ''}</w:pBdr>` : '';
    // ওপরের ছোট রেখা ⇒ অনুচ্ছেদের প্রস্থ = রেখার প্রস্থ (মাঝে-বসানো লেখা রেখার মাঝে)
    if (item.ruleAbove) ind = `<w:ind w:left="${tw(item.ruleAbove.indL)}" w:right="${tw(item.ruleAbove.indR)}"/>`;
    const pb = mathHOn() && item.pageBreakBefore ? '<w:pageBreakBefore/>' : '';
    return `<w:pPr>${sectPrXml || ''}${pb}${bdr}${shd}${tabs}<w:spacing w:before="${before}" w:after="0" ${line}/>${ind}<w:jc w:val="${jc}"/></w:pPr>`;
  }

  function paraXml(item, extraBeforePt, ctx) {
    if (faithfulStudioOn()) item = syncEditedTextFields(item);
    if (item.kind === 'figure') {
      const img = item.image;
      if (!img || !img.dataUrl) return `<w:p>${pPr(Object.assign({}, item, { align: 'l' }), extraBeforePt)}</w:p>`;
      const id = ctx.media.length + 1;
      const ext = /image\/jpe?g/.test(img.dataUrl) ? 'jpeg' : 'png';
      ctx.media.push({ name: `fimg${id}.${ext}`, data: img.dataUrl.split(',')[1], rid: `rIdFimg${id}` });
      const wPt = item.widthPt || (img.pxW ? img.pxW * 0.75 : 100);
      const hPt = item.heightPt || (img.pxH && img.pxW ? wPt * img.pxH / img.pxW : wPt);
      // a14: ভাসমান ছবি (planPage floatAt) — পাতা-সাপেক্ষ মূলের অবস্থানে, লেখা ঠেলে না (wrapNone)
      const fa = item.floatAt;
      const open = fa
        ? `<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${emu(fa.x)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${emu(fa.y)}</wp:posOffset></wp:positionV><wp:extent cx="${emu(wPt)}" cy="${emu(hPt)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>`
        : `<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${emu(wPt)}" cy="${emu(hPt)}"/>`;
      // ২০২৬-১০-১৪ (2.pdf লোগো): "ঠিক" লাইনে Word নিচে ডিফল্ট ফন্টের নিম্নাংশ রাখে ⇒ ছবির ওপর ~১৫% কাটা ("BRMS" হারাত)।
      // ছবির রান ও অনুচ্ছেদ-চিহ্নের ফন্ট খুদে (১pt) ⇒ নিম্নাংশ প্রায় শূন্য, পুরো ছবি লাইনে। বন্ধ: FZ_OFF=FIGCLIP
      const tiny = globalThis.__FZ_OFF_FIGCLIP || fa ? '' : '<w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>';
      const drawing = `<w:r>${tiny}<w:drawing>${open}<wp:docPr id="${1000 + id}" name="fig${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${1000 + id}" name="fig${id}.${ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdFimg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(wPt)}" cy="${emu(hPt)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>${fa ? '</wp:anchor>' : '</wp:inline>'}</w:drawing></w:r>`;
      // ২০২৬-১০-১২: "auto" লাইনে Word ছবির নিচে অনুচ্ছেদ-ফন্টের নিম্নাংশ যোগ করত (লোগোর পরে সব ~৯pt নিচে, a02/a13)।
      // উচ্চতা = ছবি + ২pt (planPage-এর itemH-এর সমান), "ঠিক" লাইন
      const fp = pPr(Object.assign({}, item, { align: 'l', firstIndentPt: 0 }), extraBeforePt)
        // "ঠিক" লাইনে Word বেসলাইন লাইনের ~৮০%-এ বসায় (ফন্ট যত ছোটই হোক) ⇒ ছবির ওপর কাটা; খুদে ফন্টে "অন্তত" ⇒ উচ্চতা ≈ ছবি
        .replace(/w:line="\d+" w:lineRule="\w+"/, `w:line="${tw(fa ? 1 : hPt + 2)}" w:lineRule="${tiny ? 'atLeast' : 'exact'}"`)
        .replace(/<\/w:pPr>$/, tiny + '</w:pPr>');
      return `<w:p>${fp}${drawing}</w:p>`;
    }
    if (item.kind === 'table') return tableXml(item, extraBeforePt, ctx);
    if (formKitOn()) {
      // ১) সংখ্যা-বাক্সের সারি (যেমন ০১ + ১১ ঘর, NID-এর ১৭ ঘর)
      const ib = !item.boxes && !item.boxCount && item.kind !== 'box_row' && item.type !== 'box_row'
        ? parseInlineBoxes(item.text || (item.lines && item.lines[0]) || '')
        : null;
      if (item.kind === 'box_row' || item.type === 'box_row' || Array.isArray(item.boxes) || item.boxCount > 0 || ib || String(item.text || '').startsWith(BOX_MARK)) {
        let cells;
        if (Array.isArray(item.boxes)) {
          cells = item.boxes.map((c) => String(c == null ? '' : c));
        } else if (item.boxCount > 0) {
          const pre = item.prefix != null ? String(item.prefix).split('') : [];
          const rem = Math.max(0, item.boxCount - pre.length);
          cells = pre.concat(Array(rem).fill(''));
        } else if (String(item.text || '').startsWith(BOX_MARK)) {
          cells = String(item.text).slice(BOX_MARK.length).split(BOX_SEP);
        } else if (ib) {
          cells = ib.cells;
        } else {
          cells = String(item.text || '').split(/\s*\|\s*|\s+/).filter(Boolean);
        }
        const lab = item.label != null ? String(item.label) : (ib && ib.label ? ib.label : '');
        const avW = (item.widthPt || (item.rect && item.rect.w) || (ctx && ctx.availW) || 420);
        if (lab) {
          return tableXml({
            kind: 'table', borderless: true, widthPt: avW, spaceBeforePt: item.spaceBeforePt || 0,
            fontPt: item.fontPt || 11, colFractions: [0.35, 0.65], colAligns: ['l', 'l'],
            rows: [[lab, BOX_MARK + cells.join(BOX_SEP)]]
          }, extraBeforePt, ctx);
        }
        return spacer((item.spaceBeforePt || 0) + (extraBeforePt || 0)) +
          boxRowXml(cells, avW).replace(/<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"\/><\/w:pPr><\/w:p>$/, '');
      }
      // ২) দুই কলামে স্বাক্ষরের ড্যাশ-রেখা (B9.4)
      const sigCols = Array.isArray(item.signatures) ? item.signatures
        : (item.kind === 'signature_row' && Array.isArray(item.columns) ? item.columns
        : (item.type === 'signature' && Array.isArray(item.columns) ? item.columns : null));
      const rawSigLines = (item.lines && item.lines.length ? item.lines : String(item.text || '').split('\n')).map((l) => String(l || '').trim()).filter(Boolean);
      const cleanSigLines = rawSigLines.filter((l) => !/^[-─_]{3,}(?:\s+[-─_]{3,})*$/.test(l));
      const autoTwoColSig = !sigCols && (item.type === 'signature' || item.kind === 'signature_row')
        && cleanSigLines.length === 1 && /\t|\s{3,}/.test(cleanSigLines[0])
        ? cleanSigLines[0].split(/\t|\s{3,}/).map((s) => s.trim()).filter(Boolean)
        : null;
      const finalSigCols = sigCols || (autoTwoColSig && autoTwoColSig.length >= 2 ? autoTwoColSig : null);
      if (finalSigCols && finalSigCols.length >= 2) {
        const avW = (ctx && ctx.availW) || (item.rect && item.rect.w) || 450;
        const nS = finalSigCols.length, colW = avW / nS;
        const cells = finalSigCols.map((sc, idx) => {
          const sTxt = typeof sc === 'object' ? (sc.text || sc.label || '') : String(sc || '');
          const sLines = sTxt.split('\n').map((l) => l.trim()).filter((l) => l && !/^[-─_]{3,}$/.test(l));
          const lbl = sLines.join('\n') || 'স্বাক্ষর';
          return {
            x0: idx * colW, x1: (idx + 1) * colW,
            items: [{
              kind: 'para', type: 'signature', text: lbl, lines: sLines.length ? sLines : [lbl], keepLines: sLines.length > 1,
              fontPt: item.fontPt || 11, bold: !!item.bold, align: 'c',
              ruleAbove: { sz: 6, dashed: true, indL: 12, indR: 12 }
            }]
          };
        });
        return gridXml({ kind: 'grid', gapBeforePt: (item.spaceBeforePt || 0) + (extraBeforePt || 0), cells }, Object.assign({}, ctx || {}, { boxes: [] }));
      }
      if (item.type === 'signature' && !item.ruleAbove && (item.dashed || rawSigLines.length > cleanSigLines.length) && cleanSigLines.length) {
        item = Object.assign({}, item, {
          text: cleanSigLines.join('\n'), lines: cleanSigLines, align: 'c',
          ruleAbove: { sz: 6, dashed: true, indL: item.indentPt || 12, indR: item.rightIndentPt || 12 }
        });
      }
      // ৩) ড্যাশ/ড্যাশ-ডট বর্ডারের বক্স, খালি "ছবি"-বাক্স, ডানে বসানো লেবেল-বাক্স ("ফরম-৮"), মাঝের ছোট "তফসিল" বাক্স
      const inPageBoxes = !!(item.boxIds && item.boxIds.length && ctx && Array.isArray(ctx.boxes) && ctx.boxes.length);
      const rawTxt0 = (item.lines && item.lines.length ? item.lines.join(' ') : String(item.text || '')).trim();
      const isPhotoBox = !!(item.kind === 'photo_box' || item.type === 'photo_box' || item.photoBox || (item.boxed && /^(?:পাসপোর্ট\s*সাইজ(?:ের)?\s*)?(?:ছবি|ফটো|Photo|১\s*কপি\s*ছবি)?$/i.test(rawTxt0)));
      const isLabelBox = !!(item.kind === 'label_box' || item.type === 'label_box' || item.labelBox || ((item.boxed || item.type === 'form_box' || item.borderStyle || item.dashed || item.dashDot) && /^(?:ফরম|ফর্ম|Form)\s*[-–—:নং#]*\s*[০-৯0-9ক-হA-Za-z-]+$/i.test(rawTxt0)));
      const isScheduleBox = !!(item.kind === 'schedule_box' || item.type === 'schedule_box' || item.scheduleBox || ((item.boxed || item.type === 'form_box' || item.borderStyle || item.dashed || item.dashDot) && /^তফসিল(?:\s*পরিচয়|\s*বিবরণ)?$/.test(rawTxt0)));
      const hasBoxBorder = !!(item.kind === 'box' || item.type === 'form_box' || item.boxed || item.borderStyle || item.dashed || item.dashDot || isPhotoBox || isLabelBox || isScheduleBox);
      if (hasBoxBorder && !inPageBoxes && !item._insideBoxRender) {
        const avW = (ctx && ctx.availW) || 450;
        const bStyle = item.dashDot || item.borderStyle === 'dotDash' || item.borderStyle === 'dashDot' || item.borderStyle === 'dash-dot'
          ? 'dotDash'
          : (item.dashed || item.borderStyle === 'dashed' ? 'dashed' : (item.borderStyle || 'single'));
        let wPt = item.widthPt || (item.rect && item.rect.w) || (isPhotoBox ? 85 : isLabelBox ? 72 : isScheduleBox ? 90 : Math.min(avW, 240));
        let hPt = item.heightPt || (item.rect && item.rect.h) || (isPhotoBox ? 105 : 0);
        let x0 = item.rect && item.rect.x != null ? item.rect.x : (isLabelBox || item.align === 'r' ? Math.max(0, avW - wPt) : (isScheduleBox || item.align === 'c' ? Math.max(0, (avW - wPt) / 2) : (item.indentPt || 0)));
        const innerItem = Object.assign({}, item, {
          _insideBoxRender: true, kind: 'para',
          text: isPhotoBox && !rawTxt0 ? 'ছবি' : (item.text || ''),
          lines: isPhotoBox && (!item.lines || !item.lines.length) ? [rawTxt0 || 'ছবি'] : item.lines,
          align: (isPhotoBox || isLabelBox || isScheduleBox) ? 'c' : (item.align || 'l'),
          indentPt: 0, rightIndentPt: 0, centerShiftPt: null, spaceBeforePt: 0, fill: null, shade: null
        });
        const innerXml = paraXml(innerItem, 0, ctx);
        const boxDesc = {
          x0, x1: x0 + wPt, sz: (bStyle === 'dashed' || bStyle === 'dotDash') ? 4 : (item.borderSz || 6),
          dashed: bStyle === 'dashed', dashDot: bStyle === 'dotDash', style: bStyle,
          fill: normHex(item.fill || item.shade), heightPt: hPt > 0 ? hPt : null, vAlign: isPhotoBox || isLabelBox || isScheduleBox ? 'center' : null
        };
        return spacer((item.spaceBeforePt || 0) + (extraBeforePt || 0)) + boxTableXml(boxDesc, innerXml, 0);
      }
      // ৪) রেডিও-তালিকা (options বা radio ক্ষেত্র থাকলে ○ চিহ্নসহ লাইন)
      if (Array.isArray(item.options) || Array.isArray(item.radio)) {
        const opts = (item.options || item.radio).map((o) => {
          const s = String(o || '').trim().replace(/^\(\s*\)\s*/, '○ ').replace(/^\(\s*[•*]\s*\)\s*/, '● ');
          return /^[○●◯◉]/.test(s) ? s : '○ ' + s;
        });
        item = Object.assign({}, item, { text: opts.join('\n'), lines: opts, keepLines: true, align: 'l', options: null, radio: null });
      }
      // ৫) B4 ট্যাব-কলাম: MCQ-বিকল্প, লাইনের শেষের নম্বর ডান-ট্যাবে, "দাগ টেনে মিল কর" কলাম
      const avW = (ctx && ctx.availW) || (item.rect && item.rect.w) || 450;
      const curLines = item.lines && item.lines.length ? item.lines : (item.text ? String(item.text).split('\n') : []);
      if ((!item.tabLines || !item.tabLines.length) && curLines.length) {
        if (item.type === 'option_row' || curLines.some((l) => (String(l).match(MCQ_TEST_RE) || []).length >= 2)) {
          const mcq = tabifyMcqBuilder(curLines, item.lineSegs, avW, item.indentPt || 0);
          if (mcq) {
            item = Object.assign({}, item, {
              tabLines: mcq.lines,
              tabStops: (item.tabStops && item.tabStops.length) ? item.tabStops : (item.optionStops || mcq.stops),
              align: 'l', keepLines: mcq.lines.length > 1
            });
          }
        } else if (item.type === 'match_col' || item.matchCols) {
          const stopPos = (item.tabStops && item.tabStops[0]) || item.colStopPt || Math.round(avW * 0.65);
          const mLines = curLines.map((l) => {
            const sp = String(l).trim().split(/\t|\s{2,}|\s+/);
            return sp.length >= 2 ? sp[0] + '\t' + sp.slice(1).join(' ') : l;
          });
          item = Object.assign({}, item, { tabLines: mLines, tabStops: [stopPos], align: 'l', keepLines: true });
        } else {
          const rPos = item.rightTabPos || item.rightTabPt || ((item.indentPt || 0) + ((item.rect && item.rect.w > 40) ? item.rect.w : avW));
          if (item.marks != null || item.trailingNumber != null) {
            const mkStr = String(item.marks != null ? item.marks : item.trailingNumber);
            const tLines = curLines.map((l, idx) => (idx === curLines.length - 1 ? String(l).replace(/\s+$/, '') + '\t' + mkStr : l));
            item = Object.assign({}, item, { tabLines: tLines, tabStops: [{ pos: rPos, val: 'right' }], align: 'l' });
          } else {
            let hitR = false;
            const tLines = curLines.map((l) => {
              let m = TRAIL_MARK_RE.exec(String(l));
              if (!m && (item.type === 'question' || item.rightTab)) m = Q_TRAIL_MARK_RE.exec(String(l));
              if (!m) return l;
              hitR = true;
              return m[1].trimEnd() + '\t' + m[2].trim();
            });
            if (hitR) {
              item = Object.assign({}, item, { tabLines: tLines, tabStops: [{ pos: rPos, val: 'right' }], align: 'l' });
            }
          }
        }
      } else if (item.tabLines && item.tabLines.length && item.tabStops && item.tabStops.length) {
        // ইতিমধ্যে tabLines থাকলে এবং শেষ অংশ নম্বর/মান হলে বা rightTab থাকলে শেষ স্টপটি ডান-ট্যাবে রূপান্তর
        const allEndNum = item.rightTab || item.tabLines.every((l) => {
          const ps = String(l).split('\t');
          return ps.length >= 2 && /^(\(?[০-৯0-9]+(?:\.[০-৯0-9]+)?(?:\s*[×*xX]\s*[০-৯0-9]+\s*=\s*[০-৯0-9]+)?\)?|\[[০-৯0-9]+\])$/.test(ps[ps.length - 1].trim());
        });
        if (allEndNum && item.type !== 'match_col' && !item.matchCols) {
          const newStops = item.tabStops.slice();
          const lastSt = newStops[newStops.length - 1];
          if (typeof lastSt === 'number') newStops[newStops.length - 1] = { pos: lastSt, val: 'right' };
          item = Object.assign({}, item, { tabStops: newStops });
        }
      }
      // B4: পাশের ছোট লেবেল (noWrap) যেন কখনো দুই লাইনে না ভাঙে (অভ্যন্তরীণ স্পেসকে non-breaking space-এ রূপান্তর)
      if (item.noWrap && !item.tabLines && String(item.text || '').trim().length <= 28) {
        const nb = (s) => String(s || '').replace(/ /g, '\u00A0');
        item = Object.assign({}, item, { text: nb(item.text), lines: item.lines ? item.lines.map(nb) : item.lines });
      }
    }
    // ২০২৬-১০-১৪ (a17 p4): docx-to-doc নিচে-বর্ডারের w:space পড়ে না (সবসময় ১pt) ⇒ .doc-এ মূলের ~২৩pt দূরের দাগ লেখার গায়ে।
    // ফাঁক ≥৪pt ⇒ লেখা বর্ডারহীন + ফাঁকের সমান "ঠিক" উচ্চতার অনুচ্ছেদ যার নিচে দাগ (পুরো লেখা-প্রস্থে)। বন্ধ: FZ_OFF=RULEGAP
    // a16 p1: ডানে/মাঝে/ইনডেন্টের অনুচ্ছেদে বর্ডার শুধু অনুচ্ছেদের প্রস্থে (মূলের পুরো-প্রস্থ দাগ "om2@…"-এর নিচে ছোট) ⇒ ফাঁক ছোট হলেও আলাদা
    const narrowP = item.align === 'r' || item.align === 'c' || (item.indentPt || 0) > 2;
    if (item.ruleBelow && !globalThis.__FZ_OFF_RULEGAP && (ruleSpace(item) >= 4 || narrowP)
      && !(item.tabLines || item.lines || []).every((l) => /^([─━═=_\-.…·])\1{5,}$/.test(String(l).replace(/\s+/g, '')))) {
      const sp = ruleSpace(item), rb = `w:val="single" w:sz="${item.ruleBelow.sz}" w:space="0" w:color="000000"`;
      return paraXml(Object.assign({}, item, { ruleBelow: null }), extraBeforePt, ctx) +
        `<w:p><w:pPr><w:pBdr><w:bottom ${rb}/></w:pBdr><w:spacing w:before="0" w:after="0" w:line="${tw(Math.max(1, sp - 1))}" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r></w:p>`;
    }
    if (item.rect && item.rect.w > 0 && !item._dotChecked) item = stripGhostDots(item);
    const TAB = '<w:r><w:tab/></w:r>';
    // ২০২৬-১০-১৩: লিডার-বিন্দু ট্যাব-রানের ফরম্যাট নেয় — ফরম্যাটহীন রানে বিন্দু খুদে ও ধূসর (f2: মূলের কালো বিন্দু-রেখা হারিয়ে
    // লাইনের ডান-প্রান্ত ৪০০pt ছোট দেখাত) ⇒ লেখার মাপে, মোটা
    // ২০২৬-১০-১৪ (মালিক: বিন্দু মূলে চিকন) ⇒ মোটা শুধু FZ_ON=DOTBOLD-এ; আকার আগের মতো লেখার সমান
    const LTAB = `<w:r><w:rPr>${globalThis.__FZ_ON_DOTBOLD || item.bold ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${Math.round((item.fontPt || 12) * 2)}"/><w:szCs w:val="${Math.round((item.fontPt || 12) * 2)}"/></w:rPr><w:tab/></w:r>`;
    // B9/B5 (২০২৬-১০-১১): এক-লাইনের "লেবেল: ........" — শেষের বিন্দু-সারি মূলের মাপা ডান-প্রান্ত পর্যন্ত dot-leader ট্যাবে
    // (Gemini-র গোনা বিন্দু বেশি হলে লাইন ভাঙত, কম হলে ছোট হতো; ট্যাব-স্টপ ঘর/মার্জিনের বাইরে যায় না)
    // B5 (২০২৬-১০-১১): শুধু রেখা-অক্ষরের লাইন ("──────", "______") — Gemini-র গোনা অক্ষর বেশি হলে Word-এ ২–৮ লাইনে
    // ভাঙত (g20/g22/g24)। প্রতিটি লাইন মূলের মাপা প্রস্থ পর্যন্ত leader-ট্যাব ⇒ কখনো ভাঙে না, দৈর্ঘ্য মূলের সমান
    const pleaderOn = !!(fzOn('PLEADER'));
    const formFixP = !!(fzOn('FORMFIX'));
    const ruleLines = (item.tabLines || item.lines || []).map((l) => String(l).replace(/\s+/g, ''));
    if (item.rect && item.rect.w > 40 && ruleLines.length && ruleLines.every((l) => /^([─━═=_\-.…·])\1{5,}$/.test(l))) {
      const pos = (item.indentPt || 0) + item.rect.w - 1;
      const rLh = lineH(item);
      const rCapSz = Math.max(4, Math.min(Math.round((item.fontPt || 12) * 2), Math.floor((rLh / 0.92) * 2)));
      const pMarkRpr = ((pleaderOn || formFixP) && !globalThis.__FZ_OFF_FB1) ? `<w:rPr><w:sz w:val="${rCapSz}"/><w:szCs w:val="${rCapSz}"/></w:rPr>` : '';
      return ruleLines.map((l, k) => {
        const c = l[0];
        // ২০২৬-১০-১৪ (a17 p4): মূলের কঠিন রেখা Gemini "-----" দেয়, মাপা রেখাও নিচে-দাগ (ruleBelow) ⇒ ড্যাশ + কঠিন দ্বিগুণ।
        // মাপা দাগ থাকলে হাইফেন/আন্ডারস্কোর leader নয় (শুধু দাগ)। বন্ধ: FZ_OFF=DASHRULE
        const leader = /[.…·]/.test(c) ? 'dot' : item.ruleBelow && !globalThis.__FZ_OFF_DASHRULE ? 'none' : c === '-' ? 'hyphen' : 'underscore';
        const ppr = pPr(Object.assign({}, item, { align: 'l', firstIndentPt: 0, centerShiftPt: null, tabLines: null, ruleBelow: k === ruleLines.length - 1 ? item.ruleBelow : null }), k ? 0 : extraBeforePt)
          .replace('<w:pPr>', `<w:pPr><w:tabs><w:tab w:val="right" w:leader="${leader}" w:pos="${tw(pos)}"/></w:tabs>`)
          .replace('</w:pPr>', `${pMarkRpr}</w:pPr>`);
        return `<w:p>${ppr}${leader === 'dot' ? LTAB : TAB}</w:p>`;
      }).join('');
    }
    const flat = (item.lines && item.lines.length ? item.lines.join(' ') : String(item.text || '')).replace(/\s+/g, ' ').trim();
    // [Rule FB1: FZ_OFF=PLEADER / FZ_OFF=FB1] শুধু আদর্শ স্কেলের (pageScale === 1), ড্যাশ-বক্সের বাইরের, বাম/উভয়-পাশ সাজানো ও সাধারণ ফন্টের (<= 13.5pt) অনুচ্ছেদে যেখানে একাধিক পূরণ-স্থান বা পূরণ-স্থানের পরে লেখা আছে, সেখানে ইনলাইন ডট/ড্যাশকে লিডার-ট্যাবে রূপান্তর।
    const allowInlineLeader = !globalThis.__FZ_OFF_FB1 && (!ctx || (!ctx.inDashedBox && (ctx.pageScale == null || ctx.pageScale === 1))) && item.align !== 'c' && (item.fontPt || 12) <= 13.5;
    if (pleaderOn && allowInlineLeader && !item.tabLines && !(item.keepLines && item.lines && item.lines.length > 1) && item.rect && item.rect.w > 40) {
      // ১) শুধু বিন্দু/ড্যাশ ও শেষে দাড়ি/যতিচিহ্ন (যেমন a02: "................................................................................ ।")
      const trailPunct = /^\s*(([._\-…·─])\2{5,})\s*([।.|,;:)]+)\s*$/.exec(flat);
      if (trailPunct) {
        const lc = trailPunct[2], leader = /[.…·]/.test(lc) ? "dot" : (lc === "-" || lc === "─") ? "hyphen" : "underscore";
        const pos = Math.max(40, (item.indentPt || 0) + item.rect.w - 8);
        const ppr = pPr(Object.assign({}, item, { align: "l", centerShiftPt: null }), extraBeforePt)
          .replace("<w:pPr>", `<w:pPr><w:tabs><w:tab w:val="left" w:leader="${leader}" w:pos="${tw(pos)}"/></w:tabs>`);
        return `<w:p>${ppr}${leader === "dot" ? LTAB : TAB}${runsFor(" " + trailPunct[3], item)}</w:p>`;
      }
      // ২) অনুচ্ছেদের ভেতরে ১ বা একাধিক বিন্দু/ড্যাশ পূরণ-স্থান (যেমন a02 "বিষয়ঃ জনাব ...... পিতা/স্বামী ......", "জনাব ...... ; ...... কার্যালয়ে", "ওয়েবসাইট:......", এবং a18 "সিভিল সার্ভিস রেগুলেশন এর ------অথবা...")
      const fillRe = /([._\-…·─])\1{5,}/g;
      if (fillRe.test(flat)) {
        fillRe.lastIndex = 0;
        const fsz0 = item.fontPt || 12;
        const bLen = (s) => String(s || "").replace(/\*\*|<[^>]+>/g, "").replace(/[ঁ-ঃ়া-্ৗ]/g, "").length;
        const segs = [];
        let lastIdx = 0, mFill;
        while ((mFill = fillRe.exec(flat)) !== null) {
          segs.push({ kind: "text", val: flat.slice(lastIdx, mFill.index) });
          segs.push({ kind: "fill", val: mFill[0], ch: mFill[1] });
          lastIdx = mFill.index + mFill[0].length;
        }
        const tailTxt = flat.slice(lastIdx);
        if (tailTxt) segs.push({ kind: "text", val: tailTxt });
        const nFillSegs = segs.filter((x) => x.kind === "fill").length;
        if (nFillSegs >= 2 || (tailTxt && tailTxt.trim().length > 0)) {
        const totalW = item.rect.w - 1;
        const textW = segs.filter((x) => x.kind === "text").reduce((a, x) => a + bLen(x.val) * fsz0 * 0.48, 0);
        const totalFillChars = segs.filter((x) => x.kind === "fill").reduce((a, x) => a + x.val.length, 0) || 1;
        const remW = Math.max(40, totalW - textW);
        let curX = item.indentPt || 0;
        const tabXmls = [];
        const bodyParts = [];
        for (let si = 0; si < segs.length; si++) {
          const sg = segs[si];
          if (sg.kind === "text") {
            curX += bLen(sg.val) * fsz0 * 0.48;
            bodyParts.push(runsFor(sg.val, item));
          } else {
            const fw = Math.max(36, remW * (sg.val.length / totalFillChars));
            curX += fw;
            const isLast = si === segs.length - 1 || (si === segs.length - 2 && !segs[si + 1].val.trim());
            const stopPos = isLast ? (item.indentPt || 0) + totalW : curX;
            const leader = /[.…·]/.test(sg.ch) ? "dot" : (sg.ch === "-" || sg.ch === "─") ? "hyphen" : "underscore";
            tabXmls.push(`<w:tab w:val="${isLast ? "right" : "left"}" w:leader="${leader}" w:pos="${tw(stopPos)}"/>`);
            bodyParts.push(leader === "dot" ? LTAB : TAB);
          }
        }
        const ppr = pPr(Object.assign({}, item, { align: "l", centerShiftPt: null }), extraBeforePt)
          .replace("<w:pPr>", `<w:pPr><w:tabs>${tabXmls.join("")}</w:tabs>`);
        return `<w:p>${ppr}${bodyParts.join("")}</w:p>`;
        }
      }
    }
    const dm =!item.tabLines && !(item.keepLines && item.lines && item.lines.length > 1) && (!item.align || item.align === 'l' || item.align === 'j' || item.align === 'r')
      && item.rect && item.rect.w > 40 && /^(.*?\S)\s*[.…·]{6,}$/.exec(flat);
    if (dm && !/[.…·]{6,}/.test(dm[1])) {
      const pos = (item.indentPt || 0) + item.rect.w - 1;
      let ppr = pPr(Object.assign({}, item, { align: 'l' }), extraBeforePt)
        .replace('<w:pPr>', `<w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${tw(pos)}"/></w:tabs>`);
      if ((formFixP || pleaderOn) && !globalThis.__FZ_OFF_FB2) {
        const clean1 = dm[1].replace(/\*\*|<[^>]+>/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '');
        const segUnits = clean1.length * 0.45 + 6.5;
        const availStop = pos - (item.indentPt || 0);
        let capHalf = Math.round((item.fontPt || 12) * 2);
        const exM = /w:line="(\d+)" w:lineRule="exact"/.exec(ppr);
        if (exM && (+exM[1]) / 20 < (item.fontPt || 12) * 0.92) capHalf = Math.min(capHalf, Math.max(4, Math.floor((((+exM[1]) / 20) / 0.92) * 2)));
        if (availStop > 15 && segUnits > 0) capHalf = Math.min(capHalf, Math.max(4, Math.floor(((availStop + 4.5) / segUnits) * 2)));
        if (capHalf < Math.round((item.fontPt || 12) * 2)) ppr = ppr.replace('</w:pPr>', `<w:rPr><w:sz w:val="${capHalf}"/><w:szCs w:val="${capHalf}"/></w:rPr></w:pPr>`);
      }
      return `<w:p>${ppr}${runsFor(dm[1] + ' ', item)}${LTAB}</w:p>`;
    }
    // ২০২৬-১০-১৩: ট্যাব-লাইনের শেষের বিন্দু-সারি ("নাম\t: ......") ⇒ মাপা ডান-প্রান্ত পর্যন্ত মোটা dot-leader (Gemini বিন্দু কম গোনে —
    // f2-এ লাইন ৮০pt ছোট)। শুধু যখন প্রতিটি ট্যাবের আগের লেখা (অনুমান ০.৫em/অক্ষর, বেশি ধরা) নিজের স্টপের আগেই শেষ —
    // নইলে ট্যাব লিডার-স্টপে লাফিয়ে লাইন ভাঙে (f2 ২ পাতা হয়েছিল)
    const lpos = item.rect && item.rect.w > 40 ? (item.indentPt || 0) + item.rect.w - 1 : 0;
    // বিন্দুর আগের শুধু ফাঁকা-অক্ষর বাদ (ট্যাব নয় — "\t:\t......"-এর শেষ ট্যাব রাখতে হয়, নইলে লিডার-ট্যাব পরের বাঁ-স্টপে থামে, a06)
    const DOTS = /[ \u00a0]*[.…·]{6,}\s*$/;
    const stops = (item.tabStops || []).map((t) => (formKitOn() && t && typeof t === 'object' ? (t.pos != null ? t.pos : t.x) : t)).filter((t) => t < lpos - 12);
    const fsz = item.fontPt || 12;
    const plainLen = (s) => { const clean = String(s).replace(/\*\*|<[^>]+>/g, ''); return (pleaderOn ? clean.replace(/[ঁ-ঃ়া-্ৗ]/g, '') : clean).length; };
    const est = (s) => { const n = plainLen(s); return n * fsz * (n <= 2 ? 0.3 : 0.5); };   // ":" একা সরু
    const segsOf = (ln) => String(ln).replace(DOTS, '').split('\t');
    const tabsSafe = (ln, start) => {
      const seg = segsOf(ln);
      if (seg.length - 1 > stops.length) return false;
      for (let i = 0; i < seg.length - 1; i++) if ((i ? stops[i - 1] : start) + est(seg[i]) > stops[i] - 1) return false;
      return (seg.length > 1 ? stops[seg.length - 2] : start) + est(seg[seg.length - 1]) < lpos - 20;
    };
    // a06: Gemini বিন্দু-সারি পুরো বাদ দেয় ("নাম\t:") অথচ মূলের মাপা কালি ডানে অনেক দূর (বিন্দু) ⇒ ":"-এ শেষ লাইনেও লিডার,
    // যদি মাপা ডান-প্রান্ত অনুমিত লেখার শেষের ≥৬০pt পরে
    const COLON = /[:：]\s*$/;
    const tailEnd = (ln, start) => {
      const seg = segsOf(ln);
      return (seg.length > 1 ? stops[seg.length - 2] || start : start) + est(seg[seg.length - 1]);
    };
    const hasLead = (ln, start) => !!lpos && tabsSafe(ln, start) &&
      (DOTS.test(String(ln)) || (COLON.test(String(ln)) && !item.ruleBelow && !item.underline && lpos - tailEnd(ln, start) >= 60));
    // (a03: সারি-বিভাজক দাগ মাপা আয়তে ঢুকলে আয়ত বাক্স-জোড়া ⇒ ":"-নিয়মে মূলে-নেই বিন্দু বসত — দাগওয়ালা অনুচ্ছেদে নয়)
    // nUsed = লেখার ট্যাব কয়টি স্টপ নেয় — তার পরের বাঁ-স্টপ বাদ (লিডার-ট্যাব যেন সরাসরি ডান-প্রান্তে যায়)
    const leadStop = (ppr, nUsed) => {
      const stop = `<w:tab w:val="right" w:leader="dot" w:pos="${tw(lpos)}"/>`;
      const keep = new Set(stops.slice(0, nUsed).map((t) => tw(t)));
      const p = ppr.replace(/<w:tab w:val="left" w:pos="(\d+)"\/>/g, (m0, pos) => (nUsed == null || keep.has(+pos) || +pos >= tw(lpos) ? m0 : ''));
      return p.includes('</w:tabs>') ? p.replace('</w:tabs>', stop + '</w:tabs>').replace('<w:tabs></w:tabs>', '') : p.replace('<w:spacing', `<w:tabs>${stop}</w:tabs><w:spacing`);
    };
    const usedTabs = (ln) => segsOf(ln).length - 1;
    const lineRuns = (ln, lead) => (lead ? String(ln).replace(DOTS, '').split('\t').map((p) => runsFor(p, item)).join(TAB) + LTAB
      : String(ln).split('\t').map((p) => runsFor(p, item)).join(TAB));
    // g41: বহু-লাইনের ট্যাব-ব্লক ⇒ প্রতি লাইনে আলাদা অনুচ্ছেদ (মূল Word-এর মতো; উচ্চতা একই — exact লাইন, after=0)।
    // পরের লাইনগুলোতে প্রথম-লাইন-ইনডেন্ট নয় (ঝুলন্ত হলে বাঁ-ইনডেন্টে)
    // [Rule FB2: FZ_OFF=FORMFIX / FZ_OFF=FB2] আক্ষরিক বিন্দু/ড্যাশ পূরণ-স্থান, লিডার-ট্যাব বা ঘন exact লাইন-উচ্চতা থাকা অনুচ্ছেদে দৃশ্যমান রানের ফন্ট অপরিবর্তিত রেখে অনুচ্ছেদ-চিহ্নের (<w:pPr><w:rPr>) sz সীমিত রাখা।
    const markParaRpr = (pprXml, rawText, hasLeadTab) => {
      if (!((formFixP || pleaderOn) && !globalThis.__FZ_OFF_FB2)) return pprXml;
      const exM = /w:line="(\d+)" w:lineRule="exact"/.exec(pprXml);
      const exPt = exM ? (+exM[1]) / 20 : 0;
      const curFs = item.fontPt || 12;
      let capHalf = Math.round(curFs * 2);
      if (exPt > 0 && exPt < curFs * 0.92) {
        capHalf = Math.min(capHalf, Math.max(4, Math.floor((exPt / 0.92) * 2)));
      }
      if (faithfulStudioOn() && item._fzLayoutSnap) { const li = layoutItem(item); rawText = (li.tabLines && li.tabLines.length) ? li.tabLines.join('\n') : (li.lines && li.lines.length ? li.lines.join(li.keepLines && li.lines.length > 1 ? '\n' : ' ') : String(li.text || '')); }
      const s = String(rawText || '');
      const hasFill = /([._\-…·─━═])\1{3,}/.test(s) && !/^[─━═=_]{6,}$/.test(s.replace(/\s+/g, ''));
      if (hasFill || hasLeadTab) {
        const stopPts = [...pprXml.matchAll(/<w:tab\b[^>]*\bw:pos="(\d+)"[^>]*\/>/g)].map((m) => (+m[1]) / 20);
        const indLPt = (/<w:ind\b[^>]*\bw:left="(-?\d+)"/.exec(pprXml)?.[1] || 0) / 20;
        const indRPt = (/<w:ind\b[^>]*\bw:right="(-?\d+)"/.exec(pprXml)?.[1] || 0) / 20;
        const avW = Math.max(40, (ctx && ctx.availW ? ctx.availW : ((item.rect && item.rect.w) || 450)) - indRPt);
        for (const ln of s.split('\n')) {
          if (ln.includes('\t') && stopPts.length > 0) {
            const parts = ln.split('\t');
            for (let k = 0; k < parts.length; k++) {
              const p = parts[k];
              const nF = (p.match(/([._\-…·─━═])\1{3,}/g) || []).length + (hasLeadTab && k === parts.length - 1 ? 1 : 0);
              if (!nF && k === parts.length - 1) continue;
              const prevX = k === 0 ? indLPt : (stopPts[Math.min(k - 1, stopPts.length - 1)] || indLPt);
              const limX = k < parts.length - 1 ? (stopPts[Math.min(k, stopPts.length - 1)] || avW) : (hasLeadTab ? (stopPts[stopPts.length - 1] || avW) : avW);
              const segW = Math.max(18, limX - prevX + 4.5);
              const clean = p.replace(/\*\*|<[^>]+>/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '');
              const units = clean.length * 0.45 + nF * 6.5;
              if (units > 0) capHalf = Math.min(capHalf, Math.max(4, Math.floor((segW / units) * 2)));
            }
          } else {
            const nF = (ln.match(/([._\-…·─━═])\1{3,}/g) || []).length + (hasLeadTab ? 1 : 0);
            if (!nF) continue;
            const limX = hasLeadTab && stopPts.length ? stopPts[stopPts.length - 1] : avW;
            const segW = Math.max(24, limX - indLPt + 2.5);
            const clean = ln.replace(/\*\*|<[^>]+>/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '');
            const units = clean.length * 0.45 + nF * 6.5;
            if (units > 0) capHalf = Math.min(capHalf, Math.max(4, Math.floor((segW / units) * 2)));
          }
        }
      }
      if (capHalf >= Math.round(curFs * 2)) return pprXml;
      return pprXml.replace('</w:pPr>', `<w:rPr><w:sz w:val="${capHalf}"/><w:szCs w:val="${capHalf}"/></w:rPr></w:pPr>`);
    };
    if (item.tabLines && item.tabStops && item.tabStops.length && item.tabLines.length > 1) {
      const fi = item.firstIndentPt || 0;
      const rest = Object.assign({}, item, { spaceBeforePt: 0, firstIndentPt: 0, indentPt: (item.indentPt || 0) + (fi < 0 ? -fi : 0) });
      const last = item.tabLines.length - 1, noRule = (x) => Object.assign({}, x, { ruleBelow: null });
      const preEnter = mathHOn() && !globalThis.__FZ_OFF_ENTERGAP && !item.pageBreakBefore ? enterGapXml((item.spaceBeforePt || 0) + (extraBeforePt || 0)) : '';
      return preEnter + item.tabLines.map((ln, k) => {
        const ppr0 = k ? pPr(k === last ? rest : noRule(rest), 0) : pPr(last ? noRule(item) : item, extraBeforePt);
        const lead = hasLead(ln, k ? rest.indentPt : (item.indentPt || 0) + fi);
        const ppr = markParaRpr(lead ? leadStop(ppr0, usedTabs(ln)) : ppr0, lead ? String(ln).replace(DOTS, '') : ln, lead);
        return `<w:p>${ppr}${lineRuns(ln, lead)}</w:p>`;
      }).join('');
    }
    // এক অনুচ্ছেদে কয়েক লাইন (একই স্টপ-তালিকা) ⇒ সব লাইনের ট্যাব নিরাপদ হলে তবেই লিডার
    const isTab = item.tabLines && item.tabStops && item.tabStops.length;
    const s0 = (item.indentPt || 0) + (item.firstIndentPt || 0);
    const allLead = isTab && lpos && item.tabLines.some((ln, k) => hasLead(ln, k ? (item.indentPt || 0) : s0)) && item.tabLines.every((ln, k) => tabsSafe(ln, k ? (item.indentPt || 0) : s0));
    if (allLead) {
      const b = item.tabLines.map((ln, k) => lineRuns(ln, hasLead(ln, k ? (item.indentPt || 0) : s0))).join('<w:r><w:br/></w:r>');
      const ppr = markParaRpr(leadStop(pPr(item, extraBeforePt), Math.max(...item.tabLines.map(usedTabs))), item.tabLines.map((ln) => String(ln).replace(DOTS, '')).join('\n'), true);
      return `<w:p>${ppr}${b}</w:p>`;
    }
    const rawTxt = isTab
      ? item.tabLines.join('\n')
      : item.keepLines && item.lines && item.lines.length > 1
      ? item.lines.join('\n')
      : (item.lines && item.lines.length ? item.lines.join(' ') : item.text).replace(/\s+/g, ' ').trim();
    const body = isTab
      ? item.tabLines.map((ln) => lineRuns(ln, false)).join('<w:r><w:br/></w:r>')
      : item.keepLines && item.lines && item.lines.length > 1
      ? item.lines.map((ln) => runsFor(ln, item)).join('<w:r><w:br/></w:r>')
      : runsFor(rawTxt, item);
    const useEnter = !globalThis.__FZ_OFF_ENTERGAP && (globalThis.__FZ_ON_ENTERGAP || mathHOn() || (typeof process !== 'undefined' && process.env.FZ_ON && process.env.FZ_ON.includes('ENTERGAP')));
    const totalBefore = (item.spaceBeforePt || 0) + (extraBeforePt || 0);
    const enterLead = useEnter && !(mathHOn() && item.pageBreakBefore) ? enterGapXml(totalBefore) : '';
    return `${enterLead}<w:p>${markParaRpr(pPr(item, extraBeforePt), rawTxt, false)}${body}</w:p>`;
  }

  /**
   * ২০২৬-১০-১৩: Gemini মূলে-নেই বিন্দু-সারি জোড়ে ("মোবাইল : ......", a03) — মাপা কালির প্রস্থ লেবেলের অনুমিত প্রস্থের সমান হলে
   * (বিন্দু থাকলে আয়ত অনেক চওড়া হতো) লাইনের শেষের বিন্দু বাদ। অনুমান উদার (অক্ষর ০.৫em, বিন্দু ০.২৫em; ×০.৮ + ২০pt)
   */
  function stripGhostDots(item) {
    const fs = item.fontPt || 12, TAIL = /[  \t]*[.…·]{6,}\s*$/;
    const w = (s) => [...String(s).replace(/\*\*|<[^>]+>/g, '')].reduce((a, ch) => a + (/[.…·]/.test(ch) ? 0.25 : /\s/.test(ch) ? 0.3 : 0.5) * fs, 0);
    const fix = (arr) => (arr ? arr.map((ln) => {
      const s = String(ln);
      if (!TAIL.test(s)) return ln;
      const head = s.replace(TAIL, '');
      return w(head.replace(/\t/g, ' ')) * 0.8 + 20 >= item.rect.w ? head : ln;
    }) : arr);
    const lines = fix(item.lines), tabLines = fix(item.tabLines);
    const same = (a, b) => !a || a.every((x, i) => x === b[i]);
    if (same(item.lines, lines) && same(item.tabLines, tabLines)) return Object.assign({}, item, { _dotChecked: true });
    const out = Object.assign({}, item, { lines, tabLines, _dotChecked: true });
    if (lines && lines.length) out.text = lines.join('\n');
    return out;
  }

  function spacer(pt) {
    const useEnter = !globalThis.__FZ_OFF_ENTERGAP && (globalThis.__FZ_ON_ENTERGAP || mathHOn() || (typeof process !== 'undefined' && process.env.FZ_ON && process.env.FZ_ON.includes('ENTERGAP')));
    if (useEnter) return enterGapXml(pt);
    return pt > 1 ? `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${tw(pt)}" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>` : '';
  }

  function tableXml(item, extraBeforePt, ctx) {
    if (faithfulStudioOn() && isTableEdited(item)) return renderEditedTableXml(item, extraBeforePt, ctx);
    // B2: পাশাপাশি ছোট ছোট বাক্স (মাঝে ফাঁকসহ) — প্রতিটি বাক্সের নিজস্ব ৪-পাশের বর্ডার এবং মাঝের ফাঁকা ঘর বর্ডারহীন
    if (tableGridOn() && Array.isArray(item.smallBoxesPt) && item.smallBoxesPt.length >= 2 && item.rows && item.rows.length === 1 && item.rows[0].length === item.smallBoxesPt.length) {
      const sbs = item.smallBoxesPt;
      const hasGaps = sbs.some((b, i) => i > 0 && (b.x0 - sbs[i - 1].x1) >= 3);
      if (hasGaps) {
        const expRow = [], expWidths = [], isGapCol = [];
        sbs.forEach((b, i) => {
          if (i > 0) {
            const gw = Math.max(4, b.x0 - sbs[i - 1].x1);
            expRow.push(''); expWidths.push(tw(gw)); isGapCol.push(true);
          }
          expRow.push(item.rows[0][i]);
          expWidths.push(tw(Math.max(14, b.w || (b.x1 - b.x0))));
          isGapCol.push(false);
        });
        const totTw = expWidths.reduce((a, c) => a + c, 0);
        const NIL = '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
        const BXB = '<w:tcBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tcBorders>';
        const bh = Math.max(18, sbs[0].h || (sbs[0].y1 - sbs[0].y0) || 22);
        const fsz = item.fontPt || 11;
        const tcs = expRow.map((c, j) => {
          const bdr = isGapCol[j] ? '' : BXB;
          return `<w:tc><w:tcPr><w:tcW w:w="${expWidths[j]}" w:type="dxa"/>${bdr}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>${c ? runsFor(String(c), { fontPt: fsz, bold: !!item.bold, align: 'c' }) : ''}</w:p></w:tc>`;
        }).join('');
        return spacer((item.spaceBeforePt || 0) + (extraBeforePt || 0)) +
          `<w:tbl><w:tblPr><w:tblW w:w="${totTw}" w:type="dxa"/><w:tblInd w:w="${tw(item.indentPt || 0)}" w:type="dxa"/>${NIL}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="28" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="28" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${expWidths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid><w:tr><w:trPr><w:trHeight w:val="${tw(bh)}" w:hRule="atLeast"/></w:trPr>${tcs}</w:tr></w:tbl>`;
      }
    }
    let cellMeta = null;
    if (formKitOn() && item.rows && item.rows.length) {
      let normRows = item.rows.map((r) => r.slice());
      cellMeta = normRows.map((r) => r.map((c) => (c && typeof c === 'object' && !Array.isArray(c) ? Object.assign({}, c) : null)));
      normRows = normRows.map((r, ri) => r.map((c, ck) => {
        if (c && typeof c === 'object' && !Array.isArray(c)) {
          if (Array.isArray(c.boxes) || c.boxCount > 0) {
            const pre = c.prefix != null ? String(c.prefix).split('') : [];
            const bxArr = Array.isArray(c.boxes) ? c.boxes : pre.concat(Array(Math.max(0, (c.boxCount || 11) - pre.length)).fill(''));
            return BOX_MARK + bxArr.join(BOX_SEP);
          }
          if (Array.isArray(c.options) || Array.isArray(c.radio)) {
            return (c.options || c.radio).map((o) => {
              const s = String(o || '').trim().replace(/^\(\s*\)\s*/, '○ ').replace(/^\(\s*[•*]\s*\)\s*/, '● ');
              return /^[○●◯◉]/.test(s) ? s : '○ ' + s;
            }).join('\n');
          }
          if ((c.text == null || c.text === '') && typeof c.placeholder === 'string' && c.placeholder) {
            cellMeta[ri][ck].color = cellMeta[ri][ck].color || '808080';
            return c.placeholder;
          }
          return c.text != null ? String(c.text) : (c.value != null ? String(c.value) : '');
        }
        if (typeof c === 'string') {
          const ib = parseInlineBoxes(c);
          if (ib && !ib.label) return BOX_MARK + ib.cells.join(BOX_SEP);
        }
        return c != null ? String(c) : '';
      }));
      // B4: "দাগ টেনে মিল কর" ২-কলামের ছকে শেষ সারি ("৩০ 25") এক ঘরে থাকলে দুই ঘরে ভাগ
      if (normRows.length >= 2) {
        const twoColRows = normRows.filter((r) => r.length === 2 && r[0] && r[1]);
        if (twoColRows.length >= normRows.length - 1 || item.type === 'match_col' || item.matchCols) {
          normRows = normRows.map((r, ri) => {
            if (r.length === 1 || (r.length === 2 && r[0] && !r[1])) {
              const sp = String(r[0] || '').trim().split(/\s{2,}|\t|\s+/);
              if (sp.length === 2) {
                if (cellMeta[ri] && cellMeta[ri].length < 2) cellMeta[ri].push(null);
                return [sp[0], sp[1]];
              }
            }
            return r;
          });
        }
      }
      // B9: সংখ্যা-বাক্সের সারি (যেমন ০১ + ১১ ঘর, NID ১৭ ঘর) লেবেলসহ থাকলে ভাঁজ করা
      const isBoxR = (r) => r.length >= 5 && String(r[0] || '').trim().length > 1 && r.slice(1).every((c) => String(c || '').trim().length <= 2);
      if (normRows.some(isBoxR)) {
        normRows = normRows.map((r) => (isBoxR(r) ? [r[0], BOX_MARK + r.slice(1).join(BOX_SEP)] : r));
      }
      const isSingleBoxStrip = normRows.length === 1 && normRows[0].length >= 5 && normRows[0].every((c) => String(c || '').trim().length <= 2);
      item = Object.assign({}, item, { rows: normRows, _cellMeta: cellMeta, _singleBoxStrip: isSingleBoxStrip });
    }
    const rows = item.rows && item.rows.length ? item.rows : [['']];
    const nCols = Math.max(...rows.map((r) => r.length));
    // Part-17.9: সীমানাহীন টেবিল = কলামে সাজানো লেখা ⇒ ঘরের ভেতরের ফাঁক প্রায় শূন্য, প্রস্থে সামান্য ছাড় (নইলে সরু কলামে লেখা ভাঙত)
    // (কলাম-সীমা ফাঁকের মাঝখানে ⇒ ঘরের ভেতরের ফাঁক = সবচেয়ে সরু কলাম-ফাঁকের অর্ধেক, ১–৫.৪pt — "১। কবিতা" মাঝের ফাঁক থাকে)
    const marPt = item._singleBoxStrip ? 0 : (item.borderless ? Math.max(1, Math.min(5.4, (item.colGapPt || 2) / 2 - 0.5)) : 5.4);
    const cellMarTw = Math.round(marPt * 20);
    const width = item._singleBoxStrip ? Math.max(nCols * 14, Math.min(nCols * 18, item.widthPt || nCols * 16)) : Math.max(72, (item.widthPt || 400) + (item.borderless ? 2 * marPt + 2 : 0));
    const colW = Math.floor(tw(width) / nCols);
    const cellItem = { fontPt: item.fontPt || 11, align: 'c' };
    // Part-17.7: ঘরের চিত্র (মিলাও-প্রশ্ন) — ঘরের প্রস্থে আঁটানো
    const figAt = {};
    (item.cellFigures || []).forEach((f) => {
      const maxW = colW / 20 - 8;
      const fit = f.widthPt > maxW ? Object.assign({}, f, { widthPt: maxW, heightPt: f.heightPt * maxW / f.widthPt }) : f;
      const key = f.cell[0] + ':' + f.cell[1];
      (figAt[key] = figAt[key] || []).push(fit);
    });
    const isFormTbl = formKitOn() && !item._singleBoxStrip && nCols >= 2 && !!(
      item.formTable || item.isForm || item.labelColFill || item.noVRules
      || rows.some((r) => r.some((c) => typeof c === 'string' && (c.startsWith(BOX_MARK) || /^[○●◯◉]/.test(c.trim()) || /\*\s*:?$/.test(c.trim()) || isPlaceholderStr(c))))
    );
    const resolveCellFill = (ri, k, rowArr) => {
      const cm = item._cellMeta && item._cellMeta[ri] ? item._cellMeta[ri][k] : null;
      const direct = (cm && (cm.fill || cm.shade || cm.bg))
        || (item.cellFills && item.cellFills[ri] && item.cellFills[ri][k])
        || (item.cellShades && item.cellShades[ri] && item.cellShades[ri][k])
        || (item.rowFills && item.rowFills[ri])
        || (ri === 0 && (item.headFill || item.headShade));
      if (direct) return normHex(direct);
      const rNe = (rowArr || rows[ri] || []).filter((c) => c && String(c).trim());
      const isFullSpanHdr = nCols >= 2 && rNe.length === 1 && String((rowArr || rows[ri])[0] || '').trim() && !/[:ঃ*]$/.test(String((rowArr || rows[ri])[0] || '').trim()) && item.headerBandFill;
      if (isFullSpanHdr) return normHex(item.headerBandFill);
      const colF = item.colFills && item.colFills[k];
      if (colF) return normHex(colF);
      if (k === 0 && nCols >= 2 && !(rNe.length === 1 && !(rowArr || rows[ri])[1]) && (item.labelColFill || isFormTbl)) {
        return normHex(typeof item.labelColFill === 'string' ? item.labelColFill : 'F2F2F2');
      }
      return normHex(item.fill || item.shade);
    };
    const resolveCellColor = (ri, k, txt, cFill, cm) => {
      const direct = (cm && (cm.color || cm.fg))
        || (item.cellColors && item.cellColors[ri] && item.cellColors[ri][k])
        || (item.rowColors && item.rowColors[ri])
        || (ri === 0 && item.headColor)
        || (item.colColors && item.colColors[k]);
      if (direct) return normHex(direct);
      if (cFill && isDarkHex(cFill)) return 'FFFFFF';
      if ((cm && cm.placeholder) || (k >= 1 && isPlaceholderStr(txt))) return '808080';
      return normHex(item.color);
    };
    const cellBody = (txt, ri, k, cellWTw) => {
      const figs = figAt[ri + ':' + k] || [];
      const figXml = ctx ? figs.map((f) => paraXml(Object.assign({}, f, { spaceBeforePt: 0, indentPt: 0 }), 0, ctx).replace('<w:jc w:val="left"/>', '<w:jc w:val="center"/>')).join('') : '';
      // Part-17.9: কলামের মাপা অবস্থান (না থাকলে মাঝে)
      if (formKitOn() && typeof txt === 'string' && /^\(\s*[•*]?\s*\)\s*\S/m.test(txt.trim())) {
        txt = txt.split('\n').map((ln) => ln.replace(/^(\s*)\(\s*\)\s*/, '$1○ ').replace(/^(\s*)\(\s*[•*]\s*\)\s*/, '$1● ')).join('\n');
      }
      const isRadioOrBox = typeof txt === 'string' && (txt.startsWith(BOX_MARK) || (!globalThis.__FZ_OFF_BOXPOS && /^[○●◯◉□☐☑■✓✔•◦]/m.test(txt.trim())));
      const isTotalSpan = ri === rows.length - 1 && k === 0 && item.lastRowSpan > 1;
      const cmAlign = formKitOn() && item._cellMeta && item._cellMeta[ri] && item._cellMeta[ri][k] ? item._cellMeta[ri][k].align : null;
      const jc = isTotalSpan ? 'right' : (cmAlign && JC[cmAlign]) ? JC[cmAlign] : isRadioOrBox ? 'left' : JC[(item.cellAligns && item.cellAligns[ri] && item.cellAligns[ri][k]) || (item.colAligns && item.colAligns[k]) || 'c'];
      // [Rule FB3: FZ_OFF=FORMFIX / FZ_OFF=FB3] যখন সারির উচ্চতা exact থেকে atLeast করা হয়, তখন লেখাসহ এক-লাইনের rh.fitted ঘরে tight থাকবে, কিন্তু ফাঁকা ঘরে কোনো w:line না দিয়ে কেবল pSz সারির উচ্চতা (÷ 2.2) ও প্রস্থ অনুযায়ী সীমিত রাখা হবে।
      const formFixOn = !!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_FB3);
      const rowIsAtLeast = !!(item.gridFirst || formFixOn);
      const nL = String(txt || '').split('\n').length, fsz = item.fontPt || 11;
      const curRowH = rh.fitted && rh[ri] ? rh[ri].h : (isEmpty(rows[ri], ri) && rowH ? rowH * 0.4 : rowH);
      const hasCellTxt = !!(txt && String(txt).trim());
      const cellHasEq = mathHOn() && !!mathKindOf(txt);
      const tight = !cellHasEq && (!formFixOn || hasCellTxt)
        && rh.fitted && rh[ri] && (!rh[ri].exact || rowIsAtLeast)
        && !String(txt || '').includes('\n') && curRowH - BA < fsz * (rowIsAtLeast && rh[ri].exact ? 1.68 : 1.6)
        ? ` w:line="${tw(Math.max(fsz * 1.05, curRowH - BA))}" w:lineRule="exact"` : '';
      const room = rh.fitted && rh[ri] && !tight ? Math.max(0, rh[ri].h - BA - fsz * 1.35 * nL) : 0;
      const sh = item.rowShiftPt && item.rowShiftPt[ri] ? Math.max(-room, Math.min(room, 2 * item.rowShiftPt[ri])) : 0;
      const cMeta = formKitOn() && item._cellMeta && item._cellMeta[ri] ? item._cellMeta[ri][k] : null;
      const cFill = formKitOn() ? resolveCellFill(ri, k, rows[ri]) : null;
      const cColor = formKitOn() ? resolveCellColor(ri, k, txt, cFill, cMeta) : null;
      const baseCellIt = ri === 0 && item.headFontPt ? Object.assign({}, cellItem, { fontPt: item.headFontPt }) : cellItem;
      let rowCellItem = formKitOn()
        ? Object.assign({}, baseCellIt, {
            color: cColor || baseCellIt.color,
            bold: cMeta && cMeta.bold != null ? !!cMeta.bold : (cFill && isDarkHex(cFill) ? true : baseCellIt.bold),
            italic: cMeta && cMeta.italic != null ? !!cMeta.italic : baseCellIt.italic
          })
        : baseCellIt;
      if (tableGridOn() && ri === 0) {
        const hBold = !!(item.headBold || (item.headCellBold && item.headCellBold[k]) || (cMeta && cMeta.bold));
        const hUl = !!(item.headUnderline || (item.headCellUnderline && item.headCellUnderline[k]) || (cMeta && cMeta.underline));
        if (hBold || hUl) {
          rowCellItem = Object.assign({}, rowCellItem, {
            bold: hBold ? true : rowCellItem.bold,
            underline: hUl ? true : rowCellItem.underline
          });
        }
      }
      if (formKitOn() && typeof txt === 'string' && isPlaceholderStr(txt)) txt = stripPlaceholderWrap(txt);
      const pShd = ri === 0 && item.headShade && globalThis.__FZ_ON_PCELLSHD && !globalThis.__FZ_OFF_TBLSHADE ? `<w:shd w:val="clear" w:color="auto" w:fill="${item.headShade}"/>` : '';
      const defSz = Math.round((rowCellItem.fontPt || 11) * 2);
      const effMarTw = (item.gridFirst || (formFixOn && (cellWTw || colW) <= tw(24))) && !item.borderless && (cellWTw || colW) < tw(70) ? ((cellWTw || colW) < tw(25) ? 0 : 28) : cellMarTw;
      const availCellPt = Math.max(14, ((cellWTw || colW) - 2 * effMarTw) / 20);
      const pSz = (() => {
        if (hasCellTxt || figs.length) return defSz;
        if (formFixOn) {
          const capH = curRowH > 0 ? Math.max(4, Math.floor(((curRowH - BA) / 2.2) * 2)) : defSz;
          const isDigit = ((cellWTw || colW) / 20) <= 24;
          const capW = isDigit ? Math.min(defSz, 14) : Math.max(4, Math.floor(((availCellPt + 2.5) / 6.2) * 2));
          return Math.min(defSz, capH, capW);
        }
        return item.gridFirst && rh.fitted && rh[ri] && rh[ri].h - BA < fsz * 1.5 ? Math.max(4, Math.floor((rh[ri].h - BA) * 1.3)) : defSz;
      })();
      const radIndTw = formFixOn && isRadioOrBox
        ? (item.noVRules && k > 0 && item.radioIndentPt > 0 ? tw(item.radioIndentPt)
          : (item.borderless && ri > 0 && item.bulletIndentPt > 0 ? tw(item.bulletIndentPt) : 0))
        : 0;
      const radIndXml = radIndTw > 0 ? `<w:ind w:left="${radIndTw}"/>` : "";
      const radLineXml = formFixOn && nL >= 2 && rh.fitted && rh[ri] && !tight
        ? (isRadioOrBox && item.noVRules && rh[ri].h > nL * fsz * 1.25
          ? ` w:line="${tw(Math.min(fsz * 1.55, (rh[ri].h - 4) / nL))}" w:lineRule="exact"`
          : (rh[ri].exact && rh[ri].h - BA < nL * fsz * 1.65
            ? ` w:line="${tw(Math.max(fsz * 1.0, (rh[ri].h - BA) / nL))}" w:lineRule="exact"` : tight))
        : tight;
      const cellP = (t, li) => {
        if (item.gridFirst && t) {
          const dm = /^(.*?\S)\s*([._\-…·─])\2{5,}\s*$/.exec(String(t));
          if (dm && !/([._\-…·─])\1{3,}/.test(dm[1])) {
            const lc = dm[2], leader = /[.…·]/.test(lc) ? "dot" : (lc === "-" || lc === "─") ? "hyphen" : "underscore";
            const effMar = !item.borderless && cellWTw < tw(70) ? (cellWTw < tw(25) ? 0 : 28) : cellMarTw;
            const maxPosTw = Math.max(200, (cellWTw || colW) - 2 * effMar - 20);
            const prefLen = dm[1].replace(/\*\*|<[^>]+>/g, "").replace(/[ঁ-ঃ়া-্ৗ]/g, "").length;
            const fillLen = String(t).length - dm[1].length;
            const natPt = (prefLen * 0.5 + fillLen * 0.36) * (rowCellItem.fontPt || 11) + 6;
            const posTw = Math.min(maxPosTw, Math.max(Math.min(maxPosTw, tw(118)), tw(natPt)));
            const stopPt = posTw / 20;
            const leadCapSz = formFixOn ? Math.min(defSz, Math.max(4, Math.floor(((stopPt + 5) / (prefLen * 0.45 + 6.5)) * 2))) : defSz;
            return `<w:p><w:pPr>${pShd}<w:tabs><w:tab w:val="right" w:leader="${leader}" w:pos="${posTw}"/></w:tabs><w:spacing w:before="${sh > 0 && !li ? tw(sh) : 0}" w:after="${sh < 0 && li === nL - 1 ? tw(-sh) : 0}"${tight}/><w:jc w:val="left"/><w:rPr><w:sz w:val="${leadCapSz}"/><w:szCs w:val="${leadCapSz}"/></w:rPr></w:pPr>${runsFor(dm[1] + " ", rowCellItem)}<w:r><w:rPr><w:sz w:val="${defSz}"/><w:szCs w:val="${defSz}"/></w:rPr><w:tab/></w:r></w:p>`;
          }
        }
        let pMarkSz = t ? defSz : pSz;
        if (formFixOn && t && /([._\-…·─━═])\1{3,}/.test(String(t))) {
          const nFill = (String(t).match(/([._\-…·─━═])\1{3,}/g) || []).length;
          const clean = String(t).replace(/\*\*|<[^>]+>/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '');
          const units = clean.length * 0.45 + nFill * 6.5;
          pMarkSz = Math.min(defSz, Math.max(4, Math.floor(((availCellPt + 2.5) / units) * 2)));
        }
        return `<w:p><w:pPr>${pShd}<w:spacing w:before="${sh > 0 && !li ? tw(sh) : 0}" w:after="${sh < 0 && li === nL - 1 ? tw(-sh) : 0}"${!t && formFixOn ? "" : radLineXml}/>${radIndXml}<w:jc w:val="${jc}"/><w:rPr><w:sz w:val="${pMarkSz}"/><w:szCs w:val="${pMarkSz}"/></w:rPr></w:pPr>${t ? runsFor(t, rowCellItem) : ""}</w:p>`;
      };
      // f1/B9: সংখ্যা-বাক্সের সারি (layout-ir foldBoxRows) ⇒ ঘরের ভেতরে ছোট টেবিল, প্রতি অঙ্কে একটি বাক্স
      if (typeof txt === 'string' && txt.startsWith(BOX_MARK)) return boxRowXml(txt.slice(BOX_MARK.length).split(BOX_SEP), cw(k) / 20 - 2 * marPt) + figXml;
      const st = subTable(txt);
      if (st) return (st.pre ? st.pre.split('\n').map(cellP).join('') : '') + subTableXml(st.rows, cw(k) / 20 - 2 * marPt, fsz) + (st.post ? st.post.split('\n').map(cellP).join('') : '') + figXml;
      const textXml = txt || !figXml ? String(txt || '').split('\n').map(cellP).join('') : '';
      return textXml + figXml;
    };
    const NILB = '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
    const B = item.borderless ? NILB :'<w:tblBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tblBorders>';
    // f1: মাপে খাড়া দাগ নেই (layout-ir noVRules) ⇒ বাঁ/ডান/ভেতরের খাড়া দাগ বাদ; B2: অনুভূমিক (insideH) ও খাড়া (insideV) আলাদা নিয়ন্ত্রণ
    let BV = !item.borderless && item.noVRules && !(tableGridOn() && item.keepHRules)
      ? (globalThis.__FZ_ON_NOVGRAY ? B.replace(/w:sz="6"/g, 'w:sz="4"').replace(/w:color="000000"/g, 'w:color="DFDFDF"') : B.replace(/<w:(left|right|insideV|top|bottom|insideH) [^>]*\/>/g, '<w:$1 w:val="nil"/>'))
      : B;
    if (tableGridOn() && !item.borderless) {
      if (item.noInsideH || item.noHRules || item.insideH === false) {
        BV = BV.replace(/<w:insideH [^>]*\/>/, '<w:insideH w:val="nil"/>');
      }
      if (item.noInsideV || item.insideV === false || (item.noVRules && item.keepHRules)) {
        BV = BV.replace(/<w:insideV [^>]*\/>/, '<w:insideV w:val="nil"/>');
        if (item.noVRules && item.outerV !== true) {
          BV = BV.replace(/<w:(left|right) [^>]*\/>/g, '<w:$1 w:val="nil"/>');
        }
      }
    }
    // Part-17.8: সারির উচ্চতা অন্তত মূলের সমান (মাপা টেবিল-উচ্চতা ÷ সারি)
    // ফাঁকা সারি (আলাদা ছোট টেবিলের মাঝের ফাঁক) মূলে সরু ⇒ সাধারণ সারির ০.৪ ভাগ, "ঠিক" উচ্চতায়
    const figRows = new Set((item.cellFigures || []).map((f) => f.cell[0]));
    const isEmpty = (r, ri) => !r.some((c) => c && String(c).trim()) && !figRows.has(ri);
    const nEmpty = rows.filter(isEmpty).length;
    const rowH = item.heightPt && rows.length ? item.heightPt / (rows.length - nEmpty + nEmpty * 0.4) : 0;
    const rh = tableRowHeights(item, marPt);
    // ২০২৬-১০-১৩: সীমানাওয়ালা "অন্তত" সারিতে Word বর্ডারের পুরুত্ব (০.৭৫) যোগ করে ⇒ সেটুকু বাদ দিয়ে লেখা (a08: ১৩ সারিতে ১০pt জমত)
    // f1 (noVRules): সব বর্ডার nil ⇒ বর্ডারের পুরুত্ব ০; a18 (rowBand): একই ব্যান্ডের ভেতরের সারিতে top=nil ⇒ বর্ডারের পুরুত্ব ০
    const formFixTbl = !!(fzOn('FORMFIX'));
    const BA = (item.borderless || (formFixTbl && item.noVRules && !globalThis.__FZ_ON_NOVGRAY)) ? 0 : 0.75;
    const RB0 = !item.borderless && Array.isArray(item.rowBand) && item.rowBand.length === rows.length ? item.rowBand : null;
    const rowBA = (ri) => (formFixTbl && RB0 && ri > 0 && RB0[ri - 1] === RB0[ri] ? 0 : BA);
    // [Rule FB4: FZ_OFF=FORMFIX / FZ_OFF=FB4] ছকের সারিতে w:hRule="exact"-এর বদলে "atLeast" ব্যবহৃত হবে এবং Word-এর বর্ডার-পুরুত্ব (rowBA = 0.75pt) বাদ দিয়ে w:val লেখা হবে।
    const gfAtLeast = !!(item.gridFirst || (formFixTbl && !globalThis.__FZ_OFF_FB4));
    const trPrFor = (r, ri) => rh.fitted
      ?`<w:trPr><w:trHeight w:val="${tw(rh[ri].exact && !gfAtLeast ? rh[ri].h : Math.max(1, rh[ri].h - rowBA(ri)))}" w:hRule="${rh[ri].exact && !gfAtLeast ? 'exact' : 'atLeast'}"/></w:trPr>`
      : isEmpty(r, ri) && rowH ? `<w:trPr><w:trHeight w:val="${tw(gfAtLeast ? Math.max(1, rowH * 0.4 - rowBA(ri)) : rowH * 0.4)}" w:hRule="${gfAtLeast ? 'atLeast' : 'exact'}"/></w:trPr>`
      : (rowH > (item.fontPt || 11) * 1.3
        // ছোট লেখার সারি (আরবি/একশব্দ) ⇒ "ঠিক" মূলের উচ্চতা (Word-এর বাড়তি লাইন-উচ্চতায় পাতা উপচাত); লম্বা লেখা ⇒ "অন্তত"
        ? (() => { const ex = !gfAtLeast && !figRows.has(ri) && r.every((c) => String(c || '').length <= 25) && rowH >= (item.fontPt || 11) * 1.6;
          return `<w:trPr><w:trHeight w:val="${tw(ex ? rowH : Math.max(1, rowH - rowBA(ri)))}" w:hRule="${ex ? 'exact' : 'atLeast'}"/></w:trPr>`; })() : '');
    // Part-17.8: মাপা কলাম-প্রস্থ (থাকলে), নইলে সমান ভাগ
    const fr0 = item.colFractions && item.colFractions.length === nCols ? item.colFractions : null;
    // ২০২৬-১০-১৪ (a16 p6, মালিকের Word-যাচাই): সরু কলামের এক-শব্দের শিরোনাম ("হ্যাঁ", "মন্তব্য") Word-এ ভেঙে "হ্যা/ঁ", "মন্তব/্য" ⇒
    // শিরোনাম-সারির এক-শব্দের ঘর এক লাইনে না আঁটলে প্রয়োজনমতো চওড়া, সবচেয়ে চওড়া কলাম থেকে নিয়ে (সেটি ≥১৫% থাকে)। বন্ধ: FZ_OFF=HEADW
    const fr = (() => {
      if (globalThis.__FZ_OFF_HEADW || item.borderless || (!globalThis.__FZ_OFF_FILLW2 && item.fillW2) || !rows[0] || rows.length < 2) return fr0;
      const f = (fr0 || new Array(nCols).fill(1 / nCols)).slice(), tot = colW * nCols / 20, fs = item.fontPt || 11;
      let changed = false;
      rows[0].forEach((c, k) => {
        const t = String(c || '').replace(/\*\*/g, '').trim();
        const baseLen = t.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
        if (k >= nCols || !t || (/\s/.test(t) && baseLen > 6) || t.startsWith(BOX_MARK) || /</.test(t)) return;
        if (!globalThis.__FZ_OFF_FILLW2 && item.fullVRule && (item.fullVRule[k - 1] || item.fullVRule[k])) return;
        const need = (baseLen * fs * (/\s/.test(t) ? 0.58 : 0.55) + 2 * marPt + 2) / tot;
        if (f[k] >= need) return;
        const j = f.indexOf(Math.max(...f)), d = need - f[k];
        if (j === k || f[j] - d < 0.15) return;
        f[j] -= d; f[k] += d; changed = true;
      });
      return changed ? f : fr0;
    })();
    const cw = (k) => fr ? Math.round(colW * nCols * fr[k]) : colW;
    // a18: একই রেখা-ভাগের (layout-ir rowBand) পাশাপাশি সারির মাঝে দাগ নেই (মূলে নেই), এবং গ্রিড-প্রথম ছকে (vRuleBands) যে ব্যান্ডে খাড়া দাগ নেই সেখানে left/right বর্ডার nil
    const RB = !item.borderless && Array.isArray(item.rowBand) && item.rowBand.length === rows.length ? item.rowBand : null;
    const VRB = !item.borderless && Array.isArray(item.vRuleBands) ? item.vRuleBands : null;
    const VM = !item.borderless && Array.isArray(item.vMerges) ? item.vMerges : null;
    const bandBorders = (ri, k, span) => {
      const vmHere = VM && VM[ri] && VM[ri][k];
      const vmNext = VM && VM[ri + 1] && VM[ri + 1][k];
      const t = (RB && ri > 0 && RB[ri - 1] === RB[ri]) || vmHere === 'continue';
      const b = (RB && ri < rows.length - 1 && RB[ri + 1] === RB[ri]) || vmNext === 'continue';
      let lNil = false, rNil = false;
      if (VRB && VRB[ri]) {
        const endCol = k + (span || 1) - 1;
        if (k > 0 && VRB[ri][k - 1] === false) lNil = true;
        if (endCol < nCols - 1 && VRB[ri][endCol] === false) rNil = true;
      }
      return (t || b || lNil || rNil)
        ? `<w:tcBorders>${t ? '<w:top w:val="nil"/>' : ''}${b ? '<w:bottom w:val="nil"/>' : ''}${lNil ? '<w:left w:val="nil"/>' : ''}${rNil ? '<w:right w:val="nil"/>' : ''}</w:tcBorders>`
        : '';
    };
    // ২০২৬-১০-১৪ (2.pdf): দাগহীন ছকের মাপা আড়া-রেখা (layout-ir ruleSpans, আয়তের অনুপাতে) ⇒ নিকটতম সারি-সীমার ঘরে ওপর/নিচ-বর্ডার,
    // শুধু যে ঘরগুলোর অর্ধেকের বেশি রেখার বিস্তারে পড়ে (মূলে "সর্বমোট"-এর ওপরের দাগ ক্রমিক-কলাম বাদে)
    const ruleAt = {};
    if (item.borderless && Array.isArray(item.ruleSpans) && item.ruleSpans.length) {
      const hs = rows.map((r, ri) => (rh.fitted && rh[ri] ? rh[ri].h : 1)), tot = hs.reduce((a, b) => a + b, 0) || 1;
      const cum = [0]; hs.forEach((h) => cum.push(cum[cum.length - 1] + h / tot));
      const ce = [0]; for (let k = 0; k < nCols; k++) ce.push(ce[k] + (fr ? fr[k] : 1 / nCols));
      item.ruleSpans.forEach((s) => {
        let i = 0; cum.forEach((c, j) => { if (Math.abs(c - s.fy) < Math.abs(cum[i] - s.fy)) i = j; });
        const ri = i === rows.length ? rows.length - 1 : i, side = i === rows.length ? 'bottom' : 'top';
        for (let k = 0; k < nCols; k++) {
          const ov = Math.min(ce[k + 1], s.fx1) - Math.max(ce[k], s.fx0);
          if (ov >= (ce[k + 1] - ce[k]) * 0.5) ruleAt[ri + ':' + k] = side;
        }
      });
    }
    const ruleBorder = (ri, k, span) => {
      for (let j = k; j < k + (span || 1); j++) { const sd = ruleAt[ri + ':' + j]; if (sd) return `<w:tcBorders><w:${sd} w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tcBorders>`; }
      return '';
    };
    // a18: জোড়া ঘর (rowSpans বা gridSpans) ⇒ gridSpan, প্রস্থ = জোড়া কলামগুলোর যোগফল
    const hasBoxRow = rows.some((r) => r.some((c) => typeof c === 'string' && c.startsWith(BOX_MARK)));
    const trs = rows.map((r, ri) => {
      const sp = (item.gridSpans && item.gridSpans[ri]) ? item.gridSpans[ri].slice() : rowSpans(r, ri, nCols, (k) => cw(k) / 20, item.fontPt || 11, marPt, figRows, item.fullVRule, VM && VM[ri]);
      if (formKitOn() && item._cellMeta && item._cellMeta[ri]) {
        item._cellMeta[ri].forEach((cm, ck) => {
          const cs = cm && (cm.span || cm.gridSpan || cm.colSpan);
          if (cs > 1 && sp[ck] > 0) {
            const maxS = Math.min(cs, nCols - ck);
            sp[ck] = maxS;
            for (let j = ck + 1; j < ck + maxS; j++) sp[j] = 0;
          }
        });
      }
      if (ri === rows.length - 1 && item.lastRowSpan > 1 && item.lastRowSpan <= nCols) { sp[0] = item.lastRowSpan; for (let j = 1; j < item.lastRowSpan; j++) sp[j] = 0; }
      // ২০২৬-১০-১৪ (a19/a18): মূল ফরমে উঁচু সারির ছোট ঘর (ক্রমিক "৬।", "নাম/পদবি", পাশের ২-লাইনের পাশে ১-লাইনের শিরোনাম) ওপরে —
      // সারির সবচেয়ে বেশি লাইনের ঘরের চেয়ে কম লাইন ⇒ vAlign top; সমান হলে আগের মতো মাঝে
      // মাপা: a16 +১.২, a17 +২, a07 +১, a19 +২; f1 −২.৮ (সংখ্যা-বাক্সের লেবেল|মান ফরম — মূলে মাঝে) ⇒ বাক্স-ছকে বন্ধ (FZ_OFF=VTOP)
      const spW = (k) => { let w = 0; for (let j = k; j < k + sp[k]; j++) w += cw(j); return w; };
      const lnOf = (k) => (sp[k] && r[k] && String(r[k]).trim() && !String(r[k]).startsWith(BOX_MARK) && !figRows.has(ri)
        ? wrapLines(r[k], item.fontPt || 11, spW(k) / 20 - 2 * (item.gridFirst && !item.borderless && spW(k) < tw(70) ? (spW(k) < tw(25) ? 0 : 1.4) : (marPt || 5.4))) : 0);
      const lns = Array.from({ length: nCols }, (_, k) => lnOf(k)), maxLn = Math.max(...lns);
      const tcs = Array.from({ length: nCols }, (_, k) => {
        if (!sp[k]) return '';
        const w = spW(k);
        // a17 p10: শিরোনাম-সারিতে মাপা খাড়া অবস্থান (layout-ir headVAlign) থাকলে সেটিই
        const hv = ri === 0 && item.headVAlign && item.headVAlign.length === nCols ? item.headVAlign[k] : null;
        // ২০২৬-১০-১৪ (a17 p6): অনুচ্ছেদ-ঘর (≥৩ লাইন বা উঁচু সারি) ও ক্রমিক-সারির ঘর মূলে সারির ওপরে শুরু (১-লাইনের সাধারণ সারি মাঝে থাকে: part-17.5 টেস্ট)। বন্ধ: FZ_OFF=VTOP4
        const curH = rh && rh[ri] ? rh[ri].h : rowH;
        const isSerRow = /^\s*\(?[০-৯0-9]{1,2}\s*[।.)]/.test(String(r[0] || ''));
        const hasBlankCell = r.some((c) => !(c && String(c).trim()));
        const tallRow = !globalThis.__FZ_OFF_VTOP4 && (curH >= (item.fontPt || 11) * 2.5 || (!item.headShade && ((isSerRow && maxLn >= 2) || ((ri > 0 || isSerRow) && curH >= (item.fontPt || 11) * 1.9 && hasBlankCell))));
        const rowHasBox = hasBoxRow || r.some((c) => typeof c === 'string' && c.startsWith(BOX_MARK));
        const sparseSerialTop = ri > 0 && k === 0 && maxLn === 1 && lns[0] === 1 && r.slice(1).every((c) => !(c && String(c).trim())) && curH >= (item.fontPt || 11) * 2;
        const va = hv ? (hv === 't' ? 'top' : 'center') : !globalThis.__FZ_OFF_VTOP && !rowHasBox && !item.noVRules && lns[k] && (sparseSerialTop || (!item.headShade && (isSerRow || hasBlankCell) && tallRow) || (maxLn >= 2 && (lns[k] < maxLn || ((maxLn >= 3 || tallRow) && !globalThis.__FZ_OFF_VTOP4)))) ? 'top' : 'center';
        // a02 + B9: শিরোনাম-সারি, লেবেল-কলাম বা ঘরের পটভূমি-রং (headShade / fill / cellFills)
        const tcFill = formKitOn() ? resolveCellFill(ri, k, r) : (ri === 0 && item.headShade ? item.headShade : null);
        const shd = tcFill ? `<w:shd w:val="clear" w:color="auto" w:fill="${tcFill}"/>` : '';
        // [Rule FB5: FZ_OFF=FORMFIX / FZ_OFF=FB5] bandBorders নিজেই উল্লম্ব-মার্জ করা ঘরের মাঝের বর্ডার nil করে দেয়; তাই <w:vMerge/> ট্যাগ বাদ রেখে প্রতিটি সারি এডিট-যোগ্য রাখা এবং অঙ্ক-বাক্সের সরু ঘরে (<=24pt) tcMar শূন্য রাখা।
        const vm = VM && VM[ri] && VM[ri][k];
        const vmXml = (formFixTbl && !globalThis.__FZ_OFF_FB5 && !tableGridOn()) ? '' : (vm === 'restart' ? '<w:vMerge w:val="restart"/>' : vm === 'continue' ? '<w:vMerge/>' : '');
        const tcMarXml = (item.gridFirst || (formFixTbl && !globalThis.__FZ_OFF_FB5 && w <= tw(24))) && !item.borderless && w < tw(70) ? `<w:tcMar><w:left w:w="${w < tw(25) ? 0 : 28}" w:type="dxa"/><w:right w:w="${w < tw(25) ? 0 : 28}" w:type="dxa"/></w:tcMar>` : '';
        return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${sp[k] > 1 ? `<w:gridSpan w:val="${sp[k]}"/>` : ''}${vmXml}${bandBorders(ri, k, sp[k]) || ruleBorder(ri, k, sp[k])}${shd}${tcMarXml}<w:vAlign w:val="${va}"/></w:tcPr>${cellBody(vm === 'continue' ? '' : r[k], ri, k, w)}</w:tc>`;
      }).join('');
      return '<w:tr>' + trPrFor(r, ri) + tcs + '</w:tr>';
    }).join('');
    const tblRuleBelowXml = formFixTbl && !globalThis.__FZ_OFF_IR7 && item.borderless && item.ruleBelow
      ? `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="${item.ruleBelow.sz || 6}" w:space="0" w:color="000000"/></w:pBdr><w:spacing w:before="0" w:after="0" w:line="4" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>`
      : '';
    return spacer((item.spaceBeforePt || 0) + (extraBeforePt || 0)) +
      // ২০২৬-১০-১৩: Word বাঁ-বর্ডার বসায় tblInd − ঘরের-ফাঁকে (মাপা: a08/a02 টেবিল ঠিক ২×৫.৪pt বাঁয়ে ছিল) ⇒ সীমানাওয়ালা: বর্ডার মাপা
      // বাঁ-প্রান্তে (+ফাঁক); সীমানাহীন: লেখা মাপা বাঁ-প্রান্তে (tblInd = ইনডেন্ট)
      `<w:tbl><w:tblPr><w:tblW w:w="${colW * nCols}" w:type="dxa"/><w:tblInd w:w="${Math.round((item.indentPt || 0) * 20 + (item.borderless || (formFixTbl && item.noVRules) ? 0 : (item.gridFirst && cw(0) < tw(70) ? (cw(0) < tw(25) ? 0 : 28) : cellMarTw)))}" w:type="dxa"/>${BV}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="${cellMarTw}" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="${cellMarTw}" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${Array.from({ length: nCols }, (_, k) => `<w:gridCol w:w="${cw(k)}"/>`).join('')}</w:tblGrid>${trs}</w:tbl>${tblRuleBelowXml}`;
  }

  /** সংখ্যা-বাক্সের সারি: n ঘরের ছোট সীমানাওয়ালা টেবিল (বাক্স ≤১৮pt), শেষে খালি অনুচ্ছেদ (ঘর অনুচ্ছেদে শেষ হতেই হবে) */
  function boxRowXml(cells, availPt) {
    const n = Math.max(1, cells.length), bw = tw(Math.max(8, Math.min(18, (availPt - 2) / n)));
    const BB = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('') + '</w:tblBorders>';
    const va = formKitOn() ? '<w:vAlign w:val="center"/>' : '';
    const trP = formKitOn() ? `<w:trPr><w:trHeight w:val="${tw(16)}" w:hRule="atLeast"/></w:trPr>` : '';
    const tcs = cells.map((c) => `<w:tc><w:tcPr><w:tcW w:w="${bw}" w:type="dxa"/>${va}</w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>${c ? runsFor(c, { fontPt: 9, align: 'c' }) : ''}</w:p></w:tc>`).join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="${bw * n}" w:type="dxa"/>${BB}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${cells.map(() => `<w:gridCol w:w="${bw}"/>`).join('')}</w:tblGrid><w:tr>${trP}${tcs}</w:tr></w:tbl>` +
      '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>';
  }

  /**
   * ২০২৬-১০-১৪ (a16 p6, মালিকের Word-যাচাই): ঘরের ভেতরের ছক Gemini HTML-এ দেয় ("<table><tr><td>ক্রঃ নং</td>…") ⇒ হুবহু ছাপা হতো।
   * ⇒ {pre, rows, post}; না থাকলে null। বন্ধ: FZ_OFF=SUBTBL
   */
  function subTable(txt) {
    if (globalThis.__FZ_OFF_SUBTBL || typeof txt !== 'string' || !/<table\b/i.test(txt)) return null;
    const mt = /<table\b[^>]*>([\s\S]*?)(?:<\/table>|$)/i.exec(txt);
    const strip = (s) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<(?!\/?u>)[^>]+>/gi, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
    const rows = [...mt[1].matchAll(/<tr\b[^>]*>([\s\S]*?)(?:<\/tr>|(?=<tr\b)|$)/gi)]
      .map((r) => [...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)(?:<\/t[dh]>|(?=<t[dh]\b)|$)/gi)].map((c) => strip(c[1])))
      .filter((r) => r.length);
    if (!rows.length) return null;
    const n = Math.max(...rows.map((r) => r.length));
    rows.forEach((r) => { while (r.length < n) r.push(''); });
    // মূলে শিরোনাম-সারির নিচে পূরণের ফাঁকা সারি; Gemini শুধু শিরোনাম দিলে একটি ফাঁকা সারি
    if (rows.length === 1) rows.push(new Array(n).fill(''));
    return { pre: txt.slice(0, mt.index).trim(), rows, post: txt.slice(mt.index + mt[0].length).trim() };
  }

  function subTableXml(rows, availPt, fsz) {
    const n = rows[0].length, fs = Math.max(7, Math.min(9, fsz - 2));
    // কলাম-প্রস্থ লেখার দৈর্ঘ্যের বর্গমূল-অনুপাতে (লম্বা শিরোনাম চওড়া, "ক্রঃ নং" সরু)
    const wt = rows[0].map((_, j) => 1.5 + Math.sqrt(Math.max(...rows.map((r) => String(r[j] || '').length))));
    const tot = wt.reduce((a, b) => a + b, 0), ws = wt.map((x) => tw(Math.max(14, (availPt - 2) * x / tot)));
    const BB = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('') + '</w:tblBorders>';
    const trs = rows.map((r) => {
      const blank = !r.some((c) => c && String(c).trim());
      const trPr = blank ? `<w:trPr><w:trHeight w:val="${tw(fs * 2)}" w:hRule="atLeast"/></w:trPr>` : '';
      const ffSub = !!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_FB6);
      return `<w:tr>${trPr}${r.map((c, j) => {
        const subSz = ffSub ? Math.min(Math.round(fs * 2), Math.max(4, Math.floor((((ws[j] / 20 - 2.8) + 2.5) / 6.2) * 2))) : 0;
        const subRpr = !c && subSz ? `<w:rPr><w:sz w:val="${subSz}"/><w:szCs w:val="${subSz}"/></w:rPr>` : '';
        return `<w:tc><w:tcPr><w:tcW w:w="${ws[j]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${String(c || '').split('\n').map((t) => `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/>${subRpr}</w:pPr>${t ? runsFor(t, { fontPt: fs, align: 'c' }) : ''}</w:p>`).join('')}</w:tc>`;
      }).join('')}</w:tr>`;
    }).join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="${ws.reduce((a, b) => a + b, 0)}" w:type="dxa"/>${BB}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="28" w:type="dxa"/><w:right w:w="28" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${ws.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${trs}</w:tbl>` +
      '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>';
  }

  function gridXml(band, ctx) {
    const widths = band.cells.map((c) => Math.max(tw(20), tw(c.x1 - c.x0)));
    if (formKitOn() && band.cells.length >= 2) {
      for (let k = 1; k < band.cells.length; k++) {
        const c = band.cells[k];
        if (!c.items || c.items.length !== 1 || c.items[0].kind !== 'para') continue;
        const it = c.items[0], ls = (it.lines || []).filter(Boolean);
        const raw = String(it.text || (ls[0] || '')).trim();
        const cleanLen = raw.replace(/\*\*|<[^>]+>/g, '').replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
        if (ls.length <= 1 && cleanLen > 0 && cleanLen <= 24) {
          const needTw = tw(cleanLen * (it.fontPt || 12) * 0.62 + 10);
          if (widths[k] < needTw && widths[k - 1] > needTw + tw(30)) {
            const diff = needTw - widths[k];
            widths[k - 1] -= diff;
            widths[k] += diff;
          }
          it.noWrap = true;
          if (it.indentPt && tw(it.indentPt) + needTw > widths[k]) {
            it.indentPt = Math.max(0, (widths[k] - needTw) / 20);
          }
        }
      }
    }
    const ffGrid = !!(fzOn('FORMFIX') && !globalThis.__FZ_OFF_FB7);
    const endP = ffGrid ? CELL_END.replace('w:line="20"', 'w:line="4"') : CELL_END;
    const NIL = '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
    const tcs = band.cells.map((c, k) => {
      const ens = c.items.map((it) => ({ it, ids: it.boxIds || [], before: it.spaceBeforePt || 0, top: it.rect ? it.rect.y : null, h: itemH(it) }));
      const subCtx = Object.assign({}, ctx, { availW: c.x1 - c.x0 });
      const inner = emitSeq(ens, 0, c.x0, c.x1, (en, L, R) => paraXml(Object.assign(shiftInto(en.it, c.x0, c.x1, L, R), { spaceBeforePt: en.before }), 0, Object.assign({}, subCtx, { availW: R - L, inDashedBox: (en.ids || []).some((id) => (ctx.boxes || []).some((bx) => bx.id === id && bx.dashed)) })), ctx.boxes || []) || '<w:p/>';
      // ঘর অনুচ্ছেদে শেষ হতেই হবে; খালি <w:p/> .doc-এ মাপহীন &nbsp; লাইন (+১৪pt/সারি, a02 ২ পাতা) ⇒ মাপ-দেওয়া ক্ষুদ্র অনুচ্ছেদ (FZ_OFF=CELLEND)
      const safe = /<\/w:p>\s*$/.test(inner) ? inner : inner + (globalThis.__FZ_OFF_CELLEND ? '<w:p/>' : endP);
      // Part-17.8: কলামের মাঝের খাড়া দাগ (মূলে থাকলে)
      const rule = c.ruleRight ? '<w:tcBorders><w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tcBorders>' : '';
      const gShd = formKitOn() && normHex(c.fill || c.shade) ? `<w:shd w:val="clear" w:color="auto" w:fill="${normHex(c.fill || c.shade)}"/>` : '';
      return `<w:tc><w:tcPr><w:tcW w:w="${widths[k]}" w:type="dxa"/>${rule}${gShd}</w:tcPr>${safe}</w:tc>`;
    }).join('');
    const gridRuleBelowXml = ffGrid && !globalThis.__FZ_OFF_IR7 && band.ruleBelow
      ? `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="${band.ruleBelow.sz || 6}" w:space="0" w:color="000000"/></w:pBdr><w:spacing w:before="0" w:after="0" w:line="4" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>`
      : '';
    return spacer(band.gapBeforePt) +
      `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/>${NIL}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid><w:tr>${tcs}</w:tr></w:tbl>${gridRuleBelowXml}`;
  }

  // ২০২৬-১০-১২: বাক্স (layout-ir applyBoxFrames) — ভেতরের অংশ এক-ঘরের টেবিলে, ঘরের চার পাশে বর্ডার (ড্যাশ হলে ড্যাশ)।
  // লেখা প্রবাহী/সম্পাদনযোগ্য থাকে; ঘরের ভেতরের ফাঁক শূন্য ⇒ লেখার অবস্থান ইনডেন্ট দিয়েই
  const TINY = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="4" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>';
  const CELL_END = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r></w:p>';
  function boxTableXml(box, innerXml, leftPt) {
    const w = Math.max(tw(20), tw(box.x1 - box.x0));
    const v = formKitOn()
      ? (box.dashDot || box.style === 'dotDash' || box.style === 'dashDot' || box.style === 'dash-dot' || box.borderStyle === 'dotDash' || box.borderStyle === 'dashDot'
        ? 'dotDash'
        : (box.dashed || box.style === 'dashed' || box.borderStyle === 'dashed' ? 'dashed' : (box.style === 'double' ? 'double' : (box.style === 'dotted' ? 'dotted' : 'single'))))
      : (box.dashed ? 'dashed' : 'single');
    const bCol = (formKitOn() && normHex(box.borderColor || box.color)) || '000000';
    const bd = ['top', 'left', 'bottom', 'right'].map((s) => `<w:${s} w:val="${v}" w:sz="${box.sz || 6}" w:space="0" w:color="${bCol}"/>`).join('');
    const NIL = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="nil"/>`).join('') + '</w:tblBorders>';
    const MAR = '<w:tblCellMar>' + ['top', 'left', 'bottom', 'right'].map((s) => `<w:${s} w:w="0" w:type="dxa"/>`).join('') + '</w:tblCellMar>';
    const bShd = formKitOn() && normHex(box.fill || box.shade) ? `<w:shd w:val="clear" w:color="auto" w:fill="${normHex(box.fill || box.shade)}"/>` : '';
    const bVa = formKitOn() && box.vAlign ? `<w:vAlign w:val="${box.vAlign}"/>` : '';
    const bTrPr = formKitOn() && box.heightPt > 0 ? `<w:trPr><w:trHeight w:val="${tw(box.heightPt)}" w:hRule="exact"/></w:trPr>` : '';
    const safe = /<\/w:p>\s*$/.test(innerXml) ? innerXml : innerXml + TINY;    // ঘর অনুচ্ছেদে শেষ হতেই হবে
    return `<w:tbl><w:tblPr><w:tblW w:w="${w}" w:type="dxa"/><w:tblInd w:w="${tw(box.x0 - leftPt)}" w:type="dxa"/>${NIL}<w:tblLayout w:type="fixed"/>${MAR}</w:tblPr><w:tblGrid><w:gridCol w:w="${w}"/></w:tblGrid><w:tr>${bTrPr}<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:tcBorders>${bd}</w:tcBorders>${bShd}${bVa}</w:tcPr>${safe}</w:tc></w:tr></w:tbl>`;
  }
  /** আধার [L,R] থেকে [nL,nR]-এ সরানো অংশের ইনডেন্ট/ট্যাব/মাঝে-বসানো (অপরিবর্তিত আধারে একই বস্তু) */
  function shiftInto(it, L, R, nL, nR) {
    if (Math.abs(nL - L) < 0.05 && Math.abs(nR - R) < 0.05) return it;
    const dx = nL - L, o = Object.assign({}, it);
    if (o.indentPt != null) o.indentPt = Math.max(0, o.indentPt - dx);
    if (o.tabStops) o.tabStops = o.tabStops.map((t) => (formKitOn() && t && typeof t === 'object' ? Object.assign({}, t, { pos: Math.max(1, (t.pos != null ? t.pos : t.x) - dx) }) : Math.max(1, t - dx)));
    if (o.centerShiftPt != null) o.centerShiftPt -= (nL + nR) / 2 - (L + R) / 2;
    if (o.rightIndentPt != null) o.rightIndentPt = Math.max(0, o.rightIndentPt - (R - nR));
    if (o.justRightPt != null) o.justRightPt = Math.max(0, o.justRightPt - (R - nR));
    // a14 (২০২৬-১০-১৩): ওপরের রেখার ইনডেন্ট পাতা-মাপের ছিল ⇒ বাক্সের সরু ঘরে প্রস্থ ঋণাত্মক, শিরোনাম ২১ লাইনে ভেঙে পাতা উপচাত।
    // আধারে সরানো; রেখা পুরো আধার জুড়ে হলে সেটা বাক্সেরই কিনারা ⇒ বাদ
    if (o.ruleAbove) {
      const ra = Object.assign({}, o.ruleAbove, { indL: o.ruleAbove.indL - dx, indR: o.ruleAbove.indR - (R - nR) });
      o.ruleAbove = ra.indL < 3 && ra.indR < 3 ? null : Object.assign(ra, { indL: Math.max(0, ra.indL), indR: Math.max(0, ra.indR) });
    }
    return o;
  }
  // (২০২৬-১০-১৩: দুপাশে-সমান লেখার ডান-ইনডেন্ট মূলের মাপে চেষ্টা বাতিল — সরু হলে আমাদের সামান্য চওড়া ফন্টে লাইন মুড়ে a13 ৯৩→৮০)
  /** গ্রিড-ব্যান্ড নতুন আধারে: প্রথম ঘরের বাঁ আর শেষ ঘরের ডান কিনারা আধারের সাথে */
  function shiftBand(band, nL, nR) {
    const cells = band.cells.map((c) => Object.assign({}, c)), a = cells[0], z = cells[cells.length - 1];
    const fix = (c, x0, x1) => { c.items = c.items.map((it) => shiftInto(it, c.x0, c.x1, x0, x1)); c.x0 = x0; c.x1 = x1; };
    if (a.x0 !== nL) fix(a, nL, a === z ? Math.min(a.x1, nR) : a.x1);
    if (z !== a && z.x1 > nR) fix(z, z.x0, nR);
    return Object.assign({}, band, { cells });
  }
  /**
   * অংশের ধারা লেখা; একই বাক্সের (ids[depth]) পরপর অংশ এক মোড়কে। বাক্সের ওপর-ফাঁক (বাক্স-কিনারা থেকে প্রথম লেখা) ভেতরে,
   * বাকি আগের-ফাঁক বাইরে; নিচের ফাঁক ভেতরে আর পরের অংশের আগের-ফাঁক থেকে বাদ — উল্লম্ব নকশা অপরিবর্তিত
   */
  let lastCarry = 0;

  /**
   * ২০২৬-১০-১৩ নির্ণয়-মাত্র (FZ_ON=ANCHOR; ডিফল্টে বন্ধ, চূড়ান্ত সমাধান নয় — মালিক: সম্পাদনযোগ্যতা আগে): শীর্ষ-স্তরের প্রতিটি অংশ
   * মূলের মাপা y-তে আটকানো (অনুচ্ছেদ ⇒ framePr, ছক ⇒ ভাসমান tblpPr) ⇒ প্রবাহে উচ্চতা-ভুল জমার স্কোর-খরচ মাপা।
   * ছবি-যুক্ত বা ভেতরে ছকওয়ালা অনুচ্ছেদ-অংশ অপরিবর্তিত।
   */
  function anchorXml(xml, topPt, L, R) {
    const x = tw(L), y = tw(topPt), w = tw(R - L);
    const body = xml.replace(/^(<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="\d+" w:lineRule="exact"\/><w:rPr><w:sz w:val="2"\/><\/w:rPr><\/w:pPr><\/w:p>)+/, '');
    if (body.startsWith('<w:tbl>')) {
      return body.replace('<w:tblPr>', `<w:tblPr><w:tblpPr w:leftFromText="0" w:rightFromText="0" w:topFromText="0" w:bottomFromText="0" w:vertAnchor="page" w:horzAnchor="page" w:tblpX="${x}" w:tblpY="${y}"/><w:tblOverlap w:val="overlap"/>`);
    }
    if (/<w:tbl>|<wp:anchor|<wp:inline/.test(body)) return xml;
    const fp = `<w:framePr w:w="${w}" w:wrap="around" w:vAnchor="page" w:hAnchor="page" w:x="${x}" w:y="${y}"/>`;
    return body.replace(/<w:pPr>/g, '<w:pPr>' + fp).replace(/<w:p>(?!<w:pPr>)/g, `<w:p><w:pPr>${fp}</w:pPr>`);
  }
  function emitSeq(entries, depth, L, R, render, boxes) {
    let out = '', i = 0, carry = 0, prevBox = false;
    while (i < entries.length) {
      const id = entries[i].ids[depth];
      const b = id != null ? boxes.find((x) => x.id === id) : null;
      let j = i + 1;
      if (b) while (j < entries.length && entries[j].ids[depth] === id) j++;
      const grp = entries.slice(i, j).map((x) => Object.assign({}, x));
      // বাড়তি উচ্চতা পরের ফাঁকে না আঁটলে বাকিটা তার পরের অংশে (নইলে ভরা পাতায় শেষ লাইন পরের পাতায় — f2)
      const b0 = grp[0].before;
      grp[0].before = Math.max(0, b0 - carry); carry = Math.max(0, carry - b0);
      if (globalThis.__FZ_ON_ANCHOR && depth === 0) grp[0].before = 0;   // আটকানো অবস্থানে আগের-ফাঁক লাগে না
      let xml;
      if (!b) xml = render(grp[0], L, R);
      else {
        // উল্লম্ব: বাক্সের ওপর-কিনারা b.y0-তে (বাইরের ফাঁক), লেখা মূলের দূরত্বে; ভেতরের সব অংশের নিচ (ভেতরের বাক্সসহ) থেকে
        // b.y1 পর্যন্ত নিচের ফাঁক; বর্ডার/বাড়তি অনুচ্ছেদসহ মোট যত বাড়ল ততটুকু পরের অংশের আগের-ফাঁক থেকে বাদ (carry)
        const f0 = grp[0], z = grp[grp.length - 1];
        if (f0.top == null || z.top == null) xml = spacer(f0.before) + boxTableXml(b, emitSeq(grp.map((x, k) => (k ? x : Object.assign({}, x, { before: 0 }))), depth + 1, b.x0, b.x1, render, boxes), L);
        else {
          // ২০২৬-১০-১৩: সব উচ্চতা নকশার (planPage) হিসাবে — আগে বাক্সের শেষ মূলের মাপে ধরা হতো, অথচ পরের ফাঁক নকশার
          // চলমান অবস্থান থেকে ⇒ f2-এ ফ্রেমের পরে ১২pt বাড়তি
          const g0 = f0.before;
          const spanP = grp.reduce((a, x, k) => a + (k ? x.before : 0) + x.h, 0);
          // পটিওয়ালা প্রথম অনুচ্ছেদ (a03 কালো পটি) ⇒ পটির কিনারাই বাক্সের কিনারা (মাঝে ফাঁক রাখলে আলাদা দাগ হয়)
          const bw = (b.sz || 6) / 8, shaded = !!(f0.e ? f0.e.it && f0.e.it.shade : f0.it && f0.it.shade);
          const lead = shaded ? 0 : Math.max(0, f0.top - b.y0);
          const outside = Math.max(0, g0 - lead - bw);   // বর্ডারের পুরুত্বও ফাঁক থেকে
          f0.before = 0;
          const inner = emitSeq(grp, depth + 1, b.x0, b.x1, render, boxes);
          const innerAct = spanP + lastCarry;            // ভেতরের বাক্সগুলোর বাড়তিসহ
          // লেখার আয়ত বাক্সের কিনারা-ছোঁয়া (Gemini বাক্সসহ দিলে) ⇒ ফাঁকা জায়গা ওপর-নিচে সমান
          const free = b.y1 - b.y0 - innerAct;
          const padTop = !shaded && lead < 2 && free > 2 ? free / 2 : lead;
          const padB = clamp(b.y1 - b.y0 - padTop - innerAct, 0, 20);
          const sp = (pt) => (pt > 1 ? pt : 0);          // spacer ≤১pt বসায় না
          const act = sp(outside) + bw + sp(padTop) + innerAct + sp(padB) + bw;
          carry += Math.max(0, act - (g0 + spanP));
          xml = spacer(outside) + boxTableXml(b, spacer(padTop) + inner + spacer(padB), L);
        }
      }
      if (globalThis.__FZ_ON_ANCHOR && depth === 0) { const t = b ? b.y0 : grp[0].top; if (t != null) xml = anchorXml(xml, t, L, R); }
      if (prevBox && xml.startsWith('<w:tbl>')) out += TINY;   // পাশাপাশি দুই টেবিল Word এক করে ফেলে
      out += xml; prevBox = !!b; i = j;
    }
    lastCarry = carry;   // ডাকা বাক্সের জন্য: এই ধারার না-মেটানো বাড়তি উচ্চতা
    // ধারার শেষে মোড়ক ⇒ ক্ষুদ্র অনুচ্ছেদ (ঘর/পাতা অনুচ্ছেদে শেষ হতে হয়; নইলে ডাকা জায়গা ডিফল্ট-উচ্চতার <w:p/> বসাত)
    return prevBox ? out + TINY : out;
  }

  function sectPr(page, isLast) {
    const m = page.margins;
    // a09: নিচের মার্জিন মূলের শেষ লাইন পর্যন্ত মাপা ⇒ কয়েক pt বাড়তি উচ্চতাতেই শেষ অনুচ্ছেদ পরের পাতায় (সব পরের পাতা এক ঘর সরে)।
    // লেখা ওপর থেকে বসে ⇒ নিচের মার্জিন কমালে অবস্থান বদলায় না, শুধু ছাড় বাড়ে (ফ্রেমের পাতায় নয় — নিচের বর্ডার নামত)
    // ২০২৬-১০-১২: তলা ১৮→১০pt (f2: মূলের লেখা নিচ থেকে ১৬pt পর্যন্ত ⇒ ১৮pt-এ শেষ লাইন পরের পাতায়)
    const bottom = page.frame ? m.bottom : Math.min(m.bottom, Math.max(10, m.bottom - 36));
    // প্রতিটি সেকশন (মূলের প্রতিটি পাতা) নতুন পাতায় শুরু — DOCX-নিয়মে type সেকশনের নিজের শুরু বোঝায়
    // Part-17.7: মূল পাতার বর্ডার-ফ্রেম (একক/দ্বৈত) — লেখা থেকে মাপা দূরত্বে (Word-সীমা ≤৩১pt)
    let borders = '';
    if (page.frame) {
      const v = page.frame.style === 'double' ? 'double' : 'single', sp = page.frame.spacePt || {};
      if (pgBorderOn()) {
        // B8: পাতার কিনারা থেকে দূরত্ব ≤৩১pt হলে offsetFrom="page" ও কিনারা-দূরত্ব ব্যবহারযোগ্য;
        // >৩১pt হলে Word-এর ৩১pt সীমার কারণে offsetFrom="text" রেখে docx-to-doc-এ হুবহু দূরত্ব নেওয়া হয়।
        const mSides = { top: m.top, left: m.left, bottom, right: m.right };
        const edge = {};
        const fitsPageOffset = page.frame.offsetFrom === 'page' || ['top', 'left', 'bottom', 'right'].every((n) => {
          edge[n] = Math.round((mSides[n] || 0) - (sp[n] || 0));
          return edge[n] >= 0 && edge[n] <= 31;
        });
        const mode = page.frame.offsetFrom || (fitsPageOffset ? 'page' : 'text');
        const side = (n) => {
          const valSp = mode === 'page'
            ? (page.frame.offsetFrom === 'page' && sp[n] != null ? Math.round(sp[n]) : Math.round((mSides[n] || 0) - (sp[n] || 0)))
            : Math.round(sp[n] || 0);
          return `<w:${n} w:val="${v}" w:sz="${v === 'double' ? 6 : 12}" w:space="${clamp(valSp, 0, 31)}" w:color="000000"/>`;
        };
        borders = `<w:pgBorders w:offsetFrom="${mode}">${side('top')}${side('left')}${side('bottom')}${side('right')}</w:pgBorders>`;
      } else {
        const side = (n) => `<w:${n} w:val="${v}" w:sz="${v === 'double' ? 6 : 12}" w:space="${Math.round(sp[n] || 0)}" w:color="000000"/>`;
        borders = `<w:pgBorders w:offsetFrom="text">${side('top')}${side('left')}${side('bottom')}${side('right')}</w:pgBorders>`;
      }
    }
    return `<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="${tw(page.widthPt)}" w:h="${tw(page.heightPt)}"${page.widthPt > page.heightPt ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${tw(m.top)}" w:right="${tw(m.right)}" w:bottom="${tw(bottom)}" w:left="${tw(m.left)}" w:header="360" w:footer="360" w:gutter="0"/>${borders}<w:cols w:space="720"/></w:sectPr>`;
  }

  /** নকশা → document.xml-এর body এবং মিডিয়া */
  function bodyXml(ir, opts) {
    if (faithfulStudioOn()) snapshotIrLayout(ir);
    const prevFont = _activeDocxFont;
    if (fontPickOn()) _activeDocxFont = resolveDocxFont((opts && (opts.font || opts.unicodeFont)) || ir);
    try {
    if (fzOn('FORMFIX') && !globalThis.__FZ_OFF_TSYNC30 && ir && Array.isArray(ir.pages)) {
      const noVT = [];
      for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
        for (const it of cell.items || []) if (it && it.kind === 'table' && it.noVRules && it.rows && it.rows.length >= 10) noVT.push(it);
      }
      if (noVT.length >= 2) {
        const maxF = Math.max(...noVT.map((t) => t.fontPt || 10));
        noVT.forEach((t) => { if (t.fontPt < maxF) t.fontPt = maxF; });
      }
    }
    const ctx = { media: [] };
    let xml = '';
    ir.pages.forEach((page, pi) => {
      const isLast = pi === ir.pages.length - 1;
      let pageXml = '';
      const { els, f } = planPage(page);
      const PL = page.margins.left, PR = page.widthPt - page.margins.right;
      ctx.boxes = page.boxes || [];
      ctx.pageScale = page.scale || 1;
      ctx.availW = PR - PL;
      const ens = els.map((e) => ({ e, ids: (e.band ? e.band.boxIds : e.it.boxIds) || [], before: e.before * f,
        top: e.band ? e.band.y0 : (e.it.rect ? e.it.rect.y : null), h: e.h }));
      pageXml += emitSeq(ens, 0, PL, PR, (en, L, R) => {
        const e = en.e;
        if (e.band) {
          const band = Object.assign({}, e.band, {
            gapBeforePt: en.before,
            cells: e.cells.map((c) => Object.assign({}, c.cell, { items: c.its.map((x) => Object.assign({}, x.it, { spaceBeforePt: x.before * f })) }))
          });
          return gridXml(L === PL && R === PR ? band : shiftBand(band, L, R), ctx);
        }
        return paraXml(Object.assign(shiftInto(e.it, PL, PR, L, R), { spaceBeforePt: en.before }), 0, Object.assign({}, ctx, { availW: R - L, inDashedBox: (en.ids || []).some((id) => (ctx.boxes || []).some((bx) => bx.id === id && bx.dashed)) }));
      }, ctx.boxes);
      if (!pageXml) pageXml = '<w:p/>';
      if (!isLast) {
        // Part-17.7: সেকশন-বিরতি পাতার শেষ অনুচ্ছেদেই (আলাদা ফাঁকা অনুচ্ছেদ পাতা ভরা থাকলে পরের পাতায় গিয়ে .doc-এ ফাঁকা পাতা বানাত)
        const lastP = pageXml.lastIndexOf('<w:p>');
        const tail = lastP >= 0 ? pageXml.slice(lastP) : '';
        if (lastP >= 0 && /^<w:p><w:pPr>/.test(tail) && !/<w:tbl>|w:framePr/.test(tail) && /<\/w:p>$/.test(pageXml)) {
          const end = pageXml.indexOf('</w:pPr>', lastP);
          pageXml = pageXml.slice(0, end) + sectPr(page, false) + pageXml.slice(end);
        } else {
          pageXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>${sectPr(page, false)}</w:pPr></w:p>`;
        }
      }
      xml += pageXml;
    });
    const last = ir.pages[ir.pages.length - 1] || { widthPt: 595.3, heightPt: 841.9, margins: { top: 54, right: 54, bottom: 54, left: 54 } };
    xml += sectPr(last, true);
    return { xml, media: ctx.media };
    } finally {
      _activeDocxFont = prevFont;
    }
  }

  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';

  /**
   * ২০২৬-১০-১৪ (a02, মালিকের Word-যাচাই: .doc-এ অযাচিত ফাঁকা, ২ পাতা; docx ১ পাতা): docx-to-doc খালি অনুচ্ছেদকে আকারহীন &nbsp;
   * (১২pt) বানায় ⇒ "ঠিক" ২–৩pt-এর ফাঁক-অনুচ্ছেদ .doc-এ পুরো লাইন। ⇒ রানহীন অনুচ্ছেদে স্পষ্ট আকারের ফাঁকা-রান: আকার = অনুচ্ছেদ-চিহ্নের
   * rPr আকার, নইলে "ঠিক" লাইন-উচ্চতা ÷ ১.২, নইলে বদল নয়। docx-এর চেহারা একই। বন্ধ: FZ_OFF=EMPTYRUN
   */
  function sizeEmptyParas(xml) {
    if (globalThis.__FZ_OFF_EMPTYRUN) return xml;
    return xml.replace(/<w:p>(<w:pPr>(?:(?!<\/w:pPr>)[\s\S])*<\/w:pPr>)<\/w:p>/g, (all, ppr) => {
      const sz = /<w:rPr>[\s\S]*?<w:sz w:val="(\d+)"/.exec(ppr), ex = /w:line="(\d+)" w:lineRule="exact"/.exec(ppr);
      const hp = sz ? +sz[1] : ex ? Math.max(2, Math.round(+ex[1] / 20 / 1.2 * 2)) : 0;
      return hp ? `<w:p>${ppr}<w:r><w:rPr><w:sz w:val="${hp}"/><w:szCs w:val="${hp}"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r></w:p>` : all;
    });
  }

  /** @returns Promise<Blob|Uint8Array> — মাস্টার ইউনিকোড .docx */
  async function build(ir, opts) {
    const o = opts || {};
    if (faithfulStudioOn() && !o.JSZip && !pick('JSZip')) o.JSZip = MiniJSZip;
    const JSZip = pick('JSZip') || o.JSZip;
    if (!JSZip) throw new Error('JSZip লোড হয়নি');
    const docFont = resolveDocxFont(o.font || o.unicodeFont || ir);
    const { xml: xml0, media } = bodyXml(ir, fontPickOn() ? { font: docFont } : undefined);
    const xml = sizeEmptyParas(xml0);
    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${media.map((m) => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('')}</Relationships>`);
    zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${docFont}" w:hAnsi="${docFont}" w:cs="${docFont}"/><w:noProof/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US" w:bidi="bn-BD"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`);
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${xml}</w:body></w:document>`);
    for (const m of media) zip.file('word/media/' + m.name, m.data, { base64: true });
    return zip.generateAsync({ type: o.type || (typeof Blob !== 'undefined' ? 'blob' : 'uint8array'), mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  const FayzarFaithfulDocx = { FONT, UNICODE_FONTS, resolveDocxFont, bodyXml, build, runsFor, pPr, paraXml, planPage, sectPr };
  Object.defineProperties(FayzarFaithfulDocx, {
    itemH: { value: itemH, enumerable: false },
    textH: { value: textH, enumerable: false },
    mathKindOf: { value: mathKindOf, enumerable: false },
    mathLineExtraPt: { value: mathLineExtraPt, enumerable: false },
    mathExtraH: { value: mathExtraH, enumerable: false }
  });
  Object.defineProperties(FayzarFaithfulDocx, {
    snapshotIrLayout: { value: snapshotIrLayout, enumerable: false },
    extractBlocks: { value: extractBlocks, enumerable: false },
    updateBlockText: { value: updateBlockText, enumerable: false },
    MiniJSZip: { value: MiniJSZip, enumerable: false }
  });
  global.FayzarFaithfulDocx = FayzarFaithfulDocx;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarFaithfulDocx;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));