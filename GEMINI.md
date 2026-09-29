# Antigravity Workspace Guidelines (Fayzar Computer)

## 1. Ultra-Fast Execution
- কোনো ব্যাকগ্রাউন্ড বা লং-রানিং লোকাল সার্ভার (যেমন `npm run dev`) টার্মিনালে রান করা যাবে না।
- Do not run any background or long-running local servers in the terminal.

## 2. No Unprompted Browser Action
- ব্যবহারকারী স্পষ্ট নির্দেশ না দেওয়া পর্যন্ত বিল্ট-ইন ব্রাউজার খোলা বা স্ক্রিনশট নেওয়া সম্পূর্ণ নিষিদ্ধ।
- Opening the built-in browser or capturing screenshots is strictly prohibited unless explicitly requested.

## 3. Diff Only
- কোনো কোড পরিবর্তনের সময় সম্পূর্ণ ফাইল রি-রাইট করা যাবে না; শুধুমাত্র নির্দিষ্ট লাইনের মিনিমাল কোড পরিবর্তন (Diff / slice edit) করতে হবে।
- Always make targeted minimal edits; never rewrite entire files.

## 4. Zero Fluff
- চ্যাটে কোনো লম্বা ভূমিকা বা অতিরিক্ত ব্যাখ্যা ছাড়া সরাসরি কার্যকর ফলাফল ও লিঙ্ক দিতে হবে।
- Keep responses direct, actionable, and concise without filler text.

## 5. Self-Maintenance Rule
- যখনই প্রজেক্টে নতুন ফাইল তৈরি, রিনেম বা ডিলিট করা হবে—মূল কোড লেখার সাথে সাথে `PROJECT_MAP.md` ফাইলের সংশ্লিষ্ট টেবিল স্বয়ংক্রিয়ভাবে আপডেট করতে হবে। আলাদা নির্দেশের প্রয়োজন নেই।
- Automatically keep `PROJECT_MAP.md` updated whenever project files are created, renamed, or deleted.

## 6. Smart Context Indexing
- কোনো সেকশন বা ফাইল খোঁজার প্রয়োজন হলে সম্পূর্ণ রিপোজিটরি স্ক্যান না করে প্রথমে `PROJECT_MAP.md` দেখে সরাসরি নির্দিষ্ট ফাইল ও লাইনে কাজ করতে হবে।
- Always check `PROJECT_MAP.md` first before reading or searching project files.

## 7. No Planning Mode Overhead
- ছোট বা মাঝারি বাগ ফিক্স ও কোড পরিবর্তনের জন্য কোনো প্ল্যানিং মোড, লম্বা আর্টফ্যাক্ট বা অতিরিক্ত প্রস্তুতি নেওয়া যাবে না; সরাসরি ১-শট সার্জিক্যাল এডিট করতে হবে।
- Never enter planning mode or create multi-step planning artifacts for code fixes. Apply direct surgical edits immediately.

## 8. No Repetitive Verification Loops
- কোনো কোড পরিবর্তনের পর বারবার ফাইল স্ক্যানিং বা একাধিক টেস্ট স্ক্রিপ্ট তৈরি করে সময় নষ্ট করা নিষিদ্ধ। শুধুমাত্র সরাসরি পরিবর্তনটুকু প্রয়োগ করে চ্যাটে লিঙ্ক দিতে হবে।
- Avoid writing repetitive scratch verification scripts or scanning the whole repo after each edit.

## 9. Quick Pre-Confirmation Protocol
- কোড এডিটের পূর্বে ভুল বোঝাবুঝি ও অনাকাঙ্ক্ষিত পরিবর্তন এড়াতে সংক্ষেপে ২ লাইনে নিশ্চিত করতে হবে:
  1. কী চাওয়া হয়েছে (উদ্দেশ্য)
  2. কোন ফাইলে এবং কী নির্দিষ্ট পরিবর্তন করা হবে
- ব্যবহারকারীর কনফার্মেশনের সাথে সাথে ১-শট সার্জিক্যাল এডিট প্রয়োগ করতে হবে।
- Briefly state (1) the intent and (2) target file/logic before editing to prevent misunderstandings and unintended changes.

## 10. FROZEN CORE ENGINES (কোর কনভার্টার ফাইলে হাত দেওয়া সম্পূর্ণ নিষিদ্ধ)
- `js/docx-to-doc-engine.js`
- `js/bangla-converter-engine.js`
- `js/equation-converter.js`
- `js/doc-binary-engine.js`
- ব্যবহারকারীর স্পষ্ট ও সরাসরি লিখিত নির্দেশ ছাড়া উপরের মূল ইঞ্জিন ফাইলগুলোতে ১ লাইন কোডও পরিবর্তন বা এডিট করা কঠোরভাবে নিষিদ্ধ।
- লেআউট, মার্জিন, কলাম ও ফরম্যাটিং সংক্রান্ত যাবতীয় কাজ বাধ্যতামূলকভাবে শুধুমাত্র `js/layout-engine/` ফোল্ডারের ভেতর সীমাবদ্ধ রাখতে হবে।
- Strictly prohibited from editing or modifying the above core engine files under any circumstances without explicit user instruction. All layout work MUST remain strictly within `js/layout-engine/`.
