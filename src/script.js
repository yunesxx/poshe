const grid = document.getElementById('grid');
const empty = document.getElementById('empty');
const count = document.getElementById('count');
const filtersEl = document.getElementById('filters');
const lb = document.getElementById('lb');
const lbImg = document.getElementById('lbImg');
const lbClose = document.getElementById('lbClose');

let cakes = [];
let activeCat = 'الكل';

async function load() {
  try {
    const res = await fetch('/api/cakes');
    cakes = await res.json();
  } catch {
    cakes = [];
  }
  render();
}

function render() {
  const cats = ['الكل', ...new Set(cakes.map((c) => c.category).filter(Boolean))];
  filtersEl.innerHTML = cats
    .map(
      (c) =>
        `<button class="chip ${c === activeCat ? 'active' : ''}" data-cat="${c}">${c}</button>`
    )
    .join('');
  filtersEl.querySelectorAll('.chip').forEach((b) => {
    b.addEventListener('click', () => {
      activeCat = b.dataset.cat;
      render();
    });
  });

  const list = activeCat === 'الكل' ? cakes : cakes.filter((c) => c.category === activeCat);
  count.textContent = `${list.length} صنف`;

  if (!list.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = list
    .map(
      (c) => `
    <article class="card">
      <div class="card-img" data-img="${c.image}">
        <span class="card-cat">${escape(c.category || 'كيك')}</span>
        <img src="${c.image}" alt="${escape(c.name)}" loading="lazy" />
      </div>
      <div class="card-body">
        <h3>${escape(c.name)}</h3>
        <p>${escape(c.description) || 'مصنوع بحب وتفاصيل خاصة.'}</p>
        <div class="card-foot">
          ${
            c.price
              ? `<span class="price">${escape(c.price)}</span>`
              : `<span class="price empty">السعر حسب الطلب</span>`
          }
          <a href="#contact" class="order-btn">اطلبي الآن</a>
        </div>
      </div>
    </article>
  `
    )
    .join('');

  grid.querySelectorAll('.card-img').forEach((el) => {
    el.addEventListener('click', () => {
      lbImg.src = el.dataset.img;
      lb.classList.add('show');
    });
  });
}

function escape(s) {
  return String(s || '').replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

lbClose.addEventListener('click', () => lb.classList.remove('show'));
lb.addEventListener('click', (e) => {
  if (e.target === lb) lb.classList.remove('show');
});

// secret: 5 clicks on the logo within 3s → dashboard
let logoClicks = 0;
let logoTimer = null;
document.querySelector('.brand')?.addEventListener('click', (e) => {
  e.preventDefault();
  logoClicks++;
  clearTimeout(logoTimer);
  logoTimer = setTimeout(() => (logoClicks = 0), 3000);
  if (logoClicks >= 5) {
    logoClicks = 0;
    window.location.href = 'dashboard.html';
  }
});

load();
