const express = require('express');
const router = express.Router();
const SiteSetting = require('../models/SiteSetting');

// GET all settings (public)
router.get('/', async (req, res) => {
  try {
    const settings = await SiteSetting.find();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update a setting (admin only)
router.put('/:key', async (req, res) => {
  if (!req.session?.adminId) return res.status(401).json({ message: 'Non autorisé' });
  try {
    const setting = await SiteSetting.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body.value ?? '' },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(setting);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT bulk update settings (admin only)
router.put('/', async (req, res) => {
  if (!req.session?.adminId) return res.status(401).json({ message: 'Non autorisé' });
  try {
    const updates = req.body; // { key: value, ... }
    const ops = Object.entries(updates).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { $set: { value: String(value) } },
        upsert: true,
      },
    }));
    await SiteSetting.bulkWrite(ops);
    res.json({ message: 'Paramètres mis à jour' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
