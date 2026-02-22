/**
 * Livreo — WhatsApp Button
 * The button is injected via components.js renderFooter().
 * This file exposes a helper to open WhatsApp with a pre-filled message.
 */

function openWhatsApp(message = '') {
  const number = '22890000000';
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${number}${encoded ? '?text=' + encoded : ''}`, '_blank');
}

window.WhatsApp = { open: openWhatsApp };
