const ThemeConfig = {
  FONTS: {
    BIJOY: 'SutonnyMJ',
    UNICODE: 'Kalpurush'
  },
  
  ROUTINE: {
    TABLE_WIDTH: 15398, // dxa (twips)
    HEADER_SHADING: 'E2E8F0',
    SPACING: {
      INSTITUTE: { before: '0', after: '20', line: '320' },
      TITLE: { before: '0', after: '40', line: '280' },
      SUBTITLE: { before: '0', after: '100', line: '240' },
      CELL_HEADER: { before: '60', after: '60', line: '240' },
      CELL_DATA: { before: '40', after: '40', line: '240' },
      SIGNATURE: { before: '360', after: '0', line: '240' }
    },
    FONT_SIZES: {
      INSTITUTE: 32,
      TITLE: 26,
      SUBTITLE: 22,
      CELL_HEADER: 22,
      CELL_DATA: 20,
      SIGNATURE: 20
    }
  },
  
  PAGE: {
    LANDSCAPE: {
      width: '16838', height: '11906', orient: 'landscape',
      margins: { top: '720', right: '720', bottom: '720', left: '720', header: '720', footer: '720', gutter: '0' }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeConfig;
} else if (typeof window !== 'undefined') {
  window.FayzarThemeConfig = ThemeConfig;
}
