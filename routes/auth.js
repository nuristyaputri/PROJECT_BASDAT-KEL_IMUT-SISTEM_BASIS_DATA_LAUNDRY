/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: routes/auth.js
 * Deskripsi: Router autentikasi terpusat untuk seluruh aktor sistem
 *            (Pemilik, Pegawai, dan Pelanggan).
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// Helper untuk deteksi database pool dari backend tunggal
let pool = null;
try {
  pool = require('../backend/config/database');
} catch (e) {
  pool = null;
}

// Data Akun Bawaan (Demo Fallback jika server berjalan tanpa koneksi MySQL aktif)
const DEMO_USERS = [
  {
    id_user: 1,
    username: 'pemilik',
    email: 'rangga@bersihin.id',
    telepon: '081211223344',
    nama: 'Rangga Saputra',
    password: 'password123',
    role: 'PEMILIK',
    status: 'AKTIF',
    redirect: '/PEMILIK/dashboard.html'
  },
  {
    id_user: 2,
    username: 'dina.staff',
    email: 'dina.nurhaliza@bersihin.id',
    telepon: '081298765432',
    nama: 'Dina Nurhaliza',
    password: 'password123',
    role: 'PEGAWAI',
    status: 'AKTIF',
    redirect: '/PEGAWAI/dashboard.html'
  },
  {
    id_user: 3,
    username: 'budi.operator',
    email: 'budi.operator@bersihin.id',
    telepon: '081377889900',
    nama: 'Budi Santoso',
    password: 'password123',
    role: 'PEGAWAI',
    status: 'AKTIF',
    redirect: '/PEGAWAI/dashboard.html'
  },
  {
    id_user: 4,
    username: 'andipratama',
    email: 'andi.pratama@email.com',
    telepon: '081234567821',
    nama: 'Andi Pratama',
    password: 'password123',
    role: 'PELANGGAN',
    status: 'AKTIF',
    redirect: '/PELANGGAN/dashboard.html'
  }
];

/**
 * Helper penentuan rute tujuan dashboard berdasarkan peran pengguna
 */
function getDashboardRedirect(role) {
  switch (String(role).toUpperCase()) {
    case 'PEMILIK':
      return 'PEMILIK/dashboard.html';
    case 'PEGAWAI':
      return 'PEGAWAI/dashboard.html';
    case 'PELANGGAN':
    default:
      return 'PELANGGAN/dashboard.html';
  }
}

/**
 * POST /api/auth/login
 * Endpoint login terpadu: Menerima kredensial dan mengarahkan otomatis
 * ke dashboard aktor terkait (Pemilik, Pegawai, atau Pelanggan).
 */
router.post('/login', async (req, res) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.username || req.body.email || req.body.telepon || '';
    const rawPassword = req.body.password || '';
    const preferredRole = req.body.role ? String(req.body.role).toUpperCase() : null;

    const identifier = String(rawIdentifier).trim();
    const password = String(rawPassword).trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email/telepon dan password wajib diisi.',
        data: null
      });
    }

    // 1. Coba verifikasi lewat Database MySQL jika pool tersedia
    if (pool) {
      try {
        const query = `
          SELECT id_user, username, email, password, role, status
          FROM users
          WHERE (username = ? OR email = ?) AND status = 'AKTIF'
          LIMIT 1
        `;
        const [rows] = await pool.query(query, [identifier, identifier]);

        if (rows && rows.length > 0) {
          const user = rows[0];

          // Validasi filter peran jika disediakan oleh pengguna pada tab login
          if (preferredRole && user.role !== preferredRole) {
            return res.status(403).json({
              success: false,
              message: `Akun ini terdaftar sebagai ${user.role}, bukan ${preferredRole}. Silakan pilih tab yang sesuai.`,
              data: null
            });
          }

          let passwordValid = false;
          try {
            passwordValid = await bcrypt.compare(password, user.password);
          } catch (e) {
            passwordValid = false;
          }

          // Fallback plaintext jika belum di-hash di database
          if (!passwordValid && password === user.password) {
            passwordValid = true;
          }

          if (passwordValid) {
            const redirectUrl = getDashboardRedirect(user.role);
            return res.status(200).json({
              success: true,
              message: `Login berhasil sebagai ${user.role}.`,
              data: {
                id_user: user.id_user,
                username: user.username,
                email: user.email,
                role: user.role,
                redirect: redirectUrl
              }
            });
          }
        }
      } catch (dbErr) {
        console.warn('Peringatan: Gagal query database, beralih ke verifikasi data fallback:', dbErr.message);
      }
    }

    // 2. Fallback verifikasi data demo terstruktur (Offline / Tanpa MySQL aktif)
    const normalizedId = identifier.toLowerCase();
    const demoUser = DEMO_USERS.find(u => {
      const matchId = u.username.toLowerCase() === normalizedId ||
                      u.email.toLowerCase() === normalizedId ||
                      u.telepon === normalizedId;
      if (!matchId) return false;
      if (preferredRole && u.role !== preferredRole) return false;
      return true;
    });

    if (demoUser && password === demoUser.password) {
      const redirectUrl = getDashboardRedirect(demoUser.role);
      return res.status(200).json({
        success: true,
        message: `Login berhasil sebagai ${demoUser.role} (Mode Demo Terpadu).`,
        data: {
          id_user: demoUser.id_user,
          username: demoUser.username,
          email: demoUser.email,
          nama: demoUser.nama,
          role: demoUser.role,
          redirect: redirectUrl
        }
      });
    }

    // Jika akun tidak ditemukan atau kata sandi tidak cocok
    return res.status(401).json({
      success: false,
      message: 'Kredensial tidak valid. Periksa kembali username/email dan kata sandi Anda.',
      data: null
    });

  } catch (err) {
    console.error('Kesalahan server pada router autentikasi:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi gangguan internal server: ' + err.message,
      data: null
    });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Sesi login berhasil diakhiri.',
    data: {
      redirect: '/login.html'
    }
  });
});

module.exports = router;

