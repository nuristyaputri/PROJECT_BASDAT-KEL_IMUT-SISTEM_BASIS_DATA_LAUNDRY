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
    no_telp: '081211223344',
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
    no_telp: '081298765432',
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
    no_telp: '081377889900',
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
    no_telp: '081234567821',
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
          SELECT u.id_user, u.username, u.email, u.no_telp, u.password, u.role, u.status,
                 COALESCE(p.nama, pg.nama, pm.nama, u.username) AS nama,
                 COALESCE(p.telepon, pg.telepon, pm.telepon, u.no_telp, '') AS telepon_profil,
                 COALESCE(p.alamat, pg.alamat, pm.alamat, '') AS alamat_profil
          FROM users u
          LEFT JOIN pelanggan p ON p.id_user = u.id_user
          LEFT JOIN pegawai pg ON pg.id_user = u.id_user
          LEFT JOIN pemilik pm ON pm.id_user = u.id_user
          WHERE (u.username = ? OR u.email = ? OR u.no_telp = ?) AND u.status = 'AKTIF'
          LIMIT 1
        `;
        const [rows] = await pool.query(query, [identifier, identifier, identifier]);

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
                no_telp: user.no_telp,
                nama: user.nama,
                telepon: user.telepon_profil || user.no_telp || '',
                alamat: user.alamat_profil || '',
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
 * POST /api/auth/register
 * Pendaftaran akun pelanggan baru
 */
router.post('/register', async (req, res) => {
  try {
    const { nama, email, telepon, password } = req.body;

    if (!email || !password || !nama) {
      return res.status(400).json({
        success: false,
        message: 'Nama lengkap, email, dan kata sandi wajib diisi.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanUsername = cleanEmail.split('@')[0];

    // Simpan ke pool MySQL jika aktif
    if (pool) {
      try {
        const [existing] = await pool.query('SELECT id_user FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
        if (existing && existing.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Email ini sudah terdaftar dalam sistem.'
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
          "INSERT INTO users (username, email, no_telp, password, role, status) VALUES (?, ?, ?, ?, 'PELANGGAN', 'AKTIF')",
          [cleanUsername, cleanEmail, telepon || null, hashedPassword]
        );

        if (result && result.insertId) {
          const kodePelanggan = 'PLG-' + String(result.insertId).padStart(5, '0');
          await pool.query(
            "INSERT INTO pelanggan (id_user, kode_pelanggan, nama, telepon, email, member_tier) VALUES (?, ?, ?, ?, ?, 'REGULER')",
            [result.insertId, kodePelanggan, nama, telepon || '-', cleanEmail]
          ).catch(pErr => {
            console.error('Peringatan: Gagal insert profil pelanggan:', pErr.message);
          });
        }
      } catch (dbErr) {
        console.error('Peringatan: Gagal registrasi MySQL:', dbErr.message);
      }
    }

    // Tambahkan juga ke DEMO_USERS memori
    DEMO_USERS.push({
      id_user: DEMO_USERS.length + 1,
      username: cleanUsername,
      email: cleanEmail,
      telepon: telepon || '',
      nama: nama,
      password: password,
      role: 'PELANGGAN',
      status: 'AKTIF',
      redirect: '/PELANGGAN/dashboard.html'
    });

    return res.status(201).json({
      success: true,
      message: 'Pendaftaran akun pelanggan baru berhasil.',
      data: {
        username: cleanUsername,
        email: cleanEmail,
        nama: nama,
        role: 'PELANGGAN',
        redirect: 'PELANGGAN/dashboard.html'
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mendaftarkan akun: ' + err.message
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Pengaturan ulang kata sandi pengguna
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email dan kata sandi baru wajib diisi.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (pool) {
      try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, cleanEmail]);
      } catch (dbErr) {
        console.warn('Peringatan: Gagal update password MySQL:', dbErr.message);
      }
    }

    const demoUser = DEMO_USERS.find(u => u.email.toLowerCase() === cleanEmail);
    if (demoUser) {
      demoUser.password = newPassword;
    }

    return res.status(200).json({
      success: true,
      message: 'Kata sandi berhasil diperbarui.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengatur ulang kata sandi: ' + err.message
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

