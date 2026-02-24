/**
 * facebook.js — Facebook Conversions API module
 * Sends server-side events to Facebook for deduplication with browser Pixel.
 */

const https = require('https');

const PIXEL_ID = process.env.FB_PIXEL_ID;
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const API_VERSION = 'v21.0';

/**
 * Hash a value with SHA-256 (required by Facebook for user data)
 */
function hashSHA256(value) {
  if (!value) return undefined;
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(value.toString().trim().toLowerCase()).digest('hex');
}

/**
 * Send an event to Facebook Conversions API
 * @param {Object} opts
 * @param {string} opts.eventName - e.g. 'PageView', 'ViewContent', 'AddToCart', 'Purchase'
 * @param {string} opts.eventId - unique ID shared with browser pixel for dedup
 * @param {string} opts.sourceUrl - full page URL
 * @param {Object} opts.userData - { ip, ua, fbc, fbp, email, phone }
 * @param {Object} opts.customData - event-specific data { currency, value, content_ids, ... }
 */
function sendEvent(opts) {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn('[FB] Missing FB_PIXEL_ID or FB_ACCESS_TOKEN — skipping server event');
    return Promise.resolve();
  }

  const { eventName, eventId, sourceUrl, userData = {}, customData = {} } = opts;

  const user_data = {};
  if (userData.ip) user_data.client_ip_address = userData.ip;
  if (userData.ua) user_data.client_user_agent = userData.ua;
  if (userData.fbc) user_data.fbc = userData.fbc;
  if (userData.fbp) user_data.fbp = userData.fbp;
  if (userData.email) user_data.em = [hashSHA256(userData.email)];
  if (userData.phone) user_data.ph = [hashSHA256(userData.phone)];

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: sourceUrl,
    action_source: 'website',
    user_data,
  };

  if (Object.keys(customData).length > 0) {
    eventData.custom_data = customData;
  }

  const payload = JSON.stringify({
    data: [eventData],
    access_token: ACCESS_TOKEN,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'graph.facebook.com',
        path: `/${API_VERSION}/${PIXEL_ID}/events`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body));
          } else {
            console.error(`[FB] API error ${res.statusCode}:`, body);
            resolve(null); // don't reject — tracking errors shouldn't break the app
          }
        });
      }
    );
    req.on('error', (err) => {
      console.error('[FB] Request error:', err.message);
      resolve(null);
    });
    req.write(payload);
    req.end();
  });
}

module.exports = { sendEvent, hashSHA256 };
