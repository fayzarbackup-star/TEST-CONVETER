/**
 * ============================================================================
 * Fayzar Auto-Layout Markdown Engine (AST Parser & Multi-Target Layout Renderer)
 * ============================================================================
 * Features:
 * 1. Token-Shielding: Protects all LaTeX math ($...$, $$...$$, `$math$`) so math is never altered.
 * 2. Markdown Parsing: Headings (#, ##), Creative Question Stimulus (> Blockquote), Tables (|---|).
 * 3. Dynamic MCQ Grids: Automatically computes 4-col, 2-col, or 1-col layouts for (ক, খ, গ, ঘ).
 * 4. Multi-Target Rendering: Emits clean OOXML for .docx and Mso-HTML for Word 2003 .doc.
 * ============================================================================
 */

(function (global) {
  'use strict';

  class MarkdownLayoutEngine {
    constructor() {
      this.mathTokens = [];
    }

    /**
     * Shield equations so LaTeX and inline code backticks are never mutilated by markdown regex
     */
    shieldEquations(markdownText) {
      this.mathTokens = [];
      let text = markdownText || '';

      // 1. Backtick-wrapped LaTeX: `` `$CaCO_3$` `` or `$$math$$`
      text = text.replace(/`(\$\$?[\s\S]*?\$\$?)`/g, (match, innerMath) => {
        const idx = this.mathTokens.length;
        this.mathTokens.push(innerMath.trim());
        return `___MATH_TOKEN_${idx}___`;
      });

      // 2. Block display math: $$ ... $$ or \[ ... \]
      text = text.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g, (match) => {
        const idx = this.mathTokens.length;
        this.mathTokens.push(match.trim());
        return `___MATH_TOKEN_${idx}___`;
      });

      // 3. Inline math: $ ... $ or \( ... \)
      text = text.replace(/(\$[^\$\n]+?\$|\\\([^\n]+?\\\))/g, (match) => {
        const idx = this.mathTokens.length;
        this.mathTokens.push(match.trim());
        return `___MATH_TOKEN_${idx}___`;
      });

      return text;
    }

    /**
     * Restore shielded equation tokens
     */
    unshieldText(text) {
      if (!text) return '';
      return text.replace(/___MATH_TOKEN_(\d+)___/g, (match, idx) => {
        return this.mathTokens[parseInt(idx, 10)] || match;
      });
    }

    /**
     * Parse raw markdown string into structural document blocks
     */
    parse(markdownText) {
      if (!markdownText || !markdownText.trim()) return [];

      const shielded = this.shieldEquations(markdownText);
      const lines = shielded.replace(/\r/g, '').split('\n');
      const blocks = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
          i++;
          continue;
        }

        // 1. Headings: # (Title), ## (Main Question/Section), ### (Sub-part)
        const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          blocks.push({
            type: 'heading',
            level: level,
            text: this.unshieldText(headingMatch[2].trim())
          });
          i++;
          continue;
        }

        // 2. Blockquote / Creative Question Stem (উদ্দীপক): > ...
        if (trimmed.startsWith('>')) {
          const quoteLines = [];
          while (i < lines.length && lines[i].trim().startsWith('>')) {
            quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
            i++;
          }
          blocks.push({
            type: 'blockquote',
            text: this.unshieldText(quoteLines.join(' '))
          });
          continue;
        }

        // 3. Markdown Tables: | Col 1 | Col 2 |
        if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
          const tableLines = [];
          while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
            tableLines.push(lines[i].trim());
            i++;
          }

          const rows = [];
          for (const tLine of tableLines) {
            // Ignore separator line |---|---|
            if (/^\|[\s\-:]+(\|[\s\-:]+)+\|$/.test(tLine)) continue;
            const cells = tLine.split('|').slice(1, -1).map(c => this.unshieldText(c.trim()));
            if (cells.length > 0) rows.push(cells);
          }

          if (rows.length > 0) {
            blocks.push({ type: 'table', rows });
            continue;
          }
        }

        // 4. MCQ Options: [Tab]ক. [Tab]খ. or ক. ... খ. ...
        const isMcqCandidate = /(?:\[Tab\]|\t|\s{2,})?(?:[\(（]?[ক-ঘa-dA-D][\)）\.]|\b[ক-ঘa-dA-D]\.)\s+/g.test(trimmed);
        if (isMcqCandidate) {
          const options = this.parseMcqOptions(trimmed);
          if (options && options.length >= 2) {
            blocks.push({
              type: 'mcq_options',
              options: options.map(opt => this.unshieldText(opt))
            });
            i++;
            continue;
          }
        }

        // 5. CQ Sub-Question: (ক) ... [১] or ক. ... ১ or ক. ...
        const cqSubMatch = trimmed.match(/^([\(（]?[ক-ঘ][\)）\.]|[ক-ঘ]\.)\s+(.+?)(?:\s+[\[\(]?([১-৪1-4])[\]\)]?)?$/);
        if (cqSubMatch) {
          blocks.push({
            type: 'cq_sub_question',
            label: cqSubMatch[1],
            text: this.unshieldText(cqSubMatch[2].trim()),
            marks: cqSubMatch[3] ? this.unshieldText(cqSubMatch[3].trim()) : ''
          });
          i++;
          continue;
        }

        // 6. Question Stem / Number: ১। ... or ১. ... or প্রশ্ন ১:
        const qStemMatch = trimmed.match(/^([\u09E7-\u09EF\d]+[।\.]|\bপ্রশ্ন\s*[\u09E7-\u09EF\d]+[:।\.]?)\s*(.*)$/);
        if (qStemMatch && qStemMatch[2]) {
          blocks.push({
            type: 'question_stem',
            number: qStemMatch[1],
            text: this.unshieldText(qStemMatch[2].trim())
          });
          i++;
          continue;
        }

        // 7. Standard paragraph line
        blocks.push({
          type: 'paragraph',
          text: this.unshieldText(line)
        });
        i++;
      }

      return blocks;
    }

    /**
     * Splits an MCQ line into individual option tokens
     */
    parseMcqOptions(line) {
      const normalized = (line || '').replace(/\[Tab\]/gi, '\t').trim();
      const optionRegex = /(?:^|\t|\s{2,})([\(（]?[ক-ঘa-dA-D][\)）\.]|\b[ক-ঘa-dA-D]\.)\s*/g;

      const matches = [];
      let match;
      while ((match = optionRegex.exec(normalized)) !== null) {
        const label = match[1];
        const optionStart = match.index + match[0].indexOf(label);
        matches.push({ index: optionStart, label: label });
      }

      if (matches.length < 2) return null;

      const options = [];
      for (let j = 0; j < matches.length; j++) {
        const start = matches[j].index;
        const end = (j + 1 < matches.length) ? matches[j + 1].index : normalized.length;
        const optText = normalized.substring(start, end).replace(/\t+$/, '').trim();
        if (optText) options.push(optText);
      }
      return options;
    }

    /**
     * Render parsed AST blocks to Modern Word (.docx / OOXML) body XML
     */
    renderToOoxml(blocks, isBijoy, fontSizeHalfPt, printableWidth, renderRunsForOoxmlFn) {
      let bodyXml = '';

      for (const block of blocks) {
        if (block.type === 'heading') {
          // # -> 18pt bold center, ## -> 15pt bold left, ### -> 13pt bold left
          let sz = fontSizeHalfPt + 8;
          let jc = 'left';
          let spBefore = 180;
          let spAfter = 80;

          if (block.level === 1) {
            sz = fontSizeHalfPt + 12; // ~18pt
            jc = 'center';
            spBefore = 240;
            spAfter = 120;
          } else if (block.level === 2) {
            sz = fontSizeHalfPt + 6; // ~15pt
            spBefore = 200;
            spAfter = 100;
          }

          const runs = renderRunsForOoxmlFn(block.text, isBijoy, sz);
          bodyXml += `    <w:p>
      <w:pPr>
        <w:jc w:val="${jc}"/>
        <w:spacing w:before="${spBefore}" w:after="${spAfter}" w:line="260" w:lineRule="auto"/>
        <w:rPr><w:b/><w:bCs/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>
      </w:pPr>
${runs}    </w:p>\n`;

        } else if (block.type === 'blockquote') {
          // Creative question stimulus: indented with subtle green left bar
          const runs = renderRunsForOoxmlFn(block.text, isBijoy, fontSizeHalfPt);
          bodyXml += `    <w:p>
      <w:pPr>
        <w:ind w:left="480" w:right="240"/>
        <w:pBdr>
          <w:left w:val="single" w:sz="18" w:space="10" w:color="059669"/>
        </w:pBdr>
        <w:spacing w:before="80" w:after="100" w:line="240" w:lineRule="auto"/>
      </w:pPr>
${runs}    </w:p>\n`;

        } else if (block.type === 'mcq_options') {
          // Dynamic 4-col, 2-col, or 1-col borderless grid
          const opts = block.options;
          const maxLen = Math.max(...opts.map(o => o.length));
          let colsCount = 4;
          if (maxLen > 32) colsCount = 1;
          else if (maxLen > 15 || opts.length !== 4) colsCount = 2;

          const colWidth = Math.floor(printableWidth / colsCount);
          const gridColsXml = Array(colsCount).fill(0).map(() => `<w:gridCol w:w="${colWidth}"/>`).join('');

          const rows = [];
          for (let idx = 0; idx < opts.length; idx += colsCount) {
            rows.push(opts.slice(idx, idx + colsCount));
          }

          let rowsXml = '';
          for (const row of rows) {
            let cellsXml = '';
            for (let c = 0; c < colsCount; c++) {
              const optText = row[c] || '';
              const runs = optText ? renderRunsForOoxmlFn(optText, isBijoy, fontSizeHalfPt) : '            <w:r><w:t xml:space="preserve"> </w:t></w:r>';
              cellsXml += `        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${colWidth}" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
            </w:tcBorders>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/>
            </w:pPr>
${runs}
          </w:p>
        </w:tc>\n`;
            }
            rowsXml += `      <w:tr>\n${cellsXml}      </w:tr>\n`;
          }

          bodyXml += `    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="${printableWidth}" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
          <w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>${gridColsXml}</w:tblGrid>
${rowsXml}    </w:tbl>\n`;

        } else if (block.type === 'table') {
          // Standard table with borders
          const rows = block.rows;
          if (rows.length === 0) continue;
          const maxCols = Math.max(...rows.map(r => r.length));
          const colWidth = Math.floor(printableWidth / maxCols);

          const gridColsXml = Array(maxCols).fill(0).map(() => `<w:gridCol w:w="${colWidth}"/>`).join('');
          const rowsXml = rows.map((row, rIdx) => {
            const isHeader = (rIdx === 0);
            const trPr = isHeader ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
            const cellsXml = Array(maxCols).fill(0).map((_, c) => {
              const cellText = row[c] || '';
              const cellRuns = renderRunsForOoxmlFn(cellText, isBijoy, fontSizeHalfPt);
              return `        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${colWidth}" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            </w:tcBorders>
            <w:vAlign w:val="top"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
            </w:pPr>
${cellRuns || '            <w:r><w:t xml:space="preserve"> </w:t></w:r>'}
          </w:p>
        </w:tc>`;
            }).join('\n');

            return `      <w:tr>${trPr}\n${cellsXml}\n      </w:tr>`;
          }).join('\n');

          bodyXml += `    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>${gridColsXml}</w:tblGrid>
${rowsXml}
    </w:tbl>\n`;

        } else if (block.type === 'cq_sub_question') {
          // Creative question sub-part (ক, খ, গ, ঘ) with right-aligned marks
          const labelRuns = renderRunsForOoxmlFn(block.label, isBijoy, fontSizeHalfPt, true);
          const textRuns = renderRunsForOoxmlFn(' ' + block.text, isBijoy, fontSizeHalfPt, false);
          let marksXml = '';
          if (block.marks) {
            const marksRuns = renderRunsForOoxmlFn(block.marks, isBijoy, fontSizeHalfPt, true);
            marksXml = `      <w:r><w:tab/></w:r>\n${marksRuns}`;
          }
          bodyXml += `    <w:p>
      <w:pPr>
        <w:tabs>
          <w:tab w:val="right" w:pos="${printableWidth}"/>
        </w:tabs>
        <w:ind w:left="480" w:hanging="480"/>
        <w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/>
      </w:pPr>
${labelRuns}${textRuns}${marksXml}    </w:p>\n`;

        } else if (block.type === 'question_stem') {
          // Question header: ১। or ১. with extra top spacing
          const numRuns = renderRunsForOoxmlFn(block.number, isBijoy, fontSizeHalfPt, true);
          const textRuns = block.text ? renderRunsForOoxmlFn(' ' + block.text, isBijoy, fontSizeHalfPt, false) : '';
          bodyXml += `    <w:p>
      <w:pPr>
        <w:spacing w:before="140" w:after="40" w:line="240" w:lineRule="auto"/>
      </w:pPr>
${numRuns}${textRuns}    </w:p>\n`;

        } else if (block.type === 'paragraph') {
          const trimmed = (block.text || '').trim();
          if (!trimmed) continue;
          const runs = renderRunsForOoxmlFn(block.text, isBijoy, fontSizeHalfPt);
          bodyXml += `    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      </w:pPr>
${runs}    </w:p>\n`;
        }
      }

      return bodyXml;
    }

    /**
     * Render parsed AST blocks to Word 2003 (.doc / Mso-HTML)
     */
    renderToWord2003Html(blocks, isBijoy, fontName, baseFontSizePt, renderFormattedRunFn) {
      const htmlBlocks = [];

      for (const block of blocks) {
        if (block.type === 'heading') {
          let fs = baseFontSizePt + 4;
          let align = 'left';
          let extraStyle = 'font-weight:bold;margin-top:6pt;margin-bottom:4pt;';

          if (block.level === 1) {
            fs = baseFontSizePt + 6; // 18pt
            align = 'center';
            extraStyle = 'font-weight:bold;margin-top:10pt;margin-bottom:6pt;text-align:center;';
          } else if (block.level === 2) {
            fs = baseFontSizePt + 3; // 15pt
            extraStyle = 'font-weight:bold;margin-top:8pt;margin-bottom:4pt;';
          }

          const rendered = renderFormattedRunFn(block.text);
          htmlBlocks.push(`<p class="MsoNormal" align="${align}" style="margin:0cm;margin-bottom:.0001pt;font-size:${fs}pt;font-family:'${fontName}',Arial,sans-serif;${extraStyle}">${rendered}</p>`);

        } else if (block.type === 'blockquote') {
          const rendered = renderFormattedRunFn(block.text);
          htmlBlocks.push(`<p class="MsoNormal" style="margin:0cm;margin-left:24pt;margin-right:12pt;margin-bottom:.0001pt;border-left:2.25pt solid #059669;padding-left:8pt;font-size:${baseFontSizePt}pt;font-family:'${fontName}',Arial,sans-serif;line-height:normal;">${rendered}</p>`);

        } else if (block.type === 'mcq_options') {
          const opts = block.options;
          const maxLen = Math.max(...opts.map(o => o.length));
          let colsCount = 4;
          if (maxLen > 32) colsCount = 1;
          else if (maxLen > 15 || opts.length !== 4) colsCount = 2;

          const colPercent = (100 / colsCount).toFixed(2);
          const rows = [];
          for (let idx = 0; idx < opts.length; idx += colsCount) {
            rows.push(opts.slice(idx, idx + colsCount));
          }

          let tableHtml = `<table border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:none;mso-border-alt:none;width:100%;margin:2pt 0 4pt 0;">\n`;
          for (const row of rows) {
            tableHtml += `  <tr>\n`;
            for (let c = 0; c < colsCount; c++) {
              const optText = row[c] || '';
              const rendered = optText ? renderFormattedRunFn(optText) : '&nbsp;';
              tableHtml += `    <td width="${colPercent}%" valign="top" style="width:${colPercent}%;border:none;padding:2pt 4pt;">\n`;
              tableHtml += `      <p class="MsoNormal" style="margin:0cm;margin-bottom:.0001pt;font-size:${baseFontSizePt}pt;font-family:'${fontName}',Arial,sans-serif;">${rendered}</p>\n`;
              tableHtml += `    </td>\n`;
            }
            tableHtml += `  </tr>\n`;
          }
          tableHtml += `</table>`;
          htmlBlocks.push(tableHtml);

        } else if (block.type === 'table') {
          const rows = block.rows;
          if (rows.length === 0) continue;
          let tableHtml = `<table class="MsoTableGrid" border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:none;mso-border-alt:solid windowtext .5pt;margin:4pt auto;width:100%;">\n`;
          for (const row of rows) {
            tableHtml += `  <tr>\n`;
            for (const cell of row) {
              const renderedCell = renderFormattedRunFn(cell);
              tableHtml += `    <td class="MsoTableCell" valign="top" style="border:solid windowtext 1.0pt;mso-border-alt:solid windowtext .5pt;padding:2.0pt 5.4pt;">\n`;
              tableHtml += `      <p class="MsoNormal" align="center" style="margin:0cm;margin-bottom:.0001pt;text-align:center;font-size:${baseFontSizePt}pt;font-family:'${fontName}',Arial,sans-serif;">${renderedCell || '&nbsp;'}</p>\n`;
              tableHtml += `    </td>\n`;
            }
            tableHtml += `  </tr>\n`;
          }
          tableHtml += `</table>`;
          htmlBlocks.push(tableHtml);

        } else if (block.type === 'cq_sub_question') {
          const labelHtml = renderFormattedRunFn(block.label);
          const textHtml = renderFormattedRunFn(' ' + block.text);
          const marksHtml = block.marks ? `<span style="float:right;mso-tab-count:1;">${renderFormattedRunFn(block.marks)}</span>` : '';
          htmlBlocks.push(`<p class="MsoNormal" style="margin:0cm;margin-left:24pt;text-indent:-24pt;margin-bottom:2pt;margin-top:2pt;line-height:normal;font-size:${baseFontSizePt}pt;font-family:'${fontName}',Arial,sans-serif;"><b>${labelHtml}</b>${textHtml}${marksHtml}</p>`);

        } else if (block.type === 'question_stem') {
          const numHtml = renderFormattedRunFn(block.number);
          const textHtml = block.text ? renderFormattedRunFn(' ' + block.text) : '';
          htmlBlocks.push(`<p class="MsoNormal" style="margin:0cm;margin-top:8pt;margin-bottom:2pt;line-height:normal;font-size:${baseFontSizePt}pt;font-family:'${fontName}',Arial,sans-serif;"><b>${numHtml}</b> ${textHtml}</p>`);

        } else if (block.type === 'paragraph') {
          const trimmed = (block.text || '').trim();
          if (!trimmed) continue;
          const rendered = renderFormattedRunFn(block.text);
          htmlBlocks.push(`<p class="MsoNormal" style="margin:0cm;margin-bottom:.0001pt;line-height:normal;font-size:${baseFontSizePt}pt;font-family:'${fontName}',Arial,sans-serif;">${rendered || '&nbsp;'}</p>`);
        }
      }

      return htmlBlocks.join('\n');
    }
  }

  // Export globally
  const engineInstance = new MarkdownLayoutEngine();
  global.MarkdownLayoutEngine = engineInstance;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engineInstance;
  }
})(typeof window !== 'undefined' ? window : global);
