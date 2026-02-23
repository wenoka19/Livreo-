const mongoose = require('mongoose');

const bookRequestSchema = new mongoose.Schema({
  bookTitle: { type: String, required: true, trim: true },
  whatsappNumber: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['En attente', 'Contacté'],
    default: 'En attente',
  },
}, { timestamps: true });

module.exports = mongoose.model('BookRequest', bookRequestSchema);
