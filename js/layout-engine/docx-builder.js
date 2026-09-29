const DocxBuilder = {
  paragraph: function (content, options = {}) {
    const jc = options.jc ? `<w:jc w:val="${options.jc}"/>` : '';
    const spc = options.spacing ? `<w:spacing w:line="${options.spacing.line || '240'}" w:lineRule="auto" w:before="${options.spacing.before || '0'}" w:after="${options.spacing.after || '0'}"/>` : '';
    
    let tabs = '';
    if (options.tabs) {
      tabs = '<w:tabs>' + options.tabs.map(t => `<w:tab w:val="${t.val}" w:pos="${t.pos}"/>`).join('') + '</w:tabs>';
    }

    const pPr = (jc || spc || tabs) ? `<w:pPr>${jc}${spc}${tabs}</w:pPr>` : '';
    return `<w:p>${pPr}${content}</w:p>`;
  },

  run: function (text, options = {}) {
    const bold = options.bold ? '<w:b/>' : '';
    const underline = options.underline ? `<w:u w:val="${options.underline}"/>` : '';
    const size = options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : '';
    const rPr = (bold || underline || size) ? `<w:rPr>${bold}${underline}${size}</w:rPr>` : '';
    
    // We assume the caller escapes text if necessary
    return `<w:r>${rPr}<w:t xml:space="preserve">${text}</w:t></w:r>`;
  },
  
  runTab: function() {
    return `<w:r><w:tab/></w:r>`;
  },

  table: function (rowsXml, options = {}) {
    const width = options.width || '15398';
    const jc = options.jc || 'center';
    const borders = options.borders || `<w:tblBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="6" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tblBorders>`;
    
    const tblPr = `<w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:jc w:val="${jc}"/>${borders}</w:tblPr>`;
    return `<w:tbl>${tblPr}${rowsXml}</w:tbl>`;
  },

  tableRow: function (cellsXml, options = {}) {
    const trPr = options.isHeader ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
    return `<w:tr>${trPr}${cellsXml}</w:tr>`;
  },

  tableCell: function (content, options = {}) {
    const width = options.width || '2000';
    const shading = options.shading ? `<w:shd w:val="clear" w:color="auto" w:fill="${options.shading}"/>` : '';
    const tcPr = `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shading}</w:tcPr>`;
    return `<w:tc>${tcPr}${content}</w:tc>`;
  },

  sectionProperties: function (options) {
    const page = options.page || {};
    const margins = page.margins || {};
    return `
      <w:sectPr>
        <w:pgSz w:w="${page.width || '16838'}" w:h="${page.height || '11906'}" w:orient="${page.orient || 'landscape'}"/>
        <w:pgMar w:top="${margins.top || '720'}" w:right="${margins.right || '720'}" w:bottom="${margins.bottom || '720'}" w:left="${margins.left || '720'}" w:header="${margins.header || '720'}" w:footer="${margins.footer || '720'}" w:gutter="${margins.gutter || '0'}"/>
        <w:cols w:num="${options.cols || '1'}"/>
      </w:sectPr>`;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocxBuilder;
} else if (typeof window !== 'undefined') {
  window.FayzarDocxBuilder = DocxBuilder;
}
