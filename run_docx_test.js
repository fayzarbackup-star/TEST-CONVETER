const fs = require('fs');
const JSZip = require('jszip');

async function test() {
    global.JSZip = JSZip;
    eval(fs.readFileSync('js/layout-engine/md-layout-parser.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/builders/base-builder.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/builders/cq-builder.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/builders/mcq-builder.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/docx-layout-builder.js', 'utf8'));

    const mcqMarkdown = `---
layout:
  templateId: "mcq-grid"
---

১। নিচের কোনটি সঠিক?
(ক) অপশন ১ (খ) অপশন ২
(গ) অপশন ৩ (ঘ) অপশন ৪
`;

    const ast = MdLayoutParser.parse(mcqMarkdown);
    console.log("INITIAL layoutSettings:", JSON.stringify(ast.layoutSettings));
    const buf = await DocxLayoutBuilder.build(ast);
    fs.writeFileSync('test_mcq_debug.docx', Buffer.from(buf));
    
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml').async('string');
    console.log("SECT PR COUNT:", (xml.match(/<w:sectPr>/g) || []).length);
    console.log(xml.match(/<w:sectPr>[\s\S]*?<\/w:sectPr>/g));
}

test().catch(console.error);
