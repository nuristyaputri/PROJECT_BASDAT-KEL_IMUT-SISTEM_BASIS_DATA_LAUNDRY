const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { ok, fail, asyncHandler } = require('../utils/response');

const STATUS_AKTIF = ['AKTIF', 'NONAKTIF'];
const TGL = /^\d{4}-\d{2}-\d{2}$/;

/* ---------- DASHBOARD ---------- */
exports.dashboard = asyncHandler(async (req, res) => {
  const [[data]] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM pegawai)   AS total_pegawai,
      (SELECT COUNT(*) FROM pelanggan) AS total_pelanggan,
      (SELECT COUNT(*) FROM pesanan)   AS total_pesanan,
      (SELECT COALESCE(SUM(jumlah_bayar), 0) FROM pembayaran
        WHERE status_pembayaran = 'BERHASIL') AS total_pendapatan`);
  ok(res, 'Dashboard berhasil diambil', data);
});

/* ---------- PROFIL ---------- */
exports.getProfil = asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.id_user, u.username, u.role, p.id_pemilik, p.nama, p.telepon, p.email, p.alamat
       FROM pemilik p JOIN users u ON u.id_user = p.id_user
      WHERE p.id_user = ?`, [req.user.id_user]);
  if (!rows.length) return fail(res, 404, 'Profil tidak ditemukan');
  ok(res, 'Profil berhasil diambil', rows[0]);
});

exports.updateProfil = asyncHandler(async (req, res) => {
  const { nama, telepon, email, alamat } = req.body;
  if (!nama) return fail(res, 400, 'Nama wajib diisi');
  const [r] = await db.query(
    'UPDATE pemilik SET nama=?, telepon=?, email=?, alamat=? WHERE id_user=?',
    [nama, telepon || null, email || null, alamat || null, req.user.id_user]);
  if (!r.affectedRows) return fail(res, 404, 'Profil tidak ditemukan');
  ok(res, 'Profil berhasil diubah', { nama, telepon, email, alamat });
});

/* ---------- PEGAWAI ---------- */
exports.listPegawai = asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT g.id_pegawai, u.username, g.nama, g.telepon, g.email, g.alamat, g.status
       FROM pegawai g JOIN users u ON u.id_user = g.id_user
      ORDER BY g.id_pegawai`);
  ok(res, 'Data pegawai berhasil diambil', rows);
});

exports.createPegawai = asyncHandler(async (req, res) => {
  const { username, password, nama, telepon, email, alamat } = req.body;
  if (!username || !password || !nama)
    return fail(res, 400, 'username, password, dan nama wajib diisi');
  if (password.length < 6) return fail(res, 400, 'Password minimal 6 karakter');

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const hash = await bcrypt.hash(password, 10);
    const [u] = await conn.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, 'PEGAWAI')",
      [username, hash]);
    const [g] = await conn.query(
      `INSERT INTO pegawai (id_user, nama, telepon, email, alamat, status)
       VALUES (?, ?, ?, ?, ?, 'AKTIF')`,
      [u.insertId, nama, telepon || null, email || null, alamat || null]);
    await conn.commit();
    ok(res, 'Pegawai berhasil ditambahkan',
      { id_pegawai: g.insertId, id_user: u.insertId, username, nama, status: 'AKTIF' }, 201);
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 400, 'Username sudah digunakan');
    throw err;
  } finally {
    conn.release();
  }
});

exports.updatePegawai = asyncHandler(async (req, res) => {
  const { nama, telepon, email, alamat } = req.body;
  if (!nama) return fail(res, 400, 'Nama wajib diisi');
  const [r] = await db.query(
    'UPDATE pegawai SET nama=?, telepon=?, email=?, alamat=? WHERE id_pegawai=?',
    [nama, telepon || null, email || null, alamat || null, req.params.id]);
  if (!r.affectedRows) return fail(res, 404, 'Pegawai tidak ditemukan');
  ok(res, 'Data pegawai berhasil diubah', { id_pegawai: Number(req.params.id), nama, telepon, email, alamat });
});

exports.statusPegawai = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!STATUS_AKTIF.includes(status))
    return fail(res, 400, 'Status harus AKTIF atau NONAKTIF');
  const [r] = await db.query('UPDATE pegawai SET status=? WHERE id_pegawai=?',
    [status, req.params.id]);
  if (!r.affectedRows) return fail(res, 404, 'Pegawai tidak ditemukan');
  ok(res, 'Status pegawai berhasil diubah', { id_pegawai: Number(req.params.id), status });
});

/* ---------- PELANGGAN (hanya lihat) ---------- */
exports.listPelanggan = asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT p.id_pelanggan, u.username, p.nama, p.telepon, p.email, p.alamat
       FROM pelanggan p JOIN users u ON u.id_user = p.id_user
      ORDER BY p.id_pelanggan`);
  ok(res, 'Data pelanggan berhasil diambil', rows);
});

/* ---------- LAYANAN ---------- */
exports.listLayanan = asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    'SELECT id_layanan, nama_layanan, harga, satuan, status FROM layanan ORDER BY id_layanan');
  ok(res, 'Data layanan berhasil diambil', rows);
});

exports.createLayanan = asyncHandler(async (req, res) => {
  const { nama_layanan, harga, satuan } = req.body;
  if (!nama_layanan || harga === undefined || !satuan)
    return fail(res, 400, 'nama_layanan, harga, dan satuan wajib diisi');
  if (typeof harga !== 'number' || harga < 0)
    return fail(res, 400, 'Harga harus berupa angka >= 0');
  const [r] = await db.query(
    "INSERT INTO layanan (nama_layanan, harga, satuan, status) VALUES (?, ?, ?, 'AKTIF')",
    [nama_layanan, harga, satuan]);
  ok(res, 'Layanan berhasil ditambahkan',
    { id_layanan: r.insertId, nama_layanan, harga, satuan, status: 'AKTIF' }, 201);
});

exports.updateLayanan = asyncHandler(async (req, res) => {
  const { nama_layanan, harga, satuan } = req.body;
  if (!nama_layanan || harga === undefined || !satuan)
    return fail(res, 400, 'nama_layanan, harga, dan satuan wajib diisi');
  if (typeof harga !== 'number' || harga < 0)
    return fail(res, 400, 'Harga harus berupa angka >= 0');
  const [r] = await db.query(
    'UPDATE layanan SET nama_layanan=?, harga=?, satuan=? WHERE id_layanan=?',
    [nama_layanan, harga, satuan, req.params.id]);
  if (!r.affectedRows) return fail(res, 404, 'Layanan tidak ditemukan');
  ok(res, 'Layanan berhasil diubah',
    { id_layanan: Number(req.params.id), nama_layanan, harga, satuan });
});

exports.statusLayanan = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!STATUS_AKTIF.includes(status))
    return fail(res, 400, 'Status harus AKTIF atau NONAKTIF');
  const [r] = await db.query('UPDATE layanan SET status=? WHERE id_layanan=?',
    [status, req.params.id]);
  if (!r.affectedRows) return fail(res, 404, 'Layanan tidak ditemukan');
  ok(res, 'Status layanan berhasil diubah', { id_layanan: Number(req.params.id), status });
});

/* ---------- TRANSAKSI (hanya lihat, tidak ada DELETE) ---------- */
exports.listTransaksi = asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT ps.id_pesanan, ps.tanggal_pesanan, pl.nama AS nama_pelanggan,
            g.nama AS nama_pegawai, ps.status AS status_pesanan, ps.total,
            COALESCE(pb.status_pembayaran, 'BELUM_BAYAR') AS status_pembayaran
       FROM pesanan ps
       JOIN pelanggan pl ON pl.id_pelanggan = ps.id_pelanggan
       LEFT JOIN pegawai g ON g.id_pegawai = ps.id_pegawai
       LEFT JOIN pembayaran pb ON pb.id_pesanan = ps.id_pesanan
      ORDER BY ps.tanggal_pesanan DESC`);
  ok(res, 'Data transaksi berhasil diambil', rows);
});

/* ---------- LAPORAN PENDAPATAN ----------
   GET /pemilik/laporan
   GET /pemilik/laporan?mulai=2026-01-01&akhir=2026-01-31
   Dihitung dari pembayaran berhasil (poin ini masih perlu disepakati tim). */
exports.laporan = asyncHandler(async (req, res) => {
  const { mulai, akhir } = req.query;
  if ((mulai && !TGL.test(mulai)) || (akhir && !TGL.test(akhir)))
    return fail(res, 400, 'Format tanggal harus YYYY-MM-DD');
  if (mulai && akhir && mulai > akhir)
    return fail(res, 400, 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir');

  let where = "WHERE status_pembayaran = 'BERHASIL'";
  const params = [];
  if (mulai) { where += ' AND DATE(tanggal_bayar) >= ?'; params.push(mulai); }
  if (akhir) { where += ' AND DATE(tanggal_bayar) <= ?'; params.push(akhir); }

  const [[ringkasan]] = await db.query(
    `SELECT COUNT(*) AS jumlah_transaksi, COALESCE(SUM(jumlah_bayar), 0) AS total_pendapatan
       FROM pembayaran ${where}`, params);
  const [harian] = await db.query(
    `SELECT DATE(tanggal_bayar) AS tanggal, COUNT(*) AS jumlah_transaksi,
            SUM(jumlah_bayar) AS pendapatan
       FROM pembayaran ${where}
      GROUP BY DATE(tanggal_bayar) ORDER BY tanggal`, params);

  ok(res, 'Laporan pendapatan berhasil diambil',
    { periode: { mulai: mulai || null, akhir: akhir || null }, ...ringkasan, rincian_harian: harian });
});
