const loginView = document.getElementById('loginView');
const dashView = document.getElementById('dashView');
const loginForm = document.getElementById('loginForm');
const pwInput = document.getElementById('pwInput');
const logoutBtn = document.getElementById('logoutBtn');

const addForm = document.getElementById('addForm');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const nameInput = document.getElementById('nameInput');
const catInput = document.getElementById('catInput');
const descInput = document.getElementById('descInput');
const priceInput = document.getElementById('priceInput');
const submitBtn = document.getElementById('submitBtn');

const adminList = document.getElementById('adminList');
const adminEmpty = document.getElementById('adminEmpty');
const adminCount = document.getElementById('adminCount');
const toast = document.getElementById('toast');

const KEY = 'poshe_admin_pw';
let pw = sessionStorage.getItem(KEY) || '';
let pickedFile = null;

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => (toast.className = 'toast'), 2600);
}

function enterDash() {
  loginView.style.display = 'none';
  dashView.style.display = 'block';
  logoutBtn.style.display = 'inline-block';
  loadList();
}

function logout() {
  sessionStorage.removeItem(KEY);
  pw = '';
  loginView.style.display = 'block';
  dashView.style.display = 'none';
  logoutBtn.style.display = 'none';
}

logoutBtn.addEventListener('click', (e) => {
  e.preventDefault();
  logout();
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const candidate = pwInput.value.trim();
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: candidate }),
    });
    if (!res.ok) throw new Error('كلمة السر غير صحيحة');
    pw = candidate;
    sessionStorage.setItem(KEY, pw);
    enterDash();
  } catch (err) {
    showToast(err.message, true);
  }
});

dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (!fileInput.files[0]) return;
  pickedFile = fileInput.files[0];
  const url = URL.createObjectURL(pickedFile);
  dropzone.classList.add('has-file');
  dropzone.innerHTML = `<div class="preview"><img src="${url}" alt="preview"/></div>`;
});

['dragover', 'dragenter'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.style.background = '#fbdcec';
  })
);
['dragleave', 'drop'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.style.background = '';
  })
);
dropzone.addEventListener('drop', (e) => {
  const f = e.dataTransfer.files[0];
  if (!f || !f.type.startsWith('image/')) return;
  fileInput.files = e.dataTransfer.files;
  fileInput.dispatchEvent(new Event('change'));
});

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pickedFile) return showToast('اختاري صورة أولاً', true);

  const fd = new FormData();
  fd.append('image', pickedFile);
  fd.append('name', nameInput.value);
  fd.append('category', catInput.value);
  fd.append('description', descInput.value);
  fd.append('price', priceInput.value);

  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري الرفع...';

  try {
    const res = await fetch('/api/cakes', {
      method: 'POST',
      headers: { 'x-admin-password': pw },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل الرفع');
    showToast('تمت الإضافة بنجاح ✦');
    addForm.reset();
    pickedFile = null;
    dropzone.classList.remove('has-file');
    dropzone.innerHTML = `
      <div class="dropzone-prompt">
        <strong>اضغطي لاختيار صورة</strong>
        <span>JPG / PNG / WEBP — حد أقصى 8MB</span>
      </div>`;
    loadList();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'إضافة للقائمة';
  }
});

async function loadList() {
  const res = await fetch('/api/cakes');
  const data = await res.json();
  adminCount.textContent = `${data.length} صنف`;
  if (!data.length) {
    adminList.innerHTML = '';
    adminEmpty.style.display = 'block';
    return;
  }
  adminEmpty.style.display = 'none';
  adminList.innerHTML = data
    .map(
      (c) => `
    <div class="admin-card" data-id="${c.id}">
      <button class="del-btn" data-id="${c.id}" title="حذف">✕</button>
      <img src="${c.image}" alt="" />
      <div class="admin-card-body">
        <h4>${escape(c.name)}</h4>
        <div class="meta">${escape(c.category)}${c.price ? ' · ' + escape(c.price) : ''}</div>
      </div>
    </div>`
    )
    .join('');

  adminList.querySelectorAll('.del-btn').forEach((b) => {
    b.addEventListener('click', async () => {
      if (!confirm('حذف هذه الكيكة من القائمة؟')) return;
      try {
        const res = await fetch('/api/cakes/' + b.dataset.id, {
          method: 'DELETE',
          headers: { 'x-admin-password': pw },
        });
        if (!res.ok) throw new Error('فشل الحذف');
        showToast('تم الحذف');
        loadList();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

function escape(s) {
  return String(s || '').replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

if (pw) {
  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  }).then((r) => (r.ok ? enterDash() : logout()));
}
