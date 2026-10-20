/**
 * Fayzar — হুবহু-মোড ক্রমিক-অনুচ্ছেদের ঝুলন্ত ইনডেন্ট (FayzarSerialHang) — সুইচ FZ_ON=SERIALHANG / __FZ_ON_SERIALHANG
 * সমস্যা (২০২৬-১০-২০, ১৯ ফাইলে ৩৯৯ ক্রমিক-অনুচ্ছেদের ৩৪২টি): "১। লেখা" নম্বরের পরে শুধু স্পেস ⇒ "৯।"/"১০।"-এ লেখার শুরু
 * এক রেখায় নয়, আর দ্বিতীয় লাইন নম্বরের নিচে চলে যায়।
 * সমাধান: নম্বরের পরের স্পেস → <w:tab/>, আর ঝুলন্ত ইনডেন্ট (নম্বর আগের জায়গায়, লেখা সবসময় একই কলামে)।
 * ঝুলন্ত-ইনডেন্ট Word-এ নিজেই ট্যাব-স্টপ, তাই w:tabs-এ হাত নেই; আগে কোনো ছোট ট্যাব-স্টপ থাকলে অনুচ্ছেদ বাদ।
 * কাজ শেষ document.xml-এর body-স্ট্রিংয়ে (builder শুধু ডাকে)।
 */
(function (global) {
  'use strict';

  // ক্রমিক: ১। ১০। ১) (১) ০১. 1. (ক) ক) ক।
  const SER = /^(\s*)(\(?[০-৯0-9]{1,2}[।.)]|\([ক-হa-z]\)|[ক-হ][।.)])([  ]+)(?=\S)/;
  const HANG_EM = 2.0;      // নম্বর-কলামের প্রস্থ (ফন্ট-আকারের গুণ) — "১০।" + ফাঁক
  const IND_AFTER = /<w:(contextualSpacing|mirrorIndents|suppressOverlap|jc|textDirection|textAlignment|textboxTightWrap|outlineLvl|divId|cnfStyle|rPr|sectPr|pPrChange)[ >/]/;

  function isOn() {
    try {
      if (global.__FZ_ON_SERIALHANG) return true;
      if (typeof process !== 'undefined' && process.env && process.env.FZ_ON) return process.env.FZ_ON.split(',').map((s) => s.trim()).includes('SERIALHANG');
    } catch (e) { /* ব্রাউজার */ }
    return false;
  }

  const attr = (tag, n) => { const m = tag.match(new RegExp(`w:${n}="(-?\\d+)"`)); return m ? +m[1] : 0; };

  function fixPara(p) {
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
    const hang = Math.round(sz * HANG_EM * 20);
    const start = left + first;                 // নম্বর আগের জায়গায় থাকে
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

  // body-স্ট্রিংয়ের সব অনুচ্ছেদে; ফেরত { xml, n }
  function apply(xml) {
    let n = 0;
    const out = String(xml).replace(/<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>/g, (p) => { const q = fixPara(p); if (q !== p) n++; return q; });
    return { xml: out, n };
  }

  const FayzarSerialHang = { isOn, apply, fixPara, HANG_EM };
  global.FayzarSerialHang = FayzarSerialHang;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarSerialHang;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
