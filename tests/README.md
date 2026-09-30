# Layout Regression Suite (Phase 2 — Step 0)

উদ্দেশ্য: EXAM_CQ-এর কাজ শুরু করার আগে **সব layout-এর বর্তমান আউটপুট ফ্রিজ** করা, যাতে
পরবর্তী যেকোনো পরিবর্তনে "অন্য layout-এ regression হয়নি" — তা প্রমাণ করা যায়।

## চালানোর নিয়ম

```bash
npm run test:layout            # baseline-এর সাথে তুলনা (CI/verify)
npm run test:layout:update     # baseline নতুন করে লেখা (ইচ্ছাকৃত পরিবর্তনের পর)
node tests/run-regression.js --only=cq   # শুধু নির্দিষ্ট fixture
```

ব্যর্থ হলে প্রথম diff-লাইন কনসোলে দেখানো হয় এবং পূর্ণ আউটপুট
`tests/baseline/<fixture>.actual.txt`-এ লেখা হয় (এটি git-ignored)।

## কী কী স্ন্যাপশট নেওয়া হয়

প্রতিটি fixture-এর জন্য `tests/baseline/<id>.snap.txt`-এ ৬টি সেকশন:

| সেকশন | উৎস | কী ধরে |
|---|---|---|
| `CLASSIFIER` | `DocClassifier.classify()` | doc-type drift |
| `PARSED` | `FayzarPipeline._parseByDocType()` | সম্পূর্ণ AST |
| `STRUCTURE` | harness summary | **প্রশ্ন numbering, সাব-লেবেল, marks** (`∅` = মার্ক নেই) |
| `HTML` | `QuestionEngine.renderToHtml()` (pipeline হয়ে) | preview layout |
| `DOCX_XML` | `generateCqExamDocx/generateMcqExamDocx` (`returnInnerXml`) | `w:ind`, `w:tabs`, `w:sectPr`, columns, orientation |
| `RTF` | `ExportDualEngine.generateLegacyDoc()` | `.doc` পাথ |

DOCX zip প্যাকেজিং ইচ্ছাকৃতভাবে বাদ — `jszip` ছাড়াই inner XML তুলনা করা হয়,
ফলে suite অফলাইনে ও dependency ছাড়াই চলে। কোনো frozen core engine এখানে
লোড বা পরিবর্তন করা হয় না।

## Fixtures

| fixture | docType | কেন |
|---|---|---|
| `cq-short` | EXAM_CQ | `১. ক.` inline numbering (বেসিক) |
| `cq-long` | EXAM_CQ | বড় CQ পেপার |
| `cq-marks-edge` | EXAM_CQ | `১। ক. … ১০`, `[১]`, `(৩)`, মার্কবিহীন প্রশ্ন |
| `cq-inline-numbering` | EXAM_CQ | `১. ক.` + LaTeX/রসায়ন |
| `mcq-mixed-options` | EXAM_MCQ | regression guard |
| `math-equations` | EXAM_MATH | regression guard |
| `combined` | EXAM_COMBINED | regression guard (CQ+MCQ দুই অংশ) |

## বর্তমান baseline = "before" অবস্থা (বাগসহ ফ্রিজ করা)

baseline ফাইলগুলো **সঠিক আচরণ নয়**, বরং ৩০/০৯/২০২৬-এর বাস্তব আউটপুট।
নিচের জ্ঞাত ত্রুটিগুলো baseline-এ দৃশ্যমান, এবং Step 1-এ ঠিক করার পর
শুধুমাত্র `cq-*` স্ন্যাপশট বদলাবে — MCQ/MATH/COMBINED অপরিবর্তিত থাকবে:

1. `১। ক.` / `১. ক.` ফরম্যাটে প্রতিটি সাব-প্রশ্ন আলাদা top-level প্রশ্ন হয়ে যায়
   (`numbering: ১,১,১,১,২,২,২,২`, `subQuestions: []`) — মূল numbering ভাঙে।
2. একাধিক অঙ্কের মার্ক (`১০`) শনাক্ত হয় না; প্রশ্নের টেক্সটে রয়ে যায়।
3. `[১]` / `(৩)` ব্র্যাকেটেড মার্ক parser ধরে না।
4. মার্ক না থাকলে `question-engine.js` নিজে `ক→১, খ→২, গ→৩, ঘ→৪` বানিয়ে দেয় (অনুমান)।
5. EXAM_CQ-এ hanging indent `234 dxa` (স্পেক অনুযায়ী মূল প্রশ্ন `432`, সাব-প্রশ্ন `864`)।
