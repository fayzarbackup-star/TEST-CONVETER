const fs = require('fs');
global.JSZip = require('jszip');
eval(fs.readFileSync('js/layout-engine/md-layout-parser.js', 'utf8'));
eval(fs.readFileSync('js/layout-engine/builders/base-builder.js', 'utf8'));
eval(fs.readFileSync('js/layout-engine/builders/cq-builder.js', 'utf8'));
eval(fs.readFileSync('js/layout-engine/docx-layout-builder.js', 'utf8'));

const cqMarkdown = `---
institute: "ঢাকা মডেল কলেজ"
exam: "অর্ধ-বার্ষিক পরীক্ষা - ২০২৬"
grade: "শ্রেণিঃ দ্বাদশ"
subject: "বিষয়ঃ পদার্থবিজ্ঞান ১ম পত্র"
time: "২ ঘণ্টা ৩০ মিনিট"
fullMarks: "৫০"
subjectCode: "১৭৪"
layout:
  templateId: "creative-cq"
  orientation: "portrait"
  columns: 2
---

১। একটি প্রশ্ন
(ক) ক
(খ) খ
`;

const ast = globalThis.MdLayoutParser.parse(cqMarkdown);
console.log('Before build:', ast.metadata.layout);
globalThis.DocxLayoutBuilder.build(ast).then(buf => {
    fs.writeFileSync('test.docx', Buffer.from(buf));
    
    // Read the document.xml from the buffer to inspect it
    global.JSZip.loadAsync(buf).then(zip => {
        zip.file('word/document.xml').async('string').then(xml => {
            const match = xml.match(/<w:sectPr>[\s\S]*?<\/w:sectPr>/g);
            console.log("SECT PRs:", match);
        });
    });
}).catch(console.error);
