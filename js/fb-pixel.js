// ===== FACEBOOK PIXEL - Script Frontend =====
(function() {
  const FB_PIXEL_ID = window.FB_PIXEL_ID || null;

  if (!FB_PIXEL_ID) {
    console.log('[FB Pixel] Pixel ID non configuré — tracking désactivé');
    return;
  }

  // Initialisation du Pixel
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', FB_PIXEL_ID);
  fbq('track', 'PageView');

  // Helper : Générer un eventID unique
  function generateEventId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Helper : Récupérer un cookie
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // Helper : Envoyer l'événement côté serveur (API Conversions)
  async function sendServerEvent(eventName, eventId, customData, userData) {
    try {
      await fetch('/api/fb/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          eventId,
          sourceUrl: window.location.href,
          customData,
          userData: {
            ...userData,
            fbc: getCookie('_fbc'),
            fbp: getCookie('_fbp'),
          },
        }),
      });
    } catch (err) {
      console.log('[FB] Erreur envoi serveur:', err.message);
    }
  }

  // ===== ÉVÉNEMENTS PUBLICS =====

  window.FBTrack = {
    // ViewContent — page produit
    viewContent: function(book) {
      const eventId = generateEventId();
      const data = {
        content_ids: [book.id],
        content_name: book.title,
        content_category: book.category || '',
        content_type: 'product',
        value: book.price,
        currency: 'XOF',
      };
      fbq('track', 'ViewContent', data, { eventID: eventId });
      sendServerEvent('ViewContent', eventId, {
        contentIds: [book.id],
        contentName: book.title,
        contentCategory: book.category || '',
        contentType: 'product',
        value: book.price,
        currency: 'XOF',
      });
    },

    // AddToCart — ajout au panier
    addToCart: function(book, quantity) {
      const eventId = generateEventId();
      const totalValue = book.price * (quantity || 1);
      const data = {
        content_ids: [book.id],
        content_name: book.title,
        content_type: 'product',
        value: totalValue,
        currency: 'XOF',
        contents: [{ id: book.id, quantity: quantity || 1 }],
      };
      fbq('track', 'AddToCart', data, { eventID: eventId });
      sendServerEvent('AddToCart', eventId, {
        contentIds: [book.id],
        contentName: book.title,
        contentType: 'product',
        value: totalValue,
        currency: 'XOF',
        contents: [{ id: book.id, title: book.title, quantity: quantity || 1, itemPrice: book.price }],
      });
    },

    // InitiateCheckout — début du processus de commande
    initiateCheckout: function(cart, total) {
      const eventId = generateEventId();
      const contentIds = cart.map(item => item.id);
      const numItems = cart.reduce((sum, item) => sum + item.qty, 0);
      const data = {
        content_ids: contentIds,
        content_type: 'product',
        value: total,
        currency: 'XOF',
        num_items: numItems,
      };
      fbq('track', 'InitiateCheckout', data, { eventID: eventId });
      sendServerEvent('InitiateCheckout', eventId, {
        contentIds: contentIds,
        contentType: 'product',
        value: total,
        currency: 'XOF',
        numItems: numItems,
        contents: cart.map(item => ({ id: item.id, title: item.title, quantity: item.qty, itemPrice: item.price })),
      });
    },

    // Purchase — commande confirmée
    purchase: function(order) {
      const eventId = generateEventId();
      const contentIds = order.items.map(item => item.id || item.book);
      const numItems = order.items.reduce((sum, item) => sum + item.qty, 0);
      const data = {
        content_ids: contentIds,
        content_type: 'product',
        value: order.total,
        currency: 'XOF',
        num_items: numItems,
      };
      fbq('track', 'Purchase', data, { eventID: eventId });
      sendServerEvent('Purchase', eventId, {
        contentIds: contentIds,
        contentType: 'product',
        value: order.total,
        currency: 'XOF',
        numItems: numItems,
        orderId: order.orderId,
        contents: order.items.map(item => ({
          id: item.id || item.book,
          title: item.title,
          quantity: item.qty,
          itemPrice: item.price,
        })),
      }, {
        phone: order.customer?.phone,
        firstName: order.customer?.name?.split(' ')[0],
        lastName: order.customer?.name?.split(' ').slice(1).join(' '),
        country: 'tg',
      });
    },
  };
})();
