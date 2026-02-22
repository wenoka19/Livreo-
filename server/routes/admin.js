const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const Order = require('../models/Order');

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const envUser = process.env.ADMIN_USERNAME || 'admin';
  const envPass = process.env.ADMIN_PASSWORD || 'livreo2024';

  if (username === envUser && password === envPass) {
    req.session.isAdmin = true;
    req.session.adminUser = username;
    return res.json({ success: true, message: 'Connexion réussie' });
  }

  res.status(401).json({ success: false, message: 'Identifiants incorrects' });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/admin/check — check session
router.get('/check', (req, res) => {
  res.json({ isAdmin: req.session.isAdmin === true });
});

// GET /api/admin/stats — dashboard stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [totalBooks, totalOrders, pendingOrders, deliveredOrders] = await Promise.all([
      Book.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: 'En attente' }),
      Order.countDocuments({ status: 'Livré' }),
    ]);

    const revenueAgg = await Order.aggregate([
      { $match: { status: 'Livré' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const revenue = revenueAgg[0]?.total || 0;

    res.json({ totalBooks, totalOrders, pendingOrders, deliveredOrders, revenue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(401).json({ message: 'Non autorisé' });
}

module.exports = router;
module.exports.requireAdmin = requireAdmin;
