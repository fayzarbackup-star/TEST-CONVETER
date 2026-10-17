import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

async function testA05() {
  console.log('Starting serve.js on port 3008...');
  const server = spawn(process.execPath, ['serve.js'], { stdio: 'pipe' });
  
  await new Promise(r => setTimeout(r, 2000));

  const pdfPath = path.join(process.env.USERPROFILE, 'Downloads', 'AS it IS', '278_TR-13.pdf');
  const outDir = path.resolve('qa/golden-data/asis/a05');

  console.log('Running qa/faithful-e2e.mjs on a05...');
  const e2e = spawn(process.execPath, ['qa/faithful-e2e.mjs', pdfPath, outDir], { stdio: 'pipe' });

  let stdout = '';
  let stderr = '';
  e2e.stdout.on('data', d => stdout += d);
  e2e.stderr.on('data', d => stderr += d);

  e2e.on('close', (code) => {
    console.log('E2E Process exited with code:', code);
    console.log('--- STDOUT ---');
    console.log(stdout);
    console.log('--- STDERR ---');
    console.log(stderr);
    
    // Kill server cleanly
    server.kill();
    process.exit(code);
  });
}

testA05().catch(err => {
  console.error(err);
  process.exit(1);
});
