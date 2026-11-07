/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/routes/pegawaiRoutes.js
 * Deskripsi: Rute operasional kasir dan pegawai laundry.
 * =============================================================================
 */

const express = require('express');
const router = express.Router();

const pegawai = require('../controllers/pegawaiController');
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');

router.use(verifyToken, authorizeRole('PEGAWAI', 'PEMILIK'));

// Dashboard & Profil
router.get('/dashboard', pegawai.dashboard);
router.get('/profil', pegawai.profil);
router.put('/profil', pegawai.updateProfil);

// Pelanggan
router.get('/pelanggan', pegawai.daftarPelanggan);
router.get('/pelanggan/:id', pegawai.detailPelanggan);
router.post('/pelanggan', pegawai.tambahPelanggan);
router.put('/pelanggan/:id', pegawai.updatePelanggan);

// Pesanan
router.get('/pesanan', pegawai.daftarPesanan);
router.get('/pesanan/:id', pegawai.detailPesanan);
router.post('/pesanan', pegawai.tambahPesanan);
router.patch('/pesanan/:id/status', pegawai.updateStatus);

// Transaksi & Pembayaran
router.get('/transaksi', pegawai.daftarTransaksi);
router.get('/transaksi/:id', pegawai.detailTransaksi);
router.post('/transaksi/:id/pembayaran', pegawai.tambahPembayaran);
router.patch(
  '/transaksi/:id/pembayaran/:id_pembayaran/status',
  pegawai.updateStatusPembayaran
);

module.exports = router;

