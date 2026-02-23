/**
 * Livreo — Exit Intent Popup
 * Triggers a book search popup when the user is about to leave the page.
 *
 * Conditions:
 *  - At least 10 seconds on the page
 *  - Cart is empty
 *  - Mouse moves toward the top of the browser (desktop)
 *    OR back button pressed (mobile)
 *  - Only once per browser session
 */
(function () {
  'use strict';

  const SESSION_KEY = 'livreo_exit_popup_shown';
  const MIN_TIME = 10000; // 10 seconds

  // Already shown this session — do nothing
  if (sessionStorage.getItem(SESSION_KEY)) return;

  const pageLoadTime = Date.now();
  let popupTriggered = false;
  let popupEl = null;
  let searchedTitle = '';

  // ===== HELPERS =====

  function canTrigger() {
    if (popupTriggered) return false;
    if (Date.now() - pageLoadTime < MIN_TIME) return false;
    try {
      const cart = JSON.parse(localStorage.getItem('livreo_cart') || '[]');
      if (cart.length > 0) return false;
    } catch (_) {}
    return true;
  }

  function showStep(id) {
    ['1', '2', '3a', '3b'].forEach(n => {
      const el = document.getElementById('ei-step-' + n);
      if (el) el.style.display = 'none';
    });
    const target = document.getElementById('ei-step-' + id);
    if (target) target.style.display = 'block';
  }

  // ===== STYLES =====

  function injectStyles() {
    if (document.getElementById('ei-styles')) return;
    const s = document.createElement('style');
    s.id = 'ei-styles';
    s.textContent = `
      #ei-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.55);
        z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;
        animation: eiFadeIn .25s ease;
      }
      @keyframes eiFadeIn  { from { opacity:0 } to { opacity:1 } }
      @keyframes eiFadeOut { from { opacity:1 } to { opacity:0 } }
      @keyframes eiSlideUp { from { transform:translateY(20px);opacity:0 } to { transform:translateY(0);opacity:1 } }
      @keyframes eiSpin    { to   { transform:rotate(360deg) } }
      #ei-popup {
        background: #fff;
        border-radius: 16px;
        padding: 2rem;
        max-width: 440px; width: 100%;
        position: relative;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,.25);
        animation: eiSlideUp .3s ease;
        max-height: 90vh;
        overflow-y: auto;
      }
      #ei-close {
        position: absolute; top: .9rem; right: .9rem;
        background: none; border: none;
        font-size: 1.1rem; line-height: 1;
        cursor: pointer; color: #888;
        padding: 4px 8px; border-radius: 4px;
      }
      #ei-close:hover { background: #f5f5f5; color: #333; }
      .ei-icon { font-size: 2.5rem; margin-bottom: .75rem; }
      .ei-title {
        font-size: 1.2rem; font-weight: 700;
        color: #1a1a1a; margin-bottom: .4rem;
      }
      .ei-sub {
        font-size: .875rem; color: #666;
        margin-bottom: 1.25rem; line-height: 1.5;
      }
      .ei-input {
        width: 100%; padding: .75rem 1rem;
        border: 2px solid #e0e0e0; border-radius: 8px;
        font-size: 1rem; font-family: inherit;
        margin-bottom: .75rem; outline: none;
        transition: border-color .15s; box-sizing: border-box;
      }
      .ei-input:focus { border-color: #2D6A4F; }
      .ei-btn-primary {
        display: block; width: 100%;
        padding: .85rem; background: #2D6A4F;
        color: #fff; border: none; border-radius: 50px;
        font-size: 1rem; font-weight: 600; font-family: inherit;
        cursor: pointer; text-decoration: none;
        transition: background .15s; box-sizing: border-box; text-align: center;
      }
      .ei-btn-primary:hover { background: #1B4332; }
      .ei-btn-ghost {
        display: block; width: 100%; padding: .7rem;
        background: none; color: #888; border: none;
        font-size: .875rem; font-family: inherit;
        cursor: pointer; margin-top: .4rem;
      }
      .ei-btn-ghost:hover { color: #333; }
      .ei-spinner {
        width: 48px; height: 48px;
        border: 4px solid #e0e0e0; border-top-color: #2D6A4F;
        border-radius: 50%;
        animation: eiSpin .8s linear infinite;
        margin: 0 auto 1.25rem;
      }
      .ei-loading-title { font-size: 1.05rem; font-weight: 700; color: #2D6A4F; margin-bottom: .4rem; }
      .ei-loading-sub   { font-size: .875rem; color: #666; }
      .ei-found-label   { font-size: 1rem; font-weight: 700; color: #2D6A4F; margin-bottom: .25rem; }
      .ei-found-card {
        display: flex; align-items: center; gap: 1rem;
        background: #f7faf8; border-radius: 12px;
        padding: 1rem; margin: .75rem 0 1rem; text-align: left;
        border: 1px solid #e8f5e9;
      }
      .ei-found-card img {
        width: 60px; height: 90px;
        object-fit: cover; border-radius: 6px; flex-shrink: 0;
      }
      .ei-found-card-info { flex: 1; min-width: 0; }
      .ei-found-card-title  { font-size: .9rem; font-weight: 700; color: #1a1a1a; margin-bottom: .2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ei-found-card-author { font-size: .8rem; color: #666; margin-bottom: .4rem; }
      .ei-found-card-price  { font-size: 1rem; font-weight: 700; color: #2D6A4F; }
      .ei-notfound-title { font-size: 1rem; font-weight: 700; color: #1a1a1a; margin-bottom: .5rem; }
      .ei-notfound-sub   { font-size: .875rem; color: #666; margin-bottom: 1.25rem; line-height: 1.5; }
      .ei-success-msg    { font-size: .95rem; color: #2D6A4F; font-weight: 600; margin-top: .75rem; }
    `;
    document.head.appendChild(s);
  }

  // ===== POPUP HTML =====

  function buildPopup() {
    const overlay = document.createElement('div');
    overlay.id = 'ei-overlay';
    overlay.innerHTML = `
      <div id="ei-popup">
        <button id="ei-close" aria-label="Fermer">✕</button>

        <!-- Étape 1 : recherche -->
        <div id="ei-step-1">
          <div class="ei-icon">🔍</div>
          <p class="ei-title">Quel livre cherchez-vous ?</p>
          <p class="ei-sub">Dites-nous le titre et nous le trouvons pour vous</p>
          <form id="ei-search-form">
            <input id="ei-search-input" class="ei-input" type="text"
              placeholder="Titre du livre..." required autocomplete="off">
            <button type="submit" class="ei-btn-primary">Rechercher</button>
          </form>
        </div>

        <!-- Étape 2 : chargement -->
        <div id="ei-step-2" style="display:none;padding:1rem 0;">
          <div class="ei-spinner"></div>
          <p class="ei-loading-title">Vous avez fait un très bon choix&nbsp;!</p>
          <p class="ei-loading-sub">Nous recherchons ce chef-d'œuvre pour vous…</p>
        </div>

        <!-- Étape 3A : livre trouvé -->
        <div id="ei-step-3a" style="display:none;">
          <p class="ei-found-label">Bonne nouvelle, nous l'avons !</p>
          <div id="ei-found-card" class="ei-found-card"></div>
          <a id="ei-view-book" href="#" class="ei-btn-primary">Voir ce livre</a>
          <button class="ei-btn-ghost" id="ei-close-3a">Fermer</button>
        </div>

        <!-- Étape 3B : livre non trouvé -->
        <div id="ei-step-3b" style="display:none;">
          <div class="ei-icon">😔</div>
          <p class="ei-notfound-title">Désolé, ce livre est en rupture de stock.</p>
          <p class="ei-notfound-sub">
            Laissez-nous votre numéro WhatsApp et nous vous contacterons
            dès que nous l'aurons.
          </p>
          <form id="ei-notify-form">
            <input id="ei-wa-input" class="ei-input" type="tel"
              placeholder="Ex: 90000000" required inputmode="numeric">
            <button type="submit" class="ei-btn-primary">Me notifier</button>
          </form>
          <div id="ei-notify-success" style="display:none;">
            <div class="ei-icon">✅</div>
            <p class="ei-success-msg">
              Merci ! Nous vous contacterons dès que le livre sera disponible.
            </p>
          </div>
        </div>
      </div>
    `;
    return overlay;
  }

  // ===== ACTIONS =====

  function closePopup() {
    if (!popupEl) return;
    popupEl.style.animation = 'eiFadeOut .2s ease forwards';
    setTimeout(() => { popupEl && popupEl.remove(); popupEl = null; }, 200);
  }

  async function searchBook(query) {
    const [res] = await Promise.allSettled([
      fetch('/api/books?q=' + encodeURIComponent(query) + '&limit=1'),
      new Promise(r => setTimeout(r, 2200)), // minimum spinner time
    ]);

    if (res.status === 'fulfilled' && res.value.ok) {
      const data = await res.value.json();
      const books = data.books || data;
      if (books && books.length > 0) {
        renderFoundBook(books[0]);
        return;
      }
    }
    showStep('3b');
  }

  function renderFoundBook(book) {
    const id = book._id || book.id;
    const imgSrc = book.image
      ? (book.image.startsWith('http') ? book.image : '/uploads/' + book.image)
      : 'https://via.placeholder.com/60x90/E8F5E9/2E7D32?text=📚';
    const price = (book.promoPrice || book.price || 0).toLocaleString('fr-FR');

    document.getElementById('ei-found-card').innerHTML =
      '<img src="' + imgSrc + '" alt="' + book.title + '" ' +
      'onerror="this.src=\'https://via.placeholder.com/60x90/E8F5E9/2E7D32?text=📚\'">' +
      '<div class="ei-found-card-info">' +
      '<p class="ei-found-card-title">' + book.title + '</p>' +
      '<p class="ei-found-card-author">' + book.author + '</p>' +
      '<p class="ei-found-card-price">' + price + ' FCFA</p>' +
      '</div>';

    document.getElementById('ei-view-book').href = 'livre.html?id=' + id;
    showStep('3a');
  }

  async function submitRequest(bookTitle, whatsappNumber) {
    const btn = document.querySelector('#ei-notify-form button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Envoi…';
    try {
      await fetch('/api/book-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookTitle, whatsappNumber }),
      });
    } catch (_) { /* save silently failed, user still gets the confirmation */ }
    document.getElementById('ei-notify-form').style.display = 'none';
    document.getElementById('ei-notify-success').style.display = 'block';
  }

  // ===== SHOW POPUP =====

  function showPopup() {
    if (popupTriggered) return;
    popupTriggered = true;
    sessionStorage.setItem(SESSION_KEY, '1');

    injectStyles();
    popupEl = buildPopup();
    document.body.appendChild(popupEl);

    // Close on overlay background click
    popupEl.addEventListener('click', e => { if (e.target === popupEl) closePopup(); });
    document.getElementById('ei-close').addEventListener('click', closePopup);
    document.getElementById('ei-close-3a').addEventListener('click', closePopup);

    // Search form
    document.getElementById('ei-search-form').addEventListener('submit', async e => {
      e.preventDefault();
      searchedTitle = document.getElementById('ei-search-input').value.trim();
      if (!searchedTitle) return;
      showStep('2');
      await searchBook(searchedTitle);
    });

    // Notify form — phone digits only
    document.getElementById('ei-wa-input').addEventListener('input', function () {
      this.value = this.value.replace(/[^0-9]/g, '');
    });
    document.getElementById('ei-notify-form').addEventListener('submit', async e => {
      e.preventDefault();
      const phone = document.getElementById('ei-wa-input').value.trim();
      if (!phone) return;
      await submitRequest(searchedTitle, phone);
    });
  }

  // ===== TRIGGERS =====

  // Desktop: mouse leaving toward the top (address bar / tabs)
  document.addEventListener('mouseleave', function (e) {
    if (e.clientY < 10 && canTrigger()) showPopup();
  });

  // Mobile: intercept back button press
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    history.pushState({ eiDummy: true }, document.title, location.href);

    function onPopstate() {
      window.removeEventListener('popstate', onPopstate); // fire only once
      if (canTrigger()) {
        history.pushState({ eiDummy: true }, document.title, location.href);
        showPopup();
      }
    }
    window.addEventListener('popstate', onPopstate);
  }

})();
