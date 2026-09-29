/**
 * Fayzar Job Portal Controller Engine
 * Handles Mobile+PIN Auth, Multi-File Management, and 300x300/300x80 Canvas Resizing
 */

let currentUser = null;
let userFilesList = [];

// 1. Check Previous Login on Startup
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('fayzar_portal_user');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      showDashboardView();
    } catch (e) {
      showLoginView();
    }
  } else {
    showLoginView();
  }
});

function switchAuthMode(mode) {
  const loginTab = document.getElementById('tab-btn-auth-login');
  const regTab = document.getElementById('tab-btn-auth-register');
  const loginForm = document.getElementById('portal-login-form');
  const regForm = document.getElementById('portal-register-form');
  if (!loginTab || !regTab || !loginForm || !regForm) return;

  if (mode === 'register') {
    regTab.className = 'py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 bg-emerald-600 text-white shadow-md';
    loginTab.className = 'py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 text-slate-400 hover:text-white';
    loginForm.classList.add('hidden');
    regForm.classList.remove('hidden');
  } else {
    loginTab.className = 'py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 bg-emerald-600 text-white shadow-md';
    regTab.className = 'py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 text-slate-400 hover:text-white';
    regForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  }
}

function togglePortalPinVisibility(inputId = 'p-login-pin', iconId = 'p-pin-eye') {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input || !icon) return;

  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

async function handlePortalRegister(e) {
  e.preventDefault();
  const name = document.getElementById('p-reg-name').value.trim();
  const mobile = document.getElementById('p-reg-mobile').value.trim();
  const pin = document.getElementById('p-reg-pin').value.trim();
  const pinConfirm = document.getElementById('p-reg-pin-confirm').value.trim();
  const errBox = document.getElementById('p-reg-error');
  const submitBtn = document.getElementById('btn-reg-submit');

  errBox.classList.add('hidden');

  const cleanMobile = mobile.replace(/[^0-9]/g, '');
  if (cleanMobile.length < 11) {
    errBox.textContent = 'সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন!';
    errBox.classList.remove('hidden');
    return;
  }
  if (pin.length < 4) {
    errBox.textContent = 'কমপক্ষে ৪ ডিজিটের গোপন পিন নম্বর দিন!';
    errBox.classList.remove('hidden');
    return;
  }
  if (pin !== pinConfirm) {
    errBox.textContent = 'উভয় পিন নম্বর একই হতে হবে!';
    errBox.classList.remove('hidden');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> অ্যাকাউন্ট তৈরি হচ্ছে...';

  try {
    const res = await FayzarFirebaseClient.registerOrLogin(cleanMobile, pin, name);
    if (res.success) {
      currentUser = res.user;
      localStorage.setItem('fayzar_portal_user', JSON.stringify(currentUser));
      showDashboardView();
    } else {
      errBox.textContent = res.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে!';
      errBox.classList.remove('hidden');
    }
  } catch (err) {
    errBox.textContent = 'সার্ভার ত্রুটি: ' + err.message;
    errBox.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>🚀 নতুন একাউন্ট তৈরি করুন</span>';
  }
}

function showLoginView() {
  document.getElementById('portal-login-view')?.classList.remove('hidden');
  document.getElementById('portal-dashboard-view')?.classList.add('hidden');
  const navStatus = document.getElementById('auth-nav-status');
  if (navStatus) navStatus.innerHTML = '';
}

function showDashboardView() {
  document.getElementById('portal-login-view')?.classList.add('hidden');
  document.getElementById('portal-dashboard-view')?.classList.remove('hidden');

  if (currentUser) {
    const avatar = document.getElementById('p-dash-avatar');
    const nameEl = document.getElementById('p-dash-name');
    const mobEl = document.getElementById('p-dash-mobile');

    if (avatar) avatar.textContent = (currentUser.name || 'U').charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = currentUser.name || `ব্যবহারকারী (${currentUser.mobile.slice(-4)})`;
    if (mobEl) mobEl.textContent = currentUser.mobile;

    const navStatus = document.getElementById('auth-nav-status');
    if (navStatus) {
      navStatus.innerHTML = `
        <span class="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5">
          <i class="fas fa-user-circle"></i> <span>${currentUser.mobile.slice(-4)}</span>
        </span>
      `;
    }

    loadUserFiles();
  }
}

// 2. Handle Login / Registration
async function handlePortalLogin(e) {
  e.preventDefault();
  const mobile = document.getElementById('p-login-mobile').value.trim();
  const pin = document.getElementById('p-login-pin').value.trim();
  const errBox = document.getElementById('p-login-error');
  const submitBtn = document.getElementById('btn-login-submit');

  errBox.classList.add('hidden');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> যাচাই হচ্ছে...';

  try {
    const res = await FayzarFirebaseClient.registerOrLogin(mobile, pin);
    if (res.success) {
      currentUser = res.user;
      localStorage.setItem('fayzar_portal_user', JSON.stringify(currentUser));
      showDashboardView();
    } else {
      errBox.textContent = res.error || 'লগইন ব্যর্থ হয়েছে!';
      errBox.classList.remove('hidden');
    }
  } catch (err) {
    errBox.textContent = 'সার্ভার সমস্যা: ' + err.message;
    errBox.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>লগইন / প্রবেশ করুন</span> <i class="fas fa-arrow-right"></i>';
  }
}

function handlePortalLogout() {
  if (confirm('আপনি কি নিশ্চিত যে লগআউট করতে চান?')) {
    currentUser = null;
    userFilesList = [];
    localStorage.removeItem('fayzar_portal_user');
    showLoginView();
  }
}

// 3. Load User Files
async function loadUserFiles() {
  const container = document.getElementById('p-files-grid');
  const countEl = document.getElementById('p-dash-files-count');
  if (!container || !currentUser) return;

  container.innerHTML = `
    <div class="col-span-full py-12 text-center text-slate-400">
      <i class="fas fa-circle-notch fa-spin text-2xl text-emerald-400 mb-2"></i>
      <p class="text-xs">ক্লাউড থেকে আপনার ফাইলসমূহ লোড হচ্ছে...</p>
    </div>
  `;

  const res = await FayzarFirebaseClient.getUserFiles(currentUser.mobile);
  if (res.success) {
    userFilesList = res.files || [];
    if (countEl) countEl.textContent = `${userFilesList.length}টি`;
    renderFilesGrid();
  } else {
    container.innerHTML = `
      <div class="col-span-full p-6 text-center text-rose-400 glass-card rounded-2xl">
        <p>ফাইল লোড করতে সমস্যা হয়েছে: ${res.error || ''}</p>
      </div>
    `;
  }
}

// 4. Render User Files
function renderFilesGrid() {
  const container = document.getElementById('p-files-grid');
  if (!container) return;

  if (userFilesList.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center glass-card rounded-3xl border border-slate-800 p-8 space-y-3">
        <span class="w-16 h-16 mx-auto rounded-3xl bg-slate-800 text-slate-500 flex items-center justify-center text-2xl">
          <i class="fas fa-folder-open"></i>
        </span>
        <h3 class="text-base font-bold text-white">কোনো চাকরির ফাইল সংরক্ষিত নেই</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          আপনার প্রথম চাকরির ফাইল তৈরি করতে উপরের <strong>"নতুন ফাইল তৈরি করুন"</strong> বোতামে ক্লিক করুন।
        </p>
        <button onclick="openProfileModal()" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition">
          ➕ এখনই ফাইল তৈরি করুন
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = userFilesList.map(f => {
    const m = f.semanticMap || {};
    const hasPhoto = !!f.photoBase64;
    const hasSig = !!f.signatureBase64;

    return `
      <div class="glass-card rounded-3xl p-5 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-start justify-between gap-3 mb-2">
            <div>
              <span class="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">চাকরি প্রোফাইল</span>
              <h4 class="text-sm font-black text-white mt-1">${f.title || f.name || 'চাকরির ফাইল'}</h4>
              <p class="text-xs text-slate-400 font-semibold">${m.applicant_name || ''}</p>
            </div>
            ${hasPhoto ? `
              <div class="w-12 h-12 rounded-xl overflow-hidden border border-emerald-500/50 shrink-0">
                <img src="${f.photoBase64}" alt="Photo" class="w-full h-full object-cover">
              </div>
            ` : `
              <div class="w-12 h-12 rounded-xl bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 text-xs">
                <i class="fas fa-user"></i>
              </div>
            `}
          </div>

          <div class="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-1.5 text-xs text-slate-300">
            <div class="flex justify-between"><span class="text-slate-500">পিতার নাম:</span> <strong>${m.father_name || '-'}</strong></div>
            <div class="flex justify-between"><span class="text-slate-500">এনআইডি:</span> <strong class="font-mono">${m.nid_no || '-'}</strong></div>
            <div class="flex justify-between"><span class="text-slate-500">জন্মতারিখ:</span> <strong>${m.dob_day ? `${m.dob_day}/${m.dob_month}/${m.dob_year}` : (m.dob_full || '-')}</strong></div>
            <div class="flex justify-between border-t border-slate-800 pt-1.5 text-[11px]">
              <span class="text-slate-500">সংযুক্ত মিডিয়া:</span>
              <div class="flex gap-2">
                <span class="${hasPhoto ? 'text-emerald-400' : 'text-slate-600'} font-bold">
                  <i class="fas fa-camera"></i> ছবি ${hasPhoto ? '✓' : '✗'}
                </span>
                <span class="${hasSig ? 'text-cyan-400' : 'text-slate-600'} font-bold">
                  <i class="fas fa-signature"></i> স্বাক্ষর ${hasSig ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
          <button onclick="printBiodata('${f.id}')" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center gap-1.5 transition">
            <i class="fas fa-print text-blue-400"></i> বায়োডাটা
          </button>
          <div class="flex items-center gap-1.5">
            <button onclick="openProfileModal('${f.id}')" class="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold transition flex items-center gap-1">
              <i class="fas fa-edit"></i> এডিট
            </button>
            <button onclick="deleteFile('${f.id}')" class="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white font-bold transition" title="মুছে ফেলুন">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 5. HTML5 Canvas 300x300 and 300x80 Resizer
function processImageUpload(event, type) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (type === 'photo') {
        canvas.width = 300;
        canvas.height = 300;

        // Crop center square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 300, 300);
        const base64 = canvas.toDataURL('image/jpeg', 0.9);

        document.getElementById('pf-photo-base64').value = base64;
        const prev = document.getElementById('pf-photo-preview');
        prev.src = base64;
        prev.classList.remove('hidden');
        document.getElementById('pf-photo-placeholder').classList.add('hidden');

      } else if (type === 'sig') {
        canvas.width = 300;
        canvas.height = 80;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 80);
        ctx.drawImage(img, 0, 0, 300, 80);

        const base64 = canvas.toDataURL('image/jpeg', 0.9);

        document.getElementById('pf-sig-base64').value = base64;
        const prev = document.getElementById('pf-sig-preview');
        prev.src = base64;
        prev.classList.remove('hidden');
        document.getElementById('pf-sig-placeholder').classList.add('hidden');
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 6. Modal Navigation & Tabs
function switchProfileModalTab(tabKey) {
  const tabs = ['basic', 'address', 'education', 'media'];
  tabs.forEach(t => {
    const btn = document.getElementById(`btn-pf-tab-${t}`);
    const box = document.getElementById(`pf-tab-${t}`);
    if (t === tabKey) {
      btn.className = 'px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold shrink-0';
      box.classList.remove('hidden');
    } else {
      btn.className = 'px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 shrink-0';
      box.classList.add('hidden');
    }
  });
}

function openProfileModal(fileId = null) {
  const modal = document.getElementById('profile-modal');
  const form = document.getElementById('profile-form');
  const title = document.getElementById('profile-modal-title');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('pf-photo-base64').value = '';
  document.getElementById('pf-sig-base64').value = '';
  document.getElementById('pf-photo-preview').classList.add('hidden');
  document.getElementById('pf-photo-placeholder').classList.remove('hidden');
  document.getElementById('pf-sig-preview').classList.add('hidden');
  document.getElementById('pf-sig-placeholder').classList.remove('hidden');

  switchProfileModalTab('basic');

  if (fileId) {
    const f = userFilesList.find(item => item.id === fileId);
    if (!f) return;
    document.getElementById('pf-edit-id').value = f.id;
    title.innerHTML = `<i class="fas fa-file-pen text-emerald-400"></i> ফাইল সম্পাদনা: ${f.title || ''}`;

    const m = f.semanticMap || {};
    document.getElementById('pf-title').value = f.title || '';
    document.getElementById('pf-applicant-name').value = m.applicant_name || '';
    document.getElementById('pf-applicant-name-bn').value = m.applicant_name_bn || '';
    document.getElementById('pf-father-name').value = m.father_name || '';
    document.getElementById('pf-mother-name').value = m.mother_name || '';
    document.getElementById('pf-nid').value = m.nid_no || '';
    document.getElementById('pf-dob-day').value = m.dob_day || '';
    document.getElementById('pf-dob-month').value = m.dob_month || '';
    document.getElementById('pf-dob-year').value = m.dob_year || '';
    document.getElementById('pf-gender').value = m.gender || 'Male';
    document.getElementById('pf-religion').value = m.religion || 'Islam';
    document.getElementById('pf-blood').value = m.blood_group || 'B+';

    // Address
    document.getElementById('pf-pr-care').value = m.present_care_of || '';
    document.getElementById('pf-pr-village').value = m.present_village || '';
    document.getElementById('pf-pr-dist').value = m.present_district || '';
    document.getElementById('pf-pr-thana').value = m.present_upazila || '';
    document.getElementById('pf-pr-code').value = m.present_post_code || '';

    // SSC
    document.getElementById('pf-ssc-board').value = m.ssc_board || '';
    document.getElementById('pf-ssc-roll').value = m.ssc_roll || '';
    document.getElementById('pf-ssc-reg').value = m.ssc_reg || '';
    document.getElementById('pf-ssc-gpa').value = m.ssc_gpa || '';
    document.getElementById('pf-ssc-year').value = m.ssc_year || '';

    // HSC
    document.getElementById('pf-hsc-board').value = m.hsc_board || '';
    document.getElementById('pf-hsc-roll').value = m.hsc_roll || '';
    document.getElementById('pf-hsc-reg').value = m.hsc_reg || '';
    document.getElementById('pf-hsc-gpa').value = m.hsc_gpa || '';
    document.getElementById('pf-hsc-year').value = m.hsc_year || '';

    // Grad
    document.getElementById('pf-grad-exam').value = m.grad_exam || '';
    document.getElementById('pf-grad-inst').value = m.grad_institute || '';
    document.getElementById('pf-grad-sub').value = m.grad_subject || '';
    document.getElementById('pf-grad-gpa').value = m.grad_result || '';

    // Photos
    if (f.photoBase64) {
      document.getElementById('pf-photo-base64').value = f.photoBase64;
      const prev = document.getElementById('pf-photo-preview');
      prev.src = f.photoBase64;
      prev.classList.remove('hidden');
      document.getElementById('pf-photo-placeholder').classList.add('hidden');
    }
    if (f.signatureBase64) {
      document.getElementById('pf-sig-base64').value = f.signatureBase64;
      const prev = document.getElementById('pf-sig-preview');
      prev.src = f.signatureBase64;
      prev.classList.remove('hidden');
      document.getElementById('pf-sig-placeholder').classList.add('hidden');
    }
  } else {
    document.getElementById('pf-edit-id').value = '';
    title.innerHTML = `<i class="fas fa-file-signature text-emerald-400"></i> নতুন চাকরির ফাইল তৈরি`;
  }

  modal.classList.remove('hidden');
}

function closeProfileModal() {
  document.getElementById('profile-modal')?.classList.add('hidden');
}

function openExtensionGuideModal() {
  document.getElementById('guide-modal')?.classList.remove('hidden');
}

// 7. Save / Submit Profile File
async function handleProfileSubmit(e) {
  e.preventDefault();
  if (!currentUser) return;

  const saveBtn = document.getElementById('btn-save-profile');
  const editId = document.getElementById('pf-edit-id').value;
  const title = document.getElementById('pf-title').value.trim();

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ক্লাউডে সেভ হচ্ছে...';

  const semanticMap = {
    applicant_name: document.getElementById('pf-applicant-name').value.trim(),
    applicant_name_bn: document.getElementById('pf-applicant-name-bn').value.trim(),
    mobile_no: currentUser.mobile,
    confirm_mobile: currentUser.mobile,
    father_name: document.getElementById('pf-father-name').value.trim(),
    mother_name: document.getElementById('pf-mother-name').value.trim(),
    nid_no: document.getElementById('pf-nid').value.trim(),
    dob_day: document.getElementById('pf-dob-day').value.trim(),
    dob_month: document.getElementById('pf-dob-month').value.trim(),
    dob_year: document.getElementById('pf-dob-year').value.trim(),
    dob_full: `${document.getElementById('pf-dob-year').value}-${document.getElementById('pf-dob-month').value}-${document.getElementById('pf-dob-day').value}`,
    gender: document.getElementById('pf-gender').value,
    religion: document.getElementById('pf-religion').value,
    blood_group: document.getElementById('pf-blood').value,

    // Address
    present_care_of: document.getElementById('pf-pr-care').value.trim(),
    present_village: document.getElementById('pf-pr-village').value.trim(),
    present_district: document.getElementById('pf-pr-dist').value.trim(),
    present_upazila: document.getElementById('pf-pr-thana').value.trim(),
    present_post_code: document.getElementById('pf-pr-code').value.trim(),

    // SSC
    ssc_exam: 'S.S.C',
    ssc_board: document.getElementById('pf-ssc-board').value.trim(),
    ssc_roll: document.getElementById('pf-ssc-roll').value.trim(),
    ssc_reg: document.getElementById('pf-ssc-reg').value.trim(),
    ssc_gpa: document.getElementById('pf-ssc-gpa').value.trim(),
    ssc_year: document.getElementById('pf-ssc-year').value.trim(),

    // HSC
    hsc_exam: 'H.S.C',
    hsc_board: document.getElementById('pf-hsc-board').value.trim(),
    hsc_roll: document.getElementById('pf-hsc-roll').value.trim(),
    hsc_reg: document.getElementById('pf-hsc-reg').value.trim(),
    hsc_gpa: document.getElementById('pf-hsc-gpa').value.trim(),
    hsc_year: document.getElementById('pf-hsc-year').value.trim(),

    // Grad
    grad_exam: document.getElementById('pf-grad-exam').value.trim(),
    grad_institute: document.getElementById('pf-grad-inst').value.trim(),
    grad_subject: document.getElementById('pf-grad-sub').value.trim(),
    grad_result: document.getElementById('pf-grad-gpa').value.trim()
  };

  const fileData = {
    id: editId || ('file_' + Date.now()),
    title: title,
    name: semanticMap.applicant_name,
    semanticMap: semanticMap,
    photoBase64: document.getElementById('pf-photo-base64').value || '',
    signatureBase64: document.getElementById('pf-sig-base64').value || ''
  };

  try {
    const res = await FayzarFirebaseClient.saveUserFile(currentUser.mobile, fileData);
    if (res.success) {
      closeProfileModal();
      loadUserFiles();
    } else {
      alert('সংরক্ষণ ব্যর্থ হয়েছে: ' + (res.error || ''));
    }
  } catch (err) {
    alert('সংরক্ষণ ত্রুটি: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> <span>ফাইল সংরক্ষণ করুন</span>';
  }
}

// 8. Delete File
async function deleteFile(fileId) {
  if (!currentUser) return;
  const f = userFilesList.find(item => item.id === fileId);
  if (!f) return;

  if (!confirm(`আপনি কি সত্যিই "${f.title || 'এই ফাইলটি'}" মুছে ফেলতে চান?`)) return;

  const res = await FayzarFirebaseClient.deleteUserFile(currentUser.mobile, fileId);
  if (res.success) {
    loadUserFiles();
  } else {
    alert('ফাইল মুছতে সমস্যা হয়েছে: ' + (res.error || ''));
  }
}

// 9. Print A4 Biodata with Photo & Signature
function printBiodata(fileId) {
  const f = userFilesList.find(item => item.id === fileId);
  if (!f) return;

  const m = f.semanticMap || {};
  const photo = f.photoBase64 ? `<img src="${f.photoBase64}" style="width: 100px; height: 100px; object-fit: cover; border: 1px solid #ccc; border-radius: 6px;">` : '<div style="width:100px;height:100px;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;color:#999;font-size:10px;">ছবি নেই</div>';
  const sig = f.signatureBase64 ? `<img src="${f.signatureBase64}" style="width: 150px; height: 40px; object-fit: contain;">` : '<span style="color:#999;font-size:11px;">(স্বাক্ষর নেই)</span>';

  const w = window.open('', '_blank');
  w.document.write(`
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <title>বায়োডাটা — ${m.applicant_name || f.title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 25px; font-size: 13px; color: #111; line-height: 1.5; }
        .head-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 15px; }
        h1 { margin: 0; font-size: 19px; color: #065f46; }
        .sub { margin: 3px 0 0 0; font-size: 11px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        td, th { border: 1px solid #ccc; padding: 6px 10px; font-size: 12px; }
        th { background: #f0fdf4; font-weight: bold; text-align: left; }
        .sec { background: #e2e8f0; font-weight: bold; padding: 6px 10px; margin-top: 12px; border-left: 4px solid #059669; font-size: 12px; }
        .sig-row { display: flex; justify-content: flex-end; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="head-row">
        <div>
          <h1>ফয়জার কম্পিউটার ডিজিটাল আবেদন পোর্টাল</h1>
          <p class="sub">ফুলবাড়ী সরকারি কলেজ গেট, দিনাজপুর • মোবাইল: 01717-101919</p>
          <div style="margin-top: 6px; font-weight: bold; color: #047857;">${f.title || 'চাকরির আবেদন সারাংশ'}</div>
        </div>
        <div>${photo}</div>
      </div>

      <div class="sec">১. ব্যক্তিগত তথ্য (Personal Details)</div>
      <table>
        <tr><th width="28%">প্রার্থীর নাম (English)</th><td>${m.applicant_name || '-'}</td><th width="20%">বাংলায়</th><td>${m.applicant_name_bn || '-'}</td></tr>
        <tr><th>পিতার নাম</th><td>${m.father_name || '-'}</td><th>মাতার নাম</th><td>${m.mother_name || '-'}</td></tr>
        <tr><th>মোবাইল নম্বর</th><td>${currentUser.mobile}</td><th>এনআইডি (NID)</th><td>${m.nid_no || '-'}</td></tr>
        <tr><th>জন্মতারিখ</th><td>${m.dob_day ? `${m.dob_day}/${m.dob_month}/${m.dob_year}` : (m.dob_full || '-')}</td><th>লিঙ্গ ও ধর্ম</th><td>${m.gender || 'Male'}, ${m.religion || 'Islam'} (${m.blood_group || 'B+'})</td></tr>
      </table>

      <div class="sec">২. বর্তমান ও স্থায়ী ঠিকানা (Address)</div>
      <table>
        <tr><th>ঠিকানা</th><td>Care of: ${m.present_care_of || ''}, গ্রাম: ${m.present_village || ''}, উপজেলা: ${m.present_upazila || ''}, জেলা: ${m.present_district || ''} - ${m.present_post_code || ''}</td></tr>
      </table>

      <div class="sec">৩. শিক্ষাগত যোগ্যতা (Academic Records)</div>
      <table>
        <tr><th>পরীক্ষা</th><th>বোর্ড/বিশ্ববিদ্যালয়</th><th>রোল</th><th>রেজি নং</th><th>ফলাফল</th><th>পাসের সাল</th></tr>
        <tr><td>${m.ssc_exam || 'S.S.C'}</td><td>${m.ssc_board || '-'}</td><td>${m.ssc_roll || '-'}</td><td>${m.ssc_reg || '-'}</td><td>${m.ssc_gpa || '-'}</td><td>${m.ssc_year || '-'}</td></tr>
        <tr><td>${m.hsc_exam || 'H.S.C'}</td><td>${m.hsc_board || '-'}</td><td>${m.hsc_roll || '-'}</td><td>${m.hsc_reg || '-'}</td><td>${m.hsc_gpa || '-'}</td><td>${m.hsc_year || '-'}</td></tr>
        ${m.grad_exam ? `<tr><td>${m.grad_exam}</td><td>${m.grad_institute || '-'}</td><td>-</td><td>-</td><td>${m.grad_result || '-'}</td><td>-</td></tr>` : ''}
      </table>

      <div class="sig-row">
        <div style="text-align: center;">
          ${sig}
          <div style="border-top: 1px solid #333; padding-top: 3px; font-size: 11px; margin-top: 4px;">প্রার্থীর স্বাক্ষর</div>
        </div>
      </div>

      <script>window.print();</script>
    </body>
    </html>
  `);
  w.document.close();
}
