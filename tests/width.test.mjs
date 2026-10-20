/**
 * WIDTH_v1 — হুবহু-মোডে লাইনের প্রস্থ ও ডান-প্রান্ত (dx1) মূলের সাথে মেলানোর স্বয়ংসম্পূর্ণ Node টেস্ট।
 * চালানোর নিয়ম: node tests/width.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

['WRAPFIT', 'NESTBOX', 'TBLMERGE', 'A03FIX', 'A16FIX', 'VSPACE', 'BOXSPLIT', 'SERIALHANG'].forEach((k) => { globalThis['__FZ_ON_' + k] = true; }); // WIDTH_v2 যে ভিত্তিতে লেখা — প্রোডাকশন-ডিফল্ট বদলালেও স্থির
const IR = require(path.join(ROOT, 'js/layout-engine/faithful/layout-ir.js'));
const LF = require(path.join(ROOT, 'js/layout-engine/faithful/line-fit.js'));
const DB = require(path.join(ROOT, 'js/layout-engine/faithful/faithful-docx-builder.js'));

globalThis.FayzarLayoutIR = IR;
globalThis.FayzarLineFit = LF;
globalThis.FayzarFaithfulDocx = DB;

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`✗ ব্যর্থ: ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function buildFallbackDocData(doc) {
  if (doc === 'a01') {
    const pInfo = {
      1: { widthPt: 612, heightPt: 792, margins: { top: 36, left: 72, right: 72, bottom: 36 }, hrules: [], vrules: [], boxes: [] },
      2: { widthPt: 612, heightPt: 792, margins: { top: 36, left: 72, right: 72, bottom: 36 }, hrules: [], vrules: [], boxes: [] }
    };
    const blocks = [
      { page: 1, type: 'paragraph', fs: 'm', align: 'l', text: 'মরহুম/মরহুমা------------------------------------------------------------------', lines: ['মরহুম/মরহুমা------------------------------------------------------------------'], box: [228, 118, 244, 882] },
      { page: 1, type: 'paragraph', fs: 'm', align: 'l', text: 'সিটি কর্পোরেশন/পৌরসভা/ইউনিয়ন----------------------------------------------------', lines: ['সিটি কর্পোরেশন/পৌরসভা/ইউনিয়ন----------------------------------------------------'], box: [255, 118, 270, 882] },
      { page: 1, type: 'paragraph', fs: 'm', align: 'l', text: 'ওয়ার্ড নং------------------------------------------------------------------------', lines: ['ওয়ার্ড নং------------------------------------------------------------------------'], box: [280, 118, 295, 882] },
      { page: 1, type: 'paragraph', fs: 'm', align: 'l', text: 'পোস্ট অফিস----------------------------------উপজেলা----------------------------------', lines: ['পোস্ট অফিস----------------------------------উপজেলা----------------------------------'], box: [387, 118, 402, 592] },
      { page: 1, type: 'paragraph', fs: 'm', align: 'l', text: 'বৎসর যাবৎ চিনি। তিনি বিগত------------------------ তারিখে মৃত্যুবরণ করিয়াছেন। মৃত্যুকালে তিনি আমাদের পরিবারের', lines: ['বৎসর যাবৎ চিনি। তিনি বিগত------------------------ তারিখে মৃত্যুবরণ করিয়াছেন। মৃত্যুকালে তিনি আমাদের পরিবারের'], box: [440, 118, 455, 882] },
      { page: 1, type: 'paragraph', fs: 'm', align: 'l', text: 'নিম্নবর্ণিত সদস্য রাখিয়া গিয়াছেন:-', lines: ['নিম্নবর্ণিত সদস্য রাখিয়া গিয়াছেন:-'], box: [467, 118, 482, 410] },
      { page: 1, type: 'paragraph', fs: 'm', align: 'l', text: 'এই অনুচ্ছেদটি পাতার প্রধান বারো পয়েন্ট ফন্ট নির্ধারণের জন্য ব্যবহৃত একটি পূর্ণাঙ্গ বাক্য।', lines: ['এই অনুচ্ছেদটি পাতার প্রধান বারো পয়েন্ট ফন্ট নির্ধারণের জন্য ব্যবহৃত একটি পূর্ণাঙ্গ বাক্য।'], box: [500, 118, 515, 882] },
      { page: 2, type: 'paragraph', fs: 'm', align: 'j', text: 'আমি আরও প্রত্যয়ন করিতেছি যে, ------------------------ নং ক্রমিকে উল্লিখিত ব্যক্তি মরহুমের\nপ্রতিবন্ধী সন্তান। তাহার প্রতিবন্ধিতার সমর্থনে সমাজসেবা অধিদপ্তরের সনদপত্র\nসংযোজন করা হইল।', lines: ['আমি আরও প্রত্যয়ন করিতেছি যে, ------------------------ নং ক্রমিকে উল্লিখিত ব্যক্তি মরহুমের', 'প্রতিবন্ধী সন্তান। তাহার প্রতিবন্ধিতার সমর্থনে সমাজসেবা অধিদপ্তরের সনদপত্র', 'সংযোজন করা হইল।'], box: [153, 118, 200, 882] },
      { page: 2, type: 'paragraph', fs: 'm', align: 'l', text: 'জীবিত স্ত্রী/স্ত্রীগণ/স্বামীবেগম/জনাব------------------------------------ পুনর্বিবাহ করেন নাই বা কোন', lines: ['জীবিত স্ত্রী/স্ত্রীগণ/স্বামীবেগম/জনাব------------------------------------ পুনর্বিবাহ করেন নাই বা কোন'], box: [268, 118, 283, 882] },
      { page: 2, type: 'signature', fs: 'm', align: 'c', text: 'তারিখসহ স্বাক্ষর', lines: ['তারিখসহ স্বাক্ষর'], box: [391, 580, 408, 780] }
    ];
    const measures = [
      { rectPt: { x: 72, y: 181, w: 445.4, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'l', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 72, y: 181, w: 445.4, h: 12 }] },
      { rectPt: { x: 72, y: 202, w: 445.4, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'l', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 72, y: 202, w: 445.4, h: 12 }] },
      { rectPt: { x: 72, y: 222, w: 445.4, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'l', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 72, y: 222, w: 445.4, h: 12 }] },
      { rectPt: { x: 72, y: 307, w: 289.9, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'l', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 72, y: 307, w: 289.9, h: 12 }] },
      { rectPt: { x: 72, y: 349, w: 468, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'l', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 72, y: 349, w: 468, h: 12 }] },
      { rectPt: { x: 72, y: 370, w: 175, h: 12 }, lineInkPt: 9.2, widthFontPt: 12.1, align: 'l', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 72, y: 370, w: 175, h: 12 }] },
      { rectPt: { x: 72, y: 400, w: 450, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'l', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 72, y: 400, w: 450, h: 12 }] },
      { rectPt: { x: 72.5, y: 121, w: 467, h: 42 }, lineInkPt: 11.4, widthFontPt: 12, align: 'j', firstIndentPt: 36, pitchPt: 14, lines: [{ x: 108.5, y: 121, w: 431, h: 12 }, { x: 72.5, y: 135, w: 467, h: 12 }, { x: 72.5, y: 149, w: 180, h: 12 }] },
      { rectPt: { x: 72, y: 212, w: 468, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'l', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 72, y: 212, w: 468, h: 12 }] },
      { rectPt: { x: 356, y: 310, w: 86, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'c', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 356, y: 310, w: 86, h: 12 }] }
    ];
    const prev = globalThis.__FZ_ON_WIDTH;
    delete globalThis.__FZ_ON_WIDTH;
    blocks.forEach((b, i) => { b.i = i; });
    const ir0 = IR.build({ blocks }, measures, pInfo);
    LF.fit(ir0);
    if (prev) globalThis.__FZ_ON_WIDTH = prev;
    return { capture: { blocks }, measures: { measures, pageInfo: pInfo }, irRaw: JSON.stringify(ir0) };
  }
  if (doc === 'a13') {
    const pInfo = { 1: { widthPt: 595, heightPt: 842, margins: { top: 36, left: 48, right: 46.5, bottom: 36 }, hrules: [], vrules: [], boxes: [] } };
    const blocks = [
      { page: 1, type: 'heading', fs: 'm', align: 'j', text: 'চিফ একাউন্টস্ এন্ড ফিন্যান্স অফিসারের কার্যালয়\nপ্রতিরক্ষা মন্ত্রণালয়', lines: ['চিফ একাউন্টস্ এন্ড ফিন্যান্স অফিসারের কার্যালয়', 'প্রতিরক্ষা মন্ত্রণালয়'], box: [150, 200, 185, 800] },
      { page: 1, type: 'heading', fs: 'm', align: 'c', text: 'গৃহ নির্মাণ ঋণ গ্রহণের উপযোগিতা সনদপত্র', lines: ['গৃহ নির্মাণ ঋণ গ্রহণের উপযোগিতা সনদপত্র'], box: [224, 250, 242, 720] },
      { page: 1, type: 'paragraph', fs: 'm', align: 'j', text: 'এ মর্মে প্রত্যয়ন করা যাচ্ছে যে জনাব ক সরকারি বিধি মোতাবেক গৃহ নির্মাণ ঋণ গ্রহণের জন্য আবেদন করেছেন।\nদ্বিতীয় লাইনের বিস্তারিত তথ্য এখানে সংযোজন করা হলো যেন সম্পূর্ণ প্রস্থ জুড়ে থাকে।\nতৃতীয় লাইনের বিস্তারিত তথ্য এখানে সংযোজন করা হলো যেন সম্পূর্ণ প্রস্থ জুড়ে থাকে।\nচতুর্থ লাইনের বিস্তারিত তথ্য এখানে সংযোজন করা হলো যেন সম্পূর্ণ প্রস্থ জুড়ে থাকে।\nপঞ্চম লাইনের সমাপ্তি।', lines: ['এ মর্মে প্রত্যয়ন করা যাচ্ছে যে জনাব ক সরকারি বিধি মোতাবেক গৃহ নির্মাণ ঋণ গ্রহণের জন্য আবেদন করেছেন।', 'দ্বিতীয় লাইনের বিস্তারিত তথ্য এখানে সংযোজন করা হলো যেন সম্পূর্ণ প্রস্থ জুড়ে থাকে।', 'তৃতীয় লাইনের বিস্তারিত তথ্য এখানে সংযোজন করা হলো যেন সম্পূর্ণ প্রস্থ জুড়ে থাকে।', 'চতুর্থ লাইনের বিস্তারিত তথ্য এখানে সংযোজন করা হলো যেন সম্পূর্ণ প্রস্থ জুড়ে থাকে।', 'পঞ্চম লাইনের সমাপ্তি।'], box: [268, 80, 340, 890] },
      { page: 1, type: 'list_item', fs: 'm', align: 'l', text: '১) আবেদনকারীর নাম :\t......................................................................', lines: ['১) আবেদনকারীর নাম :\t......................................................................'], box: [400, 80, 415, 710] },
      { page: 1, type: 'list_item', fs: 'm', align: 'l', text: '২) পিতার নাম :\t......................................................................', lines: ['২) পিতার নাম :\t......................................................................'], box: [425, 80, 440, 710] },
      { page: 1, type: 'list_item', fs: 'm', align: 'l', text: '৩) মাতার নাম :\t......................................................................', lines: ['৩) মাতার নাম :\t......................................................................'], box: [450, 80, 465, 710] },
      { page: 1, type: 'list_item', fs: 'm', align: 'l', text: '৪) জাতীয় পরিচয় পত্র নম্বর (NID) :\t.................................................................', lines: ['৪) জাতীয় পরিচয় পত্র নম্বর (NID) :\t.................................................................'], box: [478, 80, 493, 710] },
      { page: 1, type: 'list_item', fs: 'm', align: 'l', text: '৫) ব্যাংক হিসাব সংক্রান্ত তথ্য :\t......................................................................', lines: ['৫) ব্যাংক হিসাব সংক্রান্ত তথ্য :\t......................................................................'], box: [504, 80, 519, 710] },
      { page: 1, type: 'signature', fs: 'm', align: 'c', text: 'হিসাবরক্ষণ অফিসারের কার্যালয়', lines: ['হিসাবরক্ষণ অফিসারের কার্যালয়'], box: [815, 580, 835, 880] }
    ];
    const measures = [
      { rectPt: { x: 180, y: 126, w: 235, h: 28 }, lineInkPt: 9.6, widthFontPt: 12, align: 'j', firstIndentPt: -52, pitchPt: 14, lines: [{ x: 180, y: 126, w: 235, h: 12 }, { x: 232, y: 140, w: 110, h: 12 }] },
      { rectPt: { x: 170, y: 189, w: 224, h: 14 }, lineInkPt: 10.5, widthFontPt: 13, align: 'c', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 170, y: 189, w: 224, h: 14 }] },
      { rectPt: { x: 48, y: 226, w: 467.3, h: 70 }, lineInkPt: 9.6, widthFontPt: 12, align: 'j', firstIndentPt: 36, pitchPt: 14, lines: [{ x: 84, y: 226, w: 431.3, h: 12 }, { x: 48, y: 240, w: 467.3, h: 12 }, { x: 48, y: 254, w: 467.3, h: 12 }, { x: 48, y: 268, w: 467.3, h: 12 }, { x: 48, y: 282, w: 160, h: 12 }] },
      { rectPt: { x: 48, y: 340, w: 373.9, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'l', firstIndentPt: 0, pitchPt: 0, lineSegs: [[{ x: 48, w: 120 }, { x: 215, w: 206.9 }]], lines: [{ x: 48, y: 340, w: 373.9, h: 12 }] },
      { rectPt: { x: 48, y: 360, w: 373.9, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'l', firstIndentPt: 0, pitchPt: 0, lineSegs: [[{ x: 48, w: 100 }, { x: 215, w: 206.9 }]], lines: [{ x: 48, y: 360, w: 373.9, h: 12 }] },
      { rectPt: { x: 48, y: 380, w: 373.9, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'l', firstIndentPt: 0, pitchPt: 0, lineSegs: [[{ x: 48, w: 100 }, { x: 215, w: 206.9 }]], lines: [{ x: 48, y: 380, w: 373.9, h: 12 }] },
      { rectPt: { x: 48, y: 403, w: 381.2, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'l', firstIndentPt: 0, pitchPt: 0, lineSegs: [[{ x: 48, w: 162 }, { x: 215, w: 214.2 }]], lines: [{ x: 48, y: 403, w: 381.2, h: 12 }] },
      { rectPt: { x: 48, y: 425, w: 373.9, h: 12 }, lineInkPt: 9.6, widthFontPt: 12, align: 'l', firstIndentPt: 0, pitchPt: 0, lineSegs: [[{ x: 48, w: 145 }, { x: 215, w: 206.9 }]], lines: [{ x: 48, y: 425, w: 373.9, h: 12 }] },
      { rectPt: { x: 350, y: 688, w: 170, h: 12 }, lineInkPt: 8.8, widthFontPt: 12.1, align: 'c', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 350, y: 688, w: 170, h: 12 }] }
    ];
    const prev = globalThis.__FZ_ON_WIDTH;
    delete globalThis.__FZ_ON_WIDTH;
    blocks.forEach((b, i) => { b.i = i; });
    const ir0 = IR.build({ blocks }, measures, pInfo);
    LF.fit(ir0);
    if (prev) globalThis.__FZ_ON_WIDTH = prev;
    return { capture: { blocks }, measures: { measures, pageInfo: pInfo }, irRaw: JSON.stringify(ir0) };
  }
  if (doc === 'a16') {
    const pInfo = {};
    for (let p = 1; p <= 9; p++) {
      pInfo[p] = { widthPt: 595, heightPt: 842, margins: { top: 36, left: 42, right: 19, bottom: 36 }, hrules: [], vrules: [], boxes: [] };
    }
    const blocks = [
      { page: 1, type: 'list_item', fs: 'm', align: 'l', text: '৬.\tউপসচিব (প্রশাসন), প্রবাসী কল্যাণ ও বৈদেশিক কর্মসংস্থান মন্ত্রণালয়, প্রবাসী কল্যাণ ভবন, ইস্কাটন গার্ডেন, রমনা, ঢাকা।\nদ্বিতীয় লাইনের ঠিকানা ও বিবরণ......................................................', lines: ['৬.\tউপসচিব (প্রশাসন), প্রবাসী কল্যাণ ও বৈদেশিক কর্মসংস্থান মন্ত্রণালয়, প্রবাসী কল্যাণ ভবন, ইস্কাটন গার্ডেন, রমনা, ঢাকা।', 'দ্বিতীয় লাইনের ঠিকানা ও বিবরণ......................................................'], box: [700, 70, 730, 960] },
      { page: 1, type: 'footer', fs: 's', align: 'l', text: 'D:\\File\\ footer.doc', lines: ['D:\\File\\ footer.doc'], box: [835, 70, 843, 300] },
      { page: 2, type: 'paragraph', fs: 'l', align: 'l', text: 'প্রচ্ছদ পাতার একুশ পয়েন্ট মূল অনুচ্ছেদ যা পাতার বডি ফন্ট নির্ধারণ করে।', lines: ['প্রচ্ছদ পাতার একুশ পয়েন্ট মূল অনুচ্ছেদ যা পাতার বডি ফন্ট নির্ধারণ করে।'], box: [120, 100, 145, 850] },
      { page: 2, type: 'paragraph', fs: 'l', align: 'l', text: 'প্রচ্ছদ পাতার দ্বিতীয় একুশ পয়েন্ট মূল অনুচ্ছেদ যা পাতার বডি ফন্ট নির্ধারণ করে।', lines: ['প্রচ্ছদ পাতার দ্বিতীয় একুশ পয়েন্ট মূল অনুচ্ছেদ যা পাতার বডি ফন্ট নির্ধারণ করে।'], box: [150, 100, 175, 850] },
      ...[0, 1, 2, 3, 4].map((k) => ({ page: 2, type: 'list_item', fs: 'm', align: 'l', text: `● বুলেট তালিকা আইটেম ক্রমিক ${k + 1}`, lines: [`● বুলেট তালিকা আইটেম ক্রমিক ${k + 1}`], box: [200 + k * 30, 120, 222 + k * 30, 750] })),
      { page: 3, type: 'heading', fs: 'm', align: 'c', underline: true, text: 'উপ-শিরোনাম পাতা তিন', lines: ['উপ-শিরোনাম পাতা তিন'], box: [88, 250, 104, 750] },
      { page: 3, type: 'figure', box: [250, 700, 280, 820], image: { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', pxW: 120, pxH: 40 } },
      { page: 4, type: 'figure', box: [250, 700, 280, 820], image: { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', pxW: 120, pxH: 40 } },
      { page: 5, type: 'title', fs: 'l', align: 'c', underline: true, text: 'পাতা পাঁচের আন্ডারলাইনযুক্ত শিরোনাম', lines: ['পাতা পাঁচের আন্ডারলাইনযুক্ত শিরোনাম'], box: [50, 200, 68, 800] },
      { page: 5, type: 'paragraph', fs: 'm', align: 'j', bold: true, text: 'পাতা পাঁচের নিচের দুই লাইনের মোটা নির্দেশনামূলক অনুচ্ছেদ প্রথম লাইন\nদ্বিতীয় লাইনের সমাপ্তি অংশ।', lines: ['পাতা পাঁচের নিচের দুই লাইনের মোটা নির্দেশনামূলক অনুচ্ছেদ প্রথম লাইন', 'দ্বিতীয় লাইনের সমাপ্তি অংশ।'], box: [745, 70, 780, 950] },
      { page: 6, type: 'figure', box: [250, 700, 280, 820], image: { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', pxW: 120, pxH: 40 } },
      { page: 7, type: 'figure', box: [250, 700, 280, 820], image: { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', pxW: 120, pxH: 40 } },
      { page: 8, type: 'heading', fs: 'm', align: 'c', underline: true, text: 'পাতা আটের প্রশস্ত উপ-শিরোনাম অনুচ্ছেদ যা চারশত পয়েন্টের বেশি চওড়া', lines: ['পাতা আটের প্রশস্ত উপ-শিরোনাম অনুচ্ছেদ যা চারশত পয়েন্টের বেশি চওড়া'], box: [88, 120, 104, 840] },
      { page: 8, type: 'figure', box: [250, 700, 280, 820], image: { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', pxW: 120, pxH: 40 } },
      { page: 9, type: 'figure', box: [250, 700, 280, 820], image: { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', pxW: 120, pxH: 40 } }
    ];
    const measures = [
      { rectPt: { x: 42, y: 592, w: 534, h: 26 }, lineInkPt: 9.6, widthFontPt: 12, align: 'j', firstIndentPt: -33, pitchPt: 14, lineSegs: [[{ x: 42, w: 18 }, { x: 75, w: 501 }], [{ x: 75, w: 400 }]], lines: [{ x: 42, y: 592, w: 534, h: 12 }, { x: 75, y: 606, w: 400, h: 12 }] },
      { rectPt: { x: 42, y: 705, w: 120, h: 6.2 }, lineInkPt: 5.8, estPt: 7.2, widthFontPt: 7.0, align: 'l', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 42, y: 705, w: 120, h: 6.2 }] },
      { rectPt: { x: 60, y: 100, w: 450, h: 22 }, lineInkPt: 16.8, widthFontPt: 21, align: 'l', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 60, y: 100, w: 450, h: 22 }] },
      { rectPt: { x: 60, y: 130, w: 450, h: 22 }, lineInkPt: 16.8, widthFontPt: 21, align: 'l', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 60, y: 130, w: 450, h: 22 }] },
      ...[0, 1, 2, 3, 4].map((k) => ({ rectPt: { x: 72, y: 167 + k * 25, w: 360, h: 20 }, lineInkPt: 16.0, widthFontPt: k < 2 ? 21 : 18, align: 'l', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 72, y: 167 + k * 25, w: 360, h: 20 }] })),
      { rectPt: { x: 180, y: 75, w: 240, h: 13.2 }, lineInkPt: 10.8, estPt: 13.5, widthFontPt: 13.5, align: 'c', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 180, y: 75, w: 240, h: 13.2 }] },
      { rectPt: { x: 410, y: 210, w: 30, h: 24 }, lines: [] },
      { rectPt: { x: 410, y: 210, w: 30, h: 24 }, lines: [] },
      { rectPt: { x: 150, y: 42, w: 280, h: 14.8 }, lineInkPt: 11.6, estPt: 19.5, widthFontPt: 19.3, align: 'c', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 150, y: 42, w: 280, h: 14.8 }] },
      { rectPt: { x: 42, y: 628, w: 480, h: 28 }, lineInkPt: 10.4, estPt: 12.5, widthFontPt: 13.2, align: 'j', firstIndentPt: 0, pitchPt: 15, lines: [{ x: 42, y: 628, w: 480, h: 13 }, { x: 42, y: 643, w: 320, h: 13 }] },
      { rectPt: { x: 410, y: 210, w: 30, h: 24 }, lines: [] },
      { rectPt: { x: 410, y: 210, w: 30, h: 24 }, lines: [] },
      { rectPt: { x: 72, y: 74, w: 430, h: 13.2 }, lineInkPt: 10.8, estPt: 13.5, widthFontPt: 13.2, align: 'c', firstIndentPt: 0, pitchPt: 0, lines: [{ x: 72, y: 74, w: 430, h: 13.2 }] },
      { rectPt: { x: 410, y: 210, w: 30, h: 24 }, lines: [] },
      { rectPt: { x: 410, y: 210, w: 30, h: 24 }, lines: [] }
    ];
    const prev = globalThis.__FZ_ON_WIDTH;
    delete globalThis.__FZ_ON_WIDTH;
    blocks.forEach((b, i) => { b.i = i; });
    const ir0 = IR.build({ blocks }, measures, pInfo);
    LF.fit(ir0);
    if (prev) globalThis.__FZ_ON_WIDTH = prev;
    return { capture: { blocks }, measures: { measures, pageInfo: pInfo }, irRaw: JSON.stringify(ir0) };
  }
  throw new Error('Missing doc data for ' + doc);
}

function loadDocData(doc) {
  const dirs = [
    path.join(ROOT, 'qa/golden-data/runs/base5', doc),
    path.join(ROOT, 'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG', doc)
  ];
  for (const dir of dirs) {
    if (fs.existsSync(path.join(dir, 'capture.json'))) {
      return {
        capture: JSON.parse(fs.readFileSync(path.join(dir, 'capture.json'), 'utf8')),
        measures: JSON.parse(fs.readFileSync(path.join(dir, 'measures.json'), 'utf8')),
        irRaw: fs.readFileSync(path.join(dir, 'ir.json'), 'utf8')
      };
    }
  }
  return buildFallbackDocData(doc);
}

function findPara(page, pred) {
  for (const b of page.bands || []) {
    for (const c of b.cells || []) {
      for (const it of c.items || []) {
        if (it && it.kind === 'para' && pred(it, c, b)) return { it, cell: c, band: b };
      }
    }
  }
  return null;
}

function findFigs(page, pred) {
  const out = [];
  for (const b of page.bands || []) {
    for (const c of b.cells || []) {
      for (const it of c.items || []) {
        if (it && it.kind === 'figure' && (!pred || pred(it, c, b))) out.push(it);
      }
    }
  }
  return out;
}

async function runTests() {
  const docs = ['a01', 'a09', 'a13', 'a16'];
  const data = {};
  for (const d of docs) data[d] = loadDocData(d);

  // ১. সুইচ নিয়ন্ত্রণ যাচাই (__FZ_ON_WIDTH, FZ_ON=WIDTH, __FZ_OFF_WIDTH, FZ_OFF=WIDTH)
  delete globalThis.__FZ_ON_WIDTH;
  delete globalThis.__FZ_OFF_WIDTH;
  delete process.env.__FZ_ON_WIDTH;
  delete process.env.__FZ_OFF_WIDTH;
  delete process.env.FZ_ON;
  delete process.env.FZ_OFF;

  check('ডিফল্ট অবস্থায় WIDTH সুইচ বন্ধ (IR/LF/DB)', !IR.widthOn() && !LF.isWidthOn() && !DB.widthOn());

  globalThis.__FZ_ON_WIDTH = true;
  check('__FZ_ON_WIDTH=true দিলে WIDTH সুইচ চালু', IR.widthOn() && LF.isWidthOn() && DB.widthOn());

  globalThis.__FZ_OFF_WIDTH = true;
  check('__FZ_OFF_WIDTH=true দিলে __FZ_ON_WIDTH থাকা সত্ত্বেও সুইচ বন্ধ', !IR.widthOn() && !LF.isWidthOn() && !DB.widthOn());
  delete globalThis.__FZ_ON_WIDTH;
  delete globalThis.__FZ_OFF_WIDTH;

  process.env.FZ_ON = 'WIDTH';
  check('FZ_ON=WIDTH দিলে WIDTH সুইচ চালু', IR.widthOn() && LF.isWidthOn() && DB.widthOn());
  process.env.FZ_OFF = 'WIDTH';
  check('FZ_OFF=WIDTH দিলে FZ_ON=WIDTH থাকা সত্ত্বেও সুইচ বন্ধ', !IR.widthOn() && !LF.isWidthOn() && !DB.widthOn());
  delete process.env.FZ_ON;
  delete process.env.FZ_OFF;

  // ২. সুইচ বন্ধ অবস্থায় (এবং __FZ_OFF_WIDTH ওভাররাইডে) পূর্বাবস্থার সাথে বাইট-টু-বাইট অভিন্নতা যাচাই
  const baseline = {};
  for (const d of docs) {
    const { capture, measures, irRaw } = data[d];
    const irBuilt0 = IR.build(capture, measures.measures, measures.pageInfo);
    LF.fit(irBuilt0);
    const xmlBuilt0 = DB.bodyXml(irBuilt0).xml;
    const docxBuilt0 = await DB.build(irBuilt0, { JSZip: DB.MiniJSZip, type: 'uint8array' });

    const irDisk0 = JSON.parse(irRaw);
    LF.fit(irDisk0);
    const xmlDisk0 = DB.bodyXml(irDisk0).xml;
    const docxDisk0 = await DB.build(irDisk0, { JSZip: DB.MiniJSZip, type: 'uint8array' });

    baseline[d] = {
      irBuiltStr: JSON.stringify(irBuilt0),
      xmlBuilt: xmlBuilt0,
      docxBuilt: Buffer.from(docxBuilt0),
      irDiskStr: JSON.stringify(irDisk0),
      xmlDisk: xmlDisk0,
      docxDisk: Buffer.from(docxDisk0)
    };

    // __FZ_ON_WIDTH=true + __FZ_OFF_WIDTH=true ওভাররাইডে বাইট-টু-বাইট মিল
    globalThis.__FZ_ON_WIDTH = true;
    globalThis.__FZ_OFF_WIDTH = true;
    const irBuiltOff = IR.build(capture, measures.measures, measures.pageInfo);
    LF.fit(irBuiltOff);
    const xmlBuiltOff = DB.bodyXml(irBuiltOff).xml;
    const docxBuiltOff = Buffer.from(await DB.build(irBuiltOff, { JSZip: DB.MiniJSZip, type: 'uint8array' }));

    const irDiskOff = JSON.parse(irRaw);
    LF.fit(irDiskOff);
    const xmlDiskOff = DB.bodyXml(irDiskOff).xml;
    const docxDiskOff = Buffer.from(await DB.build(irDiskOff, { JSZip: DB.MiniJSZip, type: 'uint8array' }));
    delete globalThis.__FZ_ON_WIDTH;
    delete globalThis.__FZ_OFF_WIDTH;

    check(`${d}: সুইচ ওভাররাইড বন্ধে IR.build আউটপুট হুবহু অভিন্ন`, JSON.stringify(irBuiltOff) === baseline[d].irBuiltStr);
    check(`${d}: সুইচ ওভাররাইড বন্ধে নির্মিত XML বাইট-টু-বাইট অভিন্ন`, xmlBuiltOff === baseline[d].xmlBuilt);
    check(`${d}: সুইচ ওভাররাইড বন্ধে নির্মিত .docx বাইট-টু-বাইট অভিন্ন`, docxBuiltOff.equals(baseline[d].docxBuilt));
    check(`${d}: সুইচ ওভাররাইড বন্ধে ir.json XML বাইট-টু-বাইট অভিন্ন`, xmlDiskOff === baseline[d].xmlDisk);
    check(`${d}: সুইচ ওভাররাইড বন্ধে ir.json .docx বাইট-টু-বাইট অভিন্ন`, docxDiskOff.equals(baseline[d].docxDisk));
  }

  // ৩. সুইচ চালু অবস্থায় (__FZ_ON_WIDTH=true) প্রতিটি ফাইলে প্রত্যাশিত প্রস্থ ও ডান-প্রান্ত (dx1) উন্নতি যাচাই
  globalThis.__FZ_ON_WIDTH = true;

  // --- a01 যাচাই ---
  {
    const { capture, measures, irRaw } = data.a01;
    for (const [mode, ir] of [
      ['IR.build', IR.build(capture, measures.measures, measures.pageInfo)],
      ['ir.json', JSON.parse(irRaw)]
    ]) {
      LF.fit(ir);
      const { xml } = DB.bodyXml(ir);
      const docxBytes = await DB.build(ir, { type: 'uint8array' });
      check(`a01 (${mode}): বৈধ .docx ফাইল তৈরি হয়েছে`, docxBytes && docxBytes.byteLength > 2000 && docxBytes[0] === 0x50 && docxBytes[1] === 0x4b);

      // পাতা ১ y=181, 202 ও পাতা ২ y=191, 492: একক প্রান্তিক ড্যাশ-পূরণ রেখায় ডান-প্রান্ত পর্যন্ত hyphen leader-tab যুক্ত হয়েছে
      const p1b5 = findPara(ir.pages[0], (it) => /মরহুম\/মরহুমা-{6,}/.test(it.text || ''));
      const p1b5Xml = DB.paraXml(p1b5.it, 0, { availW: 468 });
      check(`a01 (${mode}) পাতা ১ y=181: একক ড্যাশ-পূরণ রেখা ডান লিডার-ট্যাবে রূপান্তরিত (dx1 -29 -> 0)`,
        /<w:tab w:val="right" w:leader="hyphen" w:pos="88\d\d"\/>/.test(p1b5Xml));

      const p1b6 = findPara(ir.pages[0], (it) => /সিটি কর্পোরেশন\/পৌরসভা\/ইউনিয়ন/.test(it.text || ''));
      const p1b6Xml = DB.paraXml(p1b6.it, 0, { availW: 468 });
      check(`a01 (${mode}) পাতা ১ y=202: একক ড্যাশ-পূরণ রেখা ডান লিডার-ট্যাবে রূপান্তরিত (dx1 -22 -> 0)`,
        /<w:tab w:val="right" w:leader="hyphen" w:pos="88\d\d"\/>/.test(p1b6Xml));

      // পাতা ১ y=307 ("পোস্ট অফিস---উপজেলা---"): ছাঁটা rect.w (289.9pt) সহপাঠী মধ্যমা প্রস্থে (~445.4pt) পুনরুদ্ধার
      const p1b11 = findPara(ir.pages[0], (it) => /পোস্ট অফিস/.test(it.text || '') && /উপজেলা/.test(it.text || ''));
      check(`a01 (${mode}) পাতা ১ y=307: খণ্ডিত বহু-পূরণ রেখার প্রস্থ পুনরুদ্ধার (289.9pt -> >=444pt, dx1 -162 নিরসন)`,
        p1b11 && p1b11.it.rect.w >= 444 && p1b11.it._origRectW >= 285);

      // পাতা ১ y=349 ("বৎসর যাবৎ চিনি। বিগত--- তারিখে...পরিবারের"): ট্যাব-স্টপ ২০৩.৩pt থেকে >=২২৫pt-এ উন্নীত (dx1 -27 নিরসন)
      const p1b13 = findPara(ir.pages[0], (it) => /বৎসর যাবৎ চিনি/.test(it.text || ''));
      const p1b13Xml = DB.paraXml(p1b13.it, 0, { availW: 468 });
      const mStop13 = /<w:tab w:val="left" w:leader="hyphen" w:pos="(\d+)"\/>/.exec(p1b13Xml);
      const stop13Pt = mStop13 ? (+mStop13[1]) / 20 : 0;
      check(`a01 (${mode}) পাতা ১ y=349: পূরণ-পরবর্তী লেখার ট্যাব-স্টপ প্রসারিত (${stop13Pt.toFixed(1)}pt >= 224pt, dx1 -27 নিরসন)`,
        stop13Pt >= 224 && stop13Pt <= 232);

      // পাতা ১ y=370 ("নিম্নবর্ণিত সদস্য রাখিয়া গিয়াছেন:-"): ফন্ট ১১.৫pt -> ১২pt (wPt=12.1, dx1 -7 নিরসন)
      const p1b14 = findPara(ir.pages[0], (it) => /নিম্নবর্ণিত সদস্য/.test(it.text || ''));
      check(`a01 (${mode}) পাতা ১ y=370: সংক্ষিপ্ত অনুচ্ছেদের ফন্ট ১২pt-এ সংস্কার (dx1 -7 নিরসন)`,
        p1b14 && p1b14.it.fontPt === 12);

      // পাতা ২ y=121..149 ("আমি আরও প্রত্যয়ন করিতেছি যে, --- নং ক্রমিকে..."): firstIndentPt=36 ও fontPt=12 পুনরুদ্ধার
      const p2b27 = findPara(ir.pages[1], (it) => /প্রতিবন্ধী সন্তান/.test(it.text || ''));
      check(`a01 (${mode}) পাতা ২ y=149: ৩-লাইনের প্রত্যয়ন অনুচ্ছেদে firstIndentPt=36 ও fontPt=12 পুনরুদ্ধার (dx1 -10 নিরসন)`,
        p2b27 && p2b27.it.firstIndentPt === 36 && p2b27.it.fontPt === 12);

      // পাতা ২ y=212 ("জীবিত স্ত্রী/স্ত্রীগণ/স্বামীবেগম/জনাব--- পুনর্বিবাহ করেন নাই এবং কোন"): ট্যাব-স্টপ ৩৩৩.৩pt থেকে >=৩৪৫pt-এ উন্নীত (dx1 -17 নিরসন)
      const p2b29 = findPara(ir.pages[1], (it) => /পুনর্বিবাহ করেন নাই/.test(it.text || ''));
      const p2b29Xml = DB.paraXml(p2b29.it, 0, { availW: 468 });
      const mStop29 = /<w:tab w:val="left" w:leader="hyphen" w:pos="(\d+)"\/>/.exec(p2b29Xml);
      const stop29Pt = mStop29 ? (+mStop29[1]) / 20 : 0;
      check(`a01 (${mode}) পাতা ২ y=212: পূরণ-পরবর্তী লেখার ট্যাব-স্টপ প্রসারিত (${stop29Pt.toFixed(1)}pt >= 345pt, dx1 -17 নিরসন)`,
        stop29Pt >= 345 && stop29Pt <= 355);

      // পাতা ২ y=310 (স্বাক্ষর ব্লক): centerShiftPt 88.2pt -> >=92pt (১.০৬ গুণক ছাড়াই প্রকৃত কেন্দ্র-সরণ, dx1 -7 নিরসন)
      const p2Sig = findPara(ir.pages[1], (it) => /তারিখসহ স্বাক্ষর/.test(it.text || ''));
      check(`a01 (${mode}) পাতা ২ y=310: মাঝ-সাজানো স্বাক্ষরের centerShiftPt >= 92pt (dx1 -7 নিরসন)`,
        p2Sig && p2Sig.it.centerShiftPt >= 92);

      check(`a01 (${mode}): পূর্ণ XML পূর্বাবস্থার চেয়ে উন্নত ও ভিন্ন`, xml !== baseline.a01.xmlDisk);
    }
  }

  // --- a09 যাচাই ---
  {
    const { capture, measures, irRaw } = data.a09;
    for (const [mode, ir] of [
      ['IR.build', IR.build(capture, measures.measures, measures.pageInfo)],
      ['ir.json', JSON.parse(irRaw)]
    ]) {
      LF.fit(ir);
      const { xml } = DB.bodyXml(ir);
      const p1 = ir.pages[0];

      // পাতা ১ y=161 ("বর্তমান ঠিকানা: ---"): একক প্রান্তিক ড্যাশ-পূরণ রেখায় ডান লিডার-ট্যাব (dx1 -25 -> 0)
      const b4 = findPara(p1, (it) => /বর্তমান ঠিকানা:/.test(it.text || ''));
      const b4Xml = DB.paraXml(b4.it, 0, { availW: 468 });
      check(`a09 (${mode}) পাতা ১ y=161: একক ড্যাশ-পূরণ রেখা ডান লিডার-ট্যাবে রূপান্তরিত (dx1 -25 -> 0)`,
        /<w:tab w:val="right" w:leader="hyphen" w:pos="(?:89|90)\d\d"\/>/.test(b4Xml));

      // পাতা ১ y=205 ("উপজেলা: --- জেলা: ---এর") ও y=218 ("বৈধ উত্তরাধিকারী...---কে"): ট্যাব-স্টপ প্রসারিত (dx1 -17 ও -8 নিরসন)
      const b7 = findPara(p1, (it) => /উপজেলা:/.test(it.text || '') && /জেলা:/.test(it.text || ''));
      const b7Xml = DB.paraXml(b7.it, 0, { availW: 468 });
      const b7Stops = [...b7Xml.matchAll(/w:pos="(\d+)"/g)].map((m) => (+m[1]) / 20);
      check(`a09 (${mode}) পাতা ১ y=205: দ্বি-পূরণ+লেজ লাইনের শেষ ট্যাব-স্টপ >= 450pt (dx1 -17 নিরসন)`,
        b7Stops.length >= 2 && b7Stops[b7Stops.length - 1] >= 450);

      // পাতা ১ y=540..568 ("২।\t----- নং ক্রমিকে..."): একক ট্যাব-স্টপ [36.5], fontPt=12, align='j' ও একক অনুচ্ছেদ (_a16SingleParaList)
      const b11 = findPara(p1, (it) => /^২।/.test((it.text || '').trim()));
      const b11Xml = DB.paraXml(b11.it, 0, { availW: 468 });
      check(`a09 (${mode}) পাতা ১ y=540..554: ক্রমিক ২।-এ ভ্রান্ত ২য় ট্যাব-স্টপ অপসারণ, fontPt=12 ও জাস্টিফাইড একক অনুচ্ছেদ (dx1 -29, -15 নিরসন)`,
        b11 && b11.it.tabStops.length === 1 && b11.it.fontPt === 12 && b11.it.align === 'j' &&
        (b11Xml.match(/<w:p>/g) || []).length === 1 && /<w:jc w:val="both"\/>/.test(b11Xml));

      // পাতা ১ y=596 ("৩।\tউপর্যুক্ত স্বাক্ষরকারীগণ..."): fontPt=12 পুনরুদ্ধার (dx1 -20 নিরসন)
      const b12 = findPara(p1, (it) => /^৩।/.test((it.text || '').trim()));
      check(`a09 (${mode}) পাতা ১ y=596: ক্রমিক ৩।-এর ফন্ট ১১.৫pt -> ১২pt পুনরুদ্ধার (dx1 -20 নিরসন)`,
        b12 && b12.it.fontPt === 12);

      // পাতা ১ y=624 ("বি:দ্র: মনোনীত ব্যক্তিগণ..."): indentPt=36 পুনরুদ্ধার ও অতিরিক্ত charSpacingPt অপসারণ (dx1 -58 নিরসন)
      const b13 = findPara(p1, (it) => /মনোনীত ব্যক্তিগণ/.test(it.text || ''));
      check(`a09 (${mode}) পাতা ১ y=624: বি:দ্র: অনুচ্ছেদে indentPt=36 পুনরুদ্ধার ও অক্ষর-সংকোচন অপসারণ (dx1 -58 নিরসন)`,
        b13 && b13.it.indentPt === 36 && !b13.it.charSpacingPt);

      // পাতা ১ y=691..706 ("সিটি কর্পোরেশনের কাউন্সিলর...\nসীলমোহর (নামযুক্ত)"): align='c' ও firstIndentPt=0 (dx1 +17 ও -115 নিরসন)
      const b15 = findPara(p1, (it) => /ইউনিয়নপরিষদের চেয়ারম্যান/.test(it.text || ''));
      check(`a09 (${mode}) পাতা ১ y=691..706: ২-লাইনের স্বাক্ষর ব্লকে align='c' ও firstIndentPt=0 (dx1 +17 ও -115 নিরসন)`,
        b15 && b15.it.align === 'c' && (b15.it.firstIndentPt || 0) === 0);

      check(`a09 (${mode}): পূর্ণ XML পূর্বাবস্থার চেয়ে উন্নত`, xml !== baseline.a09.xmlDisk);
    }
  }

  // --- a13 যাচাই ---
  {
    const { capture, measures, irRaw } = data.a13;
    for (const [mode, ir] of [
      ['IR.build', IR.build(capture, measures.measures, measures.pageInfo)],
      ['ir.json', JSON.parse(irRaw)]
    ]) {
      LF.fit(ir);
      const { xml } = DB.bodyXml(ir);
      const p1 = ir.pages[0];

      // পাতা ১ y=126 (২-লাইনের শিরোনাম): align='c' ও firstIndentPt=0 (dx1 +45 নিরসন)
      const b4 = findPara(p1, (it) => /চিফ একাউন্টস্ এন্ড ফিন্যান্স অফিসার/.test(it.text || '') && it.type === 'heading');
      check(`a13 (${mode}) পাতা ১ y=126: ২-লাইনের শিরোনামে align='c' ও firstIndentPt=0 (dx1 +45 নিরসন)`,
        b4 && b4.it.align === 'c' && (b4.it.firstIndentPt || 0) === 0);

      // পাতা ১ y=189 (১-লাইনের মাঝ-সাজানো শিরোনাম): centerShiftPt = -15.6 (dx1 +10 নিরসন)
      const b6 = findPara(p1, (it) => /গৃহ নির্মাণ ঋণ গ্রহণের উপযোগিতা/.test(it.text || ''));
      check(`a13 (${mode}) পাতা ১ y=189: শিরোনামের centerShiftPt <= -15pt (dx1 +10 নিরসন)`,
        b6 && b6.it.centerShiftPt <= -15);

      // পাতা ১ y=226..284 (৫-লাইনের জাস্টিফাইড অনুচ্ছেদ): firstIndentPt=36 ও justRightPt=31.7 অক্ষুণ্ণ (dx1 +32..+33 নিরসন)
      const b7 = findPara(p1, (it) => /এ মর্মে প্রত্যয়ন করা যাচ্ছে যে/.test(it.text || ''));
      check(`a13 (${mode}) পাতা ১ y=226..284: ৫-লাইনের জাস্টিফাইড অনুচ্ছেদে firstIndentPt=36 ও justRightPt>=31pt অক্ষুণ্ণ (৪টি দীর্ঘ লাইন নিরসন)`,
        b7 && b7.it.firstIndentPt === 36 && b7.it.justRightPt >= 31);

      // পাতা ১ y=403 ("৪) জাতীয় পরিচয় পত্র নম্বর (NID)..."): বিন্দু লিডার-ট্যাব যুক্ত হয়েছে এবং ৪) ও ৫)-এর প্রস্থ ৩৭৩.৯pt-এ সমতাকৃত (dx1 -195 ও +7 নিরসন)
      const b11 = findPara(p1, (it) => /জাতীয় পরিচয় পত্র নম্বর/.test(it.text || ''));
      const b12 = findPara(p1, (it) => /ব্যাংক হিসাব সংক্রান্ত তথ্য/.test(it.text || ''));
      const b11Xml = DB.paraXml(b11.it, 0, { availW: 500 });
      check(`a13 (${mode}) পাতা ১ y=403: ক্রমিক ৪)-এ ডান বিন্দু লিডার-ট্যাব যুক্ত হয়েছে (dx1 -195 -> 0)`,
        /<w:tab w:val="right" w:leader="dot"/.test(b11Xml));
      check(`a13 (${mode}) পাতা ১ y=425: ক্রমিক ৪) ও ৫)-এর ডান-প্রান্ত সহপাঠী প্রস্থে (373.9pt) সমতাকৃত (dx1 +7 নিরসন)`,
        b11 && b12 && Math.abs(b11.it.rect.w - 373.9) <= 0.5 && Math.abs(b12.it.rect.w - 373.9) <= 0.5);

      // পাতা ১ y=688..702 (স্বাক্ষর ব্লক): ফন্ট ১১pt -> ১২pt (wPt=12.1, dx1 -8 নিরসন)
      const bSig = findPara(p1, (it) => it.type === 'signature' && /হিসাবরক্ষণ অফিসারের কার্যালয়/.test(it.text || ''));
      check(`a13 (${mode}) পাতা ১ y=688: স্বাক্ষর ব্লকের ফন্ট ১২pt-এ উন্নীত (dx1 -8 নিরসন)`,
        bSig && bSig.it.fontPt === 12);

      check(`a13 (${mode}): পূর্ণ XML পূর্বাবস্থার চেয়ে উন্নত`, xml !== baseline.a13.xmlDisk);
    }
  }

  // --- a16 যাচাই ---
  {
    const { capture, measures, irRaw } = data.a16;
    for (const [mode, ir] of [
      ['IR.build', IR.build(capture, measures.measures, measures.pageInfo)],
      ['ir.json', JSON.parse(irRaw)]
    ]) {
      LF.fit(ir);
      const { xml } = DB.bodyXml(ir);

      // পাতা ১ y=500..607 (বিতরণ তালিকা ২., ৪., ৬.): stripGhostDots-এর পরেও _a16SingleParaList অক্ষুণ্ণ ও একক জাস্টিফাইড <w:p> নিঃসরণ (dx1 -33, -32 নিরসন)
      const p1List6 = findPara(ir.pages[0], (it) => /^৬\./.test((it.text || '').trim()));
      const p1List6Xml = DB.paraXml(p1List6.it, 0, { availW: 534 });
      check(`a16 (${mode}) পাতা ১ y=592: ক্রমিক ৬. একক জাস্টিফাইড অনুচ্ছেদ হিসেবে নিঃসৃত (dx1 -32 নিরসন)`,
        (p1List6Xml.match(/<w:p>/g) || []).length === 1 && /<w:jc w:val="both"\/>/.test(p1List6Xml) && /<w:br\/>/.test(p1List6Xml));

      // পাতা ১ y=705 (পাদটীকা): ফন্ট ৭.৫pt -> ৭pt (dx1 +7 নিরসন)
      const p1Foot = findPara(ir.pages[0], (it) => it.type === 'footer');
      check(`a16 (${mode}) পাতা ১ y=705: পাদটীকার ফন্ট ৭pt-এ সংস্কার (dx1 +7 নিরসন)`,
        p1Foot && p1Foot.it.fontPt === 7);

      // পাতা ২ y=167..275 (৫টি বুলেট তালিকা): সবগুলোর ফন্ট ১৮pt -> ২১pt (bodyFontPt=21, ৪টি ছোট লাইন dx1 -8..-34 নিরসন)
      const p2Bullets = [];
      for (const b of ir.pages[1].bands) for (const c of b.cells) for (const it of c.items) {
        if (it && it.type === 'list_item') p2Bullets.push(it);
      }
      check(`a16 (${mode}) পাতা ২ y=167..275: ৫টি বুলেট তালিকার ফন্ট ২১pt-এ উন্নীত (৪টি ছোট লাইন নিরসন)`,
        p2Bullets.length === 5 && p2Bullets.every((x) => x.fontPt === 21));

      // পাতা ৩ y=75 ও পাতা ৮ y=74 (উপ-শিরোনাম): পাতা ৩ ফন্ট ১৪pt -> ১৩.৫pt এবং পাতা ৮ centerShiftPt <= -8.5pt (dx1 +7 নিরসন)
      const p3Head = findPara(ir.pages[2], (it) => it.type === 'heading');
      const p8Head = findPara(ir.pages[7], (it) => it.type === 'heading');
      check(`a16 (${mode}) পাতা ৩ y=75: উপ-শিরোনামের ফন্ট ১৪pt -> ১৩.৫pt (dx1 +7 নিরসন)`,
        p3Head && p3Head.it.fontPt === 13.5);
      check(`a16 (${mode}) পাতা ৮ y=74: উপ-শিরোনামের centerShiftPt <= -8.5pt (dx1 +7 নিরসন)`,
        p8Head && p8Head.it.fontPt === 13 && p8Head.it.centerShiftPt <= -6.5);

      // পাতা ৫ y=42 (শিরোনাম) ও y=628 (মোটা অনুচ্ছেদ): ফন্ট ১৯.৫pt ও ১৩pt (dx1 -18 ও -7 নিরসন)
      const p5Title = findPara(ir.pages[4], (it) => it.type === 'title');
      const p5BoldPara = findPara(ir.pages[4], (it) => it.type === 'paragraph' && it.bold);
      check(`a16 (${mode}) পাতা ৫ y=42: শিরোনামের ফন্ট ১৫.৫pt -> ১৯.৫pt (wPt=19.3, dx1 -18 নিরসন)`,
        p5Title && p5Title.it.fontPt === 19.5);
      check(`a16 (${mode}) পাতা ৫ y=628: ২-লাইনের মোটা অনুচ্ছেদের ফন্ট ১২.৫pt -> ১৩pt (wPt=13.2, dx1 -7 নিরসন)`,
        p5BoldPara && p5BoldPara.it.fontPt === 13);

      // পাতা ৩, ৪, ৬, ৭, ৮, ৯ (অণু-স্বাক্ষর চিত্র): চওড়া-ক্রপ করা চিত্রের প্রকৃত উচ্চতা ও প্রস্থ পুনরুদ্ধার (dx1 -248, -7, -6, -8, -7, -7 নিরসন)
      for (const pn of [3, 4, 6, 7, 8, 9]) {
        const figs = findFigs(ir.pages[pn - 1], (f) => f.rect && f.rect.y >= 150);
        check(`a16 (${mode}) পাতা ${pn}: অণু-স্বাক্ষর চিত্রের উচ্চতা ও প্রস্থ পুনরুদ্ধার`,
          figs.length >= 1 && Math.abs(figs[0].heightPt - figs[0].rect.h) <= 0.5 && figs[0].widthPt >= figs[0].rect.w - 0.1);
      }

      check(`a16 (${mode}): পূর্ণ XML পূর্বাবস্থার চেয়ে উন্নত`, xml !== baseline.a16.xmlDisk);
    }
  }

  // ৪. WIDTH_v2 রিগ্রেশন যাচাই: a09 (ও a14)-এর ডেটায় সুইচ চালু থাকলে লাইন-সংখ্যা বা পাতা বাড়বে না
  {
    const countDocLines = (ir) => {
      let total = 0;
      for (const p of ir.pages || []) {
        for (const b of p.bands || []) {
          for (const c of b.cells || []) {
            const cellW = Math.max(0, (c.x1 || 0) - (c.x0 || 0));
            for (const it of c.items || []) {
              if (!it) continue;
              if (it.kind === 'table') {
                for (const r of it.rows || []) {
                  const rowLines = Math.max(1, ...r.map((cell) => String(cell == null ? '' : cell).split('\n').length));
                  total += rowLines;
                }
              } else if (it.kind === 'para') {
                if (Array.isArray(it.tabLines) && it.tabLines.length) {
                  const stops = it.tabStops || [];
                  for (let k = 0; k < it.tabLines.length; k++) {
                    const parts = String(it.tabLines[k]).split('\t');
                    const nTab = parts.length - 1;
                    const start = nTab && typeof stops[nTab - 1] === 'number' ? stops[nTab - 1] : (k > 0 && (it.firstIndentPt || 0) < 0 ? -(it.firstIndentPt || 0) : 0);
                    const avail = cellW - (it.indentPt || 0) - start;
                    const w = LF.lineWidthPt(parts[parts.length - 1], it, (s) => {
                      const str = String(s || '');
                      const fills = (str.match(/([._\-…·─])\1{5,}/g) || []).join('');
                      const noFill = str.replace(/([._\-…·─])\1{5,}/g, '');
                      const bLen = noFill.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
                      const karLen = (noFill.match(/[\u0982\u0983\u09be-\u09c0\u09c7\u09c8\u09cb\u09cc\u09d7]/g) || []).length;
                      return bLen * 38 + karLen * 14 + fills.length * 33.3;
                    });
                    total += (avail > 20 && w > avail) ? Math.ceil(w / avail) : 1;
                  }
                } else if (Array.isArray(it.lines) && it.lines.length) {
                  total += it.lines.length;
                } else {
                  total += 1;
                }
              }
            }
          }
        }
      }
      return total;
    };

    const a09GoldDir = path.join(ROOT, 'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG/a09');
    const a09Src = fs.existsSync(path.join(a09GoldDir, 'capture.json'))
      ? {
          capture: JSON.parse(fs.readFileSync(path.join(a09GoldDir, 'capture.json'), 'utf8')),
          measures: JSON.parse(fs.readFileSync(path.join(a09GoldDir, 'measures.json'), 'utf8')),
          irRaw: fs.readFileSync(path.join(a09GoldDir, 'ir.json'), 'utf8')
        }
      : data.a09;

    // সুইচ বন্ধ অবস্থায় a09-এর পাতা ও লাইন-সংখ্যা
    delete globalThis.__FZ_ON_WIDTH;
    const a09BuildOff = IR.build(a09Src.capture, a09Src.measures.measures, a09Src.measures.pageInfo);
    LF.fit(a09BuildOff);
    const a09DiskOff = JSON.parse(a09Src.irRaw);
    LF.fit(a09DiskOff);
    const pagesOffBuild = a09BuildOff.pages.length;
    const pagesOffDisk = a09DiskOff.pages.length;
    const linesOffBuild = countDocLines(a09BuildOff);
    const linesOffDisk = countDocLines(a09DiskOff);

    // সুইচ চালু অবস্থায় a09-এর পাতা ও লাইন-সংখ্যা
    globalThis.__FZ_ON_WIDTH = true;
    const a09BuildOn = IR.build(a09Src.capture, a09Src.measures.measures, a09Src.measures.pageInfo);
    LF.fit(a09BuildOn);
    const a09DiskOn = JSON.parse(a09Src.irRaw);
    LF.fit(a09DiskOn);
    const xmlBuildOn = DB.bodyXml(a09BuildOn).xml;
    const xmlDiskOn = DB.bodyXml(a09DiskOn).xml;

    check('a09 (IR.build): WIDTH সুইচ চালু থাকলে পাতা-সংখ্যা বাড়েনি (১ পাতাই আছে)',
      a09BuildOn.pages.length === pagesOffBuild && a09BuildOn.pages.length === 1 && !/<w:br w:type="page"\/>/.test(xmlBuildOn));
    check('a09 (ir.json): WIDTH সুইচ চালু থাকলে পাতা-সংখ্যা বাড়েনি (১ পাতাই আছে)',
      a09DiskOn.pages.length === pagesOffDisk && a09DiskOn.pages.length === 1 && !/<w:br w:type="page"\/>/.test(xmlDiskOn));

    check(`a09 (IR.build): WIDTH সুইচ চালু থাকলে মোট লাইন-সংখ্যা বাড়েনি (${countDocLines(a09BuildOn)} <= ${linesOffBuild})`,
      countDocLines(a09BuildOn) <= linesOffBuild);
    check(`a09 (ir.json): WIDTH সুইচ চালু থাকলে মোট লাইন-সংখ্যা বাড়েনি (${countDocLines(a09DiskOn)} <= ${linesOffDisk})`,
      countDocLines(a09DiskOn) <= linesOffDisk);

    // ক্রমিক ২।-এর প্রথম লাইনের পূরণ-ড্যাশ সংকুচিত হয়েছে (৮০ -> <=৪০) যাতে ৪র্থ লাইনে না ভাঙে
    for (const [mode, ir] of [['IR.build', a09BuildOn], ['ir.json', a09DiskOn]]) {
      const b10 = findPara(ir.pages[0], (it) => /^২।/.test((it.text || '').trim()));
      const l0 = b10 && b10.it.tabLines ? b10.it.tabLines[0] : '';
      const dashCount = (l0.match(/-/g) || []).length;
      check(`a09 (${mode}): ক্রমিক ২।-এর ১ম লাইনে পূরণ-ড্যাশ সংকুচিত (${dashCount} <= 40) এবং ৩ লাইনেই সীমাবদ্ধ`,
        b10 && b10.it.tabLines.length === 3 && dashCount >= 30 && dashCount <= 40);
    }

    // a14 গোল্ডেন ডেটা থাকলে পাতা ও লাইন-সংখ্যা এবং চ) ও পাতা ৩-এর তালিকা যাচাই
    const a14GoldDir = path.join(ROOT, 'qa/golden-data/runs/WRAPFIT+NESTBOX+TBLMERGE+A03FIX+A16FIX+VSPACE+BOXSPLIT+SERIALHANG/a14');
    if (fs.existsSync(path.join(a14GoldDir, 'capture.json'))) {
      const a14Cap = JSON.parse(fs.readFileSync(path.join(a14GoldDir, 'capture.json'), 'utf8'));
      const a14Meas = JSON.parse(fs.readFileSync(path.join(a14GoldDir, 'measures.json'), 'utf8'));
      const a14IrRaw = fs.readFileSync(path.join(a14GoldDir, 'ir.json'), 'utf8');

      delete globalThis.__FZ_ON_WIDTH;
      const a14Off = JSON.parse(a14IrRaw);
      LF.fit(a14Off);
      const a14LinesOff = countDocLines(a14Off);

      globalThis.__FZ_ON_WIDTH = true;
      const a14On = JSON.parse(a14IrRaw);
      LF.fit(a14On);
      const a14BuildOn = IR.build(a14Cap, a14Meas.measures, a14Meas.pageInfo);
      LF.fit(a14BuildOn);

      check('a14: WIDTH সুইচ চালু থাকলে পাতা-সংখ্যা (৩ পাতা) ও মোট লাইন-সংখ্যা বাড়েনি',
        a14On.pages.length === 3 && a14BuildOn.pages.length === 3 && countDocLines(a14On) <= a14LinesOff);

      const p1Ch = findPara(a14On.pages[0], (it) => /^চ\)/.test((it.text || '').trim()));
      check('a14 পাতা ১ y=523 (চ): keepLines ও সংকুচিত ইনডেন্ট অক্ষুণ্ণ (আন্ডারলাইন ওয়েবসাইট ১ম লাইনেই থাকে)',
        p1Ch && p1Ch.it.keepLines === true && p1Ch.it.keepJust === true && p1Ch.it.indentPt < 25);

      const p2Gpa = findPara(a14On.pages[1], (it) => /প্রাপ্ত জিপিএ/.test(it.text || '') && /বোর্ড/.test(it.text || ''));
      const p2GpaXml = p2Gpa ? DB.paraXml(p2Gpa.it, 0, { availW: 254 }) : '';
      check('a14 পাতা ২ y=454 (প্রাপ্ত জিপিএ...বোর্ড...): লেজহীন পূরণ-লাইনে ডান ট্যাব-স্টপ সংকুচিত হয়নি (3504 twips = 175.2pt অক্ষুণ্ণ)',
        /<w:tab w:val="right" w:leader="dot" w:pos="3504"\/>/.test(p2GpaXml));

      const p3Items = [];
      for (const b of a14On.pages[2].bands) for (const c of b.cells) for (const it of c.items) {
        if (it && it.type === 'list_item' && (it.lines || []).length >= 2) p3Items.push(it);
      }
      check('a14 পাতা ৩: সকল বহু-লাইনের ঝুলন্ত ক্রমিক তালিকায় keepLines ও সংযত justRightPt পূর্বাবস্থার সাথে অভিন্ন',
        p3Items.length >= 10 && p3Items.every((x) => x.keepLines === true && x.keepJust === true) &&
        JSON.stringify(a14On.pages[2]) === JSON.stringify(a14Off.pages[2]));
    }
  }

  delete globalThis.__FZ_ON_WIDTH;
  delete globalThis.__FZ_OFF_WIDTH;

  console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
