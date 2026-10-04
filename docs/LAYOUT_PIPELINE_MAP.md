# Layout Pipeline Map (Active vs Archived)

এই ম্যাপটি বর্তমানে কোন ইউজার অ্যাকশন কোন কোড পাথ (Renderer/Exporter) দিয়ে যায় তার একটি ডকুমেন্টেশন।

| ব্যবহারকারীর কাজ | কোথা থেকে শুরু | কোন renderer/export চলে | সক্রিয় কি না |
|---|---|---|---|
| OCR করে DOCX | OCR download button | `generateMasterDocx` → `FayzarPipeline` → `ExportDualEngine` | হ্যাঁ (সক্রিয়) |
| OCR করে Bijoy DOCX | master DOCX-এর পরে | `DocxHandler.convertDocx` | হ্যাঁ (সক্রিয়) |
| OCR করে `.doc` | master DOCX-এর পরে | `DocxToDocConverter` | হ্যাঁ (সক্রিয়) |
| Studio preview | Studio preview button | `FayzarPipeline` → `QuestionEngine.renderToHtml()` | হ্যাঁ (সক্রিয়) |
| Studio থেকে DOCX | Studio download button (DOCX) | `FayzarPipeline` → `ExportDualEngine` | হ্যাঁ (সক্রিয়) |
| Studio থেকে DOC | Studio download button (DOC) | `FayzarPipeline` → `ExportDualEngine` → `DocBinaryEngine` (via `docx-to-doc-engine`) | হ্যাঁ (সক্রিয়) |
| সরাসরি text converter থেকে export | text converter button | `main.js`-এর export route | হ্যাঁ (সক্রিয়) |
| `layout-studio.html` (Test Page) | Page load | Archived scripts (`MdLayoutParser`, `DocxLayoutBuilder` ইত্যাদি) | **পুরোনো/বর্তমানে যাচাই করা হয়নি** |
| `test-layouts.html` (Test Page) | Page load | Archived scripts | **পুরোনো/বর্তমানে যাচাই করা হয়নি** |

## মন্তব্য
* `js/layout-engine/archive/` ফোল্ডারে থাকা স্ক্রিপ্টগুলো বর্তমানে মেইন ফ্লো-তে ব্যবহৃত হচ্ছে না। 
* `ExportDualEngine` এবং `QuestionEngine` হলো মূল সক্রিয় রেন্ডারিং ইঞ্জিন।
