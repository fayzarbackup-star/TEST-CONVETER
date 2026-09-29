(function(global) {
  'use strict';

  class CqBuilder {
    static buildBody(parsedAst, isBijoy, isPureEnglish, layout) {
      let xml = '';
      const meta = parsedAst.metadata || {};
      
      const isLandscape = layout.orientation === 'landscape';
      
      if (isLandscape) {
        // Landscape CQ Paper (Booklet) starts with a column break BEFORE the header
        // to skip the left column (back page) and start on the right column (front page).
        xml += `
        <w:p>
          <w:r><w:br w:type="column"/></w:r>
        </w:p>`;
      }

      // Generate standard academic header
      xml += BaseBuilder.generateAcademicHeader(meta, layout, isBijoy, isPureEnglish);

      if (!isLandscape && layout.columns === 2) {
        // Portrait 2-column needs a continuous break after header
        xml += `
        <w:p>
          <w:pPr>
            <w:sectPr>
              <w:type w:val="continuous"/>
              ${layout.orientation === 'landscape' ? '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>' : '<w:pgSz w:w="11906" w:h="16838"/>'}
              <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/>
              <w:cols w:num="1" w:space="720"/>
              <w:docGrid w:linePitch="360"/>
            </w:sectPr>
          </w:pPr>
        </w:p>`;
      }

      // Generate Blocks
      const bodySz = layout.effectiveBodySz || '24';
      const rightTabPos = isLandscape ? '7050' : (layout.columns === 2 ? '5130' : '10460');

      for (const block of parsedAst.blocks) {
        if (block.type === 'section_header' || block.type === 'header') {
          xml += `
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
            ${BaseBuilder.renderSmartRuns(block.text, isBijoy, true, false, '26', isPureEnglish)}
          </w:p>`;
        } else if (block.type === 'question') {
          // IMPORTANT: Word requires a tab character after the number for hanging indent to work!
          const qText = (block.id ? block.id + '\t' : '') + (block.text || '');
          
          if (block.stimulus) {
            // CQ Stimulus block (No border, just indent)
            xml += `
            <w:p>
              <w:pPr>
                <w:ind w:left="432" w:hanging="432"/>
                <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
                <w:jc w:val="both"/>
              </w:pPr>
              ${BaseBuilder.renderSmartRuns(qText, isBijoy, true, false, bodySz, isPureEnglish)}
            </w:p>`;

            // Render stimulus text
            const stimulusParts = block.stimulus.split('\\n');
            for (const sp of stimulusParts) {
              if (!sp.trim()) continue;
              xml += `
              <w:p>
                <w:pPr>
                  <w:ind w:left="360"/>
                  <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
                  <w:jc w:val="both"/>
                </w:pPr>
                ${BaseBuilder.renderSmartRuns(sp, isBijoy, false, false, bodySz, isPureEnglish)}
              </w:p>`;
            }
          } else {
            // Direct question
            xml += `
            <w:p>
              <w:pPr>
                <w:ind w:left="432" w:hanging="432"/>
                <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
                <w:jc w:val="both"/>
              </w:pPr>
              ${BaseBuilder.renderSmartRuns(qText, isBijoy, true, false, bodySz, isPureEnglish)}
            </w:p>`;
          }

          // Sub-questions
          if (block.subQuestions) {
            for (const sq of block.subQuestions) {
              const sqLabel = sq.subId ? sq.subId + '\t' : '';
              const markTab = sq.marks ? `<w:r><w:tab/></w:r>${BaseBuilder.renderSmartRuns('[' + sq.marks + ']', isBijoy, false, false, bodySz, isPureEnglish)}` : '';
              
              xml += `
              <w:p>
                <w:pPr>
                  <w:ind w:left="864" w:hanging="432"/>
                  <w:tabs>
                    <w:tab w:val="right" w:pos="${rightTabPos}"/>
                  </w:tabs>
                  <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
                  <w:jc w:val="both"/>
                </w:pPr>
                ${BaseBuilder.renderSmartRuns(sqLabel + (sq.text || ''), isBijoy, false, false, bodySz, isPureEnglish)}
                ${markTab}
              </w:p>`;
            }
          }
        }
      }

      // Add Final Section Properties
      xml += BaseBuilder.generateSectionProperties(layout);
      
      return xml;
    }
  }

  global.CqBuilder = CqBuilder;
})(typeof window !== 'undefined' ? window : globalThis);
