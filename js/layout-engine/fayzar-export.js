/**
 * Fayzar — একক রপ্তানি-পথ (FayzarExport)
 * =====================================
 * সব Word-আউটপুট একটাই মাস্টার থেকে (স্থাপত্য-সিদ্ধান্ত ২০২৬-১০-০৫):
 *
 *   লেখা (MD) ──► FayzarPipeline.exportDocx ──► মাস্টার .docx (OMML সমীকরণ, লেআউট-প্ল্যান)
 *                                             └► চিত্র থাকলে StudioFigurePipeline.injectIntoDocx (word/media)
 *     'docx-unicode' = মাস্টার
 *     'docx-bijoy'   = DocxHandler.convertDocx(u2b, SutonnyMJ)
 *     'doc'          = বিজয় .docx ──► DocxToDocConverter (Word 2003, সমীকরণ = এডিটযোগ্য EQ-ফিল্ড)
 *                                   ──► FayzarDocMhtml (ছবি থাকলে MHTML; না থাকলে হুবহু)
 *
 * OCR, MD-ফাইল ও স্টুডিও — তিনটিই এই একটি ফাংশন ডাকবে; কারও নিজস্ব রপ্তানি-কোড থাকবে না।
 * ক্রমটি ai-ocr-engine.js-এর প্রমাণিত OCR-ডাউনলোড পথের হুবহু (Part-15.8)।
 */
(function (global) {
  'use strict';

  function pick(name) {
    if (typeof global !== 'undefined' && global[name]) return global[name];
    if (typeof window !== 'undefined' && window[name]) return window[name];
    return null;
  }

  function countFigures(store) { return store && typeof store === 'object' ? Object.keys(store).length : 0; }

  const FayzarExport = {
    FORMATS: ['docx-unicode', 'docx-bijoy', 'doc'],

    /**
     * @param {string} text  পূর্ণ মার্কডাউন (ফ্রন্টম্যাটার থাকলেও চলে)
     * @param {object} opt   { format, docType, figures, pageSize, margin, fontSize, columns,
     *                         auditNote, suppressAuditNote, __frontmatter, parsedData, renumber }
     * @returns {Promise<{ blob: Blob, format: string, steps: string[], figures: number, mhtmlImages: boolean }>}
     */
    /** Part-18.0: য়/ড়/ঢ়-এর দুই-অংশ রূপ (ব্যঞ্জন + ়) ⇒ একক অক্ষর (U+09DF/09DC/09DD) — সব parser/শনাক্তকারী এই রূপে লেখা */
    composeNukta(s) {
      return String(s == null ? '' : s).replace(/\u09AF\u09BC/g, '\u09DF').replace(/\u09A1\u09BC/g, '\u09DC').replace(/\u09A2\u09BC/g, '\u09DD');
    },

    async produce(text, opt) {
      text = this.composeNukta(text);
      const o = Object.assign({ format: 'doc' }, opt || {});
      if (this.FORMATS.indexOf(o.format) === -1) throw new Error('অজানা ফরম্যাট: ' + o.format);
      const steps = [];

      // ১) মাস্টার .docx — Part-17.5: হুবহু-লেআউট মোড নিজের মাস্টার দেয় (opt.masterDocx); না দিলে টেমপ্লেট-পথ
      let master;
      if (o.masterDocx) {
        master = o.masterDocx;
        steps.push('master-docx:faithful');
      } else {
        const Pipeline = pick('FayzarPipeline');
        if (!Pipeline || typeof Pipeline.exportDocx !== 'function') throw new Error('FayzarPipeline লোড হয়নি');
        const pipeOpts = Object.assign({}, o, { font: 'Kalpurush' });
        delete pipeOpts.format; delete pipeOpts.figures;
        const res = await Pipeline.exportDocx(text, pipeOpts);
        master = res && res.content;
        if (!master) throw new Error('মাস্টার .docx তৈরি হয়নি');
        steps.push('master-docx');
      }

      // ২) চিত্র (সোর্স থেকে কাটা বা স্টুডিওর) — একটাই স্টোর
      const nFig = countFigures(o.figures);
      if (nFig) {
        const Fig = pick('StudioFigurePipeline');
        if (!Fig || typeof Fig.injectIntoDocx !== 'function') throw new Error('চিত্র-ইঞ্জিন (StudioFigurePipeline) লোড হয়নি');
        // ArrayBuffer — ব্রাউজার ও Node দুই জায়গাতেই JSZip পড়তে পারে
        const masterBuf = typeof master.arrayBuffer === 'function' ? await master.arrayBuffer() : master;
        master = await Fig.injectIntoDocx(masterBuf, o.figures, { type: 'blob' });
        steps.push('figures:' + nFig);
      }
      if (o.format === 'docx-unicode') return { blob: master, format: o.format, steps, figures: nFig, mhtmlImages: false };

      // ৩) বিজয় .docx
      const Handler = pick('DocxHandler');
      if (!Handler || typeof Handler.convertDocx !== 'function') throw new Error('DocxHandler লোড হয়নি');
      const bj = await Handler.convertDocx(master, { direction: 'u2b', targetFont: 'SutonnyMJ' });
      const bijoy = bj && (bj.convertedBlob || bj.blob);
      if (!bijoy) throw new Error('বিজয় .docx তৈরি হয়নি');
      steps.push('bijoy-docx');
      if (o.format === 'docx-bijoy') return { blob: bijoy, format: o.format, steps, figures: nFig, mhtmlImages: false };

      // ৪) Word 2003 .doc
      const Conv = pick('DocxToDocConverter');
      if (!Conv) throw new Error('DocxToDocConverter লোড হয়নি');
      const dr = await new Conv().convertDocxToDoc(bijoy, {
        pageSize: o.pageSize || 'a4', margin: o.margin || 'normal', preserveSutonny: true, optimizeForQuestionPaper: true,
        honorCellMargins: !!o.masterDocx   // Part-17.7: হুবহু-মোডের মাস্টার — ঘর-মার্জিন মূলের মতো
      });
      let doc = dr && (dr.blob || dr.convertedBlob);
      if (!doc) throw new Error('Word 2003 .doc তৈরি হয়নি');
      steps.push('doc');

      // ৫) ছবি থাকলে MHTML প্যাকেজ (Word 2003 data: URI দেখায় না)
      let mhtml = false;
      const Mh = pick('FayzarDocMhtml');
      if (Mh && typeof Mh.packBlob === 'function') {
        const packed = await Mh.packBlob(doc);
        mhtml = packed !== doc;
        doc = packed;
        if (mhtml) steps.push('mhtml-images');
      }
      return { blob: doc, format: o.format, steps, figures: nFig, mhtmlImages: mhtml };
    }
  };

  global.FayzarExport = FayzarExport;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarExport;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
