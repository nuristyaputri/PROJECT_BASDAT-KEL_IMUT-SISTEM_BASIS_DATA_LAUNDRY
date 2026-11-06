const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

// Verifikasi JWT: Authorization: Bearer <token>
// Payload token: { id_user, username, role }
function verifyToken(req, res, next) {
  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) return fail(res, 401, 'Token tidak ditemukan');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return fail(res, 401, 'Token tidak valid atau sudah kedaluwarsa');
  }
}

// Batasi akses berdasarkan role
const authorizeRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : fail(res, 403, 'Anda tidak memiliki hak akses');

module.exports = { verifyToken, authorizeRole };
