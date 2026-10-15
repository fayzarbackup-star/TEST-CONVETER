/**
 * Fayzar — ছকের সারি ⇒ রেখা-ভাগ, কালি-মাপে (FayzarRowInk) — ২০২৬-১০-১৩
 * সমস্যা: layout-ir rowBandHeights সারি বসাত মাপা লেখা-লাইন (textLinesPt) গুনে; কাত স্ক্যানে লাইন জুড়ে যায় (a05: ৩০ সারিতে ৩ লাইন)
 * ⇒ সমান-ভাগ/অনুপাত অনুমান ⇒ লম্বা লেখার সারি ১০pt-এর ভাগে (a16 p9: Word-এ ১২১pt)।
 * এখানে: প্রতিটি রেখা-ভাগের ভেতরের কালির উচ্চতা (page-geometry textInkPt, ভাগে সীমিত — কাত হলেও কালি নিজের ভাগেই থাকে)
 * ⇒ ভাগে আনুমানিক লাইন। সারিগুলো ক্রমে ভাগে বসানো (DP, ক্রম অটুট): খরচ = |সারির অনুমিত লাইন − ভাগের মাপা লাইন|,
 * কালিওয়ালা ভাগ খালি / কালিহীন ভাগে লেখা-সারি = শাস্তি। বিশুদ্ধ ফাংশন — Node-এ টেস্টযোগ্য।
 */
(function (global) {
  'use strict';

  const MISS = 3;      // কালিওয়ালা ভাগে কোনো লেখা-সারি নেই
  const FALSE = 3;     // কালিহীন ভাগে লেখা-সারি

  /**
   * ভাগে মাপা লাইন-সংখ্যা: কালির টুকরো (y0,y1 pt) কেন্দ্র ধরে ভাগে; ভাগের কালি-উচ্চতা ÷ লাইন-পিচ
   * @returns [{ ink: bool, lines: number }] (bands-এর ক্রমে)
   */
  function bandLines(bands, inkBoxes, pitchPt) {
    return bands.map((b) => {
      const cs = inkBoxes.filter((c) => { const y = (c[0] + c[1]) / 2; return y >= b.y0 && y < b.y1; });
      if (!cs.length) return { ink: false, lines: 0 };
      const ext = Math.max(...cs.map((c) => c[1])) - Math.min(...cs.map((c) => c[0]));
      return { ink: true, lines: Math.max(1, Math.round(ext / pitchPt + 0.35)) };
    });
  }

  /**
   * est[i] = সারি i-এর অনুমিত লাইন (০ = ফাঁকা সারি); bl = bandLines(...)
   * @returns band[i] (প্রতি সারির ভাগ-সূচক, অ-হ্রাসমান) বা null
   */
  function assign(est, bl) {
    const R = est.length, B = bl.length;
    if (!R || !B) return null;
    const INF = 1e9;
    // f[b][i] = প্রথম b ভাগে প্রথম i সারি; শেষ ভাগে সারির দল (০-ও হতে পারে)
    const f = Array.from({ length: B + 1 }, () => new Array(R + 1).fill(INF));
    const from = Array.from({ length: B + 1 }, () => new Array(R + 1).fill(-1));
    f[0][0] = 0;
    const groupCost = (b, i, j) => {   // ভাগ b-তে সারি i..j-1
      let S = 0, txt = 0, emp = 0;
      for (let k = i; k < j; k++) { if (est[k] > 0) { S += est[k]; txt++; } else emp++; }
      const x = bl[b];
      if (!x.ink) return txt ? FALSE + S : 0;
      if (!txt) return MISS + (emp ? 0 : 0);
      return Math.abs(S - x.lines) + emp * 0.5;
    };
    for (let b = 0; b < B; b++) {
      for (let i = 0; i <= R; i++) {
        if (f[b][i] >= INF) continue;
        for (let j = i; j <= R; j++) {
          const c = f[b][i] + groupCost(b, i, j);
          if (c < f[b + 1][j]) { f[b + 1][j] = c; from[b + 1][j] = i; }
        }
      }
    }
    if (f[B][R] >= INF) return null;
    const band = new Array(R).fill(-1);
    for (let b = B, j = R; b > 0; b--) {
      const i = from[b][j];
      for (let k = i; k < j; k++) band[k] = b - 1;
      j = i;
    }
    return band.every((x) => x >= 0) ? band : null;
  }

  /**
   * ২০২৬-১০-১৪ (a05): Gemini-সারি ⇒ মাপা রেখা-ভাগ, এক-ভাগে-এক (পুনর্গঠন)। ফিকে স্ক্যানে Gemini ফাঁকা সারিতে আগের সারির কপি লেখে
   * (বেতন ×২, চিকিৎসা ভাতা ×৩) আর মূলের ফাঁকা সারি বাদ দেয়। DP (ক্রম অটুট):
   *   লেখা-সারি কালিহীন ভাগে ১ · কালিওয়ালা ভাগ খালি ১ · আগের সারির হুবহু কপি বাদ ০.৬ · ফাঁকা Gemini-সারি বাদ ০.২ · অনন্য সারি বাদ নিষেধ
   * inked[j] = ভাগ j-তে লেখা আছে কি না। ফেরত: ভাগ-প্রতি সারি (ফাঁকা ভাগে ফাঁকা সারি) বা null
   */
  function realign(rows, inked) {
    const n = rows.length, m = inked.length, INF = 1e9;
    const txt = (r) => r.some((c) => c && String(c).trim());
    const key = (r) => r.map((c) => String(c || '').trim()).join('|');
    const dup = rows.map((r, i) => i > 0 && txt(r) && key(r) === key(rows[i - 1]));
    const filled = (c) => !!(c && String(c).trim());
    const comp = (a, b) => { const L = Math.max(a.length, b.length); for (let k = 0; k < L; k++) if (filled(a[k]) && filled(b[k])) return false; return true; };
    // D[i][j] = প্রথম i সারি, প্রথম j ভাগ শেষ
    const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(INF));
    const P = Array.from({ length: n + 1 }, () => new Int8Array(m + 1));
    D[0][0] = 0;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
      const v = D[i][j]; if (v >= INF) continue;
      // সারি i ⇒ ভাগ j
      if (i < n && j < m) { const c = v + (txt(rows[i]) ? (inked[j] ? 0 : 1) : (inked[j] ? 1 : 0)); if (c < D[i + 1][j + 1]) { D[i + 1][j + 1] = c; P[i + 1][j + 1] = 1; } }
      // ভাগ j খালি (ফাঁকা সারি যোগ)
      if (j < m) { const c = v + (inked[j] ? 1 : 0); if (c < D[i][j + 1]) { D[i][j + 1] = c; P[i][j + 1] = 2; } }
      // সারি i বাদ
      if (i < n && (dup[i] || !txt(rows[i]))) { const c = v + (dup[i] ? 0.6 : 0.2); if (c < D[i + 1][j]) { D[i + 1][j] = c; P[i + 1][j] = 3; } }
      // দুই পরিপূরক সারি এক ভাগে (a05: "টাকা | পয়সা" উপ-শিরোনাম মূলে শিরোনাম-ভাগের ভেতরে, আংশিক দাগের নিচে) — ০.৩
      // শুধু শিরোনাম-ভাগে (j=0) — নিচে লাগালে "কর্তন" + "সর্বমোট" জুড়ে যেত
      // (শিরোনামে একই কলামে দুটো লেখা — "রেট" / "টাকা" — মূলে একই ঘরে ওপরে-নিচে ⇒ '\n'-এ জোড়া)
      // উপসারির প্রথম ঘর ফাঁকা হওয়া চাই (ওপরের "কোড নং"-এর নিচে) — নইলে যেকোনো দুই সারি জুড়ে যেত
      if (i + 1 < n && j === 0 && txt(rows[i]) && txt(rows[i + 1]) && !filled(rows[i + 1][0])) {
        const c = v + 0.3 + (inked[j] ? 0 : 1); if (c < D[i + 2][j + 1]) { D[i + 2][j + 1] = c; P[i + 2][j + 1] = 4; }
      }
    }
    if (D[n][m] >= INF) return null;
    const out = [];
    let i = n, j = m;
    const nC = Math.max(...rows.map((r) => r.length));
    while (i > 0 || j > 0) {
      const p = P[i][j];
      if (p === 1) { out.push(rows[i - 1]); i--; j--; } else if (p === 4) {
        let a = rows[i - 2].slice();
        const b = rows[i - 1];
        // উপ-শিরোনাম বেশি কলামে (a05: "রেট | টাকার অংক" ⇒ নিচে "টাকা | পয়সা | টাকা | পয়সা") ⇒ ওপরের প্রতিটি লেখা অনুপাতে নিচের
        // কলাম-জোড়ার প্রথমটিতে (মূলে "টাকার অংক" ৪–৫ কলাম জুড়ে; ৩-এ বসালে সরু "পয়সা"-ঘরে না এঁটে পুরো ছকের ফন্ট ছোট হতো)
        const p = b.findIndex(filled), lastA = a.map(filled).lastIndexOf(true);
        if (p >= 0 && lastA >= p) {
          const bEnd = b.map(filled).lastIndexOf(true) + 1, f = (bEnd - p) / (lastA + 1 - p);
          if (f >= 1.5 && Number.isInteger(f)) { const a2 = a.map((c, k) => (k < p ? c : '')); for (let k = p; k <= lastA; k++) a2[p + (k - p) * f] = a[k]; a = a2; }
        }
        out.push(Array.from({ length: nC }, (_, k) => (filled(a[k]) && filled(b[k]) ? a[k] + '\n' + b[k] : filled(a[k]) ? a[k] : (b[k] || '')))); i -= 2; j--;
      } else if (p === 2) { out.push(Array(nC).fill('')); j--; } else if (p === 3) i--; else return null;
    }
    return { rows: out.reverse(), cost: D[n][m] };
  }

  const FayzarRowInk = { bandLines, assign, realign };
  global.FayzarRowInk = FayzarRowInk;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarRowInk;
})(typeof globalThis !== 'undefined' ? globalThis : this);
