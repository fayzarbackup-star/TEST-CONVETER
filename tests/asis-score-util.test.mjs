// সার্ভার/নেটওয়ার্ক ছাড়া উৎস-খোঁজা (findSourcePdf) ও ত্রুটি-লাইন বাছাই (pickErrorLine) পরীক্ষা
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findSourcePdf, pickErrorLine } from '../qa/golden/asis-score.mjs';

test('findSourcePdf: ASIS_DIR → Downloads/AS it IS → Downloads ক্রম মেনে ফাইল খোঁজে', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'asis-util-'));
  try {
    const customDir = path.join(tmp, 'custom-asis');
    const homeDir = path.join(tmp, 'home');
    const asisSubDir = path.join(homeDir, 'Downloads', 'AS it IS');
    const downloadsDir = path.join(homeDir, 'Downloads');
    fs.mkdirSync(customDir, { recursive: true });
    fs.mkdirSync(asisSubDir, { recursive: true });
    fs.mkdirSync(downloadsDir, { recursive: true });

    const fileName = 'sample-doc.pdf';
    const inCustom = path.join(customDir, fileName);
    const inAsis = path.join(asisSubDir, fileName);
    const inDownloads = path.join(downloadsDir, fileName);

    // কোথাও ফাইল না থাকলে null
    assert.equal(findSourcePdf(fileName, { asisDir: customDir, homeDir }), null);

    // ১) শুধু Downloads-এ থাকলে সেখান থেকে পাবে
    fs.writeFileSync(inDownloads, 'pdf-downloads');
    assert.equal(findSourcePdf(fileName, { asisDir: customDir, homeDir }), inDownloads);

    // ২) Downloads\AS it IS-এও থাকলে সেটি অগ্রাধিকার পাবে
    fs.writeFileSync(inAsis, 'pdf-asis');
    assert.equal(findSourcePdf(fileName, { asisDir: customDir, homeDir }), inAsis);

    // ৩) ASIS_DIR-এ থাকলে সেটি সর্বোচ্চ অগ্রাধিকার পাবে
    fs.writeFileSync(inCustom, 'pdf-custom');
    assert.equal(findSourcePdf(fileName, { asisDir: customDir, homeDir }), inCustom);

    // ৪) ASIS_DIR না দিলে Downloads\AS it IS ব্যবহৃত হবে
    assert.equal(findSourcePdf(fileName, { asisDir: '', homeDir }), inAsis);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('pickErrorLine: Node.js vNN ও স্ট্যাক-ট্রেস বাদ দিয়ে আসল Error: লাইন বেছে নেয়', () => {
  const crashStderr = [
    'file:///C:/repo/qa/faithful-e2e.mjs:23',
    "  await page.goto('http://localhost:3008/index.html', { waitUntil: 'load', timeout: 120000 });",
    '             ^',
    '',
    'Error: net::ERR_CONNECTION_REFUSED at http://localhost:3008/index.html',
    '    at navigate (file:///C:/repo/node_modules/puppeteer-core/lib/esm/puppeteer/cdp/Frame.js:183:27)',
    '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)',
    '',
    'Node.js v24.12.0',
  ].join('\n');

  assert.equal(
    pickErrorLine(crashStderr, '', 1),
    'Error: net::ERR_CONNECTION_REFUSED at http://localhost:3008/index.html'
  );

  const timeoutStderr = [
    'TimeoutError: Navigation timeout of 120000 ms exceeded',
    '    at new Deferred (file:///C:/repo/node_modules/puppeteer-core/util.js:10:15)',
    'Node.js v24.0.0',
  ].join('\n');
  assert.equal(
    pickErrorLine(timeoutStderr),
    'TimeoutError: Navigation timeout of 120000 ms exceeded'
  );

  // stderr খালি কিন্তু stdout-এ PAGEERROR থাকলে সেটি নেবে, আর কিছু না থাকলে exit status
  assert.equal(pickErrorLine('Node.js v24.0.0', 'PAGEERROR ReferenceError: x is not defined', 1), 'PAGEERROR ReferenceError: x is not defined');
  assert.equal(pickErrorLine('', '', 1), '1');
});
