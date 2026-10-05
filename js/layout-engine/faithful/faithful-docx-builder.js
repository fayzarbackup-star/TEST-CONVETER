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

  const FONT = 'SutonnyOMJ';
  const UNI_SENTINEL = 'FzUnicodeFace';
  const tw = (pt) => Math.max(0, Math.round((pt || 0) * 20));
  const emu = (pt) => Math.round((pt || 0) * 12700);
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const pick = (n) => (typeof global !== 'undefined' && global[n]) || (typeof window !== 'undefined' && window[n]) || null;
  const JC = { l: 'left', c: 'center', r: 'right', j: 'both' };

  function runsFor(text, item) {
    // Part-17.9: লেখার অংশ-বিশেষ মোটা ("**উচ্চারণ:** আল-হুম্মা…") — Gemini-র চিহ্ন ⇒ আলাদা মোটা রান
    const t0 = String(text == null ? '' : text);
    if (/\*\*[^*]+\*\*/.test(t0)) {
      return t0.split(/(\*\*[^*]+\*\*)/).filter((s) => s !== '').map((s) => {
        const mb = /^\*\*([^*]+)\*\*$/.exec(s);
        return mb ? runsPlain(mb[1], Object.assign({}, item, { bold: true })) : runsPlain(s, item);
      }).join('');
    }
    return runsPlain(t0.replace(/\*\*/g, ''), item);
  }

  function runsPlain(text, item) {
    const E = pick('ExportDualEngine');
    const style = { sz: Math.round((item.fontPt || 12) * 2), b: !!item.bold, i: !!item.italic, u: !!item.underline };
    // Part-17.7: renderDocxRuns নামে "sutonny" থাকলেই বিজয়-এনকোড করে ফেলে ⇒ মাস্টার ইউনিকোড রাখতে নিরপেক্ষ নাম দিয়ে পরে বদল
    if (E && typeof E.renderDocxRuns === 'function') {
      return E.renderDocxRuns(text, { font: UNI_SENTINEL, keepLoneRo: true }, style).split(`"${UNI_SENTINEL}"`).join(`"${FONT}"`);
    }
    return `<w:r><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>${style.b ? '<w:b/>' : ''}${style.i ? '<w:i/>' : ''}${style.u ? '<w:u w:val="single"/>' : ''}<w:sz w:val="${style.sz}"/><w:szCs w:val="${style.sz}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  }

  // Part-17.9: লাইন-উচ্চতা — মাপা লাইন-দূরত্ব (ফন্টের ২ গুণের কম হলে), নইলে Word-এর single (≈১.১৫×ফন্ট, ক্যালিব্রেটেড); কম নয় (কাটা পড়া ঠেকাতে)
  const lineH = (it) => Math.max((it.fontPt || 12) * 1.15, it.lineSpacingPt && it.lineSpacingPt < (it.fontPt || 12) * 2 ? it.lineSpacingPt : 0);
  /** আউটপুটে একটি অংশের অনুমিত উচ্চতা (pt) — "ঠিক" লাইন-উচ্চতা থাকায় অনুচ্ছেদের হিসাব নির্ভুল */
  function itemH(it) {
    if (it.kind === 'figure') return (it.heightPt || 0) + 2;
    if (it.kind === 'table') {
      const rows = it.rows && it.rows.length ? it.rows : [['']];
      const nE = rows.filter((r) => !r.some((c) => c && String(c).trim())).length;
      const rowH = it.heightPt ? it.heightPt / (rows.length - nE + nE * 0.4) : 0;
      return rows.reduce((a, r) => a + (!r.some((c) => c && String(c).trim()) ? rowH * 0.4 : Math.max(rowH, (it.fontPt || 11) * 1.25)), 0) + 1;
    }
    const n = (it.tabLines || (it.keepLines ? it.lines : null) || it.lines || []).length || 1;
    return n * lineH(it);
  }

  /**
   * Part-17.9: পাতার উল্লম্ব নকশা — প্রতিটি অংশের "আগের ফাঁক" = মূলে ওপর-থেকে-ওপর দূরত্ব − আগের অংশের আউটপুট-উচ্চতা।
   * (আগে কালি-থেকে-কালি ফাঁক + Word-এর লাইন-উচ্চতা ⇒ প্রতি লাইনে বাড়তি জমে পাতা উপচাত/নিচে সরত।)
   * উচ্চতা পাতার চেয়ে বেশি হলে শুধু ফাঁকগুলো আনুপাতিক ছোট (লেখা নয়)।
   */
  function planPage(page) {
    let curTop = page.margins.top, curH = 0;
    const els = [];
    page.bands.forEach((band) => {
      if (band.kind === 'grid') {
        const cells = band.cells.map((c) => {
          let lt = band.y0, lh = 0; const its = [];
          c.items.forEach((it) => {
            const top = it.rect ? it.rect.y : lt + lh;
            const h = itemH(it);
            its.push({ it, before: Math.max(0, top - lt - lh), h }); lt = top; lh = h;
          });
          return { cell: c, its, total: its.reduce((a, x) => a + x.before + x.h, 0) };
        });
        const h = Math.max(0, ...cells.map((x) => x.total));
        els.push({ band, cells, before: Math.max(0, band.y0 - curTop - curH), h });
        curTop = band.y0; curH = h;
      } else {
        band.cells[0].items.forEach((it) => {
          const top = it.rect ? it.rect.y : curTop + curH;
          const h = itemH(it);
          els.push({ it, before: Math.max(0, top - curTop - curH), h });
          curTop = top; curH = h;
        });
      }
    });
    const avail = page.heightPt - page.margins.top - page.margins.bottom;
    const sumH = els.reduce((a, e) => a + e.h, 0);
    const sumB = els.reduce((a, e) => a + e.before, 0);
    const target = avail * 0.97;
    const f = sumH + sumB > target && sumB > 0 ? Math.max(0, Math.min(1, (target - sumH) / sumB)) : 1;
    return { els, f };
  }

  function pPr(item, extraBeforePt, sectPrXml) {
    const before = tw((item.spaceBeforePt || 0) + (extraBeforePt || 0));
    const fs = item.fontPt || 12;
    // লাইন-দূরত্ব: মাপা দূরত্ব সাধারণ (≈১.২×ফন্ট)-এর চেয়ে বেশি হলে "অন্তত" সেই দূরত্ব (কাটা পড়ার ঝুঁকি নেই)
    // Part-17.8/17.9: লেখার অনুচ্ছেদে "ঠিক" লাইন-উচ্চতা (lineH) — উচ্চতা অনুমানযোগ্য, পাতার হিসাব মেলে
    const exactPt = item.kind === 'para' && item.lineRule !== 'auto' ? lineH(item) : 0;
    const line = exactPt ? `w:line="${tw(exactPt)}" w:lineRule="exact"`
      : (item.lineSpacingPt && item.lineSpacingPt > fs * 1.3 && item.lineSpacingPt < fs * 3
        ? `w:line="${tw(item.lineSpacingPt)}" w:lineRule="atLeast"` : 'w:line="240" w:lineRule="auto"');
    let ind = '';
    if (item.align === 'c' && item.centerShiftPt != null) {
      // Part-17.7: মাঝে-বসানো — কেন্দ্র মূলের কেন্দ্রে (এক পাশে দ্বিগুণ ইনডেন্ট)
      const sh = item.centerShiftPt;
      if (Math.abs(sh) >= 2) ind = sh > 0 ? `<w:ind w:left="${tw(sh * 2)}"/>` : `<w:ind w:right="${tw(-sh * 2)}"/>`;
    } else if (item.align === 'r' && item.rightIndentPt != null) {
      if (item.rightIndentPt >= 2) ind = `<w:ind w:right="${tw(item.rightIndentPt)}"/>`;
    } else if (item.indentPt || item.firstIndentPt) {
      const fi = item.firstIndentPt || 0;
      ind = `<w:ind w:left="${tw(item.indentPt + (fi < 0 ? -fi : 0))}"${fi > 0 ? ` w:firstLine="${tw(fi)}"` : (fi < 0 ? ` w:hanging="${tw(-fi)}"` : '')}/>`;
    }
    // Part-17.8: মাপা ট্যাব-অবস্থান
    const tabs = item.tabLines && item.tabStops && item.tabStops.length
      ? '<w:tabs>' + item.tabStops.map((x) => `<w:tab w:val="left" w:pos="${tw(x)}"/>`).join('') + '</w:tabs>' : '';
    // হাতে-ভাঙা লাইনে "দুপাশে সমান" দিলে Word লাইনগুলো টেনে ছড়ায় ⇒ বাঁয়ে
    const jc = item.align === 'j' && item.keepLines && item.lines && item.lines.length > 1 ? 'left' : (JC[item.align] || 'left');
    return `<w:pPr>${sectPrXml || ''}${tabs}<w:spacing w:before="${before}" w:after="0" ${line}/>${ind}<w:jc w:val="${jc}"/></w:pPr>`;
  }

  function paraXml(item, extraBeforePt, ctx) {
    if (item.kind === 'figure') {
      const img = item.image;
      if (!img || !img.dataUrl) return `<w:p>${pPr(Object.assign({}, item, { align: 'l' }), extraBeforePt)}</w:p>`;
      const id = ctx.media.length + 1;
      const ext = /image\/jpe?g/.test(img.dataUrl) ? 'jpeg' : 'png';
      ctx.media.push({ name: `fimg${id}.${ext}`, data: img.dataUrl.split(',')[1], rid: `rIdFimg${id}` });
      const wPt = item.widthPt || (img.pxW ? img.pxW * 0.75 : 100);
      const hPt = item.heightPt || (img.pxH && img.pxW ? wPt * img.pxH / img.pxW : wPt);
      const drawing = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${emu(wPt)}" cy="${emu(hPt)}"/><wp:docPr id="${1000 + id}" name="fig${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${1000 + id}" name="fig${id}.${ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdFimg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(wPt)}" cy="${emu(hPt)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
      return `<w:p>${pPr(Object.assign({}, item, { align: 'l', firstIndentPt: 0 }), extraBeforePt)}${drawing}</w:p>`;
    }
    if (item.kind === 'table') return tableXml(item, extraBeforePt, ctx);
    const TAB = '<w:r><w:tab/></w:r>';
    const lineRuns = (ln) => String(ln).split('\t').map((p) => runsFor(p, item)).join(TAB);
    const body = item.tabLines && item.tabStops && item.tabStops.length
      ? item.tabLines.map(lineRuns).join('<w:r><w:br/></w:r>')
      : item.keepLines && item.lines && item.lines.length > 1
      ? item.lines.map((ln) => runsFor(ln, item)).join('<w:r><w:br/></w:r>')
      : runsFor((item.lines && item.lines.length ? item.lines.join(' ') : item.text).replace(/\s+/g, ' ').trim(), item);
    return `<w:p>${pPr(item, extraBeforePt)}${body}</w:p>`;
  }

  function spacer(pt) {
    return pt > 1 ? `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${tw(pt)}" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>` : '';
  }

  function tableXml(item, extraBeforePt, ctx) {
    const rows = item.rows && item.rows.length ? item.rows : [['']];
    const nCols = Math.max(...rows.map((r) => r.length));
    // Part-17.9: সীমানাহীন টেবিল = কলামে সাজানো লেখা ⇒ ঘরের ভেতরের ফাঁক প্রায় শূন্য, প্রস্থে সামান্য ছাড় (নইলে সরু কলামে লেখা ভাঙত)
    // (কলাম-সীমা ফাঁকের মাঝখানে ⇒ ঘরের ভেতরের ফাঁক = সবচেয়ে সরু কলাম-ফাঁকের অর্ধেক, ১–৫.৪pt — "১। কবিতা" মাঝের ফাঁক থাকে)
    const marPt = item.borderless ? Math.max(1, Math.min(5.4, (item.colGapPt || 2) / 2 - 0.5)) : 5.4;
    const cellMarTw = Math.round(marPt * 20);
    const width = Math.max(72, (item.widthPt || 400) + (item.borderless ? 2 * marPt + 2 : 0));
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
    const cellBody = (txt, ri, k) => {
      const figs = figAt[ri + ':' + k] || [];
      const figXml = ctx ? figs.map((f) => paraXml(Object.assign({}, f, { spaceBeforePt: 0, indentPt: 0 }), 0, ctx).replace('<w:jc w:val="left"/>', '<w:jc w:val="center"/>')).join('') : '';
      // Part-17.9: কলামের মাপা অবস্থান (না থাকলে মাঝে)
      const jc = JC[(item.cellAligns && item.cellAligns[ri] && item.cellAligns[ri][k]) || (item.colAligns && item.colAligns[k]) || 'c'];
      const textXml = txt || !figXml ? `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="${jc}"/></w:pPr>${txt ? runsFor(txt, cellItem) : ''}</w:p>` : '';
      return textXml + figXml;
    };
    const NILB = '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
    const B = item.borderless ? NILB :'<w:tblBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tblBorders>';
    // Part-17.8: সারির উচ্চতা অন্তত মূলের সমান (মাপা টেবিল-উচ্চতা ÷ সারি)
    // ফাঁকা সারি (আলাদা ছোট টেবিলের মাঝের ফাঁক) মূলে সরু ⇒ সাধারণ সারির ০.৪ ভাগ, "ঠিক" উচ্চতায়
    const figRows = new Set((item.cellFigures || []).map((f) => f.cell[0]));
    const isEmpty = (r, ri) => !r.some((c) => c && String(c).trim()) && !figRows.has(ri);
    const nEmpty = rows.filter(isEmpty).length;
    const rowH = item.heightPt && rows.length ? item.heightPt / (rows.length - nEmpty + nEmpty * 0.4) : 0;
    const trPrFor = (r, ri) => isEmpty(r, ri) && rowH ? `<w:trPr><w:trHeight w:val="${tw(rowH * 0.4)}" w:hRule="exact"/></w:trPr>`
      : (rowH > (item.fontPt || 11) * 1.3
        // ছোট লেখার সারি (আরবি/একশব্দ) ⇒ "ঠিক" মূলের উচ্চতা (Word-এর বাড়তি লাইন-উচ্চতায় পাতা উপচাত); লম্বা লেখা ⇒ "অন্তত"
        ? `<w:trPr><w:trHeight w:val="${tw(rowH)}" w:hRule="${!figRows.has(ri) && r.every((c) => String(c || '').length <= 25) && rowH >= (item.fontPt || 11) * 1.6 ? 'exact' : 'atLeast'}"/></w:trPr>` : '');
    // Part-17.8: মাপা কলাম-প্রস্থ (থাকলে), নইলে সমান ভাগ
    const fr = item.colFractions && item.colFractions.length === nCols ? item.colFractions : null;
    const cw = (k) => fr ? Math.round(colW * nCols * fr[k]) : colW;
    const trs = rows.map((r, ri) => '<w:tr>' + trPrFor(r, ri) + Array.from({ length: nCols }, (_, k) => `<w:tc><w:tcPr><w:tcW w:w="${cw(k)}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${cellBody(r[k], ri, k)}</w:tc>`).join('') + '</w:tr>').join('');
    return spacer((item.spaceBeforePt || 0) + (extraBeforePt || 0)) +
      `<w:tbl><w:tblPr><w:tblW w:w="${colW * nCols}" w:type="dxa"/><w:tblInd w:w="${Math.round((item.indentPt || 0) * 20 - cellMarTw)}" w:type="dxa"/>${B}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="${cellMarTw}" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="${cellMarTw}" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${Array.from({ length: nCols }, (_, k) => `<w:gridCol w:w="${cw(k)}"/>`).join('')}</w:tblGrid>${trs}</w:tbl>`;
  }

  function gridXml(band, ctx) {
    const widths = band.cells.map((c) => Math.max(tw(20), tw(c.x1 - c.x0)));
    const NIL = '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
    const tcs = band.cells.map((c, k) => {
      const inner = c.items.map((it) => paraXml(it, 0, ctx)).join('') || '<w:p/>';
      const safe = /<\/w:p>\s*$/.test(inner) ? inner : inner + '<w:p/>';     // ঘর অনুচ্ছেদে শেষ হতেই হবে
      // Part-17.8: কলামের মাঝের খাড়া দাগ (মূলে থাকলে)
      const rule = c.ruleRight ? '<w:tcBorders><w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tcBorders>' : '';
      return `<w:tc><w:tcPr><w:tcW w:w="${widths[k]}" w:type="dxa"/>${rule}</w:tcPr>${safe}</w:tc>`;
    }).join('');
    return spacer(band.gapBeforePt) +
      `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/>${NIL}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid><w:tr>${tcs}</w:tr></w:tbl>`;
  }

  function sectPr(page, isLast) {
    const m = page.margins;
    // প্রতিটি সেকশন (মূলের প্রতিটি পাতা) নতুন পাতায় শুরু — DOCX-নিয়মে type সেকশনের নিজের শুরু বোঝায়
    // Part-17.7: মূল পাতার বর্ডার-ফ্রেম (একক/দ্বৈত) — লেখা থেকে মাপা দূরত্বে (Word-সীমা ≤৩১pt)
    let borders = '';
    if (page.frame) {
      const v = page.frame.style === 'double' ? 'double' : 'single', sp = page.frame.spacePt || {};
      const side = (n) => `<w:${n} w:val="${v}" w:sz="${v === 'double' ? 6 : 12}" w:space="${Math.round(sp[n] || 0)}" w:color="000000"/>`;
      borders = `<w:pgBorders w:offsetFrom="text">${side('top')}${side('left')}${side('bottom')}${side('right')}</w:pgBorders>`;
    }
    return `<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="${tw(page.widthPt)}" w:h="${tw(page.heightPt)}"${page.widthPt > page.heightPt ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${tw(m.top)}" w:right="${tw(m.right)}" w:bottom="${tw(m.bottom)}" w:left="${tw(m.left)}" w:header="360" w:footer="360" w:gutter="0"/>${borders}<w:cols w:space="720"/></w:sectPr>`;
  }

  /** নকশা → document.xml-এর body এবং মিডিয়া */
  function bodyXml(ir) {
    const ctx = { media: [] };
    let xml = '';
    ir.pages.forEach((page, pi) => {
      const isLast = pi === ir.pages.length - 1;
      let pageXml = '';
      const { els, f } = planPage(page);
      els.forEach((e) => {
        if (e.band) {
          const band = Object.assign({}, e.band, {
            gapBeforePt: e.before * f,
            cells: e.cells.map((c) => Object.assign({}, c.cell, { items: c.its.map((x) => Object.assign({}, x.it, { spaceBeforePt: x.before * f })) }))
          });
          pageXml += gridXml(band, ctx);
        } else pageXml += paraXml(Object.assign({}, e.it, { spaceBeforePt: e.before * f }), 0, ctx);
      });
      if (!pageXml) pageXml = '<w:p/>';
      if (!isLast) {
        // Part-17.7: সেকশন-বিরতি পাতার শেষ অনুচ্ছেদেই (আলাদা ফাঁকা অনুচ্ছেদ পাতা ভরা থাকলে পরের পাতায় গিয়ে .doc-এ ফাঁকা পাতা বানাত)
        const lastP = pageXml.lastIndexOf('<w:p>');
        const tail = lastP >= 0 ? pageXml.slice(lastP) : '';
        if (lastP >= 0 && /^<w:p><w:pPr>/.test(tail) && !/<w:tbl>/.test(tail) && /<\/w:p>$/.test(pageXml)) {
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
  }

  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';

  /** @returns Promise<Blob|Uint8Array> — মাস্টার ইউনিকোড .docx */
  async function build(ir, opts) {
    const o = opts || {};
    const JSZip = pick('JSZip') || o.JSZip;
    if (!JSZip) throw new Error('JSZip লোড হয়নি');
    const { xml, media } = bodyXml(ir);
    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${media.map((m) => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('')}</Relationships>`);
    zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US" w:bidi="bn-BD"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`);
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${xml}</w:body></w:document>`);
    for (const m of media) zip.file('word/media/' + m.name, m.data, { base64: true });
    return zip.generateAsync({ type: o.type || (typeof Blob !== 'undefined' ? 'blob' : 'uint8array'), mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  const FayzarFaithfulDocx = { FONT, bodyXml, build };
  global.FayzarFaithfulDocx = FayzarFaithfulDocx;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarFaithfulDocx;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
