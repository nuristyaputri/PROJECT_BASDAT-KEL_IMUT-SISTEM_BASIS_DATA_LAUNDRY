/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/routes/pemilikRoutes.js
 * Deskripsi: Rute manajerial dan analitik untuk pemilik laundry.
 * =============================================================================
 */

const express = require('express');
const router = express.Router();

const pemilik = require('../controllers/pemilikController');
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');

router.use(verifyToken, authorizeRole('PEMILIK'));

// Dashboard & Profil
router.get('/dashboard', pemilik.dashboard);
router.get('/profil', pemilik.profil);
router.put('/profil', pemilik.updateProfil);

// Manajemen Pegawai
router.get('/pegawai', pemilik.daftarPegawai);
router.get('/pegawai/:id', pemilik.detailPegawai);
router.post('/pegawai', pemilik.tambahPegawai);
router.put('/pegawai/:id', pemilik.updatePegawai);
router.patch('/pegawai/:id/status', pemilik.updateStatusPegawai);

// Manajemen Layanan
router.get('/layanan', pemilik.daftarLayanan);
router.get('/layanan/:id', pemilik.detailLayanan);
router.post('/layanan', pemilik.tambahLayanan);
router.put('/layanan/:id', pemilik.updateLayanan);
router.patch('/layanan/:id/status', pemilik.updateStatusLayanan);

// Monitoring Pelanggan
router.get('/pelanggan', pemilik.daftarPelanggan);
router.get('/pelanggan/:id', pemilik.detailPelanggan);

// Monitoring Pesanan
router.get('/pesanan', pemilik.daftarPesanan);
router.get('/pesanan/:id', pemilik.detailPesanan);

// Monitoring Transaksi
router.get('/transaksi', pemilik.daftarTransaksi);
router.get('/transaksi/:id', pemilik.detailTransaksi);

// Laporan Finansial
router.get('/laporan/pendapatan', pemilik.laporanPendapatan);

module.exports = router;

