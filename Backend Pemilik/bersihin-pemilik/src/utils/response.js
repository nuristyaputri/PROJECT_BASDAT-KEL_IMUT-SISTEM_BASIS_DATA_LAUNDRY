// Format response sesuai kontrak API (bagian 9)
const ok = (res, message, data = null, code = 200) =>
  res.status(code).json({ success: true, message, data });

const fail = (res, code, message) =>
  res.status(code).json({ success: false, message, data: null });

// Bungkus handler async agar error tertangkap -> 500
const asyncHandler = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    fail(res, 500, 'Terjadi kesalahan pada server');
  });

module.exports = { ok, fail, asyncHandler };
