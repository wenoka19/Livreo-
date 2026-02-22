require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

// Fail fast when MongoDB is not connected (don't buffer queries)
mongoose.set('bufferCommands', false);

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || 'livreo_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000, // 24h
  },
}));

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===== API ROUTES =====
const booksRouter = require('./routes/books');
const ordersRouter = require('./routes/orders');
const adminRouter = require('./routes/admin');
const categoriesRouter = require('./routes/categories');
const settingsRouter = require('./routes/settings');

app.use('/api/books', booksRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/settings', settingsRouter);

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== MONGODB CONNECTION =====
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/livreo');
    console.log('✅ MongoDB connecté');
    seedSampleData();
    seedCategories();
    seedDefaultSettings();
  } catch (err) {
    console.warn('⚠️  MongoDB non connecté — mode dégradé (pas de BDD)');
    console.warn('   Démarrez MongoDB ou configurez MONGODB_URI dans .env');
  }
}

// ===== SEED SAMPLE DATA =====
async function seedSampleData() {
  const Book = require('./models/Book');
  const count = await Book.countDocuments();
  if (count > 0) return;

  const samples = [
    { title: 'Les Misérables', author: 'Victor Hugo', category: 'Romans', originalPrice: 5000, promoPrice: 3500, stock: 15, featured: true, description: 'Chef-d\'œuvre de la littérature française, ce roman suit le destin de Jean Valjean, ancien forçat, dans la France du XIXe siècle.' },
    { title: 'Père Riche Père Pauvre', author: 'Robert Kiyosaki', category: 'Développement personnel', originalPrice: 6000, promoPrice: 4500, stock: 20, featured: true, description: 'Un guide incontournable sur l\'éducation financière et l\'investissement personnel.' },
    { title: "L'Alchimiste", author: 'Paulo Coelho', category: 'Romans', originalPrice: 4500, promoPrice: 3000, stock: 18, featured: true, description: 'Un roman initiatique sur la quête de son destin personnel.' },
    { title: 'Sapiens', author: 'Yuval Noah Harari', category: 'Sciences humaines', originalPrice: 7500, promoPrice: 5800, stock: 12, description: 'Une brève histoire de l\'humanité, de la préhistoire à nos jours.' },
    { title: 'Le Petit Prince', author: 'Antoine de Saint-Exupéry', category: 'Jeunesse', originalPrice: 3000, promoPrice: 2000, stock: 25, featured: true, description: 'Un conte poétique et philosophique sur la vie, l\'amour et l\'amitié.' },
    { title: '1984', author: 'George Orwell', category: 'Science-fiction', originalPrice: 4000, promoPrice: 2800, stock: 10, description: 'Une dystopie visionnaire sur la surveillance et le totalitarisme.' },
    { title: 'Thinking Fast and Slow', author: 'Daniel Kahneman', category: 'Sciences humaines', originalPrice: 7000, promoPrice: 5500, stock: 8, description: 'Une exploration fascinante du cerveau humain et de ses biais cognitifs.' },
    { title: 'The 7 Habits of Highly Effective People', author: 'Stephen Covey', category: 'Développement personnel', originalPrice: 6500, promoPrice: 4800, stock: 14, description: 'Les 7 habitudes essentielles pour devenir plus efficace et épanoui.' },
    { title: 'Notre-Dame de Paris', author: 'Victor Hugo', category: 'Romans', originalPrice: 4800, promoPrice: 3200, stock: 9, description: 'Un roman historique autour de la cathédrale Notre-Dame et du bossu Quasimodo.' },
    { title: 'L\'Art de la guerre', author: 'Sun Tzu', category: 'Histoire', originalPrice: 3500, promoPrice: 2500, stock: 20, description: 'Le traité de stratégie militaire le plus ancien et le plus célèbre du monde.' },
  ];

  await Book.insertMany(samples);
  console.log(`📚 ${samples.length} livres exemples insérés`);
}

// ===== SEED DEFAULT CATEGORIES =====
async function seedCategories() {
  const Category = require('./models/Category');
  const count = await Category.countDocuments();
  if (count > 0) return;

  const defaults = ['Romans', 'Sciences humaines', 'Développement personnel', 'Jeunesse', 'Histoire', 'Biographies', 'Science-fiction', 'Policier', 'Autre'];
  await Category.insertMany(defaults.map(name => ({ name })));
  console.log(`🗂️  ${defaults.length} catégories par défaut insérées`);
}

// ===== SEED DEFAULT SETTINGS =====
async function seedDefaultSettings() {
  const SiteSetting = require('./models/SiteSetting');
  const defaults = {
    home_section_1_title: 'Dernières parutions',
    home_section_2_title: 'Les meilleurs livres du moment',
    home_section_3_title: 'Nouveaux livres',
    home_section_cat1_title: 'Romans',
    home_section_cat2_title: 'Développement personnel',
    whatsapp_number: process.env.WHATSAPP_NUMBER || '22893460079',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await SiteSetting.findOneAndUpdate({ key }, { $setOnInsert: { value } }, { upsert: true, new: true });
  }
  console.log('⚙️  Paramètres du site initialisés');
}

// ===== START =====
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Livreo démarré sur http://localhost:${PORT}`);
  });
});
