const fs = require('fs');
global.window = global;
eval(fs.readFileSync('js/equation-converter.js', 'utf8'));
const trp = require('./js/layout-engine/text-run-processor.js');

const runs = trp.processTextRuns('text $$ \\frac{1}{2} $$', { generateOmml: true });
console.log('Runs:', runs);
