/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/routes/pelangganRoutes.js
 * Deskripsi: Rute khusus pelanggan (profil, riwayat pesanan, katalog layanan).
 * =============================================================================
 */

const express = require('express');
const router = express.Router();

const pelanggan = require('../controllers/pelangganController');
const { requireCustomerAuth } = require('../middleware/authMiddleware');

// Profil Pelanggan
router.get('/profil', requireCustomerAuth, pelanggan.getPelanggan);
router.put('/profil', requireCustomerAuth, pelanggan.updatePelanggan);
router.get('/profile', requireCustomerAuth, pelanggan.getPelanggan);
router.put('/profile', requireCustomerAuth, pelanggan.updatePelanggan);

// Riwayat Pesanan
router.get('/pesanan', requireCustomerAuth, pelanggan.getPesanan);
router.get('/orders', requireCustomerAuth, pelanggan.getPesanan);

// Katalog Layanan (Bisa dilihat publik maupun pelanggan)
router.get('/layanan', pelanggan.getLayanan);
router.get('/services', pelanggan.getLayanan);

// Ringkasan Dashboard
router.get('/dashboard-summary', requireCustomerAuth, pelanggan.getDashboardSummary);

module.exports = router;

