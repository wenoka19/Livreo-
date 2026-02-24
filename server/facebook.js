// ===== FACEBOOK CONVERSIONS API - Configuration =====
const bizSdk = require('facebook-nodejs-business-sdk');
const { v4: uuidv4 } = require('uuid');

const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const PIXEL_ID = process.env.FB_PIXEL_ID;

if (!ACCESS_TOKEN || !PIXEL_ID) {
  console.warn('⚠️ FB_ACCESS_TOKEN ou FB_PIXEL_ID manquant dans .env — tracking Facebook désactivé');
}

if (ACCESS_TOKEN) {
  bizSdk.FacebookAdsApi.init(ACCESS_TOKEN);
}

const EventRequest = bizSdk.EventRequest;
const UserData = bizSdk.UserData;
const ServerEvent = bizSdk.ServerEvent;
const CustomData = bizSdk.CustomData;
const Content = bizSdk.Content;

/**
 * Envoie un événement à l'API Conversions Facebook
 */
async function sendEvent({ eventName, eventId, sourceUrl, userData = {}, customData = {}, req }) {
  if (!ACCESS_TOKEN || !PIXEL_ID) {
    console.log(`[FB] Tracking désactivé — événement ${eventName} non envoyé`);
    return null;
  }

  try {
    // User Data
    const fbUserData = new UserData();

    if (userData.email) fbUserData.setEmail(userData.email.toLowerCase().trim());
    if (userData.phone) fbUserData.setPhone(userData.phone.trim());
    if (userData.firstName) fbUserData.setFirstName(userData.firstName.toLowerCase().trim());
    if (userData.lastName) fbUserData.setLastName(userData.lastName.toLowerCase().trim());
    if (userData.city) fbUserData.setCity(userData.city.toLowerCase().trim());
    if (userData.country) fbUserData.setCountryCode(userData.country.toLowerCase().trim());

    // IP et User-Agent depuis la requête Express
    if (req) {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress;
      if (ip) fbUserData.setClientIpAddress(ip);
      if (req.headers['user-agent']) fbUserData.setClientUserAgent(req.headers['user-agent']);
    }

    // Cookies Facebook (fbc et fbp)
    if (userData.fbc) fbUserData.setFbc(userData.fbc);
    if (userData.fbp) fbUserData.setFbp(userData.fbp);

    // Custom Data
    const fbCustomData = new CustomData();

    if (customData.value !== undefined) fbCustomData.setValue(customData.value);
    if (customData.currency) fbCustomData.setCurrency(customData.currency);
    if (customData.contentName) fbCustomData.setContentName(customData.contentName);
    if (customData.contentCategory) fbCustomData.setContentCategory(customData.contentCategory);
    if (customData.contentIds) fbCustomData.setContentIds(customData.contentIds);
    if (customData.contentType) fbCustomData.setContentType(customData.contentType);
    if (customData.numItems) fbCustomData.setNumItems(customData.numItems);
    if (customData.orderId) fbCustomData.setOrderId(customData.orderId);

    if (customData.contents && Array.isArray(customData.contents)) {
      const contents = customData.contents.map(c => {
        const content = new Content();
        if (c.id) content.setId(c.id);
        if (c.title) content.setTitle(c.title);
        if (c.quantity) content.setQuantity(c.quantity);
        if (c.itemPrice) content.setItemPrice(c.itemPrice);
        return content;
      });
      fbCustomData.setContents(contents);
    }

    // Server Event
    const serverEvent = new ServerEvent()
      .setEventName(eventName)
      .setEventTime(Math.floor(Date.now() / 1000))
      .setUserData(fbUserData)
      .setCustomData(fbCustomData)
      .setActionSource('website');

    if (eventId) serverEvent.setEventId(eventId);
    if (sourceUrl) serverEvent.setEventSourceUrl(sourceUrl);

    // Envoi
    const eventRequest = new EventRequest(ACCESS_TOKEN, PIXEL_ID)
      .setEvents([serverEvent]);

    const response = await eventRequest.execute();
    console.log(`[FB] ✅ Événement "${eventName}" envoyé — events_received: ${response._events_received}`);
    return response;

  } catch (error) {
    console.error(`[FB] ❌ Erreur envoi "${eventName}":`, error.message);
    return null;
  }
}

module.exports = { sendEvent, uuidv4, PIXEL_ID };
