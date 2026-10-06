/* ফয়জার এআই কম্পোজ — অভিন্ন হেডার: মোবাইল-মেনু, বর্তমান পাতার লিংক চিহ্নিত করা, "শীঘ্রই" লিংক (css/fayzar-theme.css-এর সাথে)। */
(function () {
  'use strict';
  // অভিন্ন টোস্ট — OCR-ইঞ্জিন ও পাতার স্ক্রিপ্ট window.showToastNotification ডাকে
  if (typeof window.showToastNotification !== 'function') {
    window.showToastNotification = function (msg, type) {
      let box = document.querySelector('.fz-toasts');
      if (!box) { box = document.createElement('div'); box.className = 'fz-toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
      const t = document.createElement('div');
      t.className = 'fz-toast ' + (type || 'info');
      t.textContent = String(msg || '');
      box.appendChild(t);
      while (box.children.length > 3) box.firstElementChild.remove();   // একসাথে সর্বোচ্চ ৩টি
      setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 4200);
    };
  }
  function soonToast(msg) {
    if (typeof window.showToastNotification === 'function') { window.showToastNotification(msg, 'info'); return; }
    alert(msg);
  }
  function init() {
    const links = document.getElementById('fzLinks');
    const burger = document.getElementById('fzBurger');
    if (!links) return;
    const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    links.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      // শুধু অংশ-লিংক ছাড়া পুরো-পাতার লিংক চিহ্নিত হয় (index.html#services ইত্যাদি নয়)
      if (!href.includes('#') && href.toLowerCase() === here) a.setAttribute('aria-current', 'page');
      if (a.classList.contains('fz-soon')) {
        a.addEventListener('click', (e) => { e.preventDefault(); soonToast('লগইন ও রেজিস্ট্রেশন শীঘ্রই চালু হবে।'); });
      }
      // মোবাইলে অংশ-লিংকে চাপলে মেনু বন্ধ
      a.addEventListener('click', () => { if (links.classList.contains('open')) { links.classList.remove('open'); if (burger) burger.setAttribute('aria-expanded', 'false'); } });
    });
    if (burger) {
      burger.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        burger.setAttribute('aria-expanded', String(open));
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
