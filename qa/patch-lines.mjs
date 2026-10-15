// সাহায্যকারী: ফাইলের নির্দিষ্ট লাইন-পরিসর বদলানো (ইউনিকোড-নর্মালাইজেশনে Edit না মিললে)।
// চালানো: node qa/patch-lines.mjs <file> <from> <to> <replacement-file>   (১-ভিত্তিক, from..to সহ)
import fs from 'node:fs';
const [file, from, to, repFile] = process.argv.slice(2);
const lines = fs.readFileSync(file, 'utf8').split('\n');
const rep = fs.readFileSync(repFile, 'utf8').replace(/\n$/, '').split('\n');
lines.splice(Number(from) - 1, Number(to) - Number(from) + 1, ...rep);
fs.writeFileSync(file, lines.join('\n'));
console.log('patched', file, from + '-' + to, '→', rep.length, 'lines');
