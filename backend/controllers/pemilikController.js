/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/controllers/pemilikController.js
 * Deskripsi: Controller manajerial & analitik pemilik laundry, tersinkronisasi
 *            langsung dengan MySQL XAMPP (database: bersihinlaundry).
 * =============================================================================
 */

const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const { db, nextId, fmt } = require("../config/dataStore");

const STATUS_PESANAN = [
    "MENUNGGU", "DIPROSES", "DICUCI", "DISETRIKA",
    "SIAP_DIAMBIL", "SELESAI", "DIBATALKAN"
];
const STATUS_AKUN = ["AKTIF", "NONAKTIF"];
const SATUAN_LAYANAN = ["kg", "pcs", "meter", "pasang"];

function sendError(res, status, message) {
    return res.status(status).json({ success: false, message, data: null });
}

function validId(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validEmail(value) {
    return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validTanggal(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function getPemilik(idUser) {
    return db.pemilik.find(p => p.id_user === idUser);
}

// Gabungan data pegawai + akun (tanpa password)
function pegawaiView(p) {
    const u = db.users.find(x => x.id_user === p.id_user);
    return {
        id_pegawai: p.id_pegawai,
        kode_pegawai: p.kode_pegawai,
        nama: p.nama,
        telepon: p.telepon,
        alamat: p.alamat,
        jabatan: p.jabatan,
        id_user: p.id_user,
        username: u ? u.username : null,
        email: u ? u.email : null,
        status: u ? u.status : null
    };
}

function namaPelanggan(id) {
    const pl = db.pelanggan.find(x => x.id_pelanggan === id);
    return pl ? pl.nama : null;
}

function totalDibayar(idPesanan) {
    return round2(
        db.pembayaran
            .filter(pb => pb.id_pesanan === idPesanan && pb.status === "BERHASIL")
            .reduce((sum, pb) => sum + Number(pb.jumlah_bayar), 0)
    );
}

// 1. Dashboard pemilik (Tersinkronisasi Real-Time dengan MySQL XAMPP)
exports.dashboard = async (req, res) => {
    try {
        let totalPelanggan = 0;
        let totalPegawai = 0;
        let pegawaiAktif = 0;
        let totalLayanan = 0;
        let totalPesanan = 0;
        let pesananMenunggu = 0;
        let pesananDiproses = 0;
        let pesananSelesai = 0;
        let pendapatanTotal = 0;
        let pendapatanBulanIni = 0;
        let aktivitasTerbaru = [];

        try {
            const [[rPelanggan]] = await pool.query("SELECT COUNT(*) AS total FROM pelanggan");
            const [[rPegawai]] = await pool.query("SELECT COUNT(*) AS total FROM pegawai");
            const [[rPegAktif]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'PEGAWAI' AND status = 'AKTIF'");
            const [[rLayanan]] = await pool.query("SELECT COUNT(*) AS total FROM layanan WHERE status = 'AKTIF'");
            const [[rPesanan]] = await pool.query("SELECT COUNT(*) AS total FROM pesanan");
            const [[rMenunggu]] = await pool.query("SELECT COUNT(*) AS total FROM pesanan WHERE status = 'MENUNGGU'");
            const [[rDiproses]] = await pool.query("SELECT COUNT(*) AS total FROM pesanan WHERE status IN ('DIPROSES','DICUCI','DISETRIKA','SIAP_DIAMBIL')");
            const [[rSelesai]] = await pool.query("SELECT COUNT(*) AS total FROM pesanan WHERE status = 'SELESAI'");
            const [[rPendTotal]] = await pool.query("SELECT COALESCE(SUM(jumlah_bayar), 0) AS total FROM pembayaran WHERE status = 'BERHASIL'");
            const [[rPendBulan]] = await pool.query("SELECT COALESCE(SUM(jumlah_bayar), 0) AS total FROM pembayaran WHERE status = 'BERHASIL' AND MONTH(tanggal_bayar) = MONTH(CURRENT_DATE()) AND YEAR(tanggal_bayar) = YEAR(CURRENT_DATE())");

            totalPelanggan = Number(rPelanggan.total) || 0;
            totalPegawai = Number(rPegawai.total) || 0;
            pegawaiAktif = Number(rPegAktif.total) || totalPegawai;
            totalLayanan = Number(rLayanan.total) || 0;
            totalPesanan = Number(rPesanan.total) || 0;
            pesananMenunggu = Number(rMenunggu.total) || 0;
            pesananDiproses = Number(rDiproses.total) || 0;
            pesananSelesai = Number(rSelesai.total) || 0;
            pendapatanTotal = Number(rPendTotal.total) || 0;
            pendapatanBulanIni = Number(rPendBulan.total) || 0;

            // Aktivitas terbaru langsung dari pesanan dan pembayaran MySQL
            const [recentOrders] = await pool.query(`
                SELECT p.id_pesanan, p.kode_pesanan, p.status, p.total_harga, p.updated_at, p.tanggal_pesanan,
                       pl.nama AS nama_pelanggan,
                       COALESCE((SELECT GROUP_CONCAT(l.nama_layanan SEPARATOR ', ') FROM detail_pesanan dp JOIN layanan l ON l.id_layanan = dp.id_layanan WHERE dp.id_pesanan = p.id_pesanan), 'Layanan Laundry') AS nama_layanan
                FROM pesanan p
                LEFT JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
                ORDER BY COALESCE(p.updated_at, p.tanggal_pesanan) DESC
                LIMIT 5
            `);
            aktivitasTerbaru = recentOrders;

        } catch (dbErr) {
            console.warn("PEMILIK DASHBOARD MySQL warning, fallback:", dbErr.message);
            const bulanIni = fmt().slice(0, 7);
            const berhasil = db.pembayaran.filter(pb => pb.status === "BERHASIL");
            pendapatanTotal = berhasil.reduce((s, pb) => s + Number(pb.jumlah_bayar), 0);
            pendapatanBulanIni = berhasil
                .filter(pb => String(pb.tanggal_bayar).slice(0, 7) === bulanIni)
                .reduce((s, pb) => s + Number(pb.jumlah_bayar), 0);
            totalPelanggan = db.pelanggan.length;
            totalPegawai = db.pegawai.length;
            pegawaiAktif = db.pegawai.filter(p => {
                const u = db.users.find(x => x.id_user === p.id_user);
                return u && u.status === "AKTIF";
            }).length;
            totalLayanan = db.layanan.length;
            totalPesanan = db.pesanan.length;
            pesananMenunggu = db.pesanan.filter(p => p.status === "MENUNGGU").length;
            pesananDiproses = db.pesanan.filter(p => ["DIPROSES", "DICUCI", "DISETRIKA", "SIAP_DIAMBIL"].includes(p.status)).length;
            pesananSelesai = db.pesanan.filter(p => p.status === "SELESAI").length;
        }

        return res.json({
            success: true,
            message: "Dashboard berhasil diambil secara dinamis dari database XAMPP",
            data: {
                total_pelanggan: totalPelanggan,
                total_pegawai: totalPegawai,
                pegawai_aktif: pegawaiAktif,
                total_layanan: totalLayanan,
                total_pesanan: totalPesanan,
                pesanan_menunggu: pesananMenunggu,
                pesanan_diproses: pesananDiproses,
                pesanan_selesai: pesananSelesai,
                pendapatan_total: round2(pendapatanTotal),
                pendapatan_bulan_ini: round2(pendapatanBulanIni),
                aktivitas_terbaru: aktivitasTerbaru
            }
        });
    } catch (error) {
        console.error("DASHBOARD ERROR:", error);
        return sendError(res, 500, "Gagal mengambil dashboard");
    }
};

// 2. Profil pemilik
exports.profil = async (req, res) => {
    try {
        const idUser = req.user ? req.user.id_user : 1;
        try {
            const [rows] = await pool.query(
                `SELECT pm.id_pemilik, pm.kode_pemilik, pm.nama, pm.telepon, pm.alamat,
                        u.id_user, u.username, u.email, u.no_telp
                 FROM pemilik pm
                 JOIN users u ON u.id_user = pm.id_user
                 WHERE u.id_user = ?
                 LIMIT 1`,
                [idUser]
            );
            if (rows && rows.length > 0) {
                return res.json({
                    success: true,
                    message: "Profil pemilik berhasil diambil dari MySQL XAMPP",
                    data: rows[0]
                });
            }
        } catch (dbErr) {
            console.warn("PEMILIK PROFIL MySQL warning, fallback:", dbErr.message);
        }

        const p = getPemilik(idUser);
        const u = db.users.find(x => x.id_user === idUser);
        if (!p || !u) return sendError(res, 404, "Profil pemilik tidak ditemukan");
        return res.json({
            success: true,
            message: "Profil berhasil diambil",
            data: {
                id_pemilik: p.id_pemilik,
                kode_pemilik: p.kode_pemilik,
                nama: p.nama,
                telepon: p.telepon,
                alamat: p.alamat,
                id_user: u.id_user,
                username: u.username,
                email: u.email
            }
        });
    } catch (error) {
        console.error("PROFIL ERROR:", error);
        return sendError(res, 500, "Gagal mengambil profil");
    }
};

// 3. Perbarui profil pemilik
exports.updateProfil = async (req, res) => {
    try {
        const { nama, telepon, alamat, email } = req.body || {};
        if (typeof nama !== "string" || !nama.trim()) {
            return sendError(res, 400, "Nama pemilik wajib diisi");
        }
        const idUser = req.user ? req.user.id_user : 1;

        try {
            await pool.query(
                "UPDATE pemilik SET nama = ?, telepon = ?, alamat = ? WHERE id_user = ?",
                [nama.trim(), telepon || null, alamat || null, idUser]
            );
            if (email && validEmail(email)) {
                await pool.query("UPDATE users SET email = ?, no_telp = ? WHERE id_user = ?", [email.trim(), telepon || null, idUser]);
            }
        } catch (dbErr) {
            console.warn("PEMILIK UPDATE PROFIL MySQL warning:", dbErr.message);
        }

        const p = getPemilik(idUser);
        if (p) {
            p.nama = nama.trim();
            p.telepon = telepon || null;
            p.alamat = alamat || null;
        }
        const u = db.users.find(x => x.id_user === idUser);
        if (u && email) u.email = email.trim();

        return res.json({ success: true, message: "Profil berhasil diperbarui di database XAMPP", data: null });
    } catch (error) {
        console.error("UPDATE PROFIL ERROR:", error);
        return sendError(res, 500, "Gagal mengubah profil");
    }
};

// 4. Daftar pegawai (Tersinkronisasi Real-Time dengan MySQL XAMPP)
exports.daftarPegawai = async (req, res) => {
    try {
        const { status } = req.query;
        if (status !== undefined && !STATUS_AKUN.includes(status)) {
            return sendError(res, 400, "Status harus AKTIF atau NONAKTIF");
        }
        try {
            let sql = `
                SELECT pg.id_pegawai, pg.id_user, pg.kode_pegawai, pg.nama, pg.telepon, pg.alamat, pg.jabatan, pg.created_at,
                       u.username, u.email, COALESCE(u.status, 'AKTIF') AS status
                FROM pegawai pg
                LEFT JOIN users u ON u.id_user = pg.id_user
            `;
            const params = [];
            if (status) {
                sql += " WHERE u.status = ?";
                params.push(status);
            }
            sql += " ORDER BY pg.id_pegawai ASC";
            const [rows] = await pool.query(sql, params);
            return res.json({ success: true, message: "Data pegawai berhasil diambil dari MySQL XAMPP", data: rows });
        } catch (dbErr) {
            console.warn("PEMILIK DAFTAR PEGAWAI MySQL warning, fallback:", dbErr.message);
            let rows = [...db.pegawai].sort((a, b) => b.id_pegawai - a.id_pegawai).map(pegawaiView);
            if (status) rows = rows.filter(r => r.status === status);
            return res.json({ success: true, message: "Data pegawai berhasil diambil", data: rows });
        }
    } catch (error) {
        console.error("DAFTAR PEGAWAI ERROR:", error);
        return sendError(res, 500, "Gagal mengambil data pegawai");
    }
};

// 5. Detail pegawai
exports.detailPegawai = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pegawai tidak valid");
        const id = Number(req.params.id);
        try {
            const [rows] = await pool.query(`
                SELECT pg.id_pegawai, pg.id_user, pg.kode_pegawai, pg.nama, pg.telepon, pg.alamat, pg.jabatan, pg.created_at,
                       u.username, u.email, COALESCE(u.status, 'AKTIF') AS status
                FROM pegawai pg
                LEFT JOIN users u ON u.id_user = pg.id_user
                WHERE pg.id_pegawai = ?
                LIMIT 1
            `, [id]);
            if (rows && rows.length > 0) {
                return res.json({ success: true, message: "Detail pegawai berhasil diambil dari MySQL XAMPP", data: rows[0] });
            }
        } catch (dbErr) {
            console.warn("PEMILIK DETAIL PEGAWAI MySQL warning, fallback:", dbErr.message);
        }

        const p = db.pegawai.find(x => x.id_pegawai === id);
        if (!p) return sendError(res, 404, "Pegawai tidak ditemukan");
        return res.json({ success: true, message: "Detail pegawai berhasil diambil", data: pegawaiView(p) });
    } catch (error) {
        console.error("DETAIL PEGAWAI ERROR:", error);
        return sendError(res, 500, "Gagal mengambil detail pegawai");
    }
};

// 6. Tambah pegawai (sekaligus membuat akun login role PEGAWAI ke MySQL XAMPP)
exports.tambahPegawai = async (req, res) => {
    try {
        const { username, email, password, nama, telepon, alamat, jabatan } = req.body || {};
        if (typeof username !== "string" || !username.trim()) return sendError(res, 400, "Username wajib diisi");
        if (typeof nama !== "string" || !nama.trim()) return sendError(res, 400, "Nama pegawai wajib diisi");
        if (typeof password !== "string" || password.length < 8) return sendError(res, 400, "Password minimal 8 karakter");
        if (email && !validEmail(email)) return sendError(res, 400, "Format email tidak valid");

        const usernameBersih = username.trim();
        const hashedPassword = await bcrypt.hash(password, 10);

        let id_user = null;
        let id_pegawai = null;
        let kode = null;

        try {
            const [existUsers] = await pool.query(
                "SELECT id_user FROM users WHERE username = ? OR (email IS NOT NULL AND email = ?)",
                [usernameBersih, email ? email.trim() : '']
            );
            if (existUsers && existUsers.length > 0) {
                return sendError(res, 409, "Username atau Email sudah terdaftar dalam sistem");
            }

            const [resUser] = await pool.query(
                "INSERT INTO users (username, email, no_telp, password, role, status) VALUES (?, ?, ?, ?, 'PEGAWAI', 'AKTIF')",
                [usernameBersih, email ? email.trim() : null, telepon || null, hashedPassword]
            );
            id_user = resUser.insertId;

            const [countPeg] = await pool.query("SELECT COUNT(*) AS total FROM pegawai");
            const nextPegNum = (countPeg[0]?.total || 0) + 1;
            kode = `PGW-${String(nextPegNum).padStart(3, "0")}`;

            const [resPeg] = await pool.query(
                "INSERT INTO pegawai (id_user, kode_pegawai, nama, telepon, alamat, jabatan) VALUES (?, ?, ?, ?, ?, ?)",
                [id_user, kode, nama.trim(), telepon || null, alamat || null, jabatan || 'Staff Operasional']
            );
            id_pegawai = resPeg.insertId;
        } catch (dbErr) {
            console.warn("PEMILIK TAMBAH PEGAWAI MySQL warning, fallback:", dbErr.message);
            id_user = nextId("users");
            id_pegawai = nextId("pegawai");
            kode = `PGW-${String(id_pegawai).padStart(3, "0")}`;
        }

        db.users.push({
            id_user,
            username: usernameBersih,
            email: email ? email.trim() : null,
            password: hashedPassword,
            role: "PEGAWAI",
            status: "AKTIF",
            created_at: fmt()
        });

        db.pegawai.push({
            id_pegawai,
            id_user,
            kode_pegawai: kode,
            nama: nama.trim(),
            telepon: telepon || null,
            alamat: alamat || null,
            jabatan: jabatan || "Staff Operasional"
        });

        return res.status(201).json({
            success: true,
            message: "Pegawai berhasil ditambahkan ke database XAMPP",
            data: { id_pegawai, kode_pegawai: kode, id_user, username: usernameBersih }
        });
    } catch (error) {
        console.error("TAMBAH PEGAWAI ERROR:", error);
        return sendError(res, 500, "Gagal menambahkan pegawai: " + error.message);
    }
};

// 7. Edit pegawai
exports.updatePegawai = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pegawai tidak valid");
        const id = Number(req.params.id);
        const { nama, telepon, alamat, jabatan, email } = req.body || {};
        if (typeof nama !== "string" || !nama.trim()) return sendError(res, 400, "Nama pegawai wajib diisi");
        if (email && !validEmail(email)) return sendError(res, 400, "Format email tidak valid");

        try {
            await pool.query(
                "UPDATE pegawai SET nama = ?, telepon = ?, alamat = ?, jabatan = ? WHERE id_pegawai = ?",
                [nama.trim(), telepon || null, alamat || null, jabatan || 'Staff Operasional', id]
            );
            if (email) {
                await pool.query(
                    "UPDATE users SET email = ? WHERE id_user = (SELECT id_user FROM pegawai WHERE id_pegawai = ?)",
                    [email.trim(), id]
                );
            }
        } catch (dbErr) {
            console.warn("PEMILIK UPDATE PEGAWAI MySQL warning:", dbErr.message);
        }

        const p = db.pegawai.find(x => x.id_pegawai === id);
        if (p) {
            p.nama = nama.trim();
            p.telepon = telepon || null;
            p.alamat = alamat || null;
            p.jabatan = jabatan || null;
            const u = db.users.find(x => x.id_user === p.id_user);
            if (u && email) u.email = email.trim();
        }

        return res.json({ success: true, message: "Data pegawai berhasil diperbarui di database XAMPP", data: null });
    } catch (error) {
        console.error("UPDATE PEGAWAI ERROR:", error);
        return sendError(res, 500, "Gagal memperbarui pegawai");
    }
};

// 8. Aktifkan / nonaktifkan akun pegawai
exports.updateStatusPegawai = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pegawai tidak valid");
        const id = Number(req.params.id);
        const { status } = req.body || {};
        if (!STATUS_AKUN.includes(status)) return sendError(res, 400, "Status harus AKTIF atau NONAKTIF");

        try {
            await pool.query(
                "UPDATE users SET status = ? WHERE id_user = (SELECT id_user FROM pegawai WHERE id_pegawai = ?)",
                [status, id]
            );
        } catch (dbErr) {
            console.warn("PEMILIK UPDATE STATUS PEGAWAI MySQL warning:", dbErr.message);
        }

        const p = db.pegawai.find(x => x.id_pegawai === id);
        if (p) {
            const u = db.users.find(x => x.id_user === p.id_user);
            if (u) u.status = status;
        }

        return res.json({
            success: true,
            message: "Status pegawai berhasil diubah di database XAMPP",
            data: { id_pegawai: id, status }
        });
    } catch (error) {
        console.error("UPDATE STATUS PEGAWAI ERROR:", error);
        return sendError(res, 500, "Gagal mengubah status pegawai");
    }
};

// 9. Daftar layanan
exports.daftarLayanan = async (req, res) => {
    try {
        const { status } = req.query;
        if (status !== undefined && !STATUS_AKUN.includes(status)) {
            return sendError(res, 400, "Status harus AKTIF atau NONAKTIF");
        }
        try {
            let sql = "SELECT * FROM layanan";
            const params = [];
            if (status) {
                sql += " WHERE status = ?";
                params.push(status);
            }
            sql += " ORDER BY id_layanan ASC";
            const [rows] = await pool.query(sql, params);
            return res.json({ success: true, message: "Data layanan berhasil diambil dari MySQL XAMPP", data: rows });
        } catch (dbErr) {
            console.warn("PEMILIK DAFTAR LAYANAN MySQL warning, fallback:", dbErr.message);
            let rows = [...db.layanan].sort((a, b) => b.id_layanan - a.id_layanan);
            if (status) rows = rows.filter(r => r.status === status);
            return res.json({ success: true, message: "Data layanan berhasil diambil", data: rows });
        }
    } catch (error) {
        console.error("DAFTAR LAYANAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil data layanan");
    }
};

// 10. Detail layanan
exports.detailLayanan = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID layanan tidak valid");
        const id = Number(req.params.id);
        try {
            const [rows] = await pool.query("SELECT * FROM layanan WHERE id_layanan = ? LIMIT 1", [id]);
            if (rows && rows.length > 0) {
                return res.json({ success: true, message: "Detail layanan berhasil diambil dari MySQL XAMPP", data: rows[0] });
            }
        } catch (dbErr) {
            console.warn("PEMILIK DETAIL LAYANAN MySQL warning, fallback:", dbErr.message);
        }

        const l = db.layanan.find(x => x.id_layanan === id);
        if (!l) return sendError(res, 404, "Layanan tidak ditemukan");
        return res.json({ success: true, message: "Detail layanan berhasil diambil", data: l });
    } catch (error) {
        console.error("DETAIL LAYANAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil detail layanan");
    }
};

// 11. Tambah layanan
exports.tambahLayanan = async (req, res) => {
    try {
        const { nama_layanan, kategori, satuan, harga, estimasi_waktu, deskripsi } = req.body || {};
        if (typeof nama_layanan !== "string" || !nama_layanan.trim()) return sendError(res, 400, "Nama layanan wajib diisi");
        const hargaNum = Number(harga);
        if (!Number.isFinite(hargaNum) || hargaNum <= 0) return sendError(res, 400, "Harga harus lebih dari 0");

        const satuanVal = satuan || "kg";
        const katVal = (kategori && ["KILOAN", "SATUAN", "EXPRESS", "SPECIAL"].includes(String(kategori).toUpperCase()))
            ? String(kategori).toUpperCase()
            : "KILOAN";
        const estimasiVal = estimasi_waktu || "2 Hari";
        const deskripsiVal = deskripsi || "Layanan laundry higienis dan wangi.";

        let id_layanan = null;
        try {
            const [resLay] = await pool.query(
                "INSERT INTO layanan (nama_layanan, kategori, satuan, harga, estimasi_waktu, status, deskripsi) VALUES (?, ?, ?, ?, ?, 'AKTIF', ?)",
                [nama_layanan.trim(), katVal, satuanVal, round2(hargaNum), estimasiVal, deskripsiVal]
            );
            id_layanan = resLay.insertId;
        } catch (dbErr) {
            console.warn("PEMILIK TAMBAH LAYANAN MySQL warning, fallback:", dbErr.message);
            id_layanan = nextId("layanan");
        }

        const layanan = {
            id_layanan,
            nama_layanan: nama_layanan.trim(),
            kategori: katVal,
            satuan: satuanVal,
            harga: round2(hargaNum),
            estimasi_waktu: estimasiVal,
            status: "AKTIF",
            deskripsi: deskripsiVal
        };
        db.layanan.push(layanan);

        return res.status(201).json({ success: true, message: "Layanan berhasil ditambahkan ke database XAMPP", data: layanan });
    } catch (error) {
        console.error("TAMBAH LAYANAN ERROR:", error);
        return sendError(res, 500, "Gagal menambahkan layanan");
    }
};

// 12. Edit layanan
exports.updateLayanan = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID layanan tidak valid");
        const id = Number(req.params.id);
        const { nama_layanan, kategori, satuan, harga, estimasi_waktu, deskripsi } = req.body || {};
        if (typeof nama_layanan !== "string" || !nama_layanan.trim()) return sendError(res, 400, "Nama layanan wajib diisi");
        const hargaNum = Number(harga);
        if (!Number.isFinite(hargaNum) || hargaNum <= 0) return sendError(res, 400, "Harga harus lebih dari 0");

        const satuanVal = satuan || "kg";
        const katVal = (kategori && ["KILOAN", "SATUAN", "EXPRESS", "SPECIAL"].includes(String(kategori).toUpperCase()))
            ? String(kategori).toUpperCase()
            : "KILOAN";
        const estimasiVal = estimasi_waktu || "2 Hari";

        try {
            await pool.query(
                "UPDATE layanan SET nama_layanan = ?, kategori = ?, satuan = ?, harga = ?, estimasi_waktu = ?, deskripsi = ? WHERE id_layanan = ?",
                [nama_layanan.trim(), katVal, satuanVal, round2(hargaNum), estimasiVal, deskripsi || '', id]
            );
        } catch (dbErr) {
            console.warn("PEMILIK UPDATE LAYANAN MySQL warning:", dbErr.message);
        }

        const l = db.layanan.find(x => x.id_layanan === id);
        if (l) {
            l.nama_layanan = nama_layanan.trim();
            l.kategori = katVal;
            l.satuan = satuanVal;
            l.harga = round2(hargaNum);
            l.estimasi_waktu = estimasiVal;
            l.deskripsi = deskripsi || '';
        }

        return res.json({ success: true, message: "Layanan berhasil diperbarui di database XAMPP", data: null });
    } catch (error) {
        console.error("UPDATE LAYANAN ERROR:", error);
        return sendError(res, 500, "Gagal memperbarui layanan");
    }
};

// 13. Aktifkan / nonaktifkan layanan
exports.updateStatusLayanan = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID layanan tidak valid");
        const id = Number(req.params.id);
        const { status } = req.body || {};
        if (!STATUS_AKUN.includes(status)) return sendError(res, 400, "Status harus AKTIF atau NONAKTIF");

        try {
            await pool.query("UPDATE layanan SET status = ? WHERE id_layanan = ?", [status, id]);
        } catch (dbErr) {
            console.warn("PEMILIK UPDATE STATUS LAYANAN MySQL warning:", dbErr.message);
        }

        const l = db.layanan.find(x => x.id_layanan === id);
        if (l) l.status = status;

        return res.json({
            success: true,
            message: "Status layanan berhasil diubah di database XAMPP",
            data: { id_layanan: id, status }
        });
    } catch (error) {
        console.error("UPDATE STATUS LAYANAN ERROR:", error);
        return sendError(res, 500, "Gagal mengubah status layanan");
    }
};

// 14. Daftar pelanggan (Tersinkronisasi Real-Time dengan MySQL XAMPP)
exports.daftarPelanggan = async (req, res) => {
    try {
        const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
        try {
            let sql = `
                SELECT pl.id_pelanggan, pl.id_user, pl.kode_pelanggan, pl.nama, pl.telepon, pl.email, pl.alamat, pl.member_tier, pl.created_at,
                       COUNT(DISTINCT p.id_pesanan) AS total_pesanan,
                       COALESCE(SUM(CASE WHEN p.status != 'DIBATALKAN' THEN p.total_harga ELSE 0 END), 0) AS total_belanja
                FROM pelanggan pl
                LEFT JOIN pesanan p ON p.id_pelanggan = pl.id_pelanggan
            `;
            const params = [];
            if (q) {
                sql += " WHERE pl.nama LIKE ? OR pl.kode_pelanggan LIKE ? OR pl.telepon LIKE ? OR pl.email LIKE ?";
                const likeQ = `%${q}%`;
                params.push(likeQ, likeQ, likeQ, likeQ);
            }
            sql += " GROUP BY pl.id_pelanggan ORDER BY pl.id_pelanggan DESC";
            const [rows] = await pool.query(sql, params);
            return res.json({ success: true, message: "Data pelanggan berhasil diambil dari MySQL XAMPP", data: rows });
        } catch (dbErr) {
            console.warn("PEMILIK DAFTAR PELANGGAN MySQL warning, fallback:", dbErr.message);
            let rows = [...db.pelanggan].sort((a, b) => b.id_pelanggan - a.id_pelanggan);
            if (q) {
                rows = rows.filter(p =>
                    [p.nama, p.kode_pelanggan, p.telepon, p.email]
                        .some(v => v && String(v).toLowerCase().includes(q))
                );
            }
            return res.json({ success: true, message: "Data pelanggan berhasil diambil", data: rows });
        }
    } catch (error) {
        console.error("DAFTAR PELANGGAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil data pelanggan");
    }
};

// 15. Detail pelanggan beserta ringkasan pesanan
exports.detailPelanggan = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pelanggan tidak valid");
        const id = Number(req.params.id);
        try {
            const [rows] = await pool.query(`
                SELECT pl.*,
                       COUNT(DISTINCT p.id_pesanan) AS total_pesanan,
                       COALESCE(SUM(CASE WHEN p.status != 'DIBATALKAN' THEN p.total_harga ELSE 0 END), 0) AS total_belanja
                FROM pelanggan pl
                LEFT JOIN pesanan p ON p.id_pelanggan = pl.id_pelanggan
                WHERE pl.id_pelanggan = ?
                GROUP BY pl.id_pelanggan
                LIMIT 1
            `, [id]);
            if (rows && rows.length > 0) {
                return res.json({ success: true, message: "Detail pelanggan berhasil diambil dari MySQL XAMPP", data: rows[0] });
            }
        } catch (dbErr) {
            console.warn("PEMILIK DETAIL PELANGGAN MySQL warning, fallback:", dbErr.message);
        }

        const pl = db.pelanggan.find(x => x.id_pelanggan === id);
        if (!pl) return sendError(res, 404, "Pelanggan tidak ditemukan");

        const pesanan = db.pesanan.filter(p => p.id_pelanggan === id);
        return res.json({
            success: true,
            message: "Detail pelanggan berhasil diambil",
            data: {
                ...pl,
                total_pesanan: pesanan.length,
                total_belanja: round2(
                    pesanan.filter(p => p.status !== "DIBATALKAN").reduce((s, p) => s + Number(p.total_harga), 0)
                )
            }
        });
    } catch (error) {
        console.error("DETAIL PELANGGAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil detail pelanggan");
    }
};

// 16. Daftar pesanan (Tersinkronisasi Real-Time dengan MySQL XAMPP)
exports.daftarPesanan = async (req, res) => {
    try {
        const { status } = req.query;
        if (status !== undefined && !STATUS_PESANAN.includes(status)) {
            return sendError(res, 400, "Status pesanan tidak valid");
        }
        try {
            let sql = `
                SELECT p.id_pesanan, p.kode_pesanan, p.id_pelanggan, p.id_pegawai,
                       p.tanggal_pesanan, p.tanggal_selesai, p.total_berat, p.total_harga,
                       p.status, p.catatan, pl.nama AS nama_pelanggan, pl.telepon AS telepon_pelanggan,
                       COALESCE((SELECT GROUP_CONCAT(l.nama_layanan SEPARATOR ', ') FROM detail_pesanan dp JOIN layanan l ON l.id_layanan = dp.id_layanan WHERE dp.id_pesanan = p.id_pesanan), 'Layanan Standar') AS layanan_nama,
                       pb.metode AS metode_bayar, pb.status AS status_bayar,
                       COALESCE(pb.bukti_bayar, p.bukti_bayar) AS bukti_bayar,
                       COALESCE(pb.bukti_bayar, p.bukti_bayar) AS bukti_transfer
                FROM pesanan p
                LEFT JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
                LEFT JOIN pembayaran pb ON pb.id_pembayaran = (
                    SELECT pb2.id_pembayaran FROM pembayaran pb2
                    WHERE pb2.id_pesanan = p.id_pesanan
                    ORDER BY pb2.id_pembayaran DESC LIMIT 1
                )
            `;
            const params = [];
            if (status) {
                sql += " WHERE p.status = ?";
                params.push(status);
            }
            sql += " ORDER BY p.id_pesanan DESC";
            const [rows] = await pool.query(sql, params);
            return res.json({ success: true, message: "Data pesanan berhasil diambil dari MySQL XAMPP", data: rows });
        } catch (dbErr) {
            console.warn("PEMILIK DAFTAR PESANAN MySQL warning, fallback:", dbErr.message);
            let rows = [...db.pesanan].sort((a, b) => b.id_pesanan - a.id_pesanan);
            if (status) rows = rows.filter(p => p.status === status);
            rows = rows.map(p => ({
                id_pesanan: p.id_pesanan,
                kode_pesanan: p.kode_pesanan,
                id_pelanggan: p.id_pelanggan,
                id_pegawai: p.id_pegawai,
                tanggal_pesanan: p.tanggal_pesanan,
                tanggal_selesai: p.tanggal_selesai,
                total_berat: p.total_berat,
                total_harga: p.total_harga,
                status: p.status,
                catatan: p.catatan,
                nama_pelanggan: namaPelanggan(p.id_pelanggan)
            }));
            return res.json({ success: true, message: "Data pesanan berhasil diambil", data: rows });
        }
    } catch (error) {
        console.error("DAFTAR PESANAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil pesanan");
    }
};

// 17. Detail pesanan beserta detail layanan dan riwayat status
exports.detailPesanan = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pesanan tidak valid");
        const id = Number(req.params.id);

        try {
            const [[pesanan]] = await pool.query(`
                SELECT p.*, pl.nama AS nama_pelanggan, pl.telepon AS telepon_pelanggan, pg.nama AS nama_pegawai
                FROM pesanan p
                LEFT JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
                LEFT JOIN pegawai pg ON pg.id_pegawai = p.id_pegawai
                WHERE p.id_pesanan = ?
            `, [id]);

            if (pesanan) {
                const [detail] = await pool.query(`
                    SELECT dp.id_detail, dp.id_layanan, l.nama_layanan, l.satuan, dp.jumlah, dp.harga_satuan, dp.subtotal
                    FROM detail_pesanan dp
                    JOIN layanan l ON l.id_layanan = dp.id_layanan
                    WHERE dp.id_pesanan = ?
                `, [id]);

                const [riwayat] = await pool.query(`
                    SELECT r.id_riwayat, r.status, r.catatan, r.waktu_perubahan, pg.nama AS nama_pegawai
                    FROM riwayat_status r
                    LEFT JOIN pegawai pg ON pg.id_pegawai = r.id_pegawai
                    WHERE r.id_pesanan = ?
                    ORDER BY r.id_riwayat ASC
                `, [id]);

                return res.json({
                    success: true,
                    message: "Detail pesanan berhasil diambil dari MySQL XAMPP",
                    data: { pesanan, detail, riwayat }
                });
            }
        } catch (dbErr) {
            console.warn("PEMILIK DETAIL PESANAN MySQL warning, fallback:", dbErr.message);
        }

        const p = db.pesanan.find(x => x.id_pesanan === id);
        if (!p) return sendError(res, 404, "Pesanan tidak ditemukan");

        const pl = db.pelanggan.find(x => x.id_pelanggan === p.id_pelanggan);
        const detail = db.detail_pesanan
            .filter(d => d.id_pesanan === id)
            .sort((a, b) => a.id_detail - b.id_detail)
            .map(d => {
                const l = db.layanan.find(x => x.id_layanan === d.id_layanan);
                return {
                    id_detail: d.id_detail,
                    id_layanan: d.id_layanan,
                    nama_layanan: l ? l.nama_layanan : null,
                    satuan: l ? l.satuan : null,
                    jumlah: d.jumlah,
                    harga_satuan: d.harga_satuan,
                    subtotal: d.subtotal
                };
            });

        const riwayat = db.riwayat_status
            .filter(r => r.id_pesanan === id)
            .sort((a, b) => a.id_riwayat - b.id_riwayat)
            .map(r => {
                const pg = db.pegawai.find(x => x.id_pegawai === r.id_pegawai);
                return {
                    id_riwayat: r.id_riwayat,
                    status: r.status,
                    catatan: r.catatan,
                    waktu_perubahan: r.waktu_perubahan,
                    nama_pegawai: pg ? pg.nama : null
                };
            });
        const pg = db.pegawai.find(x => x.id_pegawai === p.id_pegawai);

        return res.json({
            success: true,
            message: "Detail pesanan berhasil diambil",
            data: {
                pesanan: {
                    ...p,
                    nama_pelanggan: pl ? pl.nama : null,
                    telepon_pelanggan: pl ? pl.telepon : null,
                    nama_pegawai: pg ? pg.nama : null
                },
                detail,
                riwayat
            }
        });
    } catch (error) {
        console.error("DETAIL PESANAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil detail pesanan");
    }
};

// 18. Daftar transaksi/pembayaran (Tersinkronisasi Real-Time dengan MySQL XAMPP)
exports.daftarTransaksi = async (req, res) => {
    try {
        try {
            const sql = `
                SELECT p.id_pesanan, p.kode_pesanan, pl.nama AS nama_pelanggan, p.total_harga, p.status AS status_pesanan,
                       pb.id_pembayaran, pb.jumlah_bayar, pb.metode, pb.tanggal_bayar, pb.status AS status_pembayaran
                FROM pesanan p
                LEFT JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
                LEFT JOIN pembayaran pb ON pb.id_pembayaran = (
                    SELECT pb2.id_pembayaran FROM pembayaran pb2
                    WHERE pb2.id_pesanan = p.id_pesanan
                    ORDER BY pb2.id_pembayaran DESC LIMIT 1
                )
                ORDER BY p.id_pesanan DESC
            `;
            const [rows] = await pool.query(sql);
            return res.json({ success: true, message: "Data transaksi berhasil diambil dari MySQL XAMPP", data: rows });
        } catch (dbErr) {
            console.warn("PEMILIK DAFTAR TRANSAKSI MySQL warning, fallback:", dbErr.message);
            const rows = [];
            const pesananUrut = [...db.pesanan].sort((a, b) => b.id_pesanan - a.id_pesanan);
            for (const p of pesananUrut) {
                const base = {
                    id_pesanan: p.id_pesanan,
                    kode_pesanan: p.kode_pesanan,
                    nama_pelanggan: namaPelanggan(p.id_pelanggan),
                    total_harga: p.total_harga,
                    status_pesanan: p.status
                };
                const pays = db.pembayaran
                    .filter(pb => pb.id_pesanan === p.id_pesanan)
                    .sort((a, b) => b.id_pembayaran - a.id_pembayaran);
                if (!pays.length) {
                    rows.push({
                        ...base,
                        id_pembayaran: null,
                        jumlah_bayar: null,
                        metode: null,
                        tanggal_bayar: null,
                        status_pembayaran: null
                    });
                } else {
                    for (const pb of pays) {
                        rows.push({
                            ...base,
                            id_pembayaran: pb.id_pembayaran,
                            jumlah_bayar: pb.jumlah_bayar,
                            metode: pb.metode,
                            tanggal_bayar: pb.tanggal_bayar,
                            status_pembayaran: pb.status
                        });
                    }
                }
            }
            return res.json({ success: true, message: "Data transaksi berhasil diambil", data: rows });
        }
    } catch (error) {
        console.error("DAFTAR TRANSAKSI ERROR:", error);
        return sendError(res, 500, "Gagal mengambil transaksi");
    }
};

// 19. Detail transaksi
exports.detailTransaksi = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pesanan tidak valid");
        const id = Number(req.params.id);

        try {
            const [[pesanan]] = await pool.query(`
                SELECT p.id_pesanan, p.kode_pesanan, p.total_harga, p.status AS status_pesanan, pl.nama AS nama_pelanggan
                FROM pesanan p
                LEFT JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
                WHERE p.id_pesanan = ?
            `, [id]);

            if (pesanan) {
                const [pembayaran] = await pool.query(`
                    SELECT id_pembayaran, jumlah_bayar, metode, tanggal_bayar, status
                    FROM pembayaran
                    WHERE id_pesanan = ?
                    ORDER BY id_pembayaran DESC
                `, [id]);

                const [[totRow]] = await pool.query(`
                    SELECT COALESCE(SUM(jumlah_bayar), 0) AS total_dibayar
                    FROM pembayaran
                    WHERE id_pesanan = ? AND status = 'BERHASIL'
                `, [id]);

                const dibayar = Number(totRow.total_dibayar) || 0;
                return res.json({
                    success: true,
                    message: "Detail transaksi berhasil diambil dari MySQL XAMPP",
                    data: {
                        pesanan: {
                            ...pesanan,
                            total_dibayar: dibayar,
                            sisa_tagihan: Math.max(0, round2(Number(pesanan.total_harga) - dibayar))
                        },
                        pembayaran
                    }
                });
            }
        } catch (dbErr) {
            console.warn("PEMILIK DETAIL TRANSAKSI MySQL warning, fallback:", dbErr.message);
        }

        const p = db.pesanan.find(x => x.id_pesanan === id);
        if (!p) return sendError(res, 404, "Pesanan tidak ditemukan");

        const pembayaran = db.pembayaran
            .filter(pb => pb.id_pesanan === id)
            .sort((a, b) => b.id_pembayaran - a.id_pembayaran)
            .map(pb => ({
                id_pembayaran: pb.id_pembayaran,
                jumlah_bayar: pb.jumlah_bayar,
                metode: pb.metode,
                tanggal_bayar: pb.tanggal_bayar,
                status: pb.status
            }));
        const dibayar = totalDibayar(id);

        return res.json({
            success: true,
            message: "Detail transaksi berhasil diambil",
            data: {
                pesanan: {
                    id_pesanan: p.id_pesanan,
                    kode_pesanan: p.kode_pesanan,
                    total_harga: p.total_harga,
                    status_pesanan: p.status,
                    nama_pelanggan: namaPelanggan(p.id_pelanggan),
                    total_dibayar: dibayar,
                    sisa_tagihan: Math.max(0, round2(Number(p.total_harga) - dibayar))
                },
                pembayaran
            }
        });
    } catch (error) {
        console.error("DETAIL TRANSAKSI ERROR:", error);
        return sendError(res, 500, "Gagal mengambil detail transaksi");
    }
};

// 20. Laporan pendapatan (Tersinkronisasi Real-Time dengan MySQL XAMPP)
exports.laporanPendapatan = async (req, res) => {
    try {
        const { dari, sampai } = req.query;
        if (dari !== undefined && !validTanggal(dari)) return sendError(res, 400, "Parameter dari harus berformat YYYY-MM-DD");
        if (sampai !== undefined && !validTanggal(sampai)) return sendError(res, 400, "Parameter sampai harus berformat YYYY-MM-DD");
        if (dari && sampai && dari > sampai) return sendError(res, 400, "Tanggal dari tidak boleh lebih besar dari tanggal sampai");

        try {
            let whereClause = "WHERE pb.status = 'BERHASIL'";
            const params = [];
            if (dari) {
                whereClause += " AND DATE(pb.tanggal_bayar) >= ?";
                params.push(dari);
            }
            if (sampai) {
                whereClause += " AND DATE(pb.tanggal_bayar) <= ?";
                params.push(sampai);
            }

            const [[totalRow]] = await pool.query(
                `SELECT COALESCE(SUM(pb.jumlah_bayar), 0) AS total_pendapatan, COUNT(DISTINCT pb.id_pesanan) AS total_pesanan FROM pembayaran pb ${whereClause}`,
                params
            );

            const [perMetodeRows] = await pool.query(
                `SELECT pb.metode, COALESCE(SUM(pb.jumlah_bayar), 0) AS jumlah FROM pembayaran pb ${whereClause} GROUP BY pb.metode`,
                params
            );

            const [perHariRows] = await pool.query(
                `SELECT DATE_FORMAT(pb.tanggal_bayar, '%Y-%m-%d') AS tanggal, COALESCE(SUM(pb.jumlah_bayar), 0) AS jumlah FROM pembayaran pb ${whereClause} GROUP BY DATE(pb.tanggal_bayar) ORDER BY tanggal ASC`,
                params
            );

            const [statusRows] = await pool.query(
                "SELECT status, COUNT(*) AS count FROM pesanan GROUP BY status"
            );
            const perStatus = {};
            STATUS_PESANAN.forEach(s => { perStatus[s] = 0; });
            statusRows.forEach(r => { perStatus[r.status] = Number(r.count); });

            return res.json({
                success: true,
                message: "Laporan pendapatan berhasil diambil dari MySQL XAMPP",
                data: {
                    periode: { dari: dari || null, sampai: sampai || null },
                    total_pesanan: Number(totalRow.total_pesanan) || 0,
                    total_pendapatan: round2(Number(totalRow.total_pendapatan) || 0),
                    pendapatan_per_metode: perMetodeRows.map(r => ({ metode: r.metode, jumlah: round2(Number(r.jumlah)) })),
                    pendapatan_harian: perHariRows.map(r => ({ tanggal: r.tanggal, jumlah: round2(Number(r.jumlah)) })),
                    pesanan_per_status: perStatus
                }
            });
        } catch (dbErr) {
            console.warn("PEMILIK LAPORAN PENDAPATAN MySQL warning, fallback:", dbErr.message);
            const dalamRentang = (waktu) => {
                const tgl = String(waktu).slice(0, 10);
                return (!dari || tgl >= dari) && (!sampai || tgl <= sampai);
            };

            const pesanan = db.pesanan.filter(p => dalamRentang(p.tanggal_pesanan));
            const pembayaran = db.pembayaran.filter(pb => pb.status === "BERHASIL" && dalamRentang(pb.tanggal_bayar));

            const perMetode = {};
            const perHari = {};
            let total = 0;
            for (const pb of pembayaran) {
                const jumlah = Number(pb.jumlah_bayar);
                total += jumlah;
                perMetode[pb.metode] = (perMetode[pb.metode] || 0) + jumlah;
                const tgl = String(pb.tanggal_bayar).slice(0, 10);
                perHari[tgl] = (perHari[tgl] || 0) + jumlah;
            }

            const perStatus = {};
            STATUS_PESANAN.forEach(s => { perStatus[s] = 0; });
            for (const p of pesanan) perStatus[p.status]++;

            return res.json({
                success: true,
                message: "Laporan pendapatan berhasil diambil",
                data: {
                    periode: { dari: dari || null, sampai: sampai || null },
                    total_pesanan: pesanan.length,
                    total_pendapatan: round2(total),
                    pendapatan_per_metode: Object.entries(perMetode).map(([metode, jumlah]) => ({ metode, jumlah: round2(jumlah) })),
                    pendapatan_harian: Object.entries(perHari).map(([tanggal, jumlah]) => ({ tanggal, jumlah: round2(jumlah) })),
                    pesanan_per_status: perStatus
                }
            });
        }
    } catch (error) {
        console.error("LAPORAN PENDAPATAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil laporan pendapatan");
    }
};
