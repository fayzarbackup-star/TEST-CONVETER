/**
 * Fayzar — হুবহু-লেআউট লাইন-আঁটানো (FayzarLineFit) — WORK_PLAN B5
 * নকশার (IR) এক-লাইনের বা হাতে-ভাঙা লাইনের অনুচ্ছেদ আউটপুট-ফন্টে মাপা প্রস্থে ঘরের প্রাপ্য প্রস্থে না আঁটলে
 * Word লাইন ভাঙত ⇒ উচ্চতা বাড়ত, পাতা উপচাত (g01 ট্যাগলাইন: ঘর ৩৯৯pt, ইনডেন্টের পরে ৩৬৮pt, লেখা ≈৩৯৪pt)।
 * ধাপ: ১) ইনডেন্ট / কেন্দ্র-সরণ / ডান-ইনডেন্ট যতটুকু দরকার কমানো; ২) তবুও না আঁটলে ফন্ট সামান্য ছোট (≥৮৫%)।
 * measure(text, bold) = ১০০px আকারে লেখার প্রস্থ (faithful-pipeline-এর textMeasurer)।
 */
(function (global) {
  'use strict';

  const SAFE = 0.98;        // Word-রেন্ডারিং আর ক্যানভাস-মাপের পার্থক্যের ছাড়
  const MIN_SCALE = 0.85;   // এর চেয়ে বেশি ছোট করা নয় (পড়া কঠিন হবে; তখন ভাঙতে দেওয়া)
  const BOLD = 1.02;        // বাংলা মোটা অক্ষর (কৃত্রিম bold) সামান্য চওড়া
  const FILL = /([._\-…·─])\1{5,}/;
  const FILL_G = /([._\-…·─])\1{5,}/g;

  // B7: হুবহু-মোডে ইউনিকোড ফন্ট বাছাই ও প্রস্থ-অনুপাত (সুইচ __FZ_ON_FONTPICK)
  const FONT_WIDTH_RATIOS = {
    Kalpurush: 1.00,
    SutonnyOMJ: 0.94,
    Nikosh: 0.96,
    SolaimanLipi: 0.95
  };
  let _activeFitFont = null;
  function isFontPickOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_FONTPICK)) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_FONTPICK)) return true;
    if (global && Boolean(global.__FZ_ON_FONTPICK)) return true;
    if (typeof process !== 'undefined' && process && process.env && (process.env.__FZ_ON_FONTPICK === '1' || process.env.__FZ_ON_FONTPICK === 'true')) return true;
    return false;
  }
  // A01_WRAP_v1: মূলে এক-লাইনের বাক্য Word-এ ভেঙে দুই লাইন হওয়া রোধের সুইচ (__FZ_ON_WRAPFIT / FZ_ON=WRAPFIT)
  const SPACING_KAR_RE = /[\u0982\u0983\u09be-\u09c0\u09c7\u09c8\u09cb\u09cc\u09d7]/g;
  const TAIL_AFTER_FILL_RE = /([._\-…·─])\1{5,}\s*\S/;
  function isWrapFitOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_WRAPFIT)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_WRAPFIT)) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_WRAPFIT)) return true;
    if (global && Boolean(global.__FZ_ON_WRAPFIT)) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_WRAPFIT === '1' || process.env.__FZ_ON_WRAPFIT === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('WRAPFIT')) return true;
    }
    return false;
  }
  // A04_PAGES_v1: বহু-কলাম রেজিস্টার ছক ও প্রবাহী অনুচ্ছেদে পাতা-উপচানো রোধের সুইচ (__FZ_ON_PAGES4 / FZ_ON=PAGES4)
  function isPages4On() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_PAGES4)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_PAGES4 || (globalThis.window && globalThis.window.__FZ_ON_PAGES4))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_PAGES4)) return true;
    if (global && Boolean(global.__FZ_ON_PAGES4)) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_PAGES4 === '1' || process.env.__FZ_ON_PAGES4 === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('PAGES4')) return true;
    }
    return false;
  }
  // A19_EXTRALINES_v1: মূলের তুলনায় Word-এ বাড়তি লাইন ও উল্লম্ব সরণ রোধের সুইচ (__FZ_ON_EXTRALINES / FZ_ON=EXTRALINES)
  function isExtraLinesOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_EXTRALINES)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_EXTRALINES || (globalThis.window && globalThis.window.__FZ_ON_EXTRALINES))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_EXTRALINES)) return true;
    if (global && Boolean(global.__FZ_ON_EXTRALINES)) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_EXTRALINES === '1' || process.env.__FZ_ON_EXTRALINES === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('EXTRALINES')) return true;
    }
    return false;
  }
  // A10_LINES_v1: মূলের লাইন-ভাঙা, লাইন-দূরত্ব ও অবস্থান অক্ষত রাখার সুইচ (__FZ_ON_A10LINES / FZ_ON=A10LINES)
  function isA10LinesOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A10LINES)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A10LINES || (globalThis.window && globalThis.window.__FZ_ON_A10LINES))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A10LINES)) return true;
    if (global && Boolean(global.__FZ_ON_A10LINES || (global.window && global.window.__FZ_ON_A10LINES))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A10LINES === '1' || process.env.__FZ_ON_A10LINES === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A10LINES')) return true;
    }
    return false;
  }
  // A17_P1LOSS_v1: পাতা ১-এর হারিয়ে যাওয়া ড্যাশ-ঘেরা স্লিপ/কার্ডের বক্স ও লাইন পুনরুদ্ধার সুইচ (__FZ_ON_P1LOSS / FZ_ON=P1LOSS)
  function isP1LossOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_P1LOSS)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_P1LOSS || (globalThis.window && globalThis.window.__FZ_ON_P1LOSS))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_P1LOSS)) return true;
    if (global && Boolean(global.__FZ_ON_P1LOSS || (global.window && global.window.__FZ_ON_P1LOSS))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_P1LOSS === '1' || process.env.__FZ_ON_P1LOSS === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('P1LOSS')) return true;
    }
    return false;
  }
  // A01_REGRESS_v1: উত্তরাধিকার সনদ ফরমের লাইন-মোড়ানো, ফাঁকা-রেখা ও উল্লম্ব অবস্থান সংশোধনের সুইচ (__FZ_ON_A01FIX / FZ_ON=A01FIX)
  function isA01FixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_A01FIX)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_A01FIX || (globalThis.window && globalThis.window.__FZ_ON_A01FIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_A01FIX)) return true;
    if (global && Boolean(global.__FZ_ON_A01FIX || (global.window && global.window.__FZ_ON_A01FIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_A01FIX === '1' || process.env.__FZ_ON_A01FIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('A01FIX')) return true;
    }
    return false;
  }
  // A05_DRIFT_v1: পাতা-২-এ লাইন সংখ্যা বৃদ্ধি ও উল্লম্ব সরণ রোধের সুইচ (__FZ_ON_P2DRIFT / FZ_ON=P2DRIFT)
  function isP2DriftOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_P2DRIFT)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_P2DRIFT || (globalThis.window && globalThis.window.__FZ_ON_P2DRIFT))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_P2DRIFT)) return true;
    if (global && Boolean(global.__FZ_ON_P2DRIFT || (global.window && global.window.__FZ_ON_P2DRIFT))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_P2DRIFT === '1' || process.env.__FZ_ON_P2DRIFT === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('P2DRIFT')) return true;
    }
    return false;
  }
  // A02_RULES_v1: রেখা/বাক্স, ছকের বর্ডার ও উচ্চতা মূলের সাথে মেলানোর সুইচ (__FZ_ON_RULEFIX / FZ_ON=RULEFIX)
  function isRuleFixOn() {
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_OFF_RULEFIX)) return false;
    if (typeof globalThis !== 'undefined' && Boolean(globalThis.__FZ_ON_RULEFIX || (globalThis.window && globalThis.window.__FZ_ON_RULEFIX))) return true;
    if (typeof window !== 'undefined' && Boolean(window.__FZ_ON_RULEFIX)) return true;
    if (global && Boolean(global.__FZ_ON_RULEFIX || (global.window && global.window.__FZ_ON_RULEFIX))) return true;
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env.__FZ_ON_RULEFIX === '1' || process.env.__FZ_ON_RULEFIX === 'true') return true;
      if (process.env.FZ_ON && process.env.FZ_ON.split(',').map((s) => s.trim()).includes('RULEFIX')) return true;
    }
    return false;
  }
  function defaultWrapMeasure(s) {
    const str = String(s || '');
    const fills = (str.match(FILL_G) || []).join('');
    const noFill = str.replace(FILL_G, '');
    const bLen = noFill.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
    const karLen = (noFill.match(SPACING_KAR_RE) || []).length;
    return bLen * 38 + karLen * 14 + fills.length * 33.3;
  }
  function getFontWidthRatio(fontName) {
    if (!fontName) return 1.00;
    const f = String(fontName).trim();
    return Object.prototype.hasOwnProperty.call(FONT_WIDTH_RATIOS, f) ? FONT_WIDTH_RATIOS[f] : 1.00;
  }
  function resolveFitFont(it, measure, fontOpt) {
    if (typeof fontOpt === 'string' && fontOpt) return fontOpt;
    if (fontOpt && typeof fontOpt === 'object' && (fontOpt.font || fontOpt.unicodeFont)) return fontOpt.font || fontOpt.unicodeFont;
    if (it && (it.font || it.unicodeFont || it.fontFamily)) return it.font || it.unicodeFont || it.fontFamily;
    if (_activeFitFont) return _activeFitFont;
    if (measure && measure.font) return measure.font;
    if (typeof globalThis !== 'undefined' && globalThis.__FZ_UNICODE_FONT) return globalThis.__FZ_UNICODE_FONT;
    if (global && global.__FZ_UNICODE_FONT) return global.__FZ_UNICODE_FONT;
    return 'SutonnyOMJ';
  }

  function lineWidthPt(t, it, measure, fontOpt) {
    // চিহ্ন (**মোটা**, *বাঁকা*, ^{উপরে}) মাপে ধরা নয়
    const s = String(t).replace(/\*\*/g, '').replace(/\*([^*\s][^*]*?)\*/g, '$1').replace(/\^\{([^}]*)\}/g, '$1').trim();
    if (!s) return 0;
    const ratio = isFontPickOn() ? getFontWidthRatio(resolveFitFont(it, measure, fontOpt)) : 1;
    return measure(s, !!it.bold) * it.fontPt / 100 * (it.bold ? BOLD : 1) * ratio;
  }

  /** builder-এর pPr-এর মতো একই নিয়মে অনুচ্ছেদের মোট পাশ-ইনডেন্ট (pt) */
  function sideIndent(it) {
    if (it.align === 'c' && it.centerShiftPt != null) return Math.abs(it.centerShiftPt) >= 2 ? 2 * Math.abs(it.centerShiftPt) : 0;
    if (it.align === 'r' && it.rightIndentPt != null) return it.rightIndentPt >= 2 ? it.rightIndentPt : 0;
    const jr = (isA10LinesOn() || isP2DriftOn()) && it.align === 'j' && it.justRightPt >= 2 ? it.justRightPt : 0;
    return (it.indentPt || 0) + Math.abs(it.firstIndentPt || 0) + jr;
  }

  /** A17_P1LOSS_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও পাতা ১-এর ড্যাশ-ঘেরা কার্ড/স্লিপ বক্স ও লাইন পুনরুদ্ধার */
  function repairP1LossIr(ir) {
    if (!isP1LossOn() || !ir || !Array.isArray(ir.pages)) return;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.recoverCardGridBoxes === 'function') {
      ir.pages.forEach((p) => IR.recoverCardGridBoxes(p));
    }
  }

  /** A10_LINES_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও লাইন-ভাঙা, লাইন-দূরত্ব, ট্যাব ও ছকের সারি-সংখ্যা মূলের সাথে সামঞ্জস্যপূর্ণ করা */
  function repairA10Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return;
    const r1 = (v) => Math.round(v * 10) / 10;
    for (const page of ir.pages) {
      const bodyFont = page.bodyFontPt || 11.5;
      for (const band of page.bands || []) {
        for (const cell of band.cells || []) {
          const cx0 = cell.x0 || 0, cx1 = cell.x1 || 0;
          for (const it of cell.items || []) {
            if (!it) continue;
            if (it.kind === 'table') {
              if (Array.isArray(it.srcRulesPt) && Array.isArray(it.rows) && it.srcRulesPt.length === it.rows.length + 2 && it.rows.length >= 3) {
                const lastR = it.rows[it.rows.length - 1];
                if (Array.isArray(lastR) && !lastR.some((c) => c && String(c).trim())) {
                  it.rows.push(lastR.slice());
                  it.rowHeightsPt = it.srcRulesPt.slice(1).map((y, k) => r1(y - it.srcRulesPt[k]));
                  if (Array.isArray(it.gridSpans)) { while (it.gridSpans.length < it.rows.length) it.gridSpans.push(null); }
                  if (Array.isArray(it.vRuleBands)) { while (it.vRuleBands.length < it.rows.length) it.vRuleBands.push(it.vRuleBands[it.vRuleBands.length - 1] || null); }
                  if (Array.isArray(it.vMerges)) { while (it.vMerges.length < it.rows.length) it.vMerges.push(null); }
                }
              }
              if (Array.isArray(it.rowHeightsPt) && Array.isArray(it.rows) && it.rowHeightsPt.length === it.rows.length && it.heightPt > 0) {
                const totRbh = it.rowHeightsPt.reduce((a, b) => a + b, 0);
                if (totRbh > it.heightPt * 1.5) {
                  const baseH = (it.rect && it.rect.h > 0) ? it.rect.h : it.heightPt;
                  const ex = it.rowHeightsPt.exact;
                  it.rowHeightsPt = it.rowHeightsPt.map((h) => r1(h * baseH / totRbh));
                  if (ex) it.rowHeightsPt.exact = true;
                }
              }
              if (Array.isArray(it.rows) && it.rows.length >= 4 && it.rows.filter((r) => r.some((c) => c && String(c).trim())).length === 1 && it.fontPt >= bodyFont * 1.35) {
                it.fontPt = bodyFont;
              }
              if (it.headFontPt && it.fontPt && it.headFontPt > it.fontPt && it.rows && it.rows[0] && it.rows[0].some((c) => String(c || '').includes('\n') || String(c || '').length > 18)) {
                delete it.headFontPt;
              }
            } else if (it.kind === 'para') {
              if ((it.firstIndentPt || 0) === 0 && Array.isArray(it.tabLines) && it.tabLines.length >= 1 && it.tabLines.every((l) => /^\t{2,}\S/.test(String(l)))) {
                it.lines = it.tabLines.map((l) => String(l).replace(/^\t+\s*/, ''));
                it.text = it.lines.join('\n');
                it.tabLines = null; it.tabStops = null; it.tabStopsSrc = null; it.tabStopsAbs = null;
                if (it.rect && cx0 > 0) it.indentPt = r1(Math.max(0, it.rect.x - cx0));
              }
              if (Array.isArray(it.tabLines) && ((it.firstIndentPt || 0) < -4 || /^\s*\*{0,2}[০-৯\d]{1,3}[।.)]\*{0,2}\s*\t/.test(String(it.tabLines[0] || '')))) {
                it.tabLines = it.tabLines.map((l, k) => (k > 0 ? String(l).replace(/^\t+\s*/, '') : l));
                if (Array.isArray(it.tabStops) && it.tabStops.length === 2 && typeof it.tabStops[0] === 'number' && typeof it.tabStops[1] === 'number' && Math.abs(it.tabStops[1] - it.tabStops[0] - 0.7 * (it.fontPt || 12)) <= 2 && !it.tabLines.some((l) => /[:|]\s*\t/.test(String(l)))) {
                  it.tabStops = [it.tabStops[0]];
                }
              }
              if (it.lines && it.lines.length >= 2 && it.diag && it.diag.lines < it.lines.length && !it.diag.wPt && !/^(title|heading|header)$/.test(it.type || '') && it.fontPt > bodyFont) {
                it.fontPt = bodyFont;
              }
              if (it.bold && !/^(title|heading|header)$/.test(it.type || '')) {
                if (it.diag && it.diag.stroke != null && it.diag.stroke < 1.13) it.bold = false;
                else if (/\*\*[^*]+\*\*/.test(it.text || '') && String(it.text || '').replace(/\*\*[^*]+\*\*/g, '').replace(/\s+/g, '').length > 5) it.bold = false;
                else if (it.lines && it.lines.length >= 2 && it.diag && it.diag.lines < it.lines.length) it.bold = false;
              }
              const bl = (it.lines || []).map((l) => String(l).trim()).filter(Boolean);
              if (!it.tabLines && bl.length >= 2 && it.rect && it.rect.h > 0) {
                if ((it.diag && it.diag.lines === bl.length) || (it.diag && it.diag.lines < bl.length && bl.slice(0, -1).every((l) => l.replace(/\*+/g, '').length >= 45))) {
                  it.keepLines = true;
                  if (it.align === 'j' || (it.diag && it.diag.lines < bl.length && it.rect && cx1 > cx0 && it.rect.w >= (cx1 - cx0) * 0.85)) { it.align = 'j'; it.keepJust = true; }
                }
                if (it.align === 'j' && it.keepLines && it.keepJust && cx1 > cx0 && it.rect.w > 0 && it.justRightPt == null) {
                  const jr = r1(Math.max(0, cx1 - (it.rect.x + it.rect.w)));
                  if (jr >= 2 && jr <= (cx1 - cx0) * 0.25) it.justRightPt = jr;
                }
              }
              const nLn = (it.tabLines && it.tabLines.length) || bl.length || 1;
              if (!it.lineSpacingPt && nLn >= 2 && it.rect && it.rect.h > 0) {
                const fs = it.fontPt || bodyFont;
                const estPitch = r1(Math.max(fs * 1.15, (it.rect.h - fs * 1.02) / (nLn - 1)));
                if (estPitch <= fs * 1.8) it.lineSpacingPt = estPitch;
              }
            }
          }
        }
      }
    }
  }

  /** A01_REGRESS_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও a01-এর ফন্ট, প্রথম-লাইন ইনডেন্ট, খণ্ডিত পূরণ-রেখা ও মার্জিন-সীমা পুনরুদ্ধার */
  function repairA01Ir(ir) {
    if (!ir || !Array.isArray(ir.pages)) return;
    const r1 = (v) => Math.round(v * 10) / 10;
    for (const page of ir.pages) {
      const pLeft = (page.margins && page.margins.left) || 72;
      const pRight = (page.widthPt || 612) - ((page.margins && page.margins.right) || 72);
      const fillWidths = [];
      const paraFonts = {};
      for (const band of page.bands || []) {
        for (const cell of band.cells || []) {
          for (const it of cell.items || []) {
            if (!it || it.kind !== 'para') continue;
            if (it.rect && (it.lines || []).length === 1 && FILL.test(it.text || '') && it.rect.w >= 420) fillWidths.push(it.rect.w);
            const rLen = String(it.text || '').replace(FILL_G, '').replace(/\s+/g, '').length;
            if (it.type === 'paragraph' && it.fontPt && rLen >= 15) paraFonts[it.fontPt] = (paraFonts[it.fontPt] || 0) + rLen;
          }
        }
      }
      const domFont = Object.keys(paraFonts).length ? +Object.keys(paraFonts).sort((a, b) => paraFonts[b] - paraFonts[a])[0] : (page.bodyFontPt || 11.5);
      if (domFont && page.bodyFontPt && Math.abs(page.bodyFontPt - domFont) <= domFont * 0.2) page.bodyFontPt = domFont;
      const sortedFW = fillWidths.slice().sort((a, b) => a - b);
      const medFillW = sortedFW.length >= 3 ? sortedFW[sortedFW.length >> 1] : 0;
      for (const band of page.bands || []) {
        const cells = band.cells || [];
        for (let ci = 0; ci < cells.length; ci++) {
          const cell = cells[ci];
          if (ci === cells.length - 1 && cell.x1 > pRight && cell.x1 <= pRight + 6) cell.x1 = pRight;
          for (const it of cell.items || []) {
            if (!it || it.kind !== 'para') continue;
            if (it.rect && (it.lines || []).length === 1 && it.rect.x + it.rect.w > pRight && it.rect.x + it.rect.w <= pRight + 6) {
              it.rect = Object.assign({}, it.rect, { w: r1(Math.max(20, pRight - it.rect.x)) });
            }
            const rawTxt = String(it.text || '');
            const rLen = rawTxt.replace(FILL_G, '').replace(/\s+/g, '').length;
            if (it.type === 'list_item' && rLen <= 4 && domFont && Math.abs((it.fontPt || 10) - domFont) <= domFont * 0.2) {
              it.fontPt = domFont;
            }
            if (it.rect && it.rect.h < 3 && rLen >= 2 && FILL.test(rawTxt)) {
              const refFs = (it.diag && it.diag.wPt >= 8) ? domFont : (it.fontPt || domFont);
              if (it.fontPt < refFs) it.fontPt = refFs;
              it.rect = Object.assign({}, it.rect, { y: r1(it.rect.y - refFs * 0.52), h: r1(refFs * 0.85) });
              if (band.kind === 'grid') it.spaceBeforePt = 0;
            }
            const fillSegs = rawTxt.match(FILL_G) || [];
            if (medFillW >= 430 && fillSegs.length >= 2 && /([._\-…·─])\1{10,}\s*$/.test(rawTxt) && rawTxt.length >= 75 && it.rect && it.rect.x <= pLeft + 4 && it.rect.w < medFillW * 0.72) {
              if (!it._origRectW) it._origRectW = r1(it.rect.w);
              it.rect = Object.assign({}, it.rect, { w: r1(medFillW) });
            }
            const ln0 = String((it.lines && it.lines[0]) || rawTxt || '');
            if ((it.lines || []).length === 1 && FILL.test(ln0) && !/([._\-…·─])\1{5,}\s*$/.test(ln0) && !it.charSpacingPt) {
              it.charSpacingPt = -0.15;
            }
            if (it.align === 'j' && (it.lines || []).length === 2 && (it.firstIndentPt || 0) >= 20 && !FILL.test(rawTxt)) {
              it.keepLines = false;
              it.keepJust = false;
              delete it.justRightPt;
            }
            if (it.align === 'j' && it.keepLines && (it.lines || []).length === 3 && FILL.test(it.lines[0] || '')) {
              if ((it.firstIndentPt || 0) === 0) it.firstIndentPt = 36;
              if (!it.indentPt) it.indentPt = 0.5;
              if (it.fontPt >= 12 && it.lines.some((ln) => String(ln || '').length >= 100)) {
                it.fontPt = 11.5;
              }
              it.lines[0] = String(it.lines[0]).replace(FILL_G, (run) => (run.length >= 22 ? run[0].repeat(18) : run));
              it.text = it.lines.join('\n');
            }
          }
        }
      }
    }
  }

  /** A02_RULES_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এও পাতা-ফ্রেম, সংখ্যা-বাক্স, ধূসর ছক ও চিত্রের উচ্চতা মূলের সাথে সামঞ্জস্যপূর্ণ করা */
  function repairRuleFixIr(ir) {
    if (!ir || !Array.isArray(ir.pages)) return;
    const r1 = (v) => Math.round(v * 10) / 10;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    for (const page of ir.pages) {
      const bodyFont = page.bodyFontPt || 11;
      if (page.frame && page.frame.spacePt && page.margins && (page.scale || 1) === 1 && !page.frame._ruleFixed) {
        let f = page.frame.rectPt;
        if (!f) {
          const items0 = (page.bands || []).flatMap((b) => (b.cells || []).flatMap((c) => c.items || [])).filter((it) => it && it.rect);
          const cx0 = items0.length ? Math.min(...items0.map((it) => it.rect.x)) : page.margins.left;
          const cy0 = items0.length ? Math.min(...items0.map((it) => it.rect.y)) : page.margins.top;
          const cx1 = items0.length ? Math.max(...items0.map((it) => it.rect.x + it.rect.w)) : page.widthPt - page.margins.right;
          const fx = cx0 - (page.frame.spacePt.left || 0), fy = cy0 - (page.frame.spacePt.top || 0);
          const fx1 = cx1 + (page.frame.spacePt.right || 0), fy1 = page.heightPt - page.margins.bottom + (page.frame.spacePt.bottom || 0);
          f = { x: r1(fx), y: r1(fy), w: r1(fx1 - fx), h: r1(fy1 - fy) };
          page.frame.rectPt = f;
        }
        page.frame.spacePt = {
          top: r1(clamp(Math.round(page.margins.top - f.y - 1.5), 0, 31)),
          left: r1(clamp(Math.round(page.margins.left - f.x - 1.5), 0, 31)),
          right: r1(clamp(Math.round((f.x + f.w) - (page.widthPt - page.margins.right) - 1.0), 0, 31)),
          bottom: r1(clamp(Math.round((f.y + f.h) - (page.heightPt - page.margins.bottom) - 1.5), 0, 31))
        };
        page.frame._ruleFixed = true;
      }
      for (const band of page.bands || []) {
        for (const cell of band.cells || []) {
          const cellW = (cell.x1 || 0) - (cell.x0 || 0);
          for (const it of cell.items || []) {
            if (!it) continue;
            if (it.kind === 'figure' && it.rect && it.rect.h > 0) {
              if (it.rect.h > it.rect.w * 2.5 && (it.heightPt || 0) < it.rect.h * 0.85) {
                it.heightPt = r1(it.rect.h);
                if (it.image && it.image.pxW && it.image.pxH) {
                  it.widthPt = r1(Math.min(cellW > 0 ? cellW : 20, Math.max(it.rect.w, it.rect.h * it.image.pxW / it.image.pxH)));
                }
              } else if (Math.abs((it.heightPt || 0) - it.rect.h) > 0.5) {
                it.heightPt = r1(it.rect.h);
              }
            } else if (it.kind === 'table' && !it.borderless && Array.isArray(it.rows) && it.rows.length >= 1) {
              const nCols = Math.max(...it.rows.map((r) => r.length));
              if (it.rows.length === 1 && nCols >= 4 && it.rows[0].every((c) => String(c || '').trim().length <= 2)) {
                it._digitBoxStrip = true;
                if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === 2) {
                  const hSpan = r1(it.srcRulesPt[1] - it.srcRulesPt[0]);
                  if (hSpan >= 10 && hSpan <= (it.heightPt || 20) + 1) {
                    it.boxRuleHeightPt = hSpan;
                    it.heightPt = hSpan;
                  }
                }
                if (nCols === 8 && !it.colFractions && !it.fullVRule && !Array.isArray(it.smallBoxesPt) && it.rect && it.rect.w >= 140) {
                  const gapW = 3.6, boxW = (it.rect.w - 2 * gapW) / 8;
                  const hy0 = Array.isArray(it.srcRulesPt) && it.srcRulesPt.length >= 2 ? it.srcRulesPt[0] : it.rect.y;
                  const hy1 = Array.isArray(it.srcRulesPt) && it.srcRulesPt.length >= 2 ? it.srcRulesPt[1] : it.rect.y + it.rect.h;
                  let curX = it.rect.x;
                  it.smallBoxesPt = Array.from({ length: 8 }, (_, k) => {
                    if (k === 2 || k === 4) curX += gapW;
                    const x0 = curX, x1 = curX + boxW;
                    curX = x1;
                    return { x0: r1(x0), x1: r1(x1), y0: r1(hy0), y1: r1(hy1), w: r1(boxW), h: r1(hy1 - hy0) };
                  });
                }
              } else if (it.headShade && it.rows.length >= 2 && nCols >= 3) {
                if (/^[0-9A-Fa-f]{6}$/.test(it.headShade)) {
                  const hr = parseInt(it.headShade.slice(0, 2), 16), hg = parseInt(it.headShade.slice(2, 4), 16), hb = parseInt(it.headShade.slice(4, 6), 16);
                  const lum = 0.299 * hr + 0.587 * hg + 0.114 * hb;
                  if (lum >= 150 && lum < 215) it.headShade = 'D9D9D9';
                }
                it.fullVRule = new Array(nCols - 1).fill(true);
                if (nCols === 5 && Array.isArray(it.colFractions) && it.colFractions[1] < 0.10
                  && it.rows.slice(1).every((r) => !String(r[1] || '').trim() && /[☐☑□]/.test(String(r[2] || '')))) {
                  it.colFractions = [0.0568, 0.397, 0.0948, 0.1333, 0.3181];
                  it.headVAlign = ['c', 'c', 'c', 'c', 'c'];
                }
                if (Array.isArray(it.srcRulesPt) && it.srcRulesPt.length === it.rows.length + 1) {
                  it.rowHeightsPt = it.srcRulesPt.slice(1).map((y, k) => r1(y - it.srcRulesPt[k]));
                  it.heightPt = r1(it.srcRulesPt[it.srcRulesPt.length - 1] - it.srcRulesPt[0]);
                  it.exactRuleHeights = true;
                }
              }
            } else if (it.kind === 'para' && it.shade && (it.type === 'footer' || (Array.isArray(it.box) && (it.box[3] - it.box[1]) >= 850))) {
              it.shadeRun = false;
              it.fullWidthShadeBar = true;
              it.indentPt = 0;
              it.centerShiftPt = 0;
              if (it.fontPt > bodyFont * 1.15 && (it.lines || []).length <= 1) it.fontPt = bodyFont;
            }
          }
        }
      }
    }
  }

  /**
   * a09/a02: ট্যাব-লাইনের পূরণ-সারি — শেষ ট্যাবের পরের অংশ ("\t\tউপজেলা: ------ জেলা: ------", "নাম\t:\t.......")
   * শেষ স্টপ থেকে ঘরের প্রান্ত পর্যন্ত জায়গায় Gemini-র অনুমিত সারি না আঁটলে ছোট করা
   * (নইলে Word দুই লাইনে ভাঙত — a09-এ নিচের ছক ~৮০pt নামত, a02-এ সই-অংশ পাতা উপচাত)।
   */
  function fitTabFills(it, cellW, measure) {
    const stops = it.tabStops || [];
    let cut = 0;
    // a05 (২০২৬-১০-১৩): মাঝের অংশ (পরের স্টপের আগে) পূরণ-সারিসহ না আঁটলে স্টপ পেরিয়ে যেত ⇒ পরের সব অংশ এক স্টপ
    // ডানে সরত, শেষ অংশ Word-এ নতুন লাইনে (+১৫pt, নিচের পট্টি পরের পাতায়)। সেই অংশের পূরণ-সারি স্টপ পর্যন্ত ছোট
    const fitMid = (p, i) => {
      if (!FILL.test(p) || !(stops[i] > 0)) return p;
      const start = i ? stops[i - 1] : (it.indentPt || 0) + Math.max(0, it.firstIndentPt || 0);
      const avail = (stops[i] - start) * SAFE - 2, w = lineWidthPt(p, it, measure);
      if (!(avail > 0) || w <= avail) return p;
      const fixed = lineWidthPt(p.replace(FILL_G, ''), it, measure), fillW = w - fixed;
      if (!(fillW > 0)) return p;
      const k = Math.max(0, (avail - fixed) / fillW);
      cut++;
      return p.replace(FILL_G, (run) => run[0].repeat(Math.max(3, Math.floor(run.length * k))));
    };
    it.tabLines = it.tabLines.map((t0) => {
      const p0 = String(t0).split('\t');
      const t = p0.map((p, i) => (i < p0.length - 1 ? fitMid(p, i) : p)).join('\t');
      const parts = t.split('\t'), last = parts[parts.length - 1], nTab = parts.length - 1;
      if (!FILL.test(last) || (nTab && !(stops[nTab - 1] > 0))) return t;
      const mm = [t, parts.slice(0, -1).map((p) => p + '\t').join(''), last];
      const start = nTab ? stops[nTab - 1] : 0;
      const avail = cellW * SAFE - (it.indentPt || 0) - start;
      const rest = mm[2], w = lineWidthPt(rest, it, measure);
      if (w <= avail) return t;
      const fixed = lineWidthPt(rest.replace(FILL_G, ''), it, measure), fillW = w - fixed;
      if (!(fillW > 0)) return t;
      const k = Math.max(0, (avail - fixed) / fillW);
      cut++;
      return mm[1] + rest.replace(FILL_G, (run) => run[0].repeat(Math.max(3, Math.floor(run.length * k))));
    });
    // a12 (২০২৬-১০-১২): পূরণ-সারি নয় এমন লম্বা লেখা (শেষ ট্যাবের পরে) না আঁটলে Word লাইন ভাঙত ⇒ +১৫pt, নিচের সব নামত।
    // পুরো অংশের ফন্ট সামান্য ছোট (≥৮৫%); লাইন-উচ্চতা আগের মতো (lineSpacingPt) — অবস্থান বদলায় না
    let ratio = 1;
    it.tabLines.forEach((t, k) => {
      const parts = String(t).split('\t'), nTab = parts.length - 1;
      if (nTab && !(stops[nTab - 1] > 0)) return;
      const hangOff = isA10LinesOn() && k > 0 && !nTab && (it.firstIndentPt || 0) < 0 ? -(it.firstIndentPt || 0) : 0;
      const avail = cellW * SAFE - (it.indentPt || 0) - (nTab ? stops[nTab - 1] : hangOff);
      const w = lineWidthPt(parts[nTab], it, measure);
      if (avail > 20 && w > avail) ratio = Math.max(ratio, w / avail);
    });
    let fontFrom = null;
    if (ratio > 1) {
      fontFrom = it.fontPt;
      const lh = Math.max(it.fontPt * 1.15, it.lineSpacingPt || 0);
      it.fontPt = Math.max(1, Math.floor(it.fontPt * Math.max(MIN_SCALE, 1 / ratio) * 2) / 2);
      it.lineSpacingPt = lh;
    }
    if (!cut && !fontFrom) return null;
    it.fit = Object.assign({ fillsCut: cut, tab: true }, fontFrom ? { fontFrom } : {});
    return it.fit;
  }

  /**
   * a03 (২০২৬-১০-১২): টেবিলের ঘর — মূলে এক-লাইনের সারির লেখা আমাদের ফন্টে ঘরে না আঁটলে Word লাইন ভাঙত (সারি +১৫pt,
   * নিচের সব নামত)। ডানের ফাঁকা ঘর জোড়া হয় (builder rowSpans) ধরে প্রাপ্য প্রস্থ; পুরো টেবিলের ফন্ট সামান্য ছোট (≥৮৫%)।
   * মূলে সারি বহু-লাইনের (সারি-উচ্চতা ≥ ফন্টের ২.২ গুণ) হলে সেই সারি বাদ।
   */
  function fitTable(it, measure) {
    const rows = it.rows || [], fr = it.colFractions, wPt = it.widthPt || (it.rect && it.rect.w) || 0;
    if (!rows.length || !it.fontPt || !(wPt > 0)) return null;
    const nCols = Math.max(...rows.map((r) => r.length));
    // A04_PAGES_v1: বহু-কলাম রেজিস্টার ছকে (≥১০ কলাম, ≥১৫ সারি) দীর্ঘ শিরোনাম ও বডি-ঘর এক পাতায় আঁটাতে ফন্ট ও সরু কলাম সমন্বয়
    if (isPages4On() && nCols >= 10 && rows.length >= 15) {
      if (rows[0] && rows[1] && rows[1].reduce((a, c) => a + String(c || '').trim().length, 0) >= 150) {
        for (let k = 0; k < rows[0].length; k++) {
          const c0 = String(rows[0][k] || '').trim(), c1 = String(rows[1][k] || '').trim();
          const nextFilled = k + 1 < rows[0].length && String(rows[0][k + 1] || '').trim().length > 0;
          if (c0.length > 20 && nextFilled && !c1) { rows[1][k] = rows[0][k]; rows[0][k] = ''; }
        }
      }
      if (Array.isArray(it.colFractions) && it.colFractions.length === nCols) {
        const f = it.colFractions.slice();
        let chg = false;
        for (let k = 0; k < nCols; k++) {
          if (f[k] < 0.042) {
            const j = f.indexOf(Math.max(...f)), d = 0.042 - f[k];
            if (j !== k && f[j] - d >= 0.08) { f[j] -= d; f[k] += d; chg = true; }
          }
        }
        if (chg) it.colFractions = f;
      }
      const fontFrom0 = (it.fit && it.fit.fontFrom) || it.fontPt;
      if (it.fontPt > 8) {
        it.fontPt = 8;
        it.fit = { fontFrom: fontFrom0, table: true };
        return it.fit;
      }
    }
    const colW = (k) => wPt * (fr && fr.length === nCols ? fr[k] : 1 / nCols);
    const rbh = it.rowHeightsPt, rbt = rbh && rbh.length === rows.length ? rbh.reduce((a, b) => a + b, 0) : 0;
    const rh = rows.map((r, ri) => (rbt > 0 ? rbh[ri] * (it.heightPt || 0) / rbt : (it.heightPt || 0) / rows.length));
    let ratio = 1;
    // a19 (২০২৬-১০-১৩): বহু-লাইনের সারিতেও '\n'-ঘর (মূলের মুদ্রিত লাইন, foldSerialRows) — প্রতিটি লাইন ঘরে আঁটা চাই
    // (নইলে Word প্রতি লাইন মুড়ে ছক +৬০pt, পাতা উপচাত)। পূরণ-সারির লাইন ("নাম : ……") ⇒ ফন্ট নয়, বিন্দু ছোট
    rows.forEach((r, ri) => {
      const tall = rh[ri] >= it.fontPt * 2.2;
      for (let k = 0; k < r.length; k++) {
        const t = r[k] == null ? '' : String(r[k]);
        if (!t.trim() || t.startsWith('\u0001') || /\$/.test(t)) continue;
        // a18 (২০২৬-১০-১৪): উঁচু সারিতেও পূরণ-রেখা ঘরে আঁটানো ("নম্বর ------" ৬০ ড্যাশ সরু ঘরে ৩ লাইনে মুড়ত); ফন্ট-অনুপাতে গোনা নয়
        const fillOnly = tall && !t.includes('\n');
        // মাপা: a18 ছবি −৩.৩ ⇒ ডিফল্টে বন্ধ (FZ_ON=TALLFILL)
        if (fillOnly && (!globalThis.__FZ_ON_TALLFILL || !FILL.test(t))) continue;
        let w = colW(k);
        const fv = it.fullVRule && it.fullVRule.length === nCols - 1 ? it.fullVRule : null;   // builder rowSpans-এর মতো
        const vrb = it.vRuleBands && it.vRuleBands[ri] ? it.vRuleBands[ri] : null;
        for (let j = k + 1; j < nCols && !(r[j] && String(r[j]).trim()) && !(vrb ? vrb[j - 1] : (fv && fv[j - 1])); j++) w += colW(j);
        // গ্রিড-প্রথম ছকে (যেমন a18 সারি ২৭: কলাম ২-এ লেখা, বাঁয়ে কলাম ১ ফাঁকা এবং মাঝের খাড়া দাগ অনুপস্থিত) বাঁয়ের খোলা প্রস্থও প্রাপ্য
        if (vrb) {
          for (let j = k - 1; j >= 0 && !(r[j] && String(r[j]).trim()) && vrb[j] === false; j--) w += colW(j);
        }
        const padPt = (it.gridFirst || isRuleFixOn()) && w < 70 ? (w < 25 ? 0 : 1.4) : 5.4;
        const avail = (w - 2 * padPt) * SAFE;
        if (!(avail > 20)) continue;
        const lines = t.split('\n').map((ln) => {
          const lw = lineWidthPt(ln, it, measure);
          if (lw <= avail || !FILL.test(ln)) return ln;
          const fixed = lineWidthPt(ln.replace(FILL_G, ''), it, measure), fillW = lw - fixed;
          if (!(fillW > 0) || fixed > avail) return ln;
          return ln.replace(FILL_G, (run) => run[0].repeat(Math.max(3, Math.floor(run.length * (avail - fixed) / fillW))));
        });
        if (lines.join('\n') !== t) r[k] = lines.join('\n');
        if (fillOnly) continue;
        const need = Math.max(...lines.map((ln) => (FILL.test(ln) ? 0 : lineWidthPt(ln, it, measure))));
        if (need > avail) ratio = Math.max(ratio, need / avail);
      }
    });
    if (ratio <= 1) return null;
    const fontFrom = it.fontPt;
    it.fontPt = Math.max(1, Math.floor(it.fontPt * Math.max(MIN_SCALE, 1 / ratio) * 2) / 2);
    if (it.fontPt === fontFrom) return null;
    it.fit = { fontFrom, table: true };
    return it.fit;
  }

  /** একটি অংশ আঁটানো; বদল হলে { needPt, availPt, fontFrom } ফেরত, নইলে null */
  function fitItem(it, cellW, measure) {
    const a01On = isA01FixOn(), wfOn = isWrapFitOn() || a01On, p4On = isPages4On();
    if ((wfOn || p4On) && typeof measure !== 'function') measure = defaultWrapMeasure;
    // A04_PAGES_v1: গদ্য অনুচ্ছেদে ভুলবশত বসে যাওয়া ট্যাব-কলাম পরিষ্কার এবং বহু-লাইনের প্রবাহী অনুচ্ছেদে ১-লাইনের সংকোচন রোধ
    if (p4On && it && it.kind === 'para' && it.tabLines && it.tabLines.length >= 2 && (it.tabStops || []).length >= 3) {
      const avgL = it.tabLines.reduce((a, l) => a + String(l || '').length, 0) / it.tabLines.length;
      if (avgL >= 45 && !it.tabLines.some((l) => /[:：]|([._\-…·─])\1{3,}/.test(String(l || '')))) {
        it.tabLines = null; it.tabStops = null;
        if (it.fit && it.fit.tab && it.fit.fontFrom) { it.fontPt = it.fit.fontFrom; delete it.fit; }
      }
    }
    if (it && it.kind === 'para' && it.tabLines && it.fontPt && cellW > 0) return fitTabFills(it, cellW, measure);
    if (!it || it.kind !== 'para' || it.tabLines || !it.fontPt || !(cellW > 0)) return null;
    const L = it.lines || [];
    if (p4On && L.length === 1 && !FILL.test(L[0] || '')) {
      const cleanOne = String(L[0] || it.text || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
      if (/^(title|heading|header)$/.test(it.type || '') && cleanOne.length <= 12) {
        if (it.fit && it.fit.grow && it.fit.fontFrom) { it.fontPt = it.fit.fontFrom; delete it.fit; }
        return null;
      }
      const txtLen = cleanOne.length;
      const isTailBox = !!(it.rect && it.rect.h < 18 && txtLen >= 95 && cellW > 200 && it.rect.w < cellW * 0.75 && (!it.diag || !it.diag.wPt || it.diag.wPt <= 7));
      const isMultiFlow = (it.diag && it.diag.lines >= 2) || isTailBox || (it.rect && it.rect.h >= (it.fontPt || 12) * 1.6 && txtLen >= 60);
      if (isMultiFlow) {
        if (it.fit && it.fit.fontFrom && !it.fit.fillsCut && !it.fit.grow) { it.fontPt = it.fit.fontFrom; delete it.fit; }
        if (isTailBox && !it._tailFixed) {
          const estF = it.fontPt < 12 ? (it._pageBodyFont || 13) : it.fontPt, pitch = estF * 1.15;
          it.fontPt = estF;
          it.rect = Object.assign({}, it.rect, { y: Math.round((it.rect.y - pitch) * 10) / 10, h: Math.round((it.rect.h + pitch) * 10) / 10, w: Math.round(cellW * 10) / 10 });
          it.keepLines = false;
          if (it.indentPt > 6) it.indentPt = 2.9;
          if (it.diag) it.diag.lines = Math.max(2, it.diag.lines || 1);
          it._tailFixed = true;
        }
        if (it.keepLines && txtLen >= 95) it.keepLines = false;
        return null;
      }
    }
    if (!L.length || (L.length > 1 && !it.keepLines)) return null;     // প্রবাহিত অনুচ্ছেদ Word নিজে ভাঙে
    if (/\$/.test(L.join(''))) return null;                              // সমীকরণ মাপা যায় না
    if (L.every((l) => /^([─━═=_\-.…·])\1{5,}$/.test(String(l).replace(/\s+/g, '')))) return null;   // রেখা-লাইন: builder-এর leader-ট্যাব
    const full = cellW * SAFE;
    const multiFi = a01On && L.length >= 2 && it.keepLines && (it.firstIndentPt || 0) > 0 && FILL.test(L[0] || '');
    const availPt = multiFi ? full - (it.indentPt || 0) : full - sideIndent(it);
    const fontFrom = (wfOn && it.fit && it.fit.fontFrom) ? it.fit.fontFrom : it.fontPt;
    // ০) পূরণ-সারি ("নাম: ........") — Gemini-র গোনা সংখ্যা অনুমান, ফাঁকা জায়গা ⇒ আগে সেটিই ছোট (লেখা/ফন্ট নয়)
    let fillsCut = 0;
    L.forEach((t, i) => {
      const w = lineWidthPt(t, it, measure);
      // WRAPFIT: পূরণ-রেখার পরে লেখা থাকলে (যেমন a01 "বৎসর যাবৎ চিনি। বিগত--- তারিখে...পরিবারের") Word-এ স্বরচিহ্ন ও লিডার-ট্যাবের
      // বাড়তি প্রস্থে শেষ শব্দ পরের লাইনে চলে যায় ⇒ পূরণ-রেখা আগেভাগেই নিরাপদ সীমায় (availPt-এর ৯৩% বা স্বরচিহ্ন-ছাড়সহ) ছোট করা
      const lineAvail = (multiFi && i === 0) ? (full - sideIndent(it)) : availPt;
      const hasTail = wfOn && TAIL_AFTER_FILL_RE.test(t);
      const fixed = FILL.test(t) ? lineWidthPt(t.replace(FILL_G, ''), it, measure) : 0;
      const targetAvail = hasTail ? Math.min(lineAvail * 0.93, lineAvail - fixed * 0.06 - 10) : lineAvail;
      if (w <= targetAvail || !FILL.test(t)) return;
      const fillW = w - fixed;
      if (!(fillW > 0)) return;
      const k = Math.max(0, (targetAvail - fixed) / fillW);
      const nextLine = t.replace(FILL_G, (run) => run[0].repeat(Math.max(3, Math.floor(run.length * k))));
      if (nextLine !== t || !wfOn) {
        L[i] = nextLine;
        fillsCut++;
      }
    });
    let need = Math.max(...L.map((t) => lineWidthPt(t, it, measure)));
    if (!(need > 0)) return null;
    // a17 (২০২৬-১০-১৩): এক-লাইনের শিরোনাম মাপা মূল-প্রস্থের চেয়ে অনেক সরু (৫৪২ ⇒ ৪১১pt) — কালি-অনুমানে ফন্ট ছোট।
    // আমাদের ফন্টে মাপা প্রস্থ মূলের ৯০%-এর কম ⇒ ফন্ট বাড়িয়ে মূল-প্রস্থে (সর্বোচ্চ +৩০%, ঘরের প্রাপ্য প্রস্থ পর্যন্ত)
    const origW = it.rect && it.rect.w > 0 ? it.rect.w : 0;
    if (!global.__FZ_OFF_GROW && !((p4On || a01On) && (it.fontPt >= 30 || String(L[0] || '').replace(/\*\*/g, '').trim().length <= 12 || (a01On && it.diag && it.diag.wPt >= it.fontPt * 0.9))) && L.length === 1 && /^(title|heading|header)$/.test(it.type || '') && !fillsCut && !FILL.test(L[0]) &&
        origW && need < origW * 0.9 && need > 0) {
      const scale = Math.min(1.3, origW / need, availPt / need);
      const f = Math.floor(it.fontPt * scale * 2) / 2;
      if (f > it.fontPt) {
        it.fontPt = f;
        it.fit = { needPt: Math.round(need * 10) / 10, availPt: Math.round(availPt * 10) / 10, fontFrom, grow: true };
        return it.fit;
      }
    }
    // WRAPFIT: মূলে এক-লাইনের বাক্য (যেখানে পূরণ-রেখা কমানোর পরেও বা পূরণ-রেখাহীন বাক্যে প্রস্থ সীমার >৯৫% এবং স্বরচিহ্ন/wPt ঝুঁকি আছে)
    // Word-এ উপচে পড়া রোধে: ১) ইনডেন্ট কমানো, ২) হালকা অক্ষর-সংকোচন (-0.15pt), ৩) তবুও >৯৬% হলে ফন্ট ০.৫pt কমানো
    if (wfOn && L.length === 1 && !/^(title|heading|header)$/.test(it.type || '')) {
      const karCnt = (String(L[0] || '').match(SPACING_KAR_RE) || []).length;
      const wPtSmaller = !!(it.diag && it.diag.wPt && it.diag.wPt < it.fontPt - 0.15);
      const wordRiskNeed = need + (!FILL.test(L[0]) ? karCnt * it.fontPt * 0.08 : 0);
      if (need <= full && (wordRiskNeed > availPt || (need > availPt * 0.95 && (wPtSmaller || karCnt >= 10)))) {
        const roomW = Math.max(0, full * 0.95 - need);
        if (it.align === 'c' && it.centerShiftPt != null) it.centerShiftPt = Math.sign(it.centerShiftPt) * Math.min(Math.abs(it.centerShiftPt), roomW / 2);
        else if (it.align === 'r' && it.rightIndentPt != null) it.rightIndentPt = Math.min(it.rightIndentPt, roomW);
        else {
          const fi = Math.abs(it.firstIndentPt || 0);
          if (fi > roomW) it.firstIndentPt = 0;
          it.indentPt = Math.max(0, Math.min(it.indentPt || 0, roomW - Math.abs(it.firstIndentPt || 0)));
        }
        if (!it.charSpacingPt) it.charSpacingPt = -0.15;
        if (need > (full - sideIndent(it)) * 0.96 || wordRiskNeed > full) {
          if (!it.lineSpacingPt) it.lineSpacingPt = Math.round(fontFrom * 1.15 * 10) / 10;
          it.fontPt = Math.max(1, it.fontPt - 0.5);
          need = Math.max(...L.map((t) => lineWidthPt(t, it, measure)));
        }
        it.fit = { needPt: Math.round(need * 10) / 10, availPt: Math.round(availPt * 10) / 10, fontFrom, fillsCut: fillsCut || ((it.fit && it.fit.fillsCut) || 0) };
        return it.fit;
      }
    }
    if (need <= availPt) {
      if (!fillsCut) return null;
      it.fit = { needPt: Math.round(need * 10) / 10, availPt: Math.round(availPt * 10) / 10, fontFrom, fillsCut };
      return it.fit;
    }
    const room = Math.max(0, full - need);
    // ১) ইনডেন্ট কমানো (দিক অপরিবর্তিত)
    if (it.align === 'c' && it.centerShiftPt != null) it.centerShiftPt = Math.sign(it.centerShiftPt) * Math.min(Math.abs(it.centerShiftPt), room / 2);
    else if (it.align === 'r' && it.rightIndentPt != null) it.rightIndentPt = Math.min(it.rightIndentPt, room);
    else {
      if ((isA10LinesOn() || isP2DriftOn()) && it.align === 'j' && it.justRightPt >= 2) {
        const keepL = (it.indentPt || 0) + Math.abs(it.firstIndentPt || 0);
        it.justRightPt = Math.max(0, Math.min(it.justRightPt, room - keepL));
      }
      const remRoom = Math.max(0, room - ((isA10LinesOn() || isP2DriftOn()) && it.align === 'j' && it.justRightPt >= 2 ? it.justRightPt : 0));
      const fi = Math.abs(it.firstIndentPt || 0);
      if (!multiFi && fi > remRoom) it.firstIndentPt = 0;
      if (!multiFi) it.indentPt = Math.max(0, Math.min(it.indentPt || 0, remRoom - Math.abs(it.firstIndentPt || 0)));
    }
    // ২) পুরো প্রস্থেও না আঁটলে ফন্ট ছোট
    if (need > full) {
      const scale = Math.max(MIN_SCALE, full / need);
      it.fontPt = Math.max(1, Math.floor(it.fontPt * scale * 2) / 2);
    }
    it.fit = { needPt: Math.round(need * 10) / 10, availPt: Math.round(availPt * 10) / 10, fontFrom, fillsCut };
    return it.fit;
  }

  /** পুরো নকশা; ফেরত: বদলানো অংশের সংখ্যা */

  /** A05_DRIFT_v1: পূর্ব-নির্মিত বা সরাসরি লোড করা IR-এর পাতা-২ (page >= 2) মূলের লাইন-সংখ্যা ও উল্লম্ব অবস্থানের সাথে সামঞ্জস্যপূর্ণ করা */
  function repairP2DriftPage(page) {
    if (!isP2DriftOn() || !page || (page.page != null && page.page < 2) || !Array.isArray(page.bands) || page._p2DriftRepaired) return page;
    let IR = (typeof globalThis !== 'undefined' && globalThis.FayzarLayoutIR) || (global && global.FayzarLayoutIR);
    if (!IR && typeof require === 'function') { try { IR = require('./layout-ir.js'); } catch (e) { IR = null; } }
    if (IR && typeof IR.repairP2DriftPage === 'function') return IR.repairP2DriftPage(page);
    return page;
  }

  function repairP2DriftIr(ir) {
    if (!isP2DriftOn() || !ir || !Array.isArray(ir.pages)) return ir;
    ir.pages.forEach((p, idx) => {
      if ((p.page != null ? p.page : idx + 1) >= 2) repairP2DriftPage(p);
    });
    return ir;
  }

  function fit(ir, measure, opts) {
    const a01On = isA01FixOn(), wfOn = isWrapFitOn() || a01On, p4On = isPages4On(), elOn = isExtraLinesOn(), a10On = isA10LinesOn(),
      p1On = isP1LossOn(), p2On = isP2DriftOn(), rfOn = isRuleFixOn();
    if (a10On) repairA10Ir(ir);
    if (p1On) repairP1LossIr(ir);
    if (a01On) repairA01Ir(ir);
    if (p2On) repairP2DriftIr(ir);
    if (rfOn) repairRuleFixIr(ir);
    if ((wfOn || p4On || elOn || a10On || p1On || rfOn) && typeof measure !== 'function') measure = defaultWrapMeasure;
    if (!ir || !ir.pages || typeof measure !== 'function') return 0;
    const prevFont = _activeFitFont;
    if (isFontPickOn()) {
      _activeFitFont = (typeof opts === 'string' && opts) || (opts && (opts.font || opts.unicodeFont)) || ir.font || ir.unicodeFont || _activeFitFont;
      // ফন্ট বদলে পুনরায় fit চালালে আগের fontFrom থেকে নতুন অনুপাতে হিসাব করা
      if (opts && (typeof opts === 'string' || opts.font || opts.unicodeFont || opts.resetFont)) {
        for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
          for (const it of cell.items || []) if (it && it.fit && it.fit.fontFrom) { it.fontPt = it.fit.fontFrom; delete it.fit; }
        }
      }
    }
    let n = 0;
    try {
    for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
      let cellW = (cell.x1 || 0) - (cell.x0 || 0);
      // WRAPFIT: পাতার ডান/বাম মার্জিনের ভেতরের প্রকৃত মুদ্রণযোগ্য প্রস্থে cellW সীমিত রাখা (যেমন a01-এ 540.5pt -> 540pt = 468pt)
      if (wfOn && page.widthPt > 0 && page.margins) {
        const pLeft = page.margins.left || 0, pRight = page.widthPt - (page.margins.right || 0);
        const cx0 = Math.max(cell.x0 || 0, pLeft), cx1 = pRight > cx0 ? Math.min(cell.x1 || 0, pRight) : (cell.x1 || 0);
        cellW = Math.max(0, Math.min(cellW, cx1 - cx0));
      }
      for (const it of cell.items || []) {
        if (p4On && it && page.bodyFontPt) it._pageBodyFont = page.bodyFontPt;
        if (it && it.kind === 'table' ? fitTable(it, measure) : fitItem(it, cellW, measure)) n++;
        if (p4On && it && it._pageBodyFont) delete it._pageBodyFont;
      }
    }
    // বহু-পাতার চেকলিস্ট ছকে (≥৪ কলাম, যেমন a16) fitTable-এর পর ফন্টের সমতা রক্ষা; ২-কলামের ছোট ছকে (a03) নয় (FZ_OFF=TSYNC30)
    if (!globalThis.__FZ_OFF_TSYNC30) {
      const allT = [];
      for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
        for (const it of cell.items || []) if (it && it.kind === 'table' && it.fontPt && it.colFractions && it.colFractions.length >= 4) allT.push(it);
      }
      const used = new Set();
      for (const t of allT) {
        if (used.has(t)) continue;
        const h0 = (t.rows && t.rows[0] || []).join('|');
        const grp = allT.filter((o) => !used.has(o) && o.colFractions.length === t.colFractions.length &&
          (o.colFractions.every((f, k) => Math.abs(f - t.colFractions[k]) <= 0.12) || (h0.length >= 10 && ((o.rows && o.rows[0] || []).join('|') === h0))));
        grp.forEach((o) => used.add(o));
        if (grp.length < 3) continue;
        const fs = grp.map((o) => o.fontPt).sort((a, b) => a - b);
        const target = fs[Math.floor(fs.length * 0.3)];
        grp.forEach((o) => { if (Math.abs(o.fontPt - target) <= target * 0.3) o.fontPt = target; });
      }
      // EXTRALINES: একই ব্লক থেকে ফাঁকে ভাগ হওয়া ছোট বর্ডারলেস ছকগুলোর (যেমন a19-এর ১০। কেন্দ্র সচিবের স্বাক্ষর/সিলমোহর, splitPart 0..2) অভিন্ন ফন্ট রক্ষা
      if (elOn) {
        const spGroups = new Map();
        for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
          for (const it of cell.items || []) {
            if (it && it.kind === "table" && it.splitPart != null && it.borderless && Array.isArray(it.box)) {
              const key = it.box.join(",");
              if (!spGroups.has(key)) spGroups.set(key, []);
              spGroups.get(key).push(it);
            }
          }
        }
        for (const grp of spGroups.values()) {
          if (grp.length < 2) continue;
          const minF = Math.min(...grp.map((x) => x.fontPt || 12));
          grp.forEach((x) => { x.fontPt = minF; });
        }
      }
      if (globalThis.__FZ_ON_FORMFIX && !globalThis.__FZ_OFF_FORMFIX) {
        const noVT = [];
        for (const page of ir.pages) for (const band of page.bands || []) for (const cell of band.cells || []) {
          for (const it of cell.items || []) if (it && it.kind === "table" && it.noVRules && it.rows && it.rows.length >= 10) noVT.push(it);
        }
        if (noVT.length >= 2) {
          const maxF = Math.max(...noVT.map((t) => t.fontPt || 10));
          noVT.forEach((t) => { if (t.fontPt < maxF) t.fontPt = maxF; });
        }
      }
    }
    return n;
    } finally {
      _activeFitFont = prevFont;
    }
  }

  const FayzarLineFit = { fit, fitItem, fitTable, sideIndent, lineWidthPt, FONT_WIDTH_RATIOS, getFontWidthRatio, isFontPickOn, isWrapFitOn, isExtraLinesOn, isA10LinesOn, repairA10Ir,
    isP1LossOn, repairP1LossIr, isA01FixOn, repairA01Ir, isP2DriftOn, repairP2DriftPage, repairP2DriftIr, isRuleFixOn, repairRuleFixIr };
  global.FayzarLineFit = FayzarLineFit;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarLineFit;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));