/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: routes/index.js
 * Deskripsi: Induk router terpusat yang menggabungkan seluruh modul rute
 *            autentikasi dan modul masing-masing aktor.
 * =============================================================================
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const pelangganRoutes = require('./pelanggan');
const pegawaiRoutes = require('./pegawai');
const pemilikRoutes = require('./pemilik');

// Pemasangan endpoint prefix
router.use('/auth', authRoutes);
router.use('/pelanggan', pelangganRoutes);
router.use('/pegawai', pegawaiRoutes);
router.use('/pemilik', pemilikRoutes);

// Root API Check
router.get('/', (req, res) => {
  res.json({
    status: 'online',
    app: 'Bersihin Laundry API Router',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/login',
      pelanggan: '/api/pelanggan/dashboard',
      pegawai: '/api/pegawai/dashboard',
      pemilik: '/api/pemilik/dashboard'
    }
  });
});

module.exports = router;

