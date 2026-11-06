/**
 * Middleware Autentikasi dan Helper Respon JSON
 * Memastikan akses hanya dapat dilakukan oleh pengguna yang telah login dengan role PELANGGAN
 */

/**
 * Format standar respon JSON sesuai Kontrak API
 */
function sendJSONResponse(res, success, message, data = null, statusCode = 200) {
  return res.status(statusCode).json({
    success,
    message,
    data
  });
}

/**
 * Middleware untuk memeriksa sesi login pelanggan
 */
function requireCustomerAuth(req, res, next) {
  // Cek apakah data user ada di session
  const user = req.session && req.session.user;

  if (
    !user ||
    !user.id_user ||
    !user.id_pelanggan ||
    user.role !== 'PELANGGAN'
  ) {
    return sendJSONResponse(
      res,
      false,
      'Sesi tidak valid atau Anda belum masuk. Silakan login terlebih dahulu.',
      null,
      401
    );
  }

  // Tempelkan data auth ke request agar mudah diakses di handler router
  req.auth = user;
  next();
}

module.exports = {
  sendJSONResponse,
  requireCustomerAuth
};

