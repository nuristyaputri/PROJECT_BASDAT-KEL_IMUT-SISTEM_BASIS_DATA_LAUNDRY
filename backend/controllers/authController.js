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

    // 1. Jalur MySQL Database (jalankan ensureSchema agar pelanggan dengan id_user NULL otomatis disinkronkan)
    let foundUser = null;
    let authSource = 'database';
    const DEMO_SEEDED_HASH = '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

    try {
      if (typeof db.ensureSchema === 'function') {
        await db.ensureSchema();
      }

      const idCleanNoSpace = identifier.toLowerCase().replace(/\s+/g, '');
      const [rows] = await db.execute(
        `SELECT u.id_user, u.username, u.email, u.no_telp, u.password, u.role, u.status,
                p.id_pelanggan,
                COALESCE(p.created_at, u.created_at) AS created_at,
                COALESCE(p.nama, pg.nama, pm.nama, u.username) AS nama,
                COALESCE(p.telepon, pg.telepon, pm.telepon, u.no_telp, '') AS telepon_profil,
                COALESCE(p.alamat, pg.alamat, pm.alamat, '') AS alamat_profil
         FROM users u
         LEFT JOIN pelanggan p ON p.id_user = u.id_user
         LEFT JOIN pegawai pg ON pg.id_user = u.id_user
         LEFT JOIN pemilik pm ON pm.id_user = u.id_user
         WHERE (
           u.username = ?
           OR u.email = ?
           OR u.no_telp = ?
           OR LOWER(SUBSTRING_INDEX(u.email, '@', 1)) = LOWER(?)
           OR LOWER(p.nama) = LOWER(?)
           OR LOWER(REPLACE(p.nama, ' ', '')) = ?
           OR LOWER(SUBSTRING_INDEX(p.nama, ' ', 1)) = LOWER(?)
           OR p.telepon = ?
         ) AND u.status = 'AKTIF'
         LIMIT 1`,
        [identifier, identifier, identifier, identifier, identifier, idCleanNoSpace, identifier, identifier]
      );

      if (rows && rows.length > 0) {
        foundUser = rows[0];
      } else {
        // Jika belum ada di tabel users, cek apakah ada di tabel pelanggan (misal id_user masih NULL seperti Maya Anggraini)
        const [unlinkedRows] = await db.execute(
          `SELECT * FROM pelanggan
           WHERE email = ?
              OR telepon = ?
              OR LOWER(nama) = LOWER(?)
              OR LOWER(REPLACE(nama, ' ', '')) = ?
              OR LOWER(SUBSTRING_INDEX(nama, ' ', 1)) = LOWER(?)
              OR LOWER(SUBSTRING_INDEX(email, '@', 1)) = LOWER(?)
           LIMIT 1`,
          [identifier, identifier, identifier, idCleanNoSpace, identifier, identifier]
        );

        if (unlinkedRows && unlinkedRows.length > 0) {
          const cust = unlinkedRows[0];
          const cleanEmail = cust.email ? String(cust.email).trim().toLowerCase() : `${idCleanNoSpace}@example.com`;
          const cleanPhone = cust.telepon ? String(cust.telepon).trim() : null;
          let genUsername = String(cust.nama || idCleanNoSpace).toLowerCase().replace(/[^a-z0-9]/g, '') || `pelanggan${cust.id_pelanggan}`;

          const [uCheck] = await db.execute('SELECT id_user FROM users WHERE username = ? LIMIT 1', [genUsername]);
          if (uCheck && uCheck.length > 0) {
            genUsername = `${genUsername}${cust.id_pelanggan}`;
          }

          const [insUser] = await db.execute(
            "INSERT INTO users (username, email, no_telp, password, role, status) VALUES (?, ?, ?, ?, 'PELANGGAN', 'AKTIF')",
            [genUsername, cleanEmail, cleanPhone, DEMO_SEEDED_HASH]
          );

          if (insUser && insUser.insertId) {
            await db.execute('UPDATE pelanggan SET id_user = ? WHERE id_pelanggan = ?', [insUser.insertId, cust.id_pelanggan]);
            foundUser = {
              id_user: insUser.insertId,
              id_pelanggan: cust.id_pelanggan,
              username: genUsername,
              email: cleanEmail,
              no_telp: cleanPhone,
              password: DEMO_SEEDED_HASH,
              role: 'PELANGGAN',
              status: 'AKTIF',
              created_at: cust.created_at,
              nama: cust.nama,
              telepon_profil: cust.telepon || '',
              alamat_profil: cust.alamat || ''
            };
          }
        }
      }
    } catch (dbErr) {
      // MySQL offline / database belum diimport, beralih ke in-memory store
      foundUser = null;
    }

    // 2. Jalur In-Memory Fallback (jika MySQL tidak menemukan atau sedang offline)
    if (!foundUser) {
      const idLower = identifier.toLowerCase();
      const idNoSpace = idLower.replace(/\s+/g, '');
      const mockUser = mockDb.users.find(u => {
        const emailPrefix = u.email ? u.email.toLowerCase().split('@')[0] : '';
        const match = u.username.toLowerCase() === idLower ||
                      (u.email && u.email.toLowerCase() === idLower) ||
                      (emailPrefix && emailPrefix === idLower) ||
                      (u.nama && (u.nama.toLowerCase() === idLower || u.nama.toLowerCase().replace(/\s+/g, '') === idNoSpace || u.nama.toLowerCase().split(' ')[0] === idLower)) ||
                      (u.no_telp && u.no_telp === identifier) ||
                      (u.telepon && u.telepon === identifier);
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

    // Verifikasi password (Bcrypt / Plaintext fallback / Seed Hash fallback)
    let passwordValid = false;

    try {
      passwordValid = await bcrypt.compare(password, foundUser.password);
    } catch (_) {
      passwordValid = false;
    }

    if (!passwordValid) {
      if (password === foundUser.password) {
        passwordValid = true;
      } else if (password === 'password123' && (foundUser.password === DEMO_SEEDED_HASH || !foundUser.password)) {
        passwordValid = true;
      }
    }

    if (!passwordValid) {
      return sendJSONResponse(res, false, 'Password yang Anda masukkan salah.', null, 401);
    }

    // Ambil data profil tambahan sesuai peran langsung dari tabel relasi MySQL
    let profileData = {};
    let idPelanggan = null;
    let idPegawai = null;
    let idPemilik = null;

    if (foundUser.role === 'PEMILIK') {
      try {
        const [ownerRows] = await db.query(
          'SELECT * FROM pemilik WHERE id_user = ? LIMIT 1',
          [foundUser.id_user]
        );
        if (ownerRows && ownerRows.length > 0) {
          profileData = ownerRows[0];
          idPemilik = ownerRows[0].id_pemilik;
        }
      } catch (_) {}
      if (!idPemilik) {
        const mOwner = mockDb.pemilik.find(p => p.id_user === foundUser.id_user);
        if (mOwner) {
          profileData = mOwner;
          idPemilik = mOwner.id_pemilik || null;
        }
      }
    } else if (foundUser.role === 'PEGAWAI') {
      try {
        const [staffRows] = await db.query(
          'SELECT * FROM pegawai WHERE id_user = ? LIMIT 1',
          [foundUser.id_user]
        );
        if (staffRows && staffRows.length > 0) {
          profileData = staffRows[0];
          idPegawai = staffRows[0].id_pegawai;
        }
      } catch (_) {}
      if (!idPegawai) {
        const mStaff = mockDb.pegawai.find(p => p.id_user === foundUser.id_user);
        if (mStaff) {
          profileData = mStaff;
          idPegawai = mStaff.id_pegawai || null;
        }
      }
    } else if (foundUser.role === 'PELANGGAN') {
      try {
        const [custRows] = await db.query(
          'SELECT * FROM pelanggan WHERE id_user = ? OR email = ? OR (telepon = ? AND telepon != "") ORDER BY (id_user = ?) DESC, id_pelanggan ASC LIMIT 1',
          [foundUser.id_user, foundUser.email, foundUser.no_telp || '', foundUser.id_user]
        );
        if (custRows && custRows.length > 0) {
          idPelanggan = custRows[0].id_pelanggan;
          profileData = custRows[0];
          if (!custRows[0].id_user && foundUser.id_user) {
            await db.query('UPDATE pelanggan SET id_user = ? WHERE id_pelanggan = ?', [foundUser.id_user, idPelanggan]).catch(() => {});
            profileData.id_user = foundUser.id_user;
          }
        }
      } catch (_) {}
      if (!idPelanggan) {
        const mCust = mockDb.pelanggan.find(p => p.id_user === foundUser.id_user || (p.email && foundUser.email && p.email.toLowerCase() === foundUser.email.toLowerCase()));
        idPelanggan = (mCust && mCust.id_pelanggan) || foundUser.id_pelanggan || null;
        if (mCust && !mCust.id_user && foundUser.id_user) mCust.id_user = foundUser.id_user;
        profileData = mCust || { nama: foundUser.nama || foundUser.username, email: foundUser.email };
      }
    }

    const redirectUrl = getDashboardRedirect(foundUser.role);

    // Buat JWT Token dengan relasi ID profil yang akurat
    const token = jwt.sign(
      {
        id_user: foundUser.id_user,
        id_pelanggan: idPelanggan,
        id_pegawai: idPegawai,
        id_pemilik: idPemilik,
        username: foundUser.username,
        role: foundUser.role
      },
      secret,
      { expiresIn: '1d' }
    );

    // Simpan ke sesi Express jika session middleware aktif
    const userDisplayName = profileData.nama || foundUser.nama || foundUser.username;
    const userPhone = profileData.telepon || foundUser.telepon_profil || foundUser.no_telp || '';
    const userAddress = profileData.alamat || foundUser.alamat_profil || '';

    if (req.session) {
      req.session.user = {
        id_user: foundUser.id_user,
        id_pelanggan: idPelanggan,
        id_pegawai: idPegawai,
        id_pemilik: idPemilik,
        kode_pelanggan: profileData.kode_pelanggan || null,
        kode_pegawai: profileData.kode_pegawai || null,
        kode_pemilik: profileData.kode_pemilik || null,
        jabatan: profileData.jabatan || null,
        member_tier: profileData.member_tier || null,
        username: foundUser.username,
        email: foundUser.email,
        no_telp: userPhone,
        nama: userDisplayName,
        alamat: userAddress,
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
          id_pelanggan: idPelanggan,
          id_pegawai: idPegawai,
          id_pemilik: idPemilik,
          kode_pelanggan: profileData.kode_pelanggan || null,
          kode_pegawai: profileData.kode_pegawai || null,
          kode_pemilik: profileData.kode_pemilik || null,
          jabatan: profileData.jabatan || null,
          member_tier: profileData.member_tier || null,
          username: foundUser.username,
          email: foundUser.email,
          no_telp: userPhone,
          nama: userDisplayName,
          alamat: userAddress,
          role: foundUser.role,
          created_at: profileData.created_at || foundUser.created_at || new Date().toISOString()
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
    { redirect: '/login.html' },
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

    // Coba MySQL lengkap dengan relasi tabel peran
    try {
      const [rows] = await db.execute(
        `SELECT u.id_user, u.username, u.email, u.no_telp, u.role, u.status, u.created_at,
                pm.id_pemilik, pm.kode_pemilik,
                pg.id_pegawai, pg.kode_pegawai, pg.jabatan,
                pl.id_pelanggan, pl.kode_pelanggan, pl.member_tier,
                COALESCE(pm.nama, pg.nama, pl.nama, u.username) AS nama,
                COALESCE(pm.telepon, pg.telepon, pl.telepon, u.no_telp) AS telepon,
                COALESCE(pm.alamat, pg.alamat, pl.alamat, '') AS alamat
         FROM users u
         LEFT JOIN pemilik pm ON u.id_user = pm.id_user
         LEFT JOIN pegawai pg ON u.id_user = pg.id_user
         LEFT JOIN pelanggan pl ON u.id_user = pl.id_user
         WHERE u.id_user = ? LIMIT 1`,
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

/**
 * POST /api/auth/register
 * Pendaftaran akun pelanggan baru
 */
async function register(req, res) {
  try {
    const { nama, email, telepon, password } = req.body || {};

    if (!nama || !email || !password) {
      return sendJSONResponse(res, false, 'Nama lengkap, email, dan kata sandi wajib diisi.', null, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    let baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    if (!baseUsername) baseUsername = 'pelanggan';
    let finalUsername = baseUsername;
    const userTelp = telepon && String(telepon).trim() ? String(telepon).trim() : '08' + Math.floor(1000000000 + Math.random() * 9000000000);

    // Cek MySQL jika ada
    let createdUserId = null;
    let createdCustId = null;
    try {
      if (typeof db.ensureSchema === 'function') {
        await db.ensureSchema();
      }

      const [existing] = await db.execute('SELECT id_user FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
      if (existing && existing.length > 0) {
        return sendJSONResponse(res, false, 'Email ini sudah terdaftar dalam sistem.', null, 409);
      }

      // Pastikan username unik
      const [existingUser] = await db.execute('SELECT id_user FROM users WHERE username = ? LIMIT 1', [finalUsername]);
      if (existingUser && existingUser.length > 0) {
        finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
      }

      const hashed = await bcrypt.hash(password, 10);
      const [result] = await db.execute(
        "INSERT INTO users (username, email, no_telp, password, role, status) VALUES (?, ?, ?, ?, 'PELANGGAN', 'AKTIF')",
        [finalUsername, cleanEmail, userTelp, hashed]
      );

      if (result && result.insertId) {
        createdUserId = result.insertId;
        // Cek apakah data pelanggan sudah ada di tabel pelanggan (misal ditambahkan kasir dengan id_user NULL)
        const [existingCust] = await db.execute(
          'SELECT id_pelanggan FROM pelanggan WHERE email = ? OR telepon = ? OR LOWER(nama) = LOWER(?) LIMIT 1',
          [cleanEmail, userTelp, nama.trim()]
        );

        if (existingCust && existingCust.length > 0) {
          createdCustId = existingCust[0].id_pelanggan;
          await db.execute(
            'UPDATE pelanggan SET id_user = ?, nama = ?, telepon = ?, email = ? WHERE id_pelanggan = ?',
            [createdUserId, nama.trim(), userTelp, cleanEmail, createdCustId]
          );
        } else {
          const kodePelanggan = 'PLG-' + String(createdUserId).padStart(5, '0');
          const [custRes] = await db.execute(
            "INSERT INTO pelanggan (id_user, kode_pelanggan, nama, telepon, email, alamat, member_tier) VALUES (?, ?, ?, ?, ?, ?, 'REGULER')",
            [createdUserId, kodePelanggan, nama.trim(), userTelp, cleanEmail, 'Jl. Margonda Raya No. 45, Beji, Depok']
          );
          if (custRes && custRes.insertId) createdCustId = custRes.insertId;
        }
      }
    } catch (dbErr) {
      console.error('Peringatan: Gagal registrasi database MySQL:', dbErr.message);
    }

    // Simpan ke mockDb
    const mockUserId = createdUserId || (mockDb.users.length + 1);
    const mockCustId = createdCustId || (mockDb.pelanggan.length + 1);
    const mockUser = {
      id_user: mockUserId,
      id_pelanggan: mockCustId,
      username: finalUsername,
      email: cleanEmail,
      no_telp: userTelp,
      telepon: userTelp,
      nama: nama.trim(),
      password: await bcrypt.hash(password, 10).catch(() => password),
      role: 'PELANGGAN',
      status: 'AKTIF'
    };
    mockDb.users.push(mockUser);

    return sendJSONResponse(res, true, 'Pendaftaran akun pelanggan baru berhasil.', {
      id_user: mockUserId,
      id_pelanggan: mockCustId,
      username: finalUsername,
      email: cleanEmail,
      nama: nama.trim(),
      role: 'PELANGGAN',
      created_at: new Date().toISOString(),
      redirect: 'PELANGGAN/dashboard.html'
    }, 201);
  } catch (err) {
    return sendJSONResponse(res, false, 'Gagal mendaftar akun: ' + err.message, null, 500);
  }
}

/**
 * POST /api/auth/reset-password
 * Reset kata sandi pengguna
 */
async function resetPassword(req, res) {
  try {
    const { email, newPassword } = req.body || {};

    if (!email || !newPassword) {
      return sendJSONResponse(res, false, 'Email dan kata sandi baru wajib diisi.', null, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const hashed = await bcrypt.hash(newPassword, 10);

    try {
      await db.execute('UPDATE users SET password = ? WHERE email = ?', [hashed, cleanEmail]);
    } catch (_) {}

    const mockUser = mockDb.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (mockUser) {
      mockUser.password = hashed;
    }

    return sendJSONResponse(res, true, 'Kata sandi berhasil diperbarui.', null, 200);
  } catch (err) {
    return sendJSONResponse(res, false, 'Gagal mengatur ulang kata sandi: ' + err.message, null, 500);
  }
}

module.exports = {
  login,
  register,
  resetPassword,
  logout,
  me,
  updatePassword
};

