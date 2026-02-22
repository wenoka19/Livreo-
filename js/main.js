/**
 * Livreo — Main JS
 * Handles home page: book rows, FAQ accordion, newsletter
 */

// ===== BOOK CARD TEMPLATE =====
function createBookCard(book) {
  const imageSrc = book.image
    ? (book.image.startsWith('http') ? book.image : `/uploads/${book.image}`)
    : 'https://via.placeholder.com/200x300/E8F5E9/2E7D32?text=📚';

  return `
  <div class="book-card" data-id="${book._id || book.id}">
    <div class="book-card-image">
      <a href="livre.html?id=${book._id || book.id}">
        <img src="${imageSrc}" alt="${book.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x300/E8F5E9/2E7D32?text=📚'">
      </a>
      <span class="badge-category">${book.category || 'Livre'}</span>
      <span class="badge-physical">Livre physique</span>
    </div>
    <div class="book-card-body">
      <a href="livre.html?id=${book._id || book.id}">
        <h3 class="book-card-title">${book.title}</h3>
      </a>
      <p class="book-card-author">${book.author}</p>
      <div class="book-card-pricing">
        ${book.originalPrice ? `<span class="price-original">${book.originalPrice.toLocaleString('fr-FR')} FCFA</span>` : ''}
        <span class="price-promo">${(book.promoPrice || book.price || 0).toLocaleString('fr-FR')} FCFA</span>
      </div>
      <button class="btn-add-cart" onclick="handleAddToCartWithFeedback(this, '${book._id || book.id}', '${escapeAttr(book.title)}', '${escapeAttr(book.author)}', ${book.promoPrice || book.price || 0}, '${imageSrc}')">
        Commander
      </button>
    </div>
  </div>`;
}

function escapeAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function handleAddToCart(id, title, author, price, image) {
  Cart.addToCart({ id, title, author, price, image });
}

// ===== SAMPLE BOOKS (shown until API is connected) =====
const SAMPLE_BOOKS = [
  { id: '1', title: 'Les Misérables', author: 'Victor Hugo', category: 'Romans', originalPrice: 5000, promoPrice: 3500, image: '' },
  { id: '2', title: 'Père Riche Père Pauvre', author: 'Robert Kiyosaki', category: 'Développement personnel', originalPrice: 6000, promoPrice: 4500, image: '' },
  { id: '3', title: "L'Alchimiste", author: 'Paulo Coelho', category: 'Romans', originalPrice: 4500, promoPrice: 3000, image: '' },
  { id: '4', title: 'Thinking Fast and Slow', author: 'Daniel Kahneman', category: 'Sciences humaines', originalPrice: 7000, promoPrice: 5500, image: '' },
  { id: '5', title: 'Sapiens', author: 'Yuval Noah Harari', category: 'Histoire', originalPrice: 7500, promoPrice: 5800, image: '' },
  { id: '6', title: 'Le Petit Prince', author: 'Antoine de Saint-Exupéry', category: 'Jeunesse', originalPrice: 3000, promoPrice: 2000, image: '' },
  { id: '7', title: 'Harry Potter', author: 'J.K. Rowling', category: 'Romans', originalPrice: 5500, promoPrice: 4000, image: '' },
  { id: '8', title: 'The 7 Habits', author: 'Stephen Covey', category: 'Développement personnel', originalPrice: 6500, promoPrice: 4800, image: '' },
  { id: '9', title: '1984', author: 'George Orwell', category: 'Science-fiction', originalPrice: 4000, promoPrice: 2800, image: '' },
  { id: '10', title: 'Notre Dame de Paris', author: 'Victor Hugo', category: 'Romans', originalPrice: 4800, promoPrice: 3200, image: '' },
];
// Expose globally so other scripts (catalogue.js) can access it
window.SAMPLE_BOOKS = SAMPLE_BOOKS;

// ===== LOAD BOOKS FROM API OR FALLBACK =====
async function loadBooks(rowId, params = {}) {
  const container = document.getElementById(rowId);
  if (!container) return;

  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/books?${query}&limit=8`);
    if (!res.ok) throw new Error('API not ready');
    const data = await res.json();
    const books = data.books || data;
    container.innerHTML = books.map(createBookCard).join('');
  } catch {
    // Fallback to sample data
    const books = params.category
      ? SAMPLE_BOOKS.filter(b => b.category === params.category).slice(0, 4)
      : SAMPLE_BOOKS.slice(0, 6);
    container.innerHTML = books.map(createBookCard).join('');
  }
}

async function loadGrid(gridId, params = {}) {
  const container = document.getElementById(gridId);
  if (!container) return;

  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/books?${query}&limit=4`);
    if (!res.ok) throw new Error('API not ready');
    const data = await res.json();
    const books = data.books || data;
    if (books.length === 0) {
      container.innerHTML = '<p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);">Aucun livre dans cette catégorie.</p>';
      return;
    }
    container.innerHTML = books.map(createBookCard).join('');
  } catch {
    const books = params.category
      ? SAMPLE_BOOKS.filter(b => b.category === params.category).slice(0, 4)
      : SAMPLE_BOOKS.slice(0, 4);
    container.innerHTML = books.length
      ? books.map(createBookCard).join('')
      : '<p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);">Aucun livre dans cette catégorie.</p>';
  }
}


// ===== LOAD SITE SETTINGS (section titles) =====
async function loadSiteSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();
    const map = {
      'title-new-releases': settings.home_section_1_title,
      'title-bestsellers':  settings.home_section_2_title,
      'title-new':          settings.home_section_3_title,
      'title-cat1':         settings.home_section_cat1_title,
      'title-cat2':         settings.home_section_cat2_title,
    };
    Object.entries(map).forEach(([id, val]) => {
      if (!val) return;
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  } catch { /* use defaults */ }
}

// ===== LOAD HERO FEATURED BOOKS =====
async function loadHeroBooks() {
  const container = document.getElementById('hero-books');
  if (!container) return;

  let books = [];
  try {
    const res = await fetch('/api/books?heroFeatured=true&limit=4');
    if (res.ok) {
      const data = await res.json();
      books = data.books || data;
    }
  } catch {}

  // Fallback to featured books
  if (books.length === 0) {
    try {
      const res = await fetch('/api/books?featured=true&limit=4');
      if (res.ok) {
        const data = await res.json();
        books = data.books || data;
      }
    } catch {}
  }

  // Fallback to sample books
  if (books.length === 0) {
    books = (window.SAMPLE_BOOKS || []).slice(0, 4);
  }

  if (!books.length) return;

  // Fill up to 4
  while (books.length < 4) books.push(books[0]);
  books = books.slice(0, 4);

  const margins = ['0', '30px', '0', '30px'];
  container.innerHTML = books.map((book, i) => {
    const imgSrc = book.image
      ? (book.image.startsWith('http') ? book.image : '/uploads/' + book.image)
      : 'https://via.placeholder.com/200x300/E8F5E9/2E7D32?text=📚';
    const price = (book.promoPrice || book.price || 0).toLocaleString('fr-FR');
    const id = book._id || book.id;
    return '<div class="hero-book-card" style="margin-top:' + margins[i] + '">' +
      '<a href="livre.html?id=' + id + '">' +
      '<img src="' + imgSrc + '" alt="' + escapeAttr(book.title) + '" onerror="this.src='https://via.placeholder.com/200x300/E8F5E9/2E7D32?text=📚'">' +
      '</a>' +
      '<div class="hero-book-card-overlay">' +
      '<p class="hero-book-card-title">' + book.title + '</p>' +
      '<p class="hero-book-card-price">' + price + ' FCFA</p>' +
      '<button class="hero-book-card-btn" onclick="handleAddToCart('' + id + '','' + escapeAttr(book.title) + '','' + escapeAttr(book.author) + '',' + (book.promoPrice || book.price || 0) + ','' + imgSrc + '')">Commander</button>' +
      '</div>' +
      '</div>';
  }).join('');
}

// ===== COMMANDER BUTTON VISUAL FEEDBACK =====
function handleAddToCartWithFeedback(btn, id, title, author, price, image) {
  Cart.addToCart({ id, title, author, price, image });
  // Animate the button
  const original = btn.innerHTML;
  btn.innerHTML = '✓ Ajouté !';
  btn.style.background = '#388E3C';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = original;
    btn.style.background = '';
    btn.disabled = false;
  }, 2000);
}

// ===== FAQ ACCORDION =====
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const answer = btn.nextElementSibling;
      const isOpen = btn.classList.contains('active');

      // Close all
      document.querySelectorAll('.faq-question').forEach(b => {
        b.classList.remove('active');
        b.nextElementSibling.classList.remove('open');
      });

      // Toggle current
      if (!isOpen) {
        btn.classList.add('active');
        answer.classList.add('open');
      }
    });
  });
}

// ===== NEWSLETTER =====
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    Cart.showToast('Merci pour votre inscription !', 'success');
    input.value = '';
  });
}

// ===== INIT HOME PAGE =====
document.addEventListener('DOMContentLoaded', () => {
  loadSiteSettings();
  loadHeroBooks();
  loadBooks('row-new-releases', { sort: 'newest' });
  loadBooks('row-bestsellers', { sort: 'popular' });
  loadBooks('row-new', {});
  loadGrid('grid-romans', { category: 'Romans' });
  loadGrid('grid-devperso', { category: 'Développement personnel' });
  initFAQ();
  initNewsletter();
});
