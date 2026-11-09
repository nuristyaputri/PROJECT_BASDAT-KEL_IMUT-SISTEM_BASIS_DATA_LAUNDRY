const db = require("../config/database");
const { db: mockDb } = require("../config/dataStore");

const STATUS_PESANAN = [
    "MENUNGGU", "DIPROSES", "DICUCI", "DISETRIKA",
    "SIAP_DIAMBIL", "SELESAI", "DIBATALKAN"
];

// Transisi status yang diperbolehkan agar status pesanan tidak mundur/berubah sembarangan.
const TRANSISI_STATUS = {
    MENUNGGU: ["DIPROSES", "DICUCI", "DISETRIKA", "SIAP_DIAMBIL", "SELESAI", "DIBATALKAN"],
    DIPROSES: ["DICUCI", "DISETRIKA", "SIAP_DIAMBIL", "SELESAI", "DIBATALKAN"],
    DICUCI: ["DISETRIKA", "SIAP_DIAMBIL", "SELESAI", "DIBATALKAN"],
    DISETRIKA: ["SIAP_DIAMBIL", "SELESAI", "DIBATALKAN"],
    SIAP_DIAMBIL: ["SELESAI", "DIBATALKAN"],
    SELESAI: ["SIAP_DIAMBIL", "DISETRIKA", "DICUCI", "DIPROSES"],
    DIBATALKAN: ["MENUNGGU", "DIPROSES"]
};
const METODE_PEMBAYARAN = ["TUNAI", "TRANSFER", "QRIS"];

function sendError(res, status, message) {
    return res.status(status).json({ success: false, message, data: null });
}

function validId(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function getPegawaiId(executor, idUser) {
    if (idUser) {
        const [rows] = await executor.execute(
            "SELECT id_pegawai FROM pegawai WHERE id_user = ? LIMIT 1",
            [idUser]
        );
        if (rows.length > 0) return rows[0].id_pegawai;
    }
    const [all] = await executor.execute("SELECT id_pegawai FROM pegawai ORDER BY id_pegawai ASC LIMIT 1");
    if (all.length > 0) return all[0].id_pegawai;
    return 1;
}

// 1. Dashboard pegawai
exports.dashboard = async (req, res) => {
    try {
        const [[pelanggan]] = await db.query("SELECT COUNT(*) AS total FROM pelanggan");
        const [[pesanan]] = await db.query("SELECT COUNT(*) AS total FROM pesanan");
        const [[menunggu]] = await db.query("SELECT COUNT(*) AS total FROM pesanan WHERE status = 'MENUNGGU'");
        const [[selesai]] = await db.query("SELECT COUNT(*) AS total FROM pesanan WHERE status = 'SELESAI'");
        return res.json({
            success: true,
            message: "Dashboard berhasil diambil",
            data: {
                total_pelanggan: Number(pelanggan.total),
                total_pesanan: Number(pesanan.total),
                pesanan_menunggu: Number(menunggu.total),
                pesanan_selesai: Number(selesai.total)
            }
        });
    } catch (error) {
        console.error("DASHBOARD ERROR:", error);
        return sendError(res, 500, "Gagal mengambil dashboard");
    }
};

// 2. Profil pegawai
exports.profil = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT p.id_pegawai, p.kode_pegawai, p.nama, p.telepon,
                    p.alamat, p.jabatan, u.id_user, u.username, u.email
             FROM pegawai p
             INNER JOIN users u ON u.id_user = p.id_user
             WHERE p.id_user = ? LIMIT 1`,
            [req.user.id_user]
        );
        if (!rows.length) return sendError(res, 404, "Profil pegawai tidak ditemukan");
        return res.json({ success: true, message: "Profil berhasil diambil", data: rows[0] });
    } catch (error) {
        console.error("PROFIL ERROR:", error);
        return sendError(res, 500, "Gagal mengambil profil");
    }
};

// 3. Perbarui profil pegawai
exports.updateProfil = async (req, res) => {
    try {
        const { nama, telepon, alamat } = req.body || {};
        if (typeof nama !== "string" || !nama.trim()) {
            return sendError(res, 400, "Nama pegawai wajib diisi");
        }
        const [existing] = await db.execute(
            "SELECT id_pegawai FROM pegawai WHERE id_user = ? LIMIT 1", [req.user.id_user]
        );
        if (!existing.length) return sendError(res, 404, "Profil pegawai tidak ditemukan");

        await db.execute(
            "UPDATE pegawai SET nama = ?, telepon = ?, alamat = ? WHERE id_user = ?",
            [nama.trim(), telepon || null, alamat || null, req.user.id_user]
        );
        return res.json({ success: true, message: "Profil berhasil diperbarui", data: null });
    } catch (error) {
        console.error("UPDATE PROFIL ERROR:", error);
        return sendError(res, 500, "Gagal mengubah profil");
    }
};

// 4. Daftar pelanggan
exports.daftarPelanggan = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id_pelanggan, kode_pelanggan, nama, telepon, email, alamat, created_at
             FROM pelanggan ORDER BY id_pelanggan DESC`
        );
        return res.json({ success: true, message: "Data pelanggan berhasil diambil", data: rows });
    } catch (error) {
        console.error("DAFTAR PELANGGAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil data pelanggan");
    }
};

// 5. Detail pelanggan
exports.detailPelanggan = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pelanggan tidak valid");
        const [rows] = await db.execute(
            `SELECT id_pelanggan, kode_pelanggan, nama, telepon, email, alamat, created_at
             FROM pelanggan WHERE id_pelanggan = ? LIMIT 1`, [Number(req.params.id)]
        );
        if (!rows.length) return sendError(res, 404, "Pelanggan tidak ditemukan");
        return res.json({ success: true, message: "Detail pelanggan berhasil diambil", data: rows[0] });
    } catch (error) {
        console.error("DETAIL PELANGGAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil detail pelanggan");
    }
};

// 6. Tambah pelanggan (akun login pelanggan tidak dibuat otomatis)
exports.tambahPelanggan = async (req, res) => {
    try {
        const { nama, telepon, email, alamat } = req.body || {};
        if (typeof nama !== "string" || !nama.trim()) return sendError(res, 400, "Nama pelanggan wajib diisi");
        const kode = `PLG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const [result] = await db.execute(
            `INSERT INTO pelanggan (kode_pelanggan, nama, telepon, email, alamat)
             VALUES (?, ?, ?, ?, ?)`,
            [kode, nama.trim(), telepon || null, email || null, alamat || null]
        );
        return res.status(201).json({
            success: true, message: "Pelanggan berhasil ditambahkan",
            data: { id_pelanggan: result.insertId, kode_pelanggan: kode }
        });
    } catch (error) {
        console.error("TAMBAH PELANGGAN ERROR:", error);
        if (error.code === "ER_DUP_ENTRY") return sendError(res, 409, "Kode atau email pelanggan sudah digunakan");
        return sendError(res, 500, "Gagal menambahkan pelanggan");
    }
};

// 7. Edit pelanggan
exports.updatePelanggan = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pelanggan tidak valid");
        const { nama, telepon, email, alamat } = req.body || {};
        if (typeof nama !== "string" || !nama.trim()) return sendError(res, 400, "Nama pelanggan wajib diisi");
        const [existing] = await db.execute(
            "SELECT id_pelanggan FROM pelanggan WHERE id_pelanggan = ? LIMIT 1", [Number(req.params.id)]
        );
        if (!existing.length) return sendError(res, 404, "Pelanggan tidak ditemukan");
        await db.execute(
            `UPDATE pelanggan SET nama = ?, telepon = ?, email = ?, alamat = ?
             WHERE id_pelanggan = ?`,
            [nama.trim(), telepon || null, email || null, alamat || null, Number(req.params.id)]
        );
        return res.json({ success: true, message: "Data pelanggan berhasil diperbarui", data: null });
    } catch (error) {
        console.error("UPDATE PELANGGAN ERROR:", error);
        if (error.code === "ER_DUP_ENTRY") return sendError(res, 409, "Email atau kode pelanggan sudah digunakan");
        return sendError(res, 500, "Gagal memperbarui pelanggan");
    }
};

// 8. Daftar pesanan
exports.daftarPesanan = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.id_pesanan, p.kode_pesanan, p.id_pelanggan, p.id_pegawai,
                    p.tanggal_pesanan, p.tanggal_selesai, p.total_berat,
                    p.total_harga, p.status, p.catatan, pl.nama AS nama_pelanggan,
                    pl.telepon, pl.alamat,
                    COALESCE((
                        SELECT l2.nama_layanan 
                        FROM detail_pesanan dp2 
                        JOIN layanan l2 ON l2.id_layanan = dp2.id_layanan 
                        WHERE dp2.id_pesanan = p.id_pesanan 
                        LIMIT 1
                    ), 'Cuci + Setrika') AS layanan
             FROM pesanan p 
             INNER JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
             ORDER BY p.id_pesanan DESC`
        );
        return res.json({ success: true, message: "Data pesanan berhasil diambil", data: rows });
    } catch (error) {
        console.error("DAFTAR PESANAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil pesanan");
    }
};

// 9. Detail pesanan beserta detail layanan dan riwayat status
exports.detailPesanan = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pesanan tidak valid");
        const id = Number(req.params.id);
        const [pesanan] = await db.execute(
            `SELECT p.*, pl.nama AS nama_pelanggan, pl.telepon AS telepon_pelanggan
             FROM pesanan p INNER JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
             WHERE p.id_pesanan = ? LIMIT 1`, [id]
        );
        if (!pesanan.length) return sendError(res, 404, "Pesanan tidak ditemukan");
        const [detail] = await db.execute(
            `SELECT d.id_detail, d.id_layanan, l.nama_layanan, l.satuan,
                    d.jumlah, d.harga_satuan, d.subtotal
             FROM detail_pesanan d INNER JOIN layanan l ON l.id_layanan = d.id_layanan
             WHERE d.id_pesanan = ? ORDER BY d.id_detail`, [id]
        );
        const [riwayat] = await db.execute(
            `SELECT r.id_riwayat, r.status, r.catatan, r.waktu_perubahan,
                    pg.nama AS nama_pegawai
             FROM riwayat_status r LEFT JOIN pegawai pg ON pg.id_pegawai = r.id_pegawai
             WHERE r.id_pesanan = ? ORDER BY r.waktu_perubahan ASC, r.id_riwayat ASC`, [id]
        );
        return res.json({ success: true, message: "Detail pesanan berhasil diambil", data: { pesanan: pesanan[0], detail, riwayat } });
    } catch (error) {
        console.error("DETAIL PESANAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil detail pesanan");
    }
};

// 10. Buat pesanan dan rincian dalam satu transaksi database
exports.tambahPesanan = async (req, res) => {
    let connection;
    let transactionStarted = false;
    try {
        const { id_pelanggan, catatan, detail } = req.body || {};
        if (!validId(id_pelanggan) || !Array.isArray(detail) || detail.length === 0) {
            return sendError(res, 400, "ID pelanggan dan minimal satu detail layanan wajib diisi");
        }
        if (detail.length > 50) return sendError(res, 400, "Maksimal 50 detail layanan per pesanan");

        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const idPegawai = await getPegawaiId(connection, req.user.id_user);
        const [pelanggan] = await connection.execute(
            "SELECT id_pelanggan FROM pelanggan WHERE id_pelanggan = ? LIMIT 1 FOR UPDATE", [Number(id_pelanggan)]
        );
        if (!pelanggan.length) {
            await connection.rollback();
            transactionStarted = false;
            return sendError(res, 404, "Pelanggan tidak ditemukan");
        }

        let total = 0;
        let totalBeratKg = 0;
        let semuaLayananKg = true;
        const rincian = [];
        for (const item of detail) {
            if (!validId(item.id_layanan) || !Number.isFinite(Number(item.jumlah)) || Number(item.jumlah) <= 0) {
                await connection.rollback();
                transactionStarted = false;
                return sendError(res, 400, "Setiap detail harus memiliki ID layanan dan jumlah lebih dari 0");
            }
            const [layanan] = await connection.execute(
                "SELECT id_layanan, harga, status, satuan FROM layanan WHERE id_layanan = ? LIMIT 1 FOR UPDATE",
                [Number(item.id_layanan)]
            );
            if (!layanan.length || layanan[0].status !== "AKTIF") {
                await connection.rollback();
                transactionStarted = false;
                return sendError(res, 400, `Layanan ID ${item.id_layanan} tidak ditemukan atau tidak aktif`);
            }
            const jumlah = Number(item.jumlah);
            const harga = Number(layanan[0].harga);
            if (layanan[0].satuan === "kg") {
                totalBeratKg += jumlah;
            } else {
                semuaLayananKg = false;
            }
            const subtotal = Math.round((jumlah * harga + Number.EPSILON) * 100) / 100;
            total += subtotal;
            rincian.push({ id_layanan: Number(item.id_layanan), jumlah, harga, subtotal });
        }
        total = Math.round((total + Number.EPSILON) * 100) / 100;
        const kode = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const [created] = await connection.execute(
            `INSERT INTO pesanan (kode_pesanan, id_pelanggan, id_pegawai, total_berat, total_harga, status, catatan)
             VALUES (?, ?, ?, ?, ?, 'MENUNGGU', ?)`,
            [kode, Number(id_pelanggan), idPegawai, semuaLayananKg ? totalBeratKg : null, total, catatan || null]
        );
        for (const item of rincian) {
            await connection.execute(
                `INSERT INTO detail_pesanan (id_pesanan, id_layanan, jumlah, harga_satuan, subtotal)
                 VALUES (?, ?, ?, ?, ?)`,
                [created.insertId, item.id_layanan, item.jumlah, item.harga, item.subtotal]
            );
        }
        await connection.execute(
            `INSERT INTO riwayat_status (id_pesanan, id_pegawai, status, catatan)
             VALUES (?, ?, 'MENUNGGU', ?)`,
            [created.insertId, idPegawai, "Pesanan dibuat"]
        );
        await connection.commit();
        transactionStarted = false;
        return res.status(201).json({
            success: true, message: "Pesanan berhasil dibuat",
            data: { id_pesanan: created.insertId, kode_pesanan: kode, total_harga: total, status: "MENUNGGU" }
        });
    } catch (error) {
        if (connection && transactionStarted) await connection.rollback();
        console.error("TAMBAH PESANAN ERROR:", error);
        return sendError(res, error.statusCode || 500, error.statusCode ? error.message : "Gagal membuat pesanan karena terjadi kesalahan server/database");
    } finally {
        if (connection) connection.release();
    }
};

// 11. Ubah status pesanan dan catat riwayat secara atomik
exports.updateStatus = async (req, res) => {
    let connection;
    let transactionStarted = false;
    try {
        const idParam = req.params.id;
        if (!idParam) return sendError(res, 400, "ID atau kode pesanan tidak valid");

        const { status, catatan } = req.body || {};
        // Normalisasi status dari format tampilan ke format enum database
        let normalizedStatus = String(status || '').trim().toUpperCase();
        if (normalizedStatus === 'MENUNGGU KONFIRMASI' || normalizedStatus === 'MENUNGGU_KONFIRMASI') {
            normalizedStatus = 'MENUNGGU';
        }

        if (!STATUS_PESANAN.includes(normalizedStatus)) {
            return sendError(res, 400, "Status pesanan tidak valid: " + status);
        }

        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const idPegawai = await getPegawaiId(connection, req.user ? req.user.id_user : null);

        const isNum = Number.isInteger(Number(idParam)) && Number(idParam) > 0;
        const [orders] = await connection.execute(
            isNum
                ? "SELECT id_pesanan, kode_pesanan, status FROM pesanan WHERE id_pesanan = ? LIMIT 1 FOR UPDATE"
                : "SELECT id_pesanan, kode_pesanan, status FROM pesanan WHERE kode_pesanan = ? LIMIT 1 FOR UPDATE",
            [isNum ? Number(idParam) : idParam]
        );

        if (!orders.length) {
            await connection.rollback();
            transactionStarted = false;
            return sendError(res, 404, "Pesanan tidak ditemukan");
        }

        const actualOrderId = orders[0].id_pesanan;
        const actualOrderCode = orders[0].kode_pesanan;
        const statusSaatIni = orders[0].status;

        if (statusSaatIni !== normalizedStatus && !TRANSISI_STATUS[statusSaatIni]?.includes(normalizedStatus)) {
            await connection.rollback();
            transactionStarted = false;
            return sendError(res, 400, `Perubahan status dari ${statusSaatIni} ke ${normalizedStatus} tidak diperbolehkan`);
        }

        await connection.execute(
            "UPDATE pesanan SET status = ?, tanggal_selesai = CASE WHEN ? = 'SELESAI' THEN CURRENT_TIMESTAMP ELSE tanggal_selesai END WHERE id_pesanan = ?",
            [normalizedStatus, normalizedStatus, actualOrderId]
        );

        const catatanRiwayat = catatan || (normalizedStatus === 'DIPROSES' ? 'Pesanan dikonfirmasi oleh pegawai outlet' : `Status pesanan diubah ke ${normalizedStatus}`);
        await connection.execute(
            `INSERT INTO riwayat_status (id_pesanan, id_pegawai, status, catatan)
             VALUES (?, ?, ?, ?)`,
            [actualOrderId, idPegawai, normalizedStatus, catatanRiwayat]
        );

        await connection.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            message: "Status pesanan berhasil diubah menjadi " + normalizedStatus,
            data: { id_pesanan: actualOrderId, kode_pesanan: actualOrderCode, status: normalizedStatus }
        });
    } catch (error) {
        if (connection && transactionStarted) await connection.rollback();
        console.warn("Peringatan: Gagal update status di MySQL, mencoba sinkron dataStore:", error.message);

        // Fallback update di mockDb
        const idParam = req.params.id;
        const normalizedStatus = String(req.body ? req.body.status : '').trim().toUpperCase();
        if (mockDb && mockDb.pesanan) {
            const foundOrder = mockDb.pesanan.find(p => p.id_pesanan === Number(idParam) || p.kode_pesanan === idParam || p.nomor_pesanan === idParam);
            if (foundOrder) {
                foundOrder.status = normalizedStatus;
                return res.json({
                    success: true,
                    message: "Status pesanan berhasil diubah menjadi " + normalizedStatus + " (dataStore)",
                    data: { id_pesanan: foundOrder.id_pesanan, kode_pesanan: foundOrder.kode_pesanan || idParam, status: normalizedStatus }
                });
            }
        }

        return sendError(res, error.statusCode || 500, error.statusCode ? error.message : "Gagal mengubah status pesanan");
    } finally {
        if (connection) connection.release();
    }
};

// 12. Daftar transaksi/pembayaran
exports.daftarTransaksi = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.id_pesanan, p.kode_pesanan, pl.nama AS nama_pelanggan,
                    p.total_harga, p.status AS status_pesanan,
                    pb.id_pembayaran, pb.jumlah_bayar, pb.metode,
                    pb.tanggal_bayar, pb.status AS status_pembayaran
             FROM pesanan p INNER JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
             LEFT JOIN pembayaran pb ON pb.id_pesanan = p.id_pesanan
             ORDER BY p.id_pesanan DESC, pb.id_pembayaran DESC`
        );
        return res.json({ success: true, message: "Data transaksi berhasil diambil", data: rows });
    } catch (error) {
        console.error("DAFTAR TRANSAKSI ERROR:", error);
        return sendError(res, 500, "Gagal mengambil transaksi");
    }
};

// 13. Detail transaksi
exports.detailTransaksi = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pesanan tidak valid");
        const [orders] = await db.execute(
            `SELECT p.id_pesanan, p.kode_pesanan, p.total_harga, p.status AS status_pesanan,
                    pl.nama AS nama_pelanggan
             FROM pesanan p INNER JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
             WHERE p.id_pesanan = ? LIMIT 1`, [Number(req.params.id)]
        );
        if (!orders.length) return sendError(res, 404, "Pesanan tidak ditemukan");
        const [payments] = await db.execute(
            `SELECT id_pembayaran, jumlah_bayar, metode, tanggal_bayar, status
             FROM pembayaran WHERE id_pesanan = ? ORDER BY id_pembayaran DESC`, [Number(req.params.id)]
        );
        return res.json({ success: true, message: "Detail transaksi berhasil diambil", data: { pesanan: orders[0], pembayaran: payments } });
    } catch (error) {
        console.error("DETAIL TRANSAKSI ERROR:", error);
        return sendError(res, 500, "Gagal mengambil detail transaksi");
    }
};

// 14. Catat pembayaran. Status awal MENUNGGU karena aplikasi tidak terhubung ke payment gateway.
exports.tambahPembayaran = async (req, res) => {
    let connection;
    let transactionStarted = false;
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pesanan tidak valid");
        const { jumlah_bayar, metode } = req.body || {};
        const jumlah = Number(jumlah_bayar);
        if (!Number.isFinite(jumlah) || jumlah <= 0 || !METODE_PEMBAYARAN.includes(metode)) {
            return sendError(res, 400, "Jumlah bayar harus lebih dari 0 dan metode harus TUNAI, TRANSFER, atau QRIS");
        }
        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;
        const [orders] = await connection.execute(
            "SELECT id_pesanan FROM pesanan WHERE id_pesanan = ? LIMIT 1 FOR UPDATE", [Number(req.params.id)]
        );
        if (!orders.length) {
            await connection.rollback();
            transactionStarted = false;
            return sendError(res, 404, "Pesanan tidak ditemukan");
        }
        const [result] = await connection.execute(
            `INSERT INTO pembayaran (id_pesanan, jumlah_bayar, metode, status)
             VALUES (?, ?, ?, 'MENUNGGU')`,
            [Number(req.params.id), jumlah, metode]
        );
        await connection.commit();
        transactionStarted = false;
        return res.status(201).json({
            success: true,
            message: "Pembayaran berhasil dicatat dan menunggu konfirmasi",
            data: { id_pembayaran: result.insertId, id_pesanan: Number(req.params.id), jumlah_bayar: jumlah, metode, status: "MENUNGGU" }
        });
    } catch (error) {
        if (connection && transactionStarted) await connection.rollback();
        console.error("TAMBAH PEMBAYARAN ERROR:", error);
        return sendError(res, 500, "Gagal mencatat pembayaran");
    } finally {
        if (connection) connection.release();
    }
};


// 15. Konfirmasi status pembayaran (sesuai enum pada tabel pembayaran)
exports.updateStatusPembayaran = async (req, res) => {
    const statusValid = ["MENUNGGU", "BERHASIL", "GAGAL"];
    let connection;
    let transactionStarted = false;
    try {
        if (!validId(req.params.id) || !validId(req.params.id_pembayaran)) {
            return sendError(res, 400, "ID pesanan atau ID pembayaran tidak valid");
        }
        const { status } = req.body || {};
        if (!statusValid.includes(status)) return sendError(res, 400, "Status pembayaran harus MENUNGGU, BERHASIL, atau GAGAL");

        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;
        const [payments] = await connection.execute(
            `SELECT pb.id_pembayaran FROM pembayaran pb
             WHERE pb.id_pembayaran = ? AND pb.id_pesanan = ? LIMIT 1 FOR UPDATE`,
            [Number(req.params.id_pembayaran), Number(req.params.id)]
        );
        if (!payments.length) {
            await connection.rollback();
            transactionStarted = false;
            return sendError(res, 404, "Pembayaran tidak ditemukan pada pesanan tersebut");
        }
        await connection.execute(
            "UPDATE pembayaran SET status = ? WHERE id_pembayaran = ? AND id_pesanan = ?",
            [status, Number(req.params.id_pembayaran), Number(req.params.id)]
        );
        await connection.commit();
        transactionStarted = false;
        return res.json({
            success: true,
            message: "Status pembayaran berhasil diperbarui",
            data: { id_pembayaran: Number(req.params.id_pembayaran), status }
        });
    } catch (error) {
        if (connection && transactionStarted) await connection.rollback();
        console.error("UPDATE STATUS PEMBAYARAN ERROR:", error);
        return sendError(res, 500, "Gagal memperbarui status pembayaran");
    } finally {
        if (connection) connection.release();
    }
};

// 16. Konfirmasi pembayaran dan pesanan sekaligus (verifikasi invoice oleh pegawai)
exports.konfirmasiPembayaran = async (req, res) => {
    let connection;
    let transactionStarted = false;
    try {
        const idParam = req.params.id;
        if (!idParam) return sendError(res, 400, "ID atau kode pesanan tidak valid");

        const { statusPesanan = 'DIPROSES', metode = 'QRIS', catatan = 'Pembayaran diverifikasi dan pesanan dikonfirmasi oleh pegawai' } = req.body || {};

        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const idPegawai = await getPegawaiId(connection, req.user ? req.user.id_user : null);

        const isNum = Number.isInteger(Number(idParam)) && Number(idParam) > 0;
        const [orders] = await connection.execute(
            isNum
                ? "SELECT id_pesanan, kode_pesanan, total_harga, status FROM pesanan WHERE id_pesanan = ? LIMIT 1 FOR UPDATE"
                : "SELECT id_pesanan, kode_pesanan, total_harga, status FROM pesanan WHERE kode_pesanan = ? LIMIT 1 FOR UPDATE",
            [isNum ? Number(idParam) : idParam]
        );

        if (!orders.length) {
            await connection.rollback();
            transactionStarted = false;
            return sendError(res, 404, "Pesanan tidak ditemukan");
        }

        const actualOrderId = orders[0].id_pesanan;
        const actualOrderCode = orders[0].kode_pesanan;
        const totalHarga = orders[0].total_harga;

        // 1. Update status pesanan ke DIPROSES
        await connection.execute(
            "UPDATE pesanan SET status = ? WHERE id_pesanan = ?",
            [statusPesanan, actualOrderId]
        );

        // 2. Tambah catatan ke riwayat_status
        await connection.execute(
            `INSERT INTO riwayat_status (id_pesanan, id_pegawai, status, catatan)
             VALUES (?, ?, ?, ?)`,
            [actualOrderId, idPegawai, statusPesanan, catatan]
        );

        // 3. Update atau buat record pembayaran BERHASIL
        const [existingPayments] = await connection.execute(
            "SELECT id_pembayaran FROM pembayaran WHERE id_pesanan = ? ORDER BY id_pembayaran DESC LIMIT 1 FOR UPDATE",
            [actualOrderId]
        );

        let idPembayaran;
        if (existingPayments.length > 0) {
            idPembayaran = existingPayments[0].id_pembayaran;
            await connection.execute(
                "UPDATE pembayaran SET status = 'BERHASIL', tanggal_bayar = CURRENT_TIMESTAMP WHERE id_pembayaran = ?",
                [idPembayaran]
            );
        } else {
            const normalizedMetode = ['TUNAI', 'TRANSFER', 'QRIS'].includes(String(metode).toUpperCase())
                ? String(metode).toUpperCase()
                : 'QRIS';
            const [newPayment] = await connection.execute(
                `INSERT INTO pembayaran (id_pesanan, jumlah_bayar, metode, status, tanggal_bayar)
                 VALUES (?, ?, ?, 'BERHASIL', CURRENT_TIMESTAMP)`,
                [actualOrderId, totalHarga, normalizedMetode]
            );
            idPembayaran = newPayment.insertId;
        }

        await connection.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            message: "Pembayaran terverifikasi dan pesanan berhasil dikonfirmasi",
            data: {
                id_pesanan: actualOrderId,
                kode_pesanan: actualOrderCode,
                status_pesanan: statusPesanan,
                id_pembayaran: idPembayaran,
                status_pembayaran: "BERHASIL"
            }
        });
    } catch (error) {
        if (connection && transactionStarted) await connection.rollback();
        console.error("KONFIRMASI PEMBAYARAN ERROR:", error);
        return sendError(res, 500, "Gagal mengonfirmasi pembayaran pesanan");
    } finally {
        if (connection) connection.release();
    }
};

// 17. Tolak / batalkan pesanan oleh pegawai
exports.tolakPesanan = async (req, res) => {
    let connection;
    let transactionStarted = false;
    try {
        const idParam = req.params.id;
        if (!idParam) return sendError(res, 400, "ID atau kode pesanan tidak valid");

        const { alasan = "Pesanan ditolak/dibatalkan oleh pegawai outlet" } = req.body || {};

        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const idPegawai = await getPegawaiId(connection, req.user ? req.user.id_user : null);

        const isNum = Number.isInteger(Number(idParam)) && Number(idParam) > 0;
        const [orders] = await connection.execute(
            isNum
                ? "SELECT id_pesanan, kode_pesanan FROM pesanan WHERE id_pesanan = ? LIMIT 1 FOR UPDATE"
                : "SELECT id_pesanan, kode_pesanan FROM pesanan WHERE kode_pesanan = ? LIMIT 1 FOR UPDATE",
            [isNum ? Number(idParam) : idParam]
        );

        if (!orders.length) {
            await connection.rollback();
            transactionStarted = false;
            return sendError(res, 404, "Pesanan tidak ditemukan");
        }

        const actualOrderId = orders[0].id_pesanan;
        const actualOrderCode = orders[0].kode_pesanan;

        await connection.execute(
            "UPDATE pesanan SET status = 'DIBATALKAN' WHERE id_pesanan = ?",
            [actualOrderId]
        );

        await connection.execute(
            `INSERT INTO riwayat_status (id_pesanan, id_pegawai, status, catatan)
             VALUES (?, ?, 'DIBATALKAN', ?)`,
            [actualOrderId, idPegawai, alasan]
        );

        // Update status pembayaran jika ada
        await connection.execute(
            "UPDATE pembayaran SET status = 'GAGAL' WHERE id_pesanan = ? AND status = 'MENUNGGU'",
            [actualOrderId]
        );

        await connection.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            message: "Pesanan berhasil dibatalkan / ditolak",
            data: { id_pesanan: actualOrderId, kode_pesanan: actualOrderCode, status: "DIBATALKAN" }
        });
    } catch (error) {
        if (connection && transactionStarted) await connection.rollback();
        console.error("TOLAK PESANAN ERROR:", error);
        return sendError(res, 500, "Gagal membatalkan pesanan");
    } finally {
        if (connection) connection.release();
    }
};
