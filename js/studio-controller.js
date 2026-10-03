/**
 * Fayzar Publishing Studio - Microsoft Word Office Suite Controller
 * Orchestrates authentic Office Ribbon Tabs, Dual Rulers, Live WYSIWYG Editing,
 * Floating Selection Mini-Toolbar, Dual-Theme Workspace, and Board Typesetting.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const inputText = document.getElementById('input-text');
  const previewContainer = document.getElementById('preview-container');
  const detectedBadge = document.getElementById('detected-badge');
  const modeSelect = document.getElementById('mode-select');
  const paperSizeSelect = document.getElementById('paper-size-select');
  const fontSelect = document.getElementById('font-select');
  const templateSelect = document.getElementById('template-select');
  const chkSkipCol1 = document.getElementById('chk-skip-col1');

  // Titlebar & Window Controls
  const wordDocTitle = document.getElementById('word-doc-title');
  const btnToggleTheme = document.getElementById('btn-toggle-theme');
  const lblThemeName = document.getElementById('lbl-theme-name');
  const btnToggleEditorPane = document.getElementById('btn-toggle-editor-pane');
  const btnWindowMaximize = document.getElementById('btn-window-maximize');
  const btnWindowReset = document.getElementById('btn-window-reset');
  const qaBtnSave = document.getElementById('qa-btn-save');
  const qaBtnPrint = document.getElementById('qa-btn-print');
  const qaBtnUndo = document.getElementById('qa-btn-undo');
  const qaBtnRedo = document.getElementById('qa-btn-redo');

  // Quick Access Download Dropdown
  const qaBtnDownloadMenu = document.getElementById('qa-btn-download-menu');
  const qaDownloadDropdown = document.getElementById('qa-download-dropdown');
  const menuExportDocBijoy = document.getElementById('menu-export-doc-bijoy');
  const menuExportDocUnicode = document.getElementById('menu-export-doc-unicode');
  const menuExportDocxUnicode = document.getElementById('menu-export-docx-unicode');
  const menuExportDocxBijoy = document.getElementById('menu-export-docx-bijoy');
  const menuExportPdf = document.getElementById('menu-export-pdf');

  // File Tab 5-Card Export Suite
  const btnFileDocBijoy = document.getElementById('btn-file-doc-bijoy');
  const btnFileDocUnicode = document.getElementById('btn-file-doc-unicode');
  const btnFileDocxUnicode = document.getElementById('btn-file-docx-unicode');
  const btnFileDocxBijoy = document.getElementById('btn-file-docx-bijoy');
  const btnFilePdf = document.getElementById('btn-file-pdf');

  // Template and OMR
  const btnMakeOmr = document.getElementById('btn-make-omr');
  const btnInsertOmr = document.getElementById('btn-insert-omr');

  // Ribbon Tabs & Panels
  const tabButtons = document.querySelectorAll('.word-tab-btn');
  const tabPanels = {
    'tab-file': document.getElementById('tab-panel-file'),
    'tab-home': document.getElementById('tab-panel-home'),
    'tab-layout': document.getElementById('tab-panel-layout'),
    'tab-insert': document.getElementById('tab-panel-insert'),
    'tab-view': document.getElementById('tab-panel-view')
  };

  // Home Formatting Elements
  const btnToggleEdit = document.getElementById('btn-toggle-edit');
  const txtEditMode = document.getElementById('txt-edit-mode');
  const liveEditNotice = document.getElementById('live-edit-notice');
  const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
  const txtFullscreen = document.getElementById('txt-fullscreen');
  const selectFontSize = document.getElementById('select-font-size');
  const btnFontDec = document.getElementById('btn-font-dec');
  const btnFontInc = document.getElementById('btn-font-inc');
  const lblFontSize = document.getElementById('lbl-font-size');
  const selectLineSpacing = document.getElementById('select-line-spacing');
  const selectMargin = document.getElementById('select-margin');
  const groupSplitCtrl = document.getElementById('group-split-ctrl');
  const btnSplitDec = document.getElementById('btn-split-dec');
  const btnSplitInc = document.getElementById('btn-split-inc');
  const lblSplitCount = document.getElementById('lbl-split-count');

  // Formatting Buttons (B, I, U, Strike, Sub, Super, Colors, Clear, Alignment, Lists)
  const btnFormatBold = document.getElementById('btn-format-bold');
  const btnFormatItalic = document.getElementById('btn-format-italic');
  const btnFormatUnderline = document.getElementById('btn-format-underline');
  const btnFormatStrike = document.getElementById('btn-format-strike');
  const btnFormatSub = document.getElementById('btn-format-sub');
  const btnFormatSuper = document.getElementById('btn-format-super');
  const btnFormatClear = document.getElementById('btn-format-clear');
  const inputForeColor = document.getElementById('input-fore-color');
  const foreColorIndicator = document.getElementById('fore-color-indicator');
  const inputHiliteColor = document.getElementById('input-hilite-color');
  const hiliteColorIndicator = document.getElementById('hilite-color-indicator');
  const btnAlignLeft = document.getElementById('btn-align-left');
  const btnAlignCenter = document.getElementById('btn-align-center');
  const btnAlignRight = document.getElementById('btn-align-right');
  const btnAlignJustify = document.getElementById('btn-align-justify');
  const btnListUl = document.getElementById('btn-list-ul');
  const btnListOl = document.getElementById('btn-list-ol');
  const btnOutdent = document.getElementById('btn-outdent');
  const btnIndent = document.getElementById('btn-indent');

  // Direct Insert Tools (Table, Image, Line)
  const btnQuickInsertTable = document.getElementById('btn-quick-insert-table');
  const btnQuickInsertImage = document.getElementById('btn-quick-insert-image');
  const btnQuickInsertHr = document.getElementById('btn-quick-insert-hr');
  const inputFileImage = document.getElementById('input-file-image');
  const modalInsertTable = document.getElementById('modal-insert-table');
  const inputTableRows = document.getElementById('input-table-rows');
  const inputTableCols = document.getElementById('input-table-cols');
  const btnTableClose = document.getElementById('btn-table-close');
  const btnTableCancel = document.getElementById('btn-table-cancel');
  const btnTableInsertConfirm = document.getElementById('btn-table-insert-confirm');

  // Search & Editing Tools
  const btnQuickFindReplace = document.getElementById('btn-quick-find-replace');
  const btnQuickSelectAll = document.getElementById('btn-quick-select-all');
  const btnQuickUndo = document.getElementById('btn-quick-undo');
  const modalFindReplace = document.getElementById('modal-find-replace');
  const findInputText = document.getElementById('find-input-text');
  const replaceInputText = document.getElementById('replace-input-text');
  const findStatusMsg = document.getElementById('find-status-msg');
  const btnFindNext = document.getElementById('btn-find-next');
  const btnReplaceOne = document.getElementById('btn-replace-one');
  const btnReplaceAll = document.getElementById('btn-replace-all');
  const btnFindClose = document.getElementById('btn-find-close');

  // View Tab Elements
  const btnViewFullscreen = document.getElementById('btn-view-fullscreen');
  const btnViewSplit = document.getElementById('btn-view-split');
  const chkToggleRuler = document.getElementById('chk-toggle-ruler');
  const chkToggleCrop = document.getElementById('chk-toggle-crop');
  const btnZoomPreset100 = document.getElementById('btn-zoom-preset-100');
  const btnZoomFitPageRibbon = document.getElementById('btn-zoom-fit-page-ribbon');
  const btnZoomFitWidthRibbon = document.getElementById('btn-zoom-fit-width-ribbon');

  // Canvas & Zoom Controls
  const officeCanvas = document.getElementById('office-canvas');
  const zoomContainer = document.getElementById('zoom-container');
  const zoomRange = document.getElementById('zoom-range');
  const lblZoomVal = document.getElementById('lbl-zoom-val');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomFitPage = document.getElementById('btn-zoom-fit-page');
  const btnZoomFitWidth = document.getElementById('btn-zoom-fit-width');

  // Status Bar Elements
  const statCurrentPage = document.getElementById('stat-current-page');
  const statTotalPages = document.getElementById('stat-total-pages');
  const statQCount = document.getElementById('stat-q-count');
  const statWordCount = document.getElementById('stat-word-count');
  const statEditIndicator = document.getElementById('stat-edit-indicator');

  // Floating Mini-Toolbar
  const wordMiniToolbar = document.getElementById('word-mini-toolbar');

  // Studio State
  const studioState = {
    fontSizePt: 12,
    lineSpacing: '1.35',
    marginClass: 'margin-standard',
    splitIndex: 20,
    isEditing: false,
    isFullscreen: false,
    theme: 'theme-office-light',
    zoom: 100
  };

  let currentParsedData = null;
  let activeDocType = 'EXAM_CQ';

  // ── History Manager (Undo / Redo) ──────────────────────────────────
  const HistoryManager = {
    stack: [],
    pointer: -1,
    maxSize: 50,
    _saving: false,

    snapshot() {
      if (this._saving) return;
      const state = {
        text: inputText ? inputText.value : '',
        mode: modeSelect ? modeSelect.value : 'AUTO',
        font: fontSelect ? fontSelect.value : 'kalpurush',
        paper: paperSizeSelect ? paperSizeSelect.value : 'a4-landscape',
        fontSize: studioState.fontSizePt,
        lineSpacing: studioState.lineSpacing,
        marginClass: studioState.marginClass,
        splitIndex: studioState.splitIndex
      };
      // Discard forward history
      if (this.pointer < this.stack.length - 1) {
        this.stack = this.stack.slice(0, this.pointer + 1);
      }
      this.stack.push(state);
      if (this.stack.length > this.maxSize) this.stack.shift();
      this.pointer = this.stack.length - 1;
      this.updateStatusBar();
    },

    undo() {
      if (this.pointer <= 0) { showToast('আর পিছিয়ে যাওয়া সম্ভব নয়।', 'warning'); return; }
      this.pointer--;
      this._restore(this.stack[this.pointer]);
    },

    redo() {
      if (this.pointer >= this.stack.length - 1) { showToast('আর সামনে যাওয়া সম্ভব নয়।', 'warning'); return; }
      this.pointer++;
      this._restore(this.stack[this.pointer]);
    },

    _restore(state) {
      if (!state) return;
      this._saving = true;
      if (inputText) inputText.value = state.text;
      if (modeSelect) modeSelect.value = state.mode;
      if (fontSelect) fontSelect.value = state.font;
      if (paperSizeSelect) paperSizeSelect.value = state.paper;
      studioState.fontSizePt = state.fontSize;
      studioState.lineSpacing = state.lineSpacing;
      studioState.marginClass = state.marginClass;
      studioState.splitIndex = state.splitIndex;
      if (selectFontSize) selectFontSize.value = state.fontSize;
      if (lblFontSize) lblFontSize.textContent = state.fontSize + 'pt';
      if (selectLineSpacing) selectLineSpacing.value = state.lineSpacing;
      if (selectMargin) selectMargin.value = state.marginClass;
      if (lblSplitCount) lblSplitCount.textContent = state.splitIndex + 'টি';
      this._saving = false;
      updatePreview();
      this.updateStatusBar();
    },

    updateStatusBar() {
      const el = document.getElementById('stat-history');
      if (el) el.textContent = (this.pointer + 1) + '/' + this.stack.length;
    }
  };

  // ── Auto-Save Engine ───────────────────────────────────────────────
  const AutoSave = {
    KEY: 'fayzar_studio_session_v3',
    timer: null,
    dirty: false,

    save() {
      try {
        const session = {
          text: inputText ? inputText.value : '',
          mode: modeSelect ? modeSelect.value : 'AUTO',
          font: fontSelect ? fontSelect.value : 'kalpurush',
          paper: paperSizeSelect ? paperSizeSelect.value : 'a4-landscape',
          fontSize: studioState.fontSizePt,
          lineSpacing: studioState.lineSpacing,
          marginClass: studioState.marginClass,
          splitIndex: studioState.splitIndex,
          theme: studioState.theme,
          savedAt: Date.now()
        };
        localStorage.setItem(this.KEY, JSON.stringify(session));
        this.dirty = false;
        this.updateIndicator(true);
      } catch(e) { /* localStorage unavailable */ }
    },

    restore() {
      try {
        const raw = localStorage.getItem(this.KEY);
        if (!raw) return false;
        const session = JSON.parse(raw);
        // Only restore if saved within last 48 hours
        if (Date.now() - session.savedAt > 48 * 3600 * 1000) return false;
        if (inputText && session.text) inputText.value = session.text;
        if (modeSelect && session.mode) modeSelect.value = session.mode;
        if (fontSelect && session.font) fontSelect.value = session.font;
        if (paperSizeSelect && session.paper) paperSizeSelect.value = session.paper;
        if (session.fontSize) studioState.fontSizePt = session.fontSize;
        if (session.lineSpacing) studioState.lineSpacing = session.lineSpacing;
        if (session.marginClass) studioState.marginClass = session.marginClass;
        if (session.splitIndex) studioState.splitIndex = session.splitIndex;
        if (selectFontSize && session.fontSize) selectFontSize.value = session.fontSize;
        if (lblFontSize && session.fontSize) lblFontSize.textContent = session.fontSize + 'pt';
        if (selectLineSpacing && session.lineSpacing) selectLineSpacing.value = session.lineSpacing;
        if (selectMargin && session.marginClass) selectMargin.value = session.marginClass;
        if (lblSplitCount && session.splitIndex) lblSplitCount.textContent = session.splitIndex + 'টি';
        return true;
      } catch(e) { return false; }
    },

    startTimer() {
      this.timer = setInterval(() => {
        if (this.dirty) this.save();
      }, 30000); // Every 30s
    },

    markDirty() {
      this.dirty = true;
      this.updateIndicator(false);
    },

    updateIndicator(saved) {
      const ind = document.getElementById('autosave-indicator');
      const lbl = document.getElementById('autosave-label');
      if (!ind) return;
      ind.classList.remove('hidden');
      if (saved) {
        ind.className = 'text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1';
        if (lbl) lbl.textContent = 'সংরক্ষিত ✓';
      } else {
        ind.className = 'text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1';
        if (lbl) lbl.textContent = '● সংরক্ষণ প্রয়োজন';
      }
    }
  };

  // Load Saved Theme
  const savedTheme = localStorage.getItem('fayzar_word_theme') || 'theme-office-light';
  applyTheme(savedTheme);

  // ── MD Import from Index Page (sessionStorage handoff) ─────────────
  (function checkMdImport() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'md_import') {
      try {
        const mdText = sessionStorage.getItem('fzr_md_import');
        if (mdText && inputText) {
          inputText.value = mdText;
          sessionStorage.removeItem('fzr_md_import');
          const fname = params.get('name') || 'imported.md';
          setTimeout(() => {
            updatePreview();
            showToast(`"${fname}" Index থেকে লোড সম্পন্ন (${mdText.length} অক্ষর)`, 'success');
          }, 500);
        }
      } catch(e) { /* sessionStorage unavailable */ }
    }
  })();

  function applyTheme(theme) {
    studioState.theme = theme;
    document.body.classList.remove('theme-office-light', 'theme-office-dark');
    document.body.classList.add(theme);
    localStorage.setItem('fayzar_word_theme', theme);
    if (lblThemeName) {
      lblThemeName.textContent = theme === 'theme-office-light' ? 'ক্লাসিক অফিস' : 'অফিস ডার্ক';
    }
  }

  if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', () => {
      const nextTheme = studioState.theme === 'theme-office-light' ? 'theme-office-dark' : 'theme-office-light';
      applyTheme(nextTheme);
    });
  }

  // Ribbon Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      Object.keys(tabPanels).forEach(key => {
        if (tabPanels[key]) {
          if (key === targetTab) {
            tabPanels[key].classList.remove('hidden');
          } else {
            tabPanels[key].classList.add('hidden');
          }
        }
      });
    });
  });

  /**
   * Part-12.2: স্টুডিওর প্রিভিউ ও Word-ডাউনলোড — দুটোর জন্যই লেআউট-অপশনের একক উৎস।
   * আগে ডাউনলোড-পাথ মার্জিন-সিলেক্টের চারটি মানকে দুইটিতে সংকুচিত করত, ফলে
   * "০.৭৫\"" ও "১.০\"" বাছলেও Word-ফাইলে বসত ০.৫" ⇒ প্রিভিউ ≠ ডাউনলোড।
   * মার্জিন টুইপ → ইঞ্চি (÷১৪৪০) হয়ে যায়; layout-units ক্লাস-নাম ও সংখ্যা দুটোই চেনে।
   */
  function layoutOptions() {
    const cls = studioState.marginClass || 'margin-standard';
    const U = (typeof window !== 'undefined') ? window.FayzarLayoutUnits : null;
    const tw = (U && typeof U.marginClass === 'function')
      ? U.marginClass(cls, 720)
      : ({ 'margin-narrow': 576, 'margin-standard': 720, 'margin-normal': 1080, 'margin-wide': 1440, 'margin-stamp': 1440 }[cls] || 720);
    const paper = paperSizeSelect ? paperSizeSelect.value : 'a4-landscape';
    return {
      marginClass: cls,
      margin: tw / 1440,
      paperSize: paper,
      orientation: paper.indexOf('landscape') !== -1 ? 'landscape' : 'portrait',
      skipFirstColumn: chkSkipCol1 ? chkSkipCol1.checked : false,
      splitIndex: studioState.splitIndex
    };
  }

  async function updatePreview() {
    const raw = inputText.value.trim();
    if (!raw) {
      previewContainer.innerHTML = `<div class="text-center py-20 text-slate-400 font-medium"><i class="fas fa-file-word text-5xl mb-3 block text-blue-500/50"></i>বামপাশের বক্সে কোনো প্রশ্নপত্র বা দলিল পেস্ট করুন অথবা উপরের <b>ইনসার্ট ও টেমপ্লেট</b> থেকে নির্বাচন করুন।</div>`;
      updateStatusBar();
      return;
    }

    const selectedMode = modeSelect.value;
    const font = fontSelect.value;

    // Part-12.2: লেআউট-সংক্রান্ত সব মান এক জায়গা থেকে (ডাউনলোড-পাথের সঙ্গে অভিন্ন)
    const options = Object.assign(layoutOptions(), {
      font,
      fontSize: studioState.fontSizePt + 'pt',
      lineSpacing: studioState.lineSpacing,
      editable: studioState.isEditing,
      docType: selectedMode === 'AUTO' ? null : selectedMode
    });

    try {
      if (typeof FayzarPipeline !== 'undefined' && typeof FayzarPipeline.previewHtml === 'function') {
        const result = await FayzarPipeline.previewHtml(raw, options);
        const docType = result.docType;
        activeDocType = docType;
        // Part-13.1: ব্রিজের নিরাপত্তা-ট্যাগ — ভুল docType-এর data যেন কখনো ব্যবহার না হয়
        if (result.parsedData && !result.parsedData.__fzDocType) result.parsedData.__fzDocType = docType;
        currentParsedData = result.parsedData;
        previewContainer.innerHTML = result.content;

        if (selectedMode === 'AUTO') {
          detectedBadge.textContent = getDocTypeBanglaLabel(docType);
          detectedBadge.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
        } else {
          detectedBadge.textContent = 'ম্যানুয়াল: ' + getDocTypeBanglaLabel(docType);
          detectedBadge.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300';
        }

        if (btnMakeOmr) {
          if (docType === 'EXAM_MCQ') {
            btnMakeOmr.classList.remove('hidden');
          } else {
            btnMakeOmr.classList.add('hidden');
          }
        }

        if (groupSplitCtrl) {
          if (docType === 'EXAM_MCQ') {
            groupSplitCtrl.classList.remove('hidden');
          } else {
            groupSplitCtrl.classList.add('hidden');
          }
        }
      }
    } catch (err) {
      console.error('[StudioController] Preview error via FayzarPipeline:', err);
      previewContainer.innerHTML = `<div class="p-8 text-center text-rose-500 font-bold">প্রিভিউ লোড করতে সমস্যা হয়েছে: ${err.message}</div>`;
    }

    applyEditModeState();
    updateRulerMargin(studioState.marginClass);
    updateStatusBar();
    updateWordDocTitle();
    HistoryManager.snapshot();
    AutoSave.markDirty();
  }

  // ── Toast Notification Helper ──────────────────────────────────────
  let _toastTimer = null;
  function showToast(msg, type = 'success') {
    const el = document.getElementById('studio-toast');
    const icon = document.getElementById('toast-icon');
    const msgEl = document.getElementById('toast-msg');
    if (!el) return;
    if (_toastTimer) clearTimeout(_toastTimer);
    if (msgEl) msgEl.textContent = msg;
    if (icon) {
      icon.className = 'fas ' + (type === 'success' ? 'fa-check-circle text-emerald-400' :
        type === 'warning' ? 'fa-triangle-exclamation text-amber-400' :
        type === 'error' ? 'fa-circle-xmark text-red-400' : 'fa-circle-info text-blue-400');
    }
    el.classList.remove('hidden');
    _toastTimer = setTimeout(() => el.classList.add('hidden'), 2800);
  }

  function updateWordDocTitle() {
    if (!wordDocTitle) return;
    if (currentParsedData && currentParsedData.header && currentParsedData.header.institute) {
      wordDocTitle.textContent = currentParsedData.header.institute + ' - Microsoft Word';
    } else if (currentParsedData && currentParsedData.firstParty) {
      wordDocTitle.textContent = 'স্ট্যাম্প দলিল - Microsoft Word';
    } else if (currentParsedData && currentParsedData.subject) {
      wordDocTitle.textContent = 'সরকারি আবেদন - Microsoft Word';
    } else {
      wordDocTitle.textContent = 'ডকুমেন্ট ১ - Microsoft Word';
    }
  }

  function applyEditModeState() {
    previewContainer.classList.toggle('editing-active', studioState.isEditing);

    const editables = previewContainer.querySelectorAll('.question-paper, .paper-sheet, .stamp-document, .gov-app-document, .cert-document');
    editables.forEach(el => {
      el.setAttribute('contenteditable', studioState.isEditing ? 'true' : 'false');
      el.setAttribute('spellcheck', 'false');
    });

    if (studioState.isEditing) {
      if (btnToggleEdit) {
        btnToggleEdit.classList.add('active');
        const icon = btnToggleEdit.querySelector('i');
        if (icon) icon.className = 'fas fa-check text-emerald-600';
      }
      if (txtEditMode) txtEditMode.textContent = 'এডিট চালু আছে';
      if (liveEditNotice) liveEditNotice.classList.remove('hidden');
      if (statEditIndicator) statEditIndicator.classList.remove('hidden');
    } else {
      if (btnToggleEdit) {
        btnToggleEdit.classList.remove('active');
        const icon = btnToggleEdit.querySelector('i');
        if (icon) icon.className = 'fas fa-pen-to-square text-amber-500';
      }
      if (txtEditMode) txtEditMode.textContent = 'সরাসরি পেজে এডিট';
      if (liveEditNotice) liveEditNotice.classList.add('hidden');
      if (statEditIndicator) statEditIndicator.classList.add('hidden');
    }
  }

  function updateRulerMargin(marginClass) {
    const rulerHLeft = document.getElementById('ruler-h-margin-left');
    const rulerHRight = document.getElementById('ruler-h-margin-right');
    const rulerVTop = document.getElementById('ruler-v-margin-top');
    const rulerVBottom = document.getElementById('ruler-v-margin-bottom');

    let hWidth = '12mm';
    let vHeight = '10mm';
    if (marginClass === 'margin-narrow') {
      hWidth = '10mm';
      vHeight = '8mm';
    } else if (marginClass === 'margin-standard') {
      hWidth = '12mm';
      vHeight = '10mm';
    } else if (marginClass === 'margin-normal') {
      hWidth = '15mm';
      vHeight = '15mm';
    } else if (marginClass === 'margin-wide') {
      hWidth = '20mm';
      vHeight = '20mm';
    }

    if (rulerHLeft) rulerHLeft.style.width = hWidth;
    if (rulerHRight) rulerHRight.style.width = hWidth;
    if (rulerVTop) rulerVTop.style.height = vHeight;
    if (rulerVBottom) rulerVBottom.style.height = vHeight;
  }

  function updateStatusBar() {
    const sheets = previewContainer.querySelectorAll('.paper-sheet');
    const totalPages = sheets.length || 1;

    if (statTotalPages) statTotalPages.textContent = totalPages;
    if (statCurrentPage) statCurrentPage.textContent = '১';

    if (statWordCount) {
      const text = previewContainer.innerText || '';
      const words = text.trim().split(/\s+/).filter(Boolean);
      statWordCount.textContent = words.length;
    }

    if (statQCount) {
      if (currentParsedData && currentParsedData.sections) {
        let qCount = 0;
        for (const sec of currentParsedData.sections) {
          if (sec.questions) qCount += sec.questions.length;
        }
        statQCount.textContent = qCount > 0 ? qCount : '-';
      } else {
        statQCount.textContent = '-';
      }
    }
  }

  function setZoom(val) {
    val = Math.max(40, Math.min(160, Math.round(val)));
    studioState.zoom = val;
    if (zoomRange) zoomRange.value = val;
    if (lblZoomVal) lblZoomVal.textContent = val + '%';
    if (zoomContainer) {
      zoomContainer.style.transform = `scale(${val / 100})`;
    }
  }

  function getDocTypeBanglaLabel(type) {
    switch (type) {
      case 'EXAM_CQ': return 'সৃজনশীল প্রশ্নপত্র (CQ)';
      case 'EXAM_GENERAL': return 'সাধারণ/প্রাথমিক প্রশ্নপত্র';
      case 'EXAM_COMBINED': return 'সম্মিলিত সিকিউ+এমসিকিউ';
      case 'EXAM_MCQ': return 'বহুনির্বাচনী প্রশ্ন (MCQ)';
      case 'EXAM_MATH': return 'গণিত ও বিজ্ঞান প্রশ্ন';
      case 'STAMP_DEED': return '৩০০ টাকার স্ট্যাম্প দলিল';
      case 'GOVT_APP': return 'সরকারি আবেদনপত্র';
      case 'PROTTOYON': return 'প্রত্যয়ন ও প্রশংসাপত্র';
      case 'OFFICE_PAD': return 'অফিসিয়াল প্যাড';
      case 'ROUTINE': return 'ক্লাস রুটিন';
      default: return 'সাধারণ ডকুমেন্ট';
    }
  }

  // Input Listeners
  inputText.addEventListener('input', debounce(updatePreview, 300));
  modeSelect.addEventListener('change', updatePreview);
  paperSizeSelect.addEventListener('change', updatePreview);
  fontSelect.addEventListener('change', updatePreview);
  if (chkSkipCol1) chkSkipCol1.addEventListener('change', updatePreview);

  // Home Ribbon Formatting Commands
  if (btnFormatBold) btnFormatBold.addEventListener('click', () => document.execCommand('bold'));
  if (btnFormatItalic) btnFormatItalic.addEventListener('click', () => document.execCommand('italic'));
  if (btnFormatUnderline) btnFormatUnderline.addEventListener('click', () => document.execCommand('underline'));
  if (btnFormatStrike) btnFormatStrike.addEventListener('click', () => document.execCommand('strikeThrough'));
  if (btnFormatSub) btnFormatSub.addEventListener('click', () => document.execCommand('subscript'));
  if (btnFormatSuper) btnFormatSuper.addEventListener('click', () => document.execCommand('superscript'));
  if (btnFormatClear) btnFormatClear.addEventListener('click', () => document.execCommand('removeFormat'));

  // Colors
  if (inputForeColor) {
    inputForeColor.addEventListener('input', (e) => {
      const color = e.target.value;
      if (foreColorIndicator) foreColorIndicator.style.backgroundColor = color;
      document.execCommand('foreColor', false, color);
    });
  }
  if (inputHiliteColor) {
    inputHiliteColor.addEventListener('input', (e) => {
      const color = e.target.value;
      if (hiliteColorIndicator) hiliteColorIndicator.style.backgroundColor = color;
      document.execCommand('hiliteColor', false, color);
    });
  }

  // Paragraph Alignments & Lists
  if (btnAlignLeft) btnAlignLeft.addEventListener('click', () => document.execCommand('justifyLeft'));
  if (btnAlignCenter) btnAlignCenter.addEventListener('click', () => document.execCommand('justifyCenter'));
  if (btnAlignRight) btnAlignRight.addEventListener('click', () => document.execCommand('justifyRight'));
  if (btnAlignJustify) btnAlignJustify.addEventListener('click', () => document.execCommand('justifyFull'));
  if (btnListUl) btnListUl.addEventListener('click', () => document.execCommand('insertUnorderedList'));
  if (btnListOl) btnListOl.addEventListener('click', () => document.execCommand('insertOrderedList'));
  if (btnOutdent) btnOutdent.addEventListener('click', () => document.execCommand('outdent'));
  if (btnIndent) btnIndent.addEventListener('click', () => document.execCommand('indent'));

  // Font Size Dropdown
  if (selectFontSize) {
    selectFontSize.addEventListener('change', (e) => {
      studioState.fontSizePt = parseFloat(e.target.value);
      if (lblFontSize) lblFontSize.textContent = studioState.fontSizePt + 'pt';
      updatePreview();
    });
  }

  // Direct Insert Tools (Table, Image, Line)
  if (btnQuickInsertTable) {
    btnQuickInsertTable.addEventListener('click', () => {
      if (modalInsertTable) modalInsertTable.classList.remove('hidden');
    });
  }
  if (btnTableClose) btnTableClose.addEventListener('click', () => modalInsertTable.classList.add('hidden'));
  if (btnTableCancel) btnTableCancel.addEventListener('click', () => modalInsertTable.classList.add('hidden'));
  if (btnTableInsertConfirm) {
    btnTableInsertConfirm.addEventListener('click', () => {
      const rows = parseInt(inputTableRows ? inputTableRows.value : '3', 10) || 3;
      const cols = parseInt(inputTableCols ? inputTableCols.value : '3', 10) || 3;
      insertTableIntoDoc(rows, cols);
      modalInsertTable.classList.add('hidden');
    });
  }

  function insertTableIntoDoc(rows, cols) {
    rows = Math.max(1, Math.min(30, rows));
    cols = Math.max(1, Math.min(10, cols));
    let html = '<table class="word-inserted-table"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        if (r === 0) {
          html += `<th>হেডার ${c + 1}</th>`;
        } else {
          html += `<td>ডাটা ${r},${c + 1}</td>`;
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    document.execCommand('insertHTML', false, html);
  }

  // Image Insert (Seal, Photo, Signature)
  if (btnQuickInsertImage && inputFileImage) {
    btnQuickInsertImage.addEventListener('click', () => {
      inputFileImage.click();
    });
    inputFileImage.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        const imgHtml = `<img src="${dataUrl}" style="max-width: 220px; height: auto; display: inline-block; margin: 4px; border: 1px solid #ccc; vertical-align: middle;" alt="সংযুক্ত ছবি"><p><br></p>`;
        document.execCommand('insertHTML', false, imgHtml);
        inputFileImage.value = '';
      };
      reader.readAsDataURL(file);
    });
  }

  // Horizontal Divider Line
  if (btnQuickInsertHr) {
    btnQuickInsertHr.addEventListener('click', () => {
      document.execCommand('insertHTML', false, '<hr class="word-inserted-hr"><p><br></p>');
    });
  }

  // Find and Replace Modal & Commands
  if (btnQuickFindReplace && modalFindReplace) {
    btnQuickFindReplace.addEventListener('click', () => {
      modalFindReplace.classList.remove('hidden');
      if (findInputText) {
        findInputText.focus();
        findInputText.select();
      }
      if (findStatusMsg) findStatusMsg.textContent = '';
    });
  }
  if (btnFindClose && modalFindReplace) {
    btnFindClose.addEventListener('click', () => modalFindReplace.classList.add('hidden'));
  }
  if (btnFindNext) {
    btnFindNext.addEventListener('click', () => {
      const q = findInputText ? findInputText.value.trim() : '';
      if (!q) return;
      if (typeof window.find === 'function') {
        const found = window.find(q, false, false, true, false, false, false);
        if (findStatusMsg) {
          findStatusMsg.textContent = found ? 'শব্দটি পাওয়া গেছে।' : 'ডকুমেন্টে আর কোনো মিল পাওয়া যায়নি।';
        }
      }
    });
  }
  if (btnReplaceOne) {
    btnReplaceOne.addEventListener('click', () => {
      const findTxt = findInputText ? findInputText.value.trim() : '';
      const repTxt = replaceInputText ? replaceInputText.value : '';
      if (!findTxt) return;
      const sel = window.getSelection();
      if (sel && sel.toString() === findTxt) {
        document.execCommand('insertText', false, repTxt);
        if (findStatusMsg) findStatusMsg.textContent = 'পরিবর্তন সম্পন্ন হয়েছে।';
      } else {
        if (btnFindNext) btnFindNext.click();
      }
    });
  }
  if (btnReplaceAll) {
    btnReplaceAll.addEventListener('click', () => {
      const findTxt = findInputText ? findInputText.value.trim() : '';
      const repTxt = replaceInputText ? replaceInputText.value : '';
      if (!findTxt) return;

      let count = 0;
      const src = inputText.value;
      if (src && src.includes(findTxt)) {
        const regex = new RegExp(findTxt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches = src.match(regex);
        count = matches ? matches.length : 0;
        inputText.value = src.replace(regex, repTxt);
        updatePreview();
      }

      // Live elements replacement
      const sheets = previewContainer.querySelectorAll('.paper-sheet');
      sheets.forEach(sheet => {
        const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (node.nodeValue && node.nodeValue.includes(findTxt)) {
            node.nodeValue = node.nodeValue.split(findTxt).join(repTxt);
          }
        }
      });

      if (findStatusMsg) {
        findStatusMsg.textContent = count > 0 ? `সফলভাবে ${count}টি স্থানে পরিবর্তন সম্পন্ন!` : 'শব্দটি ডকুমেন্টে পাওয়া যায়নি।';
      }
    });
  }

  // Quick Undo / Redo / Select All
  if (btnQuickSelectAll) btnQuickSelectAll.addEventListener('click', () => document.execCommand('selectAll'));
  if (btnQuickUndo) btnQuickUndo.addEventListener('click', () => document.execCommand('undo'));

  // Clipboard
  const btnRibbonPaste = document.getElementById('btn-ribbon-paste');
  const btnRibbonCopy = document.getElementById('btn-ribbon-copy');
  const btnRibbonCut = document.getElementById('btn-ribbon-cut');
  if (btnRibbonPaste) {
    btnRibbonPaste.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        document.execCommand('insertText', false, text);
      } catch (e) {
        document.execCommand('paste');
      }
    });
  }
  if (btnRibbonCopy) btnRibbonCopy.addEventListener('click', () => document.execCommand('copy'));
  if (btnRibbonCut) btnRibbonCut.addEventListener('click', () => document.execCommand('cut'));

  // Quick Access Buttons
  if (qaBtnSave) qaBtnSave.addEventListener('click', () => {
    // Primary save: use current font style
    const font = fontSelect.value.includes('bijoy') ? 'bijoy' : 'unicode';
    downloadDocument('doc', font);
  });
  if (qaBtnPrint) qaBtnPrint.addEventListener('click', () => {
    ExportDualEngine.triggerPdfPrint('preview-container', 'Microsoft Word Document - Print');
  });
  if (qaBtnUndo) qaBtnUndo.addEventListener('click', () => document.execCommand('undo'));
  if (qaBtnRedo) qaBtnRedo.addEventListener('click', () => document.execCommand('redo'));

  // Window Controls
  function toggleFullscreenView() {
    studioState.isFullscreen = !studioState.isFullscreen;
    document.body.classList.toggle('fullscreen-preview', studioState.isFullscreen);
    if (studioState.isFullscreen) {
      if (btnToggleFullscreen) btnToggleFullscreen.classList.add('active');
      if (btnViewFullscreen) btnViewFullscreen.classList.add('active');
      if (btnViewSplit) btnViewSplit.classList.remove('active');
      if (txtFullscreen) txtFullscreen.textContent = 'স্বাভাবিক ভিউ';
    } else {
      if (btnToggleFullscreen) btnToggleFullscreen.classList.remove('active');
      if (btnViewFullscreen) btnViewFullscreen.classList.remove('active');
      if (btnViewSplit) btnViewSplit.classList.add('active');
      if (txtFullscreen) txtFullscreen.textContent = 'ফুল প্রিভিউ';
    }
  }

  if (btnWindowMaximize) btnWindowMaximize.addEventListener('click', toggleFullscreenView);
  if (btnToggleFullscreen) btnToggleFullscreen.addEventListener('click', toggleFullscreenView);
  if (btnViewFullscreen) btnViewFullscreen.addEventListener('click', () => {
    if (!studioState.isFullscreen) toggleFullscreenView();
  });
  if (btnViewSplit) btnViewSplit.addEventListener('click', () => {
    if (studioState.isFullscreen) toggleFullscreenView();
  });

  if (btnToggleEditorPane) {
    btnToggleEditorPane.addEventListener('click', () => {
      const editor = document.getElementById('editor-pane');
      if (editor) {
        editor.classList.toggle('hidden');
      }
    });
  }

  if (btnWindowReset) {
    btnWindowReset.addEventListener('click', () => {
      if (confirm('আপনি কি বর্তমান ডকুমেন্ট খালি করে নতুন করে শুরু করতে চান?')) {
        inputText.value = '';
        updatePreview();
      }
    });
  }

  // Live Direct Editing
  if (btnToggleEdit) {
    btnToggleEdit.addEventListener('click', () => {
      studioState.isEditing = !studioState.isEditing;
      applyEditModeState();
    });
  }

  // Font Size
  if (btnFontDec) {
    btnFontDec.addEventListener('click', () => {
      if (studioState.fontSizePt > 9) {
        studioState.fontSizePt = Number((studioState.fontSizePt - 0.5).toFixed(1));
        if (lblFontSize) lblFontSize.textContent = studioState.fontSizePt + 'pt';
        updatePreview();
      }
    });
  }
  if (btnFontInc) {
    btnFontInc.addEventListener('click', () => {
      if (studioState.fontSizePt < 16) {
        studioState.fontSizePt = Number((studioState.fontSizePt + 0.5).toFixed(1));
        if (lblFontSize) lblFontSize.textContent = studioState.fontSizePt + 'pt';
        updatePreview();
      }
    });
  }

  // Line Spacing
  if (selectLineSpacing) {
    selectLineSpacing.addEventListener('change', (e) => {
      studioState.lineSpacing = e.target.value;
      updatePreview();
    });
  }

  // Margins
  if (selectMargin) {
    selectMargin.addEventListener('change', (e) => {
      studioState.marginClass = e.target.value;
      updateRulerMargin(studioState.marginClass);
      updatePreview();
    });
  }

  // MCQ Split Count
  if (btnSplitDec) {
    btnSplitDec.addEventListener('click', () => {
      if (studioState.splitIndex > 10) {
        studioState.splitIndex--;
        if (lblSplitCount) lblSplitCount.textContent = studioState.splitIndex + 'টি';
        updatePreview();
      }
    });
  }
  if (btnSplitInc) {
    btnSplitInc.addEventListener('click', () => {
      if (studioState.splitIndex < 30) {
        studioState.splitIndex++;
        if (lblSplitCount) lblSplitCount.textContent = studioState.splitIndex + 'টি';
        updatePreview();
      }
    });
  }

  // Ruler & Crop Marks Toggles
  if (chkToggleRuler) {
    chkToggleRuler.addEventListener('change', (e) => {
      const rulerH = document.getElementById('word-ruler-wrapper');
      const rulerV = document.getElementById('word-ruler-v');
      if (rulerH) rulerH.style.display = e.target.checked ? 'flex' : 'none';
      if (rulerV) rulerV.style.display = e.target.checked ? 'flex' : 'none';
    });
  }
  if (chkToggleCrop) {
    chkToggleCrop.addEventListener('change', (e) => {
      const marks = previewContainer.querySelectorAll('.word-crop-marks');
      marks.forEach(m => m.style.display = e.target.checked ? 'block' : 'none');
    });
  }

  // Floating Mini-Toolbar on Selection
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      if (wordMiniToolbar) wordMiniToolbar.style.display = 'none';
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 && wordMiniToolbar && previewContainer.contains(range.commonAncestorContainer)) {
      wordMiniToolbar.style.display = 'flex';
      wordMiniToolbar.style.top = `${Math.max(10, rect.top - 40)}px`;
      wordMiniToolbar.style.left = `${Math.max(10, rect.left + (rect.width / 2) - 80)}px`;
    } else if (wordMiniToolbar) {
      wordMiniToolbar.style.display = 'none';
    }
  });

  const miniBold = document.getElementById('mini-bold');
  const miniItalic = document.getElementById('mini-italic');
  const miniUnderline = document.getElementById('mini-underline');
  const miniStrike = document.getElementById('mini-strike');
  const miniSub = document.getElementById('mini-sub');
  const miniSuper = document.getElementById('mini-super');
  const miniFontDec = document.getElementById('mini-font-dec');
  const miniFontInc = document.getElementById('mini-font-inc');
  const miniForeColor = document.getElementById('mini-fore-color');
  const miniHiliteColor = document.getElementById('mini-hilite-color');
  const miniClear = document.getElementById('mini-clear');

  if (miniBold) miniBold.addEventListener('click', () => document.execCommand('bold'));
  if (miniItalic) miniItalic.addEventListener('click', () => document.execCommand('italic'));
  if (miniUnderline) miniUnderline.addEventListener('click', () => document.execCommand('underline'));
  if (miniStrike) miniStrike.addEventListener('click', () => document.execCommand('strikeThrough'));
  if (miniSub) miniSub.addEventListener('click', () => document.execCommand('subscript'));
  if (miniSuper) miniSuper.addEventListener('click', () => document.execCommand('superscript'));
  if (miniClear) miniClear.addEventListener('click', () => document.execCommand('removeFormat'));
  if (miniForeColor) miniForeColor.addEventListener('input', (e) => document.execCommand('foreColor', false, e.target.value));
  if (miniHiliteColor) miniHiliteColor.addEventListener('input', (e) => document.execCommand('hiliteColor', false, e.target.value));
  if (miniFontDec) miniFontDec.addEventListener('click', () => {
    if (btnFontDec) btnFontDec.click();
  });
  if (miniFontInc) miniFontInc.addEventListener('click', () => {
    if (btnFontInc) btnFontInc.click();
  });

  // Zoom Controls
  if (zoomRange) {
    zoomRange.addEventListener('input', (e) => {
      setZoom(Number(e.target.value));
    });
  }
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => setZoom(studioState.zoom + 10));
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => setZoom(studioState.zoom - 10));
  }
  function fitPage() {
    const sheet = previewContainer.querySelector('.paper-sheet');
    if (sheet && officeCanvas && officeCanvas.clientHeight > 100) {
      const scale = (officeCanvas.clientHeight - 70) / sheet.offsetHeight;
      setZoom(Math.round(scale * 100));
    } else {
      setZoom(72);
    }
  }
  function fitWidth() {
    const sheet = previewContainer.querySelector('.paper-sheet');
    if (sheet && officeCanvas && officeCanvas.clientWidth > 100) {
      const scale = (officeCanvas.clientWidth - 70) / sheet.offsetWidth;
      setZoom(Math.round(scale * 100));
    } else {
      setZoom(98);
    }
  }
  if (btnZoomFitPage) btnZoomFitPage.addEventListener('click', fitPage);
  if (btnZoomFitWidth) btnZoomFitWidth.addEventListener('click', fitWidth);
  if (btnZoomFitPageRibbon) btnZoomFitPageRibbon.addEventListener('click', fitPage);
  if (btnZoomFitWidthRibbon) btnZoomFitWidthRibbon.addEventListener('click', fitWidth);
  if (btnZoomPreset100) btnZoomPreset100.addEventListener('click', () => setZoom(100));

  // Template Selection
  templateSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;

    if (val === 'CQ_EXAM') {
      inputText.value = AcademicTemplates.CQ_EXAM_TEMPLATE;
      paperSizeSelect.value = 'a4-landscape';
      if (chkSkipCol1) chkSkipCol1.checked = true;
    } else if (val === 'MCQ_EXAM') {
      inputText.value = AcademicTemplates.MCQ_EXAM_TEMPLATE;
      paperSizeSelect.value = 'a4-portrait';
      if (chkSkipCol1) chkSkipCol1.checked = false;
      studioState.splitIndex = 20;
      if (lblSplitCount) lblSplitCount.textContent = '২০টি';
    } else if (val === 'STAMP_BOND') {
      inputText.value = LegalTemplates.STAMP_MONEY_BOND;
      paperSizeSelect.value = 'legal-portrait';
    } else if (val === 'TENANCY') {
      inputText.value = LegalTemplates.TENANCY_AGREEMENT;
      paperSizeSelect.value = 'legal-portrait';
    } else if (val === 'LAND_RECT') {
      inputText.value = GovtTemplates.LAND_RECTIFICATION;
      paperSizeSelect.value = 'a4-portrait';
    } else if (val === 'POLICE_GD') {
      inputText.value = GovtTemplates.POLICE_GD_LOST;
      paperSizeSelect.value = 'a4-portrait';
    } else if (val === 'PROTTOYON') {
      inputText.value = AcademicTemplates.PROTTOYON_TEMPLATE;
      paperSizeSelect.value = 'a4-portrait';
    } else if (val === 'FAIR_PERM') {
      inputText.value = GovtTemplates.FAIR_PERMISSION;
      paperSizeSelect.value = 'a4-portrait';
    }

    modeSelect.value = 'AUTO';
    updatePreview();
  });

  // Multi-Format Download Suite (Word 2003 .doc / Modern .docx / PDF in Bijoy & Unicode)
  async function downloadDocument(format, font) {
    const raw = inputText.value.trim();
    if (!raw) {
      showToast('অনুগ্রহ করে প্রথমে বক্সে কিছু টেক্সট লিখুন বা টেমপ্লেট সিলেক্ট করুন।', 'warning');
      return;
    }

    const docType = activeDocType || 'EXAM_CQ';

    // Part-12.2: প্রিভিউ যে লেআউট-অপশন দেয়, ডাউনলোডও হুবহু সেটাই পায় —
    // আগে এখানে মার্জিন-সিলেক্টের চারটি মান দুইটিতে সংকুচিত হত (প্রিভিউ ≠ ডাউনলোড)।
    const options = Object.assign(layoutOptions(), {
      format: format,
      font: font
    });

    // Part-13.1: প্রিভিউ-পেজে হাতে-করা এডিট এক্সপোর্টে আনুন (Edit Bridge)।
    // parsedData-এর কপিতে শুধু বদলানো ক্ষেত্রগুলো বসে ⇒ পুনঃপার্স হয় না, গণিত/EQ অটুট।
    let editedData = null;
    try {
      if (typeof StudioEditBridge !== 'undefined' && currentParsedData &&
          typeof StudioEditBridge.collectFromDom === 'function') {
        const _edits = StudioEditBridge.collectFromDom(previewContainer, currentParsedData);
        if (_edits && _edits.length) {
          editedData = StudioEditBridge.applyEdits(currentParsedData, _edits);
          options.parsedData = editedData;
          console.info('[StudioController] পেজ-এডিট সিঙ্ক:', _edits.length, 'টি ক্ষেত্র');
          const risky = (typeof StudioEditBridge.mathFieldsEdited === 'function')
            ? StudioEditBridge.mathFieldsEdited(previewContainer, _edits) : [];
          if (risky.length) {
            showToast('সতর্কতা: প্রশ্ন ' + risky.join(', ') + '-এ সমীকরণ আছে — টেক্সট-এডিট সেভ হবে, তবে সমীকরণ বদলাতে চাইলে বাঁ দিকের markdown-এ করুন।', 'warning');
          }
        }
      }
    } catch (e) {
      console.warn('[StudioController] edit-bridge ব্যর্থ:', e);
    }

    try {
      let blob;
      if (typeof FayzarPipeline !== 'undefined' && typeof FayzarPipeline.process === 'function') {
        const result = await FayzarPipeline.process(raw, {
          ...options,
          outputFormat: format,
          docType: docType
        });
        blob = result.content;
      } else if (format === 'docx') {
        blob = await ExportDualEngine.generateWordDoc(raw, docType, options);
      } else {
        blob = ExportDualEngine.generateWordDoc(raw, docType, options);
      }

      const ext = format === 'docx' ? 'docx' : 'doc';
      const fontSuffix = font === 'bijoy' ? 'Bijoy' : 'Unicode';
      // Auto-generate meaningful filename
      let docName = 'Document';
      if (currentParsedData && currentParsedData.header && currentParsedData.header.institute) {
        docName = currentParsedData.header.institute.replace(/[^\w\u0980-\u09FF\s]/g, '').trim().slice(0, 30);
      } else if (currentParsedData && currentParsedData.institute) {
        docName = currentParsedData.institute.replace(/[^\w\u0980-\u09FF\s]/g, '').trim().slice(0, 30);
      }
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `${docName}_${fontSuffix}_${dateStr}.${ext}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`${ext.toUpperCase()} ডাউনলোড সম্পন্ন!`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      showToast('ডাউনলোডে ত্রুটি: ' + err.message, 'error');
    }
  }

  // Quick Access Dropdown Menu Items
  if (menuExportDocBijoy) menuExportDocBijoy.addEventListener('click', () => {
    if (qaDownloadDropdown) qaDownloadDropdown.classList.add('hidden');
    downloadDocument('doc', 'bijoy');
  });
  if (menuExportDocUnicode) menuExportDocUnicode.addEventListener('click', () => {
    if (qaDownloadDropdown) qaDownloadDropdown.classList.add('hidden');
    downloadDocument('doc', 'unicode');
  });
  if (menuExportDocxUnicode) menuExportDocxUnicode.addEventListener('click', () => {
    if (qaDownloadDropdown) qaDownloadDropdown.classList.add('hidden');
    downloadDocument('docx', 'unicode');
  });
  if (menuExportDocxBijoy) menuExportDocxBijoy.addEventListener('click', () => {
    if (qaDownloadDropdown) qaDownloadDropdown.classList.add('hidden');
    downloadDocument('docx', 'bijoy');
  });
  if (menuExportPdf) menuExportPdf.addEventListener('click', () => {
    if (qaDownloadDropdown) qaDownloadDropdown.classList.add('hidden');
    ExportDualEngine.triggerPdfPrint('preview-container', 'Microsoft Word Document - Print');
  });

  // Quick Access Dropdown Toggle & Click Outside Listener
  if (qaBtnDownloadMenu && qaDownloadDropdown) {
    qaBtnDownloadMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      qaDownloadDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!qaDownloadDropdown.contains(e.target) && e.target !== qaBtnDownloadMenu) {
        qaDownloadDropdown.classList.add('hidden');
      }
    });
  }

  // File Tab 5-Card Export Suite
  if (btnFileDocBijoy) btnFileDocBijoy.addEventListener('click', () => downloadDocument('doc', 'bijoy'));
  if (btnFileDocUnicode) btnFileDocUnicode.addEventListener('click', () => downloadDocument('doc', 'unicode'));
  if (btnFileDocxUnicode) btnFileDocxUnicode.addEventListener('click', () => downloadDocument('docx', 'unicode'));
  if (btnFileDocxBijoy) btnFileDocxBijoy.addEventListener('click', () => downloadDocument('docx', 'bijoy'));
  if (btnFilePdf) btnFilePdf.addEventListener('click', () => {
    ExportDualEngine.triggerPdfPrint('preview-container', 'Microsoft Word Document - Print');
  });

  // Blank OMR Sheet
  function generateBlankOmr() {
    const omrHtml = OmrEngine.generateOmrSheetHtml('বিজ্ঞান রেসিডেন্সিয়াল মডেল স্কুল', 30, {
      font: fontSelect.value
    });
    previewContainer.innerHTML = `<div class="paper-sheet size-a4-portrait ${studioState.marginClass}">${QuestionEngine.renderCropMarks()}${omrHtml}</div>`;
    updateStatusBar();
    if (wordDocTitle) wordDocTitle.textContent = 'ব্ল্যাঙ্ক OMR শিট - Microsoft Word';
  }
  if (btnMakeOmr) btnMakeOmr.addEventListener('click', generateBlankOmr);
  if (btnInsertOmr) btnInsertOmr.addEventListener('click', generateBlankOmr);

  // ── File Import Handler ────────────────────────────────────────────
  const inputImportFileHidden = document.getElementById('input-file-import-hidden');
  const inputImportFileEditor = document.getElementById('input-import-file');
  const btnImportFile = document.getElementById('btn-import-file');

  async function handleImportFile(file) {
    if (!file || typeof ImportEngine === 'undefined') return;
    try {
      showToast('ফাইল লোড হচ্ছে...', 'info');
      const result = await ImportEngine.importFile(file);
      if (inputText) inputText.value = result.text;
      modeSelect.value = 'AUTO';
      updatePreview();
      const msg = result.wasConverted
        ? `"${file.name}" ইমপোর্ট সম্পন্ন (বিজয় → ইউনিকোড রূপান্তরিত)`
        : `"${file.name}" ইমপোর্ট সম্পন্ন`;
      showToast(msg, 'success');
    } catch (err) {
      showToast('ইমপোর্ট ব্যর্থ: ' + err.message, 'error');
    }
  }

  if (inputImportFileHidden) {
    inputImportFileHidden.addEventListener('change', (e) => { if (e.target.files[0]) handleImportFile(e.target.files[0]); });
  }
  if (inputImportFileEditor) {
    inputImportFileEditor.addEventListener('change', (e) => { if (e.target.files[0]) handleImportFile(e.target.files[0]); });
  }
  if (btnImportFile) {
    btnImportFile.addEventListener('click', () => {
      if (inputImportFileHidden) inputImportFileHidden.click();
    });
  }

  // ── MD File Import (Direct .md load — no OCR needed) ───────────────
  function loadMdFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result || '';
      if (inputText) {
        inputText.value = text;
        modeSelect.value = 'AUTO';
        updatePreview();
        showToast(`"${file.name}" লোড সম্পন্ন (${text.length} অক্ষর)`, 'success');
      }
    };
    reader.onerror = () => showToast('MD ফাইল পড়তে সমস্যা হয়েছে।', 'error');
    reader.readAsText(file, 'UTF-8');
  }

  const mdFileInput = document.getElementById('md-file-input');
  const btnImportMd = document.getElementById('btn-import-md');
  const mdDropzoneBar = document.getElementById('md-dropzone-bar');

  if (mdFileInput) {
    mdFileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) { loadMdFile(e.target.files[0]); e.target.value = ''; }
    });
  }
  if (btnImportMd) {
    btnImportMd.addEventListener('click', () => { if (mdFileInput) mdFileInput.click(); });
  }
  if (mdDropzoneBar) {
    mdDropzoneBar.addEventListener('click', () => { if (mdFileInput) mdFileInput.click(); });
    mdDropzoneBar.addEventListener('dragover', (e) => {
      e.preventDefault();
      mdDropzoneBar.classList.add('border-emerald-600', 'bg-emerald-100');
    });
    mdDropzoneBar.addEventListener('dragleave', () => {
      mdDropzoneBar.classList.remove('border-emerald-600', 'bg-emerald-100');
    });
    mdDropzoneBar.addEventListener('drop', (e) => {
      e.preventDefault();
      mdDropzoneBar.classList.remove('border-emerald-600', 'bg-emerald-100');
      const file = e.dataTransfer && e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.md') || file.name.endsWith('.txt'))) {
        loadMdFile(file);
      } else if (file) {
        handleImportFile(file); // fallback for .docx/.txt via ImportEngine
      }
    });
  }

  // Drag-and-drop on textarea (existing)
  if (inputText) {
    inputText.addEventListener('dragover', (e) => { e.preventDefault(); inputText.classList.add('border-blue-400'); });
    inputText.addEventListener('dragleave', () => inputText.classList.remove('border-blue-400'));
    inputText.addEventListener('drop', (e) => {
      e.preventDefault();
      inputText.classList.remove('border-blue-400');
      const file = e.dataTransfer && e.dataTransfer.files[0];
      if (file) handleImportFile(file);
    });
  }

  // ── Help Modal ─────────────────────────────────────────────────────
  const modalHelp = document.getElementById('modal-help');
  const btnHelpClose = document.getElementById('btn-help-close');
  const btnHelpOk = document.getElementById('btn-help-ok');
  const btnHelpShortcuts = document.getElementById('btn-help-shortcuts');

  function openHelpModal() { if (modalHelp) modalHelp.classList.remove('hidden'); }
  function closeHelpModal() { if (modalHelp) modalHelp.classList.add('hidden'); }
  if (btnHelpClose) btnHelpClose.addEventListener('click', closeHelpModal);
  if (btnHelpOk) btnHelpOk.addEventListener('click', closeHelpModal);
  if (btnHelpShortcuts) btnHelpShortcuts.addEventListener('click', openHelpModal);
  if (modalHelp) modalHelp.addEventListener('click', (e) => { if (e.target === modalHelp) closeHelpModal(); });

  // ── Keyboard Shortcuts ─────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // F1 → Help
    if (e.key === 'F1') { e.preventDefault(); openHelpModal(); return; }

    if (!ctrl) return;

    switch (e.key.toLowerCase()) {
      case 's': // Ctrl+S → Save
        e.preventDefault();
        AutoSave.save();
        showToast('সেশন সংরক্ষিত হয়েছে!', 'success');
        break;

      case 'o': // Ctrl+O → Open File
        e.preventDefault();
        if (inputImportFileHidden) inputImportFileHidden.click();
        break;

      case 'p': // Ctrl+P → Print
        if (!studioState.isEditing) {
          e.preventDefault();
          ExportDualEngine.triggerPdfPrint('preview-container', 'Microsoft Word Document - Print');
        }
        break;

      case 'z': // Ctrl+Z → Undo
        if (!studioState.isEditing) {
          e.preventDefault();
          HistoryManager.undo();
        }
        break;

      case 'y': // Ctrl+Y → Redo
        if (!studioState.isEditing) {
          e.preventDefault();
          HistoryManager.redo();
        }
        break;

      case 'f': // Ctrl+F → Find & Replace, Ctrl+Shift+F → Fullscreen
        if (shift) {
          e.preventDefault();
          if (btnToggleFullscreen) btnToggleFullscreen.click();
        } else if (!studioState.isEditing) {
          e.preventDefault();
          if (modalFindReplace) modalFindReplace.classList.remove('hidden');
          if (findInputText) findInputText.focus();
        }
        break;

      case 't': // Ctrl+Shift+T → Theme toggle
        if (shift) {
          e.preventDefault();
          if (btnToggleTheme) btnToggleTheme.click();
        }
        break;

      case '\\': // Ctrl+\ → Toggle editor pane
        e.preventDefault();
        if (btnToggleEditorPane) btnToggleEditorPane.click();
        break;
    }
  });

  // Ctrl+Z / Ctrl+Y in Quick Access buttons
  if (qaBtnUndo) qaBtnUndo.addEventListener('click', () => HistoryManager.undo());
  if (qaBtnRedo) qaBtnRedo.addEventListener('click', () => HistoryManager.redo());

  // ── Auto-Save Initialization ───────────────────────────────────────
  // Restore previous session
  const restored = AutoSave.restore();
  AutoSave.startTimer();

  // Mark dirty on any input change
  if (inputText) inputText.addEventListener('input', () => AutoSave.markDirty());

  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // URL Parameters
  const urlParams = new URLSearchParams(window.location.search);
  const fontParam = urlParams.get('font');
  const themeParam = urlParams.get('theme');
  if (themeParam) {
    applyTheme(themeParam === 'dark' ? 'theme-office-dark' : 'theme-office-light');
  }
  if (fontParam && fontSelect) {
    fontSelect.value = fontParam;
  }

  // ── Converter Bridge Integration ──────────────────────────────────────
  function loadTransferredDocument(payload) {
    if (!payload || !payload.text) return;
    if (inputText) {
      inputText.value = payload.text;
    }
    if (modeSelect && payload.docType) {
      modeSelect.value = payload.docType;
    }
    if (fontSelect && payload.font) {
      fontSelect.value = payload.font;
    }
    if (paperSizeSelect && payload.paperSize) {
      paperSizeSelect.value = payload.paperSize;
    }
    if (wordDocTitle && payload.fileName) {
      wordDocTitle.textContent = `${payload.fileName} - Microsoft Word`;
    }
    updatePreview();
    HistoryManager.snapshot();
    AutoSave.markDirty();
    showToast('ফয়জার কনভার্টার থেকে ডকুমেন্ট লোড সম্পন্ন হয়েছে!', 'success');
  }

  // Check incoming transfer via ConverterStudioBridge or URL source
  const bridgeData = (typeof ConverterStudioBridge !== 'undefined') ? ConverterStudioBridge.getTransferData() : null;
  const isFromConverter = urlParams.get('source') === 'converter';

  if (bridgeData && (isFromConverter || !restored || !inputText.value.trim())) {
    loadTransferredDocument(bridgeData);
    if (typeof ConverterStudioBridge !== 'undefined') {
      ConverterStudioBridge.clearTransferData();
    }
  } else if (!restored || !inputText.value.trim()) {
    const tmplParam = urlParams.get('template') || 'CQ_EXAM';
    templateSelect.value = tmplParam;
    templateSelect.dispatchEvent(new Event('change'));
  } else {
    // Session restored — just re-render
    updatePreview();
    showToast('আগের সেশন পুনরুদ্ধার করা হয়েছে।', 'info');
  }

  // Cross-window and iframe listeners
  window.addEventListener('message', (e) => {
    if (e.data && e.data.action === 'LOAD_DOCUMENT' && e.data.payload) {
      loadTransferredDocument(e.data.payload);
    }
  });

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bus = new BroadcastChannel('fayzar_studio_bus');
      bus.onmessage = (e) => {
        if (e.data && e.data.action === 'LOAD_DOCUMENT' && e.data.payload) {
          loadTransferredDocument(e.data.payload);
        }
      };
    } catch (err) {}
  }

  // Initial history snapshot
  HistoryManager.snapshot();
});
