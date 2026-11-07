const bcrypt = require("bcryptjs");
const { db, nextId, fmt } = require("../config/dataStore");

const STATUS_PESANAN = [
    "MENUNGGU", "DIPROSES", "DICUCI", "DISETRIKA",
    "SIAP_DIAMBIL", "SELESAI", "DIBATALKAN"
];
const STATUS_AKUN = ["AKTIF", "NONAKTIF"];
const SATUAN_LAYANAN = ["kg", "pcs", "meter"];

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

// 1. Dashboard pemilik
exports.dashboard = async (req, res) => {
    try {
        const bulanIni = fmt().slice(0, 7);
        const berhasil = db.pembayaran.filter(pb => pb.status === "BERHASIL");
        const pendapatanTotal = berhasil.reduce((s, pb) => s + Number(pb.jumlah_bayar), 0);
        const pendapatanBulanIni = berhasil
            .filter(pb => String(pb.tanggal_bayar).slice(0, 7) === bulanIni)
            .reduce((s, pb) => s + Number(pb.jumlah_bayar), 0);

        return res.json({
            success: true,
            message: "Dashboard berhasil diambil",
            data: {
                total_pelanggan: db.pelanggan.length,
                total_pegawai: db.pegawai.length,
                pegawai_aktif: db.pegawai.filter(p => {
                    const u = db.users.find(x => x.id_user === p.id_user);
                    return u && u.status === "AKTIF";
                }).length,
                total_layanan: db.layanan.length,
                total_pesanan: db.pesanan.length,
                pesanan_menunggu: db.pesanan.filter(p => p.status === "MENUNGGU").length,
                pesanan_diproses: db.pesanan.filter(p => ["DIPROSES", "DICUCI", "DISETRIKA", "SIAP_DIAMBIL"].includes(p.status)).length,
                pesanan_selesai: db.pesanan.filter(p => p.status === "SELESAI").length,
                pendapatan_total: round2(pendapatanTotal),
                pendapatan_bulan_ini: round2(pendapatanBulanIni)
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
        const p = getPemilik(req.user.id_user);
        const u = db.users.find(x => x.id_user === req.user.id_user);
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
        const { nama, telepon, alamat } = req.body || {};
        if (typeof nama !== "string" || !nama.trim()) {
            return sendError(res, 400, "Nama pemilik wajib diisi");
        }
        const p = getPemilik(req.user.id_user);
        if (!p) return sendError(res, 404, "Profil pemilik tidak ditemukan");

        p.nama = nama.trim();
        p.telepon = telepon || null;
        p.alamat = alamat || null;
        return res.json({ success: true, message: "Profil berhasil diperbarui", data: null });
    } catch (error) {
        console.error("UPDATE PROFIL ERROR:", error);
        return sendError(res, 500, "Gagal mengubah profil");
    }
};

// 4. Daftar pegawai
exports.daftarPegawai = async (req, res) => {
    try {
        const { status } = req.query;
        if (status !== undefined && !STATUS_AKUN.includes(status)) {
            return sendError(res, 400, "Status harus AKTIF atau NONAKTIF");
        }
        let rows = [...db.pegawai].sort((a, b) => b.id_pegawai - a.id_pegawai).map(pegawaiView);
        if (status) rows = rows.filter(r => r.status === status);
        return res.json({ success: true, message: "Data pegawai berhasil diambil", data: rows });
    } catch (error) {
        console.error("DAFTAR PEGAWAI ERROR:", error);
        return sendError(res, 500, "Gagal mengambil data pegawai");
    }
};

// 5. Detail pegawai
exports.detailPegawai = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pegawai tidak valid");
        const p = db.pegawai.find(x => x.id_pegawai === Number(req.params.id));
        if (!p) return sendError(res, 404, "Pegawai tidak ditemukan");
        return res.json({ success: true, message: "Detail pegawai berhasil diambil", data: pegawaiView(p) });
    } catch (error) {
        console.error("DETAIL PEGAWAI ERROR:", error);
        return sendError(res, 500, "Gagal mengambil detail pegawai");
    }
};

// 6. Tambah pegawai (sekaligus membuat akun login role PEGAWAI)
exports.tambahPegawai = async (req, res) => {
    try {
        const { username, email, password, nama, telepon, alamat, jabatan } = req.body || {};
        if (typeof username !== "string" || !username.trim()) return sendError(res, 400, "Username wajib diisi");
        if (typeof nama !== "string" || !nama.trim()) return sendError(res, 400, "Nama pegawai wajib diisi");
        if (typeof password !== "string" || password.length < 8) return sendError(res, 400, "Password minimal 8 karakter");
        if (email && !validEmail(email)) return sendError(res, 400, "Format email tidak valid");

        const usernameBersih = username.trim();
        if (db.users.some(u => u.username.toLowerCase() === usernameBersih.toLowerCase())) {
            return sendError(res, 409, "Username sudah digunakan");
        }
        if (email && db.users.some(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase())) {
            return sendError(res, 409, "Email sudah digunakan");
        }

        const id_user = nextId("users");
        db.users.push({
            id_user,
            username: usernameBersih,
            email: email ? email.trim() : null,
            password: await bcrypt.hash(password, 10),
            role: "PEGAWAI",
            status: "AKTIF",
            created_at: fmt()
        });

        const id_pegawai = nextId("pegawai");
        const kode = `PGW-${String(id_pegawai).padStart(3, "0")}`;
        db.pegawai.push({
            id_pegawai,
            id_user,
            kode_pegawai: kode,
            nama: nama.trim(),
            telepon: telepon || null,
            alamat: alamat || null,
            jabatan: jabatan || null
        });

        return res.status(201).json({
            success: true,
            message: "Pegawai berhasil ditambahkan",
            data: { id_pegawai, kode_pegawai: kode, id_user, username: usernameBersih }
        });
    } catch (error) {
        console.error("TAMBAH PEGAWAI ERROR:", error);
        return sendError(res, 500, "Gagal menambahkan pegawai");
    }
};

// 7. Edit pegawai
exports.updatePegawai = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pegawai tidak valid");
        const { nama, telepon, alamat, jabatan, email } = req.body || {};
        if (typeof nama !== "string" || !nama.trim()) return sendError(res, 400, "Nama pegawai wajib diisi");
        if (email && !validEmail(email)) return sendError(res, 400, "Format email tidak valid");

        const p = db.pegawai.find(x => x.id_pegawai === Number(req.params.id));
        if (!p) return sendError(res, 404, "Pegawai tidak ditemukan");

        const u = db.users.find(x => x.id_user === p.id_user);
        if (email && db.users.some(x => x.id_user !== p.id_user && x.email && x.email.toLowerCase() === email.trim().toLowerCase())) {
            return sendError(res, 409, "Email sudah digunakan");
        }

        p.nama = nama.trim();
        p.telepon = telepon || null;
        p.alamat = alamat || null;
        p.jabatan = jabatan || null;
        if (u) u.email = email ? email.trim() : null;

        return res.json({ success: true, message: "Data pegawai berhasil diperbarui", data: null });
    } catch (error) {
        console.error("UPDATE PEGAWAI ERROR:", error);
        return sendError(res, 500, "Gagal memperbarui pegawai");
    }
};

// 8. Aktifkan / nonaktifkan akun pegawai
exports.updateStatusPegawai = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID pegawai tidak valid");
        const { status } = req.body || {};
        if (!STATUS_AKUN.includes(status)) return sendError(res, 400, "Status harus AKTIF atau NONAKTIF");

        const p = db.pegawai.find(x => x.id_pegawai === Number(req.params.id));
        if (!p) return sendError(res, 404, "Pegawai tidak ditemukan");
        const u = db.users.find(x => x.id_user === p.id_user);
        if (!u) return sendError(res, 404, "Akun pegawai tidak ditemukan");

        u.status = status;
        return res.json({
            success: true,
            message: "Status pegawai berhasil diubah",
            data: { id_pegawai: p.id_pegawai, status }
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
        let rows = [...db.layanan].sort((a, b) => b.id_layanan - a.id_layanan);
        if (status) rows = rows.filter(r => r.status === status);
        return res.json({ success: true, message: "Data layanan berhasil diambil", data: rows });
    } catch (error) {
        console.error("DAFTAR LAYANAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil data layanan");
    }
};

// 10. Detail layanan
exports.detailLayanan = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID layanan tidak valid");
        const l = db.layanan.find(x => x.id_layanan === Number(req.params.id));
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
        const { nama_layanan, satuan, harga } = req.body || {};
        if (typeof nama_layanan !== "string" || !nama_layanan.trim()) return sendError(res, 400, "Nama layanan wajib diisi");
        if (!SATUAN_LAYANAN.includes(satuan)) return sendError(res, 400, `Satuan harus salah satu dari: ${SATUAN_LAYANAN.join(", ")}`);
        const hargaNum = Number(harga);
        if (!Number.isFinite(hargaNum) || hargaNum <= 0) return sendError(res, 400, "Harga harus lebih dari 0");

        if (db.layanan.some(l => l.nama_layanan.toLowerCase() === nama_layanan.trim().toLowerCase())) {
            return sendError(res, 409, "Nama layanan sudah digunakan");
        }

        const layanan = {
            id_layanan: nextId("layanan"),
            nama_layanan: nama_layanan.trim(),
            satuan,
            harga: round2(hargaNum),
            status: "AKTIF"
        };
        db.layanan.push(layanan);
        return res.status(201).json({ success: true, message: "Layanan berhasil ditambahkan", data: layanan });
    } catch (error) {
        console.error("TAMBAH LAYANAN ERROR:", error);
        return sendError(res, 500, "Gagal menambahkan layanan");
    }
};

// 12. Edit layanan (harga lama pada pesanan yang sudah ada tidak ikut berubah)
exports.updateLayanan = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID layanan tidak valid");
        const { nama_layanan, satuan, harga } = req.body || {};
        if (typeof nama_layanan !== "string" || !nama_layanan.trim()) return sendError(res, 400, "Nama layanan wajib diisi");
        if (!SATUAN_LAYANAN.includes(satuan)) return sendError(res, 400, `Satuan harus salah satu dari: ${SATUAN_LAYANAN.join(", ")}`);
        const hargaNum = Number(harga);
        if (!Number.isFinite(hargaNum) || hargaNum <= 0) return sendError(res, 400, "Harga harus lebih dari 0");

        const l = db.layanan.find(x => x.id_layanan === Number(req.params.id));
        if (!l) return sendError(res, 404, "Layanan tidak ditemukan");
        if (db.layanan.some(x => x.id_layanan !== l.id_layanan && x.nama_layanan.toLowerCase() === nama_layanan.trim().toLowerCase())) {
            return sendError(res, 409, "Nama layanan sudah digunakan");
        }

        l.nama_layanan = nama_layanan.trim();
        l.satuan = satuan;
        l.harga = round2(hargaNum);
        return res.json({ success: true, message: "Layanan berhasil diperbarui", data: null });
    } catch (error) {
        console.error("UPDATE LAYANAN ERROR:", error);
        return sendError(res, 500, "Gagal memperbarui layanan");
    }
};

// 13. Aktifkan / nonaktifkan layanan
exports.updateStatusLayanan = async (req, res) => {
    try {
        if (!validId(req.params.id)) return sendError(res, 400, "ID layanan tidak valid");
        const { status } = req.body || {};
        if (!STATUS_AKUN.includes(status)) return sendError(res, 400, "Status harus AKTIF atau NONAKTIF");

        const l = db.layanan.find(x => x.id_layanan === Number(req.params.id));
        if (!l) return sendError(res, 404, "Layanan tidak ditemukan");

        l.status = status;
        return res.json({
            success: true,
            message: "Status layanan berhasil diubah",
            data: { id_layanan: l.id_layanan, status }
        });
    } catch (error) {
        console.error("UPDATE STATUS LAYANAN ERROR:", error);
        return sendError(res, 500, "Gagal mengubah status layanan");
    }
};

// 14. Daftar pelanggan (opsional pencarian ?q=)
exports.daftarPelanggan = async (req, res) => {
    try {
        const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
        let rows = [...db.pelanggan].sort((a, b) => b.id_pelanggan - a.id_pelanggan);
        if (q) {
            rows = rows.filter(p =>
                [p.nama, p.kode_pelanggan, p.telepon, p.email]
                    .some(v => v && String(v).toLowerCase().includes(q))
            );
        }
        return res.json({ success: true, message: "Data pelanggan berhasil diambil", data: rows });
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

// 16. Daftar pesanan (opsional filter ?status=)
exports.daftarPesanan = async (req, res) => {
    try {
        const { status } = req.query;
        if (status !== undefined && !STATUS_PESANAN.includes(status)) {
            return sendError(res, 400, "Status pesanan tidak valid");
        }
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

// 18. Daftar transaksi/pembayaran
exports.daftarTransaksi = async (req, res) => {
    try {
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

// 20. Laporan pendapatan. Query opsional: ?dari=YYYY-MM-DD&sampai=YYYY-MM-DD
//     Pendapatan dihitung dari pembayaran berstatus BERHASIL berdasarkan tanggal bayar.
exports.laporanPendapatan = async (req, res) => {
    try {
        const { dari, sampai } = req.query;
        if (dari !== undefined && !validTanggal(dari)) return sendError(res, 400, "Parameter dari harus berformat YYYY-MM-DD");
        if (sampai !== undefined && !validTanggal(sampai)) return sendError(res, 400, "Parameter sampai harus berformat YYYY-MM-DD");
        if (dari && sampai && dari > sampai) return sendError(res, 400, "Tanggal dari tidak boleh lebih besar dari tanggal sampai");

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
        pesanan.forEach(p => { perStatus[p.status] += 1; });

        return res.json({
            success: true,
            message: "Laporan pendapatan berhasil diambil",
            data: {
                periode: { dari: dari || null, sampai: sampai || null },
                total_pesanan: pesanan.length,
                total_pendapatan: round2(total),
                pendapatan_per_metode: Object.entries(perMetode).map(([metode, jumlah]) => ({ metode, jumlah: round2(jumlah) })),
                pendapatan_harian: Object.entries(perHari)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([tanggal, jumlah]) => ({ tanggal, jumlah: round2(jumlah) })),
                pesanan_per_status: perStatus
            }
        });
    } catch (error) {
        console.error("LAPORAN PENDAPATAN ERROR:", error);
        return sendError(res, 500, "Gagal mengambil laporan pendapatan");
    }
};
