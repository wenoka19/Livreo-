/**
 * Livreo — Shared Components (Header, Nav, Footer)
 * Injected into every public page via DOMContentLoaded
 */

const DEFAULT_CATEGORIES = [
  'Romans', 'Sciences humaines', 'Développement personnel',
  'Jeunesse', 'Histoire', 'Biographies', 'Science-fiction', 'Policier',
];

function buildCategoryLinks(names) {
  const all = [{ label: 'Tous les livres', href: 'catalogue.html' }];
  names.forEach(name => all.push({ label: name, href: `catalogue.html?cat=${encodeURIComponent(name)}` }));
  return all;
}

let CATEGORIES = buildCategoryLinks(DEFAULT_CATEGORIES);

async function loadCategoriesNav() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) return;
    const cats = await res.json();
    if (!cats.length) return;
    CATEGORIES = buildCategoryLinks(cats.map(c => c.name));
    // Re-render nav links
    const nav = document.getElementById('site-nav');
    if (nav) {
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      nav.querySelector('.container').innerHTML = CATEGORIES.map(c =>
        `<a href="${c.href}" class="nav-link${currentPage === 'index.html' && c.href === 'catalogue.html' ? '' : ''}">${c.label}</a>`
      ).join('');
      // Re-apply active highlight
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href && href.startsWith(currentPage)) link.classList.add('active');
      });
    }
  } catch { /* use defaults */ }
}

function getCartCount() {
  const cart = JSON.parse(localStorage.getItem('livreo_cart') || '[]');
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function renderHeader() {
  const count = getCartCount();
  return `
  <div class="announcement-bar">
    🚚 Livraison gratuite dès 2 livres achetés &nbsp;|&nbsp; Paiement à la livraison uniquement
  </div>
  <header class="site-header">
    <div class="container">
      <button class="hamburger" id="hamburger" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <a href="/index.html" class="logo">
        <svg class="logo-icon" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h12a4 4 0 0 1 4 4v18a3 3 0 0 0-3-3H4V6z"/>
          <path d="M32 6H20a4 4 0 0 0-4 4v18a3 3 0 0 1 3-3h13V6z"/>
        </svg>
        <span class="logo-text">Livreo</span>
      </a>
      <div class="search-bar">
        <form action="catalogue.html" method="get" id="search-form">
          <input type="text" name="q" placeholder="Rechercher un livre, un auteur..." autocomplete="off" id="search-input">
          <button type="submit" aria-label="Rechercher">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </form>
        <div class="search-dropdown" id="search-dropdown"></div>
      </div>
      <div class="header-actions">
        <a href="panier.html" class="cart-btn" id="cart-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <span>Panier</span>
          <span class="cart-count" id="cart-count">${count}</span>
        </a>
      </div>
    </div>
  </header>
  <nav class="site-nav" id="site-nav">
    <div class="container">
      ${CATEGORIES.map((c, i) => `<a href="${c.href}" class="nav-link${i === 0 ? ' active' : ''}">${c.label}</a>`).join('')}
    </div>
  </nav>`;
}

function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="logo">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" stroke="#4CAF50" stroke-width="2">
              <path d="M4 6h12a4 4 0 0 1 4 4v18a3 3 0 0 0-3-3H4V6z"/>
              <path d="M32 6H20a4 4 0 0 0-4 4v18a3 3 0 0 1 3-3h13V6z"/>
            </svg>
            <span class="logo-text">Livreo</span>
          </div>
          <p>Ta librairie en ligne, livraison à domicile. Payez à la réception — simple, rapide et sécurisé.</p>
        </div>
        <div>
          <p class="footer-col-title">Librairie</p>
          <ul class="footer-links">
            <li><a href="catalogue.html">Catalogue</a></li>
            <li><a href="catalogue.html?cat=Romans">Romans</a></li>
            <li><a href="catalogue.html?cat=Jeunesse">Jeunesse</a></li>
            <li><a href="catalogue.html?cat=Sciences+humaines">Sciences humaines</a></li>
          </ul>
        </div>
        <div>
          <p class="footer-col-title">Aide</p>
          <ul class="footer-links">
            <li><a href="index.html#faq">FAQ</a></li>
            <li><a href="panier.html">Mon panier</a></li>
            <li><a href="index.html#faq">Livraison</a></li>
            <li><a href="index.html#faq">Retours</a></li>
          </ul>
        </div>
        <div>
          <p class="footer-col-title">Contact</p>
          <ul class="footer-links">
            <li><a href="https://wa.me/22893460079" target="_blank">WhatsApp</a></li>
            <li><a href="mailto:contact@livreo.com">Email</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-copy">&copy; ${new Date().getFullYear()} Livreo. Tous droits réservés.</p>
        <div class="footer-bottom-links">
          <a href="#">Confidentialité</a>
          <a href="#">CGV</a>
          <a href="#">Mentions légales</a>
        </div>
      </div>
    </div>
  </footer>
  <a href="https://wa.me/22893460079" target="_blank" class="whatsapp-btn" aria-label="Contacter sur WhatsApp">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  </a>`;
}

function injectComponents() {
  const headerContainer = document.getElementById('header-placeholder');
  const footerContainer = document.getElementById('footer-placeholder');

  if (headerContainer) headerContainer.innerHTML = renderHeader();
  if (footerContainer) footerContainer.innerHTML = renderFooter();

  // Hamburger toggle
  const hamburger = document.getElementById('hamburger');
  const siteNav = document.getElementById('site-nav');
  if (hamburger && siteNav) {
    hamburger.addEventListener('click', () => {
      siteNav.classList.toggle('mobile-open');
    });
  }

  // Highlight active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href && href.startsWith(currentPage)) {
      link.classList.add('active');
    }
  });

  // Update cart count live
  updateCartCount();
  // Floating CTA
  renderFloatingCTA();
  // Load dynamic categories from API (updates nav after initial render)
  loadCategoriesNav();
  // Smart search bar
  initSmartSearch();
}

function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = getCartCount();
}


// ===== FLOATING CTA BAR =====
function renderFloatingCTA() {
  // Don't show on panier/commande/confirmation pages
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (['panier.html', 'commande.html', 'confirmation.html'].includes(page)) return;

  const cta = document.createElement('a');
  cta.href = 'panier.html';
  cta.className = 'floating-cta';
  cta.id = 'floating-cta';
  cta.innerHTML = '<span class="floating-cta-text" id="floating-cta-text">Voir et finaliser ma commande</span><span class="floating-cta-arrow">→</span>';
  document.body.appendChild(cta);

  updateFloatingCTA();
}

function updateFloatingCTA() {
  const cta = document.getElementById('floating-cta');
  if (!cta) return;
  const cart = JSON.parse(localStorage.getItem('livreo_cart') || '[]');
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const textEl = document.getElementById('floating-cta-text');

  if (count > 0) {
    cta.classList.add('visible');
    if (textEl) textEl.textContent = `Voir et finaliser ma commande — ${total.toLocaleString('fr-FR')} FCFA`;
    // Adjust whatsapp button
    const wa = document.querySelector('.whatsapp-btn');
    if (wa) wa.classList.remove('no-cta');
  } else {
    cta.classList.remove('visible');
    const wa = document.querySelector('.whatsapp-btn');
    if (wa) wa.classList.add('no-cta');
  }
}

// Listen for cart changes (storage events from other tabs + direct updates)
window.addEventListener('storage', updateFloatingCTA);
// Expose so cart.js can call after saveCart
window.updateFloatingCTA = updateFloatingCTA;

// ===== SMART SEARCH BAR =====
function initSmartSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');
  const form = document.getElementById('search-form');
  if (!input || !dropdown || !form) return;

  let debounceTimer = null;
  let lastQuery = '';

  function escapeHtmlSearch(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function hideDropdown() {
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
  }

  function showDropdown(html) {
    dropdown.innerHTML = html;
    dropdown.classList.add('open');
  }

  // Log the search to the database
  function logSearch(term) {
    fetch('/api/book-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookTitle: term, source: 'barre de recherche' }),
    }).catch(function() {});
  }

  async function performSearch(query) {
    if (query.length < 2) { hideDropdown(); return; }

    try {
      const res = await fetch('/api/books?q=' + encodeURIComponent(query) + '&limit=6');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const books = data.books || data;

      // Log every search
      logSearch(query);

      if (books.length > 0) {
        var html = books.map(function(book) {
          var id = book._id || book.id;
          var imgSrc = book.image
            ? (book.image.startsWith('http') ? book.image : '/uploads/' + book.image)
            : 'https://via.placeholder.com/40x60/E8F5E9/2E7D32?text=📚';
          var price = (book.promoPrice || book.price || 0).toLocaleString('fr-FR');
          return '<a href="livre.html?id=' + id + '" class="search-result-item">' +
            '<img src="' + imgSrc + '" alt="" onerror="this.src=\'https://via.placeholder.com/40x60/E8F5E9/2E7D32?text=📚\'">' +
            '<div class="search-result-info">' +
            '<p class="search-result-title">' + escapeHtmlSearch(book.title) + '</p>' +
            '<p class="search-result-author">' + escapeHtmlSearch(book.author) + '</p>' +
            '</div>' +
            '<span class="search-result-price">' + price + ' FCFA</span>' +
            '</a>';
        }).join('');
        html += '<a href="catalogue.html?q=' + encodeURIComponent(query) + '" class="search-result-all">Voir tous les résultats</a>';
        showDropdown(html);
      } else {
        // Not found — show request form
        var nfHtml = '<div class="search-no-results">' +
          '<p class="search-nf-title">Désolé, ce livre est en rupture de stock</p>' +
          '<p class="search-nf-sub">Laissez votre numéro WhatsApp, nous vous contacterons dès qu\'il sera disponible.</p>' +
          '<form id="search-request-form" class="search-nf-form">' +
          '<input type="tel" id="search-wa-input" placeholder="Votre numéro WhatsApp" inputmode="numeric" required>' +
          '<button type="submit">Soumettre</button>' +
          '</form>' +
          '<div id="search-request-success" style="display:none;">' +
          '<p class="search-nf-success">Merci ! Nous vous contacterons bientôt.</p>' +
          '</div>' +
          '</div>';
        showDropdown(nfHtml);

        // Phone digits only
        var waInput = document.getElementById('search-wa-input');
        if (waInput) {
          waInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
          });
        }
        // Submit request
        var reqForm = document.getElementById('search-request-form');
        if (reqForm) {
          reqForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var phone = document.getElementById('search-wa-input').value.trim();
            if (!phone) return;
            fetch('/api/book-requests', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bookTitle: query, whatsappNumber: phone, source: 'barre de recherche' }),
            }).catch(function() {});
            reqForm.style.display = 'none';
            document.getElementById('search-request-success').style.display = 'block';
          });
        }
      }
    } catch (e) {
      hideDropdown();
    }
  }

  // Debounced input
  input.addEventListener('input', function() {
    var q = input.value.trim();
    if (q === lastQuery) return;
    lastQuery = q;
    clearTimeout(debounceTimer);
    if (q.length < 2) { hideDropdown(); return; }
    debounceTimer = setTimeout(function() { performSearch(q); }, 400);
  });

  // Prevent form submit from navigating if dropdown is open with results
  form.addEventListener('submit', function(e) {
    var q = input.value.trim();
    if (q.length >= 2) {
      e.preventDefault();
      clearTimeout(debounceTimer);
      performSearch(q);
    }
  });

  // Close dropdown on click outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-bar')) {
      hideDropdown();
    }
  });

  // Close on Escape
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hideDropdown();
  });
}

document.addEventListener('DOMContentLoaded', injectComponents);
