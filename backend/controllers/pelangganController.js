/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/controllers/pelangganController.js
 * Deskripsi: Controller terpadu untuk kebutuhan pelanggan (profil, pesanan, layanan).
 * =============================================================================
 */

const pool = require('../config/database');
const { db: mockDb, nextId, fmt } = require('../config/dataStore');

function getCustomerId(req) {
  if (req.user && req.user.id_pelanggan) return Number(req.user.id_pelanggan);
  if (req.session && req.session.user && req.session.user.id_pelanggan) return Number(req.session.user.id_pelanggan);
  if (req.user && req.user.id_user) {
    const mockP = mockDb.pelanggan.find(p => p.id_user === Number(req.user.id_user));
    if (mockP) return mockP.id_pelanggan;
  }
  return null;
}

/**
 * GET /api/pelanggan/profil
 * Mengambil data profil pelanggan yang sedang login
 */
async function getPelanggan(req, res) {
  try {
    const idPelanggan = getCustomerId(req);
    if (!idPelanggan) {
      return res.status(401).json({
        success: false,
        message: 'Sesi pelanggan tidak ditemukan. Silakan login kembali.'
      });
    }

    // 1. Coba database MySQL
    try {
      const [rows] = await pool.query(
        `SELECT id_pelanggan, id_user, kode_pelanggan, nama, telepon, email, alamat, created_at
         FROM pelanggan
         WHERE id_pelanggan = ? LIMIT 1`,
        [idPelanggan]
      );

      if (rows && rows.length > 0) {
        return res.json({
          success: true,
          message: 'Data pelanggan berhasil diambil',
          data: rows[0]
        });
      }
    } catch (_) {
      // Fallback ke mock data
    }

    // 2. Fallback mockDb
    const mockCust = mockDb.pelanggan.find(p => p.id_pelanggan === idPelanggan);
    if (mockCust) {
      return res.json({
        success: true,
        message: 'Data pelanggan berhasil diambil (dataStore)',
        data: mockCust
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Data pelanggan tidak ditemukan'
    });
  } catch (error) {
    console.error('Gagal mengambil data pelanggan:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
}

/**
 * PUT /api/pelanggan/profil
 * Memperbarui data profil pelanggan
 */
async function updatePelanggan(req, res) {
  try {
    const idPelanggan = getCustomerId(req);
    if (!idPelanggan) {
      return res.status(401).json({
        success: false,
        message: 'Sesi pelanggan tidak ditemukan. Silakan login kembali.'
      });
    }

    const { nama, telepon, email, alamat } = req.body || {};
    if (!nama || !String(nama).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama pelanggan wajib diisi'
      });
    }

    const cleanNama = String(nama).trim();
    const cleanTelp = telepon ? String(telepon).trim() : null;
    const cleanEmail = email ? String(email).trim() : null;
    const cleanAlamat = alamat ? String(alamat).trim() : null;

    // 1. Perbarui di MySQL
    let dbSuccess = false;
    try {
      await pool.query(
        `UPDATE pelanggan
         SET nama = ?, telepon = ?, email = ?, alamat = ?
         WHERE id_pelanggan = ?`,
        [cleanNama, cleanTelp, cleanEmail, cleanAlamat, idPelanggan]
      );
      dbSuccess = true;
    } catch (_) {
      // Fallback mockDb
    }

    // 2. Perbarui di mockDb
    const mockCust = mockDb.pelanggan.find(p => p.id_pelanggan === idPelanggan);
    if (mockCust) {
      mockCust.nama = cleanNama;
      mockCust.telepon = cleanTelp || '';
      mockCust.email = cleanEmail || '';
      mockCust.alamat = cleanAlamat || '';
    }

    // Perbarui session jika aktif
    if (req.session && req.session.user) {
      req.session.user.nama = cleanNama;
      req.session.user.telepon = cleanTelp || '';
      req.session.user.email = cleanEmail || '';
      req.session.user.alamat = cleanAlamat || '';
    }

    return res.json({
      success: true,
      message: 'Profil pelanggan berhasil diperbarui',
      data: {
        id_pelanggan: idPelanggan,
        nama: cleanNama,
        telepon: cleanTelp,
        email: cleanEmail,
        alamat: cleanAlamat
      }
    });
  } catch (error) {
    console.error('Gagal memperbarui data pelanggan:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
}

/**
 * GET /api/pelanggan/pesanan
 * Mengambil riwayat pesanan milik pelanggan
 */
async function getPesanan(req, res) {
  try {
    const idPelanggan = getCustomerId(req);
    if (!idPelanggan) {
      return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu.' });
    }

    try {
      const [rows] = await pool.query(
        `SELECT p.id_pesanan, p.nomor_pesanan, p.tanggal_masuk, p.tanggal_estimasi_selesai,
                p.total_harga, p.status, p.status_pembayaran, p.catatan
         FROM pesanan p
         WHERE p.id_pelanggan = ?
         ORDER BY p.id_pesanan DESC`,
        [idPelanggan]
      );
      return res.json({ success: true, data: rows });
    } catch (_) {
      const mockOrders = mockDb.pesanan
        .filter(p => p.id_pelanggan === idPelanggan)
        .map(p => ({
          id_pesanan: p.id_pesanan,
          nomor_pesanan: p.nomor_pesanan,
          tanggal_masuk: p.tanggal_masuk,
          tanggal_estimasi_selesai: p.tanggal_estimasi_selesai,
          total_harga: p.total_harga,
          status: p.status,
          status_pembayaran: p.status_pembayaran,
          catatan: p.catatan
        }));
      return res.json({ success: true, data: mockOrders });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil data pesanan' });
  }
}

/**
 * GET /api/pelanggan/layanan
 * Mengambil daftar layanan laundry aktif
 */
async function getLayanan(req, res) {
  try {
    try {
      const [rows] = await pool.query(
        `SELECT id_layanan, nama_layanan, jenis, tarif_per_satuan, estimasi_durasi_jam, satuan, deskripsi
         FROM layanan
         WHERE status = 'AKTIF'`
      );
      return res.json({ success: true, data: rows });
    } catch (_) {
      const activeServices = mockDb.layanan.filter(l => l.status === 'AKTIF');
      return res.json({ success: true, data: activeServices });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil data layanan' });
  }
}

/**
 * GET /api/pelanggan/dashboard-summary
 * Mengambil ringkasan dashboard pelanggan
 */
async function getDashboardSummary(req, res) {
  try {
    const idPelanggan = getCustomerId(req);
    const mockOrders = mockDb.pesanan.filter(p => p.id_pelanggan === idPelanggan);
    const pesananAktif = mockOrders.filter(p => ['MENUNGGU', 'DIPROSES', 'DICUCI', 'DISETRIKA', 'SIAP_DIAMBIL'].includes(p.status));
    const pesananSelesai = mockOrders.filter(p => p.status === 'SELESAI');

    return res.json({
      success: true,
      data: {
        total_pesanan: mockOrders.length,
        pesanan_aktif: pesananAktif.length,
        pesanan_selesai: pesananSelesai.length,
        pesanan_terbaru: mockOrders.slice(0, 5)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil ringkasan dashboard' });
  }
}

module.exports = {
  getPelanggan,
  updatePelanggan,
  getPesanan,
  getLayanan,
  getDashboardSummary
};

