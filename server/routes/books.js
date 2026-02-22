const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Book = require('../models/Book');

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `book-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  cb(null, allowed.includes(file.mimetype));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/books — list with filters
router.get('/', async (req, res) => {
  try {
    const { q, category, sort, minPrice, maxPrice, featured, heroFeatured, limit = 20, page = 1 } = req.query;

    const filter = {};

    if (q) filter.$text = { $search: q };
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (heroFeatured === 'true') filter.heroFeatured = true;
    if (minPrice || maxPrice) {
      filter.promoPrice = {};
      if (minPrice) filter.promoPrice.$gte = Number(minPrice);
      if (maxPrice) filter.promoPrice.$lte = Number(maxPrice);
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { promoPrice: 1 };
    else if (sort === 'price_desc') sortObj = { promoPrice: -1 };
    else if (sort === 'popular') sortObj = { featured: -1, createdAt: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const [books, total] = await Promise.all([
      Book.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
      Book.countDocuments(filter),
    ]);

    res.json({ books, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/books/:id — single book
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Livre introuvable' });
    res.json(book);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/books — create (admin only)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = req.file.filename;
    if (data.originalPrice) data.originalPrice = Number(data.originalPrice);
    if (data.promoPrice) data.promoPrice = Number(data.promoPrice);
    if (data.stock) data.stock = Number(data.stock);
    if (data.featured) data.featured = data.featured === 'true';
    if (data.heroFeatured !== undefined) data.heroFeatured = data.heroFeatured === 'true';

    const book = new Book(data);
    await book.save();
    res.status(201).json(book);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/books/:id — update (admin only)
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = req.file.filename;
    if (data.originalPrice) data.originalPrice = Number(data.originalPrice);
    if (data.promoPrice) data.promoPrice = Number(data.promoPrice);
    if (data.stock !== undefined) data.stock = Number(data.stock);
    if (data.featured !== undefined) data.featured = data.featured === 'true';
    if (data.heroFeatured !== undefined) data.heroFeatured = data.heroFeatured === 'true';

    const book = await Book.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!book) return res.status(404).json({ message: 'Livre introuvable' });
    res.json(book);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/books/:id — delete (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: 'Livre introuvable' });

    // Remove image file if exists
    if (book.image) {
      const imgPath = path.join(__dirname, '../../uploads', book.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    res.json({ message: 'Livre supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
