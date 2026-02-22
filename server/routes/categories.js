const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// GET all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create category (admin only)
router.post('/', async (req, res) => {
  if (!req.session?.isAdmin) return res.status(401).json({ message: 'Non autorisé' });
  try {
    const category = new Category({ name: req.body.name?.trim() });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update category (admin only)
router.put('/:id', async (req, res) => {
  if (!req.session?.isAdmin) return res.status(401).json({ message: 'Non autorisé' });
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name?.trim() },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ message: 'Catégorie introuvable' });
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE category (admin only)
router.delete('/:id', async (req, res) => {
  if (!req.session?.isAdmin) return res.status(401).json({ message: 'Non autorisé' });
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Catégorie introuvable' });
    res.json({ message: 'Catégorie supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
