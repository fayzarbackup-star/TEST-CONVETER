const fs = require('fs');
const JSZip = require('jszip');

async function test() {
    // Setup global scope
    global.JSZip = JSZip;
    eval(fs.readFileSync('js/layout-engine/md-layout-parser.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/builders/base-builder.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/builders/cq-builder.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/builders/mcq-builder.js', 'utf8'));
    eval(fs.readFileSync('js/layout-engine/docx-layout-builder.js', 'utf8'));

    const cqMarkdown = `---
institute: "ঢাকা মডেল কলেজ"
exam: "অর্ধ-বার্ষিক পরীক্ষা - ২০২৬"
layout:
  templateId: "creative-cq"
  orientation: "portrait"
  columns: 2
---

১। একটি স্প্রিং ধ্রুবক $k = 500 N/m$। একটি ভর $m = 2 kg$ স্প্রিংটির সাথে যুক্ত করা হলো।
(ক) স্প্রিং ধ্রুবক কী?
`;

    const ast = MdLayoutParser.parse(cqMarkdown);
    const layout = ast.metadata.layout || {};
    const archetypeId = (layout.profile && layout.profile.archetypeId) || '';
    
    console.log("layout object from AST:", layout);
    console.log("isCq evaluating to:", archetypeId === 'bengali_cq_paper' || layout.templateId === 'bengali-cq-paper' || layout.templateId === 'bengali_cq_paper' || layout.templateId === 'creative-cq' || layout.templateId === 'question-2col');
}

test().catch(console.error);
