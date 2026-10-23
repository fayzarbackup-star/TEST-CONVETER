/**
 * Fayzar — GENERAL_CLEAN লেআউট (Phase 2A) — পড়ে শুধু doc-model (doc-model.js); কোনো উৎস-বিশেষ জ্ঞান নেই
 * ==========================================================================================================
 * render(doc, opts) → { bodyXml, sectPr, stylesXml, stats }    renderDocx(doc, opts) → ইউনিকোড মাস্টার .docx (clean-composer.packDocx)
 * নীতি: FINAL_WORK_PLAN §৫ (ফন্ট-সিঁড়ি) + §৬ (ভূমিকা-নীতি)।
 *   মূল লেখা ১২ → ঘন হলে ১১ → খুব ঘন হলে ১০ (১০-এর নিচে কখনো নয়); title = মূল+৬/+৮ বোল্ড, heading = মূল+২ বোল্ড, ছোট লেখা = মূল−১ (≥১০)
 *   header/page_number/other/stamp/note বাদ (v1); footer শেষে; সারিবদ্ধতা ব্লক থেকে; পাশাপাশি = বর্ডারহীন ২-কলাম টেবিল;
 *   doc.columns = 2 হলে শুরুর পূর্ণ-প্রস্থ অংশের পর continuous ২-কলাম সেকশন।
 * opts: { runs(text, style) → রান-XML (ডিফল্ট clean-composer.runsXml), base, generalClean } — প্রোডাকশনে এখনো কোনো রাউটিং নেই;
 * চালু করতে opts.generalClean === true বা window.FZ_GENERAL_CLEAN / env FZ_GENERAL_CLEAN=1 (isEnabled)।
 */
(function (global) {
  'use strict';

  function mod(name, path) {
    if (global[name]) return global[name];
    if (typeof require === 'function') { try { return require(path); } catch (e) { /* নেই */ } }
    return null;
  }
  const CC = () => mod('FayzarCleanComposer', './clean-composer.js');
  const DM = () => mod('FayzarDocModel', './doc-model.js');

  const PAGE = { w: 11906, h: 16838 };
  const LADDER = [{ base: 12, margin: 1440 }, { base: 11, margin: 1080 }, { base: 10, margin: 864 }];
  const MARKER_RE = /^[(\[]?[০-৯0-9a-zA-Zক-ঘ]{1,3}[.)\]।]\s/;

  function isEnabled(opts) {
    if (opts && opts.generalClean === true) return true;
    if (typeof process !== 'undefined' && process.env && process.env.FZ_GENERAL_CLEAN === '1') return true;
    return !!(global.FZ_GENERAL_CLEAN);
  }

  function isMixColOff() {
    if (typeof FZ_OFF_MIXCOL !== 'undefined' && FZ_OFF_MIXCOL) return true;
    if (typeof window !== 'undefined' && window.FZ_OFF_MIXCOL) return true;
    if (typeof globalThis !== 'undefined' && globalThis.FZ_OFF_MIXCOL) return true;
    if (typeof process !== 'undefined' && process.env && process.env.FZ_OFF_MIXCOL === '1') return true;
    return false;
  }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const JC = { l: 'left', c: 'center', r: 'right' };

  // ───────── ঘনত্ব → ফন্ট/মার্জিন ─────────
  function estimatePages(doc, base, margin) {
    const isMixed = doc.mixedColumns && !isMixColOff();
    const cols = doc.columns === 2 ? 2 : 1;
    const textW = PAGE.w - 2 * margin;
    const cpl1 = Math.max(10, Math.floor(textW / 1 / (base * 10)));
    const cpl2 = Math.max(10, Math.floor(textW / 2 / (base * 10)));
    const cpl = cols === 2 ? cpl2 : cpl1;
    const lineH = base * 20 * 1.15 * 1.35;
    const pageH = (PAGE.h - 2 * margin) * cols;
    let h = 0;
    const lines = (t, c) => String(t).split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / c)), 0);
    DM().flat(doc).forEach((b) => {
      if (!DM().isKept(b)) return;
      const curCols = isMixed ? (b.cols || 1) : cols;
      const curCpl = curCols === 2 ? cpl2 : cpl1;
      let bh = 0;
      if (b.role === 'table') {
        const n = b.rows[0] ? b.rows[0].length : 1;
        const cc = Math.max(4, Math.floor(curCpl / n));
        b.rows.forEach((r) => { bh += Math.max.apply(null, r.map((c) => lines(c, cc))) * lineH + 100; });
      } else if (b.role === 'rule' || b.role === 'figure') bh += lineH;
      else bh += lines(b.text, b.role === 'title' ? Math.floor(curCpl * 0.6) : curCpl) * lineH + 80;

      if (isMixed) {
        h += (curCols === 2 ? bh / 2 : bh);
      } else {
        h += bh;
      }
    });
    return isMixed ? (h / (PAGE.h - 2 * margin)) : (h / pageH);
  }
  function choose(doc, opts) {
    if (opts && opts.base) return { base: opts.base, margin: (LADDER.filter((l) => l.base === opts.base)[0] || LADDER[0]).margin, est: null };
    const n = Math.max(1, doc.pages.length);
    for (let i = 0; i < LADDER.length; i++) {
      const est = estimatePages(doc, LADDER[i].base, LADDER[i].margin);
      if (est <= n * 1.05 || i === LADDER.length - 1) return Object.assign({ est: +est.toFixed(2) }, LADDER[i]);
    }
    return Object.assign({ est: null }, LADDER[0]);
  }

  // ───────── রেন্ডার ─────────
  function render(doc, opts) {
    const D = DM(), C = CC();
    const o = opts || {};
    const errs = D.validate(doc);
    if (errs.length) throw new Error('doc-model অবৈধ: ' + errs[0]);
    const pick = choose(doc, o);
    const base = pick.base, margin = pick.margin;
    const textW = PAGE.w - 2 * margin;
    const runs = o.runs || ((t, st) => C.runsXml(t, st));
    const stats = { base, margin, estPages: pick.est, blocks: 0, dropped: {}, droppedFigures: 0 };
    const sz = (pt) => Math.round(pt * 2);
    const small = Math.max(10, base - 1);

    const wrapped = (lines) => {   // OCR-এর দৃশ্যমান ভাঙা লাইন কি একটি অনুচ্ছেদের অংশ?
      if (lines.length < 2) return true;
      const mx = Math.max.apply(null, lines.map((l) => l.length));
      return lines.slice(0, -1).every((l) => l.length >= 0.6 * mx) && mx > 30;
    };
    const lineRuns = (b, style, joinMode) => {
      const ls = b.lines.filter((l) => l !== '');
      const mode = joinMode || (wrapped(ls) ? 'join' : 'br');
      if (mode === 'join') return runs(ls.join(' '), style);
      return ls.map((l) => runs(l, style)).join('<w:r><w:br/></w:r>');
    };
    const para = (ppr, inner) => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${inner}</w:p>`;
    const marker = (t) => t.replace(/^(\S{1,5}[.)।])\s+/, '$1\t');

    function sizeOf(b) { return b.size === 's' ? small : base; }
    function style(b, pt, extra) { return Object.assign({ sz: sz(pt), b: b.bold, i: b.italic, u: b.underline }, extra || {}); }

    function renderBlock(b, ctx) {
      const inCell = ctx && ctx.inCell;
      const curCols = (ctx && ctx.cols) || b.cols || 1;
      const curW = curCols === 2 ? Math.floor((textW - 425) / 2) : textW;
      const jc = (b.align && b.align !== 'l') ? `<w:jc w:val="${JC[b.align]}"/>` : '';
      switch (b.role) {
        case 'title': {
          const pt = base + (b.size === 'xl' ? 8 : 6);
          const border = ctx && ctx.borderBelow ? '<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="000000"/></w:pBdr>' : '';
          return para(`<w:keepNext/>${border}<w:spacing w:before="60" w:after="60"/>${'<w:jc w:val="' + (b.align === 'l' && !inCell ? 'center' : JC[b.align]) + '"/>'}`,
            lineRuns(b, style(Object.assign({}, b, { bold: true }), pt), 'br'));
        }
        case 'heading': {
          const pt = b.level >= 3 ? base : base + 2;
          return para(`<w:pStyle w:val="Heading${Math.min(3, b.level || 2)}"/>${jc}`, lineRuns(b, style(Object.assign({}, b, { bold: true }), pt), 'join'));
        }
        case 'paragraph': {
          const long = b.text.length > 110 && b.align === 'l' && wrapped(b.lines);
          return para(`${long ? '<w:jc w:val="both"/>' : jc}`, lineRuns(b, style(b, sizeOf(b))));
        }
        case 'list': {
          const t = b.lines.join(' ');
          const txt = MARKER_RE.test(t) || /^[•\-–*]\s/.test(t) ? marker(t) : '•\t' + t;
          return para(`<w:tabs><w:tab w:val="left" w:pos="360"/></w:tabs><w:ind w:left="360" w:hanging="360"/>${jc}`, runs(txt, style(b, sizeOf(b))));
        }
        case 'question': {
          const t = b.lines.join(' ');
          return para(`<w:keepNext/><w:tabs><w:tab w:val="left" w:pos="480"/></w:tabs><w:spacing w:before="60"/><w:ind w:left="480" w:hanging="480"/>`, runs(marker(t), style(b, base)));
        }
        case 'option_row': {
          const cells = (b.cells && b.cells.length ? b.cells : [b.text]).map((c) => c.trim()).filter(Boolean);
          const n = cells.length;
          if (n === 0) return '';
          if (curCols === 1) {
            const avail = textW - 480;
            if (n < 2 || Math.max.apply(null, cells.map((c) => c.length)) * base * 10 > avail / n) {
              return para('<w:spacing w:after="20"/><w:ind w:left="480"/>', cells.map((c) => runs(c, style(b, base))).join('<w:r><w:br/></w:r>'));
            }
            const stops = cells.map((_, i) => (i ? `<w:tab w:val="left" w:pos="${480 + Math.round(avail * i / n)}"/>` : '')).join('');
            return para(`<w:tabs>${stops}</w:tabs><w:spacing w:after="20"/><w:ind w:left="480"/>`, runs(cells.join('\t'), style(b, base)));
          }
          // ২-কলাম সেকশন: প্রস্থ কলাম-প্রস্থ (curW) ধরে হিসাব
          const avail = curW - 480;
          if (n < 2) {
            return para('<w:spacing w:after="20"/><w:ind w:left="480"/>', cells.map((c) => runs(c, style(b, base))).join('<w:r><w:br/></w:r>'));
          }
          if (n === 2) {
            if (Math.max(cells[0].length, cells[1].length) * base * 10 <= avail / 2) {
              const stops = `<w:tab w:val="left" w:pos="${480 + Math.round(avail / 2)}"/>`;
              return para(`<w:tabs>${stops}</w:tabs><w:spacing w:after="20"/><w:ind w:left="480"/>`, runs(cells.join('\t'), style(b, base)));
            }
            return para('<w:spacing w:after="20"/><w:ind w:left="480"/>', cells.map((c) => runs(c, style(b, base))).join('<w:r><w:br/></w:r>'));
          }
          if (n === 4) {
            // ১) ৪টি অপশন এক সারিতে আঁটলে
            if (Math.max.apply(null, cells.map((c) => c.length)) * base * 10 <= avail / 4) {
              const stops = cells.map((_, i) => (i ? `<w:tab w:val="left" w:pos="${480 + Math.round(avail * i / 4)}"/>` : '')).join('');
              return para(`<w:tabs>${stops}</w:tabs><w:spacing w:after="20"/><w:ind w:left="480"/>`, runs(cells.join('\t'), style(b, base)));
            }
            // ২) না আঁটলে ২x২ সাজাও
            const r1Fit = Math.max(cells[0].length, cells[1].length) * base * 10 <= avail / 2;
            const r2Fit = Math.max(cells[2].length, cells[3].length) * base * 10 <= avail / 2;
            if (r1Fit && r2Fit) {
              const tabPos = 480 + Math.round(avail / 2);
              const pPr = `<w:tabs><w:tab w:val="left" w:pos="${tabPos}"/></w:tabs><w:spacing w:after="20"/><w:ind w:left="480"/>`;
              const line1 = runs(cells[0] + '\t' + cells[1], style(b, base));
              const line2 = runs(cells[2] + '\t' + cells[3], style(b, base));
              return para(pPr, line1 + '<w:r><w:br/></w:r>' + line2);
            }
            // ৩) তাতেও না আঁটলে প্রতি লাইনে একটি
            return para('<w:spacing w:after="20"/><w:ind w:left="480"/>', cells.map((c) => runs(c, style(b, base))).join('<w:r><w:br/></w:r>'));
          }
          if (Math.max.apply(null, cells.map((c) => c.length)) * base * 10 <= avail / n) {
            const stops = cells.map((_, i) => (i ? `<w:tab w:val="left" w:pos="${480 + Math.round(avail * i / n)}"/>` : '')).join('');
            return para(`<w:tabs>${stops}</w:tabs><w:spacing w:after="20"/><w:ind w:left="480"/>`, runs(cells.join('\t'), style(b, base)));
          }
          return para('<w:spacing w:after="20"/><w:ind w:left="480"/>', cells.map((c) => runs(c, style(b, base))).join('<w:r><w:br/></w:r>'));
        }
        case 'label_value':
          return para(`<w:tabs><w:tab w:val="left" w:pos="2400"/></w:tabs>${jc}`, lineRuns(b, style(b, sizeOf(b)), 'br'));
        case 'signature': {
          const ind = b.align === 'r' ? `<w:ind w:left="${Math.round(curW * 0.55)}"/>` : b.align === 'c' ? `<w:ind w:left="${Math.round(curW * 0.25)}" w:right="${Math.round(curW * 0.25)}"/>` : `<w:ind w:right="${Math.round(curW * 0.55)}"/>`;
          const inner = inCell ? '<w:ind w:left="0" w:right="0"/>' : ind;
          return para(`<w:keepLines/><w:pBdr><w:top w:val="single" w:sz="6" w:space="2" w:color="000000"/></w:pBdr><w:spacing w:before="${inCell ? 480 : 600}" w:after="60"/>${inner}${jc || '<w:jc w:val="left"/>'}`,
            lineRuns(b, style(b, base), 'br'));
        }
        case 'footer':
          return para('<w:jc w:val="center"/>', lineRuns(b, style(b, Math.max(10, base - 2)), 'br'));
        case 'rule':
          return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="000000"/></w:pBdr><w:spacing w:before="0" w:after="80" w:line="120" w:lineRule="exact"/></w:pPr></w:p>';
        case 'figure':
          if (b.figIndex == null) { stats.droppedFigures++; return ''; }
          return para('<w:jc w:val="center"/>', `<w:r><w:t>QZFIG${b.figIndex}QZ</w:t></w:r>`);
        case 'table': return tableXml(b, curW);
        case 'side_by_side': return sideXml(b);
        default: return '';
      }
    }

    function tableXml(b, effW) {
      const curTableW = effW || textW;
      const n = b.rows[0] ? b.rows[0].length : 1;
      const dense = n >= 5 || b.rows.length > 20;
      const pt = dense ? small : base;
      const w = b.rows.map((r) => r.map((c) => c.length));
      const mx = Array.from({ length: n }, (_, j) => Math.max(6, Math.min(40, Math.max.apply(null, w.map((r) => r[j] || 0)))));
      const tot = mx.reduce((a, c) => a + c, 0);
      let cw = mx.map((m) => Math.max(Math.round(curTableW * 0.07), Math.round(curTableW * m / tot)));
      const sum = cw.reduce((a, c) => a + c, 0);
      cw = cw.map((c) => Math.floor(c * curTableW / sum));
      // Phase 4 (নকশা-পত্র): উৎসের কলাম-অনুপাত থাকলে সেটাই (সর্বনিম্ন ৫%); না থাকলে উপরের লেখা-দৈর্ঘ্যের হিসাব
      if (b.colRatios && b.colRatios.length === n) {
        const rt = b.colRatios.map((v) => Math.max(v, 5)), rs = rt.reduce((a, c) => a + c, 0);
        cw = rt.map((v) => Math.floor(curTableW * v / rs));
      }
      const hdrRows = b.headerRows != null ? b.headerRows : (b.header ? 1 : 0);
      const cov = {}, top = {};
      (b.merges || []).forEach((m) => {
        top[m.r + ',' + m.c] = m;
        for (let i = 0; i < m.rs; i++) for (let j = 0; j < m.cs; j++) if (i || j) cov[(m.r + i) + ',' + (m.c + j)] = { m, first: j === 0 };
      });
      const keep = b.rows.length <= 15;
      const bd = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('');
      let x = `<w:tbl><w:tblPr><w:tblW w:w="${curTableW}" w:type="dxa"/><w:tblBorders>${bd}</w:tblBorders><w:tblLayout w:type="fixed"/>` +
        '<w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
        `<w:tblGrid>${cw.map((c) => `<w:gridCol w:w="${c}"/>`).join('')}</w:tblGrid>`;
      b.rows.forEach((r, ri) => {
        const hdr = ri < hdrRows;
        x += `<w:tr><w:trPr><w:cantSplit/>${hdr ? '<w:tblHeader/>' : ''}</w:trPr>` + r.map((c, j) => {
          const cv = cov[ri + ',' + j], tp = top[ri + ',' + j];
          if (cv && !cv.first) return '';                                   // একই সারিতে colspan-এ ঢাকা ঘর
          const span = tp ? tp.cs : (cv ? cv.m.cs : 1);
          let wd = 0; for (let k = 0; k < span; k++) wd += cw[j + k] || 0;
          const tcPr = `<w:tcW w:w="${wd || cw[j]}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}` +
            (tp && tp.rs > 1 ? '<w:vMerge w:val="restart"/>' : (cv ? '<w:vMerge/>' : ''));
          const cell = cv ? '' : c.replace(/<br\s*\/?>/gi, ' ');
          return `<w:tc><w:tcPr>${tcPr}</w:tcPr><w:p><w:pPr>${keep && ri < b.rows.length - 1 ? '<w:keepNext/>' : ''}<w:spacing w:after="0"/>${hdr ? '<w:jc w:val="center"/>' : ''}</w:pPr>` +
            `${cv ? '' : runs(cell, { sz: sz(pt), b: hdr })}</w:p></w:tc>`;
        }).join('') + '</w:tr>';
      });
      return x + '</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/></w:pPr></w:p>';
    }

    function sideXml(b) {
      const half = Math.floor(textW / 2);
      const cell = (bs) => `<w:tc><w:tcPr><w:tcW w:w="${half}" w:type="dxa"/></w:tcPr>${bs.map((c) => renderBlock(c, { inCell: true })).join('') || '<w:p/>'}</w:tc>`;
      const none = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="nil"/>`).join('');
      return `<w:tbl><w:tblPr><w:tblW w:w="${textW}" w:type="dxa"/><w:tblBorders>${none}</w:tblBorders><w:tblLayout w:type="fixed"/>` +
        '<w:tblCellMar><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
        `<w:tblGrid><w:gridCol w:w="${half}"/><w:gridCol w:w="${textW - half}"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(b.left)}${cell(b.right)}</w:tr></w:tbl>` +
        '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/></w:pPr></w:p>';
    }

    // ব্লকের তালিকা: রাখা-ভূমিকা, footer শেষে
    const all = [];
    doc.pages.forEach((pg) => pg.blocks.forEach((b) => all.push(b)));
    const kept = [], footers = [];
    all.forEach((b) => {
      if (!D.isKept(b)) { stats.dropped[b.role] = (stats.dropped[b.role] || 0) + 1; return; }
      (b.role === 'footer' ? footers : kept).push(b);
    });
    const seq = kept.concat(footers);
    if (doc.mixedColumns && !isMixColOff()) {
      seq.forEach((b) => {
        if (b.cols == null) b.cols = 1;
      });
    } else if (doc.columns === 2) {
      const narrow = (b) => b.box && (b.box[3] - b.box[1]) < 520 && ['question', 'option_row', 'list', 'paragraph'].indexOf(b.role) >= 0;
      const k = seq.findIndex(narrow);
      seq.forEach((b, i) => {
        b.cols = (k > 0 ? i >= k : true) ? 2 : 1;
      });
    } else {
      seq.forEach((b) => { b.cols = 1; });
    }
    const items = seq.map((b, i) => {
      stats.blocks++;
      const nx = seq[i + 1];
      const borderBelow = b.role === 'title' && !(nx && (nx.role === 'rule' || nx.role === 'title'));
      const cols = b.cols || 1;
      return { b, xml: renderBlock(b, { borderBelow, cols }) };
    });

    const pgMar = `<w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="720" w:footer="720" w:gutter="0"/>`;
    const pgSz = `<w:pgSz w:w="${PAGE.w}" w:h="${PAGE.h}"/>`;
    let bodyXml, sectPr;
    if (doc.mixedColumns && !isMixColOff()) {
      const bands = [];
      items.forEach((it) => {
        const last = bands[bands.length - 1];
        const bCols = it.b.cols || 1;
        const bBand = it.b.band != null ? it.b.band : (last ? last.bandIdx : 0);
        if (last && last.bandIdx === bBand) {
          last.items.push(it);
        } else {
          bands.push({ bandIdx: bBand, cols: bCols, items: [it] });
        }
      });

      const sectXmlForBand = (band, isFirst) => {
        const cont = isFirst ? '' : '<w:type w:val="continuous"/>';
        const colsXml = band.cols === 2 ? '<w:cols w:num="2" w:space="425"/>' : '';
        return `${cont}${pgSz}${pgMar}${colsXml}`;
      };

      const bodyParts = [];
      for (let i = 0; i < bands.length - 1; i++) {
        const band = bands[i];
        bodyParts.push(band.items.map((it) => it.xml).join('\n'));
        const sXml = sectXmlForBand(band, i === 0);
        bodyParts.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/><w:sectPr>${sXml}</w:sectPr></w:pPr></w:p>`);
      }
      const lastBand = bands[bands.length - 1] || { items: [], cols: 1 };
      bodyParts.push(lastBand.items.map((it) => it.xml).join('\n'));
      bodyXml = bodyParts.join('\n');

      const lastIsFirst = bands.length <= 1;
      sectPr = `<w:sectPr>${sectXmlForBand(lastBand, lastIsFirst)}</w:sectPr>`;
    } else if (doc.columns === 2) {
      const narrow = (b) => b.box && (b.box[3] - b.box[1]) < 520 && ['question', 'option_row', 'list', 'paragraph'].indexOf(b.role) >= 0;
      const k = items.findIndex((it) => narrow(it.b));
      const head = k > 0 ? items.slice(0, k) : [];
      const rest = k > 0 ? items.slice(k) : items;
      bodyXml = head.map((it) => it.xml).join('\n');
      if (head.length) bodyXml += `\n<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/><w:sectPr>${pgSz}${pgMar}</w:sectPr></w:pPr></w:p>\n`;
      bodyXml += rest.map((it) => it.xml).join('\n');
      sectPr = `<w:sectPr>${head.length ? '<w:type w:val="continuous"/>' : ''}${pgSz}${pgMar}<w:cols w:num="2" w:space="425"/></w:sectPr>`;
    } else {
      bodyXml = items.map((it) => it.xml).join('\n');
      sectPr = `<w:sectPr>${pgSz}${pgMar}</w:sectPr>`;
    }
    const styles = C.stylesXml().split('w:val="24"').join(`w:val="${base * 2}"`);
    return { bodyXml, sectPr, stylesXml: styles, stats };
  }

  async function renderDocx(doc, opts) {
    const r = render(doc, opts);
    const blob = await CC().packDocx(r.bodyXml, r.sectPr, r.stylesXml);
    return blob;
  }

  const FayzarGeneralCleanLayout = { LADDER, isEnabled, choose, estimatePages, render, renderDocx };
  global.FayzarGeneralCleanLayout = FayzarGeneralCleanLayout;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarGeneralCleanLayout;
})(typeof globalThis !== 'undefined' ? globalThis : this);
