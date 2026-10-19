// সার্ভার/নেটওয়ার্ক ছাড়া উৎস-খোঁজা (findSourcePdf) ও ত্রুটি-লাইন বাছাই (pickErrorLine) পরীক্ষা
import rawTest from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findSourcePdf,
  pickErrorLine,
  checkOutputFilesWritable,
  formatLockedMessage,
  handleStaleWord,
} from '../qa/golden/asis-score.mjs';

let passed = 0;
let failed = 0;
const test = (name, fn) =>
  rawTest(name, async (t) => {
    try {
      await fn(t);
      passed++;
    } catch (e) {
      failed++;
      throw e;
    }
  });

process.on('exit', () => {
  console.log(`ফলাফল: ${passed} পাস, ${failed} ব্যর্থ`);
});

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

test('pickErrorLine: বহু-লাইনের EBUSY ত্রুটি ({ errno, code, syscall, path } ও } লাইন) এবং আসল a16-e2e.log থেকে Error: EBUSY বেছে নেয়', () => {
  const logPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scratch', 'a16-e2e.log');
  const realLog = fs.existsSync(logPath)
    ? fs.readFileSync(logPath, 'utf8')
    : [
        'verify {"asked":0,"fixed":0,"mismatches":0}',
        'tableVerify {"asked":0,"fixed":0,"mismatches":0}',
        'node : node:fs:621',
        '  return binding.open(',
        '                 ^',
        '',
        "Error: EBUSY: resource busy or locked, open 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\scratch\\fayzar-",
        "bangla-converter\\qa\\golden-data\\asis\\a16\\faithful_docx-unicode.docx'",
        '    at Object.openSync (node:fs:621:18)',
        '    at Object.writeFileSync (node:fs:2496:35)',
        '    at process.processTicksAndRejections (node:internal/process/task_queues:104:5) {',
        '  errno: -4082,',
        "  code: 'EBUSY',",
        "  syscall: 'open',",
        "  path: 'C:\\\\Users\\\\Admin\\\\.gemini\\\\antigravity-ide\\\\scratch\\\\fayzar-bangla-converter\\\\qa\\\\golden-d",
        "ata\\\\asis\\\\a16\\\\faithful_docx-unicode.docx'",
        '}',
        '',
        'Node.js v24.22.0',
      ].join('\r\n');

  const picked = pickErrorLine(realLog, '', 1);
  assert.match(picked, /^Error: EBUSY: resource busy or locked, open /);
  assert.match(picked, /a16\\faithful_docx-unicode\.docx'$/);
  assert.notEqual(picked, '}');
  assert.notEqual(picked, '{');

  // শুধু বন্ধনী বা অবজেক্ট-প্রপার্টি থাকলে কখনো } বা { বাছবে না
  const onlyBraces = [
    '{',
    '  errno: -4082,',
    "  code: 'EBUSY',",
    "  syscall: 'open',",
    "  path: 'C:\\\\temp\\\\out.pdf'",
    '}',
    'Node.js v24.22.0',
  ].join('\n');
  assert.equal(pickErrorLine(onlyBraces, '', 1), '1');
});

test('checkOutputFilesWritable: ফাইল খোলা-বন্ধ যাচাই ও আটকে থাকলে সেই id বাদ দিয়ে বাকি রান চালু রাখা', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'asis-lock-'));
  try {
    const a16Dir = path.join(tmp, 'a16');
    const a17Dir = path.join(tmp, 'a17');
    fs.mkdirSync(a16Dir, { recursive: true });
    fs.mkdirSync(a17Dir, { recursive: true });

    const docx16 = path.join(a16Dir, 'faithful_docx-unicode.docx');
    const pdf17 = path.join(a17Dir, 'out.pdf');
    fs.writeFileSync(docx16, 'dummy-docx');
    fs.writeFileSync(pdf17, 'dummy-pdf');

    // কোনো ফাইল লক না থাকলে null এবং ফাইলের বিষয়বস্তু অক্ষত
    assert.equal(checkOutputFilesWritable(a16Dir), null);
    assert.equal(fs.readFileSync(docx16, 'utf8'), 'dummy-docx');

    // a16-এর faithful_docx-unicode.docx লক থাকলে সেটির নাম ফেরত দেবে, কিন্তু a17 চলবে
    const mockOpen = (fp, flags) => {
      if (fp.endsWith('faithful_docx-unicode.docx')) {
        const err = new Error(`EBUSY: resource busy or locked, open '${fp}'`);
        err.code = 'EBUSY';
        throw err;
      }
      return fs.openSync(fp, flags);
    };

    const rows = [];
    const processed = [];
    for (const id of ['a16', 'a17']) {
      const od = path.join(tmp, id);
      const locked = checkOutputFilesWritable(od, { openSync: mockOpen });
      if (locked) {
        rows.push(formatLockedMessage(id, locked));
        continue;
      }
      processed.push(id);
    }

    assert.deepEqual(rows, ['a16 — ফাইল আটকে আছে (খোলা Word?): faithful_docx-unicode.docx']);
    assert.deepEqual(processed, ['a17']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('handleStaleWord: জানালা-হীন WINWORD থাকলে সতর্কবার্তা দেয় এবং --kill-stale-word দিলে শুধু ফাঁকা MainWindowTitle বন্ধ করে', () => {
  const mockProcs = [
    { Id: 101, MainWindowTitle: '' },
    { Id: 202, MainWindowTitle: '   ' },
    { Id: 303, MainWindowTitle: 'report.docx - Word' },
  ];

  // ১) সুইচ ছাড়া: সতর্কবার্তা ছাপবে, কিন্তু কোনো প্রসেস মারবে না
  const logsNoKill = [];
  const killedNoKill = [];
  const res1 = handleStaleWord({
    processes: mockProcs,
    kill: false,
    log: (m) => logsNoKill.push(m),
    killProcess: (pid) => killedNoKill.push(pid),
  });
  assert.deepEqual(res1.stale, [101, 202]);
  assert.deepEqual(res1.killed, []);
  assert.deepEqual(killedNoKill, []);
  assert.equal(logsNoKill.length, 1);
  assert.match(logsNoKill[0], /WINWORD/);
  assert.match(logsNoKill[0], /101, 202/);

  // ২) --kill-stale-word সুইচ দিলে: শুধু MainWindowTitle ফাঁকা থাকা (101, 202) বন্ধ করবে, 303 নয়
  const logsKill = [];
  const killedWithFlag = [];
  const res2 = handleStaleWord({
    processes: mockProcs,
    kill: true,
    log: (m) => logsKill.push(m),
    killProcess: (pid) => killedWithFlag.push(pid),
  });
  assert.deepEqual(res2.stale, [101, 202]);
  assert.deepEqual(res2.killed, [101, 202]);
  assert.deepEqual(killedWithFlag, [101, 202]);
  assert.equal(logsKill.length, 1);

  // ৩) শুধু জানালা-যুক্ত Word থাকলে (কোনো জানালা-হীন প্রসেস নেই): কিছুই ছাপবে না বা মারবে না
  const logsClean = [];
  const res3 = handleStaleWord({
    processes: [{ Id: 303, MainWindowTitle: 'report.docx - Word' }],
    kill: true,
    log: (m) => logsClean.push(m),
  });
  assert.deepEqual(res3, { stale: [], killed: [], message: '' });
  assert.deepEqual(logsClean, []);
});
