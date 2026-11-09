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
router.post('/profil', requireCustomerAuth, pelanggan.updatePelanggan);
router.get('/profile', requireCustomerAuth, pelanggan.getPelanggan);
router.put('/profile', requireCustomerAuth, pelanggan.updatePelanggan);
router.post('/profile', requireCustomerAuth, pelanggan.updatePelanggan);

// Ubah Password Pelanggan
router.put('/password', requireCustomerAuth, pelanggan.updatePasswordPelanggan);
router.post('/password', requireCustomerAuth, pelanggan.updatePasswordPelanggan);

// Riwayat & Buat Pesanan
router.get('/pesanan', requireCustomerAuth, pelanggan.getPesanan);
router.get('/orders', requireCustomerAuth, pelanggan.getPesanan);
router.post('/pesanan', pelanggan.createPesanan);
router.post('/orders', pelanggan.createPesanan);
router.get('/pesanan/:idOrCode', pelanggan.getPesananDetail);
router.get('/orders/:idOrCode', pelanggan.getPesananDetail);
router.get('/status/:idOrCode', pelanggan.getPesananDetail);

// Katalog Layanan (Bisa dilihat publik maupun pelanggan)
router.get('/layanan', pelanggan.getLayanan);
router.get('/services', pelanggan.getLayanan);

// Ringkasan Dashboard
router.get('/dashboard-summary', requireCustomerAuth, pelanggan.getDashboardSummary);

module.exports = router;

