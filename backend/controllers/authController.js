/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/controllers/authController.js
 * Deskripsi: Controller autentikasi terpadu untuk Pemilik, Pegawai, dan Pelanggan.
 * =============================================================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { db: mockDb } = require('../config/dataStore');
const { sendJSONResponse } = require('../middleware/authMiddleware');

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
 * Login terpadu yang mengenali seluruh peran (Pemilik, Pegawai, Pelanggan)
 */
async function login(req, res) {
  try {
    const rawId = req.body.identifier || req.body.username || req.body.email || req.body.telepon || '';
    const rawPass = req.body.password || '';
    const preferredRole = req.body.role ? String(req.body.role).toUpperCase() : null;

    const identifier = String(rawId).trim();
    const password = String(rawPass).trim();

    if (!identifier || !password) {
      return sendJSONResponse(res, false, 'Username/email/telepon dan password wajib diisi.', null, 400);
    }

    const secret = process.env.JWT_SECRET || 'bersihin_laundry_jwt_secret_key_2024_secure';

    // 1. Jalur MySQL Database
    let foundUser = null;
    let authSource = 'database';

    try {
      const [rows] = await db.execute(
        `SELECT id_user, username, email, password, role, status
         FROM users
         WHERE (username = ? OR email = ?) AND status = 'AKTIF'
         LIMIT 1`,
        [identifier, identifier]
      );

      if (rows && rows.length > 0) {
        foundUser = rows[0];
      }
    } catch (dbErr) {
      // MySQL offline / database belum diimport, beralih ke in-memory store
      foundUser = null;
    }

    // 2. Jalur In-Memory Fallback (jika MySQL tidak menemukan atau sedang offline)
    if (!foundUser) {
      const idLower = identifier.toLowerCase();
      const mockUser = mockDb.users.find(u => {
        const match = u.username.toLowerCase() === idLower || (u.email && u.email.toLowerCase() === idLower);
        return match && u.status === 'AKTIF';
      });

      if (mockUser) {
        foundUser = mockUser;
        authSource = 'dataStore';
      }
    }

    if (!foundUser) {
      return sendJSONResponse(res, false, 'Username atau password tidak ditemukan.', null, 401);
    }

    // Filter role jika pengguna memilih tab tertentu di portal login
    if (preferredRole && foundUser.role !== preferredRole) {
      return sendJSONResponse(
        res,
        false,
        `Akun ini terdaftar sebagai ${foundUser.role}, bukan ${preferredRole}. Silakan pilih tab yang sesuai.`,
        null,
        403
      );
    }

    // Verifikasi password (Bcrypt / Plaintext fallback)
    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(password, foundUser.password);
    } catch (_) {
      passwordValid = false;
    }

    if (!passwordValid && password === foundUser.password) {
      passwordValid = true;
    }

    if (!passwordValid) {
      return sendJSONResponse(res, false, 'Password yang Anda masukkan salah.', null, 401);
    }

    // Buat JWT Token
    const token = jwt.sign(
      {
        id_user: foundUser.id_user,
        username: foundUser.username,
        role: foundUser.role
      },
      secret,
      { expiresIn: '1d' }
    );

    // Ambil data profil tambahan sesuai peran
    let profileData = {};
    if (foundUser.role === 'PEMILIK') {
      profileData = mockDb.pemilik.find(p => p.id_user === foundUser.id_user) || { nama: 'Rangga Saputra' };
    } else if (foundUser.role === 'PEGAWAI') {
      profileData = mockDb.pegawai.find(p => p.id_user === foundUser.id_user) || { nama: 'Dina Nurhaliza' };
    } else if (foundUser.role === 'PELANGGAN') {
      profileData = mockDb.pelanggan.find(p => p.id_user === foundUser.id_user) || { nama: 'Andi Pratama' };
    }

    const redirectUrl = getDashboardRedirect(foundUser.role);

    // Simpan ke sesi Express jika session middleware aktif
    if (req.session) {
      req.session.user = {
        id_user: foundUser.id_user,
        username: foundUser.username,
        email: foundUser.email,
        nama: profileData.nama || foundUser.username,
        role: foundUser.role
      };
      req.session.token = token;
    }

    return sendJSONResponse(
      res,
      true,
      `Login berhasil sebagai ${foundUser.role} (Sumber: ${authSource}).`,
      {
        token,
        user: {
          id_user: foundUser.id_user,
          username: foundUser.username,
          email: foundUser.email,
          nama: profileData.nama || foundUser.username,
          role: foundUser.role
        },
        redirect: redirectUrl
      },
      200
    );

  } catch (error) {
    console.error('KESALAHAN AUTH LOGIN:', error);
    return sendJSONResponse(res, false, 'Terjadi gangguan sistem: ' + error.message, null, 500);
  }
}

/**
 * POST /api/auth/logout
 */
function logout(req, res) {
  if (req.session) {
    req.session.destroy();
    res.clearCookie('bersihin.sid');
  }

  return sendJSONResponse(
    res,
    true,
    'Logout berhasil. Sesi telah diakhiri.',
    { redirect: 'login.html' },
    200
  );
}

/**
 * GET /api/auth/me
 * Mengambil informasi akun yang sedang aktif
 */
async function me(req, res) {
  try {
    const idUser = req.user.id_user;

    // Coba MySQL
    try {
      const [rows] = await db.execute(
        `SELECT id_user, username, email, role, status, created_at FROM users WHERE id_user = ? LIMIT 1`,
        [idUser]
      );
      if (rows && rows.length > 0) {
        return sendJSONResponse(res, true, 'Data akun berhasil dimuat.', rows[0]);
      }
    } catch (_) {}

    // Fallback dataStore
    const user = mockDb.users.find(u => u.id_user === idUser);
    if (user) {
      const { password, ...safeUser } = user;
      return sendJSONResponse(res, true, 'Data akun berhasil dimuat (dataStore).', safeUser);
    }

    return sendJSONResponse(res, false, 'Akun tidak ditemukan.', null, 404);
  } catch (err) {
    return sendJSONResponse(res, false, 'Gagal mengambil data akun: ' + err.message, null, 500);
  }
}

/**
 * PUT /api/auth/password
 * Ubah kata sandi
 */
async function updatePassword(req, res) {
  try {
    const { password_lama, password_baru } = req.body || {};
    const idUser = req.user.id_user;

    if (!password_lama || !password_baru) {
      return sendJSONResponse(res, false, 'Password lama dan password baru wajib diisi.', null, 400);
    }

    if (password_baru.length < 6) {
      return sendJSONResponse(res, false, 'Password baru minimal 6 karakter.', null, 400);
    }

    let user = null;
    let isDb = false;

    try {
      const [rows] = await db.execute(`SELECT * FROM users WHERE id_user = ? LIMIT 1`, [idUser]);
      if (rows && rows.length > 0) {
        user = rows[0];
        isDb = true;
      }
    } catch (_) {}

    if (!user) {
      user = mockDb.users.find(u => u.id_user === idUser);
    }

    if (!user) {
      return sendJSONResponse(res, false, 'Akun tidak ditemukan.', null, 404);
    }

    const validOld = await bcrypt.compare(password_lama, user.password) || (password_lama === user.password);
    if (!validOld) {
      return sendJSONResponse(res, false, 'Password lama salah.', null, 400);
    }

    const hashed = await bcrypt.hash(password_baru, 10);
    if (isDb) {
      await db.execute(`UPDATE users SET password = ? WHERE id_user = ?`, [hashed, idUser]);
    } else {
      user.password = hashed;
    }

    return sendJSONResponse(res, true, 'Password berhasil diperbarui.', null, 200);

  } catch (err) {
    return sendJSONResponse(res, false, 'Gagal mengubah password: ' + err.message, null, 500);
  }
}

module.exports = {
  login,
  logout,
  me,
  updatePassword
};

