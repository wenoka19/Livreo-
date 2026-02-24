/**
 * update-descriptions.js
 * Generates compelling book descriptions using Claude API
 * and updates each book via the Livreo admin API.
 *
 * Usage: node update-descriptions.js --api-key sk-ant-xxxxx
 */

const fetch = require('node-fetch');

const BASE_URL = 'https://livreo.io';
const USERNAME = 'livreoadmin';
const PASSWORD = 'Livreo2026200419';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

let sessionCookie = '';

// ===== Parse CLI args =====

function getApiKey() {
  const idx = process.argv.indexOf('--api-key');
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error('Usage: node update-descriptions.js --api-key sk-ant-xxxxx');
    process.exit(1);
  }
  return process.argv[idx + 1];
}

// ===== HTTP helpers =====

async function api(method, endpoint, opts = {}) {
  const url = BASE_URL + endpoint;
  const headers = { ...(opts.headers || {}) };
  if (sessionCookie) headers['Cookie'] = sessionCookie;

  const res = await fetch(url, { method, headers, body: opts.body });

  const raw = res.headers.raw()['set-cookie'];
  if (raw) {
    sessionCookie = raw.map(c => c.split(';')[0]).join('; ');
  }

  return res;
}

async function login() {
  console.log('Connexion à Livreo...');
  const res = await api('POST', '/api/admin/login', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) throw new Error('Login failed: ' + res.status + ' ' + await res.text());
  console.log('Connecté.\n');
}

// ===== Anthropic API =====

async function generateDescription(apiKey, title, author, category) {
  const prompt = `Tu es un expert en marketing de livres. Écris une description accrocheuse en français de maximum 5 lignes (3-4 phrases) pour ce livre. La description doit donner envie de lire le livre, comme Netflix résume ses films.

Règles strictes :
- Ne mentionne JAMAIS le titre du livre dans la description
- Ne mentionne JAMAIS le nom de l'auteur dans la description
- Ne mentionne JAMAIS la catégorie dans la description
- Ne commence JAMAIS par "Découvrez" ou "Plongez dans"
- Va droit au but : résume l'histoire ou le concept du livre de manière captivante et émotionnelle
- Utilise un hook accrocheur dès la première phrase
- Style Netflix : court, punchy, intrigant

Titre : ${title}
Auteur : ${author}
Catégorie : ${category || 'Non classé'}

Réponds UNIQUEMENT avec la description, sans guillemets, sans titre, sans rien d'autre.`;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('Anthropic API error ' + res.status + ': ' + err);
  }

  const data = await res.json();
  return data.content[0].text.trim();
}

// ===== Update book =====

async function updateBook(bookId, description) {
  const res = await api('PUT', '/api/books/' + bookId, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Update failed: ' + res.status + ' ' + text);
  }
}

// ===== Main =====

async function main() {
  const apiKey = getApiKey();

  await login();

  // Fetch all books
  console.log('Récupération des livres...');
  const res = await api('GET', '/api/books?limit=500');
  if (!res.ok) throw new Error('Failed to fetch books: ' + res.status);
  const data = await res.json();
  const books = data.books || data;
  console.log(`${books.length} livres trouvés.\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const id = book._id || book.id;
    const label = `[${i + 1}/${books.length}] ${book.title}`;

    try {
      const description = await generateDescription(apiKey, book.title, book.author, book.category);
      await updateBook(id, description);
      const preview = description.length > 80 ? description.substring(0, 80) + '...' : description;
      console.log(`✅ ${label} — ${preview}`);
      updated++;
    } catch (err) {
      console.log(`❌ ${label} — Erreur: ${err.message}`);
      failed++;
    }

    // 1s delay between API calls
    if (i < books.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log('\n========== RÉSUMÉ ==========');
  console.log(`✅ Descriptions mises à jour : ${updated} sur ${books.length} livres`);
  if (failed > 0) console.log(`❌ Échecs : ${failed}`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
