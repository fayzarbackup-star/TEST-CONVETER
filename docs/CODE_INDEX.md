# CODE_INDEX — স্বয়ংক্রিয় কোড-সূচি (হাতে বদলাবে না)

> তৈরি: `node tools/gen-map.mjs` · 2026-10-23
> পুরোটা পড়বে না। Grep করো (যেমন ফাংশন/গ্লোবাল নাম), তারপর `ফাইল` + `@লাইন` ধরে শুধু ওই অংশ Read।
> ফরম্যাট: `ফাইল` (লাইন) [গ্লোবাল] — বর্ণনা ⏎ ফাংশন@লাইন, …

## js/

- `js/ai-ocr-engine.js` (5355) [FayzarAiOcrEngine] — Fayzar Computer v2 - AI Bengali OCR & Math (LaTeX) to Bijoy .doc Engine
  getElementById@28, querySelector@29, createElement@30, createTextNode@36, addEventListener@38, STORAGE_KEYS@41, updateProModelStatusUI@58, checkDesktopBridgeOnline@106, GEMINI_PROMPT@136, GEMINI_VERIFY_PROMPT@381, DEMO_SAMPLE_TEXT@446, SUPABASE_CONFIG@477, isCloudProxyAvailable@496, loadConverterDictionary@532, init@559, bindElements@589, loadSettings@685, updateBadges@704, setupEvents@718, toggleProModel@807, convertPdfToImages@913, fastOptimizeImageFile@970, onload@984, onerror@1018, handleFiles@1025, renderThumbnails@1138, deletePage@1250, undoPageDelete@1268, openPageZoom@1289, closePageZoom@1301, updatePageZoomView@1310, setZoomScale@1339, navPageZoom@1347, cancelCurrentConversion@1357, clearImage@1400, startOcrConversion@1429, startUnifiedOcr@1485, isChunkSwitchEnabled@1780, isRotTextSwitchEnabled@1788, getGeminiCapturePrompt@1800, isFaithfulModeActive@1807, getExamRenumberApi@1815, getProxyPolicyApi@1825, parseProxyFailure@1832, decideProxyFallback@1847, estimateBase64Bytes@1861, sumChunkBase64Bytes@1884, attachChunkMetadata@1890, planOcrChunks@1906, formatChunkProgress@1998, splitLeadingFrontmatter@2003, stripStrayFrontmatter@2018, mergeOcrChunks@2030, runChunkedOcr@2207, splitMediaIntoChunks@2333, processWithChunking@2344, ensureBase64@2383, fetchWithTimeout@2391, onMainAbort@2403, runFirebaseBridgeOcr@2435, runDirectGeminiOcr@2524, proxyStatusMessage@2602, applyPageCoverageGuard@2636, stripOcrArtifacts@2652, executeGeminiRequestViaSupabase@2668, absorb@2741, drain@2780, executeGeminiRequest@2876, buildModelPayload@2933, buildFetchPayload@3077, formatCountdown@3421, renderKeyStatus@3430, chip@3447, refreshKeyStatus@3476, downloadKeyStatusCsv@3502, runGasProxyOcr@3518, runDemoSimulation@3563, extractAuditNote@3591, runVerificationPipeline@3597, handleExtractionSuccess@3700, recalculateBijoyFromUnicode@3744, copyCurrentText@3754, sendToMainConverter@3765, CP1252_MAP_TABLE@3817, encodeRtfText@3826, escapeXml@3848, sanitizeMathBengaliSeparation@3858, cleanOcrResponse@3904, getRomanVal@3951, parseRichRuns@4106, parseDocumentBlocks@4159, renderRunsForRtf@4234, encodeEqInst@4260, plainEqApprox@4273, renderEquationForRtf@4285, renderSimpleMathRtf@4296, renderRunsForRtfPlain@4302, hasLatexMath@4350, renderRunsForOoxml@4354, renderEquationForOoxml@4378, rpr@4383, renderSimpleMathOoxml@4427, renderRunsForOoxmlPlain@4445, prepareSourceFigures@4527, downloadWordDocument@4568, processDownload@4638, generateMasterDocx@4818, detectFn@4841, openStudioPreviewEditor@4862, createDocxBlob@4937, PAGE_SIZES@4955, MARGINS@4961, triggerDownload@5151, setLoading@5162, toggleModal@5190, saveByokKey@5201, saveSettings@5221, resetCredits@5250, toBengaliNumber@5257, formatBytes@5262, showToast@5270, sleep@5299

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

- `js/docx-to-doc-engine.js` (1885) [DocxToDocConverter] — DOCX to DOC (Word 97-2003) Full Fidelity Converter Engine v2.0
  THEME_COLORS@11, sanitizeFontFamily@34, isPgBorderOn@40, constructor@49, _styleMathLetters@77, _styleEqCodeLetters@100, esc@102, _toTargetScript@115, _wrapEqScriptSizes@133, _ommlToLegacyEqHtml@165, convertDocxToDoc@231, onProgress@239, _getZipFileContent@296, _parseRelationships@302, _loadMediaFiles@320, _extractImagesFromNode@397, _buildStyleResolver@479, resolve@594, _parseDocumentBody@598, _parseHeaderFooter@678, _parseSectionProperties@711, MARGIN_MAP@730, _parseParagraph@924, _parseRun@1270, SPLIT_RE@1468, _parseTable@1495, kids@1497, kid@1498, attr@1499, spec@1501, _buildWord2003Document@1660, _escapeHtml@1847, _renderMsoSpaces@1856

- `js/engines/admit-card-engine.js` (264) [AdmitCardEngine] — Fayzar Publishing Studio - Admit Card Generator Engine
  parseAdmitData@25, renderSingleCard@117, renderToHtml@214, esc@248

- `js/engines/application-engine.js` (198) [ApplicationEngine] — Fayzar Publishing Studio - Official Application & Certificate Engine
  parseApplication@10, renderToHtml@102, escape@189

- `js/engines/certificate-engine.js` (184) [CertificateEngine] — Fayzar Publishing Studio - Official Certificate & Testimonial Engine
  parseCertificate@14, renderToHtml@105, escape@170

- `js/engines/converter-studio-bridge.js` (433) [ConverterStudioBridge] — Fayzar Publishing Studio - Converter Bridge Engine
  sendToStudio@40, getTransferData@89, clearTransferData@111, formatFinishingOutput@124, getDocTypeBanglaLabel@193, openInStudio@213, faithfulStudioOn@230, encodeBytesToBase64@235, decodeBase64ToBytes@243, extractSyncBytes@256, snapshotIrInBridge@268, extractIrBlocksInBridge@294, updateIrBlockTextInBridge@329, sendFaithfulToStudio@356, getFaithfulTransferData@398

- `js/engines/cv-engine.js` (192) [CVEngine] — Fayzar Publishing Studio - Curriculum Vitae & Bio-data Engine
  parseCV@14, renderToHtml@119, esc@182

- `js/engines/doc-classifier.js` (560) [DocClassifier] — Fayzar Publishing Studio - Document Classifier & Parser
  DOC_TYPES@10, GRADE_WORDS@33, parseGrade@37, factsFromFrontmatter@46, get@48, _clsFix@67, structureStats@75, layoutFromFacts@114, why@117, promoteCombined@143, isQ@150, classify@161, NON_EXAM@209, extractMetadata@506

- `js/engines/export-dual-engine.js` (3750) [ExportDualEngine] — Fayzar Publishing Studio - Multi-Format Export Engine v4.0
  stripOcrArtifacts@16, usesCreativeHeaderFallback@37, visualOptionTextForFallback@39, fallbackOptionWidth@63, isBijoyFont@89, toBijoy@98, escapeRtf@126, escapeUnicodeRtf@146, _getTextRunProcessor@164, _getMcqPlanner@185, _mcqPlan@207, _mcqPlanFallback@232, widthOf@266, formatRtfText@319, xmlEscape@406, formatDocxText@420, _isPlaceholderHeader@432, renderDocxRuns@439, generateWordDoc@515, _resolveParsed@561, _getFrontmatter@572, _applyExamRenumber@579, _splitCombined@603, isQ@608, strip@609, isMcqHead@610, isInstLine@612, metaNear@614, generateLegacyDoc@630, _withAuditNote@758, _auditNoteLines@768, _auditSectionDocx@774, _auditSectionRtf@787, generateCombinedExamDocx@807, generateModernDocx@842, _getSelfCheck@847, _docxParts@853, _selfCheckOff@863, _selfCheckGate@870, run@881, _generalCleanBlob@907, _getCleanComposerMod@914, _generalCleanRender@920, _generateModernDocxCore@934, _generalCleanGeneric@1047, _cleanComposerGeneric@1060, _getQuestionEngine@1076, _getCertificateEngine@1085, _getStampEngine@1094, _getApplicationLayout@1104, _applicationLayoutDocx@1112, _applicationLayoutRtf@1127, _getLetterLayout@1135, _letterLayoutDocx@1142, _getCvLayout@1157, _cvLayoutDocx@1164, _cvLayoutRtf@1176, _getEnCvLayout@1183, _enCvDocx@1190, _enCvRtf@1199, _getCashMemoLayout@1205, _cashMemoDocx@1212, _cashMemoRtf@1223, _getReceiptLayout@1230, _receiptDocx@1237, _receiptRtf@1248, _getCertificateLayout@1255, _certificateLayoutDocx@1262, _certificateLayoutRtf@1273, _letterLayoutRtf@1279, _getApplicationEngine@1286, _getAdmitCardEngine@1295, _getSalarySlipEngine@1304, _getRoutineEngine@1313, _getCVEngine@1322, _getJSZip@1331, _getCqPlanner@1349, _ensureCqHeaderPlacement@1370, _cqPlan@1384, _fixRtfSpacing@1423, _examLineFactor@1443, _fixDocxSpacing@1452, _collapseRunGaps@1471, txtOf@1474, _cqPlanFallback@1489, field@1514, push@1521, _cqSplitStimulus@1552, _scriptHalfPt@1571, _bumpLastSpacingRtf@1582, _bumpLastSpacingDocx@1592, _cqPageSetupRtf@1602, _cqFormat@1613, subLabel@1619, splitStem@1620, _numIndent@1625, _cqItemCtx@1633, _cqFullWidthHeaderPlan@1640, _cqSectPrInnerDocx@1645, _cqSectPrDocx@1651, _cqSectionBreakDocx@1655, _cqHeaderRtf@1660, _cqHeaderDocx@1691, pPr@1696, rPr@1697, _cqQuestionRtf@1730, esc@1734, generateCqExamRtf@1813, generateCombinedExamRtf@1866, _cqQuestionDocx@1897, tabsXml@1903, closeTable@1927, generateCqExamDocx@2001, renderMcqTextRtf@2049, generateMcqExamRtf@2062, renderRtfItem@2111, byIdx@2177, generateMcqExamDocx@2202, renderDocxItem@2257, generateCertificateRtf@2359, generateCertificateDocx@2418, generateStampDeedRtf@2478, generateStampDeedDocx@2547, generateGovtAppRtf@2616, generateGovtAppDocx@2687, generateAdmitCardRtf@2761, generateAdmitCardDocx@2812, generateSalarySlipRtf@2872, generateSalarySlipDocx@2947, cell@2978, row@2981, has@2982, _getRtfBuilder@3020, generateRoutineRtf_v2@3029, generateRoutineRtf@3097, _getSchemaValidator@3162, validate@3173, _getThemeConfig@3182, _getDocxBuilder@3191, generateRoutineDocx_v2@3200, generateRoutineDocx@3298, generateCVRtf@3361, generateCVDocx@3438, generateGenericRtf@3525, generateGenericDocx@3557, _packageDocx@3594, triggerPdfPrint@3672

- `js/engines/figure-transfer-store.js` (74) [FayzarFigureTransfer] — Fayzar — চিত্র-হস্তান্তর স্টোর (FayzarFigureTransfer)
  openDb@15, onupgradeneeded@19, onsuccess@20, onerror@21, oncomplete@31, onabort@33, reqP@37, put@42, take@60

- `js/engines/import-engine.js` (148) [ImportEngine] — Fayzar Publishing Studio - File Import Engine
  isBijoyEncoded@17, readTxtFile@28, onload@31, onerror@44, readDocxFile@52, extractTextFromDocXml@87, extractRuns@100, importFile@125

- `js/engines/omr-engine.js` (131) [OmrEngine] — Fayzar Publishing Studio - OMR & Answer Key Generator
  generateOmrSheetHtml@10, renderOmrRow@83, generateAnswerKeyHtml@97, toBengaliNumber@117, escape@122

- `js/engines/question-engine.js` (1559) [QuestionEngine] — Fayzar Publishing Studio - Board-Standard Question Paper Typesetting Engine
  usesCreativeHeaderFallback@15, cleanQuestionSectionTitle@16, isQuestionSectionHeading@18, visualOptionTextForFallback@27, fallbackOptionWidth@51, _cqMarkTail@83, _cqSubLineParts@97, parseQuestionPaper@113, _metaLine@612, normalizeRomanText@630, parseMcqOptions@644, _getMcqPlanner@687, MCQ_HEADER_FALLBACK@701, CQ_HEADER_FALLBACK@711, applyCqHeaderFallbacks@721, nonEmpty@727, applyMcqHeaderFallbacks@741, _mcqLayoutPlan@767, _getCqPlanner@789, _cqLayoutPlan@803, renderMcqOptions@827, _getEquationConverter@876, richText@890, richTextBlock@906, isSep@910, flushTable@911, renderQuestionItem@933, subLbl@1020, renderHeaderBlock@1065, renderToHtml@1110, _extractTrailingAuditNote@1123, NOTE_RE@1125, _auditNoteLines@1152, renderAuditSheet@1158, render@1163, _renderToHtmlCore@1181, renderBookletItem@1257, renderCropMarks@1537, renderPageBreak@1541, escape@1545

- `js/engines/routine-engine.js` (161) [RoutineEngine] — Fayzar Publishing Studio - Class & Exam Routine Engine
  parseRoutine@14, renderToHtml@103, esc@151

- `js/engines/salary-slip-engine.js` (253) [SalarySlipEngine] — Fayzar Publishing Studio - Salary Slip / Pay Slip Generator Engine
  parseSalaryData@29, parseAmount@49, formatMoney@127, renderToHtml@135, esc@240

- `js/engines/stamp-engine.js` (211) [StampEngine] — Fayzar Publishing Studio - Stamp Deed & Agreement Engine
  parseDeed@12, renderToHtml@106, escape@202

- `js/engines/studio-edit-bridge.js` (420) [StudioEditBridge] — ═══════════════════════════════════════════════════════════════════════════
  bnToEn@36, normNum@41, cmp@46, oneLine@51, multiLine@56, firstLine@63, getByPath@69, setByPath@79, clone@91, applyEdits@100, allQuestions@112, isEl@124, isDocxPreviewDom@133, textWithoutFigures@145, stripFigMarkers@166, preserveFigMarkers@171, fieldValue@181, nodeText@185, collectFromDom@196, mathFieldsEdited@385

- `js/engines/studio-figure-pipeline.js` (490) [StudioFigurePipeline] — ═══════════════════════════════════════════════════════════════════════════
  markerFor@38, markerRegex@40, escapeRegex@42, normDigits@45, tolerantMarkerRegex@57, balanceBraces@69, stripAllMarkers@84, countMarkers@94, hasMarkers@100, extractMarkers@103, stripMarkers@113, preserveMarkers@126, pruneMarkers@136, dataUrlToBytes@142, bytesToHex@150, _getJSZip@156, _utf8ToB64@168, _loadImage@175, onload@178, onerror@179, _svgDataUrl@184, rasterizeElement@211, tinyPngDataUrl@249, buildRtfPict@255, injectIntoRtfSync@271, injectIntoRtf@310, buildDocxDrawingXml@320, _jcFor@342, injectMarkerIntoDocumentXml@352, injectIntoDocx@368, collectStore@445, countFigures@451, totalBytes@453

- `js/equation-converter.js` (2141) [EquationConverter] — EquationConverter.js
  unicodeToBijoyPreservingDigits@16, latexToEqField@32, _extractGroup@117, _convertMacros@143, _convertSymbols@294, tokenizeEqCode@442, formatEqCodeToWordHtml@512, latexToReadableHtml@583, createOpenXmlEqRuns@672, makeMathRPr@689, createTextRun@796, normalizeUnicodeMathToLatex@819, splitTextAndMath@875, glueIsMath@963, needsEqField@1010, sanitizeSimpleMath@1036, tokenizeSimpleMath@1093, createSimpleMathRuns@1139, ommlToOpenXmlRuns@1195, _parseOmmlNode@1201, applyBoundaryFreeSymbols@1259, cleanLatexSymbols@1325, applyAccentsToCombining@1434, normalizeLatexAliases@1449, _unescapeMiniLatex@1497, sanitizePlainLatex@1517, ommlToRtfMath@1558, esc@1559, _ommlBodyToRtfMath@1576, kids@1578, local@1579, textOf@1580, rawText@1581, find@1588, convAll@1589, conv@1590, _parseOmmlTree@1643, latexToPreviewHtml@1663, readGroup@1673, render@1683, _applyOmmlScriptSizes@1730, latexToOmml@1756, escapeXml@1765, findMatchingBrace@1772, ACCENTS@1785, accentXml@1792, parseAccentAt@1798, parseChunk@1816, parseScripts@1907, ommlNodeToEqHtml@2012, firstByLocal@2018, extractMathText@2037, walkChildren@2094

- `js/faithful-mode-ui.js` (438) [FayzarFaithfulUI] — Fayzar — হুবহু-লেআউট মোডের ইন্টারফেস (FayzarFaithfulUI)
  UNICODE_FONTS@18, isFontPickOn@22, isFontAvailable@31, detectAvailableFonts@74, pickDefaultFont@81, getSelectedFont@93, setSelectedFont@101, syncFontPickerUI@122, isPageRangeOn@155, parsePageRange@164, getRangeSpec@227, setRangeSpec@233, selectQueuePages@241, syncPageRangeUI@260, isFaithful@317, setMode@318, card@320, paint@325, mountModeCards@338, setProgress@353, toast@358, download@362, runWizard@387, bind@422

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

- `js/home-app.js` (732) — ফয়জার এআই কম্পোজ — হোম (index.html): ফাইল দেওয়া → ওয়ার্কস্পেস।
  toast@12, baseOf@14, Eng@15, queue@16, view@26, openWorkspace@37, closeWorkspace@38, side@39, mode@42, applyMode@43, setTpl@57, renderGallery@63, card@66, getQueue@84, baseName@85, busy@86, setBusy@87, onSelect@88, onReadymade@94, acceptFiles@101, syncSelected@121, srcOf@127, render@133, removeAt@177, editImage@183, moveItem@194, ring@202, progress@207, procReset@219, fail@224, convert@235, bindDownloads@303, setText@329, reOcr@330, setCols@337, setStyle@351, resultText@365, cleanDownload@366, textOut@383, showText@403, resetAll@408, pick@420, saveBlob@465, faithfulDownload@471, persist@482, run@485, notice@502, restore@503, openReport@551, closeReport@559, makeThumb@597, onload@603, onerror@611, recordHistory@615, ago@627, updateHistCount@633, openHistory@638, closeHistory@674, openEntry@680, downloadEntry@705

- `js/image-tools.js` (81) [FayzarImageTools] — ফয়জার এআই কম্পোজ — ছবি-প্রস্তুতি (পর্ব ১গ): ৯০° ঘোরান ও ২ পাতা ভাগ।
  rotatedDims@8, splitRects@11, suffixName@17, srcOf@24, loadImg@29, onload@32, onerror@33, canvasToItem@37, rotate90@48, rotateLeft90@61, splitTwo@63

- `js/layout-engine/application-layout.js` (627) [FayzarApplicationLayout] — Fayzar — আবেদনপত্র-লেআউট (GOVT_APP) — Part-18.9
  measure@29, norm@61, cleanLine@66, splitCells@70, splitLeader@74, parse@83, push@90, close@91, _gapBefore@214, STEPS@226, geometry@233, estimateHeight@253, lineH@255, _subjectHang@295, _tableWidths@304, _kvTab@326, renderDocx@336, _docxTable@421, line@424, docxSectPr@447, renderRtf@456, _rtfTable@525, renderHtml@550, inch@555

- `js/layout-engine/archetype-map.js` (90) [ArchetypeMap] — Fayzar Publishing Studio - Archetype to DocType Mapping
  ARCHETYPE_TO_DOCTYPE@9, isRegistrySwitchOn@29, getLayoutRegistry@51, toDocType@66

- `js/layout-engine/cash-memo-layout.js` (568) [FayzarCashMemoLayout] — Fayzar — ক্যাশমেমো (CASH_MEMO) লেআউট, ২-আপ/৩-আপ — Part-19.4
  measure@20, lineCount@25, norm@30, cleanLine@35, toBn@39, toNum@40, DEFAULT_HEAD@54, PAGE@66, PAGE_A5@67, KALPURUSH@74, WIDTH_K@75, looksLike@84, copiesOf@89, parse@100, _segments@154, _totalFromLine@173, _signParts@180, _classifyHeader@190, _table@209, hasContent@229, _isHeadRow@234, geometry@239, _hsz@267, _spaceRun@280, _colWidths@286, _fill@298, lines@300, _rowHeight@323, _serial@330, renderDocx@344, boxed@353, _docxCopy@366, _fieldStops@392, _docxFieldLine@398, _docxTable@409, NIL@412, cell@413, row@422, numAlign@423, docxSectPr@441, renderRtf@450, field@463, _rtfTable@493, brd@495, def@496, jcOf@508, renderHtml@521, inch@526, box@528, line@529

- `js/layout-engine/certificate-layout.js` (572) [FayzarCertificateLayout] — Fayzar — সাজানো ল্যান্ডস্কেপ সনদ/প্রশংসাপত্র (PROTTOYON, ল্যান্ডস্কেপ বা মুড়িসহ) — Part-19.2
  getLL@20, getAL@25, measure@30, norm@35, cleanLine@40, frontmatter@43, STYLE@64, STEPS@69, HEAD_K@71, PAGE@73, SINGLE_MARGIN@77, wants@89, _lines@95, _split@102, key@104, firstOf@107, strict@108, parse@136, _parseInner@144, prose@149, _parsePart@158, flush@211, geometry@232, _style@255, _paras@269, mkPara@273, para@274, estimateHeight@352, one@359, renderDocx@382, partXml@401, thick@404, nil@405, SIDES@406, cell@407, _docxSide@419, _keepFooter@441, docxSectPr@447, renderRtf@459, fmt@470, cellBody@508, renderHtml@523, inch@529, run@540, partHtml@551, box@556, sheet@560

- `js/layout-engine/clean-composer.js` (219) [FayzarCleanComposer] — Fayzar — ক্লিন/রিল্যাক্সড ওয়ার্ড (FayzarCleanComposer) — TEMPLATE_COMPOSE_PLAN T1
  PAGE@14, STYLE@16, HEAD_SZ@17, AUDIT_RE@18, FIG_TAG_RE@19, PAGE_MARK_RE@20, pick@22, jszip@27, esc@33, strip@36, splitCells@47, isSepRow@61, headText@67, parse@73, runsXml@102, one@105, paraXml@114, tableXml@132, bodyXml@147, stylesXml@153, head@155, SECT@165, renderDocx@171, packDocx@176, plainText@199, clean@202, markdown@211

- `js/layout-engine/cq-booklet-planner.js` (758) [CqBookletPlanner] — Fayzar Bangla Converter — CQ Booklet Master Layout Planner (Part-11)
  classOf@54, measure@72, lineCount@82, toLines@102, layoutUnits@113, MARGIN@115, fin@117, bnDigits@118, margin@133, gap@134, indent@135, twips@136, count@137, linePitchTwips@138, docxLineRule@139, GEOMETRY@145, HEADER_SIZES@170, CQ_HEADER_FALLBACK@173, GENERAL_HEADER_FALLBACK@187, LAYOUT_PROFILES@205, EXAM_CQ@206, EXAM_MATH@207, EXAM_COMBINED@208, EXAM_GENERAL@210, EXAM_PRIMARY@214, EXAM_ONECOL@217, profile@220, PRIMARY_GRADES@226, GRADE_WORDS@228, parseGrade@232, gradeOf@246, layoutKey@261, ONECOL_TYPES@265, columnsChoice@282, sourceColumns@290, ENGLISH_HEADER_FALLBACK@297, HEADER_LABELS@308, headerFallback@313, paperLang@319, numDelimiter@334, subLabelText@341, splitStemMark@351, geometry@364, questionIndent@410, itemGeometry@420, lineH@425, buildHeader@434, value@445, add@452, headerPreviewModel@491, headerHeight@509, measureQuestion@523, plan@574, firstPageCap@613, lastNonEmpty@634, rtfTabs@721, docxTabs@729, rtfPageSetup@740, docxSectPr@746

- `js/layout-engine/cv-layout.js` (399) [FayzarCvLayout] — Fayzar — বাংলা জীবনবৃত্তান্ত (CV_RESUME) লেআউট — Part-19.1
  getAL@17, measure@22, norm@27, cleanLine@32, maskAbbr@54, unmaskKv@55, STEPS@57, keepLast@65, PAGE@70, isBangla@78, parse@85, push@92, _takeFooter@129, geometry@157, _kvTab@178, _gap@186, estimateHeight@195, lineH@199, renderDocx@230, _docxFooter@281, docxSectPr@296, renderRtf@304, renderHtml@352, inch@358

- `js/layout-engine/doc-mhtml-packager.js` (170) [FayzarDocMhtml] — Fayzar — Word 2003 .doc ছবি-প্যাকেজার (FayzarDocMhtml)
  DATA_URI_RE@19, utf8Bytes@23, quotedPrintable@40, hex@42, push@45, wrap76@64, sizeImgTags@76, hasEmbeddedImages@97, pack@106, packBlob@158

- `js/layout-engine/doc-model-adapters.js` (187) [FayzarDocModelAdapters] — Fayzar — doc-model অ্যাডাপ্টার (Phase 2A, M2)
  mod@14, RULE_RE@22, OPT_RE@23, NUM_RE@24, FIG_RE@25, SIZE_OF@26, TEXTY@27, splitRow@29, isSep@35, hasMath@36, ROLE_OF@39, yOverlap@43, detectColumns@49, fromCaptureBlocks@58, fromOcrMarkdown@101, flushPage@120, flushSide@123

- `js/layout-engine/doc-model.js` (95) [FayzarDocModel] — Fayzar — doc-model (Phase 2A, FINAL_WORK_PLAN M2) — শুধু ডেটা-কাঠামো, কোনো রেন্ডার নয়
  ROLES@17, ALIGN@19, DROPPED@20, str@22, block@25, createDocument@49, addPage@52, walk@60, rec@61, flat@64, isKept@65, words@68, plainText@77, validate@80

- `js/layout-engine/docx-builder.js` (67) [FayzarDocxBuilder] — We assume the caller escapes text if necessary
  paragraph@2, run@15, runTab@25, table@29, tableRow@38, tableCell@43, sectionProperties@50

- `js/layout-engine/docx-layouts.js` (135) [FayzarDocxLayouts]
  _getThemeConfig@2, _getDocxBuilder@11, formatText@20, generateRoutineDocx@27

- `js/layout-engine/docx-preview-render.js` (1258) [FayzarDocxPreview] — Fayzar — মাস্টার .docx থেকে প্রিভিউ আঁকার লোকাল রেন্ডারার (FayzarDocxPreview)
  twipToPx@37, twipToPt@41, emuToPx@45, escHtml@51, unescXml@60, parseXml@76, isTag@141, findChild@148, findChildren@154, findAll@159, getAttr@168, isOnVal@181, faithfulStudioOn@189, resolveJSZip@193, borderNodeToCss@221, parseSectPr@239, finalizeSectGeometry@290, parseStylesDefaults@306, parseRels@331, mimeFromPath@343, renderOmmlNode@354, renderOmmlChildren@432, textOf@437, renderDrawing@444, renderRun@466, pickNode@470, wrapSpan@546, renderParagraph@574, collectInline@672, renderTable@747, buildTableHtml@948, paginateDocument@964, openNewPage@997, ensureSegment@1009, parseDocx@1139, renderToHtmlString@1213, render@1226

- `js/layout-engine/en-cv-layout.js` (445) [FayzarEnCvLayout] — Fayzar — ইংরেজি সিভি (English CV / Resume) লেআউট — TEMPLATE_COMPOSE_PLAN T2 দল ৫
  norm@18, FRONT@23, readFm@24, level@31, clean@32, HAS_BN@55, PAGE@58, LINE@60, PHOTO@61, FONT@63, wants@69, parse@81, isHeading@83, bodyKv@85, push@99, _head@136, _takeFooter@149, isFoot@151, geometry@160, _kvTabs@168, renderDocx@176, blank@197, single@199, tbl@200, _gaps@276, docxSectPr@289, renderRtf@298, esc@300, brd@317, renderHtml@381, inch@385, div@387

- `js/layout-engine/eq-field-rtf.js` (129) [FayzarEqFieldRtf] — Fayzar — Word 2003 EQ-ফিল্ড RTF বিল্ডার (FayzarEqFieldRtf)
  BN_RE@20, FUNC_RE@21, escapeUnicodeRtf@24, italicVars@44, splitRuns@58, build@99

- `js/layout-engine/exam-renumber.js` (150) [FayzarExamRenumber] — ═══════════════════════════════════════════════════════════════════════════
  isExamType@31, toBengaliDigits@36, detectBengaliStyle@44, renumberExamSections@72, stripDifficultyTags@95, RE_BRACKETED@100, RE_BARE@102, stripDifficultyTagsFromData@110

- `js/layout-engine/faithful/faithful-capture.js` (289) [FayzarFaithfulCapture] — Fayzar — হুবহু-লেআউট ক্যাপচার-চালক (FayzarFaithfulCapture)
  pick@14, mediaFromQueue@17, activeKey@39, run@53, progress@64, VERIFY_TYPES@107, repairKey@108, sameChars@109, lineMismatches@111, applyRepairs@124, verifyLines@134, cellChars@188, tableRows@189, ruleBands@190, modalCells@199, mostlyUniform@200, tableMismatches@202, applyTableRepairs@214, verifyTables@224

- `js/layout-engine/faithful/faithful-docx-builder.js` (5105) [FayzarFaithfulDocx] — Fayzar — হুবহু-লেআউট মাস্টার .docx নির্মাতা (FayzarFaithfulDocx)
  fzOn@15, mathHOn@17, formKitOn@19, pgBorderOn@21, tableGridOn@28, faithfulStudioOn@30, wrapFitOn@33, tableColOn@44, lineGapOn@55, pages4On@75, extraLinesOn@86, a10LinesOn@97, p1LossOn@108, a17FixOn@118, ensureCardGridBoxes@128, a01FixOn@136, p2DriftOn@147, ruleFixOn@158, rules2On@169, nestBoxOn@189, a03FixOn@209, a14FixOn@229, a07FixOn@240, a07Fix2On@251, a19FixOn@271, a16FixOn@291, a11FixOn@302, a10FixOn@313, tblMergeOn@324, rotTextOn@344, vspaceOn@355, widthOn@375, fontFixOn@395, keepInternalProps@414, boxSplitOn@424, indentOn@441, a14Fix3On@461, a16Fix3On@481, a14RulesOn@501, a07Fix3On@521, a16Fix4On@541, a02PageOn@561, a02FixOn@563, a14Fix4On@583, a13FixOn@603, a16Fix5On@623, a09FixOn@643, a14Fix5On@663, a07Fix5On@683, a12FixOn@703, a03Fix3On@723, a06FixOn@743, a03Fix4On@763, a07Fix6On@783, f1FixOn@803, a18FixOn@823, a08FixOn@843, a16Fix6On@863, f1Fix2On@883, indentFixOn@903, vgapFixOn@923, serialFixOn@943, missingFixOn@963, shortFixOn@983, rulesFixOn@1003, fontTypeFixOn@1023, lineWidthFixOn@1043, BLD_ROT_MARK_RE@1062, cellTextOf@1063, cellRotOf@1071, hasRotCells@1084, ensureRotTextTable@1089, partialHeaderRowHeightsBld@1096, normalizeItemForPages4@1134, normalizePageForPages4@1212, snapshotIrLayout@1240, layoutItem@1262, syncEditedTextFields@1274, isTableEdited@1297, renderEditedTableXml@1312, extractBlocks@1335, updateBlockText@1372, CRC_TABLE@1424, crc32Bytes@1433, strToU8@1438, u8ToStr@1446, b64ToU8@1453, u8ToB64@1461, makeGrayPngBase64@1468, u32be@1497, chunk@1498, file@1526, async@1538, generateAsync@1550, loadAsync@1626, NAMED_HEX@1693, normHex@1699, isDarkHex@1707, isPlaceholderStr@1713, stripPlaceholderWrap@1719, parseInlineBoxes@1722, MCQ_SPLIT_RE@1740, MCQ_TEST_RE@1741, tabifyMcqBuilder@1742, TRAIL_MARK_RE@1769, Q_TRAIL_MARK_RE@1770, mathKindOf@1776, hasNestedFrac@1799, mathLineExtraPt@1822, mathVisStr@1840, hasEqItem@1853, mathExtraH@1862, rowMathExtraPt@1888, UNICODE_FONTS@1903, fontPickOn@1905, resolveDocxFont@1911, clamp@1922, emu@1923, esc@1924, pick@1925, MARK@1931, runsFor@1932, makeBoxRun@1962, runsPlain@2000, colored@2023, lineH@2040, wrapLines@2055, rowSpans@2067, blank@2069, wraps@2071, tableRowHeights@2098, cwp@2153, colWPt@2212, natural@2213, rest@2244, textH@2252, ruleSpace@2278, ruleExtra@2279, tblRuleGap@2280, itemH@2282, inkOff@2348, raSpace@2375, raExtra@2376, lead@2377, planPage@2379, nextTop@2648, enterGapXml@2886, pPr@2901, fmtTabStop@2947, paraXml@2981, LTAB@3208, bLen@3281, karLen@3295, spVirLen@3296, rephNarrowSub@3304, segW@3311, DOTS@3387, plainLen@3390, est@3391, segsOf@3392, tabsSafe@3393, COLON@3401, tailEnd@3402, hasLead@3406, leadStop@3410, usedTabs@3416, renderTabSeg@3417, lineRuns@3436, markParaRpr@3441, stripGhostDots@3632, fix@3635, same@3643, spacer@3655, tableXml@3661, isBoxR@3755, resolveCellFill@3823, resolveCellColor@3841, cellBody@3852, pSz@3918, cellP@3958, isEmpty@4105, rowBA@4114, trPrFor@4118, bandBorders@4163, ruleBorder@4229, spW@4251, lnOf@4252, boxRowXml@4309, subTable@4340, strip@4343, subTableXml@4355, gridXml@4397, boxTableXml@4454, shiftInto@4472, shiftBand@4491, anchorXml@4509, emitSeq@4519, sectPr@4605, side@4626, bodyXml@4642, sizeEmptyParas@4980, build@4990

- `js/layout-engine/faithful/faithful-pipeline.js` (508) [FayzarFaithful] — Fayzar — হুবহু-লেআউট পূর্ণ পথ (FayzarFaithful)
  pick@14, isPageRangeOn@18, parsePageRange@26, filterQueueByRange@96, pdfLib@104, pdfDoc@106, loadImage@115, measureImage@118, rotateImageData@146, splitFromNeighbor@161, ink@166, textMeasurer@189, widthFontOf@214, tableWidthFontOf@238, capture@256, layout@271, progress@280, measureAll@322, faithfulStudioOn@463, sendToStudio@466, produceWithFaithfulStudio@484, produce@494

- `js/layout-engine/faithful/faithful-prompt.js` (103) [FayzarFaithfulPrompt] — Fayzar — হুবহু-লেআউট মোডের Gemini প্রম্পট (FayzarFaithfulPrompt)
  BLOCK_TYPES@16, formKitOn@19, FORMKIT_TYPES@20, build@22, continuation@87

- `js/layout-engine/faithful/grid-first.js` (538) [FayzarGridFirst] — Fayzar — গ্রিড-প্রথম ছক ইঞ্জিন (FayzarGridFirst)
  fzOn@22, tblMergeOn@24, rotTextOn@43, SERIAL@54, FILL_RE@56, baseLen@59, trimFillToWidth@64, extractGrid@80, isFillCol@102, refineHeaderSplitTable@195, refinePartialGridRows@237, openGroupEnd@253, effSpan@353, computeSerialColumnVMerges@403, applyGridFirst@432

- `js/layout-engine/faithful/header-merge.js` (169) [FayzarHeaderMerge] — Fayzar — ছকের ভাঙা হেডার-সারি সংযোজন মডিউল (FayzarHeaderMerge)
  SERIAL@18, SUBSER@19, FILL_RE@21, CHECKBOX_RE@22, baseLen@25, isColNumberRow@33, isHeaderFragmentRow@40, detectHeaderSpan@68, applyHeaderMerge@147

- `js/layout-engine/faithful/layout-ir.js` (20126) [FayzarHeaderMerge, FayzarGridFirst, FayzarLayoutIR] — Fayzar — হুবহু-লেআউট নকশা (FayzarLayoutIR)
  fzOn@24, mathHOn@26, formKitOn@28, tableGridOn@30, faithfulStudioOn@32, wrapFitOn@35, tableColOn@46, lineGapOn@57, pages4On@77, extraLinesOn@88, a10LinesOn@99, p1LossOn@110, a01FixOn@121, p2DriftOn@132, ruleFixOn@143, rules2On@154, nestBoxOn@174, a03FixOn@194, a17FixOn@214, a14FixOn@225, a07FixOn@236, a07Fix2On@247, a19FixOn@267, a16FixOn@287, boxSplitOn@298, a11FixOn@315, a10FixOn@326, tblMergeOn@337, filterMicroClusterVRules@356, rotTextOn@369, vspaceOn@380, indentOn@400, widthOn@420, a14Fix3On@440, fontFixOn@460, a16Fix3On@480, a14RulesOn@500, a07Fix3On@520, a16Fix4On@540, a02FixOn@560, a14Fix4On@580, a13FixOn@600, a16Fix5On@620, a09FixOn@640, a14Fix5On@660, a07Fix5On@680, a12FixOn@700, a03Fix3On@720, a06FixOn@740, a03Fix4On@760, a07Fix6On@780, f1FixOn@800, a18FixOn@820, a08FixOn@840, a16Fix6On@860, f1Fix2On@880, indentFixOn@900, vgapFixOn@920, serialFixOn@940, missingFixOn@960, shortFixOn@980, rulesFixOn@1000, fontTypeFixOn@1020, lineWidthFixOn@1040, ROT_MARK_RE@1059, makeRotCell@1071, cellStr@1077, parseRotCellInput@1083, partialHeaderRowHeights@1095, NAMED_HEX@1134, normHexColor@1140, isDarkFill@1148, isPlaceholderStr@1154, stripPlaceholderWrap@1160, parseInlineBoxes@1163, MCQ_SPLIT_RE@1181, MCQ_TEST_RE@1182, tabifyMcqOptions@1183, TRAIL_MARK_RE@1211, Q_TRAIL_MARK_RE@1212, attachTrailingRightTab@1213, mathKindOf@1236, hasNestedFrac@1259, mathLineExtraPt@1282, mathVisStr@1300, FS_CLASS@1313, KEEP_TYPES@1315, inkRatioFor@1323, PAPER@1344, median@1345, clamp@1347, tabify@1354, splitTableAtGaps@1412, empty@1418, rowBandHeights@1473, wrap@1505, heightsOf@1521, bandOf@1551, lineRowHeights@1580, assign@1629, exactHeights@1688, isScribble@1730, mergeLineRows@1742, SERIAL@1799, foldSerialRows@1800, isSer@1802, LABEL@1810, foldBoxRows@1834, isBox@1836, isOpt1@1837, isOpt@1838, normOpt@1839, attachBoxLabels@1870, isBoxTbl@1871, dropEmptyMeasuredCol@1896, join@1903, perLineUnderline@1915, plain@1921, len@1939, isP@1940, toItem@1960, visLen@2160, isFillCol@2308, vis@2419, SUBSER0@2503, SUBSER@2540, isFill@2557, noBox@2949, normalizePage@2972, estOf@2980, map@3052, dropSigDates@3287, DATE@3290, onFig@3291, bandsOf@3328, isShortSideLabel@3361, snapIndents@3426, flush@3438, snapFonts@3486, alignNumberTabs@3578, alignTabStops@3599, nTab@3600, isA16SerialTabItem@3602, oneTab@3603, fillTabs@3605, kvOf@3616, attach@3618, contOf@3628, feed@3637, applyVerticalRules@3697, applyBoxFrames@3728, inside@3737, touches@3738, own@3739, rectOf@3740, pageSized0@3749, fits@3785, hasPara@3786, pageSized@3791, recoverCardGridBoxes@3867, med@3904, applyHorizontalRules@3958, xov@3967, nestFiguresInTables@4033, STD_MARGINS@4051, snapMargin@4053, unifyMargins@4069, build@4095, snapshotIrLayout@4335, itemEditableText@4357, extractBlocks@4372, updateBlockText@4404, syncTableFonts@4464, syncLabelColumns@4481, syncFillLabels@4504, FILLX@4505, isFL@4506, syncGridPitch@4534, decideBold@4551, script@4555, norm@4560, repairP2DriftPage@4605, repairP2DriftIr@4850, repairA03Page@4866, repairA03Ir@5123, detectClosedBoxes@5134, addBox@5136, hasH@5193, hasV@5194, partitionItemsIntoBoxes@5214, repairNestBoxPage@5249, nextBoxId@5295, prepCol@5314, repairNestBoxIr@5582, repairA17Page@5596, rHalf@5602, repairA17Ir@5787, repairA14Page@5801, FILL_RE@5803, repairA14Ir@6023, repairA07Page@6036, repairA07Ir@6244, repairA07Fix2Page@6259, repairA07Fix2Ir@6577, repairA19Page@6599, repairA19Ir@6832, repairA16Page@6848, isChecklistTbl@6856, repairA16Ir@7166, repairA11Page@7185, repairA11Ir@7373, repairA10FixPage@7391, repairA10FixIr@7583, clone2D@7598, snapshotTableBeforeMerge@7602, restoreTblMergePage@7646, restoreTblMergeIr@7695, distributeColWidthsPt@7702, syncTableColWidthsToWidth@7729, updateGridCells@7739, populateTableCellMeta@7761, repairTblMergePage@7821, repairTblMergeIr@8212, hasA14LineGapAnomaly@8228, hasLineGapPageAnomaly@8263, repairA14LineGapPage@8291, repairLineGapPage@8534, repairLineGapIr@8721, repairRotTextTable@8731, repairRotTextPage@8923, repairRotTextIr@8941, repairVSpacePage@8956, effWrapW@8960, repairVSpaceIr@9079, repairIndentPage@9095, repairIndentIr@9338, repairWidthPage@9354, FILL_G_RE@9359, dotCntOf@9402, repairWidthIr@9585, repairA14Fix3Page@9603, MULTI_FILL_RE@9606, repairA14Fix3Ir@10044, repairFontFixPage@10105, repairFontFixIr@10328, repairA16Fix3Page@10344, repairA16Fix3Ir@10634, repairA14RulesPage@10650, repairA14RulesIr@10798, A07FIX3_NON_ENUM_KEYS@10814, cloneItemForA07Fix3@10821, snapshotPageBeforeA07Fix3@10832, restoreA07Fix3Page@10849, restoreA07Fix3Ir@10868, repairA07Fix3Page@10874, repairA07Fix3Ir@11112, repairA16Fix4Page@11129, repairA16Fix4Ir@11381, repairA14Fix4Page@11397, SINGLE_FILL_TAIL_RE@11400, repairA14Fix4Ir@11646, repairA13FixPage@11663, repairA13FixIr@11770, repairA16Fix5Page@11792, repairA16Fix5Ir@12054, repairA09FixPage@12069, repairA09FixIr@12213, A14FIX5_NON_ENUM_KEYS@12228, cloneItemForA14Fix5@12238, snapshotPageBeforeA14Fix5@12249, restoreA14Fix5Page@12271, restoreA14Fix5Ir@12296, repairA14Fix5Page@12302, repairA14Fix5Ir@12604, A07FIX5_NON_ENUM_KEYS@12620, cloneItemForA07Fix5@12627, snapshotPageBeforeA07Fix5@12638, restoreA07Fix5Page@12654, restoreA07Fix5Ir@12673, repairA07Fix5Page@12679, repairA07Fix5Ir@12840, repairA12FixPage@12856, repairA12FixIr@12973, A03FIX3_NON_ENUM_KEYS@12989, cloneItemForA03Fix3@12995, cloneBandForA03Fix3@13013, snapshotPageBeforeA03Fix3@13036, restoreA03Fix3Page@13054, restoreA03Fix3Ir@13077, repairA03Fix3DateTable@13083, repairA03Fix3Page@13112, setHidden@13128, stripBoldMarks@13133, repairA03Fix3Ir@13504, repairA02FixPage@13513, repairA02FixIr@13828, A06FIX_NON_ENUM_KEYS@13845, cloneItemForA06Fix@13854, snapshotPageBeforeA06Fix@13865, restoreA06FixPage@13881, restoreA06FixIr@13901, repairA06FixPage@13907, estTailW@13944, repairA06FixIr@14114, snapshotPageBeforeA03Fix4@14128, restoreA03Fix4Page@14146, restoreA03Fix4Ir@14169, repairA03Fix4Page@14175, repairA03Fix4Ir@14530, A07FIX6_NON_ENUM_KEYS@14559, cloneItemForA07Fix6@14567, cloneBandForA07Fix6@14578, snapshotPageBeforeA07Fix6@14593, restoreA07Fix6Page@14602, restoreA07Fix6Ir@14614, repairA07Fix6Page@14620, repairA07Fix6Ir@14960, snapshotPageBeforeF1Fix@14970, restoreF1FixPage@14980, restoreF1FixIr@14993, repairF1FixPage@15000, repairF1FixIr@15264, A18FIX_NON_ENUM_KEYS@15294, cloneItemForA18Fix@15300, cloneBandForA18Fix@15311, snapshotPageBeforeA18Fix@15320, restoreA18FixPage@15329, restoreA18FixIr@15341, isA18LeaveTableItem@15347, repairA18FixPage@15357, repairA18FixIr@15470, A08FIX_NON_ENUM_KEYS@15495, cloneItemForA08Fix@15500, cloneBandForA08Fix@15514, snapshotPageBeforeA08Fix@15523, restoreA08FixPage@15532, restoreA08FixIr@15544, isA08ClearancePage@15550, repairA08FixPage@15568, repairA08FixIr@15704, cloneItemForA16Fix6@15713, snapshotPageBeforeA16Fix6@15726, restoreA16Fix6Page@15744, restoreA16Fix6Ir@15769, repairA16Fix6Page@15789, repairA16Fix6Ir@16130, cloneItemForF1Fix2@16157, cloneBandForF1Fix2@16170, snapshotPageBeforeF1Fix2@16179, restoreF1Fix2Page@16190, restoreF1Fix2Ir@16202, repairF1Fix2Page@16208, repairF1Fix2Ir@16536, copyNonEnumProps@16567, cloneItemForIndentFix@16579, cloneBandForIndentFix@16588, snapshotPageBeforeIndentFix@16600, restoreIndentFixPage@16612, restoreIndentFixIr@16629, repairIndentFixPage@16635, repairIndentFixIr@16946, cloneItemForVGapFix@16968, cloneBandForVGapFix@16989, snapshotPageBeforeVGapFix@17006, restoreVGapFixPage@17018, restoreVGapFixIr@17035, repairVGapFixPage@17041, repairVGapFixIr@17214, snapshotPageBeforeSerialFix@17237, restoreSerialFixPage@17255, restoreSerialFixIr@17280, repairSerialFixPage@17286, repairSerialFixIr@17495, cloneItemForMissingFix@17504, cloneBandForMissingFix@17519, snapshotPageBeforeMissingFix@17530, restoreMissingFixPage@17543, restoreMissingFixIr@17590, countMissingFixPageRows@17596, captureMissingFixGuard@17618, verifyMissingFixGuard@17633, repairMissingFixPage@17662, repairMissingFixIr@17808, ensureShortFixSnap@17842, saveOverlaysBeforeShortFix@17854, restoreShortFixPage@17865, restoreShortFixIr@17906, repairShortFixPage@17912, repairShortFixIr@18069, defHidden@18078, snapshotPageBeforeRulesFix@18079, restoreRulesFixPage@18084, restoreRulesFixIr@18094, repairRulesFixPage@18101, repairRulesFixIr@18233, snapshotPageBeforeFontTypeFix@18242, restoreFontTypeFixPage@18255, restoreFontTypeFixIr@18302, repairFontTypeFixPage@18309, repairFontTypeFixIr@18657, cloneItemForLineWidthFix@18665, cloneBandForLineWidthFix@18673, snapshotPageBeforeLineWidthFix@18684, restoreLineWidthFixPage@18697, restoreLineWidthFixIr@18714, classifyLineWidthFixPage@18720, isLineWidthFixTargetPage@18778, repairLineWidthFixPage@18782, repairLineWidthFixIr@19916

- `js/layout-engine/faithful/layout-tags.js` (203) [FayzarLayoutTags] — Fayzar — হুবহু-লেআউট ট্যাগ-পার্সার (FayzarLayoutTags)
  TYPES@15, SYNONYM@17, formKitOn@24, FORMKIT_TYPES@25, FORMKIT_SYNONYM@26, AUDIT_RE@32, bn2en@36, clamp@37, parseTagBody@40, expandFill@94, parse@107, pageMarkerAt@126, cleanText@131, byPage@154, needsContinuation@161, lastBlockInfo@168, mergeContinuation@179, norm@186

- `js/layout-engine/faithful/line-fit.js` (3251) [FayzarLineFit] — Fayzar — হুবহু-লেআউট লাইন-আঁটানো (FayzarLineFit) — WORK_PLAN B5
  FILL@14, FILL_G@15, FONT_WIDTH_RATIOS@18, isFontPickOn@25, SPACING_KAR_RE@33, TAIL_AFTER_FILL_RE@34, isWrapFitOn@35, isLineGapOn@47, isPages4On@65, isExtraLinesOn@77, isA10LinesOn@89, isP1LossOn@101, isA01FixOn@113, isP2DriftOn@125, isRuleFixOn@137, isRules2On@149, isNestBoxOn@167, isA03FixOn@185, isA17FixOn@203, isA14FixOn@215, isA07FixOn@227, isA07Fix2On@239, isA19FixOn@257, isA16FixOn@275, isA11FixOn@287, isA10FixOn@299, isTblMergeOn@311, isRotTextOn@329, isVSpaceOn@341, boxSplitOn@359, isIndentOn@378, isWidthOn@396, isA14Fix3On@414, isA03Fix3On@433, isA03Fix4On@452, isFontFixOn@470, isA16Fix3On@488, isA14RulesOn@506, isA07Fix3On@524, isA16Fix4On@542, isA02FixOn@560, isA14Fix4On@578, isA13FixOn@596, isA16Fix5On@614, isA09FixOn@632, isA14Fix5On@650, isA07Fix5On@668, isA12FixOn@686, isA06FixOn@704, isA07Fix6On@722, isF1FixOn@740, isA18FixOn@758, isA08FixOn@776, isA16Fix6On@794, isF1Fix2On@812, isIndentFixOn@830, isVGapFixOn@848, isSerialFixOn@866, isMissingFixOn@884, isShortFixOn@902, isRulesFixOn@920, isFontTypeFixOn@938, isLineWidthFixOn@956, defaultWrapMeasure@973, getFontWidthRatio@981, resolveFitFont@986, lineWidthPt@997, sideIndent@1021, repairP1LossIr@1029, repairA17Ir@1037, repairA10Ir@1046, repairA01Ir@1128, repairRules2Ir@1202, clamp@1205, repairRuleFixIr@1340, fitTabFills@1440, fitMid@1445, fitTable@1518, colW@1554, fitItem@1659, lineAvailOf@1709, repairP2DriftPage@1833, repairP2DriftIr@1841, repairA03Page@1849, repairA03Ir@1857, repairNestBoxPage@1863, repairNestBoxIr@1871, repairA14Ir@1878, repairA07Page@1887, repairA07Ir@1895, repairA07Fix2Page@1901, repairA07Fix2Ir@1909, repairA19Page@1915, repairA19Ir@1923, repairA16Page@1929, repairA16Ir@1937, repairA11Page@1944, repairA11Ir@1952, repairA10FixPage@1958, repairA10FixIr@1966, repairRotTextPage@1971, repairRotTextIr@1978, repairTblMergePage@1988, repairTblMergeIr@2000, restoreTblMergePage@2007, restoreTblMergeIr@2014, repairLineGapPage@2021, repairLineGapIr@2029, repairVSpacePage@2035, repairVSpaceIr@2043, repairIndentPage@2049, repairIndentIr@2057, repairWidthPage@2063, repairWidthIr@2071, repairA14Fix3Page@2077, repairA14Fix3Ir@2085, repairA16Fix3Page@2093, repairA16Fix3Ir@2100, repairFontFixPage@2109, repairFontFixIr@2117, repairA14RulesPage@2123, repairA14RulesIr@2131, repairA07Fix3Page@2140, repairA07Fix3Ir@2152, repairA16Fix4Page@2165, repairA16Fix4Ir@2173, repairA14Fix4Page@2182, repairA14Fix4Ir@2190, repairA13FixPage@2199, repairA13FixIr@2207, repairA16Fix5Page@2216, repairA16Fix5Ir@2224, repairA09FixPage@2233, repairA09FixIr@2241, restoreA14Fix5Page@2250, restoreA14Fix5Ir@2258, repairA14Fix5Page@2267, repairA14Fix5Ir@2276, repairA07Fix5Page@2286, repairA07Fix5Ir@2298, repairA12FixPage@2311, repairA12FixIr@2319, restoreA03Fix3Page@2328, restoreA03Fix3Ir@2336, repairA03Fix3Page@2345, repairA03Fix3Ir@2354, repairA02FixPage@2364, repairA02FixIr@2372, restoreA06FixPage@2382, restoreA06FixIr@2390, repairA06FixPage@2399, repairA06FixIr@2408, restoreA03Fix4Page@2418, restoreA03Fix4Ir@2426, repairA03Fix4Page@2435, repairA03Fix4Ir@2444, restoreA07Fix6Page@2454, restoreA07Fix6Ir@2462, repairA07Fix6Page@2471, repairA07Fix6Ir@2480, restoreF1FixPage@2491, restoreF1FixIr@2499, repairF1FixPage@2508, repairF1FixIr@2517, restoreA18FixPage@2527, restoreA18FixIr@2535, repairA18FixPage@2544, repairA18FixIr@2553, restoreA08FixPage@2563, restoreA08FixIr@2571, repairA08FixPage@2580, repairA08FixIr@2589, restoreA16Fix6Page@2599, restoreA16Fix6Ir@2607, repairA16Fix6Page@2616, repairA16Fix6Ir@2625, restoreF1Fix2Page@2635, restoreF1Fix2Ir@2643, repairF1Fix2Page@2652, repairF1Fix2Ir@2661, restoreIndentFixPage@2671, restoreIndentFixIr@2679, repairIndentFixPage@2688, repairIndentFixIr@2697, restoreVGapFixPage@2707, restoreVGapFixIr@2715, repairVGapFixPage@2724, repairVGapFixIr@2733, restoreSerialFixPage@2743, restoreSerialFixIr@2751, repairSerialFixPage@2760, repairSerialFixIr@2769, restoreMissingFixPage@2779, restoreMissingFixIr@2787, repairMissingFixPage@2796, repairMissingFixIr@2805, restoreShortFixPage@2816, restoreShortFixIr@2824, repairShortFixPage@2833, repairShortFixIr@2842, restoreRulesFixPage@2852, restoreRulesFixIr@2860, repairRulesFixPage@2869, repairRulesFixIr@2878, restoreFontTypeFixPage@2888, restoreFontTypeFixIr@2896, repairFontTypeFixPage@2905, repairFontTypeFixIr@2914, restoreLineWidthFixPage@2924, restoreLineWidthFixIr@2932, repairLineWidthFixPage@2941, repairLineWidthFixIr@2950, fit@2960

- `js/layout-engine/faithful/line-rebreak.js` (252) [FayzarLineRebreak] — Fayzar — হুবহু-লেআউট লাইন-পুনর্বিভাজন (FayzarLineRebreak) — FAITHFUL_PLAN ধাপ ২
  stripMarks@23, lineWidthPt@35, tokenize@48, needsRebreak@88, rebreak@129, spanWidth@159

- `js/layout-engine/faithful/page-geometry.js` (1691) [FayzarPageGeometry] — Fayzar — পাতা-মাপার ইঞ্জিন (FayzarPageGeometry)
  fzOn@19, tableGridOn@22, rules2On@24, clamp@44, median@45, inkMask@47, pct@77, otsu@78, otsuThreshold@191, components@206, linesOf@237, split@252, RATIO@288, estimateFontPt@289, blockMetrics@300, isVRule@307, ulOf@667, score@761, fitBoxDrift@807, vDashComps@851, flush@875, snapBoxesToLines@886, clipY1@892, tooFewLines@910, shiftFrom@917, absOff@931, unclaimed@961, fillOrphans@987, solve@1007, ovLim@1030, xOv@1032, ovY@1065, fitExtentDrift@1082, hits@1094, applyDrift@1104, verticalRules@1107, detectSmallBoxes@1171, hasBoxPerimeter@1182, horizontalRules@1219, boxFrames@1254, sideFree@1268, rowCover@1287, r1g@1318, lum@1322, hex2@1323, pageBackground@1325, blockShade@1339, med@1349, edgeTint@1361, wideBar@1380, mid@1402, darkBandMask@1411, hLinePositions@1471, hLineSpan@1488, brokenHLinePositions@1505, countHLines@1525, isFrameComp@1542, detectFrame@1548, pageMargins@1561, tableRowBands@1575, checkTableRows@1658

- `js/layout-engine/faithful/row-ink.js` (126) [FayzarRowInk] — Fayzar — ছকের সারি ⇒ রেখা-ভাগ, কালি-মাপে (FayzarRowInk) — ২০২৬-১০-১৩
  bandLines@19, assign@32, groupCost@40, realign@73, txt@75, key@76, filled@78, comp@79

- `js/layout-engine/faithful/serial-hang.js` (308) [FayzarSerialHang] — Fayzar — হুবহু-মোড ক্রমিক-অনুচ্ছেদের ঝুলন্ত ইনডেন্ট (FayzarSerialHang) — সুইচ FZ_ON=SERIALHANG / __FZ_ON_SERIALHANG
  SUB_SER@18, IND_AFTER@21, isOn@23, attr@31, prefixHangTw@34, estTextTw@44, isFormLineTxt@50, wrapsMoreLines@60, extractDataHints@82, fixPara@156, collectSiblingStops@220, apply@248

- `js/layout-engine/faithful/switch-defaults.js` (38) — Fayzar — হুবহু-মোডের গৃহীত FIX সুইচ ডিফল্ট-চালু (২০২৬-১০-২০)
  DEFAULT_ON@26

- `js/layout-engine/fayzar-export.js` (127) [FayzarExport] — Fayzar — একক রপ্তানি-পথ (FayzarExport)
  pick@19, countFigures@25, FORMATS@28, composeNukta@37, produce@41

- `js/layout-engine/fayzar-pipeline.js` (841) [FayzarPipeline] — Fayzar Publishing Studio - Unified Pipeline Gateway (v4.0)
  safeNow@16, stripOcrArtifacts@24, _getClassifier@51, _getExportDualEngine@64, _getQuestionEngine@77, _getStampEngine@90, _getApplicationEngine@103, _getApplicationLayout@116, _getCertificateLayout@128, _getEnCvLayout@140, _getReceiptLayout@147, _getCashMemoLayout@155, _isRegistryOn@167, _getLayoutRegistry@174, _getCvLayout@187, _getLetterLayout@198, _getAdmitCardEngine@209, _getSalarySlipEngine@222, _getRoutineEngine@235, _getCVEngine@248, _getCertificateEngine@261, _getTextRunProcessor@274, process@302, _parseByDocType@423, _renderHtml@593, _buildFallbackData@778, _renderFallbackHtml@789, _escapeHtml@801, previewHtml@815, exportDocx@819, exportDoc@823, classify@827

- `js/layout-engine/figure-extractor.js` (551) [FayzarFigureExtractor] — Fayzar — সোর্স-চিত্র কাটার ইঞ্জিন (FayzarFigureExtractor)
  bnToAscii@27, clamp@28, lum@29, anyTagRe@35, parseTagBody@38, parseTags@59, replaceTagsWithMarkers@72, stripTags@84, hasLooseTags@87, NUM_PREFIX_RE@97, NUM_LINE_RE@98, normalizePlacement@99, tagsOf@103, withoutTags@104, isBlank@105, isTagOnly@106, boxToRect@129, rectToBox@140, inkCount@146, refineRect@166, estimateSkew@231, score@244, clearBorderFragments@262, visit@270, cleanImage@298, trimRect@334, maxWidthIn@353, physicalSize@372, pdfLib@386, buildPageSources@392, loadPdf@404, loadImage@415, renderPage@420, pageImageData@454, cropClean@460, extract@494, recrop@528, hasTags@545

- `js/layout-engine/frontmatter-header.js` (69) [FayzarFrontmatter] — Fayzar — ফ্রন্টম্যাটার → প্রশ্নপত্র-হেডার (FayzarFrontmatter)
  FM_RE@12, clean@15, split@23, toHeader@36, applyToHeader@55

- `js/layout-engine/gemini-prompt-factory.js` (249) [GeminiPromptFactory] — Fayzar Layout Engine - Gemini Markdown Prompt Factory v1.0
  getPrompt@22, getAllTemplateChoices@231

- `js/layout-engine/general-clean-layout.js` (234) [FayzarGeneralCleanLayout] — Fayzar — GENERAL_CLEAN লেআউট (Phase 2A) — পড়ে শুধু doc-model (doc-model.js); কোনো উৎস-বিশেষ জ্ঞান নেই
  mod@15, PAGE@23, LADDER@24, MARKER_RE@25, isEnabled@27, esc@33, estimatePages@37, lines@44, choose@56, render@67, wrapped@80, lineRuns@85, para@91, marker@92, sizeOf@94, style@95, renderBlock@97, tableXml@154, sideXml@178, cell@180, narrow@208, renderDocx@224

- `js/layout-engine/general-paper-parser.js` (128) [FayzarGeneralParser] — Fayzar — সাধারণ-ফরম্যাটের (EXAM_GENERAL) স্তরযুক্ত প্রশ্নপত্র পার্সার (Part-18.7)
  LET_ITEM@23, OPT_SPLIT@24, clean@27, stripHash@28, inlineOptions@31, splitMark@41, isNested@49, parseSections@56, newSection@60, pushQ@61, nextNonEmpty@62

- `js/layout-engine/layout-registry.js` (1634) [FayzarLayoutRegistry] — Fayzar Publishing Studio — লেআউট রেজিস্ট্রি (Layout Registry)
  normText@15, toNumber@25, normalizeLookupKey@36, extractFrontmatterFromText@42, normalizeFrontmatter@61, getGlobalRoot@84, getLayoutModule@92, unpackParseArgs@106, getQuestionEngineModule@125, parseExamWithQuestionEngine@143, renderExamHtmlWithQuestionEngine@156, buildEffectiveSettings@168, normalizeExplicitSubLayout@254, selectCashMemoSubLayout@295, selectExamGeneralSubLayout@353, selectGeneralSubLayout@383, selectProttoyonSubLayout@409, selectCvSubLayout@422, getTargetModuleForSubLayout@432, resolveSubLayoutFromArgs@464, ensureDocxHelper@520, escXml@522, runs@529, ensureRtfHelper@549, rtf@552, ALLOWED_OVERRIDES@571, CASH_MEMO_ENTRY@583, parse@626, renderHtml@683, renderDocx@700, renderRtf@708, ARCHETYPE_REGISTRY_ENTRIES@717, register@1472, get@1526, has@1551, list@1559, resolve@1571

- `js/layout-engine/layout-units.js` (164) [FayzarLayoutUnits] — লেআউট-ইউনিট নরমালাইজার (Part-12)
  MARGIN_MAP@29, GAP_MAP@30, MARGIN_CLASS_MAP@33, UNIT@42, clamp@44, bnDigits@47, finiteOr@57, toTwips@69, linePitchTwips@106, margin@120, marginClass@127, gap@132, indent@134, twips@135, count@137, questionIndent@145, docxLineRule@152, examLineFactor@159

- `js/layout-engine/letter-layout.js` (586) [FayzarLetterLayout] — Fayzar — প্যাড/অফিস চিঠি (OFFICE_PAD) ও প্রত্যয়নপত্র (PROTTOYON) লেআউট — Part-19.0
  getAL@20, measure@25, getRM@30, norm@35, cleanLine@40, AL_KINDS@74, STEPS@76, PAGE@90, HEAD_SZ@91, parse@101, hasLetterhead@167, _takeLetterhead@184, _takeSignature@202, isSig@207, _parseFree@275, push@278, seenText@279, _parseTail@311, geometry@334, _headSz@357, _sigWidths@366, _sigIndent@369, _gap@376, estimateHeight@386, lineH@390, renderDocx@415, _docxSignature@459, docxSectPr@479, renderRtf@488, _rtfSignature@523, renderHtml@538, inch@544

- `js/layout-engine/mcq-layout-planner.js` (731) [McqLayoutPlanner] — Fayzar Bangla Converter — MCQ Master Layout Planner (Part-10)
  classOf@54, measure@73, lineCount@83, optionVisualText@115, readGroup@117, skipSpace@126, render@145, optionWidth@199, layoutUnits@213, MARGIN@215, fin@217, bnDigits@218, margin@233, gap@234, indent@235, twips@236, count@237, linePitchTwips@238, docxLineRule@239, GEOMETRY@247, FALLBACK@271, geometry@291, lineH@325, decideOptionsGrid@330, buildHeader@368, headerHeight@414, measureQuestion@432, balancePage@475, balancePageHeader@515, plan@543, setBreak@611, docxTabs@715, rtfTabs@721

- `js/layout-engine/receipt-layout.js` (413) [FayzarReceiptLayout] — Fayzar — টাকা প্রাপ্তির রসিদ ও খরচের ভাউচার লেআউট — TEMPLATE_COMPOSE_PLAN T2 দল ৪
  norm@17, cleanLine@22, toBn@26, toNum@27, SIZES@47, PAGE_L@52, PAGE_A5@53, DEFAULT_HEAD@55, readFm@57, kindOf@63, copiesOf@76, parse@86, _classifyHeader@133, _segments@146, _signParts@159, _table@174, geometry@199, _colWidths@208, _fillers@219, _signTabs@227, _fieldStops@232, renderDocx@241, space@244, boxed@252, _docxTable@288, cell@293, row@301, docxSectPr@311, renderRtf@320, _rtfTable@355, def@358, renderHtml@371, inch@376, box@378, line@379

- `js/layout-engine/role-marks.js` (94) [FayzarRoleMarks] — Fayzar — হালকা ভূমিকা-চিহ্ন (Phase 1B-ii, fix 1.3)
  TAG_RX@16, KEEP_TYPES@17, parseTags@19, strip@41, extract@49, hide@68, reattach@74, gate@81

- `js/layout-engine/rtf-builder.js` (99) [FayzarRtfBuilder]
  document@2, paragraph@13, run@35, runTab@51, tableRow@55, tableCell@60, tableRowComplex@77

- `js/layout-engine/sample-template.js` (798) [FayzarSampleTemplate] — Fayzar — নিজের নমুনা থেকে ছাঁচ (FayzarSampleTemplate) — T3b, docs/T3_PLAN.md §৩–৪
  FIXED_TYPES@19, FILL_ONLY@20, ABBR@21, SUMMARY@22, SERIAL@23, nukta@48, plain@50, cmp@52, LABEL_KEY@53, labelKey@58, bnDigits@59, clone@60, KV_RX@65, parseKv@67, tokens@83, kvSegs@105, blankValue@112, walk@120, itemAt@123, itemLines@124, slimIR@127, fromIR@134, addSlot@137, add@140, LIST_RX@207, SALUTE@208, splitInline@210, splitContent@230, flush@236, tableFit@274, isAddr@286, addrContext@288, matchLocal@304, keyed@308, first@344, TEXT@355, PART_TEXT@356, restoreFont@391, setLines@393, fillTable@405, isSum@411, place@432, blankRow@448, fill@482, partOf@490, styleSrc@585, toTemplate@625, compose@631, MAP_PROMPT@641, cut@653, mapCandidates@656, needsRemote@666, buildMapPrompt@672, parseMap@683, hash@706, cacheGet@709, cachePut@714, mapWithGemini@724, setRole@751, suggestReadymade@767, composeAsync@784

- `js/layout-engine/schema-validator.js` (104) [FayzarSchemaValidator]
  validate@2, _validateRoutine@42, _validateQuestion@52, _validateCertificate@62, _validateStamp@68, _validateGovtApp@74, _validateAdmitCard@80, _validateSalarySlip@86, _validateCV@92

- `js/layout-engine/self-check.js` (261) [FayzarSelfCheck] — Fayzar — স্ব-যাচাই (Phase 3): তৈরি .docx-এর document.xml পড়ে চেক c1–c9 চালায় — Gemini লাগে না।
  decode@16, T_RE@17, wtText@18, paraText@21, joinedText@28, PLACEHOLDERS@36, normWord@37, MESSAGES@39, sourceWords@51, topTables@70, hasRealBorder@85, isLayoutTable@87, parseTables@94, mdTables@104, computeChecks@121, selfCheck@211, showNotice@228, onclick@246

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

- `js/result-relayout.js` (937) [FayzarRelayout] — ফয়জার এআই কম্পোজ — ফলাফল-পাতায় লেআউট/সেটিং বদল ও "ঠিক হয়নি?" (D_RELAYOUT_v5: D1–D4)
  DEFAULT_ARCHETYPE_TO_DOCTYPE@23, ARCHETYPE_LABELS@43, DOCTYPE_LABELS@63, DEFAULT_SETTINGS@83, isEnabled@107, fromBnDigits@123, toBnDigits@128, getArchetypeMapObj@133, resolveDocType@146, getBanglaLabel@170, getLayoutOptions@189, parseFrontmatter@206, detectLayout@228, normalizeSettings@276, buildExportOptions@330, applyFrontmatter@377, sanitizeMeta@419, FORBIDDEN@421, getLogs@436, recordLog@457, clearLogs@505, getSessionMarkdown@520, reExport@547, download@644, buildReOcrPrompt@653, setReOcrHandler@660, requestReOcr@669, hasCustomExport@708, mountResult@715, $id@812, readUiSettings@818, applyFromUi@828

- `js/session-store.js` (97) [FayzarSession] — ফয়জার এআই কম্পোজ — কাজের সেশন-ক্যাশ ও কনভার্ট-ইতিহাস (রিফ্রেশে কাজ না হারাতে, আগের আউটপুট আবার পেতে)।
  open@12, onupgradeneeded@16, onsuccess@21, onerror@22, oncomplete@30, onabort@32, save@38, load@46, historyAdd@57, historyList@68, all@70, historyUpdate@75, historyPrune@86

- `js/studio-controller.js` (3030) [FayzarStudioFaithful, FayzarStudioF2Wire] — Fayzar Publishing Studio - Microsoft Word Office Suite Controller
  faithfulStudioOn@17, escFaithfulHtml@26, getDocxBuilder@34, getLayoutIrEngine@40, getDocxPreviewEngine@46, getExportEngine@52, getBridgeEngine@58, snapshotFaithfulIr@64, extractFaithfulBlocks@90, updateFaithfulBlockText@127, renderSimpleFaithfulHtml@142, renderItem@153, renderBlockListDom@209, renderFaithfulSessionPreview@250, loadFaithfulIntoStudio@276, updateFaithfulStudioBlock@305, rebuildAndExportFaithful@331, isDocxPreviewEnabled@395, getPreviewDebounceMs@401, createPreviewDebouncer@409, setTimeout@411, clearTimeout@412, debounced@415, cancel@426, pending@432, createRenderGate@441, buildDocxExportOptions@452, extractDocxPayload@464, hasZipEocd@480, isValidDocxPayload@497, isValidPreviewRenderResult@537, runPreviewUpdate@566, isStale@572, runLegacyHtml@574, snapshot@866, undo@889, redo@895, _restore@901, updateStatusBar@923, save@935, restore@968, startTimer@993, markDirty@999, updateIndicator@1004, applyTheme@1042, layoutOptions@1084, withoutFigTags@1105, faithfulStudioOnDom@1110, ensureFaithfulBlockListContainer@1114, updatePreview@1132, showToast@1281, updateWordDocTitle@1297, applyEditModeState@1310, updateRulerMargin@1365, setZoom@1421, getDocTypeBanglaLabel@1431, insertTableIntoDoc@1515, onload@1543, toggleFullscreenView@1680, fitPage@1867, fitWidth@1876, downloadDocument@1949, studioMasterOn@2066, finishDownload@2071, generateBlankOmr@2142, handleImportFile@2158, loadMdFile@2188, onerror@2200, openHelpModal@2255, closeHelpModal@2256, debounce@2360, loadTransferredDocument@2383, onmessage@2483, rememberTextareaCaret@2501, saveCurrentSelection@2509, resolveInsertTarget@2530, insertTextIntoTextarea@2554, insertAtTarget@2567, insertContentAtCaret@2605, figurePipeline@2619, cleanFieldText@2624, fieldSourceIndex@2634, buildFigureElement@2649, applyFiguresToPreview@2675, removeMarkerFromSource@2699, insertFigureFromElement@2711, MATH_SYMBOLS@2757, renderMathCategory@2847, openMathModal@2866, openDiagramModal@2903, attachFigureControls@2966, closeStudioModals@3012

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

- `tools/ag-agent.ps1` (92) — ag-agent.ps1 - drive the Gemini Agent panel of Antigravity IDE (screen automation)
  Shot@24, Focus-Antigravity@34, Click@42, Paste-Enter@47

- `tools/agent_manager.mjs` (229) — tools/agent_manager.mjs
  getArg@23, checkStatus@28, createBundle@56, sendTask@95, reloadTabs@134, readTab@147, fetchFiles@167, main@197

- `tools/arena_send.mjs` (99) — Arena (arena.ai/agent) ট্যাবে কাজ পাঠানো — arena-bridge-extension (পোর্ট 18766) দিয়ে।
  opt@13, flag@14, tabs@16, tabId@20, exec@26

- `tools/autonomous_monitor.mjs` (147) — tools/autonomous_monitor.mjs
  log@21, fetchJson@27, checkRateLimit@36, inspectTab@57, cycle@112, main@134

- `tools/bridge_task.mjs` (199) — bridge_task.mjs — ৩-পিসি Gemini ব্রিজ হাবে (fayzar-bridge-hub) কাজ পাঠানো/নজর/ফল আনা ও পিসি-স্তরের কমান্ড।
  loadEnv@19, flag@32, hub@35, ago@53, send@55, status@73, fetchResult@86, shot@107, runPcCmd@115, watch@157, main@184

- `tools/cv-tabs.ps1` (29) — paragraphs after table on page 1
  foreach@7

- `tools/dump-doc.ps1` (35)
  foreach@6

- `tools/gemini-round.mjs` (86) — Gemini রাউন্ড — bridge-এর তিন কাজ এক জায়গায় (২০২৬-১০-১৮)
  opt@13, sleep@14, load@15, save@16, now@17, get@18, acctOf@20, tabsList@21, tabIndexOfAcct@22, send@24, tryFetch@48, watch@55

- `tools/gemini-tabs-state.mjs` (17) — সব Gemini ট্যাবের এক-লাইনের অবস্থা: অ্যাকাউন্ট, কাজ চলছে/শেষ/আটকে, শেষ উত্তরের লেজ

- `tools/gen-map.mjs` (87) — কোড-সূচি জেনারেটর: docs/CODE_INDEX.md বানায় (ফাইল → বর্ণনা → গ্লোবাল নাম → ফাংশন@লাইন)।
  walk@12, describe@23, scan@31, add@41, rel@54

- `tools/make-score-task.mjs` (56) — একটি নমুনা-ফাইলের জন্য Gemini "বড় ভুল খুঁজে সারাও" কাজের PROMPT ও বান্ডেল-তালিকা তৈরি।

- `tools/make-type-task.mjs` (93) — একটি ভুল-ধরনের (font/vgap/indent/long/short/rules) জন্য সব ক্ষতিগ্রস্ত ফাইল মিলিয়ে Gemini কাজের PROMPT ও বান্ডেল-তালিকা।
  font@13, vgap@14, indent@15, long@16, short@17

- `tools/merge-lost-decls.mjs` (18) — merge3-এর পরে হারানো ঘোষণা খোঁজা: theirs-এ `const/let X =` আছে, এখনকার ফাইলে X ব্যবহার হয় কিন্তু কোথাও ঘোষিত নয়।
  declared@8

- `tools/merge-switch-check.mjs` (32) — merge3-এর পরে হারানো লাইন খোঁজা: theirs-এ নতুন যোগ/বদলানো লাইন (base-এ নেই) — এখনকার ফাইলে (trim) না থাকলে ছাপে।
  setOf@12

- `tools/merge3.mjs` (71) — লাইনভিত্তিক ৩-পথ মার্জ (git না থাকায়)। ব্যবহার: node tools/merge3.mjs <current> <base> <theirs>
  hunks@10

- `tools/new-session.ps1` (28) — নতুন Claude সেশন: Antigravity-তে "Claude Code: New Conversation" → ইনপুটে HANDOFF-নির্দেশ পাঠানো
  Palette@15

- `tools/pdf-pages.ps1` (11) — wdExportFormatPDF=17, wdExportFromTo=3

- `tools/remote-browser.mjs` (424) — remote-browser.mjs — আমাদের পিসি থেকে হাবের মাধ্যমে দূরের পিসির হেডলেস ব্রাউজার নিয়ন্ত্রণ (ধাপ R1)।
  loadEnv@15, sleep@25, constructor@31, _connect@43, _onData@100, close@150, _hubFetch@170, _downloadBinaryChunks@200, sendCmd@219, goto@292, click@296, type@303, press@310, read@317, waitFor@324, wait_for@331, shot@335, tabs@357, browserClose@361, resetAccount@365, runCli@370

## qa/

- `qa/auto-batch-e2e.mjs` (78) — QA: স্বয়ংক্রিয় মোডের ব্যাচ — অনেক আসল ছবি/PDF → আসল Gemini OCR (startUnifiedOcr) → downloadWordDocument।
  log@15

- `qa/baseline.mjs` (61) — Usage: node qa/baseline.mjs
  mark@30, val@31, section@37

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

- `qa/faithful-e2e.mjs` (85) — QA: হুবহু-লেআউট পূর্ণ পথ — আসল ফাইল → ক্যাপচার (ক্যাশ: <out>/capture.json) → মাপ+নকশা → মাস্টার/বিজয়/.doc।
  enc@55

- `qa/faithful-ui-e2e.mjs` (103) — QA: হুবহু-মোডের ইন্টারফেস — আসল উইজার্ড: ফাইল-ইনপুট → মোড-কার্ড → রূপান্তর-বোতাম → ৩ ডাউনলোড-বোতাম।
  check@16

- `qa/figure-e2e.mjs` (127) — QA: সোর্স-চিত্র পথের পূর্ণ যাচাই (Gemini ছাড়া) — আসল PDF → handleFiles → extract → FayzarExport।
  rot@90, save@113

- `qa/figure-ui-e2e.mjs` (83) — QA: আসল বোতাম-পথ — OCR-লেখা (চিত্র-ট্যাগসহ) → downloadWordDocument → রিভিউ স্ক্রিন → "নিশ্চিত" → ডাউনলোড।
  showToastNotification@55

- `qa/general-clean-batch.mjs` (62) — Phase 2A QA: ক্যাশ-করা সব capture.json → doc-model → GENERAL_CLEAN .docx; ক্র্যাশ গোনা; ✔ ফাইলের স্কোর। Gemini লাগে না।

- `qa/golden/_tmp-ext.mjs` (8)

- `qa/golden/asis-ab.mjs` (54) — সুইচ A/B তুলনা: একই ফাইলগুলো সুইচ-বন্ধ (ভিত্তি) আর সুইচ-চালু অবস্থায় আলাদা ফোল্ডারে স্কোর করে প্রতি ফাইলে পার্থক্য দেখায়।
  opt@14, tagOf@18, read@27, run@29

- `qa/golden/asis-causes.mjs` (68) — কারণ-ভিত্তিক রিপোর্ট (সব ফাইল একসাথে): layout-score.json-এর প্রতি-লাইন dy/dx0/dx1/h থেকে ভুলকে মূল কারণে ভাগ করে।
  opt@9, read@12, med@13, add@27, cnt@41

- `qa/golden/asis-drift.mjs` (31) — নির্ণয়: হুবহু-ফরম (asis) নমুনায় নকশার অবস্থান (ir.json) বনাম Word-এর আসল অবস্থান (out.raw.json) — উচ্চতা কোথায় জমছে।
  norm@11

- `qa/golden/asis-layout.mjs` (44) — হুবহু-ফরমের লেআউট-স্কোর (Word লাগে না): আগে বানানো asis/<id>/out.pdf বনাম মূল PDF।
  read@14, mean@28

- `qa/golden/asis-overview.mjs` (28) — নির্ণয় (নতুন রান ছাড়া): জমা qa/golden-data/asis/*/layout-score.json থেকে প্রতি নমুনার হারানো নম্বর (অংশ-ভাগ), লাইন মেলা/হারানো,

- `qa/golden/asis-report.mjs` (44) — ভুলের ধরন-ভিত্তিক রিপোর্ট (Word/Gemini লাগে না, তাৎক্ষণিক): প্রতি ফাইলের layout-score.json + image-score.json পড়ে
  opt@10, read@13, tot@34

- `qa/golden/asis-score.mjs` (345) — WORK_PLAN A5 ব্যাচ: PDF-মাত্র নমুনা (ASIS_DIR → Downloads\AS it IS → Downloads) → (ক্যাশ করা) ক্যাপচার → আমাদের .docx → Word-PDF → ছবি-স্কোর
  findSourcePdf@28, pickErrorLine@52, checkOutputFilesWritable@91, formatLockedMessage@120, handleStaleWord@125, done@184, ensureServer@191, stop@204, docxFingerprint@213, opt@231, read@238

- `qa/golden/asis-types.mjs` (62) — সমস্যা-ধরন বিশ্লেষণ (Word লাগে না): প্রতি ফাইলের সর্বশেষ layout-score.json থেকে ভুলের ধরন গুনে
  opt@8, long@30, short@31, add@39, len@46

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

- `qa/golden/format-check.mjs` (80) — হুবহু ফরম্যাট-চেক: স্কোর-রানের পরে প্রতিটি নমুনার তিনটি সমস্যা ধরে —
  arg@12, docXml@18, unmatched@36

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

- `qa/golden/serial-check.mjs` (38) — ক্রমিক-নম্বর নির্ণয় (সব ফাইল): capture-এর অনুচ্ছেদ-ব্লকে ক্রমিক লাইন ("১।", "২)", "(ক)", "1.") —

- `qa/golden/serial-docx.mjs` (38) — ক্রমিক-অনুচ্ছেদ docx-এ কীভাবে বসেছে (সব ফাইল): ইনডেন্ট/ঝুলন্ত/ট্যাব আছে কিনা — ক্রমিকের পরে লেখা এক রেখায় সাজছে কিনা।

- `qa/golden/table-diag.mjs` (40) — নির্ণয়: হুবহু-মোডের একটি নমুনার টেবিল-ব্লকে মাপার ইঞ্জিন কী দেখে (কলাম-ফাঁক, খাড়া/আড়া রেখা, ঘরের ফন্ট) — Word ছাড়া।
  blockMetrics@25, near@33

- `qa/golden/table-dump.mjs` (51) — নির্ণয়: একটি নমুনার টেবিল-ব্লকের Gemini-ব্লক + মাপ (blockMetrics) ফাইলে রাখা — তারপর node-এ সরাসরি FayzarLayoutIR.toItem চালিয়ে
  blockMetrics@39, near@41

- `qa/golden/table-rows.mjs` (78) — নির্ণয় (নতুন রান ছাড়া): ছকের প্রতিটি সারি — নকশার সারি-উচ্চতা (IR rowHeightsPt, মূলের রেখা থেকে) বনাম Word-এর আসল সারি-উচ্চতা
  read@13, tablesOf@15, walk@18

- `qa/golden/width-ratio.mjs` (35) — নির্ণয় (ফন্ট-প্রস্থ ক্যালিব্রেশন): মূল PDF বনাম আমাদের out.pdf — মেলানো লেখা-লাইনের প্রস্থ-অনুপাত (আমাদের ÷ মূল)।
  toMask@17

- `qa/golden/word-pdf-batch.ps1` (28) — এক Word চালু রেখে অনেক .docx → PDF (প্রতি ফাইলে Word চালু/বন্ধের ~২০ সেকেন্ড বাঁচে)। স্কোরের জন্য মাপ লাগে না;
  New-Word@9, foreach@12

- `qa/home-app-e2e.mjs` (244) — QA: নতুন সাইট — index.html (আপলোড → ওয়ার্কস্পেস → রূপান্তর → ডাউনলোড), services.html (টুলস), samples.html।
  url@18, sleep@22, waitDownload@23, startUnifiedOcr@51

- `qa/home-input-samples.mjs` (139) — হোম-পাতার INPUT নমুনা-ছবি (কৃত্রিম, প্রদর্শনের জন্য): হাতের লেখা, পুরোনো কাগজ, প্রশ্নপত্রের খসড়া, বাংলা-ইংরেজি মিশ্রিত।
  fontData@10, esc@120

- `qa/home-mcq-sample.mjs` (37) — QA/হোম-পাতা: চিত্রসহ গণিত MCQ নমুনা (qa/samples/16-mcq-math-figure.md) → একক রপ্তানি-পথে .doc / .docx
  enc@22

- `qa/image-tools-e2e.mjs` (108) — QA (পর্ব ১গ): ঘোরান / ২ পাতা ভাগ বোতাম — ইউআই ধাপ নিজেই চালিয়ে দেখে।
  sleep@14, check@17, openAndUpload@19, cards@27, click@28

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

- `qa/route-2b-compare.mjs` (51) — Phase 2B QA: অচেনা ধরনের ৩ নমুনা — আগে (ক্লিন-কম্পোজার) বনাম পরে (GENERAL_CLEAN রাউটিং), এঞ্জিনের আসল পথে। Gemini লাগে না।
  asMd@21, buf@29

- `qa/service-audit.mjs` (134) — QA: সব কনভার্টার-সার্ভিসের একসাথে যাচাই — প্রতিটি নমুনা লেখা → স্বয়ংক্রিয় ধরন-শনাক্তকরণ + নির্ধারিত ধরনে
  enc@45, esc@109

- `qa/shot-doc.mjs` (15) — .doc (Word-HTML) → PNG রেন্ডার-প্রমাণ

- `qa/side-by-side.mjs` (59) — QA: মূল PDF-এর পাতা ও আউটপুট (Word→PDF)-এর পাতা পাশাপাশি এক ছবিতে — চোখে মিলিয়ে দেখার জন্য।
  render@36

- `qa/site-chain-download.mjs` (72) — QA (Part-18.9): সাইটের আসল ডাউনলোড-শিকল — index.html-এ লেখা বসিয়ে ইঞ্জিনের downloadWordDocument

- `qa/site-shell-check.mjs` (57) — QA: নতুন থিম — প্রতিটি পাতা লোড (JS-ত্রুটি), অভিন্ন হেডার/ফুটার আছে কি না, পাশে-স্ক্রল, স্ক্রিনশট;
  url@12, onErr@19

- `qa/studio-master-compare.mjs` (54) — QA (WORK_PLAN F1): স্টুডিওর বিজয় .doc — পুরোনো পথ (RTF) বনাম একক মাস্টার-পথ (__FZ_ON_STUDIO_MASTER)

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

- `qa/usability-score.mjs` (29) — Usage: node qa/usability-score.mjs <docx> <expected.json> [ocr-text.md]

- `qa/word-measure-figures.ps1` (26) — QA: Word (COM) দিয়ে ফাইল খুলে প্রতিটি ছবির প্রকৃত মাপ (ইঞ্চি) ও অবস্থান মাপা।
  foreach@8

- `qa/word-to-pdf.ps1` (13) — QA: Word (COM) দিয়ে .docx/.doc → PDF (চোখে মেলানো ও মিল-মাপের জন্য)। চালানো: powershell -File qa/word-to-pdf.ps1 <in> <out.pdf>

## fayzar-ocr-proxy/

- `fayzar-ocr-proxy/index.js` (885) — Fayzar OCR Proxy — Cloudflare Worker (KeyLedger সংস্করণ)
  skipRestOfModel@40, originAllowed@52, getReqHeader@77, cors@93, json@116, isAuthorized@124, originAllows@143, dailyCapped@155, rateLimited@175, loadJson@190, saveKv@210, detectBodySizeWithoutParsing@222, extractRequestMeta@258, usEgressStub@278, fetch@286, withThoughts@508, saveLog@526, start@565

- `fayzar-ocr-proxy/ledger.js` (393) — Fayzar OCR Proxy — KeyLedger (pure logic, no I/O)
  maskKey@24, parseRetryDelay@33, nextMidnightPT@45, todayPT@68, classifyGeminiError@78, createEntry@158, ensureEntry@173, ensureModel@190, isAvailable@196, recordSuccess@207, recordFailure@222, scoreKey@251, rankKeys@268, migrateLedger@288, buildAttemptPlan@306, buildStatus@326

## tests/ (153)

`a01-regress.test.mjs` · `a02-rulefix.test.mjs` · `a02fix.test.mjs` · `a03-fix.test.mjs` · `a03fix3.test.mjs` · `a03fix4.test.mjs` · `a04-pages.test.mjs` · `a06fix.test.mjs` · `a07-fix.test.mjs` · `a07-fix2.test.mjs` · `a07-fix3.test.mjs` · `a07fix5.test.mjs` · `a07fix6.test.mjs` · `a08fix.test.mjs` · `a09fix.test.mjs` · `a10-fix.test.mjs` · `a10-lines.test.mjs` · `a11-fix.test.mjs` · `a12fix.test.mjs` · `a13fix.test.mjs` · `a14-fix.test.mjs` · `a14-fix3.test.mjs` · `a14-rules.test.mjs` · `a14fix4.test.mjs` · `a14fix5.test.mjs` · `a16-fix.test.mjs` · `a16-fix3.test.mjs` · `a16fix4.test.mjs` · `a16fix5.test.mjs` · `a16fix6.test.mjs` · `a17-fix.test.mjs` · `a17-p1loss.test.mjs` · `a18fix.test.mjs` · `a19-extralines.test.mjs` · `a19-fix.test.mjs` · `asis-score-util.test.mjs` · `audit-page.test.mjs` · `b5-line-fit.test.js` · `b6-gemini-blocks.test.js` · `boxsplit.test.mjs` · `classify-score.test.mjs` · `cls-pad-v5.test.mjs` · `cq-layout.test.mjs` · `cq-marks-integrity.test.mjs` · `cq-parse-coverage.test.mjs` · `docx-preview-render.test.mjs` · `engine-model-order.test.mjs` · `eq-code-italic.test.mjs` · `eq-hardening.test.mjs` · `equation-render.test.mjs` · `exam-renumber.test.mjs` · `f1-pagefit.test.mjs` · `f1fix.test.mjs` · `f1fix2.test.mjs` · `f2-wire.test.mjs` · `f3-faithful-studio.test.mjs` · `faithful-row-realign.test.js` · `fontfix.test.mjs` · `fontpick.test.mjs` · `fonttypefix.test.mjs` · `formkit.test.mjs` · `forms-faithful.test.mjs` · `g41-faithful-format.test.mjs` · `general-clean.test.js` · `golden-compare.test.mjs` · `image-tools.test.mjs` · `indent.test.mjs` · `indentfix.test.mjs` · `key-ledger.test.js` · `layout-registry.test.mjs` · `layout-score.test.mjs` · `line-rebreak.test.mjs` · `linegap.pending.mjs` · `linewidthfix.test.mjs` · `math-height.test.mjs` · `mcq-layout.test.mjs` · `missingfix.test.mjs` · `nestbox.test.mjs` · `ocr-chunk.test.mjs` · `otsu-threshold.test.mjs` · `p2-drift.test.mjs` · `page-marker-strip.test.mjs` · `page-range.test.mjs` · `part-14.2-regression.test.js` · `part-14.3-mixed-sections-and-header.test.js` · `part-15.0-layout-profile-fixes.test.js` · `part-15.1-eq-field-bijoy.test.js` · `part-15.2-ocr-doc-path.test.js` · `part-15.3-degree-and-indent.test.js` · `part-16.0-export-and-mhtml.test.js` · `part-16.1-figure-extractor.test.js` · `part-16.2-figure-handoff.test.js` · `part-17.0-bijoy-mixed-run.test.js` · `part-17.2-faithful-capture.test.js` · `part-17.3-doc-converter.test.mjs` · `part-17.5-faithful-layout.test.js` · `part-18.6-layout-facts.test.js` · `part-18.9-application-layout.test.mjs` · `part-18.9-one-column.test.mjs` · `part-18.9-primary-and-parity.test.mjs` · `part-19.0-letter-layout.test.mjs` · `part-19.1-cv-layout.test.mjs` · `part-19.2-certificate-layout.test.mjs` · `part-19.3-real-ocr-fixes.test.mjs` · `part-19.4-cash-memo.test.mjs` · `part-19.4-kalpurush-exam.test.mjs` · `part12-hardening.test.mjs` · `part13-3-layout-fixes.test.mjs` · `part13-4-fixes.test.mjs` · `part14-0-studio-figure.test.mjs` · `part14-1-fixes.test.mjs` · `pgborder.test.mjs` · `phase1b-fixes.test.mjs` · `phase1b3-pad-header.test.mjs` · `proxy-failure-policy.test.js` · `proxy-stream.test.mjs` · `proxy-worker.test.mjs` · `registry-e2-cashmemo.test.mjs` · `registry-e3.test.mjs` · `registry-exam.test.mjs` · `result-relayout-e2e.test.mjs` · `result-relayout.test.mjs` · `reviewer-fixes.test.js` · `role-marks.test.mjs` · `rottext.test.mjs` · `row-check.test.mjs` · `rules2.test.mjs` · `rulesfix.test.mjs` · `run-all.mjs` · `run-regression.js` · `self-check.test.js` · `serial-hang-v2.pending.mjs` · `serial-hang.test.mjs` · `serialfix.test.mjs` · `shortfix.test.mjs` · `source-fidelity.test.mjs` · `studio-edit-bridge.test.mjs` · `studio-edit-e2e.test.mjs` · `studio-layout-parity.test.mjs` · `t1-clean-composer.test.js` · `t2-template-composer.test.mjs` · `t3a-template-store.test.mjs` · `t3b-sample-template.test.mjs` · `t3c-sample-map.test.mjs` · `tablecol.test.mjs` · `tablegrid.test.mjs` · `tblmerge.test.mjs` · `vgapfix.test.mjs` · `vspace.test.mjs` · `width.test.mjs` · `word2003-doc-artifact.test.mjs` · `word2003-font-metric.test.mjs` · `wrapfit.test.mjs`

## HTML পাতা (মূল ফোল্ডার)
- `converter.html` — ফয়জার এআই কম্পোজ · 0 স্ক্রিপ্ট
- `doc-converter.html` — ওয়ার্ড ডকুমেন্ট ইউনিকোড ➔ বিজয় কনভার্টার | ফয়জার এআই কম্পোজ · 15 স্ক্রিপ্ট
- `docx-to-doc.html` — DOCX থেকে DOC (Word 2003) কনভার্টার | ফয়জার এআই কম্পোজ · 6 স্ক্রিপ্ট
- `index.html` — ফয়জার এআই কম্পোজ — ছবি ও PDF থেকে Editable Word · 86 স্ক্রিপ্ট
- `layout-studio.html` — লেআউট স্টুডিও — MD থেকে Word | ফয়জার এআই কম্পোজ · 12 স্ক্রিপ্ট
- `ocr-classic.html` — পুরোনো OCR পাতা (রক্ষণাবেক্ষণ) | ফয়জার এআই কম্পোজ · 77 স্ক্রিপ্ট
- `samples.html` — নমুনা ও কীভাবে কাজ করে | ফয়জার এআই কম্পোজ · 1 স্ক্রিপ্ট
- `services.html` — সার্ভিস ও টুলস | ফয়জার এআই কম্পোজ · 73 স্ক্রিপ্ট
- `studio.html` — ওয়ার্ড স্টুডিও | ফয়জার এআই কম্পোজ · 48 স্ক্রিপ্ট
