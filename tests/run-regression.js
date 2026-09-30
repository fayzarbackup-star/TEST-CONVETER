#!/usr/bin/env node
/**
 * Fayzar Layout Regression Runner (real, snapshot based)
 * ------------------------------------------------------
 *   node tests/run-regression.js            -> compare against tests/baseline/
 *   node tests/run-regression.js --update   -> (re)write baselines
 *   node tests/run-regression.js --only=cq  -> filter fixtures by substring
 *
 * Every fixture is pushed through the ACTIVE pipeline (classify -> parse ->
 * html / docx-xml / rtf) and the normalised output is diffed against a frozen
 * baseline. This is what lets us prove an EXAM_CQ change did not regress any
 * other layout.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const H = require('./lib/harness.js');

const args = process.argv.slice(2);
const UPDATE = args.includes('--update') || args.includes('-u');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';

const BASELINE_DIR = path.join(H.ROOT, 'tests', 'baseline');

function firstDiff(a, b) {
  const la = a.split('\n');
  const lb = b.split('\n');
  const max = Math.max(la.length, lb.length);
  for (let i = 0; i < max; i++) {
    if (la[i] !== lb[i]) {
      return {
        line: i + 1,
        baseline: la[i] === undefined ? '(missing line)' : la[i],
        actual: lb[i] === undefined ? '(missing line)' : lb[i]
      };
    }
  }
  return null;
}

(async function main() {
  console.log('Fayzar Layout Regression — snapshot suite\n');

  let engines;
  try {
    engines = H.loadEngines();
  } catch (e) {
    console.error('Engine load failed:', e.message);
    process.exit(1);
  }

  if (!fs.existsSync(BASELINE_DIR)) fs.mkdirSync(BASELINE_DIR, { recursive: true });

  const fixtures = H.listFixtures().filter((f) => !ONLY || f.id.includes(ONLY));
  if (fixtures.length === 0) {
    console.error('No fixtures matched.');
    process.exit(1);
  }

  let pass = 0;
  let fail = 0;
  let written = 0;
  const failures = [];

  for (const fx of fixtures) {
    const snapPath = path.join(BASELINE_DIR, `${fx.id}.snap.txt`);
    let actual;
    try {
      actual = await H.buildSnapshot(engines, fx);
    } catch (e) {
      fail++;
      failures.push(`${fx.id}: harness crash — ${e.message}`);
      console.log(`✗ ${fx.id}  (harness crash: ${e.message})`);
      continue;
    }

    if (UPDATE || !fs.existsSync(snapPath)) {
      fs.writeFileSync(snapPath, actual, 'utf8');
      written++;
      console.log(`↻ ${fx.id}  baseline written (${actual.split('\n').length} lines)`);
      continue;
    }

    const baseline = fs.readFileSync(snapPath, 'utf8');
    if (baseline === actual) {
      pass++;
      console.log(`✓ ${fx.id}  [${fx.docType || 'auto'}]`);
    } else {
      fail++;
      const d = firstDiff(baseline, actual);
      const msg = `${fx.id}: snapshot changed at line ${d.line}\n    baseline: ${d.baseline}\n    actual  : ${d.actual}`;
      failures.push(msg);
      console.log(`✗ ${msg}`);
      fs.writeFileSync(path.join(BASELINE_DIR, `${fx.id}.actual.txt`), actual, 'utf8');
    }
  }

  console.log('');
  if (written) {
    console.log(`Baselines written: ${written}. Re-run without --update to verify.`);
    process.exit(0);
  }

  console.log(`Summary: ${pass} passed, ${fail} failed, of ${fixtures.length} fixtures.`);
  if (fail) {
    console.log('\nFailed snapshots (see tests/baseline/*.actual.txt for full output):');
    failures.forEach((f) => console.log(' - ' + f));
    process.exit(1);
  }
  process.exit(0);
})();
