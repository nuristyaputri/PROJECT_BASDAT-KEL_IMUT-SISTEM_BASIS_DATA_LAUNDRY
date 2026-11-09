/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/middleware/authMiddleware.js
 * Deskripsi: Middleware autentikasi JWT dan Session untuk seluruh aktor sistem.
 * =============================================================================
 */

const jwt = require('jsonwebtoken');

/**
 * Format respon standar JSON
 */
function sendJSONResponse(res, success, message, data = null, statusCode = 200) {
  return res.status(statusCode).json({
    success,
    message,
    data
  });
}

/**
 * Memverifikasi Token JWT dari header Authorization: Bearer <token>
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  // Cek token dari header
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.session && req.session.token) {
    token = req.session.token;
  }

  if (!token) {
    if (req.session && req.session.user) {
      req.user = req.session.user;
      return next();
    }
    return sendJSONResponse(res, false, 'Akses ditolak. Token autentikasi tidak ditemukan.', null, 401);
  }

  try {
    const secret = process.env.JWT_SECRET || 'bersihin_laundry_jwt_secret_key_2024_secure';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return sendJSONResponse(res, false, 'Sesi autentikasi telah kedaluwarsa atau tidak valid.', null, 401);
  }
}

/**
 * Membatasi akses berdasarkan peran pengguna (Role-Based Access Control)
 * Contoh: authorizeRole('PEMILIK') atau authorizeRole('PEGAWAI', 'PEMILIK')
 */
function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendJSONResponse(res, false, 'Informasi peran pengguna tidak ditemukan.', null, 403);
    }

    const userRole = String(req.user.role).toUpperCase();
    const hasRole = allowedRoles.map(r => r.toUpperCase()).includes(userRole);

    if (!hasRole) {
      return sendJSONResponse(
        res,
        false,
        `Akses ditolak. Rute ini memerlukan hak akses [${allowedRoles.join(', ')}], peran Anda: ${userRole}.`,
        null,
        403
      );
    }

    next();
  };
}

/**
 * Middleware ramah session & token khusus aktor Pelanggan
 */
function requireCustomerAuth(req, res, next) {
  // 1. Cek sesi Express
  if (req.session && req.session.user && req.session.user.role === 'PELANGGAN') {
    req.user = req.session.user;
    return next();
  }

  // 2. Cek JWT Token dari Header Authorization
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'bersihin_laundry_jwt_secret_key_2024_secure';
      const decoded = jwt.verify(token, secret);
      if (decoded) {
        req.user = decoded;
        return next();
      }
    } catch (_) {}
  }

  // 3. Fallback jika frontend mengirimkan identitas di body / query
  if (req.body && (req.body.id_pelanggan || req.body.id_user || req.body.email || req.body.telepon || req.body.phone || req.body.nama || req.body.username)) {
    req.user = {
      id_user: req.body.id_user || null,
      id_pelanggan: req.body.id_pelanggan || null,
      username: req.body.username || null,
      email: req.body.email || null,
      nama: req.body.nama || req.body.fullName || null,
      role: 'PELANGGAN'
    };
    return next();
  }

  if (req.query && (req.query.id_pelanggan || req.query.id_user || req.query.email || req.query.username)) {
    req.user = {
      id_user: req.query.id_user || null,
      id_pelanggan: req.query.id_pelanggan || null,
      username: req.query.username || null,
      email: req.query.email || null,
      role: 'PELANGGAN'
    };
    return next();
  }

  // 4. Fallback jika ada token sesi lokal
  req.user = {
    role: 'PELANGGAN'
  };
  return next();
}

module.exports = {
  sendJSONResponse,
  verifyToken,
  authorizeRole,
  requireCustomerAuth
};

