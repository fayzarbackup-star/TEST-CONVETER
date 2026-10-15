/**
 * Fayzar — চিত্র রিভিউ স্ক্রিন (FayzarFigureReview)
 * ===============================================
 * ব্যবহারকারীর সিদ্ধান্ত (২০২৬-১০-০৫): সোর্স থেকে কাটা চিত্র থাকলে ডাউনলোডের আগে রিভিউ।
 * প্রতিটি চিত্র: বামে মূল পাতা + লাল কাটার-বক্স (মাউস টেনে নতুন বক্স, নিখুঁত/বড়/ছোট),
 * ডানে পরিষ্কার করা চিত্র + প্রস্থ (ইঞ্চি) + অবস্থান + বাদ দেওয়া।
 *
 * open(items, opts) → Promise< { figures: {id: fig} } | null >   (null = বাতিল)
 * items = FayzarFigureExtractor.extract(...).items  (কাটা/আবার-কাটা FayzarFigureExtractor.recrop দিয়ে)
 * সম্পূর্ণ অফলাইন, কোনো বাইরের CSS/লাইব্রেরি নয়।
 */
(function (global) {
  'use strict';

  const BN = '০১২৩৪৫৬৭৮৯';
  const bn = (v) => String(v).replace(/\d/g, (d) => BN[+d]);
  const PX_PER_IN = 96;

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    for (const k of Object.keys(attrs || {})) {
      if (k === 'style') e.style.cssText = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (children || []).forEach((c) => c && e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return e;
  }

  const BTN = 'font:inherit;font-size:13px;padding:5px 10px;margin:0 6px 6px 0;border-radius:6px;border:1px solid #0f766e;background:#fff;color:#0f766e;cursor:pointer;';
  const BTN_PRIMARY = 'font:inherit;font-size:14px;padding:8px 16px;margin-left:8px;border-radius:7px;border:1px solid #0f766e;background:#0f766e;color:#fff;cursor:pointer;';

  function open(items, opts) {
    const o = opts || {};
    const X = global.FayzarFigureExtractor;
    return new Promise((resolve) => {
      const overlay = el('div', { style: 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.72);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px;font-family:"Kalpurush","Nirmala UI",sans-serif;' });
      const panel = el('div', { style: 'background:#fff;color:#1e293b;border-radius:12px;max-width:1040px;width:100%;padding:18px 20px;box-shadow:0 20px 50px rgba(0,0,0,.35);' });
      panel.appendChild(el('h2', { style: 'margin:0 0 4px;font-size:20px;', text: 'চিত্র রিভিউ — ডাউনলোডের আগে দেখে নিন' }));
      panel.appendChild(el('p', { style: 'margin:0 0 14px;color:#475569;font-size:14px;', text: 'মূল পাতায় লাল বক্সটি কাটার সীমা। বক্স ভুল হলে পাতার ওপর মাউস টেনে নতুন বক্স আঁকুন, অথবা "নিখুঁত করুন"। ডানে চূড়ান্ত চিত্র যেভাবে ফাইলে বসবে।' }));
      const list = el('div');
      panel.appendChild(list);

      const state = items.map((it) => ({ it, removed: !!it.error && !it.fig }));

      state.forEach((st, idx) => {
        const it = st.it;
        const card = el('div', { style: 'border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:12px;display:flex;flex-wrap:wrap;gap:16px;' });
        const head = el('div', { style: 'width:100%;font-weight:bold;font-size:15px;', text: 'চিত্র ' + bn(it.id) + ' — পাতা ' + bn(it.page) + (it.error ? '  (সমস্যা: ' + it.error + ')' : '') });
        card.appendChild(head);

        // বাম: পাতা + বক্স
        const left = el('div', { style: 'flex:1 1 380px;min-width:260px;' });
        const pageCv = el('canvas', { style: 'width:100%;max-width:420px;border:1px solid #cbd5e1;cursor:crosshair;display:block;' });
        left.appendChild(pageCv);
        const leftBtns = el('div', { style: 'margin-top:6px;' });
        left.appendChild(leftBtns);
        card.appendChild(left);

        // ডান: চিত্র + নিয়ন্ত্রণ
        const right = el('div', { style: 'flex:1 1 300px;min-width:240px;' });
        const figBox = el('div', { style: 'border:1px dashed #94a3b8;padding:8px;min-height:120px;display:flex;align-items:center;justify-content:center;background:#f8fafc;' });
        const figImg = el('img', { style: 'max-width:100%;max-height:300px;background:#fff;', alt: 'চিত্র ' + it.id });
        figBox.appendChild(figImg);
        right.appendChild(figBox);
        const info = el('div', { style: 'font-size:13px;color:#475569;margin:6px 0;' });
        right.appendChild(info);
        const wInput = el('input', { type: 'number', step: '0.1', min: '0.4', style: 'width:80px;font:inherit;font-size:14px;padding:3px 6px;' });
        const alignSel = el('select', { style: 'font:inherit;font-size:14px;padding:3px 6px;' }, [
          el('option', { value: 'left', text: 'বামে' }), el('option', { value: 'center', text: 'মাঝে' }), el('option', { value: 'right', text: 'ডানে' })
        ]);
        const rmChk = el('input', { type: 'checkbox' });
        right.appendChild(el('div', { style: 'font-size:14px;margin:4px 0;' }, ['প্রস্থ (ইঞ্চি): ', wInput, '   অবস্থান: ', alignSel]));
        right.appendChild(el('label', { style: 'font-size:14px;color:#b91c1c;cursor:pointer;' }, [rmChk, ' এই চিত্রটি বাদ দিন']));
        card.appendChild(right);
        list.appendChild(card);

        // ---- আঁকা ----
        let scale = 1;
        function drawPage(dragRect) {
          if (!it.pageCanvas) { pageCv.width = 300; pageCv.height = 60; const g = pageCv.getContext('2d'); g.fillStyle = '#fef2f2'; g.fillRect(0, 0, 300, 60); g.fillStyle = '#b91c1c'; g.font = '14px sans-serif'; g.fillText('মূল পাতা পাওয়া যায়নি', 10, 34); return; }
          scale = Math.min(1, 840 / it.pageCanvas.width);
          pageCv.width = Math.round(it.pageCanvas.width * scale);
          pageCv.height = Math.round(it.pageCanvas.height * scale);
          const g = pageCv.getContext('2d');
          g.drawImage(it.pageCanvas, 0, 0, pageCv.width, pageCv.height);
          const r = dragRect || it.rect;
          if (r) { g.strokeStyle = '#dc2626'; g.lineWidth = 3; g.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale); }
        }
        function drawFig() {
          if (it.fig && it.fig.dataUrl) {
            figImg.src = it.fig.dataUrl;
            const wIn = (it.fig.cssW || 0) / PX_PER_IN;
            wInput.value = wIn ? wIn.toFixed(1) : '';
            wInput.max = String(it.maxWidthIn || 6);
            alignSel.value = it.fig.align || 'center';
            info.textContent = 'ফাইলে প্রস্থ ≈ ' + bn(wIn.toFixed(2)) + ' ইঞ্চি' + (it.fig.clamped ? ' (কলামের প্রস্থে সীমিত)' : ' (মূল পাতার প্রকৃত মাপ)') + ' · ' + bn(it.fig.pxW) + '×' + bn(it.fig.pxH) + ' পিক্সেল'
              + (it.fig.angle ? ' · কাত সোজা করা হয়েছে ' + bn(Math.abs(it.fig.angle).toFixed(1)) + '°' : '');
          } else {
            figImg.removeAttribute('src');
            info.textContent = 'চিত্র নেই — পাতায় মাউস টেনে বক্স আঁকুন';
          }
          rmChk.checked = st.removed;
          card.style.opacity = st.removed ? '0.5' : '1';
        }
        function doCrop(rect, refine) {
          if (!it.pageCanvas || !X) return;
          try { X.recrop(it, rect, refine); it.error = null; st.removed = false; } catch (e) { info.textContent = 'কাটতে সমস্যা: ' + (e && e.message); }
          drawPage(); drawFig();
        }

        // ---- মাউস দিয়ে বক্স ----
        let dragStart = null;
        const toPage = (ev) => { const b = pageCv.getBoundingClientRect(); return { x: (ev.clientX - b.left) * (pageCv.width / b.width) / scale, y: (ev.clientY - b.top) * (pageCv.height / b.height) / scale }; };
        pageCv.addEventListener('mousedown', (ev) => { if (!it.pageCanvas) return; dragStart = toPage(ev); ev.preventDefault(); });
        pageCv.addEventListener('mousemove', (ev) => {
          if (!dragStart) return;
          const p = toPage(ev);
          drawPage({ x: Math.min(dragStart.x, p.x), y: Math.min(dragStart.y, p.y), w: Math.abs(p.x - dragStart.x), h: Math.abs(p.y - dragStart.y) });
        });
        window.addEventListener('mouseup', (ev) => {
          if (!dragStart) return;
          const p = toPage(ev);
          const r = { x: Math.min(dragStart.x, p.x), y: Math.min(dragStart.y, p.y), w: Math.abs(p.x - dragStart.x), h: Math.abs(p.y - dragStart.y) };
          dragStart = null;
          if (r.w > 8 && r.h > 8) doCrop(r, false); else drawPage();
        });

        const nudge = (f) => {
          if (!it.rect || !it.pageCanvas) return;
          const dx = it.pageCanvas.width * f, dy = it.pageCanvas.height * f;
          doCrop({ x: it.rect.x - dx, y: it.rect.y - dy, w: it.rect.w + 2 * dx, h: it.rect.h + 2 * dy }, false);
        };
        leftBtns.appendChild(el('button', { type: 'button', style: BTN, text: 'নিখুঁত করুন (স্বয়ংক্রিয়)', onclick: () => it.rect && doCrop(it.rect, true) }));
        leftBtns.appendChild(el('button', { type: 'button', style: BTN, text: '＋ বড় করুন', onclick: () => nudge(0.01) }));
        leftBtns.appendChild(el('button', { type: 'button', style: BTN, text: '－ ছোট করুন', onclick: () => nudge(-0.01) }));
        // Part-16.4: কাত হাতে ঠিক করা (স্বয়ংক্রিয় মাপ পাতা-ভিত্তিক; কোনো চিত্রে না মিললে)
        const turn = (dd) => { it.angle = Math.round(((it.angle || 0) + dd) * 100) / 100; if (it.rect) doCrop(it.rect, false); };
        leftBtns.appendChild(el('button', { type: 'button', style: BTN, text: '↺ ০.৫°', title: 'বাম দিকে ঘোরান', onclick: () => turn(0.5) }));
        leftBtns.appendChild(el('button', { type: 'button', style: BTN, text: '↻ ০.৫°', title: 'ডান দিকে ঘোরান', onclick: () => turn(-0.5) }));

        wInput.addEventListener('change', () => {
          if (!it.fig) return;
          let w = parseFloat(wInput.value);
          if (!(w > 0)) return;
          const cap = it.maxWidthIn || 6;
          if (w > cap) { w = cap; wInput.value = cap.toFixed(1); }
          it.fig.cssW = Math.round(Math.max(0.4, w) * PX_PER_IN);
          it.fig.clamped = false;
          drawFig();
        });
        alignSel.addEventListener('change', () => { if (it.fig) it.fig.align = alignSel.value; });
        rmChk.addEventListener('change', () => { st.removed = rmChk.checked; drawFig(); });

        drawPage(); drawFig();
      });

      const close = (result) => { overlay.remove(); resolve(result); };
      const footer = el('div', { style: 'display:flex;justify-content:flex-end;align-items:center;gap:6px;border-top:1px solid #e2e8f0;padding-top:12px;' }, [
        el('span', { style: 'flex:1;font-size:13px;color:#64748b;', text: 'বাদ দেওয়া চিত্রের জায়গা ফাঁকা থাকবে (লেখা অক্ষত)।' }),
        el('button', { type: 'button', style: BTN, text: 'বাতিল', onclick: () => close(null) }),
        el('button', { type: 'button', style: BTN_PRIMARY, text: o.confirmText || 'নিশ্চিত করে ডাউনলোড', onclick: () => {
          const figures = {};
          for (const st of state) if (!st.removed && st.it.fig && st.it.fig.dataUrl) figures[st.it.id] = st.it.fig;
          close({ figures });
        } })
      ]);
      panel.appendChild(footer);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
    });
  }

  global.FayzarFigureReview = { open };
})(typeof window !== 'undefined' ? window : globalThis);
