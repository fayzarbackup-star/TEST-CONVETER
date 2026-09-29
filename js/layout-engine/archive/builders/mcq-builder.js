(function(global) {
  'use strict';

  class McqBuilder {
    static buildBody(parsedAst, isBijoy, isPureEnglish, layout) {
      let xml = '';
      const meta = parsedAst.metadata || {};
      
      let pgSz = '<w:pgSz w:w="11906" w:h="16838"/>'; // A4
      if (layout.orientation === 'landscape') {
        pgSz = '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>';
      }
      
      let top = 720, bottom = 720, left = 720, right = 720;
      if (layout.margins) {
        top = Math.round((layout.margins.top || 0.5) * 1440);
        bottom = Math.round((layout.margins.bottom || 0.5) * 1440);
        left = Math.round((layout.margins.left || 0.5) * 1440);
        right = Math.round((layout.margins.right || 0.5) * 1440);
      }

      // MCQ Headers are always 1 column.
      // So we generate the header, then a continuous section break, then the questions in 2 columns.
      xml += BaseBuilder.generateAcademicHeader(meta, layout, isBijoy, isPureEnglish);

      // Section Break - Header is 1 column, Questions are 2 columns.
      xml += `
      <w:p>
        <w:pPr>
          <w:sectPr>
            <w:type w:val="continuous"/>
            ${pgSz}
            <w:pgMar w:top="${top}" w:right="${right}" w:bottom="${bottom}" w:left="${left}" w:header="720" w:footer="720" w:gutter="0"/>
            <w:cols w:num="1" w:space="720"/>
            <w:docGrid w:linePitch="360"/>
          </w:sectPr>
        </w:pPr>
      </w:p>`;

      // Adjust Font Size for MCQ if it's too dense (Dynamic sizing from original code)
      const totalQuestionsCount = parsedAst.blocks.filter(b => b.type === 'question').length;
      let mcqBodySz = '24';
      if (totalQuestionsCount > 28 && totalQuestionsCount <= 32) {
        mcqBodySz = '22'; // 11pt
      } else if (totalQuestionsCount > 25 && totalQuestionsCount <= 28) {
        mcqBodySz = '23'; // 11.5pt
      }
      layout.effectiveBodySz = mcqBodySz;

      // Generate Blocks
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
          const options = BaseBuilder.extractMcqOptions(block.subQuestions);

          // Question Prompt
          xml += `
          <w:p>
            <w:pPr>
              <w:ind w:left="432" w:hanging="432"/>
              <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
              <w:jc w:val="both"/>
            </w:pPr>
            ${BaseBuilder.renderSmartRuns(qText, isBijoy, false, false, mcqBodySz, isPureEnglish)}
          </w:p>`;

          // Any non-option prompt text before options
          if (block.subQuestions) {
            for (const sq of block.subQuestions) {
              if (sq.isPromptText) {
                xml += `
                <w:p>
                  <w:pPr>
                    <w:ind w:left="360"/>
                    <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
                    <w:jc w:val="both"/>
                  </w:pPr>
                  ${BaseBuilder.renderSmartRuns((sq.subId ? sq.subId + ' ' : '') + sq.text, isBijoy, false, false, mcqBodySz, isPureEnglish)}
                </w:p>`;
              }
            }
          }

          // Options
          if (options) {
            xml += BaseBuilder.formatMcqOptionsXml(options, isBijoy, isPureEnglish, mcqBodySz, layout);
          }
        }
      }

      // Add Final Section Properties (Forcing 2 columns for MCQ Questions)
      
      xml += `
      <w:sectPr>
        <w:type w:val="continuous"/>
        ${pgSz}
        <w:pgMar w:top="${top}" w:right="${right}" w:bottom="${bottom}" w:left="${left}" w:header="720" w:footer="720" w:gutter="0"/>
        <w:cols w:num="2" w:space="288" w:sep="1" w:equalWidth="1"/>
        <w:docGrid w:linePitch="360"/>
      </w:sectPr>`;
      
      return xml;
    }
  }

  global.McqBuilder = McqBuilder;
})(typeof window !== 'undefined' ? window : globalThis);
