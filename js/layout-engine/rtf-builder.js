const RtfBuilder = {
  document: function (content, options = {}) {
    const font = options.fontName || 'SutonnyMJ';
    const margins = options.margins || { top: 720, bottom: 720, left: 720, right: 720 };
    return `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033` +
           `{\\fonttbl{\\f0\\fnil\\fcharset0 ${font};}}` +
           `{\\*\\generator FayzarPublishingStudio;}` +
           `\\viewkind4\\uc1\\pard\\sa200\\sl276\\slmult1` +
           `\\margl${margins.left}\\margr${margins.right}\\margt${margins.top}\\margb${margins.bottom}` +
           `\\f0\\fs24\\lang9 ${content}}`;
  },

  paragraph: function (content, options = {}) {
    let props = '\\pard';
    if (options.jc === 'center') props += '\\qc';
    else if (options.jc === 'right') props += '\\qr';
    else if (options.jc === 'justify') props += '\\qj';
    
    if (options.spacing) {
      if (options.spacing.before) props += `\\sb${options.spacing.before}`;
      if (options.spacing.after) props += `\\sa${options.spacing.after}`;
      if (options.spacing.line) props += `\\sl${options.spacing.line}\\slmult1`;
    }
    
    if (options.tabs) {
      options.tabs.forEach(t => {
        props += `\\tx${t.pos}`;
      });
    }

    // Wrap in group so \pard changes don't bleed if not intended, but standard RTF uses \pard to reset
    return `${props} ${content}\\par\n`;
  },

  run: function (text, options = {}) {
    let prefix = '';
    if (options.bold) prefix += '\\b';
    if (options.underline) prefix += '\\ul';
    if (options.size) prefix += `\\fs${options.size}`; // RTF fs is in half-points

    let suffix = '';
    if (options.size) suffix += '\\fs24'; // Reset to 12pt
    if (options.underline) suffix += '\\ulnone';
    if (options.bold) suffix += '\\b0';

    if (prefix) prefix += ' ';
    
    return `${prefix}${text}${suffix}`;
  },

  runTab: function () {
    return '\\tab ';
  },

  tableRow: function (cellsRtf, options = {}) {
    const rowProps = options.rowProps || '\\trgaph108\\trleft0';
    return `\\trowd ${rowProps} ${cellsRtf} \\row\n`;
  },

  tableCell: function (content, options = {}) {
    const width = options.width || 2000;
    const rightPos = options.rightPos || 2000; // cellx specifies the right boundary of the cell
    
    let cellProps = '';
    if (options.shading) cellProps += `\\clcbpatX`; // Shading in RTF needs color table, simplifying for now
    
    const borders = options.borders || '\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10';
    
    // Cell definition in RTF goes BEFORE the cell content in the row declaration, but actual text uses \cell
    // For a cleaner builder, usually cell definitions are grouped at the row level. 
    // This is a simplified block that just outputs the \cell marker after content.
    return `${content}\\cell `;
  },
  
  // RTF tables require cell definitions at the row level before cell contents.
  // We provide a dedicated table row builder for this complexity.
  tableRowComplex: function(cells, options = {}) {
    let rowDef = '\\trowd \\trgaph108\\trleft0 ';
    let cellContents = '';
    let currentRightPos = 0;
    
    cells.forEach(cell => {
      currentRightPos += parseInt(cell.width || 2000);
      
      const borders = cell.borders || '\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10';
      rowDef += `${borders} \\cellx${currentRightPos} `;
      cellContents += `${cell.content}\\cell `;
    });
    
    return `${rowDef}${cellContents}\\row\n`;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RtfBuilder;
} else if (typeof window !== 'undefined') {
  window.FayzarRtfBuilder = RtfBuilder;
}
