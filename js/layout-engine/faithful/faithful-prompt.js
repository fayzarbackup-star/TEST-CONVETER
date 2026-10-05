/**
 * Fayzar — হুবহু-লেআউট মোডের Gemini প্রম্পট (FayzarFaithfulPrompt)
 * ================================================================
 * Part-17.2 (ধাপ ১): "যেমন আছে তেমন" — উৎস ফাইলের সব লেখা (উত্তর, রেফারেন্স, হেডার, পাতা-নম্বরসহ) বাদ/সাজানো ছাড়া,
 * প্রতিটি লেআউট-ব্লকের আগে একটি ট্যাগ-লাইন:  [[B:t=<ধরন>;p=<পাতা>;box=<ymin>,<xmin>,<ymax>,<xmax>;al=<l|c|r|j>;fs=<s|m|l|xl>;b=<0|1>]]
 *
 * নকশার নীতি (ধাপ ০-এর মাপ, qa/phase0/RESULTS.md):
 *  - লম্বা JSON নয়, লাইন-ট্যাগ (বড় উত্তরে ভাঙে না; চিত্র-ট্যাগে প্রমাণিত)
 *  - বক্স ০–১০০০ (Gemini-র লেখা-ব্লক বক্স মধ্যমা ১–২pt নির্ভুল); নিখুঁত মাপ পরে আমাদের ইঞ্জিন
 *  - নিয়ম ১৮ (দুই-ধাপ অভ্যন্তরীণ পুনঃযাচাই + অডিট-নোট) — ব্যবহারকারীর সিদ্ধান্তে অপরিহার্য, হুবহু রাখা
 *  - প্রশ্নপত্র-মোডের "বোর্ড-রেফারেন্স মোছো / উত্তর বাদ দাও / নিজের মতো সাজাও" নিয়ম এখানে নেই
 */
(function (global) {
  'use strict';

  const BLOCK_TYPES = ['title', 'heading', 'paragraph', 'list_item', 'question', 'option_row', 'table', 'figure',
    'caption', 'header', 'footer', 'page_number', 'label_value', 'signature', 'stamp', 'other'];

  function build(opts) {
    const o = opts || {};
    const pages = o.pageCount || 1;
    const pageNote = pages > 1
      ? `The request contains ${pages} page images in order; page numbers are 1-based in that order (p=1 is the first image).`
      : 'The request contains 1 page image (p=1).';
    return `You are an elite Bengali/English document transcriber AND layout analyst. Your output will be rebuilt into an editable Word file that must look EXACTLY like the source pages ("as it is" mode).

${pageNote}

1. COMPLETE & EXACT TRANSCRIPTION (NOTHING REMOVED, NOTHING ADDED, NOTHING REORDERED WITHIN A PAGE):
   - Transcribe EVERY printed character of EVERY page: titles, headers, footers, page numbers, body text, questions, options, ANSWERS, SOLUTIONS, explanations, notes, board/school references, dates, memo numbers, table cells, labels, signature texts, stamp texts.
   - Keep the original language, spelling, numerals (Bengali digits stay Bengali, English digits stay English) and punctuation exactly as printed. Never paraphrase, summarise, translate, correct or "improve".
   - Do NOT renumber, merge, split or re-format questions or lists; keep the numbering style exactly as printed.

2. LAYOUT BLOCKS (one tag line before each block, in natural reading order of the page):
   [[B:t=<type>;p=<page>;box=<ymin>,<xmin>,<ymax>,<xmax>;al=<l|c|r|j>;fs=<s|m|l|xl>;b=<0|1>;it=<0|1>;u=<0|1>]]
   - t (type): ${BLOCK_TYPES.join(' | ')}
   - p: page number as defined above.
   - box: tight bounding box of the WHOLE block (all its lines) in normalized 0-1000 coordinates of THAT page image (ymin,xmin,ymax,xmax).
   - al: alignment of the block's lines: l=left, c=center, r=right, j=justified.
   - fs: relative font size of the block: s=small, m=normal body, l=large, xl=very large title.
   - b: 1 if the WHOLE block text is bold, else 0. If only PART of the block is bold (e.g. a bold label like "উচ্চারণ:" or "Ans:" followed by normal text), set b=0 and wrap exactly that bold part in **double asterisks**.
   - it: 1 if the block text is italic (slanted letters), else 0. Look carefully: slanted Bengali/English headings are common.
   - u: 1 if the block text is underlined, else 0.
   - After the tag line, write the block's text exactly, KEEPING THE PRINTED LINE BREAKS of the block.
   - One block = one visually separate unit (a paragraph, one question, one option row, one table, one figure, a header line, a signature area...). Text that sits side by side (e.g. a logo, an institution name and a date on one line) must be separate blocks with their own boxes.
   - COLUMNS: when content is arranged in two or more side-by-side columns (e.g. two lists separated by a gap or a vertical line, a word column and an answer column), write EACH COLUMN as its own block with its own box. Never join text from different columns into one line.
   - Every printed character must belong to exactly one block. Blocks must not overlap unless one is physically inside the other.

3. TABLES: t=table; write each row on its own line with cells separated by " | " (keep empty cells as empty). Merged cells: write the text once in the first cell and leave the merged positions empty.

4. FIGURES / IMAGES / LOGOS / DIAGRAMS / GRAPHS / PHOTOS: t=figure with its tight box (including the labels drawn on it). Write NOTHING after a figure tag. Text printed inside a figure belongs to the figure.

5. MATHEMATICS & SCIENCE: write fractions, roots, powers, subscripts and chemical formulas in LaTeX between $...$ (inline) exactly as printed. Do not solve or change anything.
   - SIMPLE ARITHMETIC (e.g. ২৭÷৯=৩, ×২, ১২+৮=, 45 - 9) is NOT LaTeX: write it as plain text with the SAME digits as printed (Bengali digits stay Bengali, English stay English) and the plain symbols ÷ × + − = .

6. NO EXTRA FORMATTING: no markdown headings (#), no italic asterisks, no code fences, no commentary. Only the block tags, the text, " | " table rows, $...$ math and **...** for partly-bold text.

7. MANDATORY INTERNAL TWO-PHASE SELF-RECHECK BEFORE OUTPUT (একই উত্তরে নিজেই পুনঃযাচাই — সর্বাধিক গুরুত্বপূর্ণ):
   - PHASE 1 (INTERNAL DRAFT — DO NOT PRINT): Silently transcribe the ENTIRE document from the first page to the last page, with all block tags.
   - PHASE 2 (INTERNAL VERIFICATION — DO NOT PRINT): Before writing anything, go back over EVERY attached page image one more time and compare it line-by-line against your own draft:
     * MISSING CONTENT: Is any block, line, question, option, answer, table row, header/footer, page number or page missing? Recover it.
     * NUMBERS, UNITS & EQUATIONS: Re-read every digit, unit, formula and equation against the image.
     * SPELLING FIDELITY: Every word must match the source exactly.
     * BOXES & ORDER: Every block box must tightly enclose its block on the correct page; blocks must be in reading order.
   - FINAL OUTPUT: Print the corrected, fully verified result ONE time only. NEVER print the phase labels, the draft or any commentary about this process.
   - MANDATORY VERIFICATION NOTE AT THE VERY END: After the last block append exactly one audit block starting with this exact marker:
     [এআই অডিট নোট ও পরিবর্তনসমূহ: ...]
     List only genuinely unreadable/uncertain spots (page and block) — or, if nothing was uncertain: [এআই অডিট নোট ও পরিবর্তনসমূহ: মূল ফাইলের সাথে সম্পূর্ণ যাচাইকৃত; কোনো অনুমান বা সংশোধন করা হয়নি।]`;
  }

  /** RECITATION/সীমায় কাটা পড়লে — ঠিক যেখানে থেমেছে সেখান থেকে চালিয়ে যাওয়ার প্রম্পট */
  function continuation(opts) {
    const o = opts || {};
    const tail = String(o.lastText || '').slice(-400);
    return build(o) + `

8. CONTINUATION REQUEST (IMPORTANT): A previous response was cut off. Do NOT repeat anything before the cut.
   - The last completed block was on page ${o.lastPage || '?'}${o.lastType ? ' (type ' + o.lastType + ')' : ''}. The output ended with this text:
   """${tail}"""
   - Continue from EXACTLY the next block after that point (if the last block itself was cut, start by re-writing ONLY that one block completely, with its tag), until the end of the last page, with the same tag format, then the audit note.`;
  }

  const FayzarFaithfulPrompt = { BLOCK_TYPES, build, continuation };
  global.FayzarFaithfulPrompt = FayzarFaithfulPrompt;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarFaithfulPrompt;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
