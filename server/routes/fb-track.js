/**
 * fb-track.js — Route for server-side Facebook event tracking
 * POST /api/fb/track
 */

const express = require('express');
const router = express.Router();
const { sendEvent } = require('../facebook');

router.post('/track', async (req, res) => {
  try {
    const { eventName, eventId, sourceUrl, customData } = req.body;

    if (!eventName || !eventId) {
      return res.status(400).json({ message: 'eventName and eventId are required' });
    }

    // Build user data from request
    const userData = {
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      ua: req.headers['user-agent'],
      fbc: req.cookies?.fbc || req.cookies?._fbc || null,
      fbp: req.cookies?.fbp || req.cookies?._fbp || null,
    };

    // If customer data is provided (e.g. at purchase)
    if (req.body.userData) {
      if (req.body.userData.email) userData.email = req.body.userData.email;
      if (req.body.userData.phone) userData.phone = req.body.userData.phone;
    }

    await sendEvent({
      eventName,
      eventId,
      sourceUrl: sourceUrl || req.headers.referer || '',
      userData,
      customData: customData || {},
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[FB Track] Error:', err.message);
    res.json({ success: false });
  }
});

module.exports = router;
