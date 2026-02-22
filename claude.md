# Livreo — Librairie en ligne COD

## Project Overview
Livreo is a French online bookstore with Cash on Delivery only. No online payment.
Customers browse books, add to cart, and checkout as guests (no account needed).
Admin manages books and orders from a protected dashboard.

---

## Autonomous Operation
- Never ask for confirmation, approval, or yes/no questions during a task
- Make all decisions independently and keep working until the task is fully complete
- Only stop if you are completely blocked with absolutely no way forward
- Always run in automatic mode

---

## Verification Protocol
After completing ANY task (building a page, editing code, adding a feature):

1. Serve the result — run `npx serve .` and open `http://localhost:3000`
2. Take a Playwright screenshot — capture the full page result using the script below
3. Compare to original — compare against the Lireka reference screenshot provided
4. List differences — write out exactly what does not match (colors, fonts, spacing, layout, missing elements)
5. Fix everything — apply all fixes
6. Repeat — take another screenshot and compare again
7. Only stop when the result matches the original structure or I explicitly approve it

### Playwright Screenshot Script
Save as `screenshot.js` in the project root and run with `node screenshot.js`:

```js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000');
  await page.screenshot({ path: 'result.png', fullPage: true });
  await browser.close();
  console.log('Screenshot saved as result.png');
})();
```

---

## Branding & Design

- **Name:** Livreo
- **Tagline:** Ta librairie en ligne, livraison à domicile
- **Language:** French (all text, labels, buttons, messages)
- **Color scheme:** Green and white
  - Primary green: #2E7D32
  - Light green accent: #4CAF50
  - Background: #FFFFFF
  - Text: #212121
  - Secondary text: #757575
  - Border/divider: #E0E0E0
- **Logo:** Text logo — "Livreo" in bold green with a small open book icon
- **Font:** Inter or Poppins from Google Fonts
- **Style:** Clean, fresh, modern — same structure as Lireka but green and white branding

---

## Tech Stack

- **Frontend:** HTML, CSS, vanilla JavaScript
- **Backend:** Node.js + Express
- **Database:** MongoDB with Mongoose
- **Image storage:** Local `/uploads/` folder
- **Deploy:** Railway (frontend + backend together)
- **No frameworks** unless explicitly requested

---

## Design Rules

- Mobile first — always build responsive, test on 375px and 1280px
- Always use CSS variables for colors (defined in `:root`)
- Always use flexbox or CSS grid for layouts
- No inline styles — all styles in `style.css` or component-specific CSS files
- Smooth hover effects on all interactive elements
- Book cards always show: cover image, title, author, original price (crossed out), promotional price, category badge

---

## Site Structure

### Customer Side (Public)
| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Hero, book rows by category, partners bar, Trustpilot, FAQ, newsletter, WhatsApp button |
| Catalog | `catalogue.html` | All books with search and filters |
| Book Detail | `livre.html` | Full book info, add to cart |
| Cart | `panier.html` | Cart summary, quantity edit, remove |
| Checkout | `commande.html` | Name, phone, address form — guest only |
| Confirmation | `confirmation.html` | Order placed successfully message |

### Admin Side (Protected)
| Page | File | Description |
|------|------|-------------|
| Admin Login | `admin/login.html` | Password protected entry |
| Dashboard | `admin/dashboard.html` | Overview stats |
| Books | `admin/livres.html` | Add, edit, delete books |
| Orders | `admin/commandes.html` | See all orders, change status |

---

## Home Page Sections (in order)
1. Announcement bar (top) — green background, white text, e.g. "Livraison gratuite dès 2 livres achetés"
2. Header — logo left, search bar center, cart icon right
3. Navigation bar — book categories
4. Hero banner — featured books carousel or static banner
5. "Dernières parutions" — horizontal scrollable book row
6. "Les meilleurs livres du moment" — horizontal scrollable book row
7. "Nouveaux livres" — horizontal scrollable book row
8. Partner logos bar — (use placeholder logos)
9. Category sections — grid of books per category
10. Trustpilot-style reviews section — 3 customer review cards
11. FAQ section — accordion style, 5-6 common questions
12. Newsletter signup — email input + subscribe button
13. Footer — links, info, copyright
14. WhatsApp floating button — fixed bottom right, green, links to WhatsApp

---

## Book Card Component
Every book card must display:
- Cover image (fallback if no image)
- Category badge (top left of image)
- "Livre physique" badge (top right of image)
- Title (bold)
- Author name (grey)
- Original price (strikethrough, grey)
- Promotional price (bold, green, larger)
- "Ajouter au panier" button

---

## Checkout Flow (COD only)
1. Customer fills: Nom complet, Numéro de téléphone, Adresse de livraison, Ville, Note optionnelle
2. Submit order — no payment, no account
3. Order saved to database with status "En attente"
4. Confirmation page shown with order number
5. Admin sees new order in dashboard

---

## Order Status Flow
En attente → Confirmé → Livré

---

## Admin Features
- Login with username + password (stored in .env)
- Add book: title, author, cover image upload, description, category, genre, original price, promotional price, stock quantity, physical book flag
- Edit / delete any book
- View all orders sorted by newest first
- Change order status: En attente / Confirmé / Livré
- Mark order as delivered

---

## WhatsApp Button
- Fixed position: bottom right corner
- Green circle button with WhatsApp icon
- On click: opens `https://wa.me/[PHONE_NUMBER]` in new tab
- Replace `[PHONE_NUMBER]` with actual number in `.env` as `WHATSAPP_NUMBER`

---

## Environment Variables (.env)
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/livreo
ADMIN_USERNAME=admin
ADMIN_PASSWORD=livreo2024
WHATSAPP_NUMBER=22890000000
SESSION_SECRET=livreo_secret_key
```

---

## File Structure
```
livreo/
├── index.html
├── catalogue.html
├── livre.html
├── panier.html
├── commande.html
├── confirmation.html
├── admin/
│   ├── login.html
│   ├── dashboard.html
│   ├── livres.html
│   └── commandes.html
├── css/
│   ├── style.css
│   ├── admin.css
│   └── variables.css
├── js/
│   ├── main.js
│   ├── cart.js
│   ├── admin.js
│   └── whatsapp.js
├── uploads/
├── server/
│   ├── server.js
│   ├── routes/
│   │   ├── books.js
│   │   ├── orders.js
│   │   └── admin.js
│   └── models/
│       ├── Book.js
│       └── Order.js
├── .env
├── package.json
└── screenshot.js
```

---

## Build Order (follow this exact sequence)
1. Set up project structure and install dependencies
2. Create CSS variables and base styles
3. Build header + navigation component
4. Build footer component
5. Build home page (index.html) with all sections
6. Build book card component
7. Build catalogue page with search and filters
8. Build book detail page
9. Build cart page
10. Build checkout page
11. Build confirmation page
12. Set up Node.js + Express backend
13. Set up MongoDB models (Book, Order)
14. Build API routes (books CRUD, orders)
15. Build admin login page
16. Build admin dashboard
17. Build admin books management page
18. Build admin orders management page
19. Connect frontend to backend
20. Add WhatsApp floating button
21. Full verification — Playwright screenshot all pages, fix all issues
22. Prepare for deployment

---

## Self-Correction Rule
Never consider a task done until you have visually verified the result with a Playwright screenshot and confirmed it matches the design brief. If it does not match, fix and verify again. Repeat until correct.
