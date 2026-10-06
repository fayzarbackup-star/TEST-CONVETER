/* OCR পাতা (index.html): হোম-পাতা (converter.html) থেকে ?from=home দিয়ে এলে IndexedDB-র ফাইলগুলো
 * wizardFileInput-এ বসিয়ে change ঘটায় (ai-ocr-engine.js-এর একই পদ্ধতি)। পাতা পুরো লোড হওয়ার পর চলে,
 * যাতে টুলের হ্যান্ডলার আগে বাঁধা থাকে। একবার পড়েই মুছে ফেলে; ১০ মিনিটের পুরোনো হলে বাদ।
 */
(function () {
  'use strict';
  if (!/[?&]from=home\b/.test(location.search) || !window.indexedDB) return;

  function run() {
    const req = indexedDB.open('fayzar-handoff', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => {
      const tx = req.result.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const get = store.get('pending');
      get.onsuccess = () => {
        store.delete('pending');
        const rec = get.result;
        if (!rec || !rec.files || !rec.files.length || Date.now() - rec.at > 10 * 60 * 1000) return;
        const input = document.getElementById('wizardFileInput');
        if (!input) return;
        const dt = new DataTransfer();
        rec.files.forEach((f) => dt.items.add(f));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
    };
  }
  if (document.readyState === 'complete') run(); else window.addEventListener('load', run);
})();
