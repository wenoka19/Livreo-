/**
 * Livreo — Cart Management
 * Stores cart in localStorage as array of { id, title, author, price, image, qty }
 */

const CART_KEY = 'livreo_cart';

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
  if (typeof window.updateFloatingCTA === 'function') window.updateFloatingCTA();
}

function addToCart(book) {
  const cart = getCart();
  const existing = cart.find(item => item.id === book.id);
  if (existing) {
    existing.qty += book.qty || 1;
  } else {
    cart.push({ ...book, qty: book.qty || 1 });
  }
  saveCart(cart);
  showToast('Livre ajouté à votre commande ! 📚', 'success');
}

function removeFromCart(id) {
  const cart = getCart().filter(item => item.id !== id);
  saveCart(cart);
}

function updateQty(id, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty = Math.max(1, qty);
    saveCart(cart);
  }
}

function clearCart() {
  saveCart([]);
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

function updateCartCount() {
  const count = getCart().reduce((sum, i) => sum + i.qty, 0);
  document.querySelectorAll('#cart-count').forEach(el => { el.textContent = count; });
}

// Expose globally
window.Cart = { getCart, addToCart, removeFromCart, updateQty, clearCart, getCartTotal, showToast };
