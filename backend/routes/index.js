/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/routes/index.js
 * Deskripsi: Aggregator seluruh sub-rute API backend ke satu rute utama.
 * =============================================================================
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const pegawaiRoutes = require('./pegawaiRoutes');
const pemilikRoutes = require('./pemilikRoutes');
const pelangganRoutes = require('./pelangganRoutes');

router.use('/auth', authRoutes);
router.use('/pegawai', pegawaiRoutes);
router.use('/pemilik', pemilikRoutes);
router.use('/pelanggan', pelangganRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API Bersihin Laundry aktif dan berjalan normal.',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

