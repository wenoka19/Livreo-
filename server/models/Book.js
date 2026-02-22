const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est obligatoire'],
    trim: true,
  },
  author: {
    type: String,
    required: [true, 'L\'auteur est obligatoire'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'La catégorie est obligatoire'],
    default: 'Autre',
    trim: true,
  },
  genre: {
    type: String,
    default: '',
    trim: true,
  },
  originalPrice: {
    type: Number,
    required: [true, 'Le prix original est obligatoire'],
    min: 0,
  },
  promoPrice: {
    type: Number,
    required: [true, 'Le prix promotionnel est obligatoire'],
    min: 0,
  },
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  image: {
    type: String,
    default: '',
  },
  isPhysical: {
    type: Boolean,
    default: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  heroFeatured: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Text index for search
bookSchema.index({ title: 'text', author: 'text', description: 'text' });

module.exports = mongoose.model('Book', bookSchema);
