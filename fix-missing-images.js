/**
 * fix-missing-images.js
 * Finds books without cover images, fetches them from Google Books,
 * compresses with sharp, and uploads via the admin API.
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://livreo.io';
const USERNAME = 'livreoadmin';
const PASSWORD = 'Livreo2026200419';
const TMP_DIR = path.join(__dirname, '_tmp_images');

let sessionCookie = '';

// ===== HTTP helpers =====

async function api(method, endpoint, opts = {}) {
  const url = BASE_URL + endpoint;
  const headers = { ...(opts.headers || {}) };
  if (sessionCookie) headers['Cookie'] = sessionCookie;

  const res = await fetch(url, { method, headers, body: opts.body, redirect: 'manual' });

  // Capture set-cookie
  const raw = res.headers.raw()['set-cookie'];
  if (raw) {
    const cookies = raw.map(c => c.split(';')[0]);
    sessionCookie = cookies.join('; ');
  }

  return res;
}

async function login() {
  console.log('Logging in...');
  const res = await api('POST', '/api/admin/login', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) throw new Error('Login failed: ' + res.status + ' ' + await res.text());
  console.log('Logged in successfully.\n');
}

// ===== Google Books =====

async function searchGoogleBooks(query) {
  const url = 'https://www.googleapis.com/books/v1/volumes?q=' +
    encodeURIComponent(query) + '&maxResults=3&printType=books';
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.items || data.items.length === 0) return null;

  for (const item of data.items) {
    const imgs = item.volumeInfo?.imageLinks;
    if (!imgs) continue;
    // Prefer largest available
    const imgUrl = imgs.extraLarge || imgs.large || imgs.medium ||
                   imgs.small || imgs.thumbnail || imgs.smallThumbnail;
    if (imgUrl) {
      // Google Books returns http URLs — upgrade to https and remove edge= param for bigger image
      return imgUrl.replace('http://', 'https://').replace('&edge=curl', '');
    }
  }
  return null;
}

async function findCoverImage(title, author) {
  // Try title + author first
  let url = await searchGoogleBooks(title + ' ' + author);
  if (url) return url;

  // Fallback: title only
  url = await searchGoogleBooks(title);
  return url;
}

// ===== Image processing =====

async function downloadAndCompress(imageUrl, outputPath) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error('Download failed: ' + res.status);
  const buffer = Buffer.from(await res.arrayBuffer());

  await sharp(buffer)
    .resize({ width: 600, withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .withMetadata(false)  // strip EXIF
    .toFile(outputPath);

  // Verify size < 150 KB
  const stat = fs.statSync(outputPath);
  if (stat.size > 150 * 1024) {
    // Re-compress with lower quality
    await sharp(outputPath)
      .jpeg({ quality: 55 })
      .withMetadata(false)
      .toFile(outputPath + '.tmp');
    fs.renameSync(outputPath + '.tmp', outputPath);
  }

  return outputPath;
}

// ===== Upload =====

async function uploadImage(bookId, imagePath) {
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath), {
    filename: path.basename(imagePath),
    contentType: 'image/jpeg',
  });

  const res = await api('PUT', '/api/books/' + bookId, {
    headers: form.getHeaders(),
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Upload failed: ' + res.status + ' ' + text);
  }
  return await res.json();
}

// ===== Main =====

function isMissingImage(book) {
  if (!book.image) return true;
  if (book.image === '') return true;
  if (book.image.includes('placeholder')) return true;
  if (book.image.includes('via.placeholder.com')) return true;
  return false;
}

async function main() {
  // Ensure tmp dir
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

  // Login
  await login();

  // Fetch all books
  console.log('Fetching all books...');
  const res = await api('GET', '/api/books?limit=500');
  if (!res.ok) throw new Error('Failed to fetch books: ' + res.status);
  const data = await res.json();
  const allBooks = data.books || data;
  console.log(`Total books: ${allBooks.length}`);

  // Filter books missing images
  const missingBooks = allBooks.filter(isMissingImage);
  console.log(`Books without image: ${missingBooks.length}\n`);

  if (missingBooks.length === 0) {
    console.log('All books have images. Nothing to do.');
    return;
  }

  let added = 0;
  let failed = 0;
  const failedList = [];

  for (let i = 0; i < missingBooks.length; i++) {
    const book = missingBooks[i];
    const label = `[${i + 1}/${missingBooks.length}] ${book.title}`;

    try {
      // Search Google Books
      const imageUrl = await findCoverImage(book.title, book.author);
      if (!imageUrl) {
        console.log(`${label} ❌ Pas d'image trouvée`);
        failed++;
        failedList.push(book.title);
        continue;
      }

      // Download + compress
      const tmpPath = path.join(TMP_DIR, `book_${book._id || book.id}.jpg`);
      await downloadAndCompress(imageUrl, tmpPath);

      // Upload
      await uploadImage(book._id || book.id, tmpPath);
      const size = (fs.statSync(tmpPath).size / 1024).toFixed(0);
      console.log(`${label} ✅ Image ajoutée (${size} Ko)`);
      added++;

      // Small delay to be nice to APIs
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`${label} ❌ Erreur: ${err.message}`);
      failed++;
      failedList.push(book.title);
    }
  }

  // Summary
  console.log('\n========== RÉSUMÉ ==========');
  console.log(`✅ Images ajoutées : ${added}`);
  console.log(`❌ Toujours sans image : ${failed}`);
  if (failedList.length > 0) {
    console.log('\nLivres sans image :');
    failedList.forEach(t => console.log(`  - ${t}`));
  }

  // Cleanup
  if (fs.existsSync(TMP_DIR)) {
    fs.readdirSync(TMP_DIR).forEach(f => fs.unlinkSync(path.join(TMP_DIR, f)));
    fs.rmdirSync(TMP_DIR);
    console.log('\nFichiers temporaires supprimés.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
