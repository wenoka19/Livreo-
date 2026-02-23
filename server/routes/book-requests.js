const express = require('express');
const router = express.Router();
const BookRequest = require('../models/BookRequest');

// POST /api/book-requests — public (called by exit intent popup)
router.post('/', async (req, res) => {
  try {
    const { bookTitle, whatsappNumber } = req.body;
    if (!bookTitle || !whatsappNumber) {
      return res.status(400).json({ message: 'Titre du livre et numéro WhatsApp requis' });
    }
    const request = new BookRequest({ bookTitle: bookTitle.trim(), whatsappNumber: whatsappNumber.trim() });
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/book-requests — admin only
router.get('/', async (req, res) => {
  if (!req.session?.isAdmin) return res.status(401).json({ message: 'Non autorisé' });
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};
    const skip = (Number(page) - 1) * Number(limit);
    const [requests, total] = await Promise.all([
      BookRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      BookRequest.countDocuments(filter),
    ]);
    res.json({ requests, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/book-requests/:id/status — admin only
router.patch('/:id/status', async (req, res) => {
  if (!req.session?.isAdmin) return res.status(401).json({ message: 'Non autorisé' });
  try {
    const { status } = req.body;
    if (!['En attente', 'Contacté'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }
    const request = await BookRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!request) return res.status(404).json({ message: 'Demande introuvable' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
