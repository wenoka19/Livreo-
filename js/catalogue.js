/**
 * Livreo — Catalogue Page
 */

let currentPage = 1;
let currentFilters = {};

function getURLParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get('q') || '',
    cat: params.get('cat') || '',
    sort: params.get('sort') || '',
    page: parseInt(params.get('page') || '1'),
  };
}

async function loadCatalogue(page = 1) {
  const grid = document.getElementById('catalogue-grid');
  const countEl = document.getElementById('catalogue-count');
  const pagination = document.getElementById('pagination');

  if (!grid) return;

  const params = { ...currentFilters, page, limit: 12 };

  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/books?${query}`);
    if (!res.ok) throw new Error('API unavailable');
    const data = await res.json();
    const books = data.books || data;
    const total = data.total || books.length;

    grid.innerHTML = books.length
      ? books.map(createBookCard).join('')
      : '<p style="grid-column:1/-1;text-align:center;color:var(--color-text-secondary);padding:var(--space-3xl) 0;">Aucun livre trouvé.</p>';

    if (countEl) countEl.textContent = `${total} livre${total !== 1 ? 's' : ''} trouvé${total !== 1 ? 's' : ''}`;
    renderPagination(Math.ceil(total / 12), page);
  } catch {
    // Fallback
    let books = [...(window.SAMPLE_BOOKS || [])];

    if (currentFilters.q) {
      const q = currentFilters.q.toLowerCase();
      books = books.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    }
    if (currentFilters.category) {
      books = books.filter(b => b.category === currentFilters.category);
    }
    if (currentFilters.sort === 'price_asc') books.sort((a, b) => (a.promoPrice || a.price) - (b.promoPrice || b.price));
    if (currentFilters.sort === 'price_desc') books.sort((a, b) => (b.promoPrice || b.price) - (a.promoPrice || a.price));

    grid.innerHTML = books.length
      ? books.map(createBookCard).join('')
      : '<p style="grid-column:1/-1;text-align:center;color:var(--color-text-secondary);padding:var(--space-3xl) 0;">Aucun livre trouvé.</p>';

    if (countEl) countEl.textContent = `${books.length} livre${books.length !== 1 ? 's' : ''} trouvé${books.length !== 1 ? 's' : ''}`;
    if (pagination) pagination.innerHTML = '';
  }
}

function renderPagination(totalPages, current) {
  const el = document.getElementById('pagination');
  if (!el || totalPages <= 1) { if(el) el.innerHTML = ''; return; }

  let html = '';
  if (current > 1) html += `<button class="page-btn" onclick="goToPage(${current - 1})">&#8249;</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn${i === current ? ' active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  if (current < totalPages) html += `<button class="page-btn" onclick="goToPage(${current + 1})">&#8250;</button>`;
  el.innerHTML = html;
}

function goToPage(p) {
  currentPage = p;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadCatalogue(p);
}

function initCataloguePage() {
  const url = getURLParams();
  currentFilters = {
    q: url.q,
    category: url.cat,
    sort: url.sort,
  };
  currentPage = url.page;

  // Set search input
  const searchInput = document.getElementById('search-input');
  if (searchInput && url.q) searchInput.value = url.q;

  // Set sort select
  const sortEl = document.getElementById('sort-select');
  if (sortEl && url.sort) sortEl.value = url.sort;

  // Set category radio
  if (url.cat) {
    const radio = document.querySelector(`input[name="cat"][value="${url.cat}"]`);
    if (radio) radio.checked = true;

    const bc = document.getElementById('breadcrumb-current');
    if (bc) bc.textContent = url.cat;
  }

  // Auto-filter: sort change
  document.getElementById('sort-select')?.addEventListener('change', (e) => {
    currentFilters.sort = e.target.value;
    currentPage = 1;
    loadCatalogue(1);
  });

  // Auto-filter: category radio change (uses delegation since radios are dynamic)
  document.getElementById('category-filters')?.addEventListener('change', (e) => {
    if (e.target.name === 'cat') {
      currentFilters.category = e.target.value;
      currentPage = 1;
      const bc = document.getElementById('breadcrumb-current');
      if (bc) bc.textContent = e.target.value || 'Catalogue';
      loadCatalogue(1);
    }
  });

  loadCatalogue(currentPage);
}

async function loadCategoryFilters(selectedCat) {
  const container = document.getElementById('category-filters');
  if (!container) return;

  const defaultCats = ['Romans', 'Sciences humaines', 'Développement personnel', 'Jeunesse', 'Histoire', 'Biographies', 'Science-fiction', 'Policier'];
  let names = defaultCats;

  try {
    const res = await fetch('/api/categories');
    if (res.ok) {
      const cats = await res.json();
      if (cats.length) names = cats.map(c => c.name);
    }
  } catch { /* use defaults */ }

  const allChecked = selectedCat === '' ? ' checked' : '';
  let html = '<label class="filter-option"><input type="radio" name="cat" value=""' + allChecked + '> Toutes</label>';
  names.forEach(name => {
    const checked = selectedCat === name ? ' checked' : '';
    html += '<label class="filter-option"><input type="radio" name="cat" value="' + name + '"' + checked + '> ' + name + '</label>';
  });
  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  const url = getURLParams();
  loadCategoryFilters(url.cat);
  initCataloguePage();
});
