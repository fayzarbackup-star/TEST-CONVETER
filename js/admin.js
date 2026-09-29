// =========================================================================
// ডিজিটাল অ্যাডমিন কন্ট্রোল সেন্টার ইঞ্জিন (Next-Gen Admin Suite Engine)
// ফয়জার কম্পিউটার এন্ড ফটোস্ট্যাট v2.5
// =========================================================================

let currentAdminTab = 'dashboard';
let noticesList = [];
let servicesList = [];
let siteConfig = {};
let feedbacksList = [];
let dictionaryList = [];
let candidatesList = [];
let resultsConfig = {};
let currentSelectedSchoolId = null;

let currentNoticeFilter = 'all';
let currentServiceFilter = 'all';
let currentFeedbackFilter = 'all';

// ১. সিকিউরিটি ও অথেনটিকেশন (PIN Security)
// =========================================================================
const DEFAULT_PIN = '101919';

function getStoredPin() {
  return localStorage.getItem('fayzar_admin_pin') || DEFAULT_PIN;
}

function checkAuth() {
  const isAuth = sessionStorage.getItem('fayzar_admin_session') === 'true';
  const loginScreen = document.getElementById('admin-login-screen');
  const dashboard = document.getElementById('admin-dashboard');

  if (isAuth) {
    loginScreen?.classList.add('hidden');
    dashboard?.classList.remove('hidden');
    initAdminSuite();
  } else {
    loginScreen?.classList.remove('hidden');
    dashboard?.classList.add('hidden');
  }
}

function togglePinVisibility() {
  const pinInput = document.getElementById('admin-pin-input');
  const icon = document.getElementById('pin-eye-icon');
  if (!pinInput || !icon) return;

  if (pinInput.type === 'password') {
    pinInput.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    pinInput.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

document.getElementById('admin-login-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('admin-pin-input')?.value.trim();
  const errorMsg = document.getElementById('login-error-msg');
  const correctPin = getStoredPin();

  if (input === correctPin) {
    sessionStorage.setItem('fayzar_admin_session', 'true');
    localStorage.setItem('fayzar_admin_session', 'true');

    // Automatically set Super Admin credentials for Result Admin SSO
    const superAdminUser = {
      role: 'super_admin',
      role_title: 'ওয়েব সুপার অ্যাডমিন (ফয়জার কম্পিউটার)',
      name: 'ফয়জার কম্পিউটার অ্যাডমিন',
      canBatchPrint: true,
      canPublish: true,
      canSwitchSchool: true,
      canManageUsers: true,
      school_id: null
    };
    sessionStorage.setItem('fayzar_result_current_user', JSON.stringify(superAdminUser));
    localStorage.setItem('fayzar_result_current_user', JSON.stringify(superAdminUser));

    checkAuth();
    showToast('সফলভাবে অ্যাডমিন প্যানেলে লগইন হয়েছে!', 'success');
  } else {
    if (errorMsg) {
      errorMsg.classList.remove('hidden');
      setTimeout(() => errorMsg.classList.add('hidden'), 3500);
    }
    showToast('ভুল পিন কোড! অনুগ্রহ করে পুনরায় চেষ্টা করুন।', 'error');
  }
});

function adminLogout() {
  if (confirm('আপনি কি নিশ্চিত যে অ্যাডমিন প্যানেল থেকে লগআউট করতে চান?')) {
    sessionStorage.removeItem('fayzar_admin_session');
    localStorage.removeItem('fayzar_admin_session');
    sessionStorage.removeItem('fayzar_result_current_user');
    localStorage.removeItem('fayzar_result_current_user');
    window.location.reload();
  }
}

function openChangePinModal() {
  document.getElementById('pin-modal')?.classList.remove('hidden');
}

function closeChangePinModal() {
  document.getElementById('pin-modal')?.classList.add('hidden');
}

function handleChangePinSubmit(e) {
  e.preventDefault();
  const curr = document.getElementById('current-pin')?.value.trim();
  const next = document.getElementById('new-pin')?.value.trim();
  const realPin = getStoredPin();

  if (curr !== realPin) {
    showToast('বর্তমান পিনটি সঠিক নয়!', 'error');
    return;
  }
  if (!next || next.length < 4) {
    showToast('নতুন পিন কমপক্ষে ৪ সংখ্যার হতে হবে!', 'warning');
    return;
  }

  localStorage.setItem('fayzar_admin_pin', next);
  closeChangePinModal();
  showToast('অ্যাডমিন পিন সফলভাবে পরিবর্তন করা হয়েছে!', 'success');
}

// ২. টোস্ট নোটিফিকেশন সিস্টেম
// =========================================================================
function showToast(message, type = 'info') {
  const box = document.getElementById('toast-box');
  if (!box) return;

  const toast = document.createElement('div');
  let bg = 'bg-slate-900 border-slate-700 text-white';
  let icon = '<i class="fas fa-info-circle text-blue-400"></i>';

  if (type === 'success') {
    bg = 'bg-emerald-950 border-emerald-500/50 text-emerald-100';
    icon = '<i class="fas fa-check-circle text-emerald-400"></i>';
  } else if (type === 'error') {
    bg = 'bg-rose-950 border-rose-500/50 text-rose-100';
    icon = '<i class="fas fa-exclamation-circle text-rose-400"></i>';
  } else if (type === 'warning') {
    bg = 'bg-amber-950 border-amber-500/50 text-amber-100';
    icon = '<i class="fas fa-triangle-exclamation text-amber-400"></i>';
  }

  toast.className = `${bg} border shadow-2xl rounded-2xl px-4 py-3 text-xs font-bold flex items-center gap-2.5 transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto max-w-sm`;
  toast.innerHTML = `${icon} <span>${message}</span>`;

  box.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ৩. ডেটা লোডিং ও ইনিশিয়ালাইজেশন
// =========================================================================
async function initAdminSuite() {
  try {
    // ১. নোটিশ লোড
    let nLoaded = false;
    try {
      const nRes = await fetch('data/notices.json');
      if (nRes.ok) {
        noticesList = await nRes.json();
        nLoaded = true;
      }
    } catch(e) {}
    if (!nLoaded || !noticesList || noticesList.length === 0) {
      const nLocal = JSON.parse(localStorage.getItem('fayzar_notices') || '[]');
      noticesList = nLocal.length > 0 ? nLocal : (window.OFFLINE_DATA?.notices || []);
    }
  } catch (e) {
    noticesList = window.OFFLINE_DATA?.notices || [];
  }

  try {
    // ২. সেবাসমূহ লোড
    let sLoaded = false;
    try {
      const sRes = await fetch('data/services.json');
      if (sRes.ok) {
        servicesList = await sRes.json();
        sLoaded = true;
      }
    } catch(e) {}
    if (!sLoaded || !servicesList || servicesList.length === 0) {
      const sLocal = JSON.parse(localStorage.getItem('fayzar_services') || '[]');
      servicesList = sLocal.length > 0 ? sLocal : (window.OFFLINE_DATA?.services || []);
    }
  } catch (e) {
    servicesList = window.OFFLINE_DATA?.services || [];
  }

  try {
    // ৩. কনফিগারেশন লোড
    let cLoaded = false;
    try {
      const cRes = await fetch('data/site_config.json');
      if (cRes.ok) {
        siteConfig = await cRes.json();
        cLoaded = true;
      }
    } catch(e) {}
    if (!cLoaded || !siteConfig || Object.keys(siteConfig).length === 0) {
      const cLocal = JSON.parse(localStorage.getItem('fayzar_site_config') || '{}');
      siteConfig = Object.keys(cLocal).length > 0 ? cLocal : (window.OFFLINE_DATA?.site_config || {});
    }
  } catch (e) {
    siteConfig = window.OFFLINE_DATA?.site_config || {};
  }

  try {
    // ৪. ফিডব্যাক লোড (Node API + JSON ফাইল + LocalStorage + Firebase Firestore)
    let fbItems = [];
    try {
      const fRes = await fetch('/api/feedbacks');
      if (fRes.ok) fbItems = await fRes.json();
    } catch(err) {}

    if (!fbItems || fbItems.length === 0) {
      try {
        const fbLocal = await fetch('data/feedbacks.json');
        if (fbLocal.ok) fbItems = await fbLocal.json();
      } catch(err) {}
    }

    // Merge from LocalStorage
    const localFeedbacks = JSON.parse(localStorage.getItem('fayzar_contact_feedbacks') || '[]');
    localFeedbacks.forEach(lf => {
      if (!fbItems.some(f => f.id === lf.id || (f.name === lf.name && f.message === lf.message))) {
        fbItems.unshift(lf);
      }
    });

    // Merge from Firebase Cloud Firestore
    if (typeof FayzarFirebaseClient !== 'undefined' && FayzarFirebaseClient.getAllFeedbacks) {
      try {
        const fbCloud = await FayzarFirebaseClient.getAllFeedbacks();
        if (fbCloud.success && Array.isArray(fbCloud.feedbacks)) {
          fbCloud.feedbacks.forEach(cf => {
            if (!fbItems.some(f => f.id === cf.id || (f.name === cf.name && f.message === cf.message))) {
              fbItems.unshift(cf);
            }
          });
        }
      } catch(cfErr) {
        console.warn('Firebase feedbacks load warning:', cfErr);
      }
    }

    feedbacksList = fbItems;
  } catch (e) {
    feedbacksList = JSON.parse(localStorage.getItem('fayzar_contact_feedbacks') || '[]');
  }

  try {
    // ৫. কাস্টম ডিকশনারি লোড
    let dLoaded = false;
    try {
      const dRes = await fetch('data/converter_dict.json');
      if (dRes.ok) {
        dictionaryList = await dRes.json();
        dLoaded = true;
      }
    } catch(e) {}
    if (!dLoaded || !dictionaryList || dictionaryList.length === 0) {
      const dLocal = JSON.parse(localStorage.getItem('fayzar_converter_dict') || '[]');
      dictionaryList = dLocal.length > 0 ? dLocal : (window.OFFLINE_DATA?.converter_dict || []);
    }
  } catch (e) {
    dictionaryList = window.OFFLINE_DATA?.converter_dict || [];
  }

  try {
    // ৬. চাকরি প্রার্থী ডাটাবেজ লোড (লোকাল + ফায়ারবেস ক্লাউড ইউজার + Global Candidates)
    let cItems = [];
    try {
      const cRes = await fetch('/api/candidates');
      if (cRes.ok) cItems = await cRes.json();
    } catch(err) {}

    if (!cItems || cItems.length === 0) {
      try {
        const cLocal = await fetch('data/candidates.json');
        if (cLocal.ok) cItems = await cLocal.json();
      } catch(err) {}
    }
    if (!cItems || cItems.length === 0) {
      cItems = (window.OFFLINE_DATA?.candidates ? [...window.OFFLINE_DATA.candidates] : []);
    }

    // Merge from LocalStorage
    const localCandidates = JSON.parse(localStorage.getItem('fayzar_admin_candidates') || '[]');
    localCandidates.forEach(lc => {
      if (!cItems.some(c => c.id === lc.id)) {
        cItems.push(lc);
      }
    });

    // Merge from Firebase Cloud (All registered users' files + Global candidates)
    if (typeof FayzarFirebaseClient !== 'undefined') {
      try {
        const uRes = await FayzarFirebaseClient.getAllUsersForAdmin();
        if (uRes.success && uRes.users) {
          for (const u of uRes.users) {
            const fRes = await FayzarFirebaseClient.getUserFiles(u.mobile);
            const userFiles = Array.isArray(fRes) ? fRes : (fRes?.files || []);
            userFiles.forEach(f => {
              if (!cItems.some(c => c.id === f.id)) {
                cItems.push({
                  ...f,
                  isCloud: true,
                  userMobile: u.mobile,
                  userName: u.name
                });
              }
            });
          }
        }

        if (FayzarFirebaseClient.getAllGlobalCandidates) {
          const gRes = await FayzarFirebaseClient.getAllGlobalCandidates();
          if (gRes.success && Array.isArray(gRes.candidates)) {
            gRes.candidates.forEach(gc => {
              if (!cItems.some(c => c.id === gc.id)) {
                cItems.push(gc);
              }
            });
          }
        }
      } catch (fbErr) {
        console.warn('Firebase candidates load warning:', fbErr);
      }
    }

    candidatesList = cItems;
  } catch (e) {
    candidatesList = JSON.parse(localStorage.getItem('fayzar_admin_candidates') || '[]');
  }

  try {
    // ৭. রেজাল্ট কনফিগারেশন লোড (মাল্টি-স্কুল, শিক্ষক, মার্কশীট সেটিংস)
    let rLoaded = false;
    try {
      const rRes = await fetch('/api/results/config');
      if (rRes.ok) {
        resultsConfig = await rRes.json();
        rLoaded = true;
      }
    } catch(err) {}

    if (!rLoaded || !resultsConfig || Object.keys(resultsConfig).length === 0) {
      try {
        const rFile = await fetch('data/results_config.json');
        if (rFile.ok) {
          resultsConfig = await rFile.json();
          rLoaded = true;
        }
      } catch(err) {}
    }

    if (!rLoaded || !resultsConfig || Object.keys(resultsConfig).length === 0) {
      const localCfg = JSON.parse(localStorage.getItem('fayzar_results_config') || '{}');
      if (Object.keys(localCfg).length > 0) {
        resultsConfig = localCfg;
      } else if (typeof window !== 'undefined' && window.RESULTS_CONFIG) {
        resultsConfig = window.RESULTS_CONFIG;
      } else if (typeof window !== 'undefined' && window.DEFAULT_RESULTS_CONFIG) {
        resultsConfig = window.DEFAULT_RESULTS_CONFIG;
      }
    }

    const ftEl = document.getElementById('cfg-global-footer-credit');
    if (ftEl && resultsConfig.global_footer_credit) {
      ftEl.value = resultsConfig.global_footer_credit;
    }
  } catch (e) {
    console.warn('Error loading results config:', e);
  }

  // কাউন্টার ও সমস্ত ভিউ রেন্ডার
  updateDashboardMetrics();
  populateSiteConfigForm();
  renderAdminNotices();
  renderAdminServices();
  renderAdminChecklist();
  renderAdminDictionary();
  renderAdminFeedbacks();
  renderAdminCandidates();
  renderAdminSchools();
}

// ৪. ড্যাশবোর্ড ওভারভিউ ও মেট্রিক্স
// =========================================================================
function updateDashboardMetrics() {
  const notCount = noticesList.length;
  const srvCount = servicesList.length;
  const chkCount = servicesList.filter(s => s.category !== 'computer' && s.includeInChecklist !== false).length;
  const fbPending = feedbacksList.filter(f => f.status === 'pending').length;
  const fbTotal = feedbacksList.length;
  const candCount = candidatesList.length;
  const schoolCount = (resultsConfig.schools || resultsConfig.institutions || []).length;

  // Stat Cards
  const elNot = document.getElementById('stat-notices-count'); if (elNot) elNot.textContent = `${notCount} টি`;
  const elSrv = document.getElementById('stat-services-count'); if (elSrv) elSrv.textContent = `${srvCount} টি`;
  const elChk = document.getElementById('stat-checklist-count'); if (elChk) elChk.textContent = `${chkCount} টি`;
  const elFb = document.getElementById('stat-feedbacks-count'); if (elFb) elFb.textContent = `${fbTotal} টি`;
  const elFbSub = document.getElementById('stat-feedbacks-sub'); if (elFbSub) elFbSub.textContent = `${fbPending} টি নতুন অপেক্ষারত`;
  const elCand = document.getElementById('stat-candidates-count'); if (elCand) elCand.textContent = `${candCount} টি`;

  // Tab Badges
  const tbNot = document.getElementById('tab-badge-notices'); if (tbNot) tbNot.textContent = notCount;
  const tbSrv = document.getElementById('tab-badge-services'); if (tbSrv) tbSrv.textContent = srvCount;
  const tbChk = document.getElementById('tab-badge-checklist'); if (tbChk) tbChk.textContent = chkCount;
  const tbDict = document.getElementById('tab-badge-dict'); if (tbDict) tbDict.textContent = dictionaryList.length;
  const tbFb = document.getElementById('tab-badge-feedbacks'); if (tbFb) tbFb.textContent = fbPending > 0 ? `${fbPending} নতুন` : fbTotal;
  const chkSel = document.getElementById('checklist-selected-count'); if (chkSel) chkSel.textContent = chkCount;
  const cBadge = document.getElementById('tab-badge-candidates'); if (cBadge) cBadge.textContent = candCount;
  const tbSchools = document.getElementById('tab-badge-schools'); if (tbSchools) tbSchools.textContent = schoolCount;
  const schBadge = document.getElementById('school-count-badge'); if (schBadge) schBadge.textContent = `${schoolCount} টি প্রতিষ্ঠান`;
}

// ৫. ট্যাব পরিবর্তন লজিক
// =========================================================================
function switchAdminTab(tabName) {
  currentAdminTab = tabName;
  const tabs = ['dashboard', 'site', 'notices', 'services', 'checklist', 'tools', 'feedbacks', 'candidates', 'schools', 'backup'];

  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const panel = document.getElementById(`panel-${t}`);

    if (t === tabName) {
      btn?.classList.add('active-nav-tab');
      panel?.classList.remove('hidden');
    } else {
      btn?.classList.remove('active-nav-tab');
      panel?.classList.add('hidden');
    }
  });

  // Re-render specific active panel content
  if (tabName === 'schools') {
    renderAdminSchools(document.getElementById('admin-school-search')?.value || '');
  } else if (tabName === 'candidates') {
    renderAdminCandidates(document.getElementById('admin-candidates-search')?.value || '');
  } else if (tabName === 'feedbacks') {
    renderAdminFeedbacks();
  } else if (tabName === 'notices') {
    renderAdminNotices();
  } else if (tabName === 'services') {
    renderAdminServices();
  } else if (tabName === 'checklist') {
    renderAdminChecklist();
  } else if (tabName === 'tools') {
    renderAdminDictionary();
  } else if (tabName === 'dashboard') {
    updateDashboardMetrics();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ৬. সেকশন ও ওয়েবসাইট কনটেন্ট এডিটর
// =========================================================================
function populateSiteConfigForm() {
  if (!siteConfig.shop) return;
  const shop = siteConfig.shop;
  const hero = siteConfig.hero || {};
  const sec = siteConfig.sections || {};

  document.getElementById('cfg-shop-name').value = shop.name || '';
  document.getElementById('cfg-shop-tagline').value = shop.tagline || '';
  document.getElementById('cfg-shop-phone').value = shop.phone || '';
  document.getElementById('cfg-shop-whatsapp').value = shop.whatsapp || '';
  document.getElementById('cfg-shop-address').value = shop.address || '';
  document.getElementById('cfg-shop-mapurl').value = shop.mapUrl || '';
  document.getElementById('cfg-shop-proprietor').value = shop.proprietor || '';
  document.getElementById('cfg-shop-approval').value = shop.approvalNo || '';
  document.getElementById('cfg-shop-announcement').value = shop.announcement || '';
  document.getElementById('cfg-hours-weekdays').value = shop.hoursWeekdays || '';
  document.getElementById('cfg-hours-friday').value = shop.hoursFriday || '';

  document.getElementById('cfg-hero-badge').value = hero.badge || '';
  document.getElementById('cfg-hero-title').value = hero.title || '';
  document.getElementById('cfg-hero-subtitle').value = hero.subtitle || '';

  document.getElementById('cfg-sec-notices').checked = sec.heroNotices !== false;
  document.getElementById('cfg-sec-checklist').checked = sec.checklist !== false;
  document.getElementById('cfg-sec-services').checked = sec.services !== false;
  document.getElementById('cfg-sec-tools').checked = sec.toolsGateway !== false;
  document.getElementById('cfg-sec-quickform').checked = sec.quickRequest === true;
  document.getElementById('cfg-sec-feedback').checked = sec.feedback !== false;
}

async function saveSiteConfig() {
  siteConfig = {
    shop: {
      name: document.getElementById('cfg-shop-name')?.value.trim(),
      tagline: document.getElementById('cfg-shop-tagline')?.value.trim(),
      phone: document.getElementById('cfg-shop-phone')?.value.trim(),
      whatsapp: document.getElementById('cfg-shop-whatsapp')?.value.trim(),
      address: document.getElementById('cfg-shop-address')?.value.trim(),
      mapUrl: document.getElementById('cfg-shop-mapurl')?.value.trim(),
      proprietor: document.getElementById('cfg-shop-proprietor')?.value.trim(),
      approvalNo: document.getElementById('cfg-shop-approval')?.value.trim(),
      announcement: document.getElementById('cfg-shop-announcement')?.value.trim(),
      hoursWeekdays: document.getElementById('cfg-hours-weekdays')?.value.trim(),
      hoursFriday: document.getElementById('cfg-hours-friday')?.value.trim()
    },
    hero: {
      badge: document.getElementById('cfg-hero-badge')?.value.trim(),
      title: document.getElementById('cfg-hero-title')?.value.trim(),
      subtitle: document.getElementById('cfg-hero-subtitle')?.value.trim()
    },
    sections: {
      heroNotices: document.getElementById('cfg-sec-notices')?.checked,
      checklist: document.getElementById('cfg-sec-checklist')?.checked,
      services: document.getElementById('cfg-sec-services')?.checked,
      toolsGateway: document.getElementById('cfg-sec-tools')?.checked,
      quickRequest: document.getElementById('cfg-sec-quickform')?.checked,
      feedback: document.getElementById('cfg-sec-feedback')?.checked
    }
  };

  try {
    const res = await fetch('/api/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siteConfig)
    });
    if (res.ok) {
      showToast('ওয়েবসাইটের কনফিগারেশন সফলভাবে সার্ভারে সংরক্ষিত হয়েছে!', 'success');
    } else {
      showToast('কনফিগারেশন লোকাল মেমরিতে সংরক্ষিত হয়েছে।', 'info');
    }
  } catch (err) {
    localStorage.setItem('fayzar_site_config', JSON.stringify(siteConfig));
    showToast('সার্ভার অফলাইন, লোকাল স্টোরেজে সংরক্ষিত হয়েছে।', 'warning');
  }
}

// ৭. নোটিশ ম্যানেজমেন্ট লজিক
// =========================================================================
function filterNotices(cat) {
  currentNoticeFilter = cat;
  ['all', 'jobs', 'college'].forEach(c => {
    const btn = document.getElementById(`n-filter-${c}`);
    if (c === cat) {
      btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white';
    } else {
      btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700';
    }
  });
  renderAdminNotices();
}

function renderAdminNotices() {
  const container = document.getElementById('admin-notices-container');
  if (!container) return;

  const query = document.getElementById('search-notices-input')?.value.toLowerCase().trim() || '';

  let list = noticesList.filter(n => {
    if (currentNoticeFilter !== 'all' && n.category !== currentNoticeFilter) return false;
    if (query) {
      const matchTitle = (n.title || '').toLowerCase().includes(query);
      const matchOrg = (n.org || '').toLowerCase().includes(query);
      const matchSumm = (n.summary || '').toLowerCase().includes(query);
      return matchTitle || matchOrg || matchSumm;
    }
    return true;
  });

  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <i class="fas fa-folder-open text-3xl mb-2 block text-slate-600"></i>
        কোনো নোটিশ পাওয়া যায়নি।
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(n => {
    const isJob = n.category === 'jobs';
    const catBadge = isJob 
      ? '<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">💼 চাকরির সার্কুলার</span>'
      : '<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">🎓 স্কুল ও কলেজ</span>';

    const hotBadge = n.isHot ? '<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">🔥 হট</span>' : '';

    return `
      <div class="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 hover:border-blue-500/40 transition group">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap">${catBadge} ${hotBadge}</div>
            <span class="text-[11px] font-mono text-amber-400 font-bold"><i class="fas fa-clock text-[9px]"></i> ${n.deadline || 'চলমান'}</span>
          </div>

          <div class="text-[11px] font-bold text-slate-400">${n.org || 'প্রতিষ্ঠান'}</div>
          <h4 class="text-sm font-black text-white group-hover:text-blue-300 transition line-clamp-2">${n.title}</h4>
          <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">${n.summary || ''}</p>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <button onclick="toggleNoticeHot('${n.id}')" class="text-slate-400 hover:text-amber-400 transition" title="হট নোটিশ টগল করুন">
            <i class="fas fa-fire ${n.isHot ? 'text-rose-500' : ''}"></i>
          </button>
          
          <div class="flex items-center gap-2">
            <button onclick="openNoticeModal('${n.id}')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold transition">
              <i class="fas fa-pen-to-square"></i> এডিট
            </button>
            <button onclick="deleteNotice('${n.id}')" class="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 transition" title="মুছে ফেলুন">
              <i class="fas fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openNoticeModal(id = null) {
  const modal = document.getElementById('notice-modal');
  const title = document.getElementById('notice-modal-title');
  const form = document.getElementById('notice-form');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('n-edit-id').value = '';

  if (id) {
    const item = noticesList.find(n => n.id === id);
    if (item) {
      title.innerHTML = '<i class="fas fa-pen-to-square text-blue-400"></i> নোটিশ তথ্য সম্পাদনা';
      document.getElementById('n-edit-id').value = item.id;
      document.getElementById('n-category').value = item.category || 'jobs';
      document.getElementById('n-org').value = item.org || '';
      document.getElementById('n-title').value = item.title || '';
      document.getElementById('n-deadline').value = item.deadline || '';
      document.getElementById('n-link').value = item.link || '';
      document.getElementById('n-summary').value = item.summary || '';
      document.getElementById('n-is-hot').checked = item.isHot === true;
    }
  } else {
    title.innerHTML = '<i class="fas fa-plus-circle text-blue-400"></i> নতুন নোটিশ যুক্ত করুন';
  }

  modal.classList.remove('hidden');
}

function closeNoticeModal() {
  document.getElementById('notice-modal')?.classList.add('hidden');
}

function handleNoticeSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('n-edit-id')?.value;
  const category = document.getElementById('n-category')?.value;
  const org = document.getElementById('n-org')?.value.trim();
  const title = document.getElementById('n-title')?.value.trim();
  const deadline = document.getElementById('n-deadline')?.value.trim();
  const link = document.getElementById('n-link')?.value.trim();
  const summary = document.getElementById('n-summary')?.value.trim();
  const isHot = document.getElementById('n-is-hot')?.checked;

  if (id) {
    const idx = noticesList.findIndex(n => n.id === id);
    if (idx !== -1) {
      noticesList[idx] = { ...noticesList[idx], category, org, title, deadline, link, summary, isHot };
      showToast('নোটিশ সফলভাবে আপডেট হয়েছে!', 'success');
    }
  } else {
    const newNotice = {
      id: 'notice-' + Date.now(),
      category,
      org,
      title,
      deadline,
      link,
      summary,
      isHot,
      date: new Date().toISOString().split('T')[0]
    };
    noticesList.unshift(newNotice);
    showToast('নতুন নোটিশ যুক্ত করা হয়েছে!', 'success');
  }

  closeNoticeModal();
  renderAdminNotices();
  updateDashboardMetrics();
  saveNoticesToServer();
}

function toggleNoticeHot(id) {
  const item = noticesList.find(n => n.id === id);
  if (item) {
    item.isHot = !item.isHot;
    renderAdminNotices();
    saveNoticesToServer();
  }
}

function deleteNotice(id) {
  if (confirm('আপনি কি নিশ্চিতভাবে এই নোটিশটি মুছে ফেলতে চান?')) {
    noticesList = noticesList.filter(n => n.id !== id);
    renderAdminNotices();
    updateDashboardMetrics();
    saveNoticesToServer();
    showToast('নোটিশ মুছে ফেলা হয়েছে!', 'info');
  }
}

async function saveNoticesToServer() {
  try {
    const res = await fetch('/api/save-notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noticesList)
    });
    if (res.ok) {
      console.log('Notices synced to server');
    }
  } catch (err) {
    localStorage.setItem('fayzar_notices', JSON.stringify(noticesList));
  }
}

// ৮. সেবাসমূহ ও ফি তালিকা ম্যানেজমেন্ট
// =========================================================================
function filterServices(cat) {
  currentServiceFilter = cat;
  ['all', 'land', 'online', 'computer'].forEach(c => {
    const btn = document.getElementById(`s-filter-${c}`);
    if (c === cat) {
      btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white';
    } else {
      btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700';
    }
  });
  renderAdminServices();
}

function renderAdminServices() {
  const container = document.getElementById('admin-services-container');
  if (!container) return;

  const query = document.getElementById('search-services-input')?.value.toLowerCase().trim() || '';

  let list = servicesList.filter(s => {
    if (currentServiceFilter !== 'all' && s.category !== currentServiceFilter) return false;
    if (query) {
      const matchTitle = (s.title || '').toLowerCase().includes(query);
      const matchDocs = (s.documents || []).some(d => d.toLowerCase().includes(query));
      return matchTitle || matchDocs;
    }
    return true;
  });

  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <i class="fas fa-box-open text-3xl mb-2 block text-slate-600"></i>
        কোনো সেবা পাওয়া যায়নি।
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(s => {
    let catText = 'ডিজিটাল সেবা';
    let catColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (s.category === 'land') {
      catText = '🏛️ ভূমিসেবা';
      catColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    } else if (s.category === 'online') {
      catText = '🌐 অনলাইন সেবা';
      catColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    } else if (s.category === 'computer') {
      catText = '💻 কম্পিউটার/স্টুডিও';
      catColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }

    return `
      <div class="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 hover:border-emerald-500/40 transition group">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full ${catColor} border">${catText}</span>
            <span class="text-[11px] text-slate-400 font-bold"><i class="fas fa-stopwatch"></i> ${s.duration || 'তাৎক্ষণিক'}</span>
          </div>

          <h4 class="text-sm font-black text-white group-hover:text-emerald-300 transition line-clamp-2">${s.title}</h4>

          <div class="grid grid-cols-2 gap-2 text-xs pt-1">
            <div class="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span class="text-[10px] text-slate-400 block font-bold">সরকারি ফি:</span>
              <strong class="text-white text-xs font-bold">${s.govtFee || '০ ৳'}</strong>
            </div>
            <div class="bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/30">
              <span class="text-[10px] text-emerald-400 block font-bold">দোকানের চার্জ:</span>
              <strong class="text-emerald-300 text-xs font-bold">${s.serviceFee || '৫০ ৳'}</strong>
            </div>
          </div>

          <div class="text-[11px] text-slate-400 pt-1">
            <i class="fas fa-file-lines text-amber-400 mr-1"></i> প্রয়োজনীয় কাগজপত্র: <strong class="text-slate-300">${(s.documents || []).length} টি</strong>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 text-xs">
          <button onclick="openServiceModal('${s.id}')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold transition">
            <i class="fas fa-pen-to-square"></i> এডিট
          </button>
          <button onclick="deleteService('${s.id}')" class="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 transition" title="মুছে ফেলুন">
            <i class="fas fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openServiceModal(id = null) {
  const modal = document.getElementById('service-modal');
  const title = document.getElementById('service-modal-title');
  const form = document.getElementById('service-form');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('s-edit-id').value = '';

  if (id) {
    const item = servicesList.find(s => s.id === id);
    if (item) {
      title.innerHTML = '<i class="fas fa-pen-to-square text-emerald-400"></i> সেবার তথ্য সম্পাদনা';
      document.getElementById('s-edit-id').value = item.id;
      document.getElementById('s-category').value = item.category || 'land';
      document.getElementById('s-title').value = item.title || '';
      document.getElementById('s-duration').value = item.duration || '';
      document.getElementById('s-govtfee').value = item.govtFee || '';
      document.getElementById('s-servicefee').value = item.serviceFee || '';
      document.getElementById('s-documents').value = (item.documents || []).join('\n');
      document.getElementById('s-guide').value = item.guide || '';
    }
  } else {
    title.innerHTML = '<i class="fas fa-plus-circle text-emerald-400"></i> নতুন সেবা যুক্ত করুন';
  }

  modal.classList.remove('hidden');
}

function closeServiceModal() {
  document.getElementById('service-modal')?.classList.add('hidden');
}

function handleServiceSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('s-edit-id')?.value;
  const category = document.getElementById('s-category')?.value;
  const title = document.getElementById('s-title')?.value.trim();
  const duration = document.getElementById('s-duration')?.value.trim();
  const govtFee = document.getElementById('s-govtfee')?.value.trim();
  const serviceFee = document.getElementById('s-servicefee')?.value.trim();
  const rawDocs = document.getElementById('s-documents')?.value.trim();
  const guide = document.getElementById('s-guide')?.value.trim();

  const documents = rawDocs ? rawDocs.split('\n').map(d => d.trim()).filter(Boolean) : [];

  if (id) {
    const idx = servicesList.findIndex(s => s.id === id);
    if (idx !== -1) {
      servicesList[idx] = { ...servicesList[idx], category, title, duration, govtFee, serviceFee, documents, guide };
      showToast('সেবার তথ্য সফলভাবে আপডেট হয়েছে!', 'success');
    }
  } else {
    const newService = {
      id: 'service-' + Date.now(),
      category,
      title,
      duration,
      govtFee,
      serviceFee,
      documents,
      guide,
      includeInChecklist: category !== 'computer'
    };
    servicesList.unshift(newService);
    showToast('নতুন সেবা সফলভাবে যুক্ত হয়েছে!', 'success');
  }

  closeServiceModal();
  renderAdminServices();
  renderAdminChecklist();
  updateDashboardMetrics();
  saveServicesToServer();
}

function deleteService(id) {
  if (confirm('আপনি কি নিশ্চিতভাবে এই সেবাটি মুছে ফেলতে চান?')) {
    servicesList = servicesList.filter(s => s.id !== id);
    renderAdminServices();
    renderAdminChecklist();
    updateDashboardMetrics();
    saveServicesToServer();
    showToast('সেবাটি মুছে ফেলা হয়েছে!', 'info');
  }
}

async function saveServicesToServer() {
  try {
    const res = await fetch('/api/save-services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(servicesList)
    });
    if (res.ok) {
      console.log('Services synced to server');
    }
  } catch (err) {
    localStorage.setItem('fayzar_services', JSON.stringify(servicesList));
  }
}

// ৯. চেকলিস্ট ক্যালকুলেটর সেটিংস
// =========================================================================
function renderAdminChecklist() {
  const container = document.getElementById('admin-checklist-items-list');
  if (!container) return;

  container.innerHTML = servicesList.map(s => {
    const isIncluded = s.includeInChecklist !== false && s.category !== 'computer';
    const isComp = s.category === 'computer';

    return `
      <div class="glass-card rounded-xl p-3.5 flex items-center justify-between gap-3 border ${isIncluded ? 'border-teal-500/40 bg-teal-950/20' : 'border-slate-800'}">
        <div class="flex items-center gap-3">
          <input type="checkbox" id="chk-${s.id}" ${isIncluded ? 'checked' : ''} onchange="toggleChecklistInclusion('${s.id}')" class="w-4 h-4 rounded text-teal-600 focus:ring-0 cursor-pointer">
          <div>
            <label for="chk-${s.id}" class="text-xs font-bold text-white cursor-pointer block">${s.title}</label>
            <span class="text-[10px] text-slate-400 font-semibold">
              ${isComp ? '<span class="text-amber-400 font-bold">কম্পিউটার/স্টুডিও</span> • ' : ''}
              কাগজপত্র: ${(s.documents || []).length} টি • ফি: ${s.govtFee || 'নিয়ম অনুযায়ী'}
            </span>
          </div>
        </div>

        <button onclick="openServiceModal('${s.id}')" class="text-slate-400 hover:text-teal-300 text-xs p-1" title="ডকুমেন্টস এডিট করুন">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    `;
  }).join('');
}

function toggleChecklistInclusion(id) {
  const s = servicesList.find(item => item.id === id);
  if (s) {
    s.includeInChecklist = !s.includeInChecklist;
    renderAdminChecklist();
    updateDashboardMetrics();
    saveServicesToServer();
    showToast(`'${s.title}' চেকলিস্টের স্থিতি আপডেট করা হয়েছে।`, 'info');
  }
}

// ১০. টুলস ও কনভার্টার কাস্টম ডিকশনারি
// =========================================================================
function renderAdminDictionary() {
  const tbody = document.getElementById('admin-dictionary-tbody');
  if (!tbody) return;

  if (dictionaryList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="py-8 text-center text-slate-500">কোনো সংরক্ষিত শব্দ পাওয়া যায়নি।</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = dictionaryList.map(item => `
    <tr class="hover:bg-slate-900/40 transition">
      <td class="py-3 px-4 font-bold text-emerald-400">${item.unicode}</td>
      <td class="py-3 px-4 font-mono text-amber-300 font-semibold">${item.bijoy}</td>
      <td class="py-3 px-4 text-slate-400">${item.note || '-'}</td>
      <td class="py-3 px-4 text-right">
        <button onclick="deleteDictWord('${item.id}')" class="text-rose-400 hover:text-rose-300 text-xs p-1" title="মুছে ফেলুন">
          <i class="fas fa-trash-can"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function openDictModal() {
  document.getElementById('dict-modal')?.classList.remove('hidden');
}

function closeDictModal() {
  document.getElementById('dict-modal')?.classList.add('hidden');
}

function handleDictSubmit(e) {
  e.preventDefault();
  const unicode = document.getElementById('dict-unicode')?.value.trim();
  const bijoy = document.getElementById('dict-bijoy')?.value.trim();
  const note = document.getElementById('dict-note')?.value.trim();

  if (!unicode || !bijoy) {
    showToast('ইউনিকোড ও বিজয় উভয় ফিল্ডই আবশ্যক!', 'warning');
    return;
  }

  const newWord = {
    id: 'dict-' + Date.now(),
    unicode,
    bijoy,
    note
  };

  dictionaryList.unshift(newWord);
  closeDictModal();
  renderAdminDictionary();
  updateDashboardMetrics();
  saveDictionaryToServer();
  showToast('নতুন বানান ম্যাপিং যুক্ত হয়েছে!', 'success');
}

function deleteDictWord(id) {
  if (confirm('আপনি কি এই শব্দের ম্যাপিং মুছে ফেলতে চান?')) {
    dictionaryList = dictionaryList.filter(d => d.id !== id);
    renderAdminDictionary();
    updateDashboardMetrics();
    saveDictionaryToServer();
    showToast('শব্দটি মুছে ফেলা হয়েছে!', 'info');
  }
}

async function saveDictionaryToServer() {
  try {
    const res = await fetch('/api/save-dictionary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dictionaryList)
    });
    if (res.ok) {
      showToast('কাস্টম অভিধান সফলভাবে সার্ভারে সংরক্ষিত হয়েছে!', 'success');
    }
  } catch (err) {
    localStorage.setItem('fayzar_converter_dict', JSON.stringify(dictionaryList));
  }
}

// ১১. গ্রাহক মতামত ও রিভিউ যাচাই-বাছাই
// =========================================================================
function filterFeedbacks(status) {
  currentFeedbackFilter = status;
  ['all', 'pending', 'approved'].forEach(s => {
    const btn = document.getElementById(`fb-filter-${s}`);
    if (s === status) {
      btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white';
    } else {
      btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700';
    }
  });
  renderAdminFeedbacks();
}

function renderAdminFeedbacks() {
  const container = document.getElementById('admin-feedbacks-container');
  if (!container) return;

  const query = document.getElementById('search-feedbacks-input')?.value.toLowerCase().trim() || '';

  let list = feedbacksList.filter(f => {
    if (currentFeedbackFilter !== 'all' && f.status !== currentFeedbackFilter) return false;
    if (query) {
      const matchName = (f.name || '').toLowerCase().includes(query);
      const matchContact = (f.contact || '').toLowerCase().includes(query);
      const matchMsg = (f.message || '').toLowerCase().includes(query);
      return matchName || matchContact || matchMsg;
    }
    return true;
  });

  if (list.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 glass-card rounded-2xl">
        <i class="fas fa-inbox text-3xl mb-2 block text-slate-600"></i>
        কোনো গ্রাহক মতামত পাওয়া যায়নি।
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(f => {
    const isAppr = f.status === 'approved';
    const statusBadge = isAppr
      ? '<span class="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">✅ অনুমোদিত</span>'
      : '<span class="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">⏳ নতুন অপেক্ষারত</span>';

    const stars = Array.from({ length: 5 }).map((_, i) => `
      <i class="fas fa-star text-xs ${i < (f.rating || 5) ? 'text-amber-400' : 'text-slate-700'}"></i>
    `).join('');

    const formattedDate = f.date ? new Date(f.date).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const cleanPhone = (f.contact || '').replace(/[^0-9]/g, '');

    return `
      <div class="glass-card rounded-2xl p-4 sm:p-5 space-y-3 border hover:border-rose-500/40 transition">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm">
              <i class="fas fa-user"></i>
            </div>
            <div>
              <h5 class="text-sm font-black text-white flex items-center gap-2">
                <span>${f.name || 'বেনামী গ্রাহক'}</span>
                ${statusBadge}
              </h5>
              <div class="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                <span><i class="fas fa-phone text-[10px] text-emerald-400 mr-1"></i>${f.contact || 'মোবাইল উল্লেখ নেই'}</span>
                <span>•</span>
                <span>${f.category || 'সাধারণ মতামত'}</span>
                ${cleanPhone.length >= 11 ? `
                  <a href="https://wa.me/88${cleanPhone}?text=${encodeURIComponent('ধন্যবাদ আপনার মতামতের জন্য! ফয়জার কম্পিউটার থেকে যোগাযোগ করা হচ্ছে।')}" target="_blank" class="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white text-[10px] font-bold inline-flex items-center gap-1 transition">
                    <i class="fab fa-whatsapp"></i> হোয়াটসঅ্যাপ রিপ্লাই
                  </a>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 self-end sm:self-auto">
            <div class="flex items-center gap-0.5">${stars}</div>
            <span class="text-[11px] text-slate-500">${formattedDate}</span>
          </div>
        </div>

        <p class="text-xs text-slate-200 leading-relaxed font-normal bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          "${f.message}"
        </p>

        <div class="flex items-center justify-between pt-1">
          <span class="text-[10px] text-slate-500 font-mono">ID: ${f.id}</span>
          
          <div class="flex items-center gap-2">
            ${!isAppr ? `
              <button onclick="approveFeedback('${f.id}')" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition flex items-center gap-1">
                <i class="fas fa-check"></i> অনুমোদন করুন
              </button>
            ` : `
              <button onclick="unapproveFeedback('${f.id}')" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition flex items-center gap-1">
                <i class="fas fa-rotate-left"></i> পেন্ডিং করুন
              </button>
            `}
            <button onclick="deleteFeedback('${f.id}')" class="px-2.5 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900 text-rose-300 text-xs transition" title="মুছে ফেলুন">
              <i class="fas fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function approveFeedback(id) {
  const item = feedbacksList.find(f => f.id === id);
  if (item) {
    item.status = 'approved';
    renderAdminFeedbacks();
    updateDashboardMetrics();
    await saveFeedbacksToServer();
    if (typeof FayzarFirebaseClient !== 'undefined' && FayzarFirebaseClient.updateFeedbackStatus) {
      FayzarFirebaseClient.updateFeedbackStatus(id, 'approved').catch(() => {});
    }
    showToast('গ্রাহকের মতামত সফলভাবে অনুমোদিত হয়েছে!', 'success');
  }
}

async function unapproveFeedback(id) {
  const item = feedbacksList.find(f => f.id === id);
  if (item) {
    item.status = 'pending';
    renderAdminFeedbacks();
    updateDashboardMetrics();
    await saveFeedbacksToServer();
    if (typeof FayzarFirebaseClient !== 'undefined' && FayzarFirebaseClient.updateFeedbackStatus) {
      FayzarFirebaseClient.updateFeedbackStatus(id, 'pending').catch(() => {});
    }
    showToast('মতামতটি অপেক্ষারত তালিকায় স্থানান্তর করা হয়েছে।', 'info');
  }
}

async function deleteFeedback(id) {
  if (confirm('আপনি কি নিশ্চিতভাবে এই মতামতটি মুছে ফেলতে চান?')) {
    feedbacksList = feedbacksList.filter(f => f.id !== id);
    renderAdminFeedbacks();
    updateDashboardMetrics();
    await saveFeedbacksToServer();
    if (typeof FayzarFirebaseClient !== 'undefined' && FayzarFirebaseClient.deleteFeedback) {
      FayzarFirebaseClient.deleteFeedback(id).catch(() => {});
    }
    showToast('মতামতটি মুছে ফেলা হয়েছে!', 'info');
  }
}

async function saveFeedbacksToServer() {
  localStorage.setItem('fayzar_contact_feedbacks', JSON.stringify(feedbacksList));
  try {
    const res = await fetch('/api/save-feedbacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbacksList)
    });
    if (res.ok) {
      console.log('Feedbacks synced to server');
    }
  } catch (err) {}
}

function exportFeedbacksCSV() {
  if (feedbacksList.length === 0) {
    showToast('এক্সপোর্ট করার জন্য কোনো মতামত নেই!', 'warning');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
  csvContent += 'ID,নাম,মোবাইল/ইমেইল,ক্যাটাগরি,রেটিং,স্ট্যাটাস,তারিখ,মন্তব্য\r\n';

  feedbacksList.forEach(f => {
    const row = [
      `"${f.id}"`,
      `"${(f.name || '').replace(/"/g, '""')}"`,
      `"${(f.contact || '').replace(/"/g, '""')}"`,
      `"${(f.category || '').replace(/"/g, '""')}"`,
      `"${f.rating || 5}"`,
      `"${f.status || 'pending'}"`,
      `"${f.date || ''}"`,
      `"${(f.message || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(',') + '\r\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `fayzar_customer_feedbacks_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('গ্রাহক মতামতের CSV ফাইল ডাউনলোড হয়েছে!', 'success');
}

// ১২. গ্লোবাল সেভ ও ব্যাকআপ ডেটা
// =========================================================================
async function saveAllToServer() {
  showToast('সার্ভারে সকল ডেটা সিঙ্ক করা হচ্ছে...', 'info');

  await saveSiteConfig();
  await saveNoticesToServer();
  await saveServicesToServer();
  await saveDictionaryToServer();
  await saveFeedbacksToServer();

  // Save candidates too
  try {
    await fetch('/api/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidatesList)
    });
  } catch(e) {}
  localStorage.setItem('fayzar_admin_candidates', JSON.stringify(candidatesList));

  showToast('আলহামদুলিল্লাহ! সমস্ত পরিবর্তন সার্ভারে সংরক্ষিত হয়েছে।', 'success');
}

function exportFullBackupJSON() {
  const fullBackup = {
    version: '2.5',
    exportedAt: new Date().toISOString(),
    siteConfig,
    notices: noticesList,
    services: servicesList,
    dictionary: dictionaryList,
    feedbacks: feedbacksList,
    candidates: candidatesList
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `fayzar_complete_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('সম্পূর্ণ ওয়েবসাইটের ব্যাকআপ JSON ফাইল ডাউনলোড হয়েছে!', 'success');
}

function importBackupFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup.notices && !backup.services && !backup.siteConfig && !backup.candidates) {
        showToast('অবৈধ ব্যাকআপ ফাইল!', 'error');
        return;
      }

      if (confirm('আপনি কি এই ব্যাকআপ ফাইলটি রিস্টোর করতে চান? বর্তমান ডেটা প্রতিস্থাপিত হবে।')) {
        if (backup.notices) noticesList = backup.notices;
        if (backup.services) servicesList = backup.services;
        if (backup.siteConfig) siteConfig = backup.siteConfig;
        if (backup.feedbacks) feedbacksList = backup.feedbacks;
        if (backup.dictionary) dictionaryList = backup.dictionary;
        if (backup.candidates) candidatesList = backup.candidates;

        localStorage.setItem('fayzar_notices', JSON.stringify(noticesList));
        localStorage.setItem('fayzar_services', JSON.stringify(servicesList));
        localStorage.setItem('fayzar_site_config', JSON.stringify(siteConfig));
        localStorage.setItem('fayzar_contact_feedbacks', JSON.stringify(feedbacksList));
        localStorage.setItem('fayzar_converter_dict', JSON.stringify(dictionaryList));
        localStorage.setItem('fayzar_admin_candidates', JSON.stringify(candidatesList));

        try {
          await fetch('/api/import-backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backup)
          });
        } catch(err) {}

        showToast('ব্যাকআপ সফলভাবে রিস্টোর হয়েছে! পেজ রিলোড হচ্ছে...', 'success');
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err) {
      showToast('JSON ফাইল পার্স করতে ত্রুটি হয়েছে!', 'error');
    }
  };
  reader.readAsText(file);
}

// =========================================================================
// চাকরি প্রার্থী কন্ট্রোল সেন্টার ফাংশনসমূহ (Job Candidates Manager)
// =========================================================================
function renderAdminCandidates(query = '') {
  const container = document.getElementById('admin-candidates-list');
  if (!container) return;

  let list = candidatesList;
  const q = (query || '').trim().toLowerCase();

  if (q) {
    list = list.filter(c => {
      const m = c.semanticMap || {};
      const str = `${c.name} ${m.applicant_name} ${m.applicant_name_bn} ${m.mobile_no} ${m.nid_no}`.toLowerCase();
      return str.includes(q);
    });
  }

  const cBadge = document.getElementById('tab-badge-candidates');
  if (cBadge) cBadge.textContent = candidatesList.length;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center glass-card rounded-3xl border border-slate-700/80 p-8">
        <i class="fas fa-users-slash text-4xl text-slate-500 mb-3"></i>
        <h4 class="text-base font-bold text-slate-300">কোনো চাকরি প্রার্থী পাওয়া যায়নি</h4>
        <p class="text-xs text-slate-500 mt-1">নতুন প্রার্থী যোগ করতে উপরের "নতুন প্রার্থী যুক্ত করুন" বোতামে চাপুন।</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(c => {
    const m = c.semanticMap || {};
    const name = m.applicant_name || c.name;
    const nameBn = m.applicant_name_bn || '';
    const mobile = m.mobile_no || c.userMobile || '-';
    const nid = m.nid_no || '-';
    const dob = m.dob_day ? `${m.dob_day}/${m.dob_month}/${m.dob_year}` : (m.dob_full || '-');
    const ssc = m.ssc_exam ? `SSC (${m.ssc_board || ''} - ${m.ssc_gpa || ''})` : '';
    const hsc = m.hsc_exam ? `HSC (${m.hsc_board || ''} - ${m.hsc_gpa || ''})` : '';
    const cleanMobile = mobile.replace(/[^0-9]/g, '');

    return `
      <div class="glass-card rounded-3xl p-5 border border-slate-700 hover:border-lime-500/50 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-lg">
        <div>
          <div class="flex items-start justify-between gap-3 mb-2">
            <div>
              <span class="px-2 py-0.5 rounded-full ${c.isCloud ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-lime-500/20 text-lime-400 border border-lime-500/30'} text-[10px] font-black">
                ${c.isCloud ? '☁️ ক্লাউড প্রোফাইল' : '👤 লোকাল প্রার্থী'}
              </span>
              <h4 class="text-sm font-black text-white mt-1.5">${c.name || name}</h4>
              <p class="text-xs text-slate-400 font-semibold">${nameBn}</p>
            </div>
            ${cleanMobile.length >= 11 ? `
              <a href="https://wa.me/88${cleanMobile}?text=${encodeURIComponent(`আসসালামু আলাইকুম ${name}, আপনার চাকরির আবেদনের বিষয়ে ফয়জার কম্পিউটার থেকে মেসেজ দেয়া হলো।`)}" target="_blank" title="হোয়াটসঅ্যাপে মেসেজ পাঠান" class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center text-xs transition">
                <i class="fab fa-whatsapp"></i>
              </a>
            ` : ''}
          </div>

          <div class="bg-slate-900/80 rounded-2xl p-3 border border-slate-800 space-y-1.5 text-xs text-slate-300">
            <div class="flex justify-between"><span class="text-slate-500">পিতার নাম:</span> <strong>${m.father_name || m.father_name_bn || '-'}</strong></div>
            <div class="flex justify-between"><span class="text-slate-500">মোবাইল:</span> <strong class="text-lime-400 font-mono">${mobile}</strong></div>
            <div class="flex justify-between"><span class="text-slate-500">এনআইডি:</span> <strong class="font-mono">${nid}</strong></div>
            <div class="flex justify-between"><span class="text-slate-500">জন্মতারিখ:</span> <strong>${dob}</strong></div>
            <div class="flex justify-between border-t border-slate-800 pt-1 text-[11px]"><span class="text-slate-500">যোগ্যতা:</span> <span class="text-amber-400 font-bold">${[ssc, hsc].filter(Boolean).join(', ') || 'উল্লেখ নেই'}</span></div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <button onclick="printCandidateBiodata('${c.id}')" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition">
            <i class="fas fa-print text-blue-400"></i> প্রিন্ট
          </button>
          <div class="flex items-center gap-1.5">
            <button onclick="openCandidateModal('${c.id}')" class="px-3 py-1.5 rounded-xl bg-lime-600/20 hover:bg-lime-600 text-lime-300 hover:text-white font-bold text-xs flex items-center gap-1 transition">
              <i class="fas fa-edit"></i> এডিট
            </button>
            <button onclick="deleteCandidate('${c.id}')" class="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs transition" title="মুছে ফেলুন">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function switchCandidateModalTab(tabKey) {
  const tabs = ['personal', 'address', 'education', 'other'];
  tabs.forEach(t => {
    const btn = document.getElementById(`btn-ac-tab-${t}`);
    const box = document.getElementById(`ac-tab-${t}`);
    if (t === tabKey) {
      btn.className = 'px-3.5 py-1.5 rounded-xl bg-lime-600 text-white font-bold';
      box?.classList.remove('hidden');
    } else {
      btn.className = 'px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700';
      box?.classList.add('hidden');
    }
  });
}

function openCandidateModal(candId = null) {
  const modal = document.getElementById('admin-candidate-modal');
  const form = document.getElementById('admin-candidate-form');
  const title = document.getElementById('admin-candidate-modal-title');
  if (!modal || !form) return;

  form.reset();
  switchCandidateModalTab('personal');

  if (candId) {
    const c = candidatesList.find(item => item.id === candId);
    if (!c) return;
    document.getElementById('ac-edit-id').value = c.id;
    title.innerHTML = `<i class="fas fa-user-pen text-lime-400"></i> প্রার্থী তথ্য সম্পাদন: ${c.name || ''}`;

    const m = c.semanticMap || {};
    document.getElementById('ac-name').value = c.name || '';
    document.getElementById('ac-applicant-name').value = m.applicant_name || '';
    document.getElementById('ac-applicant-name-bn').value = m.applicant_name_bn || '';
    document.getElementById('ac-mobile').value = m.mobile_no || c.userMobile || '';
    document.getElementById('ac-father-name').value = m.father_name || '';
    document.getElementById('ac-father-name-bn').value = m.father_name_bn || '';
    document.getElementById('ac-mother-name').value = m.mother_name || '';
    document.getElementById('ac-mother-name-bn').value = m.mother_name_bn || '';
    document.getElementById('ac-nid').value = m.nid_no || '';
    document.getElementById('ac-dob-day').value = m.dob_day || '';
    document.getElementById('ac-dob-month').value = m.dob_month || '';
    document.getElementById('ac-dob-year').value = m.dob_year || '';
    document.getElementById('ac-gender').value = m.gender || 'Male';

    // Address
    document.getElementById('ac-pr-care').value = m.present_care_of || '';
    document.getElementById('ac-pr-village').value = m.present_village || '';
    document.getElementById('ac-pr-dist').value = m.present_district || '';
    document.getElementById('ac-pr-thana').value = m.present_upazila || '';
    document.getElementById('ac-pr-code').value = m.present_post_code || '';

    // SSC
    document.getElementById('ac-ssc-board').value = m.ssc_board || '';
    document.getElementById('ac-ssc-roll').value = m.ssc_roll || '';
    document.getElementById('ac-ssc-reg').value = m.ssc_reg || '';
    document.getElementById('ac-ssc-gpa').value = m.ssc_gpa || '';
    document.getElementById('ac-ssc-year').value = m.ssc_year || '';

    // HSC
    document.getElementById('ac-hsc-board').value = m.hsc_board || '';
    document.getElementById('ac-hsc-roll').value = m.hsc_roll || '';
    document.getElementById('ac-hsc-reg').value = m.hsc_reg || '';
    document.getElementById('ac-hsc-gpa').value = m.hsc_gpa || '';
    document.getElementById('ac-hsc-year').value = m.hsc_year || '';

    // Grad
    document.getElementById('ac-grad-exam').value = m.grad_exam || '';
    document.getElementById('ac-grad-inst').value = m.grad_institute || '';
    document.getElementById('ac-grad-sub').value = m.grad_subject || '';
    document.getElementById('ac-grad-gpa').value = m.grad_result || m.grad_cgpa || '';
  } else {
    document.getElementById('ac-edit-id').value = '';
    title.innerHTML = `<i class="fas fa-user-plus text-lime-400"></i> নতুন প্রার্থী যুক্ত করুন`;
  }

  modal.classList.remove('hidden');
}

function closeCandidateModal() {
  document.getElementById('admin-candidate-modal')?.classList.add('hidden');
}

async function handleCandidateSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('ac-edit-id').value;
  const profileName = document.getElementById('ac-name').value.trim();

  const semanticMap = {
    applicant_name: document.getElementById('ac-applicant-name').value.trim(),
    applicant_name_bn: document.getElementById('ac-applicant-name-bn').value.trim(),
    mobile_no: document.getElementById('ac-mobile').value.trim(),
    confirm_mobile: document.getElementById('ac-mobile').value.trim(),
    father_name: document.getElementById('ac-father-name').value.trim(),
    father_name_bn: document.getElementById('ac-father-name-bn').value.trim(),
    mother_name: document.getElementById('ac-mother-name').value.trim(),
    mother_name_bn: document.getElementById('ac-mother-name-bn').value.trim(),
    nid_no: document.getElementById('ac-nid').value.trim(),
    dob_day: document.getElementById('ac-dob-day').value.trim(),
    dob_month: document.getElementById('ac-dob-month').value.trim(),
    dob_year: document.getElementById('ac-dob-year').value.trim(),
    dob_full: `${document.getElementById('ac-dob-year').value}-${document.getElementById('ac-dob-month').value}-${document.getElementById('ac-dob-day').value}`,
    gender: document.getElementById('ac-gender').value,
    religion: document.getElementById('ac-religion')?.value || 'Islam',
    blood_group: document.getElementById('ac-blood')?.value || 'B+',
    quota: document.getElementById('ac-quota')?.value || 'Non-Quota',

    // Address
    present_care_of: document.getElementById('ac-pr-care').value.trim(),
    present_village: document.getElementById('ac-pr-village').value.trim(),
    present_district: document.getElementById('ac-pr-dist').value.trim(),
    present_upazila: document.getElementById('ac-pr-thana').value.trim(),
    present_post_code: document.getElementById('ac-pr-code').value.trim(),

    // SSC
    ssc_exam: 'S.S.C',
    ssc_board: document.getElementById('ac-ssc-board').value.trim(),
    ssc_roll: document.getElementById('ac-ssc-roll').value.trim(),
    ssc_reg: document.getElementById('ac-ssc-reg').value.trim(),
    ssc_gpa: document.getElementById('ac-ssc-gpa').value.trim(),
    ssc_year: document.getElementById('ac-ssc-year').value.trim(),

    // HSC
    hsc_exam: 'H.S.C',
    hsc_board: document.getElementById('ac-hsc-board').value.trim(),
    hsc_roll: document.getElementById('ac-hsc-roll').value.trim(),
    hsc_reg: document.getElementById('ac-hsc-reg').value.trim(),
    hsc_gpa: document.getElementById('ac-hsc-gpa').value.trim(),
    hsc_year: document.getElementById('ac-hsc-year').value.trim(),

    // Grad
    grad_exam: document.getElementById('ac-grad-exam').value.trim(),
    grad_institute: document.getElementById('ac-grad-inst').value.trim(),
    grad_subject: document.getElementById('ac-grad-sub').value.trim(),
    grad_result: document.getElementById('ac-grad-gpa').value.trim()
  };

  let candidateObj = null;

  if (editId) {
    const idx = candidatesList.findIndex(c => c.id === editId);
    if (idx !== -1) {
      candidatesList[idx].name = profileName;
      candidatesList[idx].updatedAt = new Date().toISOString();
      candidatesList[idx].semanticMap = semanticMap;
      candidateObj = candidatesList[idx];
    }
  } else {
    candidateObj = {
      id: 'cand_' + Date.now(),
      name: profileName,
      updatedAt: new Date().toISOString(),
      semanticMap: semanticMap
    };
    candidatesList.unshift(candidateObj);
  }

  // 1. Save to LocalStorage
  localStorage.setItem('fayzar_admin_candidates', JSON.stringify(candidatesList));

  // 2. Try Node Backend Save
  try {
    await fetch('/api/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidatesList)
    });
  } catch (err) {}

  // 3. Try Firebase Cloud Save
  if (typeof FayzarFirebaseClient !== 'undefined' && candidateObj) {
    if (candidateObj.isCloud && candidateObj.userMobile) {
      FayzarFirebaseClient.saveUserFile(candidateObj.userMobile, candidateObj).catch(() => {});
    }
    if (FayzarFirebaseClient.saveGlobalCandidate) {
      FayzarFirebaseClient.saveGlobalCandidate(candidateObj).catch(() => {});
    }
  }

  showToast('প্রার্থী সফলভাবে সংরক্ষিত হয়েছে! সকল পিসির এক্সটেনশনে সিঙ্ক হবে।', 'success');
  closeCandidateModal();
  updateDashboardMetrics();
  renderAdminCandidates();
}

async function deleteCandidate(candId) {
  const c = candidatesList.find(item => item.id === candId);
  if (!c) return;

  if (!confirm(`আপনি কি সত্যিই "${c.name}" প্রার্থীর সমস্ত তথ্য মুছে ফেলতে চান?`)) return;

  candidatesList = candidatesList.filter(item => item.id !== candId);
  localStorage.setItem('fayzar_admin_candidates', JSON.stringify(candidatesList));

  try {
    await fetch('/api/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidatesList)
    });
  } catch (err) {}

  if (typeof FayzarFirebaseClient !== 'undefined') {
    if (c.isCloud && c.userMobile) {
      FayzarFirebaseClient.deleteUserFile(c.userMobile, c.id).catch(() => {});
    }
  }

  showToast('প্রার্থী প্রোফাইল মুছে ফেলা হয়েছে।', 'info');
  updateDashboardMetrics();
  renderAdminCandidates();
}

function printCandidateBiodata(candId) {
  const c = candidatesList.find(item => item.id === candId);
  if (!c) return;

  const m = c.semanticMap || {};
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <title>প্রার্থী আবেদন সারাংশ — ${c.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; font-size: 13px; color: #111; line-height: 1.5; }
        .header { text-align: center; border-bottom: 2px solid #065f46; padding-bottom: 12px; margin-bottom: 20px; }
        h1 { margin: 0; font-size: 20px; color: #065f46; }
        .sub { margin: 4px 0 0 0; font-size: 12px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        td, th { border: 1px solid #ccc; padding: 7px 10px; }
        th { background: #f0fdf4; font-weight: bold; text-align: left; }
        .sec { background: #e2e8f0; font-weight: bold; padding: 6px 10px; margin-top: 15px; border-left: 4px solid #065f46; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ফয়জার কম্পিউটার এন্ড ফটোস্ট্যাট — চাকরির আবেদন সারাংশ</h1>
        <p class="sub">ফুলবাড়ী, দিনাজপুর • মোবাইল: 01717-101919</p>
      </div>

      <div class="sec">১. ব্যক্তিগত তথ্য (Personal Details)</div>
      <table>
        <tr><th width="30%">প্রার্থীর নাম (English)</th><td>${m.applicant_name || '-'}</td></tr>
        <tr><th>প্রার্থীর নাম (বাংলা)</th><td>${m.applicant_name_bn || '-'}</td></tr>
        <tr><th>পিতার নাম</th><td>${m.father_name || m.father_name_bn || '-'}</td></tr>
        <tr><th>মাতার নাম</th><td>${m.mother_name || m.mother_name_bn || '-'}</td></tr>
        <tr><th>জন্মতারিখ</th><td>${m.dob_day ? `${m.dob_day}/${m.dob_month}/${m.dob_year}` : (m.dob_full || '-')}</td></tr>
        <tr><th>জাতীয় পরিচয়পত্র (NID)</th><td>${m.nid_no || '-'}</td></tr>
        <tr><th>মোবাইল নম্বর</th><td>${m.mobile_no || '-'}</td></tr>
        <tr><th>লিঙ্গ ও ধর্ম</th><td>${m.gender || 'Male'}, ${m.religion || 'Islam'}</td></tr>
      </table>

      <div class="sec">২. ঠিকানা (Address)</div>
      <table>
        <tr><th>বর্তমান ঠিকানা</th><td>Care of: ${m.present_care_of || ''}, গ্রাম: ${m.present_village || ''}, উপজেলা: ${m.present_upazila || ''}, জেলা: ${m.present_district || ''} - ${m.present_post_code || ''}</td></tr>
      </table>

      <div class="sec">৩. শিক্ষাগত যোগ্যতা (Education)</div>
      <table>
        <tr><th>পরীক্ষা</th><th>বোর্ড/প্রতিষ্ঠান</th><th>রোল নং</th><th>রেজি নং</th><th>ফলাফল</th><th>পাসের সাল</th></tr>
        <tr><td>${m.ssc_exam || 'S.S.C'}</td><td>${m.ssc_board || '-'}</td><td>${m.ssc_roll || '-'}</td><td>${m.ssc_reg || '-'}</td><td>${m.ssc_gpa || '-'}</td><td>${m.ssc_year || '-'}</td></tr>
        <tr><td>${m.hsc_exam || 'H.S.C'}</td><td>${m.hsc_board || '-'}</td><td>${m.hsc_roll || '-'}</td><td>${m.hsc_reg || '-'}</td><td>${m.hsc_gpa || '-'}</td><td>${m.hsc_year || '-'}</td></tr>
        ${m.grad_exam ? `<tr><td>${m.grad_exam}</td><td>${m.grad_institute || '-'}</td><td>-</td><td>-</td><td>${m.grad_result || '-'}</td><td>${m.grad_year || '-'}</td></tr>` : ''}
      </table>

      <script>window.print();</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

async function syncToGitHubFromAdmin() {
  if (!confirm('আপনি কি এই মুহূর্তের সমস্ত ফাইল ও আপডেট ১-ক্লিকে গিটহাবে লাইভ করতে চান?')) return;
  showToast('গিটহাবে আপডেট পাঠানো হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...', 'info');

  try {
    const res = await fetch('/api/sync-github', { method: 'POST' });
    if (res.ok) {
      showToast('গিটহাব সিঙ্ক সফলভাবে শুরু হয়েছে! কিছুক্ষণের মধ্যে লাইভ সাইট আপডেট হয়ে যাবে।', 'success');
    } else {
      showToast('সার্ভার সিঙ্কে সমস্যা হয়েছে। ফোল্ডারের sync-to-github.bat চালান।', 'warning');
    }
  } catch (err) {
    showToast('অফলাইন মোড। fayzar-computer-v2 ফোল্ডারের sync-to-github.bat ফাইলে ডাবল-ক্লিক করুন।', 'info');
  }
}

// =========================================================================
// ৯. স্কুল ও রেজাল্ট কন্ট্রোল সেন্টার (Web Admin Multi-School & PIN Suite)
// =========================================================================
function getSchoolsList() {
  if (Array.isArray(resultsConfig.schools)) return resultsConfig.schools;
  if (Array.isArray(resultsConfig.institutions)) return resultsConfig.institutions;
  return [];
}

function renderAdminSchools(query = '') {
  const container = document.getElementById('admin-schools-container');
  if (!container) return;

  const q = (query || '').toLowerCase().trim();
  const schools = getSchoolsList().filter(s => {
    if (!q) return true;
    const matchId = (s.id || '').toLowerCase().includes(q);
    const matchBn = (s.name_bn || '').toLowerCase().includes(q);
    const matchEn = (s.name_en || '').toLowerCase().includes(q);
    const matchAddr = (s.address_bn || '').toLowerCase().includes(q);
    return matchId || matchBn || matchEn || matchAddr;
  });

  const countBadge = document.getElementById('school-count-badge');
  if (countBadge) countBadge.textContent = `${schools.length} টি প্রতিষ্ঠান`;
  const tabBadge = document.getElementById('tab-badge-schools');
  if (tabBadge) tabBadge.textContent = schools.length;

  if (schools.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400 glass-card rounded-3xl p-8">
        <i class="fas fa-school text-4xl mb-3 block text-slate-600"></i>
        <div class="text-sm font-bold text-slate-300">কোনো শিক্ষা প্রতিষ্ঠান পাওয়া যায়নি</div>
        <p class="text-xs text-slate-500 mt-1">উপরের 'নতুন স্কুল যুক্ত করুন' বাটনে ক্লিক করে নতুন প্রতিষ্ঠান যুক্ত করুন।</p>
      </div>
    `;
    return;
  }

  container.innerHTML = schools.map(sch => {
    const theme = sch.theme_color || '#1e3a8a';
    const teachers = sch.teachers || [];
    const years = (sch.academic_years || ['2025', '2026']).join(', ');
    const watermark = sch.watermark_text || sch.name_bn || 'ফয়জার কম্পিউটার';
    const logoUrl = sch.logo || sch.logo_url || 'assets/images/school-logo.png';
    const masterPin = sch.master_pin || '----';

    return `
      <div class="glass-card rounded-3xl p-5 sm:p-6 border border-slate-700/80 hover:border-emerald-500/40 transition flex flex-col justify-between space-y-4 shadow-xl">
        <div class="space-y-3">
          <!-- Top Tag & Theme -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="w-3.5 h-3.5 rounded-full shadow-sm" style="background-color: ${theme}"></span>
              <span class="font-mono text-[11px] font-bold text-slate-400">#${sch.id}</span>
            </div>
            <div class="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30 font-mono">
              <i class="fas fa-key text-[9px]"></i> মাস্টার পিন: <strong>${masterPin}</strong>
            </div>
          </div>

          <!-- School Info with Logo -->
          <div class="flex items-start gap-3.5">
            <div class="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-1">
              <img src="${logoUrl}" alt="${sch.name_bn}" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><text y=%2228%22 font-size=%2224%22>🏫</text></svg>'" class="w-full h-full object-contain">
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-base font-black text-white truncate hover:text-emerald-400 transition" title="${sch.name_bn}">${sch.name_bn}</h4>
              <div class="text-xs text-slate-400 truncate">${sch.name_en || ''}</div>
              <div class="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                <i class="fas fa-location-dot text-rose-400 text-[10px]"></i>
                <span class="truncate">${sch.address_bn || sch.address_en || 'ফুলবাড়ী, দিনাজপুর'}</span>
              </div>
            </div>
          </div>

          <!-- Badges / Metadata -->
          <div class="grid grid-cols-2 gap-2 text-xs pt-1">
            <div class="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span class="text-[10px] text-slate-500 block">মার্কশীট ওয়াটারমার্ক:</span>
              <span class="font-bold text-slate-200 truncate block font-sans">${watermark}</span>
            </div>
            <div class="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span class="text-[10px] text-slate-500 block">শিক্ষাবর্ষ:</span>
              <span class="font-bold text-slate-200 font-mono text-[11px] truncate block">${years}</span>
            </div>
          </div>

          <!-- Teachers Count Badge -->
          <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs">
            <span class="text-emerald-300 font-bold flex items-center gap-1.5">
              <i class="fas fa-chalkboard-user text-emerald-400"></i> শিক্ষক একাউন্ট:
            </span>
            <span class="font-extrabold text-emerald-200 font-mono">${teachers.length} জন</span>
          </div>
        </div>

        <!-- Action Controls -->
        <div class="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="openSchoolModal('${sch.id}')" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold text-xs transition flex items-center gap-1">
              <i class="fas fa-pen-to-square"></i> <span>এডিট</span>
            </button>
            <button type="button" onclick="openTeacherManagerModal('${sch.id}')" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs transition flex items-center gap-1">
              <i class="fas fa-users-gear"></i> <span>শিক্ষক পিন</span>
            </button>
            <button type="button" onclick="deleteSchool('${sch.id}')" class="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900 text-rose-300 text-xs transition" title="প্রতিষ্ঠান মুছে ফেলুন">
              <i class="fas fa-trash-can"></i>
            </button>
          </div>

          <a href="result-admin.html?school=${sch.id}&tab=spreadsheet&auth=super" target="_blank" class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md" title="${sch.name_bn} এর ফলাফল সরাসরি এডিট করুন">
            <i class="fas fa-table"></i> <span>সরাসরি রেজাল্ট এডিট</span>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function openSchoolModal(schoolId = null) {
  const modal = document.getElementById('school-modal');
  const title = document.getElementById('school-modal-title');
  const form = document.getElementById('school-form');
  if (!modal || !form) return;

  form.reset();

  if (schoolId) {
    const list = getSchoolsList();
    const sch = list.find(s => s.id === schoolId);
    if (sch) {
      document.getElementById('sch-edit-mode').value = sch.id;
      document.getElementById('sch-id').value = sch.id;
      document.getElementById('sch-id').readOnly = true;
      document.getElementById('sch-id').classList.add('opacity-70');
      document.getElementById('sch-master-pin').value = sch.master_pin || '';
      document.getElementById('sch-name-bn').value = sch.name_bn || '';
      document.getElementById('sch-name-en').value = sch.name_en || '';
      document.getElementById('sch-address-bn').value = sch.address_bn || '';
      document.getElementById('sch-address-en').value = sch.address_en || '';
      document.getElementById('sch-watermark').value = sch.watermark_text || '';
      document.getElementById('sch-theme-color').value = sch.theme_color || '#1e3a8a';
      document.getElementById('sch-theme-color-picker').value = sch.theme_color || '#1e3a8a';
      document.getElementById('sch-years').value = (sch.academic_years || ['2025', '2026']).join(', ');
      document.getElementById('sch-logo').value = sch.logo || sch.logo_url || '';
      if (title) title.innerHTML = '<i class="fas fa-pen-to-square text-emerald-400"></i> শিক্ষা প্রতিষ্ঠান তথ্য সম্পাদনা';
    }
  } else {
    document.getElementById('sch-edit-mode').value = 'create';
    document.getElementById('sch-id').readOnly = false;
    document.getElementById('sch-id').classList.remove('opacity-70');
    document.getElementById('sch-theme-color').value = '#1e3a8a';
    document.getElementById('sch-theme-color-picker').value = '#1e3a8a';
    document.getElementById('sch-years').value = '2025, 2026';
    if (title) title.innerHTML = '<i class="fas fa-plus-circle text-emerald-400"></i> নতুন শিক্ষা প্রতিষ্ঠান সংযোজন';
  }

  modal.classList.remove('hidden');
}

function closeSchoolModal() {
  document.getElementById('school-modal')?.classList.add('hidden');
}

async function handleSchoolSubmit(e) {
  e.preventDefault();
  const mode = document.getElementById('sch-edit-mode').value;
  const schId = document.getElementById('sch-id').value.trim().toLowerCase().replace(/\s+/g, '-');
  const masterPin = document.getElementById('sch-master-pin').value.trim();
  const nameBn = document.getElementById('sch-name-bn').value.trim();
  const nameEn = document.getElementById('sch-name-en').value.trim();
  const addrBn = document.getElementById('sch-address-bn').value.trim();
  const addrEn = document.getElementById('sch-address-en').value.trim();
  const watermark = document.getElementById('sch-watermark').value.trim();
  const themeColor = document.getElementById('sch-theme-color').value.trim() || '#1e3a8a';
  const yearsStr = document.getElementById('sch-years').value.trim();
  const logo = document.getElementById('sch-logo').value.trim() || 'assets/images/school-logo.png';

  const years = yearsStr ? yearsStr.split(',').map(y => y.trim()).filter(Boolean) : ['2025', '2026'];

  if (!resultsConfig.schools) resultsConfig.schools = [];
  if (!resultsConfig.institutions) resultsConfig.institutions = resultsConfig.schools;

  if (mode === 'create') {
    if (resultsConfig.schools.some(s => s.id === schId)) {
      showToast('এই আইডি দিয়ে ইতিমধ্যে একটি স্কুল রয়েছে!', 'error');
      return;
    }
    const newSch = {
      id: schId,
      name_bn: nameBn,
      name_en: nameEn,
      address_bn: addrBn,
      address_en: addrEn,
      eiin: "123456",
      logo: logo,
      logo_url: logo,
      watermark_text: watermark,
      theme_color: themeColor,
      master_pin: masterPin,
      academic_years: years,
      exams: [
        {
          id: `annual_${years[0] || '2025'}`,
          name_bn: `বার্ষিক পরীক্ষা - ${years[0] || '২০২৫'}`,
          name_en: `Annual Exam - ${years[0] || '2025'}`,
          year: years[0] || '2025',
          is_published: false
        }
      ],
      classes: resultsConfig.classes || [
        { id: "class_1", name_bn: "১ম শ্রেণি", name_en: "Class 1" },
        { id: "class_2", name_bn: "২য় শ্রেণি", name_en: "Class 2" },
        { id: "class_3", name_bn: "৩য় শ্রেণি", name_en: "Class 3" },
        { id: "class_4", name_bn: "৪র্থ শ্রেণি", name_en: "Class 4" },
        { id: "class_5", name_bn: "৫ম শ্রেণি", name_en: "Class 5" }
      ],
      teachers: []
    };
    resultsConfig.schools.push(newSch);
    resultsConfig.institutions = resultsConfig.schools;
    showToast('নতুন স্কুল সফলভাবে অন্তর্ভুক্ত করা হয়েছে!', 'success');
  } else {
    const idx = resultsConfig.schools.findIndex(s => s.id === mode);
    if (idx !== -1) {
      resultsConfig.schools[idx].name_bn = nameBn;
      resultsConfig.schools[idx].name_en = nameEn;
      resultsConfig.schools[idx].address_bn = addrBn;
      resultsConfig.schools[idx].address_en = addrEn;
      resultsConfig.schools[idx].watermark_text = watermark;
      resultsConfig.schools[idx].theme_color = themeColor;
      resultsConfig.schools[idx].master_pin = masterPin;
      resultsConfig.schools[idx].academic_years = years;
      resultsConfig.schools[idx].logo = logo;
      resultsConfig.schools[idx].logo_url = logo;

      if (resultsConfig.institution && resultsConfig.institution.id === mode) {
        resultsConfig.institution.name_bn = nameBn;
        resultsConfig.institution.name_en = nameEn;
        resultsConfig.institution.address_bn = addrBn;
        resultsConfig.institution.address_en = addrEn;
        resultsConfig.institution.logo = logo;
      }
      showToast('স্কুলের তথ্য সফলভাবে আপডেট হয়েছে!', 'success');
    }
  }

  closeSchoolModal();
  renderAdminSchools();
  updateDashboardMetrics();
  await saveResultsConfigToServer();
}

async function deleteSchool(schoolId) {
  const sch = getSchoolsList().find(s => s.id === schoolId);
  if (!sch) return;

  if (!confirm(`আপনি কি নিশ্চিত যে '${sch.name_bn}' এর সমস্ত সেটিংস ও কনফিগ মুছে ফেলতে চান?`)) return;

  resultsConfig.schools = (resultsConfig.schools || []).filter(s => s.id !== schoolId);
  resultsConfig.institutions = resultsConfig.schools;

  showToast('স্কুলটি মুছে ফেলা হয়েছে।', 'info');
  renderAdminSchools();
  updateDashboardMetrics();
  await saveResultsConfigToServer();
}

function openTeacherManagerModal(schoolId) {
  currentSelectedSchoolId = schoolId;
  const sch = getSchoolsList().find(s => s.id === schoolId);
  if (!sch) return;

  const modal = document.getElementById('teacher-manager-modal');
  const title = document.getElementById('tm-school-name-display');
  if (title) title.textContent = `${sch.name_bn} — শিক্ষক ও পিন ব্যবস্থাপনা`;

  renderTeacherListForSchool(schoolId);
  modal?.classList.remove('hidden');
}

function closeTeacherManagerModal() {
  document.getElementById('teacher-manager-modal')?.classList.add('hidden');
}

function renderTeacherListForSchool(schoolId) {
  const sch = getSchoolsList().find(s => s.id === schoolId);
  if (!sch) return;

  const tbody = document.getElementById('tm-teacher-table-body');
  const countDisplay = document.getElementById('tm-count-display');
  const teachers = sch.teachers || [];

  if (countDisplay) countDisplay.textContent = `মোট ${teachers.length} জন শিক্ষক`;

  if (!tbody) return;
  if (teachers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-slate-400">
          এই স্কুলে এখনো কোনো সহকারী শিক্ষক পিন যোগ করা হয়নি।<br>
          <span class="text-xs text-slate-500">মাস্টার অ্যাডমিন পিন দিয়ে পুরো স্কুলের সব তথ্য একাই নিয়ন্ত্রণ করা যাবে।</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = teachers.map(t => {
    const subjects = (t.assigned_subjects || []).map(sub => 
      `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 mr-1 mb-1">${sub}</span>`
    ).join('');
    const classes = (t.classes || ['all']).join(', ');

    return `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="py-2.5 px-3 font-bold text-white">
          <div>${t.name}</div>
          <div class="font-mono text-[10px] text-slate-500">ID: ${t.id}</div>
        </td>
        <td class="py-2.5 px-3 text-center">
          <span class="px-2 py-0.5 rounded font-mono text-xs font-black bg-slate-800 text-amber-300 border border-slate-700 tracking-wider">${t.pin}</span>
        </td>
        <td class="py-2.5 px-3 max-w-[220px]">
          ${subjects || '<span class="text-slate-500">সব বিষয়</span>'}
        </td>
        <td class="py-2.5 px-3 font-mono text-[11px] text-slate-300">
          ${classes}
        </td>
        <td class="py-2.5 px-3 text-right whitespace-nowrap">
          <button type="button" onclick="openTeacherEditModal('${schoolId}', '${t.id}')" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-bold transition mr-1">
            <i class="fas fa-pen"></i>
          </button>
          <button type="button" onclick="deleteTeacher('${schoolId}', '${t.id}')" class="px-2 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-300 text-xs transition">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openTeacherEditModal(schoolId, teacherId = null) {
  const modal = document.getElementById('teacher-edit-modal');
  const title = document.getElementById('teacher-edit-modal-title');
  const form = document.getElementById('teacher-edit-form');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('te-school-id').value = schoolId;
  document.getElementById('te-teacher-id').value = teacherId || '';

  const sch = getSchoolsList().find(s => s.id === schoolId);

  if (teacherId && sch) {
    const t = (sch.teachers || []).find(x => x.id === teacherId);
    if (t) {
      document.getElementById('te-name').value = t.name || '';
      document.getElementById('te-pin').value = t.pin || '';
      document.getElementById('te-subjects').value = (t.assigned_subjects || []).join(', ');
      document.getElementById('te-classes').value = (t.classes || ['all']).join(', ');
      if (title) title.innerHTML = '<i class="fas fa-user-pen text-emerald-400"></i> শিক্ষক তথ্য সম্পাদনা';
    }
  } else {
    document.getElementById('te-classes').value = 'all';
    if (title) title.innerHTML = '<i class="fas fa-user-plus text-emerald-400"></i> নতুন শিক্ষক সংযোজন';
  }

  modal.classList.remove('hidden');
}

function closeTeacherEditModal() {
  document.getElementById('teacher-edit-modal')?.classList.add('hidden');
}

async function handleTeacherSubmit(e) {
  e.preventDefault();
  const schoolId = document.getElementById('te-school-id').value;
  const teacherId = document.getElementById('te-teacher-id').value;
  const name = document.getElementById('te-name').value.trim();
  const pin = document.getElementById('te-pin').value.trim();
  const subjectsStr = document.getElementById('te-subjects').value.trim();
  const classesStr = document.getElementById('te-classes').value.trim() || 'all';

  const assignedSubjects = subjectsStr.split(',').map(s => s.trim()).filter(Boolean);
  const classes = classesStr.split(',').map(c => c.trim()).filter(Boolean);

  const sch = getSchoolsList().find(s => s.id === schoolId);
  if (!sch) return;
  if (!Array.isArray(sch.teachers)) sch.teachers = [];

  if (teacherId) {
    const t = sch.teachers.find(x => x.id === teacherId);
    if (t) {
      t.name = name;
      t.pin = pin;
      t.assigned_subjects = assignedSubjects;
      t.classes = classes;
      showToast('শিক্ষকের তথ্য সফলভাবে আপডেট হয়েছে!', 'success');
    }
  } else {
    const newId = `${sch.id.substring(0, 3).toUpperCase()}-T${Math.floor(100 + Math.random() * 900)}`;
    sch.teachers.push({
      id: newId,
      name: name,
      pin: pin,
      assigned_subjects: assignedSubjects,
      classes: classes
    });
    showToast('নতুন শিক্ষক সফলভাবে যুক্ত করা হয়েছে!', 'success');
  }

  closeTeacherEditModal();
  renderTeacherListForSchool(schoolId);
  renderAdminSchools();
  await saveResultsConfigToServer();
}

async function deleteTeacher(schoolId, teacherId) {
  const sch = getSchoolsList().find(s => s.id === schoolId);
  if (!sch || !Array.isArray(sch.teachers)) return;

  if (!confirm('আপনি কি এই শিক্ষকের একাউন্ট ও পিন মুছে ফেলতে চান?')) return;

  sch.teachers = sch.teachers.filter(t => t.id !== teacherId);
  showToast('শিক্ষক একাউন্ট মুছে ফেলা হয়েছে।', 'info');
  renderTeacherListForSchool(schoolId);
  renderAdminSchools();
  await saveResultsConfigToServer();
}

async function updateFooterCredit() {
  const credit = document.getElementById('cfg-global-footer-credit')?.value.trim();
  if (!credit) return;

  resultsConfig.global_footer_credit = credit;
  await saveResultsConfigToServer();
  showToast('মার্কশীটের শপ ফুটার ক্রেডিট সফলভাবে আপডেট হয়েছে!', 'success');
}

async function saveResultsConfigToServer() {
  try {
    localStorage.setItem('fayzar_results_config', JSON.stringify(resultsConfig));
    const res = await fetch('/api/results/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultsConfig)
    });
    if (res.ok) {
      showToast('রেজাল্ট কনফিগারেশন সফলভাবে সার্ভারে সংরক্ষিত হয়েছে!', 'success');
    } else {
      showToast('রেজাল্ট কনফিগ লোকাল স্টোরেজে সংরক্ষিত হয়েছে।', 'info');
    }
  } catch (err) {
    showToast('অফলাইন মোড: কনফিগ লোকাল ব্রাউজারে সংরক্ষিত হয়েছে।', 'info');
  }
}

async function saveAllToServer() {
  showToast('সমস্ত ডেটা সার্ভারে সংরক্ষণ করা হচ্ছে...', 'info');
  let successCount = 0;

  try {
    await saveSiteConfig();
    successCount++;
  } catch(e) {}

  try {
    const resN = await fetch('/api/save-notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noticesList)
    });
    if (resN.ok) successCount++;
  } catch(e) {}

  try {
    const resS = await fetch('/api/save-services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(servicesList)
    });
    if (resS.ok) successCount++;
  } catch(e) {}

  try {
    const resF = await fetch('/api/save-feedbacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbacksList)
    });
    if (resF.ok) successCount++;
  } catch(e) {}

  try {
    const resD = await fetch('/api/save-dictionary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dictionaryList)
    });
    if (resD.ok) successCount++;
  } catch(e) {}

  try {
    const resC = await fetch('/api/save-candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidatesList)
    });
    if (resC.ok) successCount++;
  } catch(e) {}

  try {
    await saveResultsConfigToServer();
    successCount++;
  } catch(e) {}

  showToast('সমস্ত নোটিশ, সেবা, প্রার্থী ও রেজাল্ট কনফিগ সফলভাবে সার্ভারে সংরক্ষিত হয়েছে!', 'success');
}

// স্ক্রিপ্ট এক্সিকিউশন
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
