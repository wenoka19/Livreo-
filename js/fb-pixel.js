/**
 * fb-pixel.js — Facebook Pixel (browser side) + server-side event relay
 *
 * Loads the FB Pixel snippet, fires browser events,
 * and sends a mirror POST to /api/fb/track for Conversions API dedup.
 */

(function () {
  'use strict';

  // Pixel ID injected by server or hardcoded as fallback
  var PIXEL_ID = window.FB_PIXEL_ID || '900863532926426';

  // ===== Load Facebook Pixel base code =====
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  // ===== Helpers =====

  function generateEventId() {
    return 'eid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function sendServerEvent(eventName, eventId, customData, userData) {
    var payload = {
      eventName: eventName,
      eventId: eventId,
      sourceUrl: window.location.href,
      customData: customData || {},
    };
    if (userData) payload.userData = userData;

    fetch('/api/fb/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function () {
      // Silent fail — tracking should never block UX
    });
  }

  // ===== Public API =====

  window.FBTrack = {
    /**
     * ViewContent — call on livre.html when book data is loaded
     * @param {Object} book - { id, title, category, price }
     */
    viewContent: function (book) {
      var eid = generateEventId();
      var data = {
        content_type: 'product',
        content_ids: [book.id],
        content_name: book.title,
        content_category: book.category || '',
        value: book.price || 0,
        currency: 'XOF',
      };
      fbq('track', 'ViewContent', data, { eventID: eid });
      sendServerEvent('ViewContent', eid, data);
    },

    /**
     * AddToCart — call when user clicks Commander
     * @param {Object} item - { id, title, price, qty }
     */
    addToCart: function (item) {
      var eid = generateEventId();
      var data = {
        content_type: 'product',
        content_ids: [item.id],
        content_name: item.title,
        value: (item.price || 0) * (item.qty || 1),
        currency: 'XOF',
      };
      fbq('track', 'AddToCart', data, { eventID: eid });
      sendServerEvent('AddToCart', eid, data);
    },

    /**
     * InitiateCheckout — call on commande.html load
     * @param {Array} items - cart items [{ id, title, price, qty }]
     * @param {number} total - cart total
     */
    initiateCheckout: function (items, total) {
      var eid = generateEventId();
      var data = {
        content_type: 'product',
        content_ids: items.map(function (i) { return i.id; }),
        num_items: items.reduce(function (s, i) { return s + (i.qty || 1); }, 0),
        value: total || 0,
        currency: 'XOF',
      };
      fbq('track', 'InitiateCheckout', data, { eventID: eid });
      sendServerEvent('InitiateCheckout', eid, data);
    },

    /**
     * Purchase — call after successful order submission
     * @param {Object} order - { id, total, items, customer }
     */
    purchase: function (order) {
      var eid = generateEventId();
      var items = order.items || [];
      var data = {
        content_type: 'product',
        content_ids: items.map(function (i) { return i.book || i.id; }),
        num_items: items.reduce(function (s, i) { return s + (i.qty || 1); }, 0),
        value: order.total || 0,
        currency: 'XOF',
      };
      var userData = {};
      if (order.customer) {
        if (order.customer.phone) userData.phone = order.customer.phone;
      }
      fbq('track', 'Purchase', data, { eventID: eid });
      sendServerEvent('Purchase', eid, data, userData);
    },
  };
})();
