/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/config/dataStore.js
 * Deskripsi: Data store in-memory untuk pengujian cepat dan demo instan tanpa MySQL.
 * =============================================================================
 */

const bcrypt = require('bcryptjs');

function fmt(date = new Date()) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmt(d);
}

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

const counters = {};
function nextId(table) {
  counters[table] = (counters[table] || 0) + 1;
  return counters[table];
}

const ALUR_STATUS = ['MENUNGGU', 'DIPROSES', 'DICUCI', 'DISETRIKA', 'SIAP_DIAMBIL', 'SELESAI'];

function seedPesanan({ id_pelanggan, id_pegawai, hariLalu, items, status, catatan, bayar }) {
  const id_pesanan = nextId('pesanan');
  let total = 0;
  let berat = 0;
  let semuaKg = true;

  for (const it of items) {
    const l = db.layanan.find(x => x.id_layanan === it.id_layanan);
    if (!l) continue;
    const subtotal = it.jumlah * l.harga;
    total += subtotal;
    if (l.satuan === 'kg') berat += it.jumlah; else semuaKg = false;
    db.detail_pesanan.push({
      id_detail: nextId('detail_pesanan'),
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
    kode_pesanan: `TRX-${String(id_pesanan).padStart(4, '0')}`,
    id_pelanggan,
    id_pegawai,
    tanggal_pesanan: tanggal,
    tanggal_selesai: status === 'SELESAI' ? tanggal : null,
    total_berat: semuaKg ? berat : null,
    total_harga: total,
    status,
    catatan: catatan || null
  });

  if (status === 'DIBATALKAN') {
    db.riwayat_status.push(
      { id_riwayat: nextId('riwayat_status'), id_pesanan, id_pegawai, status: 'MENUNGGU', catatan: 'Pesanan dibuat', waktu_perubahan: tanggal },
      { id_riwayat: nextId('riwayat_status'), id_pesanan, id_pegawai, status: 'DIBATALKAN', catatan: 'Dibatalkan pelanggan', waktu_perubahan: tanggal }
    );
  } else {
    ALUR_STATUS.slice(0, ALUR_STATUS.indexOf(status) + 1).forEach(s => {
      db.riwayat_status.push({
        id_riwayat: nextId('riwayat_status'),
        id_pesanan,
        id_pegawai,
        status: s,
        catatan: s === 'MENUNGGU' ? 'Pesanan dibuat' : null,
        waktu_perubahan: tanggal
      });
    });
  }

  if (bayar) {
    db.pembayaran.push({
      id_pembayaran: nextId('pembayaran'),
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

  // Akun login bawaan demo: password123
  const users = [
    { username: 'pemilik', email: 'rangga@bersihin.id', no_telp: '081211223344', password: 'password123', role: 'PEMILIK' },
    { username: 'dina.staff', email: 'dina.nurhaliza@bersihin.id', no_telp: '081298765432', password: 'password123', role: 'PEGAWAI' },
    { username: 'budi.operator', email: 'budi.operator@bersihin.id', no_telp: '081377889900', password: 'password123', role: 'PEGAWAI' },
    { username: 'andipratama', email: 'andi.pratama@email.com', no_telp: '081234567821', password: 'password123', role: 'PELANGGAN' }
  ];

  users.forEach(u => db.users.push({
    id_user: nextId('users'),
    username: u.username,
    email: u.email,
    no_telp: u.no_telp,
    telepon: u.no_telp,
    password: bcrypt.hashSync(u.password, 10),
    role: u.role,
    status: 'AKTIF',
    created_at: now
  }));

  db.pemilik.push({
    id_pemilik: nextId('pemilik'),
    id_user: 1,
    kode_pemilik: 'OWN-001',
    nama: 'Rangga Saputra',
    telepon: '081211223344',
    alamat: 'Jl. Margonda Raya No. 10, Depok'
  });

  db.pegawai.push(
    { id_pegawai: nextId('pegawai'), id_user: 2, kode_pegawai: 'PGW-001', nama: 'Dina Nurhaliza', telepon: '081298765432', alamat: 'Pasar Minggu, Jakarta Selatan', jabatan: 'Kasir Utama' },
    { id_pegawai: nextId('pegawai'), id_user: 3, kode_pegawai: 'PGW-002', nama: 'Budi Santoso', telepon: '081377889900', alamat: 'Lenteng Agung, Jakarta Selatan', jabatan: 'Operator Cuci' }
  );

  db.pelanggan.push(
    { id_pelanggan: nextId('pelanggan'), id_user: 4, kode_pelanggan: 'PLG-08129', nama: 'Andi Pratama', telepon: '081234567821', email: 'andi.pratama@email.com', alamat: 'Jl. Kemang Raya No. 45, Jakarta Selatan', member_tier: 'SILVER', created_at: now },
    { id_pelanggan: nextId('pelanggan'), id_user: null, kode_pelanggan: 'PLG-08130', nama: 'Rina Marlina', telepon: '081111111111', email: 'rina.marlina@example.com', alamat: 'Jl. Kukusan No. 5, Depok', member_tier: 'GOLD', created_at: now }
  );

  db.layanan.push(
    { id_layanan: nextId('layanan'), nama_layanan: 'Cuci Kering Lipat', kategori: 'KILOAN', satuan: 'kg', harga: 7000, estimasi_waktu: '2 Hari', status: 'AKTIF', deskripsi: 'Cuci bersih, kering wangi.' },
    { id_layanan: nextId('layanan'), nama_layanan: 'Cuci Komplit (Cuci + Setrika)', kategori: 'KILOAN', satuan: 'kg', harga: 9000, estimasi_waktu: '2 Hari', status: 'AKTIF', deskripsi: 'Paket lengkap bersih dan rapi.' },
    { id_layanan: nextId('layanan'), nama_layanan: 'Setrika Uap Saja', kategori: 'KILOAN', satuan: 'kg', harga: 6000, estimasi_waktu: '1 Hari', status: 'AKTIF', deskripsi: 'Setrika uap rapi bebas kusut.' },
    { id_layanan: nextId('layanan'), nama_layanan: 'Cuci Bedcover Besar', kategori: 'SATUAN', satuan: 'pcs', harga: 25000, estimasi_waktu: '3 Hari', status: 'AKTIF', deskripsi: 'Cuci bedcover ukuran King/Queen.' },
    { id_layanan: nextId('layanan'), nama_layanan: 'Cuci Kilat Express (4 Jam)', kategori: 'EXPRESS', satuan: 'kg', harga: 16000, estimasi_waktu: '4 Jam', status: 'AKTIF', deskripsi: 'Cuci kilat beres dalam 4 jam.' }
  );

  seedPesanan({ id_pelanggan: 1, id_pegawai: 1, hariLalu: 2, items: [{ id_layanan: 2, jumlah: 4.5 }], status: 'DICUCI', bayar: { metode: 'QRIS', status: 'BERHASIL' } });
  seedPesanan({ id_pelanggan: 2, id_pegawai: 1, hariLalu: 5, items: [{ id_layanan: 2, jumlah: 3 }, { id_layanan: 4, jumlah: 1 }], status: 'SELESAI', bayar: { metode: 'TRANSFER', status: 'BERHASIL' } });
}

seed();

module.exports = { db, nextId, fmt };

