const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const Book = require('../models/Book');

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer: memory storage — files go directly to Cloudinary, never to disk
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  cb(null, allowed.includes(file.mimetype));
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ message: 'Non autorisé' });
}

// Upload a buffer to Cloudinary and return the secure URL
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'livreo', resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// Extract Cloudinary public_id from URL (needed to delete the image)
function extractPublicId(url) {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
  return match ? match[1] : null;
}

// GET /api/books — list with filters
router.get('/', async (req, res) => {
  try {
    const { q, category, sort, minPrice, maxPrice, featured, heroFeatured, limit = 20, page = 1 } = req.query;

    const filter = {};

    if (q) {
      // Use $regex for case-insensitive partial matching on title + author
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: regex }, { author: regex }];
    }
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
router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = await uploadToCloudinary(req.file.buffer);
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
router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = await uploadToCloudinary(req.file.buffer);
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
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: 'Livre introuvable' });

    // Delete image from Cloudinary if it was stored there
    if (book.image && book.image.includes('cloudinary.com')) {
      const publicId = extractPublicId(book.image);
      if (publicId) await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    res.json({ message: 'Livre supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
