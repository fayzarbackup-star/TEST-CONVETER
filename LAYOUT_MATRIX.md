# Layout Matrix: Current vs Desired Behavior

এই ম্যাট্রিক্সে বিভিন্ন ফাইলের বর্তমান লেআউট আচরণ এবং আমরা কী আচরণ চাই (Desired), তা আলাদা করে সংজ্ঞায়িত করা হলো।

| Field | বর্তমান আচরণ (Current) | কাঙ্ক্ষিত আচরণ (Desired) |
|---|---|---|
| **EXAM_CQ** (সৃজনশীল) | `w:sectPr` না থাকায় Combined-এর সাথে মিশলে লেআউট ভেঙে যায়। | A4, Landscape, 2 Columns (0.7" gap), Hanging Indent: 432 dxa |
| **EXAM_MCQ** (বহুনির্বাচনী) | `EXAM_MCQ`-এর HTML preview ও DOCX-এ পেজ ব্রেক লজিক আলাদা। | A4, Portrait, 2 Columns, 4-Tab Stops, Hanging Indent: 432 dxa |
| **EXAM_COMBINED** (সম্মিলিত) | `ExportDualEngine`-এ CQ ও MCQ বডি জোড়া লাগে কিন্তু செকশন ব্রেক বাদ যায়। | CQ অংশ Landscape, তারপর Word Section Break, এরপর MCQ Portrait. |
| **Math / Science** | সমীকরণ মাঝেমধ্যে ভেঙে যায়। | Unicode/MathML এ অবিকৃত থাকবে। |
| **Indent (Hanging)** | স্পেসিফিকেশনে `432 dxa` ও `234 dxa` মিশ্রিত। | **৪৩২ dxa (21.6 pt)** সর্বত্র ব্যবহার করা হবে। |
| **Text/Reference** | প্রম্পটে "বোর্ড রেফারেন্স মুছুন" এবং "অবিকল রাখুন" দুটোই আছে। | **Zero-edit:** টেক্সট, নম্বর, রেফারেন্স হুবহু অবিকৃত থাকবে। |
| **Page Break Logic** | ক্যারেক্টার/লাইন কাউন্ট দিয়ে ম্যানুয়াল পেজ ব্রেক হয়। | Word-এর নিজস্ব Native Flow ও Section Break ব্যবহৃত হবে। |
| **Incomplete OCR Export** | `MAX_TOKENS` হলে ফাইলের শেষে অসম্পূর্ণ লেখা নিয়ে DOCX তৈরি হয়ে যায়। | অসম্পূর্ণ হলে সরাসরি এক্সপোর্ট হবে না, UI-তে ফেইল/চাঙ্কিং দেখাতে হবে। |
