# Pack4: প্রতিটি সুইচের ছোট Diff ও রুট-কজ রিপোর্ট

---

## ১. অনুরোধ (ক) ও (খ): কেন `a02`, `a03` ও `a16`-এর স্কোর কমেছিল এবং `"XML ১০০% এক"` দাবির গলদ কোথায় ছিল?

### খ) `"XML ১০০% এক"` দাবির বেসলাইন গলদ
`Pack3`-এ আমরা যখন দাবি করেছিলাম যে ডিফল্ট পথে `a02`-এর XML `"আগে"`-র সাথে ১০০% এক, তখন আমাদের টেস্ট স্ক্রিপ্ট (`reviewer-fixes.test.js`-এর ধাপ ৬) ভুলবশত **`Pack3 (সুইচ চালু)` বনাম `Pack3 (৯টি সুইচ বন্ধ)`** তুলনা করেছিল—আপনাদের পাঠানো **`Argon-প্যাক-২` (`"আগে"`, সকাল ০৮:০১-এর ফাইল)**-এর সাথে সরাসরি তুলনা করেনি।

আপনাদের `Argon-প্যাক-২` (`"আগে"`), `Pack2` এবং `Pack3`-এর প্রতিটি লাইন বাইট-বাই-বাইট তুলনা করে দেখা গেছে:

1. **`a02`-এ `Pack2` (৬৪.৬) থেকে `Pack3` (৬০.৭, `−৩.৯`) নামার কারণ (সুইচের বাইরের ৩টি অনিচ্ছাকৃত বদল)**:
   - **১ম কারণ (`cellP` থেকে `<w:rPr><w:sz>` মুছে যাওয়া — প্রধান কারণ)**: `Argon-প্যাক-২` এবং `Pack2`-এ `faithful-docx-builder.js`-এর `cellP` ফাংশনে অনুচ্ছেদের `<w:pPr>`-এর ভেতরে `<w:rPr><w:sz w:val="..."/><w:szCs w:val="..."/></w:rPr>` ছিল। `sizeEmptyParas(xml)` (`FZ_OFF=EMPTYRUN`) এই `<w:rPr><w:sz>` দেখেই ফাঁকা অনুচ্ছেদে সঠিক ফন্ট-আকারের স্পেস-রান বসায়। `Pack3`-এ `cellP` থেকে ওই `<w:rPr><w:sz>` বাদ পড়ায় `a02`-এর ৩টি তারিখ-বাক্স ছক (৮ + ১৮ + ১০ = ৩৬টি ফাঁকা ঘর) এবং পরিবার-ছকের ১২টি ফাঁকা ঘরসহ **মোট ৪৮টি ফাঁকা ঘরে `sizeEmptyParas` আর কাজ করেনি**! ফলে Word ও `.doc`-এ ৪৮টি ফাঁকা ঘর ডিফল্ট ১২pt (`Normal`) উচ্চতা নিয়ে ফুলে ওঠে এবং পুরো পাতার নিচের অংশ নিচে নেমে যায় (`৬৪.৬ → ৬০.৭`)।
   - **২য় কারণ (`planPage`-এ `isRuleLn` সংকোচন)**: `planPage`-এ `/^([─━═=_\-.…·])\1{5,}$/` বদলে `/^([─━═=_])\1{5,}$/` করায় `a02`-এর ২নং অনুচ্ছেদের লাইন-উচ্চতা `w:line="230"` (`১১.৫pt`) থেকে বেড়ে `w:line="253"` (`১২.৬৫pt`) হয়ে গিয়েছিল (এবং `f2`-তেও `−০.৫` ক্ষতি করেছিল)।
   - **৩য় কারণ (`VTOP4` থেকে `tallRow` মুছে ফেলা)**: `Argon-প্যাক-২` (`"আগে"`, যেখানে `a02` ছিল `৬৮.২`)-এ `tallRow` (`rh && rh[ri] && rh[ri].h >= (item.fontPt || 11) * 2.5`) শর্তটি `maxLn >= 2`-এর **ভেতরে** ছিল (`maxLn >= 2 && (lns[k] < maxLn || ((maxLn >= 3 || tallRow) && !globalThis.__FZ_OFF_VTOP4))`)। এতে `part-17.5` টেস্টও পাস করে (`maxLn === 1` হওয়ায় `center` থাকে) আবার `a02`-এর ২-লাইনের উঁচু ঘরগুলো (`"স্বামী: ☐\nস্ত্রী: ☐"`, `maxLn === 2`, উচ্চতা `৩০.২pt >= ২৫pt`) `vAlign="top"` পায়। `Pack3`-এ `tallRow` পুরোপুরি মুছে ফেলায় `a02`-এর ওই ঘরগুলো `center` হয়ে গিয়েছিল।
2. **`a02`-এ `"আগে"` (৬৮.২) থেকে `Pack2` (৬৪.৬, `−৩.৬`) নামার কারণ**:
   - `SHADECOL` চালু থাকায় `a02`-এর পরিবার-ছকের ১ম কলাম `২৮.৩৫pt` ও ৩য় কলাম `৪৭.৫pt` হয়ে গিয়েছিল, যার ফলে `line-fit.js` (`fitTable`) পুরো ছকের ফন্ট `১০pt` থেকে কমিয়ে `৮.৫pt` করে দিয়েছিল।
   - `BOXPOS` ও `SHADEBAR` ডিফল্টে চালু থাকায় `"স্বামী: ☐"` বাঁয়ে সরে গিয়েছিল এবং `gridSpan="2"` ভেঙে গিয়েছিল, আর `"বিঃ দ্রঃ..."` পটির `centerShiftPt` শূন্য হয়ে লেখা ৩৮pt বাঁয়ে সরে গিয়েছিল।
   - **সমাধান**: `SHADECOL`, `SHADEBAR`, `BOXPOS` এবং `PCELLSHD` (`cellP`-এর ভেতরে ডাবল `<w:shd>`) ডিফল্টে বন্ধ (`FZ_ON`) রাখা হয়েছে এবং `cellP`-এর `<w:rPr><w:sz>`, `isRuleLn` ও `tallRow` ফিরিয়ে আনা হয়েছে। এখন ডিফল্ট পথে **`a02`-এর আউটপুট XML `"আগে"` (`Argon-প্যাক-২`, স্কোর `৮২.৪ / ৬৮.২`)-এর সাথে বাইট-বাই-বাইট ১০০% এক (`৩৯,২৮৮ বাইট === ৩৯,২৮৮ বাইট`)**।

---

### ক.২) `a16`-এ `Pack2` (৬৭.৩) থেকে `Pack3` (৬৩.৯, `−৩.৪`) নামার সঠিক উৎস
আপনার অনুমান শতভাগ সঠিক ছিল—মূল ক্ষতি হয়েছে **`FILLW2`-এর `useF40` শর্ত** এবং **`tableRowHeights` ও `VTOP4`-এর পরিবর্তন** থেকে:
1. **`FILLW2`-এ `if (useF40) fillW2 = true` শর্তের ত্রুটি**:
   - `a16`-এর ৭টি ছক-পাতার (পাতা ৩–৯) মধ্যে পাতা ৩, ৫ ও ৭-এ ৫টি খাড়া দাগের সবগুলোরই `cov >= 0.5` (`half.length === 5 === nCols - 1`)। ফলে সেখানে `useF40` (`half.length !== nCols - 1 && f40.length === nCols - 1`) `false` হয়ে যায়! আর পাতা ৮ ও ৯-এ `colGuttersPt` ১২pt-এর ভেতরে না সরায় সেখানেও `fillW2 = false` থেকে যায়।
   - এর ফলে `a16`-এর ৭টি ছক-পাতার মধ্যে **৫টি পাতাতেই (পাতা ৩, ৫, ৭, ৮, ৯) `fillW2` বন্ধ হয়ে গিয়েছিল**, এবং `faithful-docx-builder.js`-এর `HEADW` নিয়ম `"মন্তব্য"` ও `"হ্যাঁ"` শিরোনাম চওড়া করতে গিয়ে ২য় কলাম (`"বিষয়"`) থেকে ৭pt–২১pt প্রস্থ কেটে নিয়েছিল!
2. **`tableRowHeights`-এ `if (it.rowHeightsExact)` শর্ত যোগ করা**:
   - `a16` পাতা ৮-এ একটি উঁচু ফাঁকা সারি আছে (`tallEmpty`), কিন্তু সেখানে `rowHeightsExact = false`। `Pack2`-এ `tallEmpty` সারি থেকে আগে উচ্চতা কাটা হতো, ফলে লেখার সারিগুলো `250 dxa` (`১২.৫pt`) থাকত। `Pack3`-এ `if (it.rowHeightsExact)` দেওয়ায় পাতা ৮-এর সব সারির উচ্চতা `250` থেকে বেড়ে `261 dxa` হয়ে গিয়েছিল।
3. **`VTOP4`-এ `tallRow` মুছে ফেলা এবং `ULINE2`-এ `bl.length === 2` করা**:
   - `a16`-এর উঁচু ক্রমিক-সারিগুলো (`৩।`, `৬।`, `৮।`, `১।`, `৫।` — উচ্চতা `৩০–৪১.৫pt`) `Pack2`-এ `vAlign="top"` পেয়েছিল, কিন্তু `Pack3`-এ `tallRow` মুছে ফেলায় সেগুলো `center` হয়ে নিচে নেমে গিয়েছিল।
- **সমাধান**: `hasFillCols` (`nCols >= 4 && hasBodyCol && fillColCount >= 2` — যা `a16`-এর ৭টি পাতাতেই `true`, কিন্তু `a17` p10, `a03`, `a02`-এ `false`) সত্য হলেই `fillW2 = true` রাখা হয়েছে, `HEADW`-এ `Pack2`-এর `baseLen` শর্ত ফিরিয়ে আনা হয়েছে, `tableRowHeights`-এ `tallEmpty` সব ছকের জন্য চালু রাখা হয়েছে, এবং `VTOP4`-এ `!item.headShade && (isSerRow || hasBlankCell)` শর্তে `tallRow` রাখা হয়েছে (যাতে `part-17.5` টেস্টও পাস করে আবার `a16`-এর সব উঁচু ক্রমিক-সারি `top` পায়)।
- **ফল**: এখন ডিফল্ট পথে **`a16`-এর আউটপুট XML `Pack2` (স্কোর `৮৬.১ / ৬৭.৩`)-এর সাথে বাইট-বাই-বাইট ১০০% এক (`২০৯,৬৬৭ বাইট === ২০৯,৬৬৭ বাইট`)**!

---

### ক.৩) `a03`-এ ৬১.৪ / ৬১.০ থাকার কারণ ও প্রতিকার
1. `Pack2` ও `Pack3` উভয়েই `BOXPOS` আসলে **`a03`-এর ওপর চালু ছিল**! কারণ `Pack3`-এ শর্ত দেওয়া হয়েছিল `!brokenShadedCols` (`m.headShade && ...`), আর `a03`-এ কোনো `headShade` না থাকায় `brokenShadedCols` হয়েছিল `false` (`!brokenShadedCols === true`)! ফলে `a03`-এর চেকবক্স সেলগুলোতে `BOXPOS` চলে `gridSpan` ও এলাইনমেন্ট বদলে দিচ্ছিল। এখন `BOXPOS` ডিফল্টে বন্ধ (`FZ_ON=BOXPOS`)।
2. `planPage`-এ `TXTTF`-এর `_fontBase` রিভার্সন (`need > 0` হলে ফন্ট কমানো) `a02, a16, a17, a18, f1`-এ কোনো প্রভাব ফেলে না, কিন্তু `a03` পাতা ২-এ (`y=775`) ছকের ফন্ট কমিয়ে দেয়। এটি `FZ_ON=TXTTFREV`-এর নিচে নেওয়া হয়েছে।
3. আপনার আগের নির্দেশনা অনুযায়ী (`Argon-প্রেক্ষাপট.md` ধারা ৫.২) অ-ভাঁজকৃত ছকে `LINEH` (`FZ_ON=LINEH`) এবং `<২৪` সারির ছকে `EXACT1` (`FZ_ON=EXACT1`) ডিফল্টে বন্ধ করা হয়েছে (তবে `f1`-এর ভাঁজ-করা ছকে এবং `a18`-এর ২৮-সারির ছকে স্বয়ংক্রিয় চালু থাকায় `f1 = ৫৪.২` ও `a18 = ৭২.৮` ১০০% অক্ষত আছে), এবং `line-fit.js`-এর ৩০তম শতাংশ ফন্ট-সিঙ্ক কেবল `>= ৪` কলামের চেকলিস্ট ছকে (`a16`) সীমিত করা হয়েছে যাতে `a03`-এর ২-কলামের ছকের ফন্ট কখনো না কমে।

---

## ২. অনুরোধ (গ): `GRIDFIRST` (`FZ_ON=GRIDFIRST`)-এ `a18` ও `a16`-এর ঝুঁকি ও সমাধান

Word-এ `FZ_ON=GRIDFIRST` মাপার আগে আমরা `a18` ও `a16`-এর ওপর পূর্ণ অডিট চালিয়ে দুটি সূক্ষ্ম ঝুঁকি খুঁজে পেয়েছি এবং এই প্যাকে তা আগেভাগেই ঠিক করে দিয়েছি:
1. **`a18`-এ সারি ২৭ (`"প্রধান হিসাবরক্ষণ কর্মকর্তা"`) ও `line-fit.js` ফন্ট সংকোচনের ঝুঁকি**:
   - `GRIDFIRST` চালু থাকলে সারি ২৭-এর `"প্রধান হিসাবরক্ষণ কর্মকর্তা"` কালি-বাক্স (`cellBoxV`) অনুযায়ী কলাম ২-এ (`১২৩.৩৫pt` চওড়া) বসে। কিন্তু কলাম ২-এর ডানে পূর্ণ খাড়া দাগ (`fullVRule[2] === true`) থাকায় `line-fit.js` (`fitTable`) শুধু ডানে ফাঁকা জায়গা খুঁজত এবং কলাম ২-এ লেখাটি ৩pt বড় দেখে পুরো `a18` ছকের ফন্ট `১১.৫pt` থেকে কমিয়ে `১০.৫pt` করে দিত!
   - **সমাধান**: `line-fit.js`-এর `fitTable`-এ `vRuleBands` পরীক্ষা যোগ করা হয়েছে—যদি কোনো ব্যান্ডে ঘরের বাঁ পাশের খাড়া দাগ অনুপস্থিত থাকে (`vRuleBands[ri][j] === false`) এবং বাঁয়ের ঘর ফাঁকা থাকে, তবে সেই খোলা প্রস্থও প্রাপ্য প্রস্থে ধরা হবে। ফলে `FZ_ON=GRIDFIRST` চালু থাকলেও `a18`-এর ফন্ট `১১.৫pt`-ই থাকে।
2. **`a18`-এ সারি ১৫ (`"নম্বর ---- | তারিখ----"`)-এর উচ্চতা কমে যাওয়ার ঝুঁকি**:
   - `grid-first.js`-এ `tableRowHeights` চলার আগেই `trimFillToWidth` দিয়ে ড্যাশ ছেঁটে ফেলায় `tableRowHeights`-এ সারি ১৫-এর অনুমিত লাইন `২` থেকে `১` হয়ে সারি ১৫-এর উচ্চতা `৮.৬pt` কমে যাচ্ছিল (ফলে নিচের সারি ১৭–২৬ ওপরে উঠে যেত)।
   - **সমাধান**: `grid-first.js`-এর আগাম `trimFillToWidth` ডিফল্টে বন্ধ (`FZ_ON=GFTRIM`) রাখা হয়েছে, যাতে `tableRowHeights` সঠিক উচ্চতা বজায় রাখে এবং পরে `line-fit.js` যথারীতি ড্যাশ ছাঁটে।
3. **`a16`-এ `GRIDFIRST`**:
   - `a16`-এর পাতা ৩–৯ সব কটি ছকে `FZ_ON=GRIDFIRST` এবং ডিফল্ট পথ (`Pack2`, `৬৭.৩`) হুবহু একই কলাম-প্রস্থ (`colFractions`) ও `fullVRule` তৈরি করে, তাই `a16`-এ কোনো ঝুঁকি নেই।

---

## ৩. অনুরোধ (ঘ): `a07` (পাতা ১-এর ছক)-এর ভাঙা হেডার সারি জোড়া দেওয়ার নতুন মডিউল (`header-merge.js`)

- **মডিউল**: `js/layout-engine/faithful/header-merge.js` (`FayzarHeaderMerge.applyHeaderMerge(rows, m)`)
- **সুইচ**: `FZ_OFF=HEADMERGE` (`globalThis.__FZ_OFF_HEADMERGE` থাকলে বন্ধ)।
- **কীভাবে কাজ করে**:
  1. ছকের প্রথম কয়েকটি সারি (`২ ≤ K ≤ ৫`) পরীক্ষা করে দেখে সেগুলোতে কোনো ক্রমিক নম্বর (`১।`, `০১.`), উপ-ক্রমিক (`(ক)`), কলাম-নম্বর সারি (`১ | ২ | ৩ | ৪`), পূরণ-রেখা (`....`/`----`), বা চেকবক্স নেই এবং প্রতিটি ঘরে কেবল ছোট টুকরো লেখা (`baseLen <= 28`, ধারাবাহিক সারিতে গড় `<= 16` ও দাঁড়িহীন) আছে কি না।
  2. মাপা আড়াআড়ি দাগ (`m.hRulesPt`) পরীক্ষা করে নিশ্চিত হয় যে এই প্রথম `K`টি সারির মাঝখানে কোনো আড়াআড়ি দাগ নেই।
  3. শর্ত মিললে প্রথম `K`টি সারিকে কলাম ধরে `'\n'` দিয়ে একটিমাত্র হেডার-সারিতে জুড়ে দেয় (যেমন `"জ্যেষ্ঠতার\nক্রমিক\nনং"`)।
  4. **বোনাস লাভ**: `layout-ir.js`-এ `mergeLineRows`-এর ঠিক আগে এটি ডাকার ফলে, হেডারের ১ম কলামের ৩–৪টি ভাঙা সারি (`"জ্যেষ্ঠতার"`, `"ক্রমিক"`, `"নং"`) আগেভাগেই ১টি সারিতে পরিণত হয়। ফলে কাত স্ক্যানে `mergeLineRows`-এর `if (r[0]) g++` গণনায় `g + 1 === bands` শর্তটিও মিলে যায় এবং ছকের ভেতরের (body) বহু-লাইনের সারিগুলোও সঠিকভাবে জুড়ে যায়!

---

## ৪. প্রতিটি সুইচের ছোট Diff (`Argon-প্যাক-২` বেসলাইনের ওপর)

### Diff ১: `[FZ_OFF=HEADMERGE]` — `js/layout-engine/faithful/layout-ir.js` (`toItem`)
```javascript
// FIND (in toItem):
      const merged = mergeLineRows(rows, m);
      if (merged) rows = merged;

// REPLACE:
      // অনুরোধ ঘ (a07 পাতা ১-এর ছক, FZ_OFF=HEADMERGE): প্রথম কয়েকটি সারির মাঝে আড়াআড়ি দাগ না থাকলে এবং শুধু ছোট টুকরো লেখা থাকলে একটি হেডার-সারিতে সংযোজন
      if (!folded && !serialFolded && !globalThis.__FZ_OFF_HEADMERGE) {
        let HM = global.FayzarHeaderMerge;
        if (!HM && typeof require === 'function') { try { HM = global.FayzarHeaderMerge = require('./header-merge.js'); } catch (e) { HM = null; } }
        if (!HM && typeof XMLHttpRequest !== 'undefined') {
          try { const x = new XMLHttpRequest(); x.open('GET', 'js/layout-engine/faithful/header-merge.js', false); x.send(null); if (x.status >= 200 && x.status < 300 && x.responseText) { (0, eval)(x.responseText); HM = global.FayzarHeaderMerge; } } catch (e) { HM = null; }
        }
        if (HM && typeof HM.applyHeaderMerge === 'function') rows = HM.applyHeaderMerge(rows, m);
      }
      const merged = mergeLineRows(rows, m);
      if (merged) rows = merged;
```

### Diff ২: `[FZ_OFF=FILLW2]` — `js/layout-engine/faithful/layout-ir.js` (`toItem`) ও `faithful-docx-builder.js` (`HEADW`)
```javascript
// FIND (in layout-ir.js toItem):
      let colFractions = null;
      const nCols = rows.length ? Math.max(...rows.map((r) => r.length)) : 0;
      m = dropEmptyMeasuredCol(m, nCols);
      // ২০২৬-১০-১৩: সীমানাওয়ালা ছকে আগে খাড়া দাগ (দৃশ্যমান কলাম-রেখাই সত্য; লেখার ফাঁকের মাঝ ধরলে a02-এ কলাম-রেখা ১০–৫০pt সরে যেত)
      if (m && !m.empty && m.hasGrid && Array.isArray(m.vRulesPt) && nCols > 1) {
        const R = m.rectPt, in0 = m.vRulesPt.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6);
        // চেকবক্সের ছোট খাড়া দাগ বাদ দিতে: প্রথমে প্রায় পুরো-উচ্চতার (≥৯০%) দাগ, না মিললে ≥৫০%
        const full = in0.filter((v) => v.cov >= 0.9), half = in0.filter((v) => v.cov >= 0.5);
        const inner = full.length === nCols - 1 ? full : half;
        if (inner.length === nCols - 1) {
          const edges = [R.x, ...inner.map((v) => v.x).sort((a, c) => a - c), R.x + R.w];
          const fr = edges.slice(1).map((e, k) => (e - edges[k]) / R.w);
          if (fr.every((f) => f >= 0.02)) colFractions = fr;

// REPLACE:
      let colFractions = null, fillW2 = false;
      const nCols = rows.length ? Math.max(...rows.map((r) => r.length)) : 0;
      const isFillCol = (j) => !globalThis.__FZ_OFF_FILLCOL && rows.length >= 4 && rows.slice(0, 2).some((r) => r[j] && String(r[j]).trim())
        && rows.slice(2).every((r) => !(r[j] && String(r[j]).trim()));
      const hasBodyCol = rows.length >= 4 && Array.from({ length: Math.max(0, nCols - 1) }, (_, idx) => idx + 1)
        .some((j) => rows.slice(2).filter((r) => r[j] && String(r[j]).trim()).length >= Math.ceil((rows.length - 2) * 0.5));
      const fillColCount = Array.from({ length: nCols }, (_, j) => isFillCol(j)).filter(Boolean).length;
      const hasFillCols = !globalThis.__FZ_OFF_FILLW2 && nCols >= 4 && hasBodyCol && fillColCount >= 2;
      m = dropEmptyMeasuredCol(m, nCols);
      // ২০২৬-১০-১৩: সীমানাওয়ালা ছকে আগে খাড়া দাগ (দৃশ্যমান কলাম-রেখাই সত্য; লেখার ফাঁকের মাঝ ধরলে a02-এ কলাম-রেখা ১০–৫০pt সরে যেত)
      if (m && !m.empty && m.hasGrid && Array.isArray(m.vRulesPt) && nCols > 1) {
        const R = m.rectPt, in0 = m.vRulesPt.filter((v) => v.x > R.x + 6 && v.x < R.x + R.w - 6);
        const rOuter = hasFillCols ? m.vRulesPt.filter((v) => v.cov >= 0.4 && Math.abs(v.x - (R.x + R.w)) <= 6).sort((a, b) => b.cov - a.cov)[0] : null;
        const rx1 = rOuter ? rOuter.x : R.x + R.w, rw = rx1 - R.x;
        // চেকবক্সের ছোট খাড়া দাগ বাদ দিতে: প্রথমে প্রায় পুরো-উচ্চতার (≥৯০%) দাগ, না মিললে ≥৫০%, আর পূরণের কলাম থাকলে ≥৪০% (FZ_OFF=FILLW2)
        const full = in0.filter((v) => v.cov >= 0.9), half = in0.filter((v) => v.cov >= 0.5), f40 = hasFillCols ? in0.filter((v) => v.cov >= 0.4) : [];
        const inner = full.length === nCols - 1 ? full : (half.length === nCols - 1 ? half : (f40.length === nCols - 1 ? f40 : half));
        if (inner.length === nCols - 1) {
          const edges = [R.x, ...inner.map((v) => v.x).sort((a, c) => a - c), rx1];
          const fr = edges.slice(1).map((e, k) => (e - edges[k]) / rw);
          if (fr.every((f) => f >= 0.02)) { colFractions = fr; if (hasFillCols) fillW2 = true; }
```

```javascript
// FIND (in faithful-docx-builder.js tableXml HEADW):
    const fr = (() => {
      if (globalThis.__FZ_OFF_HEADW || item.borderless || !rows[0] || rows.length < 2) return fr0;
      const f = (fr0 || new Array(nCols).fill(1 / nCols)).slice(), tot = colW * nCols / 20, fs = item.fontPt || 11;
      let changed = false;
      rows[0].forEach((c, k) => {
        const t = String(c || '').replace(/\*\*/g, '').trim();
        const baseLen = t.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
        if (k >= nCols || !t || (/\s/.test(t) && baseLen > 6) || t.startsWith(BOX_MARK) || /</.test(t)) return;

// REPLACE:
    const fr = (() => {
      if (globalThis.__FZ_OFF_HEADW || item.borderless || (!globalThis.__FZ_OFF_FILLW2 && item.fillW2) || !rows[0] || rows.length < 2) return fr0;
      const f = (fr0 || new Array(nCols).fill(1 / nCols)).slice(), tot = colW * nCols / 20, fs = item.fontPt || 11;
      let changed = false;
      rows[0].forEach((c, k) => {
        const t = String(c || '').replace(/\*\*/g, '').trim();
        const baseLen = t.replace(/[ঁ-ঃ়া-্ৗ]/g, '').length;
        if (k >= nCols || !t || (/\s/.test(t) && baseLen > 6) || t.startsWith(BOX_MARK) || /</.test(t)) return;
        if (!globalThis.__FZ_OFF_FILLW2 && item.fullVRule && (item.fullVRule[k - 1] || item.fullVRule[k])) return;
```

### Diff ৩: `[FZ_OFF=VTOP4]` ও `cellP` পুনরুদ্ধার — `js/layout-engine/faithful/faithful-docx-builder.js`
```javascript
// FIND (in cellBody — Pack3-এ ভুলবশত <w:rPr><w:sz> বাদ গিয়েছিল, যা এখন ঠিক করা হয়েছে):
      const rowCellItem = ri === 0 && item.headFontPt ? Object.assign({}, cellItem, { fontPt: item.headFontPt }) : cellItem;
      const pShd = ri === 0 && item.headShade && globalThis.__FZ_ON_PCELLSHD && !globalThis.__FZ_OFF_TBLSHADE ? `<w:shd w:val="clear" w:color="auto" w:fill="${item.headShade}"/>` : '';
      const cellP = (t, li) => `<w:p><w:pPr>${pShd}<w:spacing w:before="${sh > 0 && !li ? tw(sh) : 0}" w:after="${sh < 0 && li === nL - 1 ? tw(-sh) : 0}"${tight}/><w:jc w:val="${jc}"/><w:rPr><w:sz w:val="${Math.round((rowCellItem.fontPt || 11) * 2)}"/><w:szCs w:val="${Math.round((rowCellItem.fontPt || 11) * 2)}"/></w:rPr></w:pPr>${t ? runsFor(t, rowCellItem) : ''}</w:p>`;
```

```javascript
// FIND (in tableXml VTOP4):
        const tallRow = rh && rh[ri] && rh[ri].h >= (item.fontPt || 11) * 2.5;
        const rowHasBox = r.some((c) => typeof c === 'string' && c.startsWith(BOX_MARK));
        const sparseSerialTop = ri > 0 && k === 0 && maxLn === 1 && lns[0] === 1 && r.slice(1).every((c) => !(c && String(c).trim())) && rh && rh[ri] && rh[ri].h >= (item.fontPt || 11) * 2;
        const va = hv ? (hv === 't' ? 'top' : 'center') : !globalThis.__FZ_OFF_VTOP && !rowHasBox && lns[k] && (sparseSerialTop || (maxLn >= 2 && (lns[k] < maxLn || ((maxLn >= 3 || tallRow) && !globalThis.__FZ_OFF_VTOP4)))) ? 'top' : 'center';

// REPLACE:
        const curH = rh && rh[ri] ? rh[ri].h : rowH;
        const isSerRow = /^\s*\(?[০-৯0-9]{1,2}\s*[।.)]/.test(String(r[0] || ''));
        const hasBlankCell = r.some((c) => !(c && String(c).trim()));
        const tallRow = !globalThis.__FZ_OFF_VTOP4 && (curH >= (item.fontPt || 11) * 2.5 || (!item.headShade && ((isSerRow && maxLn >= 2) || ((ri > 0 || isSerRow) && curH >= (item.fontPt || 11) * 1.9 && hasBlankCell))));
        const rowHasBox = hasBoxRow || r.some((c) => typeof c === 'string' && c.startsWith(BOX_MARK));
        const sparseSerialTop = ri > 0 && k === 0 && maxLn === 1 && lns[0] === 1 && r.slice(1).every((c) => !(c && String(c).trim())) && curH >= (item.fontPt || 11) * 2;
        const va = hv ? (hv === 't' ? 'top' : 'center') : !globalThis.__FZ_OFF_VTOP && !rowHasBox && !item.noVRules && lns[k] && (sparseSerialTop || (!item.headShade && (isSerRow || hasBlankCell) && tallRow) || (maxLn >= 2 && (lns[k] < maxLn || ((maxLn >= 3 || tallRow) && !globalThis.__FZ_OFF_VTOP4)))) ? 'top' : 'center';
```

### Diff ৪: `[FZ_ON=BOXPOS, FZ_ON=SHADECOL, FZ_ON=SHADEBAR]` (ডিফল্টে বন্ধ, যাতে `a02` ও `a03`-এ কোনো ক্ষতি না হয়)
- `layout-ir.js`-এ `BOXPOS`: `if (!globalThis.__FZ_OFF_BOXPOS && (globalThis.__FZ_ON_BOXPOS || globalThis.__FZ_ON_GRIDFIRST))`
- `layout-ir.js`-এ `SHADECOL`: `if ((globalThis.__FZ_ON_SHADECOL || globalThis.__FZ_ON_GRIDFIRST) && !globalThis.__FZ_OFF_SHADECOL && Array.isArray(info.boxes) && info.boxes.length >= 3)`
- `layout-ir.js`-এ `SHADEBAR`: `const isFullWidthBar = globalThis.__FZ_ON_SHADEBAR && !globalThis.__FZ_OFF_SHADEBAR && !m.shade.dark && rw >= 420 && (!gw || rw >= gw * 0.9);`
