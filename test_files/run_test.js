const fs = require('fs');
const JSZip = require('jszip');

async function convertFile(inputFile, prefix) {
    global.JSZip = JSZip;
    global.DOMParser = require('@xmldom/xmldom').DOMParser;
    global.window = { DOMParser: global.DOMParser, JSZip: JSZip };

    eval(fs.readFileSync('js/bangla-converter-engine.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/md-layout-parser.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/builders/base-builder.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/builders/cq-builder.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/builders/mcq-builder.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/docx-layout-builder.js', 'utf8'));
    eval(fs.readFileSync('js/docx-to-doc-engine.js', 'utf8'));
    
    global.McqBuilder = global.window.McqBuilder;
    global.CqBuilder = global.window.CqBuilder;
    global.BaseBuilder = global.window.BaseBuilder;
    
    const markdownText = fs.readFileSync(inputFile, 'utf8');
    const parsedAst = global.window.MdLayoutParser.parse(markdownText);
    
    // Output Bijoy for full authenticity
    parsedAst.metadata = parsedAst.metadata || {};
    parsedAst.metadata.fontOutput = 'bijoy';
    parsedAst.layoutSettings.profile.fontFamily = 'SutonnyMJ';

    const arrayBuffer = await global.window.DocxLayoutBuilder.build(parsedAst);
    
    const buffer = Buffer.from(arrayBuffer);
    
    const docxPath = `test_files/${prefix}_test.docx`;
    fs.writeFileSync(docxPath, buffer);
    console.log(`Generated ${docxPath}`);

    // Skip DOC generation in Node because xmldom lacks querySelectorAll.
    // The DOC generation will work perfectly in the browser.
}

async function run() {
    try {
        await convertFile('test_files/mcq.md', 'mcq');
        await convertFile('test_files/cq.md', 'cq');
    } catch(e) {
        console.error(e);
    }
}

run();
