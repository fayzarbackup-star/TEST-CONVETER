# হ্যান্ডঅফ — ২০২৬-১০-১৯ (রাত ~২টা) — ব্যবহারকারী: আজ বন্ধ, কাল সকালে শুরু; পিসি হ্যাং ⇒ একসাথে ২টির বেশি ট্যাব নয়
- **আগে পড়ো:** docs/GEMINI_TAB_WORKFLOW.md। bridge পোর্ট 18765 (`/tabs`, `/navigate-tab`, `/click-send?tabId=`)। send এখন Task-চিপ নিজে যাচাই করে (না হলে পাঠায় না); তবু ✗ এলে `/click-send?tabId=<id>` + rounds.json-এ হাতে যোগ।
- **চলছে/বাকি জিপ:** u/2 A01_WRAP_v1 (a01 লাইন-ভাঙা, সুইচ WRAPFIT), u/3 A14_BOXSPLIT_v1 (মাঝপথে থেমে থাকতে পারে — জিপ না এলে নতুন চ্যাটে আবার পাঠাও), u/0 Q_ASIS_SCORE_v11, u/1 A07_TABLECOL_v1 (ট্যাব বন্ধ — চ্যাট খুলে জিপ আছে কি না দেখো)। বান্ডেল scratch/bundles/*_bundle.zip।
- **বসানো বাকি:** inbox\A1_F1_PAGEFIT_FIX_v6.zip (যাচাই হয়েছে: docx-to-doc-engine-এ পরিবর্তন শুধু studioFit-এ; বসাও → f1-pagefit + run-all → push)।
- আজ push: 9e0f1cd (F3+ASIS v10), 1806145 (rowcheck), f795853 (D_E2E, নুক্তা-টেস্ট ঠিক), 22da90f (F2 wire)। run-all 2403/0।
- **নমুনা:** scratch\samples\asis (১৭টি); `$env:ASIS_DIR=(Resolve-Path scratch\samples\asis).Path`। manifest-এ n1–n4 যোগ; ক্যাপচার ব্যর্থ (OCR-প্রক্সি "সাময়িক ব্যস্ত") ⇒ `--ids n1,n2 --capture` আবার।
- **স্কোর আগে→এখন:** scratch\asis-before-2026-10-19.json + HANDOFF-এর আগের রিপোর্ট। a01/a03/a18-এর ফোল্ডারে এখন FONTPICK-চালু আউটপুট ⇒ কাল আগে `--ids a01,a03,a18` (সুইচ ছাড়া) আবার।
- **সুইচ-সুইপ (scratch\switch-sweep.ps1, ফল switch-sweep.txt):** OTSU ±০, FORMKIT ±০, FONTPICK খারাপ (a01 −১০, a03 −৭) ⇒ বন্ধ থাকবে। PGBORDER, TABLEGRID, ROWCHECK বাকি: `-Switches PGBORDER,TABLEGRID,ROWCHECK`।
- asis-score চালানোর আগে লুকানো WINWORD থাকলে বন্ধ করো (EBUSY দেয়)।
- বাকি সিদ্ধান্ত (ব্যবহারকারী): ক্যাশমেমো ৯/১০pt; পুরোনো ফোল্ডার মোছা; OCR-প্রক্সি deploy; সুইচ ডিফল্ট-চালু।
