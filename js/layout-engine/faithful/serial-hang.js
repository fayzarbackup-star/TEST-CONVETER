/**
 * Fayzar — হুবহু-মোড ক্রমিক-অনুচ্ছেদের ঝুলন্ত ইনডেন্ট (FayzarSerialHang) — সুইচ FZ_ON=SERIALHANG / __FZ_ON_SERIALHANG
 * সমস্যা (২০২৬-১০-২০, ১৯ ফাইলে ৩৯৯ ক্রমিক-অনুচ্ছেদের ৩৪২টি): "১। লেখা" নম্বরের পরে শুধু স্পেস ⇒ "৯।"/"১০।"-এ লেখার শুরু
 * এক রেখায় নয়, আর দ্বিতীয় লাইন নম্বরের নিচে চলে যায়।
 * সমাধান: নম্বরের পরের স্পেস → <w:tab/>, আর ঝুলন্ত ইনডেন্ট (নম্বর আগের জায়গায়, লেখা সবসময় একই কলামে)।
 * ঝুলন্ত-ইনডেন্ট Word-এ নিজেই ট্যাব-স্টপ, তাই w:tabs-এ হাত নেই; আগে কোনো ছোট ট্যাব-স্টপ থাকলে অনুচ্ছেদ বাদ।
 * v2: বাঁধাধরা HANG_EM-এর বদলে মূলের মাপা x (সহোদর ট্যাব-স্টপ / IR / measures বা প্রাকৃতিক ক্রমিক+স্পেস প্রস্থ) থেকে ঝুলন্ত দূরত্ব নেওয়া হয়,
 * যাতে প্রথম লাইনের লেখার শুরু মূলের অবস্থানেই থাকে এবং লাইনের কার্যকর প্রস্থ কমে অতিরিক্ত লাইন না ভাঙে (a16 পাতা ৩ ও ৮)।
 * কাজ শেষ document.xml-এর body-স্ট্রিংয়ে (builder শুধু ডাকে)।
 */
(function (global) {
  'use strict';

  // ক্রমিক: ১। ১০। ১) (১) ০১. 1. (ক) ক) ক।
  const SER = /^(\s*)(\(?[০-৯0-9]{1,2}[।.)]|\([ক-হa-z]\)|[ক-হ][।.)])([  ]+)(?=\S)/;
  const SUB_SER = /^[ক-হa-z][।.)]$/;
  const HANG_EM = 2.0;      // একক-টেস্টের ডিফল্ট ফলব্যাক প্রস্থ (ফন্ট-আকারের গুণ) — যখন মাপা বা ছক-প্রসঙ্গ নেই
  const IND_AFTER = /<w:(contextualSpacing|mirrorIndents|suppressOverlap|jc|textDirection|textAlignment|textboxTightWrap|outlineLvl|divId|cnfStyle|rPr|sectPr|pPrChange)[ >/]/;

  function isOn() {
    try {
      if (global.__FZ_ON_SERIALHANG) return true;
      if (typeof process !== 'undefined' && process.env && process.env.FZ_ON) return process.env.FZ_ON.split(',').map((s) => s.trim()).includes('SERIALHANG');
    } catch (e) { /* ব্রাউজার */ }
    return false;
  }

  const attr = (tag, n) => { const m = tag.match(new RegExp(`w:${n}="(-?\\d+)"`)); return m ? +m[1] : 0; };

  // ক্রমিক-টোকেন ও স্পেসের প্রাকৃতিক প্রস্থ (twips/dxa): মূলে যখন শুধু স্পেস ছিল, তখন নম্বরের পরের লেখা ঠিক এই দূরত্বেই শুরু হয়
  function prefixHangTw(sm, sz) {
    const leadSp = (sm[1] || '').length;
    const tok = sm[2] || '';
    const trailSp = Math.max(1, (sm[3] || ' ').length);
    let em = (leadSp + trailSp) * 0.32;
    for (const ch of tok) em += /[।.()]/.test(ch) ? 0.28 : 0.52;
    return Math.round(sz * em * 20);
  }

  // অনুচ্ছেদের দৃশ্যমান লেখার অনুমিত প্রস্থ (twips) — লাইন-ভাঙা অপরিবর্তিত রাখার সীমা যাচাইয়ে
  function estTextTw(txt, sz) {
    const clean = String(txt || '').replace(/[ঁ-ঃ়া-্ৗ]/g, '');
    return Math.round(clean.length * sz * 0.45 * 20);
  }

  // IR বা measures অবজেক্ট থেকে পাতাভিত্তিক মাপা ক্রমিক-ইনডেন্ট (startTw -> textLeftTw) ও ছকের উপ-ক্রমিকের প্রস্থ নিষ্কাশন
  function extractDataHints(data) {
    const hints = { byStart: new Map(), tableHangTw: 0 };
    if (!data || typeof data !== 'object') return hints;
    const ir = Array.isArray(data.pages) ? data : (data.ir && Array.isArray(data.ir.pages) ? data.ir : null);
    const meas = data.measures && typeof data.measures === 'object' && !Array.isArray(data.measures) ? data : (data.measures && data.measures.measures ? data.measures : null);
    if (ir) {
      for (const pg of ir.pages || []) {
        const mL = (pg.margins && pg.margins.left) || 84;
        for (const b of pg.bands || []) {
          for (const c of b.cells || []) {
            for (const it of c.items || []) {
              if (!it || it.kind !== 'para') continue;
              const startTw = Math.round((it.indentPt || 0) * 20);
              if (Array.isArray(it.tabStops) && it.tabStops.length) {
                const st0 = typeof it.tabStops[0] === 'object' ? it.tabStops[0].pos : it.tabStops[0];
                const leftTw = Math.round((st0 || 0) * 20);
                if (leftTw > startTw + 100 && !hints.byStart.has(startTw)) hints.byStart.set(startTw, leftTw);
              } else if (Array.isArray(it.tabStopsSrc) && it.tabStopsSrc.length) {
                const leftTw = Math.round((it.tabStopsSrc[0] - mL) * 20);
                if (leftTw > startTw + 100 && !hints.byStart.has(startTw)) hints.byStart.set(startTw, leftTw);
              } else if (it.firstIndentPt < -5) {
                const leftTw = Math.round(((it.indentPt || 0) - it.firstIndentPt) * 20);
                if (leftTw > startTw + 100 && !hints.byStart.has(startTw)) hints.byStart.set(startTw, leftTw);
              }
            }
          }
        }
      }
    }
    if (meas && meas.measures) {
      const blocks = (meas.cap && meas.cap.blocks) || [];
      let wSum = 0, wCnt = 0;
      for (const k of Object.keys(meas.measures)) {
        const m = meas.measures[k];
        const cb = blocks[k];
        if (!m) continue;
        if (!m.hasGrid && Array.isArray(m.lineSegs) && m.lineSegs[0] && m.lineSegs[0].length >= 2) {
          const s0 = m.lineSegs[0][0], s1 = m.lineSegs[0][1];
          const pgNum = (cb && cb.page) || 1;
          const mL = (meas.pageInfo && meas.pageInfo[pgNum - 1] && meas.pageInfo[pgNum - 1].margins && meas.pageInfo[pgNum - 1].margins.left) || 84;
          const startTw = Math.round((s0.x - mL) * 20);
          const leftTw = Math.round((s1.x - mL) * 20);
          if (leftTw > startTw + 100 && !hints.byStart.has(startTw)) hints.byStart.set(startTw, leftTw);
        } else if (m.hasGrid && Array.isArray(m.colEdgesPt) && m.colEdgesPt.length >= 3 && Array.isArray(m.textInkXPt) && Array.isArray(m.cellBox)) {
          const c1L = m.colEdgesPt[1], c1R = m.colEdgesPt[2];
          const blobs = m.textInkXPt.filter((r) => r[0] >= c1L + 2 && r[0] <= c1R - 2 && (r[2] - r[1]) >= 5);
          (m.textLinesPt || []).forEach((ly, li) => {
            const box = m.cellBox[li] && m.cellBox[li][1];
            if (!box) return;
            const lb = blobs.filter((r) => Math.abs(((r[1] + r[2]) / 2) - ly) < 6).sort((a, b) => a[0] - b[0]);
            if (lb.length >= 2) {
              const w0 = 2 * (lb[0][0] - box[0]);
              if (w0 >= 7 && w0 <= 13) { wSum += w0; wCnt++; }
            }
          });
        }
      }
      if (wCnt > 0) {
        const avgW0 = wSum / wCnt;
        // মাপা টোকেন-প্রস্থ (~১০pt) + ১টি স্পেস (~৪pt) = ১৪pt (২৮০ dxa)
        hints.tableHangTw = Math.round((avgW0 + 4) / 0.5) * 10;
      }
    }
    return hints;
  }

  function fixPara(p, opts) {
    const pPrM = p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
    const pPr = pPrM ? pPrM[0] : '';
    if (/w:hanging=|<w:numPr>|<w:jc w:val="(center|right|end)"/.test(pPr)) return p;
    // পূরণ-সারি ("০১। নাম ⇥ : ⇥ ....") আগেই ট্যাবে সাজানো — ছোঁয়া নয় (a14 −২৮ এখান থেকে)
    if (/<w:tab\/>/.test(p)) return p;
    // প্রথম w:t-তে ক্রমিক + স্পেস + লেখা থাকতে হবে
    const tM = p.match(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/);
    if (!tM) return p;
    const before = p.slice(0, tM.index);
    if (/<w:tab\/>|<w:t[ >]/.test(before.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '').replace(/<w:tabs>[\s\S]*?<\/w:tabs>/, ''))) return p;
    const sm = tM[1].match(SER);
    if (!sm) return p;
    const sz = (p.match(/<w:sz w:val="(\d+)"/) || [0, 24])[1] / 2;
    const indTag = (pPr.match(/<w:ind [^>]*\/>/) || [''])[0];
    const left = attr(indTag, 'left') || attr(indTag, 'start');
    const first = attr(indTag, 'firstLine');
    const right = attr(indTag, 'right') || attr(indTag, 'end');
    const start = left + first;                 // নম্বর আগের জায়গায় থাকে
    const natHang = prefixHangTw(sm, sz);
    const o = typeof opts === 'number' ? { hang: opts } : (opts || null);
    let hang;
    if (o && o.textLeft > start) {
      hang = o.textLeft - start;
    } else if (o && o.hang > 0) {
      hang = o.hang;
    } else if ((o && o.inTable) || SUB_SER.test(sm[2])) {
      // ছকের ঘর বা "ক)" উপ-ক্রমিক: মূলে শুধু স্পেস থাকে, তাই নম্বরের পরের লেখার মাপা শুরু = প্রাকৃতিক প্রস্থ (লাইনের প্রস্থ অক্ষুণ্ণ থাকে)
      hang = (o && o.tableHangTw > 0) ? Math.round(o.tableHangTw * (sz / 12.5)) : natHang;
    } else if (o && o.availTw > 0) {
      const defHang = Math.round(sz * HANG_EM * 20);
      const rest0 = tM[1].slice(sm[0].length);
      hang = (start + defHang + right + estTextTw(rest0, sz) > o.availTw) ? natHang : defHang;
    } else {
      const defHang = Math.round(sz * HANG_EM * 20);
      const rest0 = tM[1].slice(sm[0].length);
      // লম্বা এক-লাইনের অনুচ্ছেদে (যেমন >৪৫ অক্ষর) বাড়তি ট্যাব-ফাঁকে যেন লাইন না ভাঙে
      hang = rest0.length > 45 ? natHang : defHang;
    }
    const newLeft = start + hang;
    // আগে-থাকা ট্যাব-স্টপ নতুন বাম-সীমার আগে পড়লে লেখা সেখানে আটকাবে ⇒ বাদ
    const stops = [...pPr.matchAll(/<w:tab w:val="(?!clear)[^"]*"[^>]*w:pos="(\d+)"/g)].map((m) => +m[1]);
    if (stops.some((s) => s > start && s < newLeft)) return p;
    const rest = tM[1].slice(sm[0].length);
    const tOpen = '<w:t xml:space="preserve">';
    const newT = `${tOpen}${sm[1]}${sm[2]}</w:t><w:tab/>${tOpen}${rest}</w:t>`;
    let out = p.slice(0, tM.index) + newT + p.slice(tM.index + tM[0].length);
    const newInd = `<w:ind w:left="${newLeft}"${right ? ` w:right="${right}"` : ''} w:hanging="${hang}"/>`;
    if (indTag) out = out.replace(indTag, newInd);
    else if (pPrM) {
      const im = pPr.match(IND_AFTER);
      const np = im ? pPr.slice(0, im.index) + newInd + pPr.slice(im.index) : pPr.replace('</w:pPr>', newInd + '</w:pPr>');
      out = out.replace(pPr, np);
    } else out = out.replace(/^<w:p( [^>]*)?>/, (m0) => `${m0}<w:pPr>${newInd}</w:pPr>`);
    return out;
  }

  // XML-এর সহোদর ক্রমিক অনুচ্ছেদ থেকে মাপা ট্যাব/ঝুলন্ত অবস্থান (startTw -> textLeftTw) সংগ্রহ
  function collectSiblingStops(xmlStr, hints) {
    const map = new Map(hints && hints.byStart ? hints.byStart : []);
    const paraRe = /<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>/g;
    let m;
    while ((m = paraRe.exec(xmlStr)) !== null) {
      const p = m[0];
      const tM = p.match(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/);
      if (!tM) continue;
      const txt0 = tM[1].trim();
      if (!/^(\(?[০-৯0-9]{1,2}[।.)]|\([ক-হa-z]\)|[ক-হ][।.)])$/.test(txt0) || !/<w:tab\/>/.test(p)) continue;
      const pPr = (p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
      const indTag = (pPr.match(/<w:ind [^>]*\/>/) || [''])[0];
      const left = attr(indTag, 'left') || attr(indTag, 'start');
      const hang = attr(indTag, 'hanging');
      const first = attr(indTag, 'firstLine');
      const start = left - hang + first;
      const tabM = pPr.match(/<w:tab w:val="left"[^>]*w:pos="(\d+)"/);
      const textLeft = tabM ? +tabM[1] : (hang > 0 ? left : 0);
      if (textLeft > start + 100 && !map.has(start)) map.set(start, textLeft);
    }
    return map;
  }

  // body-স্ট্রিংয়ের সব অনুচ্ছেদে; ফেরত { xml, n }
  function apply(xml, data) {
    let n = 0;
    const s = String(xml);
    const hints = extractDataHints(data);
    const sibStops = collectSiblingStops(s, hints);
    // ছকের ভেতরের (<w:tc>) ও বাইরের অনুচ্ছেদ আলাদা প্রসঙ্গে প্রক্রিয়াকরণ
    const tcRanges = [];
    const tcRe = /<w:tc(?: [^>]*)?>[\s\S]*?<\/w:tc>/g;
    let tm;
    while ((tm = tcRe.exec(s)) !== null) {
      const wM = tm[0].match(/<w:tcW w:w="(\d+)"/);
      tcRanges.push({ s: tm.index, e: tm.index + tm[0].length, availTw: wM ? Math.max(200, +wM[1] - 216) : 0 });
    }
    let tcIdx = 0;
    const out = s.replace(/<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>/g, (p, off) => {
      while (tcIdx < tcRanges.length && tcRanges[tcIdx].e <= off) tcIdx++;
      const inTc = tcIdx < tcRanges.length && off >= tcRanges[tcIdx].s && off < tcRanges[tcIdx].e ? tcRanges[tcIdx] : null;
      const pPr = (p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
      const indTag = (pPr.match(/<w:ind [^>]*\/>/) || [''])[0];
      const start = (attr(indTag, 'left') || attr(indTag, 'start')) + attr(indTag, 'firstLine');
      let textLeft = 0;
      if (!inTc) {
        if (sibStops.has(start)) textLeft = sibStops.get(start);
        else {
          for (const [st, tl] of sibStops.entries()) {
            if (Math.abs(st - start) <= 120) { textLeft = tl; break; }
          }
        }
      }
      const q = fixPara(p, {
        inTable: !!inTc,
        availTw: inTc ? inTc.availTw : 0,
        textLeft,
        tableHangTw: hints.tableHangTw
      });
      if (q !== p) n++;
      return q;
    });
    return { xml: out, n };
  }

  const FayzarSerialHang = { isOn, apply, fixPara, prefixHangTw, HANG_EM };
  global.FayzarSerialHang = FayzarSerialHang;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarSerialHang;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
