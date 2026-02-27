/**
 * scrape-and-import-books.js
 * Recherche des livres via Google Books API, dédoublonne, compresse les images,
 * et importe dans Livreo via l'API admin.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const FormData = require('form-data');

// ===== CONFIG =====
const LIVREO_URL = 'https://livreo.io';
const ADMIN_USER = 'livreoadmin';
const ADMIN_PASS = 'Livreo2026200419';
const CATEGORY = 'Développement personnel';
const TARGET_BOOKS = 500;
const IMPORT_DELAY = 500;
const TMP_DIR = path.join(__dirname, '_tmp_covers');

const SEARCH_TERMS = [
  'développement personnel', 'confiance en soi', 'intelligence émotionnelle',
  'leadership', 'productivité', 'habitudes succès', 'mindset motivation',
  'gestion du temps', 'communication persuasion', 'liberté financière',
  'réussir sa vie', 'pensée positive', 'méditation pleine conscience',
  'entrepreneuriat', 'coaching', 'psychologie positive', 'relations humaines',
  'estime de soi', 'épanouissement personnel', 'succès financier',
  'pouvoir de l\'esprit', 'art de vivre', 'bien-être mental',
  'loi de l\'attraction', 'prise de décision',
];

// ===== HELPERS =====

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, options, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpRequest(res.headers.location, options).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function jsonRequest(url, options = {}) {
  return httpRequest(url, options).then(r => {
    try { return { ...r, json: JSON.parse(r.body.toString()) }; }
    catch { return { ...r, json: null }; }
  });
}

function roundToHundred(n) {
  return Math.ceil(n / 100) * 100;
}

function generatePromoPrice() {
  // Random between 3000-6000, rounded to 100
  const base = 3000 + Math.random() * 3000;
  return roundToHundred(base);
}

// ===== GOOGLE BOOKS =====

async function searchGoogleBooks(term, startIndex = 0) {
  const q = encodeURIComponent(term);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&langRestrict=fr&maxResults=40&startIndex=${startIndex}`;
  try {
    const res = await jsonRequest(url);
    if (!res.json || !res.json.items) return [];
    return res.json.items;
  } catch {
    return [];
  }
}

function extractBookInfo(item) {
  const vol = item.volumeInfo || {};
  if (!vol.title) return null;
  if (vol.language && vol.language !== 'fr') return null;

  const authors = vol.authors ? vol.authors.join(', ') : 'Auteur inconnu';
  let description = vol.description || '';
  if (description.length > 300) description = description.substring(0, 297) + '...';

  // Get best image
  let imageUrl = null;
  if (vol.imageLinks) {
    imageUrl = vol.imageLinks.thumbnail || vol.imageLinks.smallThumbnail || null;
    // Use higher res
    if (imageUrl) imageUrl = imageUrl.replace('zoom=1', 'zoom=2');
  }

  return {
    title: vol.title.trim(),
    author: authors,
    description,
    imageUrl,
  };
}

// ===== LIVREO API =====

let sessionCookies = '';

function parseCookies(headers) {
  const setCookies = headers['set-cookie'];
  if (!setCookies) return;
  setCookies.forEach(c => {
    const name = c.split(';')[0];
    // Merge into existing
    const key = name.split('=')[0];
    const regex = new RegExp(`(^|; )${key}=[^;]*`);
    if (regex.test(sessionCookies)) {
      sessionCookies = sessionCookies.replace(regex, `$1${name}`);
    } else {
      sessionCookies = sessionCookies ? `${sessionCookies}; ${name}` : name;
    }
  });
}

async function adminLogin() {
  console.log('🔐 Connexion admin...');
  const body = JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS });
  const url = `${LIVREO_URL}/api/admin/login`;

  const res = await httpRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    body,
  });

  parseCookies(res.headers);

  if (res.statusCode === 200) {
    console.log('✅ Connecté en tant qu\'admin');
    return true;
  } else {
    console.error('❌ Échec connexion admin:', res.body.toString());
    return false;
  }
}

async function getExistingBooks() {
  console.log('📚 Récupération du catalogue existant...');
  const url = `${LIVREO_URL}/api/books?limit=9999`;
  const res = await jsonRequest(url, {
    headers: { Cookie: sessionCookies },
  });
  const data = res.json;
  const books = data.books || data || [];
  console.log(`   ${books.length} livres existants trouvés`);
  return books;
}

async function ensureCategory() {
  // Check if category exists
  const res = await jsonRequest(`${LIVREO_URL}/api/categories`, {
    headers: { Cookie: sessionCookies },
  });
  const cats = res.json || [];
  const exists = cats.some(c => c.name === CATEGORY);
  if (exists) {
    console.log(`📂 Catégorie "${CATEGORY}" existe`);
    return;
  }
  // Create it
  const body = JSON.stringify({ name: CATEGORY });
  const createRes = await httpRequest(`${LIVREO_URL}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Cookie: sessionCookies },
    body,
  });
  parseCookies(createRes.headers);
  console.log(`📂 Catégorie "${CATEGORY}" créée`);
}

async function downloadImage(url, filepath) {
  const res = await httpRequest(url);
  if (res.statusCode !== 200) return false;
  fs.writeFileSync(filepath, res.body);
  return true;
}

async function compressImage(inputPath, outputPath) {
  await sharp(inputPath)
    .resize({ width: 600, withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  // If still too large, reduce quality
  if (stats.size > 150 * 1024) {
    await sharp(inputPath)
      .resize({ width: 600, withoutEnlargement: true })
      .jpeg({ quality: 50 })
      .toFile(outputPath);
  }
  return true;
}

async function importBook(book, index, total) {
  const promoPrice = generatePromoPrice();
  const originalPrice = roundToHundred(promoPrice * 1.30);

  // Download and compress image
  const rawPath = path.join(TMP_DIR, `raw_${index}.jpg`);
  const compPath = path.join(TMP_DIR, `comp_${index}.jpg`);

  if (!book.imageUrl) {
    console.log(`⏭️  ${index}/${total} : ${book.title} — Pas d'image, ignoré`);
    return 'no_image';
  }

  try {
    const downloaded = await downloadImage(book.imageUrl, rawPath);
    if (!downloaded) {
      console.log(`⏭️  ${index}/${total} : ${book.title} — Téléchargement image échoué`);
      return 'no_image';
    }
    await compressImage(rawPath, compPath);
  } catch (err) {
    console.log(`⏭️  ${index}/${total} : ${book.title} — Erreur image: ${err.message}`);
    // Clean up
    if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
    if (fs.existsSync(compPath)) fs.unlinkSync(compPath);
    return 'no_image';
  }

  // Build multipart form
  const form = new FormData();
  form.append('title', book.title);
  form.append('author', book.author);
  form.append('category', CATEGORY);
  form.append('description', book.description);
  form.append('promoPrice', String(promoPrice));
  form.append('originalPrice', String(originalPrice));
  form.append('stock', '20');
  form.append('image', fs.createReadStream(compPath), { filename: `book_${index}.jpg`, contentType: 'image/jpeg' });

  try {
    const result = await new Promise((resolve, reject) => {
      const url = new URL(`${LIVREO_URL}/api/books`);
      const options = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        headers: {
          ...form.getHeaders(),
          Cookie: sessionCookies,
        },
      };

      const mod = url.protocol === 'https:' ? https : http;
      const req = mod.request(options, (res) => {
        parseCookies(res.headers);
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          resolve({ statusCode: res.statusCode, body });
        });
      });
      req.on('error', reject);
      form.pipe(req);
    });

    if (result.statusCode >= 200 && result.statusCode < 300) {
      console.log(`✅ ${index}/${total} : ${book.title} — Importé à ${CATEGORY}`);
      return 'imported';
    } else {
      console.log(`❌ ${index}/${total} : ${book.title} — Erreur ${result.statusCode}: ${result.body.substring(0, 100)}`);
      return 'error';
    }
  } catch (err) {
    console.log(`❌ ${index}/${total} : ${book.title} — Erreur: ${err.message}`);
    return 'error';
  } finally {
    // Cleanup temp files
    if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
    if (fs.existsSync(compPath)) fs.unlinkSync(compPath);
  }
}

// ===== MAIN =====

async function main() {
  console.log('='.repeat(60));
  console.log('📖 Scrape & Import — Livreo');
  console.log('='.repeat(60));

  // Create temp dir
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  // 1. Login
  const loggedIn = await adminLogin();
  if (!loggedIn) { process.exit(1); }

  // 2. Get existing books
  const existingBooks = await getExistingBooks();
  const existingTitles = new Set(existingBooks.map(b => b.title.toLowerCase().trim()));

  // 3. Ensure category
  await ensureCategory();

  // 4. Search Google Books
  console.log('\n🔍 Recherche Google Books...');
  const allBooks = new Map(); // title lowercase -> book info

  for (const term of SEARCH_TERMS) {
    if (allBooks.size >= TARGET_BOOKS) break;

    for (const startIndex of [0, 40, 80]) {
      if (allBooks.size >= TARGET_BOOKS) break;

      process.stdout.write(`   "${term}" (startIndex=${startIndex})...`);
      const items = await searchGoogleBooks(term, startIndex);

      let added = 0;
      for (const item of items) {
        const info = extractBookInfo(item);
        if (!info) continue;
        const key = info.title.toLowerCase().trim();
        if (allBooks.has(key)) continue;
        if (existingTitles.has(key)) continue;
        allBooks.set(key, info);
        added++;
      }
      console.log(` ${items.length} résultats, ${added} nouveaux → total: ${allBooks.size}`);

      // Small delay to avoid rate limiting
      await sleep(300);
    }
  }

  const booksToImport = Array.from(allBooks.values());
  console.log(`\n📊 ${booksToImport.length} livres à importer (${existingTitles.size} existants ignorés)`);

  // 5. Import
  console.log('\n🚀 Import en cours...\n');
  let imported = 0, duplicates = 0, errors = 0, noImage = 0;

  for (let i = 0; i < booksToImport.length; i++) {
    const book = booksToImport[i];
    const idx = i + 1;

    // Double-check duplicate (title might have been imported in this session)
    if (existingTitles.has(book.title.toLowerCase().trim())) {
      console.log(`⏭️  ${idx}/${booksToImport.length} : ${book.title} — Déjà dans le catalogue`);
      duplicates++;
      continue;
    }

    const result = await importBook(book, idx, booksToImport.length);

    switch (result) {
      case 'imported':
        imported++;
        existingTitles.add(book.title.toLowerCase().trim());
        break;
      case 'no_image':
        noImage++;
        break;
      case 'error':
        errors++;
        break;
    }

    // Progress every 50
    if (idx % 50 === 0) {
      console.log(`\n--- Progression: ${idx}/${booksToImport.length} | ✅ ${imported} importés | ⏭️ ${duplicates + noImage} ignorés | ❌ ${errors} erreurs ---\n`);
    }

    await sleep(IMPORT_DELAY);
  }

  // 6. Cleanup
  if (fs.existsSync(TMP_DIR)) {
    const remaining = fs.readdirSync(TMP_DIR);
    remaining.forEach(f => fs.unlinkSync(path.join(TMP_DIR, f)));
    fs.rmdirSync(TMP_DIR);
  }

  // 7. Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(60));
  console.log(`✅ Livres importés     : ${imported}`);
  console.log(`⏭️  Doublons ignorés    : ${duplicates}`);
  console.log(`🖼️  Sans image (ignorés): ${noImage}`);
  console.log(`❌ Erreurs             : ${errors}`);
  console.log(`📚 Total traités       : ${booksToImport.length}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('💀 Erreur fatale:', err);
  process.exit(1);
});
