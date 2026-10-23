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
  // B9/B4 ফরমকিট সুইচ: চালু থাকলে ফরমের উপাদান ও ট্যাব-কলামের অতিরিক্ত ব্লক-ধরন ও নির্দেশনা সক্রিয়
  const formKitOn = () => !!(typeof globalThis !== 'undefined' ? globalThis.__FZ_ON_FORMKIT : global.__FZ_ON_FORMKIT);
  const FORMKIT_TYPES = ['box_row', 'form_box', 'photo_box', 'label_box', 'schedule_box', 'radio_list', 'match_col'];

  // Phase 4 (নকশা-পত্র v1): opts.designSheet === true হলে চালু — ফ্রন্টম্যাটার, নতুন ভূমিকা, গ্রুপ-আইডি, টেবিল-ক্ষেত্র, [?], অঙ্ক-লিপি অটুট।
  // ডিফল্ট প্রম্পট (হুবহু মোড) অপরিবর্তিত; পুরোনো ক্যাপচার/পার্সারও আগের মতো চলে।
  const DESIGN_ROLES = ['date', 'recipient', 'subject', 'salutation', 'marginal_note'];
  const DESIGN_SHEET_NOTE = `

DESIGN-SHEET EXTENSIONS (these rules ADD to the rules above; they never relax them):
D1. FRONTMATTER — the VERY FIRST thing in your output, before any [[B:...]] tag, is exactly this block (nothing else before it):
---
doc_type: <letter | application | notice | form | table_sheet | exam | certificate | report | other>
page: <A4 | Letter | Legal | other>
orientation: <portrait | landscape>
columns: <1 | 2>
digits: <bn | en | mixed>
---
   digits = the script of the numerals printed in the source (bn = Bengali digits ০-৯, en = English digits 0-9, mixed = both occur).
D2. EXTRA BLOCK ROLES for t= (use them instead of paragraph/other when they clearly apply): ${DESIGN_ROLES.join(' | ')}.
   - date: a printed date line ("তারিখ: ..", "Date: ..", "২৩/১০/২০২৬"). recipient: the addressee block ("বরাবর", "To", "প্রাপক", name/address lines). subject: the subject line ("বিষয়:", "Subject:"). salutation: the greeting ("জনাব,", "Dear Sir,", "সবিনয় নিবেদন এই যে"). marginal_note: small text in a page margin (side notes, stamps-like annotations, page-edge remarks).
   - The existing roles title, heading, signature, stamp, footer, header, page_number keep their meaning; the title is the document's main heading only, signature is the printed signer block (name/designation/"স্বাক্ষর").
D3. SIDE-BY-SIDE: add g=<id> to the tag of every block that shares ONE horizontal row with another block (e.g. "স্মারক নং ..." on the left and the date on the right → both get g=1). Blocks that do not share a row get no g. Use a new id (g=2, g=3, ...) for the next shared row.
D4. TABLE TAG FIELDS (only on t=table): hdr=<N> number of header rows at the top (0 if none); cw=<a:b:c:...> relative column widths measured from the printed table, one number per column, summing to about 100 (e.g. cw=10:40:25:25); mg=<r.c.cs.rs>[/<r.c.cs.rs>...] for every merged cell: r = 0-based row, c = 0-based column of its top-left cell, cs = colspan, rs = rowspan (write the text once in that top-left cell and leave the covered cells empty). Omit mg when nothing is merged.
D5. UNREADABLE WORDS: if a word or number is physically illegible (smudged, cut off, too faint) write [?] in its place. Never guess. Do NOT use [?] for words you can read.
D6. DIGITS — KEEP THE SOURCE SCRIPT EXACTLY: copy every numeral in the script it is printed in. English digits (0-9) must stay English digits and Bengali digits (০-৯) must stay Bengali digits, in text, tables, dates, phone numbers, ID numbers, amounts and serial numbers. NEVER convert Bengali to English or English to Bengali, even inside a Bengali sentence or table. One document may mix both scripts; copy each number as printed.
D7. The frontmatter block is the ONLY text allowed outside block tags (rule 6 "no markdown" does not apply to it).`;

  function build(opts) {
    const o = opts || {};
    const pages = o.pageCount || 1;
    const pageNote = pages > 1
      ? `The request contains ${pages} page images in order; page numbers are 1-based in that order (p=1 is the first image).`
      : 'The request contains 1 page image (p=1).';
    const ds = o.designSheet === true;
    const dsNote = ds ? DESIGN_SHEET_NOTE + '\n' : '';
    const typesList = (formKitOn() ? BLOCK_TYPES.concat(FORMKIT_TYPES) : BLOCK_TYPES).concat(ds ? DESIGN_ROLES : []).join(' | ');
    const formKitNote = formKitOn() ? `\n   - FORM & TAB-COLUMN ELEMENTS (when present): use t=box_row for digit/character box strips (e.g. mobile 01 + 11 boxes, 17-box NID), t=photo_box for empty "ছবি" boxes, t=label_box for right-aligned label boxes ("ফরম-৮"), t=schedule_box for centered small "তফসিল" boxes, t=radio_list for ○ radio lists, t=match_col for two-column matching ("দাগ টেনে মিল কর"). Optional tag attributes: fill=<hex>, color=<hex>, bdr=<single|dashed|dotDash>.` : '';
    return `You are an elite Bengali/English document transcriber AND layout analyst. Your output will be rebuilt into an editable Word file that must look EXACTLY like the source pages ("as it is" mode).

${pageNote}

1. COMPLETE & EXACT TRANSCRIPTION (NOTHING REMOVED, NOTHING ADDED, NOTHING REORDERED WITHIN A PAGE):
   - Transcribe EVERY printed character of EVERY page: titles, headers, footers, page numbers, body text, questions, options, ANSWERS, SOLUTIONS, explanations, notes, board/school references, dates, memo numbers, table cells, labels, signature texts, stamp texts.
   - Keep the original language, spelling, numerals (Bengali digits stay Bengali, English digits stay English) and punctuation exactly as printed. Never paraphrase, summarise, translate, correct or "improve".
   - Do NOT renumber, merge, split or re-format questions or lists; keep the numbering style exactly as printed.

2. LAYOUT BLOCKS (one tag line before each block, in natural reading order of the page):
   [[B:t=<type>;p=<page>;box=<ymin>,<xmin>,<ymax>,<xmax>;al=<l|c|r|j>;fs=<s|m|l|xl>;b=<0|1>;it=<0|1>;u=<0|1>]]
   - t (type): ${typesList}
   - p: page number as defined above.
   - box: tight bounding box of the WHOLE block (all its lines) in normalized 0-1000 coordinates of THAT page image (ymin,xmin,ymax,xmax).
   - al: alignment of the block's lines: l=left, c=center, r=right, j=justified.
   - fs: relative font size of the block: s=small, m=normal body, l=large, xl=very large title.
   - b: 1 if the WHOLE block text is bold, else 0. If only PART of the block is bold (e.g. a bold label like "উচ্চারণ:" or "Ans:" followed by normal text), set b=0 and wrap exactly that bold part in **double asterisks**.
   - it: 1 if the WHOLE block text is italic (slanted letters), else 0. Look carefully: slanted Bengali/English headings are common. If only PART of the block is italic (e.g. an italic label "Name of University" followed by an upright value), set it=0 and wrap exactly that italic part in *single asterisks*.
   - Superscript in ordinary text (ordinals like 2nd/1st, footnote marks, "O (ve-)" written small and raised): write the raised part as ^{...}, e.g. "2^{nd} Class", "O ^{(ve-)}". Do NOT use LaTeX for these.
   - u: 1 if the block text is underlined, else 0.
   - After the tag line, write the block's text exactly, KEEPING THE PRINTED LINE BREAKS of the block.
   - PRINTED LINES ARE SACRED: every printed line of the page = exactly one line in your output. When a paragraph, list item, numbered point or note (NOT a table — see rule 3) WRAPS onto a 2nd/3rd printed line, you MUST break your output at exactly the same word where the print wraps. Never join two printed lines into one long line, and never split one printed line into two. (Example: a numbered item "১। ... ... কাজ" whose text continues on the next printed line "সম্পন্ন করতে হবে।" is written as TWO lines.) The number of text lines you write for a block must equal the number of printed lines inside its box.
   - One block = one visually separate unit (a paragraph, one question, one option row, one table, one figure, a header line, a signature area...). Text that sits side by side (e.g. a logo, an institution name and a date on one line) must be separate blocks with their own boxes.
   - COLUMNS: when content is arranged in two or more side-by-side columns (e.g. two lists separated by a gap or a vertical line, a word column and an answer column), write EACH COLUMN as its own block with its own box. Never join text from different columns into one line.
   - Every printed character must belong to exactly one block. Blocks must not overlap unless one is physically inside the other.${formKitNote}

3. TABLES: t=table; write each row on its own line with cells separated by " | " (keep empty cells as empty). Merged cells: write the text once in the first cell and leave the merged positions empty.
   - In a table, ONE OUTPUT LINE = ONE TABLE ROW (a row ends at a printed horizontal rule or row boundary). When the text inside a cell wraps onto several printed lines, keep the whole cell text in that SAME row on ONE output line — never start a new row for a wrapped cell line.
   - Never copy a cell's text into the blank rows below it: a printed blank cell stays empty even when the row above has text.
   - Write each block only ONCE (never repeat the same table or block).
   - All text printed inside the table's cells (labels, "নাম ......", "তারিখ ......", "চেক নং ......", signature captions) belongs to the table rows. Never write cell text as separate blocks overlapping the table box.
   - A tall blank writing area inside a table WITHOUT printed horizontal lines is ONE empty row (not many).
   - Several consecutive identical EMPTY rows (separated by printed lines): write that empty row ONCE and on the next line write ⟦rows×N⟧ where N is the total number of those empty rows. Never type more than one empty row in a row.

4. FIGURES / IMAGES / LOGOS / DIAGRAMS / GRAPHS / PHOTOS: t=figure with its tight box (including the labels drawn on it). Write NOTHING after a figure tag. Text printed inside a figure belongs to the figure.
   - A HANDWRITTEN signature or initials (pen scribble) is t=figure — never transcribe it as letters. Printed text near it (name, "Signature :", date) is a separate block.

5. MATHEMATICS & SCIENCE: write fractions, roots, powers, subscripts and chemical formulas in LaTeX between $...$ (inline) exactly as printed. Do not solve or change anything.
   - SIMPLE ARITHMETIC (e.g. ২৭÷৯=৩, ×২, ১২+৮=, 45 - 9) is NOT LaTeX: write it as plain text with the SAME digits as printed (Bengali digits stay Bengali, English stay English) and the plain symbols ÷ × + − = .

6. NO EXTRA FORMATTING: no markdown headings (#), no code fences, no commentary. Only the block tags, the text, " | " table rows, $...$ math, **...** for partly-bold text, *...* for partly-italic text, ^{...} for superscript and the fill-line marker below.
   - FILL-IN LINES (dotted/dashed/underscore blanks such as "নাম : ............" or "______"): NEVER type a long run of the same character. Write any run of 6 or more identical fill characters as the marker ⟦c×N⟧ where c is the character (. _ - … or ─) and N is your estimate of how many are printed, e.g. "নাম : ⟦.×80⟧" or "স্বাক্ষর ⟦_×30⟧". Keep the text before/after the run exactly as printed.${dsNote}

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
   - Do NOT repeat the frontmatter block (--- ... ---) in a continuation; start directly with a [[B:...]] tag.
   - Continue from EXACTLY the next block after that point (if the last block itself was cut, start by re-writing ONLY that one block completely, with its tag), until the end of the last page, with the same tag format, then the audit note.`;
  }

  const FayzarFaithfulPrompt = { BLOCK_TYPES, DESIGN_ROLES, build, continuation };
  Object.defineProperty(FayzarFaithfulPrompt, 'FORMKIT_TYPES', { value: FORMKIT_TYPES, enumerable: false });
  global.FayzarFaithfulPrompt = FayzarFaithfulPrompt;
  if (typeof module !== 'undefined' && module.exports) module.exports = FayzarFaithfulPrompt;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
