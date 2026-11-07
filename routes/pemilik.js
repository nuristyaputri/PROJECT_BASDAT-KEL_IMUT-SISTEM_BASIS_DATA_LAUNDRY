/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: routes/pemilik.js
 * Deskripsi: Rute khusus portal Pemilik Bisnis (Laporan Keuangan, Staf, Tarif Layanan)
 * =============================================================================
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/pemilik/dashboard
 * Ringkasan omzet, grafik performa bisnis, dan statistik operasional
 */
router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Data dashboard pemilik berhasil dimuat.',
    data: {
      pemilik: {
        nama: 'Rangga Saputra',
        kode_pemilik: 'OWN-001',
        nama_usaha: 'Bersihin Laundry',
        outlet: 'Pusat & Cabang Dago'
      },
      keuangan: {
        pendapatan_bulan_ini: 'Rp 24.850.000',
        pertumbuhan: '+18%',
        total_pesanan: 342,
        pelanggan_aktif: 128
      }
    }
  });
});

module.exports = router;

