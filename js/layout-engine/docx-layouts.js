const DocxLayouts = {
  _getThemeConfig() {
    if (typeof global !== 'undefined' && global.FayzarThemeConfig) return global.FayzarThemeConfig;
    if (typeof window !== 'undefined' && window.FayzarThemeConfig) return window.FayzarThemeConfig;
    if (typeof require === 'function') {
      try { return require('./theme-config.js'); } catch (e) { }
    }
    return null;
  },

  _getDocxBuilder() {
    if (typeof global !== 'undefined' && global.FayzarDocxBuilder) return global.FayzarDocxBuilder;
    if (typeof window !== 'undefined' && window.FayzarDocxBuilder) return window.FayzarDocxBuilder;
    if (typeof require === 'function') {
      try { return require('./docx-builder.js'); } catch (e) { }
    }
    return null;
  },

  formatText(text, options = {}, exportEngine) {
    if (exportEngine && typeof exportEngine.formatDocxText === 'function') {
      return exportEngine.formatDocxText(text, options);
    }
    return text;
  },

  async generateRoutineDocx(routine, options = {}, exportEngine) {
    if (!routine) return null;
    
    const Theme = this._getThemeConfig();
    const Builder = this._getDocxBuilder();
    if (!Theme || !Builder) {
      throw new Error('ThemeConfig or DocxBuilder missing for v2 export');
    }

    let isBijoy = false;
    if (exportEngine && typeof exportEngine.isBijoyFont === 'function') {
      isBijoy = exportEngine.isBijoyFont(options);
    }
    const fontName = isBijoy ? Theme.FONTS.BIJOY : Theme.FONTS.UNICODE;

    let bodyXml = '';

    if (routine.institute) {
      bodyXml += Builder.paragraph(
        Builder.run(this.formatText(routine.institute, options, exportEngine), { bold: true, size: Theme.ROUTINE.FONT_SIZES.INSTITUTE }),
        { jc: 'center', spacing: Theme.ROUTINE.SPACING.INSTITUTE }
      );
    }
    
    if (routine.title) {
      bodyXml += Builder.paragraph(
        Builder.run(this.formatText(routine.title, options, exportEngine), { bold: true, underline: 'single', size: Theme.ROUTINE.FONT_SIZES.TITLE }),
        { jc: 'center', spacing: Theme.ROUTINE.SPACING.TITLE }
      );
    }
    
    if (routine.classInfo || routine.session) {
      const sub = [routine.classInfo, routine.session].filter(Boolean).join(' | ');
      bodyXml += Builder.paragraph(
        Builder.run(this.formatText(sub, options, exportEngine), { size: Theme.ROUTINE.FONT_SIZES.SUBTITLE }),
        { jc: 'center', spacing: Theme.ROUTINE.SPACING.SUBTITLE }
      );
    }

    const headers = routine.headers || ['বার / দিন', '১ম', '২য়', '৩য়', '৪র্থ'];
    const numCols = Math.max(2, headers.length);
    const totalWidth = Theme.ROUTINE.TABLE_WIDTH;
    const colW = Math.floor(totalWidth / numCols);

    let rowsXml = '';
    
    let headerCellsXml = '';
    for (const h of headers) {
      headerCellsXml += Builder.tableCell(
        Builder.paragraph(
          Builder.run(this.formatText(h, options, exportEngine), { bold: true, size: Theme.ROUTINE.FONT_SIZES.CELL_HEADER }),
          { jc: 'center', spacing: Theme.ROUTINE.SPACING.CELL_HEADER }
        ),
        { width: colW, shading: Theme.ROUTINE.HEADER_SHADING }
      );
    }
    rowsXml += Builder.tableRow(headerCellsXml, { isHeader: true });

    const rows = routine.rows || [];
    for (const r of rows) {
      let cellsXml = '';
      for (let c = 0; c < numCols; c++) {
        const val = r[c] || '-';
        const isDayCol = c === 0;
        cellsXml += Builder.tableCell(
          Builder.paragraph(
            Builder.run(this.formatText(val, options, exportEngine), { bold: isDayCol, size: Theme.ROUTINE.FONT_SIZES.CELL_DATA }),
            { jc: 'center', spacing: Theme.ROUTINE.SPACING.CELL_DATA }
          ),
          { width: colW }
        );
      }
      rowsXml += Builder.tableRow(cellsXml);
    }
    
    bodyXml += Builder.table(rowsXml, { width: totalWidth, jc: 'center' });

    const sigCol = Math.floor(totalWidth / 3);
    bodyXml += Builder.paragraph(
      Builder.run(this.formatText('শ্রেণি শিক্ষকের স্বাক্ষর', options, exportEngine), { size: Theme.ROUTINE.FONT_SIZES.SIGNATURE }) +
      Builder.runTab() +
      Builder.run(this.formatText('রুটিন কমিটির স্বাক্ষর', options, exportEngine), { size: Theme.ROUTINE.FONT_SIZES.SIGNATURE }) +
      Builder.runTab() +
      Builder.run(this.formatText('প্রধান শিক্ষক / অধ্যক্ষ', options, exportEngine), { size: Theme.ROUTINE.FONT_SIZES.SIGNATURE }),
      { 
        spacing: Theme.ROUTINE.SPACING.SIGNATURE,
        tabs: [{ val: 'left', pos: sigCol }, { val: 'left', pos: sigCol * 2 }]
      }
    );

    const sectPr = Builder.sectionProperties({ page: Theme.PAGE.LANDSCAPE });

    if (options.returnInnerXml) {
      return { bodyXml, sectPr };
    }
    
    if (exportEngine && typeof exportEngine._packageDocx === 'function') {
      return await exportEngine._packageDocx(bodyXml + sectPr, fontName);
    }
    return null;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocxLayouts;
} else if (typeof window !== 'undefined') {
  window.FayzarDocxLayouts = DocxLayouts;
}
