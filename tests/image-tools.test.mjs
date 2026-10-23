// পর্ব ১গ: js/image-tools.js-এর গণিত (ঘোরানো-মাপ, ২ পাতা ভাগ, নাম-প্রত্যয়)
import { createRequire } from 'node:module';
const T = createRequire(import.meta.url)('../js/image-tools.js');
let pass = 0, fail = 0;
const eq = (n, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('FAIL', n, JSON.stringify(a), '!=', JSON.stringify(b)); } };

eq('rot dims', T.rotatedDims(300, 200), { w: 200, h: 300 });
eq('rot twice', T.rotatedDims(T.rotatedDims(300, 200).w, T.rotatedDims(300, 200).h), { w: 300, h: 200 });
eq('split even', T.splitRects(1000, 600), [{ x: 0, y: 0, w: 500, h: 600 }, { x: 500, y: 0, w: 500, h: 600 }]);
eq('split odd', T.splitRects(1001, 600), [{ x: 0, y: 0, w: 500, h: 600 }, { x: 500, y: 0, w: 501, h: 600 }]);
const r = T.splitRects(1234, 99);
eq('split covers width', r[0].w + r[1].w, 1234);
eq('split adjacent', r[0].x + r[0].w, r[1].x);
eq('name png', T.suffixName('scan.png', '_r90', 'jpg'), 'scan_r90.jpg');
eq('name chain', T.suffixName('scan_r90.jpg', '_r90', 'jpg'), 'scan_r90_r90.jpg');
eq('name split', T.suffixName('a b.JPEG', '_L', 'jpg'), 'a b_L.jpg');
eq('name noext', T.suffixName('page', '_R', 'jpg'), 'page_R.jpg');
console.log(`image-tools: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
