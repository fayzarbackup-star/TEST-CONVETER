'use strict';

// Part-17.2 gates — হুবহু-লেআউট মোড, ধাপ ১ (ক্যাপচার): প্রম্পট, সহনশীল ট্যাগ-পার্সার, চালিয়ে-যাওয়া (RECITATION/সীমা)।
// চালানো: node tests/part-17.2-faithful-capture.test.js

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const P = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-prompt.js'));
const L = require(path.join(ROOT, 'js/layout-engine/faithful/layout-tags.js'));
globalThis.FayzarFaithfulPrompt = P; globalThis.FayzarLayoutTags = L;
const C = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-capture.js'));

let gates = 0;
const check = (cond, msg) => { assert.ok(cond, msg); gates++; };

(async () => {
  // ---- ১) প্রম্পট ----
  const pr = P.build({ pageCount: 3 });
  check(/MANDATORY INTERNAL TWO-PHASE SELF-RECHECK/.test(pr) && /PHASE 1/.test(pr) && /PHASE 2/.test(pr), 'rule 18 (two-phase self-recheck) present');
  check(/এআই অডিট নোট ও পরিবর্তনসমূহ/.test(pr), 'audit-note marker present');
  check(/ANSWERS/.test(pr) && /board\/school references/.test(pr), 'as-is: answers and references are kept, not removed');
  check(!/omit|Omitting board/i.test(pr) && !/NO answer/i.test(pr), 'no question-paper removal rules');
  check(/\*\*double asterisks\*\*/.test(pr) && /SIMPLE ARITHMETIC/.test(pr) && /Bengali digits stay Bengali/.test(pr), 'partial bold markup + plain arithmetic with original digits');
  check(/\[\[B:t=<type>;p=<page>;box=/.test(pr) && /3 page images/.test(pr), 'block-tag format + page count');
  const cont = P.continuation({ pageCount: 3, lastPage: 2, lastType: 'paragraph', lastText: 'শেষ লাইন' });
  check(/CONTINUATION REQUEST/.test(cont) && /page 2/.test(cont) && /শেষ লাইন/.test(cont), 'continuation prompt carries last page and tail text');

  // ---- ২) পার্সার — ধাপ ০-এ দেখা আসল ভিন্নতা ----
  const real = [
    '[[B:other;box=71,107,191,215;al=l]]', '(4)', '',
    '[[B:heading;box=85,229,151,831;al=c]]', 'পরীক্ষায় কমন পেতে আরও প্রশ্নোত্তর', '',
    '[[B:t=question;box=[35,116,84,834];al=l]]', '7. Put the following parts', 'numbers of the sentences need to be written.', '',
    '[[B:t=paragraph;p=২;box=২০৮,১০৮,৫০৮,৯৮৮;al=j;fs=m;b=0]]', 'লাইন এক', 'লাইন দুই', '',
    '[[B:t=figure;p=$2$;box=$500,100,700,400$]]', '',
    '[[B:t=image;p=2;box=900,50,800,40]]',
    '[[B:t=table;p=2;box=600,100,700,900;al=c]]', 'ক | খ | গ', '১ | ২ | ৩', '',
    '[এআই অডিট নোট ও পরিবর্তনসমূহ: মূল ফাইলের সাথে সম্পূর্ণ যাচাইকৃত; কোনো অনুমান বা সংশোধন করা হয়নি।]'
  ].join('\n');
  const pp = L.parse(real);
  check(pp.blocks.length === 7, 'all 7 blocks parsed → ' + pp.blocks.length);
  check(pp.blocks[0].type === 'other' && pp.blocks[1].type === 'heading' && pp.blocks[1].align === 'c', 'type without "t=" understood');
  check(pp.blocks[2].box.join() === '35,116,84,834' && pp.blocks[2].lines.length === 2, 'bracketed box + printed line breaks kept');
  check(pp.blocks[3].page === 2 && pp.blocks[3].box.join() === '208,108,508,988' && pp.blocks[3].fs === 'm' && pp.blocks[3].bold === false, 'Bangla digits, page, fs, bold');
  check(pp.blocks[4].type === 'figure' && pp.blocks[4].page === 2 && pp.blocks[4].box.join() === '500,100,700,400', '$-wrapped values understood');
  check(pp.blocks[5].type === 'figure' && pp.blocks[5].box.join() === '800,40,900,50', 'synonym image→figure, inverted min/max normalized');
  check(pp.blocks[6].type === 'table' && pp.blocks[6].lines[1] === '১ | ২ | ৩', 'table rows kept');
  check(pp.blocks[0].page === 1 && pp.blocks[2].page === 1, 'page defaults to 1 before first explicit page');
  check(/সম্পূর্ণ যাচাইকৃত/.test(pp.auditNote) && !pp.blocks.some((b) => /অডিট/.test(b.text)), 'audit note separated from blocks');
  check(!L.needsContinuation(real), 'complete answer needs no continuation');

  const withMarkers = '===== পৃষ্ঠা ১/২ =====\n[[B:t=paragraph;box=1,1,50,50]]\nক\n===== পৃষ্ঠা ২/২ =====\n[[B:t=paragraph;box=1,1,50,50]]\nখ';
  const pm = L.parse(withMarkers);
  check(pm.blocks[0].page === 1 && pm.blocks[1].page === 2 && !/পৃষ্ঠা/.test(pm.blocks[1].text), 'page markers set page and are removed from text');
  check(L.parse('কোনো ট্যাগ নেই').issues.some((i) => i.kind === 'no_tags'), 'untagged answer flagged');

  // ---- ৩) কাটা পড়া + জোড়া ----
  const cut = '[[B:t=paragraph;p=1;box=1,1,100,900]]\nপ্রথম অনুচ্ছেদ।\n\n[[B:t=paragraph;p=2;box=1,1,100,900]]\nদ্বিতীয় অনুচ্ছেদের অর্ধে\n\n[অসম্পূর্ণ: RECITATION — Gemini লেখা মাঝপথে থামিয়েছে]';
  check(L.needsContinuation(cut), 'RECITATION-marked answer needs continuation');
  check(L.needsContinuation('[[B:t=paragraph;box=1,1,2,2]]\nক'), 'answer without audit note needs continuation');
  const info = L.lastBlockInfo(cut);
  check(info.lastPage === 2 && info.lastType === 'paragraph' && /অর্ধে$/.test(info.lastText.trim()), 'last block info (page, type, tail) without the marker');
  const contText = '[[B:t=paragraph;p=2;box=1,1,100,900]]\nদ্বিতীয় অনুচ্ছেদের অর্ধেক নয়, পুরোটা।\n\n[[B:t=footer;p=2;box=950,400,980,600;al=c]]\nপাতা ২\n\n[এআই অডিট নোট ও পরিবর্তনসমূহ: মূল ফাইলের সাথে সম্পূর্ণ যাচাইকৃত; কোনো অনুমান বা সংশোধন করা হয়নি।]';
  const merged = L.mergeContinuation(cut, contText);
  const mp = L.parse(merged);
  check(mp.blocks.length === 3 && /পুরোটা/.test(mp.blocks[1].text) && !/অর্ধে$/.test(mp.blocks[1].text), 'cut half-block replaced by its complete re-write');
  check(!/অসম্পূর্ণ/.test(merged) && !L.needsContinuation(merged) && mp.auditNote, 'merged answer complete, marker gone');
  const merged2 = L.mergeContinuation('[[B:t=paragraph;p=1;box=1,1,2,2]]\nক।', 'ভূমিকা কথা\n[[B:t=heading;p=2;box=1,1,2,2]]\nনতুন');
  check(L.parse(merged2).blocks.length === 2 && !/ভূমিকা/.test(merged2), 'continuation preamble dropped, previous complete block kept');

  // ---- ৪) ক্যাপচার-চালক (নকল অনুরোধ) ----
  const queue = [{ base64: 'AAA', mimeType: 'image/jpeg', pdfPage: 1, pageWidthPt: 595, pageHeightPt: 842 }, { base64: 'BBB', mimeType: 'image/jpeg', pdfPage: 2, pageWidthPt: 595, pageHeightPt: 842 }];
  const prompts = [];
  const answers = [cut, contText];
  const res = await C.run(queue, { request: async (key, media, onS, prompt) => { prompts.push({ n: media.length, prompt }); return answers.shift(); } });
  check(prompts.length === 2 && prompts[0].n === 2 && prompts[1].n === 2, 'all pages sent together, continuation re-sends the same pages');
  check(/CONTINUATION REQUEST/.test(prompts[1].prompt) && !/CONTINUATION/.test(prompts[0].prompt), 'second request is a continuation');
  check(res.continuations === 1 && res.blocks.length === 3 && res.pages[1].widthPt === 595 && !res.issues.some((i) => i.kind === 'still_incomplete'), 'capture result complete with page sizes');
  const res2 = await C.run(queue, { maxContinuations: 2, request: async () => cut });
  check(res2.continuations === 2 && res2.issues.some((i) => i.kind === 'still_incomplete'), 'gives up after max continuations and flags still_incomplete');

  let threw = null;
  try { await C.run(queue, { request: async () => '' }); } catch (e) { threw = e.message; }
  check(/খালি/.test(threw || ''), 'empty Gemini answer → clear error, not silent zero blocks');
  // আসল ইঞ্জিন-পথ: state.isProcessing চলাকালীন true, শেষে আগের মান
  const seen = [];
  globalThis.FayzarAiOcrEngine = { state: { isProcessing: false }, executeGeminiRequest: async () => { seen.push(globalThis.FayzarAiOcrEngine.state.isProcessing); return contText; } };
  const r3 = await C.run(queue, {});
  check(seen[0] === true && globalThis.FayzarAiOcrEngine.state.isProcessing === false && r3.blocks.length === 2, 'engine path: isProcessing true during request, restored after');
  delete globalThis.FayzarAiOcrEngine;

  // ---- ৫) ওয়্যারিং ----
  const ocr = fs.readFileSync(path.join(ROOT, 'js/ai-ocr-engine.js'), 'utf8');
  check(/proxyStopReason = fr/.test(ocr) && /\[অসম্পূর্ণ: ' \+ proxyStopReason/.test(ocr), 'RECITATION/SAFETY now flagged as incomplete in proxy path');
  for (const f of ['index.html', 'converter.html']) {
    const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
    check(h.includes('faithful/faithful-prompt.js') && h.includes('faithful/layout-tags.js') && h.includes('faithful/faithful-capture.js'), f + ' loads faithful modules');
  }

  console.log(`Part-17.2 faithful-capture: ${gates} passed`);
})().catch((e) => { console.error(e); process.exit(1); });
