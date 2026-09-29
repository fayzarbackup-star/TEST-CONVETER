(function(global) {
  'use strict';

  class DocxLayoutBuilder {
    
    /**
     * Entry point for generating DOCX ArrayBuffer.
     * Core Router: Determines which sub-engine to use based on AST and layout.
     */
    static async build(parsedAst) {
      const JSZip = (typeof window !== 'undefined' && window.JSZip) ? window.JSZip : global.JSZip;
      if (!JSZip) throw new Error("JSZip is not loaded. Cannot generate DOCX.");

      const isBijoy = (parsedAst.layoutSettings && parsedAst.layoutSettings.profile && parsedAst.layoutSettings.profile.fontFamily === 'SutonnyMJ') || (parsedAst.metadata && parsedAst.metadata.fontOutput !== 'unicode');
      const isPureEnglish = !(typeof BaseBuilder !== 'undefined' ? BaseBuilder.hasBengali(parsedAst) : false);

      // Use the pre-computed layoutSettings from AST instead of raw YAML metadata
      const layout = parsedAst.layoutSettings || {
        pageSize: 'A4',
        orientation: 'portrait',
        columns: 1,
        templateId: ''
      };

      const archetypeId = (layout.profile && layout.profile.archetypeId) || '';

      // Determine the specific layout to use based strictly on metadata (No auto-guessing)
      let docBodyXml = '';
      
      const isMcq = archetypeId === 'bengali_mcq_paper' || layout.templateId === 'mcq-grid' || layout.templateId === 'bengali-mcq-paper' || layout.templateId === 'bengali_mcq_paper';
      const isCq = archetypeId === 'bengali_cq_paper' || layout.templateId === 'bengali-cq-paper' || layout.templateId === 'bengali_cq_paper' || layout.templateId === 'creative-cq' || layout.templateId === 'question-2col';
      
      if (isMcq) {
        layout.orientation = 'portrait';
        layout.columns = 2;
        if (typeof McqBuilder !== 'undefined') {
          docBodyXml = McqBuilder.buildBody(parsedAst, isBijoy, isPureEnglish, layout);
        } else {
          console.warn("McqBuilder not found! Falling back to empty body.");
        }
      } else if (isCq) {
        layout.orientation = 'landscape';
        layout.columns = 2;
        if (typeof CqBuilder !== 'undefined') {
          docBodyXml = CqBuilder.buildBody(parsedAst, isBijoy, isPureEnglish, layout);
        } else {
          console.warn("CqBuilder not found! Falling back to empty body.");
        }
      } else {
        // Fallback or Generic Layout (Defaulting to CQ logic for now until more engines are built)
        if (typeof CqBuilder !== 'undefined') {
          docBodyXml = CqBuilder.buildBody(parsedAst, isBijoy, isPureEnglish, layout);
        }
      }

      // Assemble final document.xml
      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:o="urn:schemas-microsoft-com:office:office">
  <w:body>
    ${docBodyXml}
  </w:body>
</w:document>`;

      const zip = new JSZip();
      
      // Add standard OOXML files
      zip.file("[Content_Types].xml", DocxLayoutBuilder.getContentTypesXml());
      zip.folder("_rels").file(".rels", DocxLayoutBuilder.getRootRelsXml());
      const wordFolder = zip.folder("word");
      wordFolder.file("document.xml", documentXml);
      wordFolder.file("styles.xml", DocxLayoutBuilder.getStylesXml(isPureEnglish ? 'Times New Roman' : (isBijoy ? 'SutonnyMJ' : 'Kalpurush')));
      wordFolder.folder("_rels").file("document.xml.rels", DocxLayoutBuilder.getDocumentRelsXml());
      const outputType = (typeof window !== 'undefined' && typeof window.Blob !== 'undefined') ? 'blob' : 'nodebuffer';
      return await zip.generateAsync({ 
        type: outputType, 
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE", 
        compressionOptions: { level: 9 } 
      });
    }

    // --- Standard OOXML Boilerplate Part XMLs ---

    static getContentTypesXml() {
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
    }

    static getRootRelsXml() {
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
    }

    static getDocumentRelsXml() {
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
    }

    static getStylesXml(defaultFont = 'Times New Roman') {
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${defaultFont}" w:hAnsi="${defaultFont}" w:cs="${defaultFont}"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr>
      <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
    </w:pPr>
  </w:style>
</w:styles>`;
    }
  }

  global.DocxLayoutBuilder = DocxLayoutBuilder;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocxLayoutBuilder;
  }

})(typeof window !== 'undefined' ? window : globalThis);
