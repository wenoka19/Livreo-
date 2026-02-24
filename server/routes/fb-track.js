// ===== FACEBOOK TRACKING ROUTES =====
const express = require('express');
const router = express.Router();
const { sendEvent, uuidv4 } = require('../facebook');

// POST /api/fb/track — Reçoit les événements du frontend et les envoie côté serveur
router.post('/track', async (req, res) => {
  try {
    const { eventName, eventId, sourceUrl, customData, userData } = req.body;

    if (!eventName) {
      return res.status(400).json({ message: 'eventName requis' });
    }

    // Récupérer les cookies Facebook depuis la requête
    const fbc = req.cookies?._fbc || userData?.fbc || null;
    const fbp = req.cookies?._fbp || userData?.fbp || null;

    await sendEvent({
      eventName,
      eventId: eventId || uuidv4(),
      sourceUrl,
      userData: {
        ...userData,
        fbc,
        fbp,
      },
      customData: customData || {},
      req,
    });

    res.json({ success: true, eventId });
  } catch (error) {
    console.error('[FB Track Route] Erreur:', error.message);
    res.json({ success: false });
  }
});

module.exports = router;
