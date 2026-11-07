/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: routes/pegawai.js
 * Deskripsi: Rute khusus portal Staf Pegawai (POS Kasir, Antrean Cucian, Update Status)
 * =============================================================================
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/pegawai/dashboard
 * Ringkasan data untuk dashboard operasional kasir & operator
 */
router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Data dashboard pegawai berhasil dimuat.',
    data: {
      pegawai: {
        nama: 'Dina Nurhaliza',
        kode_pegawai: 'PGW-001',
        jabatan: 'Kasir Utama',
        shift: '08.00 - 16.00 WIB'
      },
      ringkasan_hari_ini: {
        pesanan_baru: 12,
        sedang_dicuci: 8,
        siap_ambil: 5,
        selesai: 19
      }
    }
  });
});

/**
 * POST /api/pegawai/pesanan/status
 * Memperbarui tahapan status cucian pelanggan
 */
router.post('/pesanan/status', (req, res) => {
  const { kode_pesanan, status_baru, catatan } = req.body || {};
  res.json({
    success: true,
    message: `Status pesanan ${kode_pesanan || ''} berhasil diperbarui menjadi ${status_baru || ''}.`,
    data: {
      kode_pesanan,
      status_baru,
      catatan: catatan || 'Status diperbarui oleh kasir',
      waktu: new Date().toISOString()
    }
  });
});

module.exports = router;

