# Antigravity Gemini Agent — রুটিন চক্রের নির্দেশিকা (২০২৬-১০-২২)

তুমি (Antigravity-র Gemini Agent) রুটিন কাজ চালাবে, যাতে Claude-এর টোকেন বাঁচে। শুরুতে `docs/HANDOFF.md` পড়ো। সিদ্ধান্তের কাজ (গ্রহণ/বাতিল, মূল ইঞ্জিন বদল, নতুন কাজের নকশা) Claude-এর — সেখানে থেমে HANDOFF-এ লিখে রাখো।

## কঠোর নিয়ম
- মূল ইঞ্জিনে কখনো হাত দেবে না: js/docx-to-doc-engine.js, js/bangla-converter-engine.js, js/equation-converter.js, js/doc-binary-engine.js।
- PowerShell-এ Get-Content/Set-Content দিয়ে বাংলা ফাইল লিখবে না (UTF-8 নষ্ট হয়)।
- একটি কাজ একবারই পাঠাবে; পাঠানো সন্দেহজনক হলে আবার পাঠানোর আগে স্ক্রিনশট/read-tab দেখো।
- push শুধু main-এ, শুধু Claude/ব্যবহারকারী বললে।
- আউটপুট ছোট রাখো; পুরো টেস্ট-সেট শুধু শেষে।

## ১. বান্ডেল বানানো
```
$f = node tools/make-type-task.mjs <TYPE> ...        # ধরন-ভিত্তিক কাজের ফাইল-তালিকা
node tools/agent_manager.mjs bundle --task <TASK> --files $f --instruction-file scratch/bundles/<TASK>_PROMPT.md
```
প্রম্পট ফাইল Claude লিখে দেবে, অথবা আগের `scratch/bundles/*_PROMPT.md` নমুনা দেখে তুমি লিখবে (শেষে _RULES_TAIL অংশ রাখো)।

## ২. পাঠানো — দুই পথ
**(ক) ৩-পিসি ব্রিজ (পছন্দের):**
```
node tools/bridge_task.mjs send scratch/bundles/<TASK>_bundle.zip --prompt "Follow PROMPT.md in the attached zip. Reply ONLY with one downloadable <TASK>.zip." --name <TASK>
node tools/bridge_task.mjs watch        # অবস্থা বদলালে লাইন; zip এলে নিজে Downloads\gemini-inbox-এ নামায়
node tools/bridge_task.mjs status | shot <id> | get <id>
```
`nozip` এলে: `get <id>` দিয়ে উত্তর পড়ো; জিপ দরকার হলে `node tools/bridge_task.mjs cmd <id> ask_zip` (১৫ মিনিটের মধ্যে)। `orphan`/`failed` হলে Claude-কে জানাও (নিজে requeue নয়)।

**(খ) এই পিসির Chrome ট্যাব (পুরোনো পথ):** `docs/HANDOFF.md`-এর "পাঠানো" লাইন দেখো (bridge port 18765, switch-mode Argon, `agent_manager send --tab N ... --force`, `agent_manager fetch --tab N --name <TASK>`)।

## ৩. বসানো ও যাচাই
HANDOFF-এর "বসানোর চক্র" লাইন অনুযায়ী: apply_reply → `node tools/merge-switch-check.mjs <stage>` → সংশ্লিষ্ট টেস্ট → `node tests/run-all.mjs` (শুধু FAIL আর মোট সংখ্যা দেখাও) → asis-ab (নির্দিষ্ট কয়েকটি ফাইল)। ফল HANDOFF-এ এক লাইনে লেখো; গ্রহণ/বাতিল Claude ঠিক করবে।

## ৪. শেষে
HANDOFF হালনাগাদ (কী পাঠানো হলো, task id, কোথায় থামলে)।

## ৫. বুঝতে না পারলে / সাহায্য দরকার হলে (Ask Claude)
অনুমান করে চালিয়ে যেও না। কোনো ধাপ, ফাইল, কমান্ড বা ফল অস্পষ্ট হলে সেখানেই থামো এবং result_<NAME>.md-তে লেখো:
- `## QUESTION` অংশে: কোন ধাপে আটকেছ, কী চেষ্টা করেছ, কী দেখেছ (ত্রুটির ১০ লাইন পর্যন্ত), ঠিক কী জানতে চাও।
- শেষ লাইন ঠিক এই: `FAILED: NEED HELP`
Claude পূর্ণ তথ্যসহ উত্তর দেবে নতুন task ফাইলে (task_<NAME>_HELP.md), একই চ্যাটে। তারপর সেখান থেকে কাজ চালিয়ে যাবে।
English summary: If anything is unclear, do not guess. Stop, write a "## QUESTION" section in the result file (step, what you tried, what you saw, what you need), last line exactly `FAILED: NEED HELP`. Claude will answer with full details in task_<NAME>_HELP.md in this same chat.
