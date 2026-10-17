// QA (ধাপ ১): এডিট-স্কোর — তৈরি .docx ফাইলের প্রতিটি ফাঁকা ঘর আর বিন্দু/ড্যাশ/লিডার-লাইনে একটি নমুনা নাম
// ("মোঃ আব্দুল করিম") টাইপ করে ৪টি মাপকাঠি মাপে:
//   ১) পাতার সংখ্যা বদলাল কি না (page: ২৫)
//   ২) কোনো লাইন বা ঘর উপচে গেল কি না (overflow: ২৫)
//   ৩) ছকের সারি বা ঘর কতটা সরল (shift: ২৫)
//   ৪) লেখা কাটল কি না — hRule="exact", সংকীর্ণ lineRule="exact", ভাসমান ফ্রেম/টেক্সটবক্স (clip: ২৫)
// ফল: প্রতি ফাইলে ০ থেকে ১০০-এর একটি সংখ্যা। আউটপুট সর্বোচ্চ ৩০ লাইনের সারাংশ; বিস্তারিত: <id>/edit-score.json।
// চালানো:
//   node qa/edit-score.mjs [--ids a02,a03,a16,a17,a18,f1,f2] [--dir samples] [--sample "মোঃ আব্দুল করিম"]
//   node qa/edit-score.mjs <file.docx> [outDir]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = fs.existsSync(path.join(__dirname, '..', '..', 'qa'))
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(__dirname, '..');

const DEFAULT_SAMPLE = 'মোঃ আব্দুল করিম';
const FILL_RUN_RE = /([._\-…·─━═])\1{3,}/;
const FILL_RUN_G = /([._\-…·─━═])\1{3,}/g;

const ramp = (v, full, zero) => (v <= full ? 1 : v >= zero ? 0 : 1 - (v - full) / (zero - full));
const r1 = (v) => Math.round(v * 10) / 10;

/** SutonnyOMJ + Times New Roman প্রস্থের ক্যালিব্রেটেড পরিমাপ (pt) */
export function textWidthPt(text, fontPt = 11, bold = false) {
  const s = String(text || '');
  let u100 = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i], code = s.charCodeAt(i);
    if (/[\u0981-\u0983\u09BC\u09C1-\u09C4\u09CD\u09D7]/.test(ch)) continue;
    if (/[\u09BE-\u09C0\u09C7-\u09CC]/.test(ch)) { u100 += 26; continue; }
    if (ch === ' ') { u100 += 25; continue; }
    if (/[.…·]/.test(ch)) { u100 += 25; continue; }
    if (/[-_─━═=]/.test(ch)) { u100 += 38; continue; }
    if (code < 128) { u100 += bold ? 50 : 46; continue; }
    u100 += 44;
  }
  return u100 * (fontPt / 100) * (bold ? 1.02 : 1);
}

const xmlUnesc = (s) => String(s || '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const xmlEsc = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** অনুচ্ছেদের XML থেকে দৃশ্যমান লেখা ও ট্যাব উদ্ধার */
function paraTextOf(pXml) {
  let out = '';
  const tokRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g;
  let m;
  while ((m = tokRe.exec(pXml))) {
    if (m[0] === '<w:tab/>') out += '\t';
    else if (m[0] === '<w:br/>') out += '\n';
    else out += xmlUnesc(m[1]);
  }
  return out;
}

/** অনুচ্ছেদের ফন্ট-আকার (pt) উদ্ধার */
function paraFontPt(pXml, defPt = 11) {
  const m = /<w:sz w:val="(\d+)"/.exec(pXml);
  return m ? (+m[1]) / 2 : defPt;
}

/**
 * একটি অনুচ্ছেদে বিন্দু/ড্যাশ বা ট্যাব-লিডার থাকলে সেখানে নমুনা নাম বসানো।
 * ফেরত: { xml, edited: boolean, kind: 'leader'|'literal'|null }
 */
function editParagraphXml(pXml, sampleText = DEFAULT_SAMPLE) {
  const txt = paraTextOf(pXml);
  const trimmed = txt.replace(/\s+/g, '');
  if (!trimmed) return { xml: pXml, edited: false, kind: null };
  // নিরেট বিভাজক রেখা (শুধু '────' বা '====' যেগুলোর সাথে কোনো লেবেল নেই) পূরণ-লাইন নয়
  if (/^[─━═=_]{6,}$/.test(trimmed)) return { xml: pXml, edited: false, kind: null };

  const hasLeaderDef = /<w:tab\b[^>]*\bw:leader="(?:dot|hyphen|underscore|middleDot)"/.test(pXml);
  const hasTabRun = /<w:tab\/>/.test(pXml);

  let curXml = pXml;
  let editedLiteral = false;
  let editedLeader = false;

  if (FILL_RUN_RE.test(txt)) {
    curXml = curXml.replace(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (full, attrs, inner) => {
      const raw = xmlUnesc(inner);
      if (!FILL_RUN_RE.test(raw)) return full;
      editedLiteral = true;
      const replaced = raw.replace(FILL_RUN_G, (run) => `${sampleText} ${run}`);
      return `<w:t xml:space="preserve">${xmlEsc(replaced)}</w:t>`;
    });
  }

  if (hasLeaderDef && hasTabRun) {
    const fHalf = Math.round(paraFontPt(curXml, 11) * 2);
    const insRun = `<w:r><w:rPr><w:rFonts w:ascii="SutonnyOMJ" w:hAnsi="SutonnyOMJ" w:cs="SutonnyOMJ"/><w:sz w:val="${fHalf}"/><w:szCs w:val="${fHalf}"/></w:rPr><w:t xml:space="preserve"> ${xmlEsc(sampleText)}</w:t></w:r>`;
    const tabDefs = [...curXml.matchAll(/<w:tab\b[^>]*\/>/g)].map((m) => /w:leader="(?:dot|hyphen|underscore|middleDot)"/.test(m[0]));
    let tabIdx = 0;
    let count = 0;
    curXml = curXml.replace(/<w:r>(?:(?!<\/w:r>)[\s\S])*?<w:tab\/><\/w:r>/g, (tabRun) => {
      const isLead = tabIdx < tabDefs.length ? tabDefs[tabIdx] : tabDefs[tabDefs.length - 1];
      tabIdx++;
      if (!isLead) return tabRun;
      count++;
      return insRun + tabRun;
    });
    if (count > 0) editedLeader = true;
  }

  if (!editedLiteral && !editedLeader) return { xml: pXml, edited: false, kind: null };
  return { xml: curXml, edited: true, kind: editedLiteral ? 'literal' : 'leader' };
}

/**
 * পুরো document.xml-এর প্রতিটি ফাঁকা ঘর (leaf <w:tc>) ও বিন্দু/ড্যাশ/লিডার অনুচ্ছেদে sampleText বসানো।
 */
export function editDocumentXml(docXml, sampleText = DEFAULT_SAMPLE) {
  let editedCells = 0;
  let editedDigitBoxes = 0;
  let editedTickCells = 0;
  let editedLeaderParas = 0;
  let editedLiteralParas = 0;

  // ধাপ ক: সকল অনুচ্ছেদে বিন্দু/ড্যাশ/লিডার সম্পাদনা
  let xml = docXml.replace(/<w:p>[\s\S]*?<\/w:p>/g, (pXml) => {
    const res = editParagraphXml(pXml, sampleText);
    if (res.edited) {
      if (res.kind === 'literal') editedLiteralParas++;
      else editedLeaderParas++;
    }
    return res.xml;
  });

  // ধাপ খ: প্রতিটি ফাঁকা leaf <w:tc> (যার ভেতরে নেস্টেড <w:tbl> নেই এবং যা vMerge-continue নয়) সম্পাদনা
  xml = xml.replace(/<w:tc>([\s\S]*?)<\/w:tc>/g, (fullTc, inner) => {
    if (/<w:tbl>/.test(inner)) return fullTc;
    const tcPrMatch = /<w:tcPr>([\s\S]*?)<\/w:tcPr>/.exec(inner);
    const tcPr = tcPrMatch ? tcPrMatch[1] : '';
    if (/<w:vMerge\s*\/>/.test(tcPr) || /<w:vMerge\b(?![^>]*w:val="restart")[^>]*>/.test(tcPr)) {
      return fullTc;
    }
    if (/<w:drawing>/.test(inner)) return fullTc;

    const visText = paraTextOf(inner).replace(/\s+/g, '');
    if (visText.length > 0) return fullTc;

    const wMatch = /<w:tcW w:w="(\d+)"/.exec(tcPr);
    const widthPt = wMatch ? (+wMatch[1]) / 20 : 60;
    let fillVal = sampleText;
    if (widthPt <= 24) {
      fillVal = '৫';
      editedDigitBoxes++;
    } else {
      editedCells++;
    }

    let done = false;
    const updatedInner = inner.replace(/<w:p>([\s\S]*?)<\/w:p>/, (pFull, pIn) => {
      if (done) return pFull;
      done = true;
      const szMatch = /<w:sz w:val="(\d+)"/.exec(pIn);
      const szVal = szMatch ? +szMatch[1] : 20;
      const pPrMatch = /<w:pPr>[\s\S]*?<\/w:pPr>/.exec(pIn);
      const pPr = pPrMatch ? pPrMatch[0] : '';
      const run = `<w:r><w:rPr><w:rFonts w:ascii="SutonnyOMJ" w:hAnsi="SutonnyOMJ" w:cs="SutonnyOMJ"/><w:sz w:val="${szVal}"/><w:szCs w:val="${szVal}"/></w:rPr><w:t xml:space="preserve">${xmlEsc(fillVal)}</w:t></w:r>`;
      return `<w:p>${pPr}${run}</w:p>`;
    });
    return `<w:tc>${updatedInner}</w:tc>`;
  });

  return {
    xml,
    stats: {
      editedCells,
      editedTickCells,
      editedDigitBoxes,
      editedLeaderParas,
      editedLiteralParas,
      totalEdited: editedCells + editedTickCells + editedLeaderParas + editedLiteralParas
    }
  };
}

/** XML ব্লকের ভেতর থেকে শীর্ষ-স্তরের <w:p> এবং <w:tbl> ক্রমানুসারে আলাদা করা */
function splitBlocks(containerXml) {
  const blocks = [];
  let pos = 0;
  while (pos < containerXml.length) {
    const nextP = containerXml.indexOf('<w:p>', pos);
    const nextTbl = containerXml.indexOf('<w:tbl>', pos);
    if (nextP < 0 && nextTbl < 0) break;
    if (nextP >= 0 && (nextTbl < 0 || nextP < nextTbl)) {
      const endP = containerXml.indexOf('</w:p>', nextP);
      if (endP < 0) break;
      blocks.push({ kind: 'p', xml: containerXml.slice(nextP, endP + 6) });
      pos = endP + 6;
    } else {
      let depth = 0, cur = nextTbl;
      while (cur < containerXml.length) {
        const o = containerXml.indexOf('<w:tbl>', cur);
        const c = containerXml.indexOf('</w:tbl>', cur);
        if (c < 0) { cur = containerXml.length; break; }
        if (o >= 0 && o < c) { depth++; cur = o + 7; }
        else {
          depth--;
          cur = c + 8;
          if (depth <= 0) break;
        }
      }
      blocks.push({ kind: 'tbl', xml: containerXml.slice(nextTbl, cur) });
      pos = cur;
    }
  }
  return blocks;
}

/** একটি <w:tbl> থেকে শীর্ষ-স্তরের <w:tr> সমূহ আলাদা করা */
function splitRows(tXml) {
  const trXmls = [];
  let tPos = 0;
  while (tPos < tXml.length) {
    const nextTr = tXml.indexOf('<w:tr>', tPos);
    const nextSubTbl = tXml.indexOf('<w:tbl>', tPos + 7);
    if (nextTr < 0) break;
    if (nextSubTbl >= 0 && nextSubTbl < nextTr) {
      let d = 0, c = nextSubTbl;
      while (c < tXml.length) {
        const o = tXml.indexOf('<w:tbl>', c);
        const cl = tXml.indexOf('</w:tbl>', c);
        if (cl < 0) { c = tXml.length; break; }
        if (o >= 0 && o < cl) { d++; c = o + 7; }
        else { d--; c = cl + 8; if (d <= 0) break; }
      }
      tPos = c;
      continue;
    }
    let dTr = 0, cTr = nextTr;
    while (cTr < tXml.length) {
      const o = tXml.indexOf('<w:tr>', cTr);
      const cl = tXml.indexOf('</w:tr>', cTr);
      if (cl < 0) { cTr = tXml.length; break; }
      if (o >= 0 && o < cl) { dTr++; cTr = o + 6; }
      else { dTr--; cTr = cl + 7; if (dTr <= 0) break; }
    }
    trXmls.push(tXml.slice(nextTr, cTr));
    tPos = cTr;
  }
  return trXmls;
}

/** একটি <w:tr> থেকে শীর্ষ-স্তরের <w:tc> সমূহ আলাদা করা */
function splitCells(tr) {
  const tcXmls = [];
  let cPos = 0;
  while (cPos < tr.length) {
    const nextTc = tr.indexOf('<w:tc>', cPos);
    if (nextTc < 0) break;
    let dTc = 0, curTc = nextTc;
    while (curTc < tr.length) {
      const o = tr.indexOf('<w:tc>', curTc);
      const cl = tr.indexOf('</w:tc>', curTc);
      if (cl < 0) { curTc = tr.length; break; }
      if (o >= 0 && o < cl) { dTc++; curTc = o + 6; }
      else { dTc--; curTc = cl + 7; if (dTc <= 0) break; }
    }
    tcXmls.push(tr.slice(nextTc, curTc));
    cPos = curTc;
  }
  return tcXmls;
}

/**
 * OOXML জ্যামিতি সিমুলেটর: প্রতিটি পাতার অনুচ্ছেদ ও ছকের সারি/ঘরের অবস্থান (y, উচ্চতা, লাইন-সংখ্যা) নির্ণয়।
 * লেআউট-ধারক ছক (gridXml ও boxTableXml) রিকার্সিভলি খুলে ভেতরের অনুচ্ছেদ ও ফরম-ছক মাপে।
 */
export function simulateOoxmlLayout(docXml) {
  const frames = (docXml.match(/<w:framePr\b|<w:txbxContent\b/g) || []).length;
  const exactRowCount = (docXml.match(/<w:trHeight\b[^>]*\bw:hRule="exact"/g) || []).length;

  const sectMatches = [...docXml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)];
  const defaultSect = { wPt: 595.3, hPt: 841.9, topPt: 42, bottomPt: 36, leftPt: 54, rightPt: 54 };
  const parseSect = (sXml) => {
    const pgSz = /<w:pgSz w:w="(\d+)" w:h="(\d+)"/.exec(sXml);
    const pgMar = /<w:pgMar w:top="(-?\d+)" w:right="(-?\d+)" w:bottom="(-?\d+)" w:left="(-?\d+)"/.exec(sXml);
    return {
      wPt: pgSz ? (+pgSz[1]) / 20 : 595.3,
      hPt: pgSz ? (+pgSz[2]) / 20 : 841.9,
      topPt: pgMar ? Math.abs(+pgMar[1]) / 20 : 42,
      rightPt: pgMar ? Math.abs(+pgMar[2]) / 20 : 54,
      bottomPt: pgMar ? Math.abs(+pgMar[3]) / 20 : 36,
      leftPt: pgMar ? Math.abs(+pgMar[4]) / 20 : 54
    };
  };
  const sects = sectMatches.length ? sectMatches.map((m) => parseSect(m[0])) : [defaultSect];

  const bodyMatch = /<w:body>([\s\S]*?)<\/w:body>/.exec(docXml);
  const bodyXml = bodyMatch ? bodyMatch[1] : docXml;

  let sectIdx = 0;
  let curSect = sects[0] || defaultSect;
  let pageNo = 1;
  let curY = curSect.topPt;
  const pageLimit = () => curSect.hPt - curSect.bottomPt;

  const paras = [];
  const tables = [];
  let exactTightParaCount = 0;

  const measurePara = (pXml, availW, inDataCell = false) => {
    const pPrMatch = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(pXml);
    const pPr = pPrMatch ? pPrMatch[1] : '';
    const spBefore = /w:before="(\d+)"/.exec(pPr);
    const spAfter = /w:after="(\d+)"/.exec(pPr);
    const spLine = /w:line="(\d+)"/.exec(pPr);
    const spRule = /w:lineRule="([^"]+)"/.exec(pPr);
    const indLeft = /w:left="(-?\d+)"/.exec(pPr);
    const indRight = /w:right="(-?\d+)"/.exec(pPr);
    const beforePt = spBefore ? (+spBefore[1]) / 20 : 0;
    const afterPt = spAfter ? (+spAfter[1]) / 20 : 0;
    const indLPt = indLeft ? (+indLeft[1]) / 20 : 0;
    const indRPt = indRight ? (+indRight[1]) / 20 : 0;
    const fontPt = paraFontPt(pXml, 11);
    const bold = /<w:b\/>/.test(pXml);
    const txt = paraTextOf(pXml);
    const drawMatch = /<wp:extent cx="(\d+)" cy="(\d+)"/.exec(pXml);
    const drawHPt = drawMatch ? (+drawMatch[2]) / 12700 : 0;

    const tabStops = [...pPr.matchAll(/<w:tab\b[^>]*\bw:pos="(\d+)"[^>]*\/>/g)].map((m) => ({
      posPt: (+m[1]) / 20,
      leader: /w:leader="([^"]+)"/.exec(m[0])?.[1] || 'none',
      val: /w:val="([^"]+)"/.exec(m[0])?.[1] || 'left'
    }));

    const lineW = Math.max(16, availW - indLPt - indRPt);
    const logicalLines = txt.split('\n');
    let totalLines = 0;

    for (const ln of logicalLines) {
      if (!ln.trim()) { totalLines += 1; continue; }
      if (ln.includes('\t') && tabStops.length > 0) {
        const parts = ln.split('\t');
        let curX = indLPt;
        let wrapsInTabLine = 1;
        for (let k = 0; k < parts.length; k++) {
          const pw = textWidthPt(parts[k], fontPt, bold);
          if (k < parts.length - 1) {
            const stop = tabStops[Math.min(k, tabStops.length - 1)];
            const stopX = stop ? stop.posPt : availW;
            const nextStop = tabStops[k];
            if (nextStop && nextStop.val === 'right' && (!parts[k + 1] || !parts[k + 1].trim())) {
              if (curX + pw > stopX + 6) wrapsInTabLine++;
              curX = stopX;
            } else if (nextStop && nextStop.val === 'right') {
              const nextW = textWidthPt(parts[k + 1] || '', fontPt, bold);
              if (curX + pw + nextW > stopX + 6) wrapsInTabLine++;
              curX = stopX;
              k++;
            } else {
              if (curX + pw > stopX + 6) wrapsInTabLine++;
              curX = Math.max(curX + pw, stopX);
            }
          } else {
            if (pw > 0 && curX + pw > availW - indRPt + 6) {
              wrapsInTabLine += Math.ceil((curX + pw - (availW - indRPt)) / lineW);
            }
          }
        }
        totalLines += wrapsInTabLine;
      } else {
        const w = textWidthPt(ln, fontPt, bold);
        totalLines += Math.max(1, Math.ceil((w - 3) / lineW));
      }
    }

    const natLineH = fontPt * 1.15;
    const specLinePt = spLine ? (+spLine[1]) / 20 : 0;
    const rule = spRule ? spRule[1] : 'auto';
    let lineHPt = natLineH;
    if (rule === 'exact' && specLinePt > 0) lineHPt = specLinePt;
    else if (rule === 'atLeast' && specLinePt > 0) lineHPt = Math.max(natLineH, specLinePt);
    else if (specLinePt > 0) lineHPt = fontPt * (specLinePt / 12);

    // খালি স্পেসার অনুচ্ছেদ (sz=2 বা line<=20)
    const isTinySpacer = !txt.trim() && !drawHPt && (fontPt <= 2 || (rule === 'exact' && specLinePt <= 4));
    const hPt = isTinySpacer ? specLinePt : Math.max(drawHPt, totalLines * lineHPt);
    const tightClip = !isTinySpacer && rule === 'exact' && txt.trim().length > 0 && (specLinePt < fontPt * 0.9 || (totalLines > 1 && !inDataCell && specLinePt < fontPt * 1.0));
    if (tightClip) exactTightParaCount++;

    return {
      beforePt, afterPt, hPt, totalLines: isTinySpacer ? 0 : totalLines, fontPt, rule, specLinePt,
      hasSectBreak: /<w:sectPr\b/.test(pPr),
      isTinySpacer,
      textLen: txt.trim().length,
      tightClip
    };
  };

  const processSequence = (xmlSeq, availW, startY0, allowPageBreak = true) => {
    const blocks = splitBlocks(xmlSeq);
    let y = startY0;
    for (const blk of blocks) {
      if (blk.kind === 'p') {
        const mp = measurePara(blk.xml, availW, false);
        if (!mp.isTinySpacer) {
          if (allowPageBreak && y + mp.beforePt + mp.hPt > pageLimit() + 18 && y > curSect.topPt + 40) {
            pageNo++;
            y = curSect.topPt;
          }
          const py = y + mp.beforePt;
          paras.push({
            i: paras.length + 1,
            page: pageNo,
            y: r1(py),
            lines: mp.totalLines,
            hPt: r1(mp.hPt),
            rule: mp.rule,
            tightClip: mp.tightClip,
            textLen: mp.textLen
          });
          y = py + mp.hPt + mp.afterPt;
        } else {
          y += mp.beforePt + mp.hPt + mp.afterPt;
        }
        if (mp.hasSectBreak) {
          sectIdx = Math.min(sects.length - 1, sectIdx + 1);
          curSect = sects[sectIdx] || defaultSect;
          pageNo++;
          y = curSect.topPt;
        }
      } else if (blk.kind === 'tbl') {
        y = processTable(blk.xml, availW, y, allowPageBreak);
      }
    }
    return y;
  };

  const processTable = (tXml, availW, startY0, allowPageBreak = true) => {
    const tblPrMatch = /<w:tblPr>([\s\S]*?)<\/w:tblPr>/.exec(tXml);
    const tblPr = tblPrMatch ? tblPrMatch[1] : '';
    const borderless = /<w:top w:val="nil"\/>/.test(tblPr) && /<w:bottom w:val="nil"\/>/.test(tblPr) && /<w:insideH w:val="nil"\/>/.test(tblPr);
    const defMarMatch = /<w:tblCellMar>[\s\S]*?<w:left w:w="(\d+)"/.exec(tblPr);
    const defMarPt = defMarMatch ? (+defMarMatch[1]) / 20 : (borderless ? 0 : 5.4);

    const trXmls = splitRows(tXml);
    // ১-সারির বর্ডারহীন গ্রিড (gridXml) অথবা ১-ঘরের বক্স-ফ্রেম টেবিল (boxTableXml) হলে এটি লেআউট-ধারক: ভেতরের অনুচ্ছেদ ও টেবিল রিকার্সিভলি মাপা
    if (trXmls.length === 1 && borderless) {
      const tcXmls = splitCells(trXmls[0]);
      let maxEndY = startY0;
      for (const tc of tcXmls) {
        const tcPrMatch = /<w:tcPr>([\s\S]*?)<\/w:tcPr>/.exec(tc);
        const tcPr = tcPrMatch ? tcPrMatch[1] : '';
        const wMatch = /<w:tcW w:w="(\d+)"/.exec(tcPr);
        const cwPt = wMatch ? (+wMatch[1]) / 20 : (availW / Math.max(1, tcXmls.length));
        const innerXml = tc.replace(/^<w:tc>(\s*<w:tcPr>[\s\S]*?<\/w:tcPr>)?/, '').replace(/<\/w:tc>$/, '');
        const endY = processSequence(innerXml, cwPt - 2 * defMarPt, startY0, false);
        if (endY > maxEndY) maxEndY = endY;
      }
      return maxEndY;
    }

    let y = startY0;
    const rowsOut = [];
    for (let ri = 0; ri < trXmls.length; ri++) {
      const tr = trXmls[ri];
      const trPrMatch = /<w:trPr>([\s\S]*?)<\/w:trPr>/.exec(tr);
      const trPr = trPrMatch ? trPrMatch[1] : '';
      const hMatch = /<w:trHeight w:val="(\d+)"(?:\s+w:hRule="([^"]+)")?/.exec(trPr);
      const specRowHPt = hMatch ? (+hMatch[1]) / 20 : 0;
      const hRule = hMatch ? (hMatch[2] || 'atLeast') : 'atLeast';

      const tcXmls = splitCells(tr);
      const cellsOut = [];
      let maxCellContentH = 0;
      let rowClipped = false;
      let curX = curSect.leftPt;

      for (let ci = 0; ci < tcXmls.length; ci++) {
        const tc = tcXmls[ci];
        const tcPrMatch = /<w:tcPr>([\s\S]*?)<\/w:tcPr>/.exec(tc);
        const tcPr = tcPrMatch ? tcPrMatch[1] : '';
        const wMatch = /<w:tcW w:w="(\d+)"/.exec(tcPr);
        const cwPt = wMatch ? (+wMatch[1]) / 20 : (availW / Math.max(1, tcXmls.length));
        const tcMarMatch = /<w:tcMar>[\s\S]*?<w:left w:w="(\d+)"/.exec(tcPr);
        const cellMarPt = tcMarMatch ? (+tcMarMatch[1]) / 20 : defMarPt;
        const isVMergeCont = /<w:vMerge\s*\/>/.test(tcPr) || /<w:vMerge\b(?![^>]*w:val="restart")[^>]*>/.test(tcPr);
        const isVMergeStart = /<w:vMerge w:val="restart"\/>/.test(tcPr);
        const hasSubTbl = /<w:tbl>/.test(tc);

        let cellLines = 0;
        let cellH = 0;
        if (!hasSubTbl && !isVMergeCont) {
          const cellParas = tc.match(/<w:p>[\s\S]*?<\/w:p>/g) || [];
          for (const cp of cellParas) {
            const mp = measurePara(cp, Math.max(14, cwPt - 2 * cellMarPt), true);
            cellLines += mp.totalLines;
            cellH += mp.beforePt + mp.hPt + mp.afterPt;
          }
        } else if (hasSubTbl) {
          const innerXml = tc.replace(/^<w:tc>(\s*<w:tcPr>[\s\S]*?<\/w:tcPr>)?/, '').replace(/<\/w:tc>$/, '');
          const subEndY = processSequence(innerXml, Math.max(20, cwPt - 2 * cellMarPt), y, false);
          cellLines = 1;
          cellH = Math.max(specRowHPt || 16, subEndY - y);
        }

        if (!isVMergeCont && !isVMergeStart) {
          maxCellContentH = Math.max(maxCellContentH, cellH + (borderless ? 0 : 0.75));
        } else if (isVMergeStart) {
          maxCellContentH = Math.max(maxCellContentH, Math.min(cellH, specRowHPt || 16));
        }

        if (hRule === 'exact' && specRowHPt > 0 && cellH > specRowHPt + 2.5 && paraTextOf(tc).trim().length > 0) {
          rowClipped = true;
        }

        cellsOut.push({
          c: ci + 1,
          w: r1(cwPt),
          x: r1(curX),
          y: r1(y),
          lines: cellLines,
          cellH: r1(cellH),
          vMerge: isVMergeCont ? 'continue' : isVMergeStart ? 'restart' : null
        });
        curX += cwPt;
      }

      const effRowH = hRule === 'exact' && specRowHPt > 0
        ? specRowHPt
        : Math.max(specRowHPt + (borderless ? 0 : 0.75), maxCellContentH);

      if (allowPageBreak && !borderless && y + effRowH > pageLimit() + 18 && y > curSect.topPt + 40) {
        pageNo++;
        y = curSect.topPt;
      }

      rowsOut.push({
        r: ri + 1,
        page: pageNo,
        y: r1(y),
        h: r1(effRowH),
        hRule: hRule === 'exact' ? 2 : 1,
        clipped: rowClipped,
        cells: cellsOut
      });
      y += effRowH;
    }

    tables.push({
      t: tables.length + 1,
      borderless,
      rows: rowsOut
    });
    return y;
  };

  const bodyW0 = curSect.wPt - curSect.leftPt - curSect.rightPt;
  curY = processSequence(bodyXml, bodyW0, curY, true);

  return {
    pages: pageNo,
    frames,
    exactRowCount,
    exactTightParaCount,
    paras,
    tables
  };
}

/**
 * Before এবং After মাপ থেকে ৪টি সাব-স্কোর (page, overflow, shift, clip) এবং মোট এডিট-স্কোর (০–১০০) গণনা।
 */
export function computeEditScoreFromStates(before, after, editStats) {
  const totalTargets = Math.max(1, editStats.totalEdited || 1);

  // ১) পাতার সংখ্যা বদলাল কি না (২৫ নম্বর)
  const extraPages = Math.max(0, after.pages - before.pages);
  const pageScore = extraPages === 0
    ? 25
    : r1(Math.max(0, 25 * (1 - extraPages / Math.max(1, before.pages))));

  // ২) কোনো লাইন বা ঘর উপচে গেল কি না (২৫ নম্বর)
  let paraOverflows = 0;
  const nP = Math.min(before.paras.length, after.paras.length);
  for (let i = 0; i < nP; i++) {
    if (after.paras[i].lines > before.paras[i].lines) paraOverflows++;
  }

  let cellOverflows = 0;
  let clippedCells = 0;
  const rowShifts = [];
  const nT = Math.min(before.tables.length, after.tables.length);
  for (let t = 0; t < nT; t++) {
    const tb = before.tables[t], ta = after.tables[t];
    if (tb.borderless) continue;
    const nR = Math.min(tb.rows.length, ta.rows.length);
    for (let r = 0; r < nR; r++) {
      const rb = tb.rows[r], ra = ta.rows[r];
      const pagePenalty = (ra.page - rb.page) * 40;
      const dy = Math.abs((ra.y - rb.y) + pagePenalty);
      rowShifts.push(dy);

      const rowExpanded = ra.h > rb.h + 2.5;
      const nC = Math.min(rb.cells.length, ra.cells.length);
      for (let c = 0; c < nC; c++) {
        const cb = rb.cells[c], ca = ra.cells[c];
        if (ca.vMerge === 'continue') continue;
        if (ca.lines > Math.max(1, cb.lines) && (rowExpanded || ra.hRule === 2)) {
          cellOverflows++;
        }
        if (ra.hRule === 2 && ca.lines > 1) {
          clippedCells++;
        }
      }
      if (ra.clipped) clippedCells++;
    }
  }

  // অনুচ্ছেদগুলোর উল্লম্ব সরণও (বিশেষত ফরম-পাতার নিচের অংশে) shift-এ অন্তর্ভুক্ত করা
  for (let i = 0; i < nP; i++) {
    const pb = before.paras[i], pa = after.paras[i];
    const dy = Math.abs((pa.y - pb.y) + (pa.page - pb.page) * 40);
    rowShifts.push(dy);
  }

  const totalOverflows = paraOverflows + cellOverflows;
  const overflowRatio = totalOverflows / totalTargets;
  const overflowScore = r1(25 * Math.max(0, 1 - overflowRatio * 1.4));

  // ৩) ছকের সারি বা ঘর কতটা সরল (২৫ নম্বর)
  const avgShiftRamp = rowShifts.length
    ? rowShifts.reduce((a, d) => a + ramp(d, 2, 16), 0) / rowShifts.length
    : 1;
  const maxShiftPt = rowShifts.length ? r1(Math.max(...rowShifts)) : 0;
  const meanShiftPt = rowShifts.length ? r1(rowShifts.reduce((a, b) => a + b, 0) / rowShifts.length) : 0;
  const shiftScore = r1(25 * avgShiftRamp);

  // ৪) লেখা কাটল কি না ও নিষিদ্ধ গঠন (২৫ নম্বর)
  const exactRows = after.exactRowCount != null
    ? after.exactRowCount
    : after.tables.reduce((acc, t) => acc + t.rows.filter((r) => r.hRule === 2).length, 0);
  const frames = after.frames || 0;
  const tightParas = after.exactTightParaCount || 0;
  const clipUnits = clippedCells * 1.5 + exactRows * 0.8 + frames * 3.0 + tightParas * 0.25;
  const clipScore = r1(25 * Math.max(0, 1 - clipUnits / Math.max(8, totalTargets)));

  const score = r1(pageScore + overflowScore + shiftScore + clipScore);

  return {
    score,
    pages: { before: before.pages, after: after.pages, ok: before.pages === after.pages },
    part: {
      page: pageScore,
      overflow: overflowScore,
      shift: shiftScore,
      clip: clipScore
    },
    metrics: {
      editedCells: editStats.editedCells,
      editedTickCells: editStats.editedTickCells || 0,
      editedDigitBoxes: editStats.editedDigitBoxes,
      editedLeaderParas: editStats.editedLeaderParas,
      editedLiteralParas: editStats.editedLiteralParas,
      totalEdited: editStats.totalEdited,
      paraOverflows,
      cellOverflows,
      totalOverflows,
      meanShiftPt,
      maxShiftPt,
      clippedCells,
      exactRows,
      frames
    }
  };
}

/**
 * একটি .docx ফাইল পড়ে সেটিতে নমুনা নাম বসিয়ে faithful_edited.docx তৈরি করে এবং এডিট-স্কোর মাপে।
 */
export function measureEditScore(docxPath, outDir, opts = {}) {
  const sampleText = opts.sampleText || DEFAULT_SAMPLE;
  const absDocx = path.resolve(docxPath);
  const dir = path.resolve(outDir || path.dirname(absDocx));
  fs.mkdirSync(dir, { recursive: true });

  const tmpExtract = path.join(dir, '.tmp_edit_docx');
  fs.rmSync(tmpExtract, { recursive: true, force: true });
  fs.mkdirSync(tmpExtract, { recursive: true });

  if (process.platform === 'win32') {
    spawnSync('tar', ['-xf', absDocx, '-C', tmpExtract], { encoding: 'utf8' });
  } else {
    spawnSync('unzip', ['-q', '-o', absDocx, '-d', tmpExtract], { encoding: 'utf8' });
  }
  const xmlPath = path.join(tmpExtract, 'word', 'document.xml');
  const docXml = fs.readFileSync(xmlPath, 'utf8');

  const { xml: editedXml, stats: editStats } = editDocumentXml(docXml, sampleText);
  fs.writeFileSync(xmlPath, editedXml, 'utf8');

  const editedDocx = path.join(dir, opts.editedName || 'faithful_edited.docx');
  if (fs.existsSync(editedDocx)) fs.unlinkSync(editedDocx);
  if (process.platform === 'win32') {
    spawnSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path "${tmpExtract}\\*" -DestinationPath "${editedDocx}" -Force`], { encoding: 'utf8' });
  } else {
    spawnSync('bash', ['-c', `cd "${tmpExtract}" && zip -q -r "${editedDocx}" .`], { encoding: 'utf8' });
  }
  fs.rmSync(tmpExtract, { recursive: true, force: true });

  const simBefore = simulateOoxmlLayout(docXml);
  const simAfter = simulateOoxmlLayout(editedXml);

  let wordResult = null;
  const psScript = path.join(__dirname, 'edit-score.ps1');
  const rawJson = path.join(dir, 'edit-word-raw.json');
  if (process.platform === 'win32' && !opts.noWord && fs.existsSync(psScript)) {
    const ps = spawnSync('powershell', ['-NoProfile', '-File', psScript, absDocx, rawJson, editedDocx, sampleText], {
      encoding: 'utf8',
      timeout: 10 * 60 * 1000
    });
    if (ps.status === 0 && fs.existsSync(rawJson)) {
      try {
        wordResult = JSON.parse(fs.readFileSync(rawJson, 'utf8').replace(/^\uFEFF/, ''));
        wordResult.before.exactRowCount = simBefore.exactRowCount;
        wordResult.after.exactRowCount = simAfter.exactRowCount;
        wordResult.after.exactTightParaCount = simAfter.exactTightParaCount;
      } catch (e) { wordResult = null; }
    }
  }

  const beforeState = wordResult ? wordResult.before : simBefore;
  const afterState = wordResult ? wordResult.after : simAfter;
  const res = computeEditScoreFromStates(beforeState, afterState, editStats);
  res.engine = wordResult ? 'word-com' : 'ooxml-layout';
  res.editedDocx = path.basename(editedDocx);

  const outJsonPath = path.join(dir, opts.jsonName || 'edit-score.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(res, null, 2), 'utf8');
  return res;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const argv = process.argv.slice(2);
  const opt = (n) => {
    const i = argv.indexOf(n);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';
  };
  const IDS = opt('--ids') ? new Set(opt('--ids').split(',')) : null;
  const sampleText = opt('--sample') || DEFAULT_SAMPLE;
  const noWord = argv.includes('--no-word');
  const posArgs = argv.filter((a, i) => !a.startsWith('--') && (i === 0 || !['--ids', '--dir', '--sample'].includes(argv[i - 1])));

  if (posArgs.length >= 1 && posArgs[0].endsWith('.docx') && fs.existsSync(posArgs[0])) {
    const outDir = posArgs[1] || path.dirname(posArgs[0]);
    const r = measureEditScore(posArgs[0], outDir, { sampleText, noWord });
    console.log(`এডিট ${r.score} | পাতা ${r.pages.after}/${r.pages.before} | পাতা-মান ${r.part.page}/২৫ উপচে-পড়া ${r.part.overflow}/২৫ সরণ ${r.part.shift}/২৫ কাটা ${r.part.clip}/২৫ | ঘর:${r.metrics.editedCells} লিডার:${r.metrics.editedLeaderParas} বিন্দু:${r.metrics.editedLiteralParas} উপচানো:${r.metrics.totalOverflows} exact-সারি:${r.metrics.exactRows}`);
    process.exit(0);
  }

  const customDir = opt('--dir');
  const asisDir = customDir
    ? path.resolve(customDir)
    : fs.existsSync(path.join(ROOT, 'qa/golden-data/asis'))
    ? path.join(ROOT, 'qa/golden-data/asis')
    : path.join(ROOT, 'samples');

  let entries = [];
  const manPath = path.join(asisDir, 'manifest.json');
  if (fs.existsSync(manPath)) {
    entries = JSON.parse(fs.readFileSync(manPath, 'utf8').replace(/^\uFEFF/, '')).map((e) => e.id);
  } else if (fs.existsSync(asisDir)) {
    entries = fs.readdirSync(asisDir).filter((d) => fs.statSync(path.join(asisDir, d)).isDirectory()).sort();
  }
  if (IDS) entries = entries.filter((id) => IDS.has(id));

  const rows = [];
  const all = {};
  for (const id of entries) {
    const od = path.join(asisDir, id);
    const docx = path.join(od, 'faithful_docx-unicode.docx');
    if (!fs.existsSync(docx)) {
      rows.push(`${id.padEnd(6)} — .docx নেই`);
      continue;
    }
    const r = measureEditScore(docx, od, { sampleText, noWord });
    all[id] = r;
    rows.push(
      `${id.padEnd(6)} এডিট ${String(r.score).padStart(5)} | পাতা ${r.pages.after}/${r.pages.before} | উপচানো ${String(r.metrics.totalOverflows).padStart(2)}/${String(r.metrics.totalEdited).padStart(3)} | সরণ ${String(r.metrics.maxShiftPt).padStart(4)}pt | exact:${r.metrics.exactRows} (পাতা:${r.part.page} উপচে:${r.part.overflow} সরণ:${r.part.shift} কাটা:${r.part.clip})`
    );
  }

  const ids = Object.keys(all);
  const avgScore = ids.length ? r1(ids.reduce((a, k) => a + all[k].score, 0) / ids.length) : 0;
  const sumDir = !customDir && fs.existsSync(path.join(ROOT, 'qa/golden-data')) ? path.join(ROOT, 'qa/golden-data') : asisDir;
  fs.mkdirSync(sumDir, { recursive: true });
  fs.writeFileSync(
    path.join(sumDir, 'score-edit.json'),
    JSON.stringify({ at: new Date().toISOString(), total: { n: ids.length, score: avgScore }, ids: Object.fromEntries(ids.map((k) => [k, all[k].score])), details: all }, null, 2),
    'utf8'
  );

  rows.slice(0, 26).forEach((line) => console.log(line));
  console.log(`মোট ${ids.length}টি | গড় এডিট-স্কোর ${avgScore}`);
}
