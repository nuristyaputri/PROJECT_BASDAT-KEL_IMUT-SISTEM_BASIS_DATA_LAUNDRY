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

  // 2. Cek JWT Token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'bersihin_laundry_jwt_secret_key_2024_secure';
      const decoded = jwt.verify(token, secret);
      if (decoded.role === 'PELANGGAN') {
        req.user = decoded;
        return next();
      }
    } catch (_) {}
  }

  return sendJSONResponse(res, false, 'Silakan login terlebih dahulu sebagai pelanggan.', null, 401);
}

module.exports = {
  sendJSONResponse,
  verifyToken,
  authorizeRole,
  requireCustomerAuth
};

