/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: routes/pelanggan.js
 * Deskripsi: Rute khusus portal Pelanggan (Pesanan, Tracking, Riwayat, Layanan)
 * =============================================================================
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/pelanggan/dashboard
 * Ringkasan data untuk halaman dashboard pelanggan
 */
router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Data dashboard pelanggan berhasil dimuat.',
    data: {
      pelanggan: {
        nama: 'Andi Pratama',
        kode_pelanggan: 'PLG-08129',
        member_tier: 'Silver Member',
        poin: 120
      },
      pesanan_aktif: {
        kode_pesanan: 'TRX-240518-01',
        layanan: 'Cuci Komplit (Cuci + Setrika)',
        berat: '4,5 kg',
        status: 'DICUCI',
        tahapan: '3 dari 5 tahapan',
        estimasi_selesai: '21 Mei 2024, 16.00 WIB'
      },
      statistik: {
        total_transaksi: 14,
        total_kg: '68,5 kg',
        penghematan: 'Rp 45.000'
      }
    }
  });
});

/**
 * GET /api/pelanggan/pesanan
 * Daftar seluruh pesanan milik pelanggan
 */
router.get('/pesanan', (req, res) => {
  res.json({
    success: true,
    message: 'Daftar pesanan pelanggan berhasil dimuat.',
    data: [
      {
        kode_pesanan: 'TRX-240518-01',
        tanggal: '18 Mei 2024',
        layanan: 'Cuci Komplit (4,5 kg)',
        total_harga: 40500,
        status: 'DICUCI',
        metode_bayar: 'QRIS'
      },
      {
        kode_pesanan: 'TRX-240510-04',
        tanggal: '10 Mei 2024',
        layanan: 'Cuci Komplit (6,0 kg)',
        total_harga: 54000,
        status: 'SELESAI',
        metode_bayar: 'QRIS'
      }
    ]
  });
});

module.exports = router;

