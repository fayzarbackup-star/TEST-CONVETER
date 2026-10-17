# CODE_INDEX — স্বয়ংক্রিয় কোড-সূচি (হাতে বদলাবে না)

> তৈরি: `node tools/gen-map.mjs` · 2026-10-16
> পুরোটা পড়বে না। Grep করো (যেমন ফাংশন/গ্লোবাল নাম), তারপর `ফাইল` + `@লাইন` ধরে শুধু ওই অংশ Read।
> ফরম্যাট: `ফাইল` (লাইন) [গ্লোবাল] — বর্ণনা ⏎ ফাংশন@লাইন, …

## js/

- `js/ai-ocr-engine.js` (4687) [FayzarAiOcrEngine] — Fayzar Computer v2 - AI Bengali OCR & Math (LaTeX) to Bijoy .doc Engine
  STORAGE_KEYS@19, updateProModelStatusUI@36, checkDesktopBridgeOnline@84, GEMINI_PROMPT@114, GEMINI_VERIFY_PROMPT@358, DEMO_SAMPLE_TEXT@423, SUPABASE_CONFIG@454, isCloudProxyAvailable@473, loadConverterDictionary@509, init@536, bindElements@566, loadSettings@662, updateBadges@681, setupEvents@695, toggleProModel@784, convertPdfToImages@890, fastOptimizeImageFile@947, onload@961, onerror@995, handleFiles@1002, renderThumbnails@1115, deletePage@1227, undoPageDelete@1245, openPageZoom@1266, closePageZoom@1278, updatePageZoomView@1287, setZoomScale@1316, navPageZoom@1324, cancelCurrentConversion@1334, clearImage@1377, startOcrConversion@1406, startUnifiedOcr@1462, splitMediaIntoChunks@1747, processWithChunking@1755, ensureBase64@1766, fetchWithTimeout@1774, onMainAbort@1786, runFirebaseBridgeOcr@1818, runDirectGeminiOcr@1906, proxyStatusMessage@1977, applyPageCoverageGuard@2011, stripOcrArtifacts@2027, executeGeminiRequestViaSupabase@2043, absorb@2108, drain@2147, executeGeminiRequest@2243, buildModelPayload@2300, buildFetchPayload@2439, formatCountdown@2783, renderKeyStatus@2792, chip@2809, refreshKeyStatus@2838, downloadKeyStatusCsv@2864, runGasProxyOcr@2880, runDemoSimulation@2925, extractAuditNote@2953, runVerificationPipeline@2959, handleExtractionSuccess@3062, recalculateBijoyFromUnicode@3103, copyCurrentText@3113, sendToMainConverter@3124, CP1252_MAP_TABLE@3176, encodeRtfText@3185, escapeXml@3207, sanitizeMathBengaliSeparation@3217, cleanOcrResponse@3263, getRomanVal@3306, parseRichRuns@3461, parseDocumentBlocks@3514, renderRunsForRtf@3589, encodeEqInst@3615, plainEqApprox@3628, renderEquationForRtf@3640, renderSimpleMathRtf@3651, renderRunsForRtfPlain@3657, hasLatexMath@3705, renderRunsForOoxml@3709, renderEquationForOoxml@3733, rpr@3738, renderSimpleMathOoxml@3782, renderRunsForOoxmlPlain@3800, prepareSourceFigures@3882, downloadWordDocument@3923, processDownload@3992, generateMasterDocx@4172, detectFn@4195, openStudioPreviewEditor@4216, createDocxBlob@4290, PAGE_SIZES@4308, MARGINS@4314, triggerDownload@4504, setLoading@4515, toggleModal@4543, saveByokKey@4554, saveSettings@4574, resetCredits@4603, toBengaliNumber@4610, formatBytes@4615, showToast@4623, sleep@4652

- `js/bangla-converter-engine.js` (1319) [BanglaConverter] — Bangla Unicode <-> Bijoy (SutonnyMJ) Full Fidelity Conversion Engine
  CUSTOM_DICT_U2B@11, escapeRegex@13, UNICODE_TO_BIJOY_CONJUNCTS@18, UNICODE_TO_BIJOY_SINGLE@313, BANGLA_NUMBERS@397, ENGLISH_NUMBERS@398, BIJOY_TO_UNICODE_CONJUNCTS@401, BIJOY_TO_UNICODE_SINGLE@417, isBengaliChar@469, hasBengaliText@475, isBengaliConsonant@483, isWordDelimiter@489, unicodeToBijoy@494, sanitizeMathBengaliSeparation@526, _unicodeToBijoyCore@568, _convertUnicodeToBijoyRaw@608, extractCluster@742, mapCluster@797, BIJOY_ENGLISH_TOKEN_REGEX@835, bijoyToUnicode@840, _convertMixedChunk@922, _internalBijoyToUnicode@943, isBijoyText@1068, isPureEnglish@1094, convertToAllBijoy@1121, convertToAllUnicode@1129, splitMixedBengaliAndEnglish@1147, splitBijoyAndEnglish@1218, BENGALI_DIGITS@1244, ENGLISH_DIGITS@1245, convertDigits@1247, autoConvert@1264, setCustomDictionary@1273, getCustomDictionary@1278, formatQuestionPaper@1282

- `js/bg-remover-engine.js` (481) [StudioBgEngine] — Standalone Studio Background Remover Engine (v6.0 - 100% Precision)
  constructor@15, createInitialMask@20, applyPolygonCut@34, autoRemoveBackground@71, isSkin@117, applyMagicWand@165, applyColorSampleBrush@219, applyManualBrush@263, _sampleMultiBorderColors@281, _refineMask@302, renderComposite@356

- `js/diag-log.js` (141) [FayzarDiag] — ফয়জার এআই কম্পোজ — ডায়াগনস্টিক খতিয়ান ও "সমস্যা জানান" রিপোর্ট (পরীক্ষামূলক সময়ের জরিপ, ২০২৬-১০-০৮)
  clip@13, open@15, onupgradeneeded@19, onsuccess@20, onerror@21, oncomplete@29, save@33, all@36, hook@43, warn@46, error@47, showToastNotification@49, unhook@53, onRejection@60, begin@65, end@81, note@91, buildReportZip@104

- `js/doc-binary-engine.js` (1416) [DocBinaryEngine] — LEGACY OFFICE BINARY / MHTML HANDLER v6.0 (Full Fidelity Engine)
  convertDoc@33, _decodeCp1252Byte@107, _extractHtmlAndMediaFromMhtml@118, _extractHtmlFromMhtml@189, _convertHtmlToIntermediateDocx@197, _extractCssRules@253, _parseCssDeclarations@275, _resolveStyle@300, _normalizeColor@347, _fontSizeToHalfPoints@365, _xmlEscape@378, _toPoints@393, _extractImageInfo@404, _getImageExtension@465, _base64ToUint8Array@482, _uint8ToBase64@498, _assignImageIds@512, processRuns@513, _parseNodeChildren@550, _parseParagraphElement@603, _collectInlineRuns@618, _parseTableElement@659, _createRunsFromText@744, _isEnglishProse@810, _generateParagraphOoxml@820, _generateRunOoxml@830, _generateTableOoxml@886, _packDocxPackage@967, _convertPlainTextToIntermediateDocx@1081, _isMetadataNoise@1104, _extractImagesFromBinaryBytes@1116, _extractTextFromBinaryDoc@1168, readFat@1196, readAny@1239, _extractFromClx@1285, _extractDirectText@1352, _fallbackExtractFromWordDoc@1368

- `js/docx-handler.js` (1695) [DocxHandler] — DOCX Document Parser & Transformer Engine
  constructor@11, convertDocx@28, _ommlStringToNodes@155, _step1_convertMathToOpenXml@170, _step2_convertTextToBijoy@249, _mergeContiguousRuns@519, _updateRunFontAndProps@560, _reportProgress@624, fixLoneKars@634, isEnglishQuestionLine@644, formatQuestionNumber@671, formatCqSubQuestion@702, formatMcqLineTabs@724, formatQuestionPaperLine@795, formatReactionArrows@876, processOutsideMath@911, healScientificAndChemical@924, healAlgebraicPowers@1018, formatQuestionPaper@1059, renderWordWhitespace@1070, createDocxFromText@1083, PAGE_SIZES_TWIPS@1095, MARGINS_TWIPS@1100, createDocFromText@1295, PAGE_SIZES_PT@1307, MARGINS_PT@1312, renderFormattedRun@1388, renderSuperscriptsAndSubscripts@1455, renderMixedWithHtmlTags@1474, renderPlainMixedText@1492

- `js/docx-to-doc-engine.js` (1746) [DocxToDocConverter] — DOCX to DOC (Word 97-2003) Full Fidelity Converter Engine v2.0
  THEME_COLORS@11, sanitizeFontFamily@34, constructor@40, _styleMathLetters@68, _styleEqCodeLetters@91, esc@93, _toTargetScript@106, _wrapEqScriptSizes@124, _ommlToLegacyEqHtml@156, convertDocxToDoc@222, onProgress@229, _getZipFileContent@286, _parseRelationships@292, _loadMediaFiles@310, _extractImagesFromNode@387, _buildStyleResolver@469, resolve@584, _parseDocumentBody@588, _parseHeaderFooter@668, _parseSectionProperties@701, MARGIN_MAP@720, _parseParagraph@840, _parseRun@1164, SPLIT_RE@1361, _parseTable@1387, kids@1389, kid@1390, attr@1391, spec@1393, _buildWord2003Document@1532, _escapeHtml@1708, _renderMsoSpaces@1717

- `js/engines/admit-card-engine.js` (264) [AdmitCardEngine] — Fayzar Publishing Studio - Admit Card Generator Engine
  parseAdmitData@25, renderSingleCard@117, renderToHtml@214, esc@248

- `js/engines/application-engine.js` (198) [ApplicationEngine] — Fayzar Publishing Studio - Official Application & Certificate Engine
  parseApplication@10, renderToHtml@102, escape@189

- `js/engines/certificate-engine.js` (184) [CertificateEngine] — Fayzar Publishing Studio - Official Certificate & Testimonial Engine
  parseCertificate@14, renderToHtml@105, escape@170

- `js/engines/converter-studio-bridge.js` (219) [ConverterStudioBridge] — Fayzar Publishing Studio - Converter Bridge Engine
  sendToStudio@39, getTransferData@85, clearTransferData@103, formatFinishingOutput@115, getDocTypeBanglaLabel@184, openInStudio@204

- `js/engines/cv-engine.js` (192) [CVEngine] — Fayzar Publishing Studio - Curriculum Vitae & Bio-data Engine
  parseCV@14, renderToHtml@119, esc@182

- `js/engines/doc-classifier.js` (540) [DocClassifier] — Fayzar Publishing Studio - Document Classifier & Parser
  DOC_TYPES@10, GRADE_WORDS@33, parseGrade@37, factsFromFrontmatter@46, get@48, _clsFix@67, structureStats@75, layoutFromFacts@114, why@117, promoteCombined@143, isQ@150, classify@161, NON_EXAM@206, extractMetadata@486

- `js/engines/export-dual-engine.js` (3611) [ExportDualEngine] — Fayzar Publishing Studio - Multi-Format Export Engine v4.0
  stripOcrArtifacts@16, usesCreativeHeaderFallback@37, visualOptionTextForFallback@39, fallbackOptionWidth@63, isBijoyFont@89, toBijoy@98, escapeRtf@126, escapeUnicodeRtf@146, _getTextRunProcessor@164, _getMcqPlanner@185, _mcqPlan@207, _mcqPlanFallback@232, widthOf@266, formatRtfText@319, xmlEscape@406, formatDocxText@420, renderDocxRuns@431, generateWordDoc@506, _resolveParsed@552, _getFrontmatter@563, _applyExamRenumber@570, _splitCombined@594, isQ@599, strip@600, isMcqHead@601, isInstLine@603, metaNear@605, generateLegacyDoc@621, _withAuditNote@749, _auditNoteLines@759, _auditSectionDocx@765, _auditSectionRtf@778, generateCombinedExamDocx@798, generateModernDocx@832, _getQuestionEngine@939, _getCertificateEngine@948, _getStampEngine@957, _getApplicationLayout@967, _applicationLayoutDocx@975, _applicationLayoutRtf@989, _getLetterLayout@997, _letterLayoutDocx@1004, _getCvLayout@1019, _cvLayoutDocx@1026, _cvLayoutRtf@1038, _getEnCvLayout@1045, _enCvDocx@1052, _enCvRtf@1061, _getCashMemoLayout@1067, _cashMemoDocx@1074, _cashMemoRtf@1085, _getReceiptLayout@1092, _receiptDocx@1099, _receiptRtf@1110, _getCertificateLayout@1117, _certificateLayoutDocx@1124, _certificateLayoutRtf@1135, _letterLayoutRtf@1141, _getApplicationEngine@1148, _getAdmitCardEngine@1157, _getSalarySlipEngine@1166, _getRoutineEngine@1175, _getCVEngine@1184, _getJSZip@1193, _getCqPlanner@1211, _ensureCqHeaderPlacement@1232, _cqPlan@1246, _fixRtfSpacing@1285, _examLineFactor@1305, _fixDocxSpacing@1314, _collapseRunGaps@1333, txtOf@1336, _cqPlanFallback@1351, field@1376, push@1383, _cqSplitStimulus@1414, _scriptHalfPt@1433, _bumpLastSpacingRtf@1444, _bumpLastSpacingDocx@1454, _cqPageSetupRtf@1464, _cqFormat@1475, subLabel@1481, splitStem@1482, _numIndent@1487, _cqItemCtx@1495, _cqFullWidthHeaderPlan@1502, _cqSectPrInnerDocx@1507, _cqSectPrDocx@1513, _cqSectionBreakDocx@1517, _cqHeaderRtf@1522, _cqHeaderDocx@1553, pPr@1558, rPr@1559, run@1567, _cqQuestionRtf@1591, esc@1595, generateCqExamRtf@1674, generateCombinedExamRtf@1727, _cqQuestionDocx@1758, tabsXml@1764, closeTable@1788, generateCqExamDocx@1862, renderMcqTextRtf@1910, generateMcqExamRtf@1923, renderRtfItem@1972, byIdx@2038, generateMcqExamDocx@2063, renderDocxItem@2118, generateCertificateRtf@2220, generateCertificateDocx@2279, generateStampDeedRtf@2339, generateStampDeedDocx@2408, generateGovtAppRtf@2477, generateGovtAppDocx@2548, generateAdmitCardRtf@2622, generateAdmitCardDocx@2673, generateSalarySlipRtf@2733, generateSalarySlipDocx@2808, cell@2839, row@2842, has@2843, _getRtfBuilder@2881, generateRoutineRtf_v2@2890, generateRoutineRtf@2958, _getSchemaValidator@3023, validate@3034, _getThemeConfig@3043, _getDocxBuilder@3052, generateRoutineDocx_v2@3061, generateRoutineDocx@3159, generateCVRtf@3222, generateCVDocx@3299, generateGenericRtf@3386, generateGenericDocx@3418, _packageDocx@3455, triggerPdfPrint@3533

- `js/engines/figure-transfer-store.js` (74) [FayzarFigureTransfer] — Fayzar — চিত্র-হস্তান্তর স্টোর (FayzarFigureTransfer)
  openDb@15, onupgradeneeded@19, onsuccess@20, onerror@21, oncomplete@31, onabort@33, reqP@37, put@42, take@60

- `js/engines/import-engine.js` (148) [ImportEngine] — Fayzar Publishing Studio - File Import Engine
  isBijoyEncoded@17, readTxtFile@28, onload@31, onerror@44, readDocxFile@52, extractTextFromDocXml@87, extractRuns@100, importFile@125

- `js/engines/omr-engine.js` (131) [OmrEngine] — Fayzar Publishing Studio - OMR & Answer Key Generator
  generateOmrSheetHtml@10, renderOmrRow@83, generateAnswerKeyHtml@97, toBengaliNumber@117, escape@122

- `js/engines/question-engine.js` (1551) [QuestionEngine] — Fayzar Publishing Studio - Board-Standard Question Paper Typesetting Engine
  usesCreativeHeaderFallback@15, cleanQuestionSectionTitle@16, isQuestionSectionHeading@18, visualOptionTextForFallback@27, fallbackOptionWidth@51, _cqMarkTail@83, _cqSubLineParts@97, parseQuestionPaper@113, _metaLine@604, normalizeRomanText@622, parseMcqOptions@636, _getMcqPlanner@679, MCQ_HEADER_FALLBACK@693, CQ_HEADER_FALLBACK@703, applyCqHeaderFallbacks@713, nonEmpty@719, applyMcqHeaderFallbacks@733, _mcqLayoutPlan@759, _getCqPlanner@781, _cqLayoutPlan@795, renderMcqOptions@819, _getEquationConverter@868, richText@882, richTextBlock@898, isSep@902, flushTable@903, renderQuestionItem@925, subLbl@1012, renderHeaderBlock@1057, renderToHtml@1102, _extractTrailingAuditNote@1115, NOTE_RE@1117, _auditNoteLines@1144, renderAuditSheet@1150, render@1155, _renderToHtmlCore@1173, renderBookletItem@1249, renderCropMarks@1529, renderPageBreak@1533, escape@1537

- `js/engines/routine-engine.js` (161) [RoutineEngine] — Fayzar Publishing Studio - Class & Exam Routine Engine
  parseRoutine@14, renderToHtml@103, esc@151

- `js/engines/salary-slip-engine.js` (253) [SalarySlipEngine] — Fayzar Publishing Studio - Salary Slip / Pay Slip Generator Engine
  parseSalaryData@29, parseAmount@49, formatMoney@127, renderToHtml@135, esc@240

- `js/engines/stamp-engine.js` (211) [StampEngine] — Fayzar Publishing Studio - Stamp Deed & Agreement Engine
  parseDeed@12, renderToHtml@106, escape@202

- `js/engines/studio-edit-bridge.js` (403) [StudioEditBridge] — ═══════════════════════════════════════════════════════════════════════════
  bnToEn@36, normNum@41, cmp@46, oneLine@51, multiLine@56, firstLine@63, getByPath@69, setByPath@79, clone@91, applyEdits@100, allQuestions@112, isEl@124, textWithoutFigures@131, stripFigMarkers@152, preserveFigMarkers@157, fieldValue@167, nodeText@171, collectFromDom@182, mathFieldsEdited@370

- `js/engines/studio-figure-pipeline.js` (490) [StudioFigurePipeline] — ═══════════════════════════════════════════════════════════════════════════
  markerFor@38, markerRegex@40, escapeRegex@42, normDigits@45, tolerantMarkerRegex@57, balanceBraces@69, stripAllMarkers@84, countMarkers@94, hasMarkers@100, extractMarkers@103, stripMarkers@113, preserveMarkers@126, pruneMarkers@136, dataUrlToBytes@142, bytesToHex@150, _getJSZip@156, _utf8ToB64@168, _loadImage@175, onload@178, onerror@179, _svgDataUrl@184, rasterizeElement@211, tinyPngDataUrl@249, buildRtfPict@255, injectIntoRtfSync@271, injectIntoRtf@310, buildDocxDrawingXml@320, _jcFor@342, injectMarkerIntoDocumentXml@352, injectIntoDocx@368, collectStore@445, countFigures@451, totalBytes@453

- `js/equation-converter.js` (2141) [EquationConverter] — EquationConverter.js
  unicodeToBijoyPreservingDigits@16, latexToEqField@32, _extractGroup@117, _convertMacros@143, _convertSymbols@294, tokenizeEqCode@442, formatEqCodeToWordHtml@512, latexToReadableHtml@583, createOpenXmlEqRuns@672, makeMathRPr@689, createTextRun@796, normalizeUnicodeMathToLatex@819, splitTextAndMath@875, glueIsMath@963, needsEqField@1010, sanitizeSimpleMath@1036, tokenizeSimpleMath@1093, createSimpleMathRuns@1139, ommlToOpenXmlRuns@1195, _parseOmmlNode@1201, applyBoundaryFreeSymbols@1259, cleanLatexSymbols@1325, applyAccentsToCombining@1434, normalizeLatexAliases@1449, _unescapeMiniLatex@1497, sanitizePlainLatex@1517, ommlToRtfMath@1558, esc@1559, _ommlBodyToRtfMath@1576, kids@1578, local@1579, textOf@1580, rawText@1581, find@1588, convAll@1589, conv@1590, _parseOmmlTree@1643, latexToPreviewHtml@1663, readGroup@1673, render@1683, _applyOmmlScriptSizes@1730, latexToOmml@1756, escapeXml@1765, findMatchingBrace@1772, ACCENTS@1785, accentXml@1792, parseAccentAt@1798, parseChunk@1816, parseScripts@1907, ommlNodeToEqHtml@2012, firstByLocal@2018, extractMathText@2037, walkChildren@2094

- `js/faithful-mode-ui.js` (111) [FayzarFaithfulUI] — Fayzar — হুবহু-লেআউট মোডের ইন্টারফেস (FayzarFaithfulUI)
  isFaithful@18, setMode@19, card@21, paint@26, mountModeCards@36, setProgress@51, toast@56, download@60, runWizard@79, bind@101

- `js/fayzar-firebase-client.js` (311) — Fayzar Cloud Client (Firebase Firestore REST Engine v2.5)
  baseUrl@11, toFirestoreFields@16, fromFirestoreDoc@44, parseValue@48, registerOrLogin@74, getUserFiles@127, saveUserFile@147, deleteUserFile@175, getAllUsersForAdmin@191, submitFeedback@205, getAllFeedbacks@236, updateFeedbackStatus@250, deleteFeedback@265, saveGlobalCandidate@276, getAllGlobalCandidates@294

- `js/fayzar-nav.js` (45) — ফয়জার এআই কম্পোজ — অভিন্ন হেডার: মোবাইল-মেনু, বর্তমান পাতার লিংক চিহ্নিত করা, "শীঘ্রই" লিংক (css/fayzar-theme.css-এর সাথে)।
  showToastNotification@6, soonToast@17, init@21

- `js/fayzar-ocr-config.js` (462) [FayzarOcrConfig] — Fayzar Computer Web - AI OCR Secure Configuration & Multi-Key Vault
  VAULT@25, KEYS@26, _syncCooldownsToStorage@61, _unpack@78, isValidApiKey@109, buildValidatedKeysCache@118, markKeyModelCooldown@129, markKeyCooldown@146, markKeyInvalid@153, isKeyModelAvailable@167, isKeyAvailable@188, getPrimaryApiKey@195, getKeysForModel@203, getAllSystemKeys@239, getRotatedSystemKeys@246, advanceRoundRobin@256, probeKeyZeroToken@270, prewarmStandbyPool@312, getStandbyPool@357, prewarmAllKeysBackground@370, getNextRoundRobinKey@388, getActiveApiKey@402, logAudit@413, getAuditLogs@438, clearAuditLogs@445

- `js/figure-review-ui.js` (177) [FayzarFigureReview] — Fayzar — চিত্র রিভিউ স্ক্রিন (FayzarFigureReview)
  open@34, drawPage@81, drawFig@91, doCrop@107, toPage@115, nudge@130, turn@139, close@159

- `js/handoff-receiver.js` (31) — OCR পাতা (index.html): হোম-পাতা (converter.html) থেকে ?from=home দিয়ে এলে IndexedDB-র ফাইলগুলো
  run@9, onupgradeneeded@11, onsuccess@12

- `js/home-app.js` (695) — ফয়জার এআই কম্পোজ — হোম (index.html): ফাইল দেওয়া → ওয়ার্কস্পেস।
  toast@11, baseOf@13, Eng@14, queue@15, view@25, openWorkspace@36, closeWorkspace@37, side@38, mode@41, applyMode@42, setTpl@56, renderGallery@62, card@65, getQueue@83, baseName@84, busy@85, setBusy@86, onSelect@87, onReadymade@93, acceptFiles@100, syncSelected@120, srcOf@126, render@132, removeAt@164, moveItem@170, ring@178, progress@183, procReset@195, fail@200, convert@211, bindDownloads@279, setCols@300, setStyle@314, resultText@328, cleanDownload@329, textOut@346, showText@366, resetAll@371, pick@383, saveBlob@428, faithfulDownload@434, persist@445, run@448, notice@465, restore@466, openReport@514, closeReport@522, makeThumb@560, onload@566, onerror@574, recordHistory@578, ago@590, updateHistCount@596, openHistory@601, closeHistory@637, openEntry@643, downloadEntry@668

- `js/layout-engine/application-layout.js` (624) [FayzarApplicationLayout] — Fayzar — আবেদনপত্র-লেআউট (GOVT_APP) — Part-18.9
  measure@29, norm@61, cleanLine@66, splitCells@70, splitLeader@74, parse@83, push@89, close@90, _gapBefore@213, STEPS@225, geometry@232, estimateHeight@252, lineH@254, _subjectHang@294, _tableWidths@303, _kvTab@325, renderDocx@335, _docxTable@420, line@423, docxSectPr@445, renderRtf@454, _rtfTable@523, renderHtml@547, inch@552

- `js/layout-engine/archetype-map.js` (40) [ArchetypeMap] — Fayzar Publishing Studio - Archetype to DocType Mapping
  ARCHETYPE_TO_DOCTYPE@9, toDocType@30

- `js/layout-engine/cash-memo-layout.js` (568) [FayzarCashMemoLayout] — Fayzar — ক্যাশমেমো (CASH_MEMO) লেআউট, ২-আপ/৩-আপ — Part-19.4
  measure@20, lineCount@25, norm@30, cleanLine@35, toBn@39, toNum@40, DEFAULT_HEAD@54, PAGE@66, PAGE_A5@67, KALPURUSH@74, WIDTH_K@75, looksLike@84, copiesOf@89, parse@100, _segments@154, _totalFromLine@173, _signParts@180, _classifyHeader@190, _table@209, hasContent@229, _isHeadRow@234, geometry@239, _hsz@267, _spaceRun@280, _colWidths@286, _fill@298, lines@300, _rowHeight@323, _serial@330, renderDocx@344, boxed@353, _docxCopy@366, _fieldStops@392, _docxFieldLine@398, _docxTable@409, NIL@412, cell@413, row@422, numAlign@423, docxSectPr@441, renderRtf@450, field@463, _rtfTable@493, brd@495, def@496, jcOf@508, renderHtml@521, inch@526, box@528, line@529

- `js/layout-engine/certificate-layout.js` (551) [FayzarCertificateLayout] — Fayzar — সাজানো ল্যান্ডস্কেপ সনদ/প্রশংসাপত্র (PROTTOYON, ল্যান্ডস্কেপ বা মুড়িসহ) — Part-19.2
  getLL@20, getAL@25, measure@30, norm@35, cleanLine@40, frontmatter@43, STYLE@64, STEPS@69, HEAD_K@71, PAGE@73, SINGLE_MARGIN@77, wants@89, _lines@95, _split@102, key@106, parse@123, prose@128, _parsePart@137, flush@190, geometry@211, _style@234, _paras@248, mkPara@252, para@253, estimateHeight@331, one@338, renderDocx@361, partXml@380, thick@383, nil@384, SIDES@385, cell@386, _docxSide@398, _keepFooter@420, docxSectPr@426, renderRtf@438, fmt@449, cellBody@487, renderHtml@502, inch@508, run@519, partHtml@530, box@535, sheet@539

- `js/layout-engine/clean-composer.js` (212) [FayzarCleanComposer] — Fayzar — ক্লিন/রিল্যাক্সড ওয়ার্ড (FayzarCleanComposer) — TEMPLATE_COMPOSE_PLAN T1
  PAGE@14, STYLE@16, HEAD_SZ@17, AUDIT_RE@18, FIG_TAG_RE@19, PAGE_MARK_RE@20, pick@22, jszip@27, esc@33, strip@36, splitCells@44, isSepRow@58, headText@64, parse@70, runsXml@99, one@102, paraXml@111, tableXml@129, bodyXml@144, stylesXml@150, head@152, SECT@162, renderDocx@168, plainText@192, clean@195, markdown@204

- `js/layout-engine/cq-booklet-planner.js` (758) [CqBookletPlanner] — Fayzar Bangla Converter — CQ Booklet Master Layout Planner (Part-11)
  classOf@54, measure@72, lineCount@82, toLines@102, layoutUnits@113, MARGIN@115, fin@117, bnDigits@118, margin@133, gap@134, indent@135, twips@136, count@137, linePitchTwips@138, docxLineRule@139, GEOMETRY@145, HEADER_SIZES@170, CQ_HEADER_FALLBACK@173, GENERAL_HEADER_FALLBACK@187, LAYOUT_PROFILES@205, EXAM_CQ@206, EXAM_MATH@207, EXAM_COMBINED@208, EXAM_GENERAL@210, EXAM_PRIMARY@214, EXAM_ONECOL@217, profile@220, PRIMARY_GRADES@226, GRADE_WORDS@228, parseGrade@232, gradeOf@246, layoutKey@261, ONECOL_TYPES@265, columnsChoice@282, sourceColumns@290, ENGLISH_HEADER_FALLBACK@297, HEADER_LABELS@308, headerFallback@313, paperLang@319, numDelimiter@334, subLabelText@341, splitStemMark@351, geometry@364, questionIndent@410, itemGeometry@420, lineH@425, buildHeader@434, value@445, add@452, headerPreviewModel@491, headerHeight@509, measureQuestion@523, plan@574, firstPageCap@613, lastNonEmpty@634, rtfTabs@721, docxTabs@729, rtfPageSetup@740, docxSectPr@746

- `js/layout-engine/cv-layout.js` (399) [FayzarCvLayout] — Fayzar — বাংলা জীবনবৃত্তান্ত (CV_RESUME) লেআউট — Part-19.1
  getAL@17, measure@22, norm@27, cleanLine@32, maskAbbr@54, unmaskKv@55, STEPS@57, keepLast@65, PAGE@70, isBangla@78, parse@85, push@92, _takeFooter@129, geometry@157, _kvTab@178, _gap@186, estimateHeight@195, lineH@199, renderDocx@230, _docxFooter@281, docxSectPr@296, renderRtf@304, renderHtml@352, inch@358

- `js/layout-engine/doc-mhtml-packager.js` (170) [FayzarDocMhtml] — Fayzar — Word 2003 .doc ছবি-প্যাকেজার (FayzarDocMhtml)
  DATA_URI_RE@19, utf8Bytes@23, quotedPrintable@40, hex@42, push@45, wrap76@64, sizeImgTags@76, hasEmbeddedImages@97, pack@106, packBlob@158

- `js/layout-engine/docx-builder.js` (67) [FayzarDocxBuilder] — We assume the caller escapes text if necessary
  paragraph@2, run@15, runTab@25, table@29, tableRow@38, tableCell@43, sectionProperties@50

- `js/layout-engine/docx-layouts.js` (135) [FayzarDocxLayouts]
  _getThemeConfig@2, _getDocxBuilder@11, formatText@20, generateRoutineDocx@27

- `js/layout-engine/en-cv-layout.js` (445) [FayzarEnCvLayout] — Fayzar — ইংরেজি সিভি (English CV / Resume) লেআউট — TEMPLATE_COMPOSE_PLAN T2 দল ৫
  norm@18, FRONT@23, readFm@24, level@31, clean@32, HAS_BN@55, PAGE@58, LINE@60, PHOTO@61, FONT@63, wants@69, parse@81, isHeading@83, bodyKv@85, push@99, _head@136, _takeFooter@149, isFoot@151, geometry@160, _kvTabs@168, renderDocx@176, blank@197, single@199, tbl@200, _gaps@276, docxSectPr@289, renderRtf@298, esc@300, brd@317, renderHtml@381, inch@385, div@387

- `js/layout-engine/eq-field-rtf.js` (129) [FayzarEqFieldRtf] — Fayzar — Word 2003 EQ-ফিল্ড RTF বিল্ডার (FayzarEqFieldRtf)
  BN_RE@20, FUNC_RE@21, escapeUnicodeRtf@24, italicVars@44, splitRuns@58, build@99

- `js/layout-engine/exam-renumber.js` (150) [FayzarExamRenumber] — ═══════════════════════════════════════════════════════════════════════════
  isExamType@31, toBengaliDigits@36, detectBengaliStyle@44, renumberExamSections@72, stripDifficultyTags@95, RE_BRACKETED@100, RE_BARE@102, stripDifficultyTagsFromData@110

- `js/layout-engine/faithful/faithful-capture.js` (289) [FayzarFaithfulCapture] — Fayzar — হুবহু-লেআউট ক্যাপচার-চালক (FayzarFaithfulCapture)
  pick@14, mediaFromQueue@17, activeKey@39, run@53, progress@64, VERIFY_TYPES@107, repairKey@108, sameChars@109, lineMismatches@111, applyRepairs@124, verifyLines@134, cellChars@188, tableRows@189, ruleBands@190, modalCells@199, mostlyUniform@200, tableMismatches@202, applyTableRepairs@214, verifyTables@224

- `js/layout-engine/faithful/faithful-docx-builder.js` (1263) [FayzarFaithfulDocx] — Fayzar — হুবহু-লেআউট মাস্টার .docx নির্মাতা (FayzarFaithfulDocx)
  fzOn@15, clamp@20, emu@21, esc@22, pick@23, MARK@29, runsFor@30, runsPlain@50, colored@64, lineH@79, wrapLines@92, rowSpans@97, blank@99, wraps@101, tableRowHeights@112, cwp@146, colWPt@179, natural@180, rest@207, textH@215, ruleSpace@221, ruleExtra@222, itemH@224, inkOff@257, raSpace@266, raExtra@267, lead@268, planPage@270, nextTop@278, enterGapXml@397, pPr@412, paraXml@460, LTAB@502, bLen@544, DOTS@607, plainLen@610, est@611, segsOf@612, tabsSafe@613, COLON@621, tailEnd@622, hasLead@626, leadStop@630, usedTabs@636, lineRuns@637, markParaRpr@642, stripGhostDots@726, fix@729, same@736, spacer@743, tableXml@749, cellBody@767, pSz@791, cellP@812, isEmpty@853, rowBA@862, trPrFor@865, bandBorders@898, ruleBorder@929, spW@941, lnOf@942, boxRowXml@978, subTable@990, strip@993, subTableXml@1005, gridXml@1025, boxTableXml@1051, shiftInto@1060, shiftBand@1078, anchorXml@1096, emitSeq@1106, sectPr@1156, side@1163, bodyXml@1174, sizeEmptyParas@1234, build@1244

- `js/layout-engine/faithful/faithful-pipeline.js` (373) [FayzarFaithful] — Fayzar — হুবহু-লেআউট পূর্ণ পথ (FayzarFaithful)
  pick@14, pdfLib@17, pdfDoc@19, loadImage@28, measureImage@31, rotateImageData@59, splitFromNeighbor@74, ink@79, textMeasurer@102, widthFontOf@127, tableWidthFontOf@151, capture@169, layout@176, progress@179, measureAll@221, produce@363

- `js/layout-engine/faithful/faithful-prompt.js` (97) [FayzarFaithfulPrompt] — Fayzar — হুবহু-লেআউট মোডের Gemini প্রম্পট (FayzarFaithfulPrompt)
  BLOCK_TYPES@16, build@19, continuation@82

- `js/layout-engine/faithful/grid-first.js` (507) [FayzarGridFirst] — Fayzar — গ্রিড-প্রথম ছক ইঞ্জিন (FayzarGridFirst)
  fzOn@22, SERIAL@24, FILL_RE@26, baseLen@29, trimFillToWidth@34, extractGrid@50, isFillCol@72, refineHeaderSplitTable@165, refinePartialGridRows@207, openGroupEnd@223, effSpan@323, computeSerialColumnVMerges@373, applyGridFirst@402

- `js/layout-engine/faithful/header-merge.js` (169) [FayzarHeaderMerge] — Fayzar — ছকের ভাঙা হেডার-সারি সংযোজন মডিউল (FayzarHeaderMerge)
  SERIAL@18, SUBSER@19, FILL_RE@21, CHECKBOX_RE@22, baseLen@25, isColNumberRow@33, isHeaderFragmentRow@40, detectHeaderSpan@68, applyHeaderMerge@147

- `js/layout-engine/faithful/layout-ir.js` (1977) [FayzarHeaderMerge, FayzarGridFirst, FayzarLayoutIR] — Fayzar — হুবহু-লেআউট নকশা (FayzarLayoutIR)
  fzOn@24, FS_CLASS@26, KEEP_TYPES@28, inkRatioFor@36, PAPER@51, median@52, clamp@54, tabify@61, splitTableAtGaps@112, empty@116, rowBandHeights@137, wrap@158, heightsOf@174, bandOf@204, lineRowHeights@233, assign@282, exactHeights@340, isScribble@382, mergeLineRows@394, SERIAL@442, foldSerialRows@443, isSer@445, LABEL@453, foldBoxRows@477, isBox@480, isOpt@481, attachBoxLabels@507, isBoxTbl@508, dropEmptyMeasuredCol@533, join@540, perLineUnderline@552, plain@558, len@576, isP@577, toItem@597, isFillCol@689, vis@756, SUBSER0@833, SUBSER@870, isFill@887, noBox@1024, normalizePage@1036, estOf@1044, map@1106, dropSigDates@1211, DATE@1214, onFig@1215, bandsOf@1252, snapIndents@1312, flush@1320, snapFonts@1344, alignNumberTabs@1425, alignTabStops@1446, nTab@1447, oneTab@1449, fillTabs@1451, kvOf@1462, attach@1464, contOf@1474, feed@1483, applyVerticalRules@1537, applyBoxFrames@1567, inside@1573, touches@1574, own@1575, rectOf@1576, fits@1588, hasPara@1589, pageSized@1594, applyHorizontalRules@1641, xov@1650, nestFiguresInTables@1710, STD_MARGINS@1728, snapMargin@1730, unifyMargins@1746, build@1772, syncTableFonts@1857, syncLabelColumns@1874, syncFillLabels@1897, FILLX@1898, isFL@1899, syncGridPitch@1927, decideBold@1944, script@1948, norm@1953

- `js/layout-engine/faithful/layout-tags.js` (176) [FayzarLayoutTags] — Fayzar — হুবহু-লেআউট ট্যাগ-পার্সার (FayzarLayoutTags)
  TYPES@15, SYNONYM@17, AUDIT_RE@24, bn2en@28, clamp@29, parseTagBody@32, expandFill@72, parse@81, pageMarkerAt@100, cleanText@105, byPage@128, needsContinuation@135, lastBlockInfo@142, mergeContinuation@153, norm@160

- `js/layout-engine/faithful/line-fit.js` (252) [FayzarLineFit] — Fayzar — হুবহু-লেআউট লাইন-আঁটানো (FayzarLineFit) — WORK_PLAN B5
  FILL@14, FILL_G@15, lineWidthPt@17, sideIndent@25, fitTabFills@36, fitMid@41, fitTable@95, colW@99, fitItem@147, fit@208

- `js/layout-engine/faithful/page-geometry.js` (1195) [FayzarPageGeometry] — Fayzar — পাতা-মাপার ইঞ্জিন (FayzarPageGeometry)
  fzOn@19, clamp@22, median@23, inkMask@25, otsuThreshold@36, components@46, linesOf@77, split@92, RATIO@128, estimateFontPt@129, blockMetrics@140, isVRule@147, ulOf@414, score@508, fitBoxDrift@554, vDashComps@598, flush@622, snapBoxesToLines@633, clipY1@639, tooFewLines@657, shiftFrom@664, absOff@678, unclaimed@708, fillOrphans@734, solve@754, ovLim@777, xOv@779, ovY@812, fitExtentDrift@829, hits@841, applyDrift@851, verticalRules@854, horizontalRules@866, boxFrames@901, sideFree@915, rowCover@934, r1g@963, lum@967, hex2@968, pageBackground@970, blockShade@980, med@990, edgeTint@1002, wideBar@1021, mid@1043, darkBandMask@1052, hLinePositions@1092, hLineSpan@1109, brokenHLinePositions@1126, countHLines@1146, isFrameComp@1163, detectFrame@1169, pageMargins@1182

- `js/layout-engine/faithful/row-ink.js` (126) [FayzarRowInk] — Fayzar — ছকের সারি ⇒ রেখা-ভাগ, কালি-মাপে (FayzarRowInk) — ২০২৬-১০-১৩
  bandLines@19, assign@32, groupCost@40, realign@73, txt@75, key@76, filled@78, comp@79

- `js/layout-engine/fayzar-export.js` (111) [FayzarExport] — Fayzar — একক রপ্তানি-পথ (FayzarExport)
  pick@19, countFigures@25, FORMATS@28, composeNukta@37, produce@41

- `js/layout-engine/fayzar-pipeline.js` (694) [FayzarPipeline] — Fayzar Publishing Studio - Unified Pipeline Gateway (v4.0)
  safeNow@16, stripOcrArtifacts@24, _getClassifier@51, _getExportDualEngine@64, _getQuestionEngine@77, _getStampEngine@90, _getApplicationEngine@103, _getApplicationLayout@116, _getCertificateLayout@128, _getEnCvLayout@140, _getReceiptLayout@147, _getCashMemoLayout@155, _getCvLayout@166, _getLetterLayout@177, _getAdmitCardEngine@188, _getSalarySlipEngine@201, _getRoutineEngine@214, _getCVEngine@227, _getCertificateEngine@240, _getTextRunProcessor@253, process@281, _parseByDocType@402, _renderHtml@508, _buildFallbackData@631, _renderFallbackHtml@642, _escapeHtml@654, previewHtml@668, exportDocx@672, exportDoc@676, classify@680

- `js/layout-engine/figure-extractor.js` (551) [FayzarFigureExtractor] — Fayzar — সোর্স-চিত্র কাটার ইঞ্জিন (FayzarFigureExtractor)
  bnToAscii@27, clamp@28, lum@29, anyTagRe@35, parseTagBody@38, parseTags@59, replaceTagsWithMarkers@72, stripTags@84, hasLooseTags@87, NUM_PREFIX_RE@97, NUM_LINE_RE@98, normalizePlacement@99, tagsOf@103, withoutTags@104, isBlank@105, isTagOnly@106, boxToRect@129, rectToBox@140, inkCount@146, refineRect@166, estimateSkew@231, score@244, clearBorderFragments@262, visit@270, cleanImage@298, trimRect@334, maxWidthIn@353, physicalSize@372, pdfLib@386, buildPageSources@392, loadPdf@404, loadImage@415, renderPage@420, pageImageData@454, cropClean@460, extract@494, recrop@528, hasTags@545

- `js/layout-engine/frontmatter-header.js` (69) [FayzarFrontmatter] — Fayzar — ফ্রন্টম্যাটার → প্রশ্নপত্র-হেডার (FayzarFrontmatter)
  FM_RE@12, clean@15, split@23, toHeader@36, applyToHeader@55

- `js/layout-engine/gemini-prompt-factory.js` (249) [GeminiPromptFactory] — Fayzar Layout Engine - Gemini Markdown Prompt Factory v1.0
  getPrompt@22, getAllTemplateChoices@231

- `js/layout-engine/general-paper-parser.js` (128) [FayzarGeneralParser] — Fayzar — সাধারণ-ফরম্যাটের (EXAM_GENERAL) স্তরযুক্ত প্রশ্নপত্র পার্সার (Part-18.7)
  LET_ITEM@23, OPT_SPLIT@24, clean@27, stripHash@28, inlineOptions@31, splitMark@41, isNested@49, parseSections@56, newSection@60, pushQ@61, nextNonEmpty@62

- `js/layout-engine/layout-units.js` (164) [FayzarLayoutUnits] — লেআউট-ইউনিট নরমালাইজার (Part-12)
  MARGIN_MAP@29, GAP_MAP@30, MARGIN_CLASS_MAP@33, UNIT@42, clamp@44, bnDigits@47, finiteOr@57, toTwips@69, linePitchTwips@106, margin@120, marginClass@127, gap@132, indent@134, twips@135, count@137, questionIndent@145, docxLineRule@152, examLineFactor@159

- `js/layout-engine/letter-layout.js` (534) [FayzarLetterLayout] — Fayzar — প্যাড/অফিস চিঠি (OFFICE_PAD) ও প্রত্যয়নপত্র (PROTTOYON) লেআউট — Part-19.0
  getAL@20, measure@25, norm@30, cleanLine@35, AL_KINDS@69, STEPS@71, PAGE@85, HEAD_SZ@86, parse@96, hasLetterhead@139, _takeLetterhead@155, _takeSignature@172, _parseFree@223, push@226, seenText@227, _parseTail@259, geometry@282, _headSz@305, _sigWidths@314, _sigIndent@317, _gap@324, estimateHeight@334, lineH@338, renderDocx@363, _docxSignature@407, docxSectPr@427, renderRtf@436, _rtfSignature@471, renderHtml@486, inch@492

- `js/layout-engine/mcq-layout-planner.js` (731) [McqLayoutPlanner] — Fayzar Bangla Converter — MCQ Master Layout Planner (Part-10)
  classOf@54, measure@73, lineCount@83, optionVisualText@115, readGroup@117, skipSpace@126, render@145, optionWidth@199, layoutUnits@213, MARGIN@215, fin@217, bnDigits@218, margin@233, gap@234, indent@235, twips@236, count@237, linePitchTwips@238, docxLineRule@239, GEOMETRY@247, FALLBACK@271, geometry@291, lineH@325, decideOptionsGrid@330, buildHeader@368, headerHeight@414, measureQuestion@432, balancePage@475, balancePageHeader@515, plan@543, setBreak@611, docxTabs@715, rtfTabs@721

- `js/layout-engine/receipt-layout.js` (413) [FayzarReceiptLayout] — Fayzar — টাকা প্রাপ্তির রসিদ ও খরচের ভাউচার লেআউট — TEMPLATE_COMPOSE_PLAN T2 দল ৪
  norm@17, cleanLine@22, toBn@26, toNum@27, SIZES@47, PAGE_L@52, PAGE_A5@53, DEFAULT_HEAD@55, readFm@57, kindOf@63, copiesOf@76, parse@86, _classifyHeader@133, _segments@146, _signParts@159, _table@174, geometry@199, _colWidths@208, _fillers@219, _signTabs@227, _fieldStops@232, renderDocx@241, space@244, boxed@252, _docxTable@288, cell@293, row@301, docxSectPr@311, renderRtf@320, _rtfTable@355, def@358, renderHtml@371, inch@376, box@378, line@379

- `js/layout-engine/rtf-builder.js` (99) [FayzarRtfBuilder]
  document@2, paragraph@13, run@35, runTab@51, tableRow@55, tableCell@60, tableRowComplex@77

- `js/layout-engine/sample-template.js` (798) [FayzarSampleTemplate] — Fayzar — নিজের নমুনা থেকে ছাঁচ (FayzarSampleTemplate) — T3b, docs/T3_PLAN.md §৩–৪
  FIXED_TYPES@19, FILL_ONLY@20, ABBR@21, SUMMARY@22, SERIAL@23, nukta@48, plain@50, cmp@52, LABEL_KEY@53, labelKey@58, bnDigits@59, clone@60, KV_RX@65, parseKv@67, tokens@83, kvSegs@105, blankValue@112, walk@120, itemAt@123, itemLines@124, slimIR@127, fromIR@134, addSlot@137, add@140, LIST_RX@207, SALUTE@208, splitInline@210, splitContent@230, flush@236, tableFit@274, isAddr@286, addrContext@288, matchLocal@304, keyed@308, first@344, TEXT@355, PART_TEXT@356, restoreFont@391, setLines@393, fillTable@405, isSum@411, place@432, blankRow@448, fill@482, partOf@490, styleSrc@585, toTemplate@625, compose@631, MAP_PROMPT@641, cut@653, mapCandidates@656, needsRemote@666, buildMapPrompt@672, parseMap@683, hash@706, cacheGet@709, cachePut@714, mapWithGemini@724, setRole@751, suggestReadymade@767, composeAsync@784

- `js/layout-engine/schema-validator.js` (104) [FayzarSchemaValidator]
  validate@2, _validateRoutine@42, _validateQuestion@52, _validateCertificate@62, _validateStamp@68, _validateGovtApp@74, _validateAdmitCard@80, _validateSalarySlip@86, _validateCV@92

- `js/layout-engine/template-composer.js` (287) [FayzarTemplateComposer] — Fayzar — টেমপ্লেট-গ্যালারি (FayzarTemplateComposer) — TEMPLATE_COMPOSE_PLAN T2
  lines@19, MEMO@20, RCPT@22, ICON@24, svg@68, REGISTRY@74, GROUPS@152, FORMATS@194, byId@196, promptHint@199, enforce@211, check@228

- `js/layout-engine/text-run-processor.js` (187) [TextRunProcessor] — Fayzar Publishing Studio - Central Text-Run Processor
  getEquationConverter@9, getBanglaConverter@26, normalizeDegrees@48, processTextRuns@67, isolateBijoyUnsafe@164

- `js/layout-engine/theme-config.js` (41) [FayzarThemeConfig]
  FONTS@2, ROUTINE@7, SPACING@10, INSTITUTE@11, TITLE@12, SUBTITLE@13, CELL_HEADER@14, CELL_DATA@15, SIGNATURE@16, FONT_SIZES@18, PAGE@28, LANDSCAPE@29

- `js/main.js` (3901) — Fayzar Computer & Digital Center - Modular Frontend Controller
  initApp@427, initTheme@449, initShopStatus@462, initHeroSearch@493, initMobileMenu@571, clearAutoHide@578, startAutoHide@585, closeDrawer@593, openDrawer@605, handleOutsideClose@638, parseNoticeCSV@674, fetchLiveGoogleSheetNotices@700, loadDataAndRender@770, populateServiceSelects@867, getServiceIconBg@886, getServiceBadgeClass@892, toBanglaNumber@899, renderHomepageComponents@907, updateServiceCycleStatus@927, getFilteredServices@953, renderServiceBatch@965, setHomeServiceBatch@1033, nextServiceBatch@1038, prevServiceBatch@1044, startServiceAutoTimer@1050, resetServiceAutoTimer@1059, renderHomeNoticeBatch@1147, setHomeNoticeBatch@1222, nextHomeNoticeBatch@1227, prevHomeNoticeBatch@1231, startNoticeAutoTimer@1235, resetNoticeAutoTimer@1244, initHeroMiniNoticeBoard@1277, renderBatch@1307, nextBatch@1368, prevBatch@1372, startAutoTimer@1376, resetAutoTimer@1385, initChecklistController@1414, updateChecklistCycleStatus@1443, renderChecklist@1454, startChecklistAutoTimer@1586, resetChecklistAutoTimer@1595, renderServicesPage@1652, CATEGORIES@1672, renderCategory@1679, startCategoryAutoTimer@1757, resetCategoryTimer@1768, renderNoticesPage@1810, renderNotices@1826, updateTabButtons@1902, openServiceModal@1962, openNoticeModal@2002, initToolsIfPresent@2055, TAB_ICON_STYLES@2062, switchToolTab@2085, initResizerEngine@2143, onload@2180, processImage@2191, onclick@2208, initUnifiedConverterEngine@2221, showDropzoneProgress@2328, updateDropzoneProgress@2335, hideDropzoneProgress@2345, resetToStep1@2396, initiateFileScan@2410, preScanDocumentFile@2512, renderStep2Options@2622, updateTargetSelectionUI@2808, updateSubFontUI@2830, executeWizardConversion@3097, triggerAutoDownload@3271, populateResultUI@3295, updateModeButtons@3364, performConvert@3408, updateStats@3452, hasLayoutStructure@3472, detectFn@3493, initAgeCalcEngine@3630, initLandCalculatorEngine@3685, calculateDeedFees@3709, initForms@3735, downloadBlob@3823, initRateChartController@3835, filterRateItems@3847

- `js/markdown-layout-engine.js` (508) [MarkdownLayoutEngine] — Fayzar Auto-Layout Markdown Engine (AST Parser & Multi-Target Layout Renderer)
  constructor@17, shieldEquations@24, unshieldText@55, parse@65, parseMcqOptions@184, renderToOoxml@211, renderToWord2003Html@408

- `js/my-template-ui.js` (292) — ফয়জার এআই কম্পোজ — "আমার টেমপ্লেট" ইন্টারফেস (T3d, docs/T3_PLAN.md §১)।
  esc@13, toast@14, KIND@16, textMeasurer@22, thumbOf@45, onload@51, onerror@59, saveBlob@63, refresh@71, paint@77, card@78, select@90, onClick@96, importPick@116, modal@138, show@149, hide@150, createFromQueue@152, status@162, appendClose@191, preview@200, composeFromText@248, warnings@260, mount@274, selectedId@286, selected@287, clear@288

- `js/offline-data.js` (19) [OFFLINE_DATA, DEFAULT_SERVICES, DEFAULT_NOTICES, DEFAULT_SITE_CONFIG, DEFAULT_CONVERTER_DICT] — Fayzar Computer Offline Bundle Data

- `js/pptx-handler.js` (221) [PptxHandler] — PPTX HANDLER ENGINE (PowerPoint Presentation Converter)
  constructor@13, convertPptx@26

- `js/proxy-failure-policy.js` (180) [FayzarProxyPolicy] — Fayzar Computer Web — Proxy Failure Policy (pure logic, no I/O)
  soonestReopenSec@19, humanWait@36, parseProxyFailure@49, decideProxyFallback@102

- `js/session-store.js` (97) [FayzarSession] — ফয়জার এআই কম্পোজ — কাজের সেশন-ক্যাশ ও কনভার্ট-ইতিহাস (রিফ্রেশে কাজ না হারাতে, আগের আউটপুট আবার পেতে)।
  open@12, onupgradeneeded@16, onsuccess@21, onerror@22, oncomplete@30, onabort@32, save@38, load@46, historyAdd@57, historyList@68, all@70, historyUpdate@75, historyPrune@86

- `js/studio-controller.js` (2142) — Fayzar Publishing Studio - Microsoft Word Office Suite Controller
  snapshot@175, undo@198, redo@204, _restore@210, updateStatusBar@232, save@244, restore@277, startTimer@302, markDirty@308, updateIndicator@313, applyTheme@351, layoutOptions@393, withoutFigTags@414, updatePreview@419, showToast@492, updateWordDocTitle@508, applyEditModeState@521, updateRulerMargin@559, setZoom@613, getDocTypeBanglaLabel@623, insertTableIntoDoc@707, onload@735, toggleFullscreenView@872, fitPage@1054, fitWidth@1063, downloadDocument@1136, generateBlankOmr@1288, handleImportFile@1304, loadMdFile@1334, onerror@1346, openHelpModal@1401, closeHelpModal@1402, debounce@1506, loadTransferredDocument@1526, onmessage@1595, rememberTextareaCaret@1613, saveCurrentSelection@1621, resolveInsertTarget@1642, insertTextIntoTextarea@1666, insertAtTarget@1679, insertContentAtCaret@1717, figurePipeline@1731, cleanFieldText@1736, fieldSourceIndex@1746, buildFigureElement@1761, applyFiguresToPreview@1787, removeMarkerFromSource@1811, insertFigureFromElement@1823, MATH_SYMBOLS@1869, renderMathCategory@1959, openMathModal@1978, openDiagramModal@2015, attachFigureControls@2078, closeStudioModals@2124

- `js/template-store.js` (191) [FayzarTemplateStore] — ফয়জার এআই কম্পোজ — "আমার টেমপ্লেট" ভান্ডার (T3a, docs/T3_PLAN.md §৩)।
  LIMITS@11, err@15, cleanName@16, newId@18, pageCount@19, validate@22, summary@33, memoryBackend@36, clone@38, idbBackend@48, open@49, onupgradeneeded@53, onsuccess@54, onerror@55, oncomplete@63, onabort@65, create@78, askPersist@81, list@90, save@98, rename@123, exportFile@136, exportBlob@147, importFile@156, lazy@182

- `js/templates/academic-templates.js` (266) [AcademicTemplates] — Fayzar Publishing Studio - Academic Examination Templates
  CQ_EXAM_TEMPLATE@10, MCQ_EXAM_TEMPLATE@77, ROUTINE_TEMPLATE@179, PROTTOYON_TEMPLATE@186, ADMIT_CARD@201, SALARY_SLIP@224, NOTICE_BOARD@247

- `js/templates/govt-templates.js` (132) [GovtTemplates] — Fayzar Publishing Studio - Government & UDC Application Templates
  LAND_RECTIFICATION@10, POLICE_GD_LOST@41, FAIR_PERMISSION@64, DARKHAST@84, OFFICE_MEMO@104

- `js/templates/legal-templates.js` (59) [LegalTemplates] — Fayzar Publishing Studio - Legal & 300 Taka Stamp Deed Templates
  STAMP_MONEY_BOND@10, TENANCY_AGREEMENT@39

- `js/theme-lang.js` (2422) [FayzarLang, FayzarUI] — Fayzar Computer - Internationalization (i18n) & Day/Night Theme Engine
  toEnDigits@2013, getEnglishTranslation@2018, startI18nObserver@2060, stopI18nObserver@2082, translateDOMTextNodes@2089, getTimeBasedTheme@2226, determineInitialTheme@2233, applyTheme@2265, toggleTheme@2292, applyLanguage@2305, toggleLanguage@2374, getLang@2382, getTheme@2383

- `js/tools-app.js` (131) — ফয়জার এআই কম্পোজ — সার্ভিস ও টুলস পাতা (services.html)।
  toast@9, saveBlob@10, baseOf@17, openTab@24, fromHash@31, copy@39, outButtons@46, onProgress@68, save@123

- `js/xlsx-handler.js` (237) [XlsxHandler] — XLSX HANDLER ENGINE (Excel Spreadsheet Converter)
  constructor@13, convertXlsx@26, _convertString@187

## scripts/

- `scripts/brand-export.mjs` (38) — ব্র্যান্ড-ফাইল তৈরি: পূর্ণ লোগো (স্বচ্ছ PNG, ২× ও ৪×) + favicon PNG (১৬/৩২/১৮০/১৯২/৫১২)।
  html@23

- `scripts/fz-shell.mjs` (109) — ফয়জার এআই কম্পোজ — সব পাতায় অভিন্ন হেডার/ফুটার বসানো বা হালনাগাদ করা (একক উৎস)।
  nav@36, replaceBlock@82

- `scripts/fz-tool-heroes.mjs` (61) — এককালীন: টুল-পাতার পুরোনো ব্যানার → অভিন্ন .fz-tool-hero (css/fayzar-theme.css)। আবার চালালে কিছু বদলায় না।
  hero@4, edit@16, cut@23

## tools/

- `tools/agent_manager.mjs` (195) — tools/agent_manager.mjs
  getArg@23, checkStatus@28, createBundle@56, sendTask@95, reloadTabs@134, readTab@147, main@167

- `tools/autonomous_monitor.mjs` (147) — tools/autonomous_monitor.mjs
  log@21, fetchJson@27, checkRateLimit@36, inspectTab@57, cycle@112, main@134

- `tools/cv-tabs.ps1` (29) — paragraphs after table on page 1
  foreach@7

- `tools/dump-doc.ps1` (35)
  foreach@6

- `tools/gen-map.mjs` (87) — কোড-সূচি জেনারেটর: docs/CODE_INDEX.md বানায় (ফাইল → বর্ণনা → গ্লোবাল নাম → ফাংশন@লাইন)।
  walk@12, describe@23, scan@31, add@41, rel@54

- `tools/pdf-pages.ps1` (11) — wdExportFormatPDF=17, wdExportFromTo=3

## qa/

- `qa/calibrate-ink.mjs` (88) — QA/ক্যালিব্রেশন: জানা ফন্ট-আকারের লেখা (SutonnyMJ বিজয় / SutonnyOMJ ইউনিকোড / Times) Word-এ বানিয়ে, PDF করে,
  para@23, enc@35

- `qa/clean-e2e.mjs` (51) — QA (TEMPLATE_COMPOSE_PLAN T1): ক্লিন-ওয়ার্ড — আসল পাতায় (localhost:3008) ফিক্সচার → মাস্টার → বিজয় .docx → .doc,
  enc@26

- `qa/clean-word-check.ps1` (16) — QA T1 (clean Word): open a .docx/.doc in Word, print one summary line - pages, tables, OMath, EQ fields, columns, first font.

- `qa/contact-sheet.mjs` (12) — QA: service-audit-এর প্রথম পাতাগুলো ৫টি করে এক ছবিতে (দ্রুত চোখে দেখা)। চালানো: node qa/contact-sheet.mjs <service-audit outDir>

- `qa/cq-render-proof.mjs` (375) — Part-11 — সৃজনশীল (CQ) বুকলেট মাস্টার লেআউট: রেন্ডার-প্রমাণ
  jszip@47, has@55, pdfPages@58, pdfPageSize@62, pdfBboxes@66, nearEdge@254, allAt@285, sline@302, fmt@339

- `qa/cq-vs-combined.mjs` (27) — QA: একই সৃজনশীল প্রশ্ন — "শুধু সৃজনশীল" (EXAM_CQ) বনাম "যৌথ" (EXAM_COMBINED)-এর সৃজনশীল অংশ — .doc তৈরি।

- `qa/debug-block.mjs` (30) — QA/নির্ণয়: একটি পাতার নির্দিষ্ট ব্লক-বক্সে মাপার ইঞ্জিন কী দেখে — কাত-কোণ, খণ্ড, লাইন, অংশ।

- `qa/e2e-md-to-doc.mjs` (66) — Part-9j টুল: MD → (FayzarPipeline/question-engine) → docx → .doc চেইন, শুধু ব্রাউজার-এ।

- `qa/edit-score.mjs` (809) — QA (ধাপ ১): এডিট-স্কোর — তৈরি .docx ফাইলের প্রতিটি ফাঁকা ঘর আর বিন্দু/ড্যাশ/লিডার-লাইনে একটি নমুনা নাম
  ramp@27, textWidthPt@31, xmlUnesc@47, xmlEsc@49, paraTextOf@53, paraFontPt@66, editParagraphXml@75, editDocumentXml@122, splitBlocks@190, splitRows@223, splitCells@257, simulateOoxmlLayout@281, parseSect@287, pageLimit@308, measurePara@314, processSequence@403, processTable@442, computeEditScoreFromStates@577, measureEditScore@684, opt@748

- `qa/edit-score.ps1` (158) — QA (ধাপ ১): Word (COM) দিয়ে এডিট-স্কোর মাপা।
  Measure-DocState@18, foreach@25, Apply-EditsInWord@80

- `qa/faithful-capture-live.mjs` (81) — QA: হুবহু-লেআউট ক্যাপচার (ধাপ ১) আসল ফাইলে — চলমান অ্যাপ-সার্ভারে (localhost:3008 → Worker)।

- `qa/faithful-e2e.mjs` (71) — QA: হুবহু-লেআউট পূর্ণ পথ — আসল ফাইল → ক্যাপচার (ক্যাশ: <out>/capture.json) → মাপ+নকশা → মাস্টার/বিজয়/.doc।
  enc@47

- `qa/faithful-ui-e2e.mjs` (103) — QA: হুবহু-মোডের ইন্টারফেস — আসল উইজার্ড: ফাইল-ইনপুট → মোড-কার্ড → রূপান্তর-বোতাম → ৩ ডাউনলোড-বোতাম।
  check@16

- `qa/figure-e2e.mjs` (127) — QA: সোর্স-চিত্র পথের পূর্ণ যাচাই (Gemini ছাড়া) — আসল PDF → handleFiles → extract → FayzarExport।
  rot@90, save@113

- `qa/figure-ui-e2e.mjs` (83) — QA: আসল বোতাম-পথ — OCR-লেখা (চিত্র-ট্যাগসহ) → downloadWordDocument → রিভিউ স্ক্রিন → "নিশ্চিত" → ডাউনলোড।
  showToastNotification@55

- `qa/golden/_tmp-ext.mjs` (8)

- `qa/golden/asis-drift.mjs` (31) — নির্ণয়: হুবহু-ফরম (asis) নমুনায় নকশার অবস্থান (ir.json) বনাম Word-এর আসল অবস্থান (out.raw.json) — উচ্চতা কোথায় জমছে।
  norm@11

- `qa/golden/asis-layout.mjs` (44) — হুবহু-ফরমের লেআউট-স্কোর (Word লাগে না): আগে বানানো asis/<id>/out.pdf বনাম মূল PDF।
  read@14, mean@28

- `qa/golden/asis-overview.mjs` (28) — নির্ণয় (নতুন রান ছাড়া): জমা qa/golden-data/asis/*/layout-score.json থেকে প্রতি নমুনার হারানো নম্বর (অংশ-ভাগ), লাইন মেলা/হারানো,

- `qa/golden/asis-score.mjs` (67) — WORK_PLAN A5 ব্যাচ: PDF-মাত্র নমুনা (Downloads\AS it IS) → (ক্যাশ করা) ক্যাপচার → আমাদের .docx → Word-PDF → ছবি-স্কোর।
  opt@15, read@18

- `qa/golden/build-golden.ps1` (57) — WORK_PLAN A1: সোনালি নির্মাতা — দোকানের Word ফাইল → <out>/<id>/source.pdf + truth.raw.json (Word-এর আসল মাপ)।
  foreach@27

- `qa/golden/compare-truth.mjs` (167) — WORK_PLAN A4: দুই মাপ (সোনালি truth.json বনাম আমাদের আউটপুটের মাপ) তুলনা → মেট্রিক + ০–১০০ স্কোর। বিশুদ্ধ ফাংশন (টেস্টযোগ্য)।
  arr@4, tokens@7, lcsLen@9, bigrams@18, containment@20, dominant@25, items@33, matchItems@54, cont@56, tableProfile@73, compare@80, mean@100, median@101, formatCompleteness@135, share@136, visAl@138, shadedP@142, bars@143, imgs@146, score@155

- `qa/golden/docx-runs.mjs` (132) — WORK_PLAN A1: .docx-এর XML থেকে অনুচ্ছেদ-ক্রমে রান (লেখা, ফন্ট, আকার, মোটা, হেলানো, নিচে-দাগ, রং) — স্টাইল-উত্তরাধিকারসহ।
  kids@10, child@11, attr@12, toggle@13, readRPr@15, loadStyles@29, chain@43, runText@49, effective@61, collectRuns@74, walk@76, docxParagraphRuns@101, paraRuns@107, boxWalk@114

- `qa/golden/faithful-score.mjs` (71) — WORK_PLAN A4: হুবহু-মোডের স্কোর — সোনালি নমুনা → (ক্যাশ করা) ক্যাপচার → আমাদের .docx → Word-মাপ → সত্যের সাথে তুলনা।
  opt@17, read@21, avg@53

- `qa/golden/finalize-golden.mjs` (176) — WORK_PLAN A1+A2: truth.raw.json → truth.json (বিজয় রান ⇒ ইউনিকোড) + source.pdf → পাতা-PNG (২০০dpi) ও কৃত্রিম "মোবাইল-ছবি" JPG।
  flag@17, isBijoyRun@26, uniRun@29, join@34, arr@37, key@39, attachXmlRuns@41, finalize@63, renderAll@82

- `qa/golden/fmt-count.ps1` (30) — হুবহু-মোড ফরম্যাট-গণনা (Word COM): .docx/.doc ফাইলে ছায়াযুক্ত অনুচ্ছেদ, লেখা-ছায়া, ছবি, ইটালিক/সুপারস্ক্রিপ্ট রান, টেবিল, পাতা।
  foreach@7

- `qa/golden/hline-probe.mjs` (67) — নির্ণয়: টেবিল-ব্লকে আড়াআড়ি রেখা কেন ধরা পড়ে না — প্রতি সারির সেরা টানা-কালি (বর্তমান নিয়ম) বনাম ±k সারি-সহনশীল পথ।
  blockMetrics@25

- `qa/golden/image-score.mjs` (308) — WORK_PLAN A5: ছবি-ভিত্তিক স্কোর — যেসব নমুনার Word নেই (শুধু PDF/ছবি)। মূল PDF বনাম আমাদের আউটপুট-PDF (Word-রেন্ডার)
  rowProfile@13, rowOccupancy@20, despeckle@26, skeleton@37, bestShiftCorr@60, dilate@72, inkF1@79, inkF1Skel@88, lineCands@101, vrun@103, row@111, close@113, hLines@132, looseLines@142, lineMatch2@147, lineMatch@151, lineRatio@156, pageScore@160, renderMasks@168, once@187, sideBySide@243, load@245, imageScore@267, toMask@277

- `qa/golden/ink-offset.mjs` (49) — "ঠিক" লাইন-উচ্চতার লাইনে Word-এর লাইন-শুরু থেকে কালির ওপর/নিচ কত নিচে (ফন্ট/লাইন-উচ্চতা ধরে) — আমাদের out.pdf + out.raw.json থেকে
  med@41

- `qa/golden/ir-probe.mjs` (30) — নির্ণয়: ব্রাউজার/Word ছাড়া node-এ IR.build আবার (asis/<id>/measures.json — faithful-e2e লেখে) ⇒ ছকের সারি/ভাগ/উচ্চতা দেখা।
  walk@19

- `qa/golden/layout-drift-diag.mjs` (31) — কোথায় উচ্চতা জমছে: প্রতি মেলানো অনুচ্ছেদে (Word-অবস্থান − মূল-অবস্থান); বড় লাফের আগের অংশগুলো দেখায়
  norm@6

- `qa/golden/layout-score.mjs` (251) — লেআউট-স্কোর (হুবহু-মোডের মূল লক্ষ্য, ২০২৬-১০-১২): মূল PDF বনাম আমাদের out.pdf — হরফের নকশা নয়, লেআউট মাপে।
  cleanMask@14, rules@35, groups@36, close@49, matchF1@64, ramp@70, lineBandsV2@75, pageLayout@190, hits@210, layoutScore@220, toMask@227, avg@239

- `qa/golden/layout-seq-diag.mjs` (24) — একটি নমুনার সব অংশ ক্রমে: মূল y/h বনাম Word-এর পাতা/y/লাইন
  norm@8

- `qa/golden/layout-wrap-diag.mjs` (36) — প্রতি নমুনা: IR-অনুচ্ছেদের লাইন-সংখ্যা বনাম Word-এর আসল লাইন-সংখ্যা (out.raw.json)
  norm@5

- `qa/golden/line-drift.mjs` (59) — v1 lineBands & alignBands (প্রস্থজুড়ে অনুভূমিক কালি-ছায়া; কেবল আনুভূমিক রেখা বাদ)
  lineBands@2, alignBands@33

- `qa/golden/measure-doc.ps1` (23) — WORK_PLAN A4: আমাদের আউটপুট (.docx/.doc) → সোনালির মতো একই মাপ (truth.raw.json-এর গঠন) + PDF।

- `qa/golden/measure-lib.ps1` (79) — সোনালি-মাপের যৌথ লাইব্রেরি (dot-source করে ব্যবহার): খোলা Word ডকুমেন্ট → মাপ (অনুচ্ছেদ/রান/টেবিল/আকৃতি/পাতা)।
  StartOf@4, EndOf@5, Clean@6, FontOf@9, Measure-WordDoc@14, foreach@21, Write-Json@76

- `qa/golden/pdf-page-text.mjs` (24) — নির্ণয়: PDF-এর নির্দিষ্ট পাতার লেখা (প্রথম ২০০ অক্ষর) ও লেখার y-পরিসর — Word-মাপে ১ পাতা অথচ PDF-এ ২ (a18) কেন, দেখতে।

- `qa/golden/plan-jumps.mjs` (84) — নির্ণয় (সব নমুনা, নতুন রান ছাড়া): নকশা (planPage) বনাম Word-এর আসল লাইন-শুরু — কোথায় হঠাৎ লাফ (Δ(word−plan) > ৩pt) আর তার ঠিক আগের অংশ কী
  key@15, klass@18, add@40

- `qa/golden/plan-vs-word.mjs` (41) — নকশার (planPage) লাইন-শুরু বনাম Word-এর মাপা লাইন-শুরু, প্রতিটি প্রবাহ-অনুচ্ছেদে — সরণ কোথায় জন্মায় দেখতে
  read@11, key@15, add@19

- `qa/golden/probe-boxes.mjs` (26) — বাক্স-শনাক্তি যাচাই (page-geometry boxFrames) মূল PDF-এ: node qa/golden/probe-boxes.mjs a03,f2

- `qa/golden/probe-lines.mjs` (25) — নির্ণয়: ছবি-স্কোরের রেখা-খোঁজা (hLines) মূল ও আমাদের পাতায় কী পায় — y, দৈর্ঘ্য, কালি-ঘনত্ব, পুরু-অংশ।

- `qa/golden/probe-snap.mjs` (36) — নির্ণয়: একটি পাতায় লেখা-ব্লক ⇒ মুদ্রিত লাইন বসানো (page-geometry snapBoxesToLines) — node qa/golden/probe-snap.mjs a17 [পাতা=1]

- `qa/golden/rescore.mjs` (42) — শুধু মাপ আবার: আগের রানের asis/<id>/out.pdf বনাম মূল PDF — Gemini/Word ছাড়াই (মাপকাঠি বদলের পরে সব ফাইলের নতুন স্কোর)।
  spec@18

- `qa/golden/row-overhead.mjs` (56) — নির্ণয় (নতুন রান ছাড়া): ছকের প্রতিটি সারিতে Word আমাদের trHeight-এর ওপর কত বাড়তি যোগ করে।
  docXml@15, topTables@20

- `qa/golden/score-parts.mjs` (27) — নির্ণয়: ছবি-স্কোরের কোন অংশে নম্বর কাটছে (image-score.mjs pageScore: সারি-প্রোফাইল ৩৫ · কালি-মিল ৩৫ · রেখা ২০ · সরণ ১০)।
  avg@18

- `qa/golden/table-diag.mjs` (40) — নির্ণয়: হুবহু-মোডের একটি নমুনার টেবিল-ব্লকে মাপার ইঞ্জিন কী দেখে (কলাম-ফাঁক, খাড়া/আড়া রেখা, ঘরের ফন্ট) — Word ছাড়া।
  blockMetrics@25, near@33

- `qa/golden/table-dump.mjs` (51) — নির্ণয়: একটি নমুনার টেবিল-ব্লকের Gemini-ব্লক + মাপ (blockMetrics) ফাইলে রাখা — তারপর node-এ সরাসরি FayzarLayoutIR.toItem চালিয়ে
  blockMetrics@39, near@41

- `qa/golden/table-rows.mjs` (78) — নির্ণয় (নতুন রান ছাড়া): ছকের প্রতিটি সারি — নকশার সারি-উচ্চতা (IR rowHeightsPt, মূলের রেখা থেকে) বনাম Word-এর আসল সারি-উচ্চতা
  read@13, tablesOf@15, walk@18

- `qa/golden/width-ratio.mjs` (35) — নির্ণয় (ফন্ট-প্রস্থ ক্যালিব্রেশন): মূল PDF বনাম আমাদের out.pdf — মেলানো লেখা-লাইনের প্রস্থ-অনুপাত (আমাদের ÷ মূল)।
  toMask@17

- `qa/home-app-e2e.mjs` (244) — QA: নতুন সাইট — index.html (আপলোড → ওয়ার্কস্পেস → রূপান্তর → ডাউনলোড), services.html (টুলস), samples.html।
  url@18, sleep@22, waitDownload@23, startUnifiedOcr@51

- `qa/home-input-samples.mjs` (139) — হোম-পাতার INPUT নমুনা-ছবি (কৃত্রিম, প্রদর্শনের জন্য): হাতের লেখা, পুরোনো কাগজ, প্রশ্নপত্রের খসড়া, বাংলা-ইংরেজি মিশ্রিত।
  fontData@10, esc@120

- `qa/home-mcq-sample.mjs` (37) — QA/হোম-পাতা: চিত্রসহ গণিত MCQ নমুনা (qa/samples/16-mcq-math-figure.md) → একক রপ্তানি-পথে .doc / .docx
  enc@22

- `qa/inspect-doc-fields.mjs` (79) — `.doc` ইকুয়েশন-ইনস্পেক্টর — v3 (Part-9i: ক্লিন-ফিল্ড সাপোর্ট)
  cnt@16, sig@18

- `qa/key-model-check.mjs` (26) — QA: প্রতিটি কি-তে কোন OCR-মডেল সত্যিই চালু (Google models.list — জেনারেশন-কোটা খরচ হয় না)।
  mask@6

- `qa/key-ping.mjs` (23) — QA: প্রতিটি কি-তে একটি ক্ষুদ্র generateContent ("2+2") — আসল HTTP স্ট্যাটাস ও বার্তা (কি মাস্কড)।
  mask@6

- `qa/live-site-check.mjs` (22) — QA: লাইভ সাইটে (Cloudflare Pages) নতুন ফাইল পৌঁছেছে কি না — প্রতিটি ফাইলে চিহ্ন-শব্দ খোঁজা।

- `qa/lum-histogram.mjs` (31) — QA: পাতার লুমিন্যান্স-হিস্টোগ্রাম (জলছাপ/ধূসর ছাপ শনাক্তের সীমা বাছাই) — ১৫০ DPI, পূর্ণ পাতা ও "কালো-থেকে-দূরের" ধূসর।

- `qa/mcq-render-proof.mjs` (278) — Part-10 — MCQ মাস্টার লেআউট রেন্ডার প্রমাণ
  jszip@43, pdfPages@56, pdfBboxes@63, analysePage@81, inBody@84, countLines@105, col2EdgePt@202, p0w@236

- `qa/mk-cq-samples.js` (145) — !/usr/bin/env node
  splitFrontmatter@31, readGroups@43, block@65, paper@92, put@95, cycle@108, main@114

- `qa/mk-doc-from-docx.mjs` (51) — যেকোনো .docx → ৯f/৯g `.doc` (ব্রাউজারে, হুবহু প্রোডাকশন পথ: docx-to-doc.html → DocxToDocConverter)

- `qa/mk-math-fixture.mjs` (68) — !/usr/bin/env node

- `qa/mk-mcq-samples.js` (138) — Part-10: নমুনা MCQ প্রশ্নপত্র তৈরি (টেস্ট ফিক্সচার + প্রুফ স্যাম্পল)
  block@63

- `qa/nukta-compare.mjs` (33) — QA: produce() — composeNukta চালু বনাম বন্ধ; document.xml লেখা (নুক্তা-সমরূপ করে) মিলছে কি না
  get@16, composeNukta@23

- `qa/ocr-diff.mjs` (51) — QA: দুটি OCR-ফলের অর্থপূর্ণ পার্থক্য — নম্বর/ক্রম নয়, লেখার মিল দিয়ে প্রশ্ন-জোড়া খোঁজা।
  bn2en@8, body@9, key@10, segments@12, grams@21, jac@22, sim@24

- `qa/ocr-full-e2e.mjs` (78) — QA: পূর্ণ বাস্তব পথ — আসল PDF → আসল Gemini OCR → চিত্র-ট্যাগ → কাটা → রিভিউ ("নিশ্চিত") → ডাউনলোড।
  log@14, showToastNotification@29

- `qa/ocr-trace.mjs` (78) — QA: আসল OCR-এর সময়রেখা — Worker-এর প্রতিটি fayzar_status ঘটনা (trying/waiting/retry/switch/streaming/failed)
  fetch@22

- `qa/part12-content-preservation.js` (79) — Part-12 কনটেন্ট-সংরক্ষণ চেক: HEAD বনাম কর্মী-কপি — কোনো প্রশ্ন/শব্দ হারাচ্ছে না তো?
  load@15, norm@36, collect@40, walk@42

- `qa/part12-parse-probe.js` (71) — Part-12: প্রশ্ন-ইঞ্জিন পার্স আচরণ (গ্রুপিং / মার্ক / বিভাগ-মান)
  check@37

- `qa/part12-probe.js` (76) — Part-12 আচরণ-প্রোব: লাইন-স্পেসিং লক, NaN-মুক্ত এক্সপোর্ট, ম্যাথ-সীমান্ত
  pairs@18, uniq@20, check@22

- `qa/patch-lines.mjs` (10) — সাহায্যকারী: ফাইলের নির্দিষ্ট লাইন-পরিসর বদলানো (ইউনিকোড-নর্মালাইজেশনে Edit না মিললে)।

- `qa/phase0/bijoy-mixed-check.mjs` (43) — ধাপ ০: প্রোডাকশন-পথে (FayzarExport → বিজয় .docx) মিশ্র বাংলা-ইংরেজি লেখার ইংরেজি/চিহ্ন টেকে কি না।

- `qa/phase0/convert-in-browser.mjs` (52) — ধাপ ০(খ): একটি .docx-কে প্রোডাকশন-পথে (FayzarExport-এর ধাপ ৩–৫) রূপান্তর — বিজয় .docx ও Word 2003 .doc।
  enc@31

- `qa/phase0/gemini-layout-probe.mjs` (110) — ধাপ ০(ক): লেখা-ব্লকে Gemini-র বক্স কতটা নির্ভুল — একটি পাতা → পরীক্ষামূলক লেআউট-ট্যাগ প্রম্পট → আসল কালির সাথে মাপ।
  draw@37, pct@103

- `qa/phase0/make-primitives-docx.mjs` (78) — ধাপ ০(খ): "হুবহু" মোডের সব মৌলিক উপাদানসহ একটি নমুনা .docx (Word-এ খোলা = সত্যের মানদণ্ড)।
  rpr@11, tab@15, sectBreak@18, bdr@19, tbl@21, inlineImg@25, anchorImg@26

- `qa/phase0/text-to-docs.mjs` (42) — QA: একটি OCR-মার্কডাউন → প্রোডাকশন-পথে (FayzarExport) মাস্টার/বিজয় .docx ও Word 2003 .doc।
  enc@30

- `qa/phase0/word-compare.ps1` (21) — QA: Word ফাইলের কাঠামো-সারাংশ (রিগ্রেশন-তুলনার জন্য): পাতা, অনুচ্ছেদ, লেখার দৈর্ঘ্য, টেবিল (সারি×কলাম/ঘর/বর্ডার/চওড়া), ছবি।
  foreach@7

- `qa/phase0/word-structure.ps1` (43) — ধাপ ০(খ): Word (COM) দিয়ে ফাইলের কাঠামো মাপা — চিহ্ন-শব্দ (P01…, T1…, H01…) ধরে প্রতিটি উপাদান টিকল কি না।
  foreach@9

- `qa/placement-bench.mjs` (53) — QA: Worker-অবস্থান (placement) তুলনা — বর্তমান ডিপ্লয়ে:
  med@14, gen@19

- `qa/placement-sweep.ps1` (21) — QA: Worker placement অঞ্চলগুলো পালা করে ডিপ্লয় → placement-bench। শেষে wrangler.toml মূল অবস্থায় ফেরে
  foreach@9

- `qa/proxy-log.mjs` (15) — QA: Worker-এর OCR_LOG (GET /log) — শেষ ৩০টি OCR অনুরোধের চেষ্টা-বিবরণ (কি মাস্কড)। চালানো: node qa/proxy-log.mjs [n=10]

- `qa/proxy-probe.mjs` (32) — QA: Worker দিয়ে ক্ষুদ্র অনুরোধ (2+2) N বার — কোন কি/মডেলে কী উত্তর (লোকেশন-ব্লক, ব্যস্ত, সফল)।

- `qa/proxy-status.mjs` (12) — QA: Cloudflare OCR-প্রক্সির GET /status (শুধু পড়া; কি মাস্কড)। টোকেন ক্লায়েন্ট-ফাইল থেকে পড়ে, কখনো ছাপে না।

- `qa/real-flow-download.mjs` (64) — QA: ব্যবহারকারীর আসল পথ — নতুন index.html-এ ফাইল → "কনভার্ট করুন" (আসল Gemini) → ফলাফল-পাতা → .doc ডাউনলোড

- `qa/real-ocr-probe.mjs` (49) — QA: আসল ফাইলে আসল OCR (Gemini) — কাঁচা আউটপুট সংরক্ষণ + শ্রেণিবিন্যাস কী দাঁড়ায় দেখা।

- `qa/region-ink.mjs` (35) — QA: পাতার একটি অংশে (০–১ ভগ্নাংশ) কালি-পিক্সেল ও খণ্ডের পরিসংখ্যান + ক্রপ-ছবি (জলছাপের ছোপ কেমন)।

- `qa/render-pdf-page.mjs` (40) — QA: PDF-এর একটি পাতা PNG-তে (চোখে দেখার জন্য), ঐচ্ছিক ব্লক-বক্স আঁকা (হুবহু-ক্যাপচারের লেখা থেকে)।

- `qa/repro-q77.mjs` (68) — Q77 রিপ্রো: ক/খ/গ/ঘ চারটিই ভগ্নাংশ-অপশন — পুরো পাইপলাইন (markdown → .docx → `.doc` → ফিল্ড-ফরেনসিক)

- `qa/service-audit.mjs` (134) — QA: সব কনভার্টার-সার্ভিসের একসাথে যাচাই — প্রতিটি নমুনা লেখা → স্বয়ংক্রিয় ধরন-শনাক্তকরণ + নির্ধারিত ধরনে
  enc@45, esc@109

- `qa/shot-doc.mjs` (15) — .doc (Word-HTML) → PNG রেন্ডার-প্রমাণ

- `qa/side-by-side.mjs` (59) — QA: মূল PDF-এর পাতা ও আউটপুট (Word→PDF)-এর পাতা পাশাপাশি এক ছবিতে — চোখে মিলিয়ে দেখার জন্য।
  render@36

- `qa/site-chain-download.mjs` (72) — QA (Part-18.9): সাইটের আসল ডাউনলোড-শিকল — index.html-এ লেখা বসিয়ে ইঞ্জিনের downloadWordDocument

- `qa/site-shell-check.mjs` (57) — QA: নতুন থিম — প্রতিটি পাতা লোড (JS-ত্রুটি), অভিন্ন হেডার/ফুটার আছে কি না, পাশে-স্ক্রল, স্ক্রিনশট;
  url@12, onErr@19

- `qa/t3-pages.ps1` (16) — T3e: Word COM-এ .docx-গুলোর পাতা-সংখ্যা — একটি Word-সেশনে। আউটপুট: প্রতি লাইনে "<পাতা>`t<ফাইল>"
  foreach@7

- `qa/t3-score.mjs` (137) — QA (T3e, docs/T3_PLAN.md §৫): নিজের নমুনা থেকে ছাঁচ — ৫টি জোড়া (নমুনা-নকশা + নতুন খসড়া) আসল পাতায় (localhost:3008)।
  irOf@20, capToMd@23

- `qa/t3-ui-e2e.mjs` (148) — QA (T3d, docs/T3_PLAN.md): "আমার টেমপ্লেট" — আসল পাতায় (localhost:3008)।
  check@22, tap@89, show@130

- `qa/table-inspect.ps1` (22) — QA: .doc/.docx-এর প্রতিটি টেবিলের সারি-ঘর গঠন (Word COM) — জোড়া ঘর/নেস্টেড ছক ধরতে। চালানো: powershell -File qa/table-inspect.ps1 <doc> <ou
  foreach@12

- `qa/template-e2e.mjs` (99) — QA (TEMPLATE_COMPOSE_PLAN T2): ছাঁচ-গ্যালারি — আসল পাতায় (localhost:3008), Gemini খরচ ছাড়া।

- `qa/thinking-bench.mjs` (99) — QA: চিন্তার মাত্রা (thinkingLevel) তুলনা — একই ফাইল, একই প্রম্পট (নিয়ম ১৮ সহ), প্রোডাকশন-পথে (localhost:3008 → Worker)।
  fetch@24, norm@81, tokens@82, bag@83, overlap@84, qCount@85, optCount@86

- `qa/thinking-levels-check.mjs` (24) — QA: Gemini 3 মডেলগুলো কোন thinkingLevel মান গ্রহণ করে — ক্ষুদ্র অনুরোধ (কি মাস্কড, কোটা নগণ্য)।

- `qa/ui-revamp-shot.mjs` (10)

- `qa/word-measure-figures.ps1` (26) — QA: Word (COM) দিয়ে ফাইল খুলে প্রতিটি ছবির প্রকৃত মাপ (ইঞ্চি) ও অবস্থান মাপা।
  foreach@8

- `qa/word-to-pdf.ps1` (13) — QA: Word (COM) দিয়ে .docx/.doc → PDF (চোখে মেলানো ও মিল-মাপের জন্য)। চালানো: powershell -File qa/word-to-pdf.ps1 <in> <out.pdf>

## fayzar-ocr-proxy/

- `fayzar-ocr-proxy/index.js` (614) — Fayzar OCR Proxy — Cloudflare Worker (KeyLedger সংস্করণ)
  skipRestOfModel@38, originAllowed@50, cors@74, json@96, isAuthorized@104, originAllows@123, dailyCapped@135, rateLimited@152, loadJson@164, fetch@176, withThoughts@292, saveLog@310, start@349

- `fayzar-ocr-proxy/ledger.js` (393) — Fayzar OCR Proxy — KeyLedger (pure logic, no I/O)
  maskKey@24, parseRetryDelay@33, nextMidnightPT@45, todayPT@68, classifyGeminiError@78, createEntry@158, ensureEntry@173, ensureModel@190, isAvailable@196, recordSuccess@207, recordFailure@222, scoreKey@251, rankKeys@268, migrateLedger@288, buildAttemptPlan@306, buildStatus@326

## tests/ (63)

`audit-page.test.mjs` · `b5-line-fit.test.js` · `b6-gemini-blocks.test.js` · `classify-score.test.mjs` · `cq-layout.test.mjs` · `cq-marks-integrity.test.mjs` · `cq-parse-coverage.test.mjs` · `engine-model-order.test.mjs` · `eq-code-italic.test.mjs` · `eq-hardening.test.mjs` · `equation-render.test.mjs` · `exam-renumber.test.mjs` · `faithful-row-realign.test.js` · `forms-faithful.test.mjs` · `g41-faithful-format.test.mjs` · `golden-compare.test.mjs` · `key-ledger.test.js` · `mcq-layout.test.mjs` · `page-marker-strip.test.mjs` · `part-14.2-regression.test.js` · `part-14.3-mixed-sections-and-header.test.js` · `part-15.0-layout-profile-fixes.test.js` · `part-15.1-eq-field-bijoy.test.js` · `part-15.2-ocr-doc-path.test.js` · `part-15.3-degree-and-indent.test.js` · `part-16.0-export-and-mhtml.test.js` · `part-16.1-figure-extractor.test.js` · `part-16.2-figure-handoff.test.js` · `part-17.0-bijoy-mixed-run.test.js` · `part-17.2-faithful-capture.test.js` · `part-17.3-doc-converter.test.mjs` · `part-17.5-faithful-layout.test.js` · `part-18.6-layout-facts.test.js` · `part-18.9-application-layout.test.mjs` · `part-18.9-one-column.test.mjs` · `part-18.9-primary-and-parity.test.mjs` · `part-19.0-letter-layout.test.mjs` · `part-19.1-cv-layout.test.mjs` · `part-19.2-certificate-layout.test.mjs` · `part-19.3-real-ocr-fixes.test.mjs` · `part-19.4-cash-memo.test.mjs` · `part-19.4-kalpurush-exam.test.mjs` · `part12-hardening.test.mjs` · `part13-3-layout-fixes.test.mjs` · `part13-4-fixes.test.mjs` · `part14-0-studio-figure.test.mjs` · `part14-1-fixes.test.mjs` · `proxy-failure-policy.test.js` · `proxy-worker.test.mjs` · `reviewer-fixes.test.js` · `run-all.mjs` · `run-regression.js` · `source-fidelity.test.mjs` · `studio-edit-bridge.test.mjs` · `studio-edit-e2e.test.mjs` · `studio-layout-parity.test.mjs` · `t1-clean-composer.test.js` · `t2-template-composer.test.mjs` · `t3a-template-store.test.mjs` · `t3b-sample-template.test.mjs` · `t3c-sample-map.test.mjs` · `word2003-doc-artifact.test.mjs` · `word2003-font-metric.test.mjs`

## HTML পাতা (মূল ফোল্ডার)
- `converter.html` — ফয়জার এআই কম্পোজ · 0 স্ক্রিপ্ট
- `doc-converter.html` — ওয়ার্ড ডকুমেন্ট ইউনিকোড ➔ বিজয় কনভার্টার | ফয়জার এআই কম্পোজ · 15 স্ক্রিপ্ট
- `docx-to-doc.html` — DOCX থেকে DOC (Word 2003) কনভার্টার | ফয়জার এআই কম্পোজ · 6 স্ক্রিপ্ট
- `index.html` — ফয়জার এআই কম্পোজ — ছবি ও PDF থেকে Editable Word · 77 স্ক্রিপ্ট
- `layout-studio.html` — লেআউট স্টুডিও — MD থেকে Word | ফয়জার এআই কম্পোজ · 12 স্ক্রিপ্ট
- `ocr-classic.html` — পুরোনো OCR পাতা (রক্ষণাবেক্ষণ) | ফয়জার এআই কম্পোজ · 74 স্ক্রিপ্ট
- `samples.html` — নমুনা ও কীভাবে কাজ করে | ফয়জার এআই কম্পোজ · 1 স্ক্রিপ্ট
- `services.html` — সার্ভিস ও টুলস | ফয়জার এআই কম্পোজ · 70 স্ক্রিপ্ট
- `studio.html` — ওয়ার্ড স্টুডিও | ফয়জার এআই কম্পোজ · 41 স্ক্রিপ্ট
