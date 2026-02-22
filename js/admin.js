/**
 * Livreo — Admin Shared JS
 * Sidebar injection, auth guard, shared helpers
 */

const ADMIN_PAGES = [
  { label: 'Tableau de bord', href: 'dashboard.html', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
  { label: 'Livres', href: 'livres.html', icon: '<path d="M4 6h12a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a4 4 0 0 1-4-4V6z"/><path d="M16 2H8a2 2 0 0 0-2 2v14"/>' },
  { label: 'Commandes', href: 'commandes.html', icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
  { label: 'Catégories', href: 'categories.html', icon: '<path d="M3 7h7v7H3z"/><path d="M14 7h7v7h-7z"/><path d="M3 17h7v4H3z"/><path d="M14 17h7v4h-7z"/>' },
  { label: 'Paramètres', href: 'settings.html', icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' },
];

function renderAdminSidebar() {
  const currentPage = window.location.pathname.split('/').pop();
  return `
  <div class="admin-sidebar-logo">
    <svg width="28" height="28" viewBox="0 0 36 36" fill="none" stroke="#4CAF50" stroke-width="2">
      <path d="M4 6h12a4 4 0 0 1 4 4v18a3 3 0 0 0-3-3H4V6z"/>
      <path d="M32 6H20a4 4 0 0 0-4 4v18a3 3 0 0 1 3-3h13V6z"/>
    </svg>
    <p class="logo-text">Livreo</p>
    <p>Administration</p>
  </div>
  <nav class="admin-nav">
    ${ADMIN_PAGES.map(p => `
    <a href="${p.href}" class="admin-nav-item${p.href === currentPage ? ' active' : ''}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${p.icon}</svg>
      ${p.label}
    </a>`).join('')}
    <a href="../index.html" class="admin-nav-item" style="margin-top:auto;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      Voir la boutique
    </a>
    <a href="#" class="admin-nav-item danger" id="logout-btn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      Déconnexion
    </a>
  </nav>`;
}

async function requireAdminAuth() {
  try {
    const res = await fetch('/api/admin/check');
    const data = await res.json();
    if (!data.isAdmin) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  } catch {
    window.location.href = 'login.html';
    return false;
  }
}

function initAdminSidebar() {
  const sidebar = document.getElementById('admin-sidebar');
  if (sidebar) {
    sidebar.innerHTML = renderAdminSidebar();
    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await fetch('/api/admin/logout', { method: 'POST' });
      window.location.href = 'login.html';
    });
  }
}

function showAdminToast(msg, type = '') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function statusBadge(status) {
  const map = {
    'En attente': 'status-pending',
    'Confirmé': 'status-confirmed',
    'Livré': 'status-delivered',
  };
  return `<span class="status-badge ${map[status] || ''}">${status}</span>`;
}

window.AdminUtils = { requireAdminAuth, initAdminSidebar, showAdminToast, formatDate, statusBadge };
