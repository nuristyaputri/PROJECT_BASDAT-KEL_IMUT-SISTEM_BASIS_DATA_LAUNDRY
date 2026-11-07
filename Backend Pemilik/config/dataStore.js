// Pengganti config/database.js.
// Semua data disimpan di memori (array JavaScript) sehingga TIDAK memerlukan MySQL.
// Data akan kembali ke data awal (seed) setiap server di-restart.
const bcrypt = require("bcryptjs");

function fmt(date = new Date()) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return fmt(d);
}

// "Tabel" dengan nama yang sama seperti di database pegawai.
const db = {
    users: [],
    pemilik: [],
    pegawai: [],
    pelanggan: [],
    layanan: [],
    pesanan: [],
    detail_pesanan: [],
    riwayat_status: [],
    pembayaran: []
};

// Pengganti AUTO_INCREMENT
const counters = {};
function nextId(table) {
    counters[table] = (counters[table] || 0) + 1;
    return counters[table];
}

const ALUR_STATUS = ["MENUNGGU", "DIPROSES", "DICUCI", "DISETRIKA", "SIAP_DIAMBIL", "SELESAI"];

function seedPesanan({ id_pelanggan, id_pegawai, hariLalu, items, status, catatan, bayar }) {
    const id_pesanan = nextId("pesanan");
    let total = 0;
    let berat = 0;
    let semuaKg = true;

    for (const it of items) {
        const l = db.layanan.find(x => x.id_layanan === it.id_layanan);
        const subtotal = it.jumlah * l.harga;
        total += subtotal;
        if (l.satuan === "kg") berat += it.jumlah; else semuaKg = false;
        db.detail_pesanan.push({
            id_detail: nextId("detail_pesanan"),
            id_pesanan,
            id_layanan: l.id_layanan,
            jumlah: it.jumlah,
            harga_satuan: l.harga,
            subtotal
        });
    }

    const tanggal = daysAgo(hariLalu);
    db.pesanan.push({
        id_pesanan,
        kode_pesanan: `ORD-SEED-${String(id_pesanan).padStart(3, "0")}`,
        id_pelanggan,
        id_pegawai,
        tanggal_pesanan: tanggal,
        tanggal_selesai: status === "SELESAI" ? tanggal : null,
        total_berat: semuaKg ? berat : null,
        total_harga: total,
        status,
        catatan: catatan || null
    });

    if (status === "DIBATALKAN") {
        db.riwayat_status.push(
            { id_riwayat: nextId("riwayat_status"), id_pesanan, id_pegawai, status: "MENUNGGU", catatan: "Pesanan dibuat", waktu_perubahan: tanggal },
            { id_riwayat: nextId("riwayat_status"), id_pesanan, id_pegawai, status: "DIBATALKAN", catatan: "Dibatalkan pelanggan", waktu_perubahan: tanggal }
        );
    } else {
        ALUR_STATUS.slice(0, ALUR_STATUS.indexOf(status) + 1).forEach(s => {
            db.riwayat_status.push({
                id_riwayat: nextId("riwayat_status"),
                id_pesanan,
                id_pegawai,
                status: s,
                catatan: s === "MENUNGGU" ? "Pesanan dibuat" : null,
                waktu_perubahan: tanggal
            });
        });
    }

    if (bayar) {
        db.pembayaran.push({
            id_pembayaran: nextId("pembayaran"),
            id_pesanan,
            jumlah_bayar: bayar.jumlah ?? total,
            metode: bayar.metode,
            tanggal_bayar: tanggal,
            status: bayar.status
        });
    }
}

function seed() {
    const now = fmt();

    // Akun login demo:
    //   pemilik  / pemilik123
    //   pegawai1 / pegawai123
    //   pegawai2 / pegawai123
    const users = [
        { username: "pemilik", email: "pemilik@bersihin.test", password: "pemilik123", role: "PEMILIK" },
        { username: "pegawai1", email: "pegawai1@bersihin.test", password: "pegawai123", role: "PEGAWAI" },
        { username: "pegawai2", email: "pegawai2@bersihin.test", password: "pegawai123", role: "PEGAWAI" }
    ];
    users.forEach(u => db.users.push({
        id_user: nextId("users"),
        username: u.username,
        email: u.email,
        password: bcrypt.hashSync(u.password, 10),
        role: u.role,
        status: "AKTIF",
        created_at: now
    }));

    db.pemilik.push({
        id_pemilik: nextId("pemilik"),
        id_user: 1,
        kode_pemilik: "PMK-001",
        nama: "Budi Santoso",
        telepon: "081234567890",
        alamat: "Jl. Margonda Raya No. 10, Depok"
    });

    db.pegawai.push(
        { id_pegawai: nextId("pegawai"), id_user: 2, kode_pegawai: "PGW-001", nama: "Sari Wulandari", telepon: "081300000001", alamat: "Depok", jabatan: "Kasir" },
        { id_pegawai: nextId("pegawai"), id_user: 3, kode_pegawai: "PGW-002", nama: "Andi Pratama", telepon: "081300000002", alamat: "Depok", jabatan: "Operator Cuci" }
    );

    db.pelanggan.push(
        { id_pelanggan: nextId("pelanggan"), kode_pelanggan: "PLG-001", nama: "Rina Marlina", telepon: "081111111111", email: "rina@example.com", alamat: "Jl. Kukusan No. 5", created_at: now },
        { id_pelanggan: nextId("pelanggan"), kode_pelanggan: "PLG-002", nama: "Dedi Kurniawan", telepon: "082222222222", email: null, alamat: "Jl. Beji Timur No. 12", created_at: now },
        { id_pelanggan: nextId("pelanggan"), kode_pelanggan: "PLG-003", nama: "Maya Anggraini", telepon: "083333333333", email: "maya@example.com", alamat: "Jl. Pondok Cina No. 7", created_at: now }
    );

    db.layanan.push(
        { id_layanan: nextId("layanan"), nama_layanan: "Cuci Kering", satuan: "kg", harga: 7000, status: "AKTIF" },
        { id_layanan: nextId("layanan"), nama_layanan: "Cuci Setrika", satuan: "kg", harga: 9000, status: "AKTIF" },
        { id_layanan: nextId("layanan"), nama_layanan: "Setrika Saja", satuan: "kg", harga: 6000, status: "AKTIF" },
        { id_layanan: nextId("layanan"), nama_layanan: "Bedcover", satuan: "pcs", harga: 25000, status: "AKTIF" }
    );

    seedPesanan({ id_pelanggan: 1, id_pegawai: 1, hariLalu: 5, items: [{ id_layanan: 2, jumlah: 4 }], status: "SELESAI", bayar: { metode: "TUNAI", status: "BERHASIL" } });
    seedPesanan({ id_pelanggan: 2, id_pegawai: 1, hariLalu: 2, items: [{ id_layanan: 1, jumlah: 3 }, { id_layanan: 4, jumlah: 1 }], status: "SELESAI", bayar: { metode: "QRIS", status: "BERHASIL" } });
    seedPesanan({ id_pelanggan: 3, id_pegawai: 2, hariLalu: 1, items: [{ id_layanan: 2, jumlah: 5 }], status: "DICUCI", bayar: { metode: "TRANSFER", jumlah: 20000, status: "MENUNGGU" } });
    seedPesanan({ id_pelanggan: 1, id_pegawai: 2, hariLalu: 0, items: [{ id_layanan: 3, jumlah: 2 }], status: "MENUNGGU" });
    seedPesanan({ id_pelanggan: 2, id_pegawai: 1, hariLalu: 3, items: [{ id_layanan: 4, jumlah: 2 }], status: "DIBATALKAN", catatan: "Dibatalkan pelanggan" });
}

seed();

module.exports = { db, nextId, fmt };
