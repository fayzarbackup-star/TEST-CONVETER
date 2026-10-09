# CODE_INDEX — স্বয়ংক্রিয় কোড-সূচি (হাতে বদলাবে না)

> তৈরি: `node tools/gen-map.mjs` · 2026-10-09
> পুরোটা পড়বে না। Grep করো (যেমন ফাংশন/গ্লোবাল নাম), তারপর `ফাইল` + `@লাইন` ধরে শুধু ওই অংশ Read।
> ফরম্যাট: `ফাইল` (লাইন) [গ্লোবাল] — বর্ণনা ⏎ ফাংশন@লাইন, …

## js/

- `js/ai-ocr-engine.js` (4659) [FayzarAiOcrEngine] — Fayzar Computer v2 - AI Bengali OCR & Math (LaTeX) to Bijoy .doc Engine
  STORAGE_KEYS@19, updateProModelStatusUI@36, checkDesktopBridgeOnline@84, GEMINI_PROMPT@114, GEMINI_VERIFY_PROMPT@355, DEMO_SAMPLE_TEXT@420, SUPABASE_CONFIG@451, isCloudProxyAvailable@470, loadConverterDictionary@506, init@533, bindElements@563, loadSettings@659, updateBadges@678, setupEvents@692, toggleProModel@781, convertPdfToImages@887, fastOptimizeImageFile@944, onload@958, onerror@992, handleFiles@999, renderThumbnails@1112, deletePage@1224, undoPageDelete@1242, openPageZoom@1263, closePageZoom@1275, updatePageZoomView@1284, setZoomScale@1313, navPageZoom@1321, cancelCurrentConversion@1331, clearImage@1374, startOcrConversion@1403, startUnifiedOcr@1459, splitMediaIntoChunks@1744, processWithChunking@1752, ensureBase64@1763, fetchWithTimeout@1771, onMainAbort@1783, runFirebaseBridgeOcr@1815, runDirectGeminiOcr@1903, proxyStatusMessage@1974, applyPageCoverageGuard@2008, stripOcrArtifacts@2024, executeGeminiRequestViaSupabase@2040, absorb@2094, drain@2125, executeGeminiRequest@2221, buildModelPayload@2276, buildFetchPayload@2415, formatCountdown@2759, renderKeyStatus@2768, chip@2785, refreshKeyStatus@2814, downloadKeyStatusCsv@2840, runGasProxyOcr@2856, runDemoSimulation@2901, extractAuditNote@2929, runVerificationPipeline@2935, handleExtractionSuccess@3038, recalculateBijoyFromUnicode@3079, copyCurrentText@3089, sendToMainConverter@3100, CP1252_MAP_TABLE@3152, encodeRtfText@3161, escapeXml@3183, sanitizeMathBengaliSeparation@3193, cleanOcrResponse@3239, getRomanVal@3282, parseRichRuns@3437, parseDocumentBlocks@3490, renderRunsForRtf@3565, encodeEqInst@3591, plainEqApprox@3604, renderEquationForRtf@3616, renderSimpleMathRtf@3627, renderRunsForRtfPlain@3633, hasLatexMath@3681, renderRunsForOoxml@3685, renderEquationForOoxml@3709, rpr@3714, renderSimpleMathOoxml@3758, renderRunsForOoxmlPlain@3776, prepareSourceFigures@3858, downloadWordDocument@3899, processDownload@3968, generateMasterDocx@4145, detectFn@4168, openStudioPreviewEditor@4189, createDocxBlob@4263, PAGE_SIZES@4281, MARGINS@4287, triggerDownload@4477, setLoading@4488, toggleModal@4516, saveByokKey@4527, saveSettings@4547, resetCredits@4576, toBengaliNumber@4583, formatBytes@4588, showToast@4596, sleep@4625

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

- `js/docx-to-doc-engine.js` (1738) [DocxToDocConverter] — DOCX to DOC (Word 97-2003) Full Fidelity Converter Engine v2.0
  THEME_COLORS@11, sanitizeFontFamily@34, constructor@40, _styleMathLetters@68, _styleEqCodeLetters@91, esc@93, _toTargetScript@106, _wrapEqScriptSizes@124, _ommlToLegacyEqHtml@156, convertDocxToDoc@222, onProgress@229, _getZipFileContent@286, _parseRelationships@292, _loadMediaFiles@310, _extractImagesFromNode@387, _buildStyleResolver@469, resolve@584, _parseDocumentBody@588, _parseHeaderFooter@668, _parseSectionProperties@701, MARGIN_MAP@720, _parseParagraph@840, _parseRun@1156, SPLIT_RE@1353, _parseTable@1379, kids@1381, kid@1382, attr@1383, spec@1385, _buildWord2003Document@1523, _escapeHtml@1699, _renderMsoSpaces@1708

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

- `js/engines/doc-classifier.js` (496) [DocClassifier] — Fayzar Publishing Studio - Document Classifier & Parser
  DOC_TYPES@10, GRADE_WORDS@32, parseGrade@36, factsFromFrontmatter@45, get@47, structureStats@67, layoutFromFacts@100, why@103, promoteCombined@129, isQ@136, classify@147, NON_EXAM@188, extractMetadata@441

- `js/engines/export-dual-engine.js` (3510) [ExportDualEngine] — Fayzar Publishing Studio - Multi-Format Export Engine v4.0
  stripOcrArtifacts@16, usesCreativeHeaderFallback@37, visualOptionTextForFallback@39, fallbackOptionWidth@63, isBijoyFont@89, toBijoy@98, escapeRtf@126, escapeUnicodeRtf@146, _getTextRunProcessor@164, _getMcqPlanner@185, _mcqPlan@207, _mcqPlanFallback@232, widthOf@266, formatRtfText@319, xmlEscape@406, formatDocxText@420, renderDocxRuns@431, generateWordDoc@506, _resolveParsed@552, _getFrontmatter@563, _applyExamRenumber@570, _splitCombined@594, isQ@599, strip@600, isMcqHead@601, isInstLine@603, metaNear@605, generateLegacyDoc@621, _withAuditNote@740, _auditNoteLines@750, _auditSectionDocx@756, _auditSectionRtf@769, generateCombinedExamDocx@789, generateModernDocx@823, _getQuestionEngine@921, _getCertificateEngine@930, _getStampEngine@939, _getApplicationLayout@949, _applicationLayoutDocx@957, _applicationLayoutRtf@971, _getLetterLayout@979, _letterLayoutDocx@986, _getCvLayout@1001, _cvLayoutDocx@1008, _cvLayoutRtf@1020, _getCertificateLayout@1027, _certificateLayoutDocx@1034, _certificateLayoutRtf@1045, _letterLayoutRtf@1051, _getApplicationEngine@1058, _getAdmitCardEngine@1067, _getSalarySlipEngine@1076, _getRoutineEngine@1085, _getCVEngine@1094, _getJSZip@1103, _getCqPlanner@1121, _ensureCqHeaderPlacement@1142, _cqPlan@1156, _fixRtfSpacing@1195, _fixDocxSpacing@1214, _collapseRunGaps@1232, txtOf@1235, _cqPlanFallback@1250, field@1275, push@1282, _cqSplitStimulus@1313, _scriptHalfPt@1332, _bumpLastSpacingRtf@1343, _bumpLastSpacingDocx@1353, _cqPageSetupRtf@1363, _cqFormat@1374, subLabel@1380, splitStem@1381, _numIndent@1386, _cqItemCtx@1394, _cqFullWidthHeaderPlan@1401, _cqSectPrInnerDocx@1406, _cqSectPrDocx@1412, _cqSectionBreakDocx@1416, _cqHeaderRtf@1421, _cqHeaderDocx@1452, pPr@1457, rPr@1458, run@1466, _cqQuestionRtf@1490, esc@1494, generateCqExamRtf@1573, generateCombinedExamRtf@1626, _cqQuestionDocx@1657, tabsXml@1663, closeTable@1687, generateCqExamDocx@1761, renderMcqTextRtf@1809, generateMcqExamRtf@1822, renderRtfItem@1871, byIdx@1937, generateMcqExamDocx@1962, renderDocxItem@2017, generateCertificateRtf@2119, generateCertificateDocx@2178, generateStampDeedRtf@2238, generateStampDeedDocx@2307, generateGovtAppRtf@2376, generateGovtAppDocx@2447, generateAdmitCardRtf@2521, generateAdmitCardDocx@2572, generateSalarySlipRtf@2632, generateSalarySlipDocx@2707, cell@2738, row@2741, has@2742, _getRtfBuilder@2780, generateRoutineRtf_v2@2789, generateRoutineRtf@2857, _getSchemaValidator@2922, validate@2933, _getThemeConfig@2942, _getDocxBuilder@2951, generateRoutineDocx_v2@2960, generateRoutineDocx@3058, generateCVRtf@3121, generateCVDocx@3198, generateGenericRtf@3285, generateGenericDocx@3317, _packageDocx@3354, triggerPdfPrint@3432

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

- `js/engines/studio-edit-bridge.js` (350) [StudioEditBridge] — ═══════════════════════════════════════════════════════════════════════════
  bnToEn@36, normNum@41, cmp@46, oneLine@51, multiLine@56, firstLine@63, getByPath@69, setByPath@79, clone@91, applyEdits@100, allQuestions@112, isEl@124, textWithoutFigures@131, stripFigMarkers@146, preserveFigMarkers@151, fieldValue@161, nodeText@165, collectFromDom@176, mathFieldsEdited@317

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

- `js/home-app.js` (563) — ফয়জার এআই কম্পোজ — হোম (index.html): ফাইল দেওয়া → ওয়ার্কস্পেস।
  toast@11, baseOf@13, Eng@14, queue@15, view@25, openWorkspace@36, closeWorkspace@37, side@38, mode@41, applyMode@42, acceptFiles@57, syncSelected@77, srcOf@83, render@89, removeAt@121, moveItem@127, ring@135, progress@140, procReset@152, fail@157, convert@168, bindDownloads@214, setCols@231, showText@244, resetAll@249, pick@261, saveBlob@306, faithfulDownload@312, persist@322, run@325, notice@340, restore@341, openReport@382, closeReport@390, makeThumb@428, onload@434, onerror@442, recordHistory@446, ago@458, updateHistCount@464, openHistory@469, closeHistory@505, openEntry@511, downloadEntry@536

- `js/layout-engine/application-layout.js` (624) [FayzarApplicationLayout] — Fayzar — আবেদনপত্র-লেআউট (GOVT_APP) — Part-18.9
  measure@29, norm@61, cleanLine@66, splitCells@70, splitLeader@74, parse@83, push@89, close@90, _gapBefore@213, STEPS@225, geometry@232, estimateHeight@252, lineH@254, _subjectHang@294, _tableWidths@303, _kvTab@325, renderDocx@335, _docxTable@420, line@423, docxSectPr@445, renderRtf@454, _rtfTable@523, renderHtml@547, inch@552

- `js/layout-engine/archetype-map.js` (40) [ArchetypeMap] — Fayzar Publishing Studio - Archetype to DocType Mapping
  ARCHETYPE_TO_DOCTYPE@9, toDocType@30

- `js/layout-engine/certificate-layout.js` (510) [FayzarCertificateLayout] — Fayzar — সাজানো ল্যান্ডস্কেপ সনদ/প্রশংসাপত্র (PROTTOYON, ল্যান্ডস্কেপ বা মুড়িসহ) — Part-19.2
  getLL@20, getAL@25, measure@30, norm@35, cleanLine@40, frontmatter@43, STYLE@64, STEPS@69, PAGE@71, wants@85, _lines@91, _split@98, key@102, parse@119, prose@124, _parsePart@131, flush@179, geometry@200, _style@218, _paras@230, mkPara@234, para@235, estimateHeight@302, one@308, renderDocx@331, partXml@349, thick@352, nil@353, SIDES@354, cell@355, _docxSide@367, _keepFooter@389, docxSectPr@395, renderRtf@407, fmt@418, cellBody@452, renderHtml@467, inch@473, run@484, partHtml@492, box@497

- `js/layout-engine/cq-booklet-planner.js` (755) [CqBookletPlanner] — Fayzar Bangla Converter — CQ Booklet Master Layout Planner (Part-11)
  classOf@54, measure@72, lineCount@82, toLines@102, layoutUnits@113, MARGIN@115, fin@117, bnDigits@118, margin@133, gap@134, indent@135, twips@136, count@137, linePitchTwips@138, docxLineRule@139, GEOMETRY@145, HEADER_SIZES@170, CQ_HEADER_FALLBACK@173, GENERAL_HEADER_FALLBACK@187, LAYOUT_PROFILES@205, EXAM_CQ@206, EXAM_MATH@207, EXAM_COMBINED@208, EXAM_GENERAL@210, EXAM_PRIMARY@214, EXAM_ONECOL@217, profile@220, PRIMARY_GRADES@226, GRADE_WORDS@228, parseGrade@232, gradeOf@246, layoutKey@261, ONECOL_TYPES@265, columnsChoice@279, sourceColumns@287, ENGLISH_HEADER_FALLBACK@294, HEADER_LABELS@305, headerFallback@310, paperLang@316, numDelimiter@331, subLabelText@338, splitStemMark@348, geometry@361, questionIndent@407, itemGeometry@417, lineH@422, buildHeader@431, value@442, add@449, headerPreviewModel@488, headerHeight@506, measureQuestion@520, plan@571, firstPageCap@610, lastNonEmpty@631, rtfTabs@718, docxTabs@726, rtfPageSetup@737, docxSectPr@743

- `js/layout-engine/cv-layout.js` (399) [FayzarCvLayout] — Fayzar — বাংলা জীবনবৃত্তান্ত (CV_RESUME) লেআউট — Part-19.1
  getAL@17, measure@22, norm@27, cleanLine@32, maskAbbr@54, unmaskKv@55, STEPS@57, keepLast@65, PAGE@70, isBangla@78, parse@85, push@92, _takeFooter@129, geometry@157, _kvTab@178, _gap@186, estimateHeight@195, lineH@199, renderDocx@230, _docxFooter@281, docxSectPr@296, renderRtf@304, renderHtml@352, inch@358

- `js/layout-engine/doc-mhtml-packager.js` (170) [FayzarDocMhtml] — Fayzar — Word 2003 .doc ছবি-প্যাকেজার (FayzarDocMhtml)
  DATA_URI_RE@19, utf8Bytes@23, quotedPrintable@40, hex@42, push@45, wrap76@64, sizeImgTags@76, hasEmbeddedImages@97, pack@106, packBlob@158

- `js/layout-engine/docx-builder.js` (67) [FayzarDocxBuilder] — We assume the caller escapes text if necessary
  paragraph@2, run@15, runTab@25, table@29, tableRow@38, tableCell@43, sectionProperties@50

- `js/layout-engine/docx-layouts.js` (135) [FayzarDocxLayouts]
  _getThemeConfig@2, _getDocxBuilder@11, formatText@20, generateRoutineDocx@27

- `js/layout-engine/eq-field-rtf.js` (129) [FayzarEqFieldRtf] — Fayzar — Word 2003 EQ-ফিল্ড RTF বিল্ডার (FayzarEqFieldRtf)
  BN_RE@20, FUNC_RE@21, escapeUnicodeRtf@24, italicVars@44, splitRuns@58, build@99

- `js/layout-engine/exam-renumber.js` (150) [FayzarExamRenumber] — ═══════════════════════════════════════════════════════════════════════════
  isExamType@31, toBengaliDigits@36, detectBengaliStyle@44, renumberExamSections@72, stripDifficultyTags@95, RE_BRACKETED@100, RE_BARE@102, stripDifficultyTagsFromData@110

- `js/layout-engine/faithful/faithful-capture.js` (96) [FayzarFaithfulCapture] — Fayzar — হুবহু-লেআউট ক্যাপচার-চালক (FayzarFaithfulCapture)
  pick@14, mediaFromQueue@17, activeKey@39, run@53, progress@63

- `js/layout-engine/faithful/faithful-docx-builder.js` (285) [FayzarFaithfulDocx] — Fayzar — হুবহু-লেআউট মাস্টার .docx নির্মাতা (FayzarFaithfulDocx)
  emu@18, esc@19, pick@20, runsFor@23, runsPlain@35, lineH@46, itemH@48, planPage@65, pPr@99, paraXml@127, lineRuns@141, spacer@150, tableXml@154, cellBody@172, isEmpty@185, trPrFor@188, gridXml@200, sectPr@214, side@221, bodyXml@228, build@266

- `js/layout-engine/faithful/faithful-pipeline.js` (269) [FayzarFaithful] — Fayzar — হুবহু-লেআউট পূর্ণ পথ (FayzarFaithful)
  pick@14, pdfLib@17, pdfDoc@19, loadImage@28, measureImage@31, rotateImageData@59, splitFromNeighbor@74, ink@79, textMeasurer@102, widthFontOf@127, tableWidthFontOf@144, capture@162, layout@169, progress@172, measureAll@192, produce@258

- `js/layout-engine/faithful/faithful-prompt.js` (87) [FayzarFaithfulPrompt] — Fayzar — হুবহু-লেআউট মোডের Gemini প্রম্পট (FayzarFaithfulPrompt)
  BLOCK_TYPES@16, build@19, continuation@72

- `js/layout-engine/faithful/layout-ir.js` (501) [FayzarLayoutIR] — Fayzar — হুবহু-লেআউট নকশা (FayzarLayoutIR)
  FS_CLASS@24, KEEP_TYPES@26, inkRatioFor@34, PAPER@49, median@50, clamp@52, tabify@59, splitTableAtGaps@100, empty@104, toItem@120, normalizePage@182, estOf@190, map@222, bandsOf@267, snapIndents@324, flush@332, snapFonts@356, applyVerticalRules@373, nestFiguresInTables@398, build@419, decideBold@471, script@475, norm@480

- `js/layout-engine/faithful/layout-tags.js` (152) [FayzarLayoutTags] — Fayzar — হুবহু-লেআউট ট্যাগ-পার্সার (FayzarLayoutTags)
  TYPES@15, SYNONYM@17, AUDIT_RE@24, bn2en@27, clamp@28, parseTagBody@31, parse@67, pageMarkerAt@79, cleanText@84, byPage@104, needsContinuation@111, lastBlockInfo@118, mergeContinuation@129, norm@136

- `js/layout-engine/faithful/page-geometry.js` (470) [FayzarPageGeometry] — Fayzar — পাতা-মাপার ইঞ্জিন (FayzarPageGeometry)
  clamp@19, median@20, inkMask@22, components@30, linesOf@61, RATIO@91, estimateFontPt@92, blockMetrics@103, isVRule@110, score@273, fitBoxDrift@319, snapBoxesToLines@356, xOv@372, ovY@403, applyDrift@414, verticalRules@417, countHLines@425, isFrameComp@442, detectFrame@448, pageMargins@457

- `js/layout-engine/fayzar-export.js` (111) [FayzarExport] — Fayzar — একক রপ্তানি-পথ (FayzarExport)
  pick@19, countFigures@25, FORMATS@28, composeNukta@37, produce@41

- `js/layout-engine/fayzar-pipeline.js` (639) [FayzarPipeline] — Fayzar Publishing Studio - Unified Pipeline Gateway (v4.0)
  safeNow@16, stripOcrArtifacts@24, _getClassifier@51, _getExportDualEngine@64, _getQuestionEngine@77, _getStampEngine@90, _getApplicationEngine@103, _getApplicationLayout@116, _getCertificateLayout@128, _getCvLayout@139, _getLetterLayout@150, _getAdmitCardEngine@161, _getSalarySlipEngine@174, _getRoutineEngine@187, _getCVEngine@200, _getCertificateEngine@213, _getTextRunProcessor@226, process@254, _parseByDocType@370, _renderHtml@465, _buildFallbackData@576, _renderFallbackHtml@587, _escapeHtml@599, previewHtml@613, exportDocx@617, exportDoc@621, classify@625

- `js/layout-engine/figure-extractor.js` (551) [FayzarFigureExtractor] — Fayzar — সোর্স-চিত্র কাটার ইঞ্জিন (FayzarFigureExtractor)
  bnToAscii@27, clamp@28, lum@29, anyTagRe@35, parseTagBody@38, parseTags@59, replaceTagsWithMarkers@72, stripTags@84, hasLooseTags@87, NUM_PREFIX_RE@97, NUM_LINE_RE@98, normalizePlacement@99, tagsOf@103, withoutTags@104, isBlank@105, isTagOnly@106, boxToRect@129, rectToBox@140, inkCount@146, refineRect@166, estimateSkew@231, score@244, clearBorderFragments@262, visit@270, cleanImage@298, trimRect@334, maxWidthIn@353, physicalSize@372, pdfLib@386, buildPageSources@392, loadPdf@404, loadImage@415, renderPage@420, pageImageData@454, cropClean@460, extract@494, recrop@528, hasTags@545

- `js/layout-engine/frontmatter-header.js` (69) [FayzarFrontmatter] — Fayzar — ফ্রন্টম্যাটার → প্রশ্নপত্র-হেডার (FayzarFrontmatter)
  FM_RE@12, clean@15, split@23, toHeader@36, applyToHeader@55

- `js/layout-engine/gemini-prompt-factory.js` (249) [GeminiPromptFactory] — Fayzar Layout Engine - Gemini Markdown Prompt Factory v1.0
  getPrompt@22, getAllTemplateChoices@231

- `js/layout-engine/general-paper-parser.js` (128) [FayzarGeneralParser] — Fayzar — সাধারণ-ফরম্যাটের (EXAM_GENERAL) স্তরযুক্ত প্রশ্নপত্র পার্সার (Part-18.7)
  LET_ITEM@23, OPT_SPLIT@24, clean@27, stripHash@28, inlineOptions@31, splitMark@41, isNested@49, parseSections@56, newSection@60, pushQ@61, nextNonEmpty@62

- `js/layout-engine/layout-units.js` (157) [FayzarLayoutUnits] — লেআউট-ইউনিট নরমালাইজার (Part-12)
  MARGIN_MAP@29, GAP_MAP@30, MARGIN_CLASS_MAP@33, UNIT@42, clamp@44, bnDigits@47, finiteOr@57, toTwips@69, linePitchTwips@106, margin@120, marginClass@127, gap@132, indent@134, twips@135, count@137, questionIndent@145, docxLineRule@152

- `js/layout-engine/letter-layout.js` (517) [FayzarLetterLayout] — Fayzar — প্যাড/অফিস চিঠি (OFFICE_PAD) ও প্রত্যয়নপত্র (PROTTOYON) লেআউট — Part-19.0
  getAL@20, measure@25, norm@30, cleanLine@35, AL_KINDS@68, STEPS@70, PAGE@84, HEAD_SZ@85, parse@95, _takeLetterhead@138, _takeSignature@155, _parseFree@206, push@209, seenText@210, _parseTail@242, geometry@265, _headSz@288, _sigWidths@297, _sigIndent@300, _gap@307, estimateHeight@317, lineH@321, renderDocx@346, _docxSignature@390, docxSectPr@410, renderRtf@419, _rtfSignature@454, renderHtml@469, inch@475

- `js/layout-engine/mcq-layout-planner.js` (731) [McqLayoutPlanner] — Fayzar Bangla Converter — MCQ Master Layout Planner (Part-10)
  classOf@54, measure@73, lineCount@83, optionVisualText@115, readGroup@117, skipSpace@126, render@145, optionWidth@199, layoutUnits@213, MARGIN@215, fin@217, bnDigits@218, margin@233, gap@234, indent@235, twips@236, count@237, linePitchTwips@238, docxLineRule@239, GEOMETRY@247, FALLBACK@271, geometry@291, lineH@325, decideOptionsGrid@330, buildHeader@368, headerHeight@414, measureQuestion@432, balancePage@475, balancePageHeader@515, plan@543, setBreak@611, docxTabs@715, rtfTabs@721

- `js/layout-engine/rtf-builder.js` (99) [FayzarRtfBuilder]
  document@2, paragraph@13, run@35, runTab@51, tableRow@55, tableCell@60, tableRowComplex@77

- `js/layout-engine/schema-validator.js` (104) [FayzarSchemaValidator]
  validate@2, _validateRoutine@42, _validateQuestion@52, _validateCertificate@62, _validateStamp@68, _validateGovtApp@74, _validateAdmitCard@80, _validateSalarySlip@86, _validateCV@92

- `js/layout-engine/text-run-processor.js` (187) [TextRunProcessor] — Fayzar Publishing Studio - Central Text-Run Processor
  getEquationConverter@9, getBanglaConverter@26, normalizeDegrees@48, processTextRuns@67, isolateBijoyUnsafe@164

- `js/layout-engine/theme-config.js` (41) [FayzarThemeConfig]
  FONTS@2, ROUTINE@7, SPACING@10, INSTITUTE@11, TITLE@12, SUBTITLE@13, CELL_HEADER@14, CELL_DATA@15, SIGNATURE@16, FONT_SIZES@18, PAGE@28, LANDSCAPE@29

- `js/main.js` (3901) — Fayzar Computer & Digital Center - Modular Frontend Controller
  initApp@427, initTheme@449, initShopStatus@462, initHeroSearch@493, initMobileMenu@571, clearAutoHide@578, startAutoHide@585, closeDrawer@593, openDrawer@605, handleOutsideClose@638, parseNoticeCSV@674, fetchLiveGoogleSheetNotices@700, loadDataAndRender@770, populateServiceSelects@867, getServiceIconBg@886, getServiceBadgeClass@892, toBanglaNumber@899, renderHomepageComponents@907, updateServiceCycleStatus@927, getFilteredServices@953, renderServiceBatch@965, setHomeServiceBatch@1033, nextServiceBatch@1038, prevServiceBatch@1044, startServiceAutoTimer@1050, resetServiceAutoTimer@1059, renderHomeNoticeBatch@1147, setHomeNoticeBatch@1222, nextHomeNoticeBatch@1227, prevHomeNoticeBatch@1231, startNoticeAutoTimer@1235, resetNoticeAutoTimer@1244, initHeroMiniNoticeBoard@1277, renderBatch@1307, nextBatch@1368, prevBatch@1372, startAutoTimer@1376, resetAutoTimer@1385, initChecklistController@1414, updateChecklistCycleStatus@1443, renderChecklist@1454, startChecklistAutoTimer@1586, resetChecklistAutoTimer@1595, renderServicesPage@1652, CATEGORIES@1672, renderCategory@1679, startCategoryAutoTimer@1757, resetCategoryTimer@1768, renderNoticesPage@1810, renderNotices@1826, updateTabButtons@1902, openServiceModal@1962, openNoticeModal@2002, initToolsIfPresent@2055, TAB_ICON_STYLES@2062, switchToolTab@2085, initResizerEngine@2143, onload@2180, processImage@2191, onclick@2208, initUnifiedConverterEngine@2221, showDropzoneProgress@2328, updateDropzoneProgress@2335, hideDropzoneProgress@2345, resetToStep1@2396, initiateFileScan@2410, preScanDocumentFile@2512, renderStep2Options@2622, updateTargetSelectionUI@2808, updateSubFontUI@2830, executeWizardConversion@3097, triggerAutoDownload@3271, populateResultUI@3295, updateModeButtons@3364, performConvert@3408, updateStats@3452, hasLayoutStructure@3472, detectFn@3493, initAgeCalcEngine@3630, initLandCalculatorEngine@3685, calculateDeedFees@3709, initForms@3735, downloadBlob@3823, initRateChartController@3835, filterRateItems@3847

- `js/markdown-layout-engine.js` (508) [MarkdownLayoutEngine] — Fayzar Auto-Layout Markdown Engine (AST Parser & Multi-Target Layout Renderer)
  constructor@17, shieldEquations@24, unshieldText@55, parse@65, parseMcqOptions@184, renderToOoxml@211, renderToWord2003Html@408

- `js/offline-data.js` (19) [OFFLINE_DATA, DEFAULT_SERVICES, DEFAULT_NOTICES, DEFAULT_SITE_CONFIG, DEFAULT_CONVERTER_DICT] — Fayzar Computer Offline Bundle Data

- `js/pptx-handler.js` (221) [PptxHandler] — PPTX HANDLER ENGINE (PowerPoint Presentation Converter)
  constructor@13, convertPptx@26

- `js/proxy-failure-policy.js` (180) [FayzarProxyPolicy] — Fayzar Computer Web — Proxy Failure Policy (pure logic, no I/O)
  soonestReopenSec@19, humanWait@36, parseProxyFailure@49, decideProxyFallback@102

- `js/session-store.js` (97) [FayzarSession] — ফয়জার এআই কম্পোজ — কাজের সেশন-ক্যাশ ও কনভার্ট-ইতিহাস (রিফ্রেশে কাজ না হারাতে, আগের আউটপুট আবার পেতে)।
  open@12, onupgradeneeded@16, onsuccess@21, onerror@22, oncomplete@30, onabort@32, save@38, load@46, historyAdd@57, historyList@68, all@70, historyUpdate@75, historyPrune@86

- `js/studio-controller.js` (2091) — Fayzar Publishing Studio - Microsoft Word Office Suite Controller
  snapshot@175, undo@198, redo@204, _restore@210, updateStatusBar@232, save@244, restore@277, startTimer@302, markDirty@308, updateIndicator@313, applyTheme@351, layoutOptions@393, withoutFigTags@414, updatePreview@419, showToast@492, updateWordDocTitle@508, applyEditModeState@521, updateRulerMargin@559, setZoom@613, getDocTypeBanglaLabel@623, insertTableIntoDoc@707, onload@735, toggleFullscreenView@860, fitPage@1042, fitWidth@1051, downloadDocument@1106, generateBlankOmr@1255, handleImportFile@1271, loadMdFile@1301, onerror@1313, openHelpModal@1368, closeHelpModal@1369, debounce@1455, loadTransferredDocument@1475, onmessage@1544, rememberTextareaCaret@1562, saveCurrentSelection@1570, resolveInsertTarget@1591, insertTextIntoTextarea@1615, insertAtTarget@1628, insertContentAtCaret@1666, figurePipeline@1680, cleanFieldText@1685, fieldSourceIndex@1695, buildFigureElement@1710, applyFiguresToPreview@1736, removeMarkerFromSource@1760, insertFigureFromElement@1772, MATH_SYMBOLS@1818, renderMathCategory@1908, openMathModal@1927, openDiagramModal@1964, attachFigureControls@2027, closeStudioModals@2073

- `js/templates/academic-templates.js` (205) [AcademicTemplates] — Fayzar Publishing Studio - Academic Examination Templates
  CQ_EXAM_TEMPLATE@10, MCQ_EXAM_TEMPLATE@77, ROUTINE_TEMPLATE@179, PROTTOYON_TEMPLATE@186

- `js/templates/govt-templates.js` (88) [GovtTemplates] — Fayzar Publishing Studio - Government & UDC Application Templates
  LAND_RECTIFICATION@10, POLICE_GD_LOST@41, FAIR_PERMISSION@64

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

- `qa/contact-sheet.mjs` (12) — QA: service-audit-এর প্রথম পাতাগুলো ৫টি করে এক ছবিতে (দ্রুত চোখে দেখা)। চালানো: node qa/contact-sheet.mjs <service-audit outDir>

- `qa/cq-render-proof.mjs` (375) — Part-11 — সৃজনশীল (CQ) বুকলেট মাস্টার লেআউট: রেন্ডার-প্রমাণ
  jszip@47, has@55, pdfPages@58, pdfPageSize@62, pdfBboxes@66, nearEdge@254, allAt@285, sline@302, fmt@339

- `qa/cq-vs-combined.mjs` (27) — QA: একই সৃজনশীল প্রশ্ন — "শুধু সৃজনশীল" (EXAM_CQ) বনাম "যৌথ" (EXAM_COMBINED)-এর সৃজনশীল অংশ — .doc তৈরি।

- `qa/debug-block.mjs` (30) — QA/নির্ণয়: একটি পাতার নির্দিষ্ট ব্লক-বক্সে মাপার ইঞ্জিন কী দেখে — কাত-কোণ, খণ্ড, লাইন, অংশ।

- `qa/e2e-md-to-doc.mjs` (66) — Part-9j টুল: MD → (FayzarPipeline/question-engine) → docx → .doc চেইন, শুধু ব্রাউজার-এ।

- `qa/faithful-capture-live.mjs` (81) — QA: হুবহু-লেআউট ক্যাপচার (ধাপ ১) আসল ফাইলে — চলমান অ্যাপ-সার্ভারে (localhost:3008 → Worker)।

- `qa/faithful-e2e.mjs` (53) — QA: হুবহু-লেআউট পূর্ণ পথ — আসল ফাইল → ক্যাপচার (ক্যাশ: <out>/capture.json) → মাপ+নকশা → মাস্টার/বিজয়/.doc।
  enc@34

- `qa/faithful-ui-e2e.mjs` (103) — QA: হুবহু-মোডের ইন্টারফেস — আসল উইজার্ড: ফাইল-ইনপুট → মোড-কার্ড → রূপান্তর-বোতাম → ৩ ডাউনলোড-বোতাম।
  check@16

- `qa/figure-e2e.mjs` (127) — QA: সোর্স-চিত্র পথের পূর্ণ যাচাই (Gemini ছাড়া) — আসল PDF → handleFiles → extract → FayzarExport।
  rot@90, save@113

- `qa/figure-ui-e2e.mjs` (83) — QA: আসল বোতাম-পথ — OCR-লেখা (চিত্র-ট্যাগসহ) → downloadWordDocument → রিভিউ স্ক্রিন → "নিশ্চিত" → ডাউনলোড।
  showToastNotification@55

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

- `qa/phase0/make-primitives-docx.mjs` (77) — ধাপ ০(খ): "হুবহু" মোডের সব মৌলিক উপাদানসহ একটি নমুনা .docx (Word-এ খোলা = সত্যের মানদণ্ড)।
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

- `qa/site-chain-download.mjs` (62) — QA (Part-18.9): সাইটের আসল ডাউনলোড-শিকল — index.html-এ লেখা বসিয়ে ইঞ্জিনের downloadWordDocument

- `qa/site-shell-check.mjs` (57) — QA: নতুন থিম — প্রতিটি পাতা লোড (JS-ত্রুটি), অভিন্ন হেডার/ফুটার আছে কি না, পাশে-স্ক্রল, স্ক্রিনশট;
  url@12, onErr@19

- `qa/thinking-bench.mjs` (99) — QA: চিন্তার মাত্রা (thinkingLevel) তুলনা — একই ফাইল, একই প্রম্পট (নিয়ম ১৮ সহ), প্রোডাকশন-পথে (localhost:3008 → Worker)।
  fetch@24, norm@81, tokens@82, bag@83, overlap@84, qCount@85, optCount@86

- `qa/thinking-levels-check.mjs` (24) — QA: Gemini 3 মডেলগুলো কোন thinkingLevel মান গ্রহণ করে — ক্ষুদ্র অনুরোধ (কি মাস্কড, কোটা নগণ্য)।

- `qa/ui-revamp-shot.mjs` (10)

- `qa/word-measure-figures.ps1` (26) — QA: Word (COM) দিয়ে ফাইল খুলে প্রতিটি ছবির প্রকৃত মাপ (ইঞ্চি) ও অবস্থান মাপা।
  foreach@8

- `qa/word-to-pdf.ps1` (13) — QA: Word (COM) দিয়ে .docx/.doc → PDF (চোখে মেলানো ও মিল-মাপের জন্য)। চালানো: powershell -File qa/word-to-pdf.ps1 <in> <out.pdf>

## fayzar-ocr-proxy/

- `fayzar-ocr-proxy/index.js` (601) — Fayzar OCR Proxy — Cloudflare Worker (KeyLedger সংস্করণ)
  skipRestOfModel@38, originAllowed@50, cors@74, json@96, isAuthorized@104, originAllows@123, dailyCapped@135, rateLimited@152, loadJson@164, fetch@176, withThoughts@280, saveLog@297, start@336

- `fayzar-ocr-proxy/ledger.js` (393) — Fayzar OCR Proxy — KeyLedger (pure logic, no I/O)
  maskKey@24, parseRetryDelay@33, nextMidnightPT@45, todayPT@68, classifyGeminiError@78, createEntry@158, ensureEntry@173, ensureModel@190, isAvailable@196, recordSuccess@207, recordFailure@222, scoreKey@251, rankKeys@268, migrateLedger@288, buildAttemptPlan@306, buildStatus@326

## tests/ (47)

`audit-page.test.mjs` · `cq-layout.test.mjs` · `cq-marks-integrity.test.mjs` · `cq-parse-coverage.test.mjs` · `engine-model-order.test.mjs` · `eq-code-italic.test.mjs` · `eq-hardening.test.mjs` · `equation-render.test.mjs` · `exam-renumber.test.mjs` · `key-ledger.test.js` · `mcq-layout.test.mjs` · `page-marker-strip.test.mjs` · `part-14.2-regression.test.js` · `part-14.3-mixed-sections-and-header.test.js` · `part-15.0-layout-profile-fixes.test.js` · `part-15.1-eq-field-bijoy.test.js` · `part-15.2-ocr-doc-path.test.js` · `part-15.3-degree-and-indent.test.js` · `part-16.0-export-and-mhtml.test.js` · `part-16.1-figure-extractor.test.js` · `part-16.2-figure-handoff.test.js` · `part-17.0-bijoy-mixed-run.test.js` · `part-17.2-faithful-capture.test.js` · `part-17.3-doc-converter.test.mjs` · `part-17.5-faithful-layout.test.js` · `part-18.6-layout-facts.test.js` · `part-18.9-application-layout.test.mjs` · `part-18.9-one-column.test.mjs` · `part-18.9-primary-and-parity.test.mjs` · `part-19.0-letter-layout.test.mjs` · `part-19.1-cv-layout.test.mjs` · `part-19.2-certificate-layout.test.mjs` · `part12-hardening.test.mjs` · `part13-3-layout-fixes.test.mjs` · `part13-4-fixes.test.mjs` · `part14-0-studio-figure.test.mjs` · `part14-1-fixes.test.mjs` · `proxy-failure-policy.test.js` · `proxy-worker.test.mjs` · `run-all.mjs` · `run-regression.js` · `source-fidelity.test.mjs` · `studio-edit-bridge.test.mjs` · `studio-edit-e2e.test.mjs` · `studio-layout-parity.test.mjs` · `word2003-doc-artifact.test.mjs` · `word2003-font-metric.test.mjs`

## HTML পাতা (মূল ফোল্ডার)
- `converter.html` — ফয়জার এআই কম্পোজ · 0 স্ক্রিপ্ট
- `doc-converter.html` — ওয়ার্ড ডকুমেন্ট ইউনিকোড ➔ বিজয় কনভার্টার | ফয়জার এআই কম্পোজ · 15 স্ক্রিপ্ট
- `docx-to-doc.html` — DOCX থেকে DOC (Word 2003) কনভার্টার | ফয়জার এআই কম্পোজ · 6 স্ক্রিপ্ট
- `index.html` — ফয়জার এআই কম্পোজ — ছবি ও PDF থেকে Editable Word · 67 স্ক্রিপ্ট
- `layout-studio.html` — লেআউট স্টুডিও — MD থেকে Word | ফয়জার এআই কম্পোজ · 12 স্ক্রিপ্ট
- `ocr-classic.html` — পুরোনো OCR পাতা (রক্ষণাবেক্ষণ) | ফয়জার এআই কম্পোজ · 69 স্ক্রিপ্ট
- `samples.html` — নমুনা ও কীভাবে কাজ করে | ফয়জার এআই কম্পোজ · 1 স্ক্রিপ্ট
- `services.html` — সার্ভিস ও টুলস | ফয়জার এআই কম্পোজ · 65 স্ক্রিপ্ট
- `studio.html` — ওয়ার্ড স্টুডিও | ফয়জার এআই কম্পোজ · 38 স্ক্রিপ্ট
