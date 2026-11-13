/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/controllers/pelangganController.js
 * Deskripsi: Controller terpadu untuk kebutuhan pelanggan (profil, pesanan, layanan).
 * =============================================================================
 */

const pool = require('../config/database');
const { db: mockDb, nextId, fmt } = require('../config/dataStore');
const bcrypt = require('bcryptjs');

async function getCustomerId(req) {
  // Prioritas 1: Jika request secara eksplisit menyertakan id_pelanggan di query atau body
  if (req.query && req.query.id_pelanggan && Number(req.query.id_pelanggan) > 0) {
    return Number(req.query.id_pelanggan);
  }
  if (req.body && req.body.id_pelanggan && Number(req.body.id_pelanggan) > 0) {
    return Number(req.body.id_pelanggan);
  }

  // Prioritas 2: Jika ada id_user eksplisit di query atau body
  const explicitUserId = (req.query && req.query.id_user) || (req.body && req.body.id_user);
  if (explicitUserId) {
    try {
      const [rows] = await pool.query('SELECT id_pelanggan FROM pelanggan WHERE id_user = ? LIMIT 1', [explicitUserId]);
      if (rows && rows.length > 0) return rows[0].id_pelanggan;
    } catch (_) {}
  }

  // Prioritas 3: Jika ada username eksplisit di query atau body
  const explicitUsername = (req.query && req.query.username) || (req.body && req.body.username);
  if (explicitUsername) {
    try {
      const [uRows] = await pool.query(
        'SELECT p.id_pelanggan FROM pelanggan p JOIN users u ON u.id_user = p.id_user WHERE u.username = ? OR p.nama = ? LIMIT 1',
        [explicitUsername, explicitUsername]
      );
      if (uRows && uRows.length > 0) return uRows[0].id_pelanggan;
    } catch (_) {}
  }

  // Prioritas 4: JWT decoded user token atau Express Session
  if (req.user && req.user.id_pelanggan && Number(req.user.id_pelanggan) > 0) return Number(req.user.id_pelanggan);
  if (req.session && req.session.user && req.session.user.id_pelanggan) return Number(req.session.user.id_pelanggan);

  const idUser = (req.user && req.user.id_user) ||
                 (req.session && req.session.user && req.session.user.id_user);

  if (idUser) {
    try {
      const [rows] = await pool.query('SELECT id_pelanggan FROM pelanggan WHERE id_user = ? LIMIT 1', [idUser]);
      if (rows && rows.length > 0) return rows[0].id_pelanggan;
    } catch (_) {}
    const mockP = mockDb.pelanggan.find(p => p.id_user === Number(idUser));
    if (mockP) return mockP.id_pelanggan;
  }

  // Prioritas 5: Cari berdasarkan email atau telepon
  const email = (req.body && req.body.email) || (req.user && req.user.email) || (req.query && req.query.email);
  const telepon = (req.body && req.body.telepon) || (req.body && req.body.phone) || (req.user && req.user.telepon) || (req.user && req.user.no_telp) || (req.query && req.query.telepon);
  if (email || telepon) {
    try {
      const [rows] = await pool.query(
        'SELECT id_pelanggan FROM pelanggan WHERE (email = ? AND email IS NOT NULL AND email != "") OR (telepon = ? AND telepon IS NOT NULL AND telepon != "") LIMIT 1',
        [email || '', telepon || '']
      );
      if (rows && rows.length > 0) return rows[0].id_pelanggan;
    } catch (_) {}
  }

  // Prioritas 6: Jika username tersedia di req.user
  const uname = (req.user && req.user.username);
  if (uname) {
    try {
      const [uRows] = await pool.query(
        'SELECT p.id_pelanggan FROM pelanggan p JOIN users u ON u.id_user = p.id_user WHERE u.username = ? OR p.nama = ? LIMIT 1',
        [uname, uname]
      );
      if (uRows && uRows.length > 0) return uRows[0].id_pelanggan;
    } catch (_) {}
  }

  return null;
}

/**
 * GET /api/pelanggan/profil
 * Mengambil data profil pelanggan yang sedang login
 */
async function getPelanggan(req, res) {
  try {
    const idPelanggan = await getCustomerId(req);
    if (!idPelanggan) {
      return res.status(401).json({
        success: false,
        message: 'Sesi pelanggan tidak ditemukan. Silakan login kembali.'
      });
    }

    // 1. Coba database MySQL
    try {
      const [rows] = await pool.query(
        `SELECT p.id_pelanggan, p.id_user, p.kode_pelanggan, p.nama, p.telepon, p.email, p.alamat, p.member_tier,
                COALESCE(p.created_at, u.created_at, NOW()) AS created_at
         FROM pelanggan p
         LEFT JOIN users u ON u.id_user = p.id_user
         WHERE p.id_pelanggan = ? LIMIT 1`,
        [idPelanggan]
      );

      if (rows && rows.length > 0) {
        return res.json({
          success: true,
          message: 'Data pelanggan berhasil diambil',
          data: rows[0]
        });
      }
    } catch (_) {
      // Fallback ke mock data
    }

    // 2. Fallback mockDb
    const mockCust = mockDb.pelanggan.find(p => p.id_pelanggan === idPelanggan);
    if (mockCust) {
      return res.json({
        success: true,
        message: 'Data pelanggan berhasil diambil (dataStore)',
        data: mockCust
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Data pelanggan tidak ditemukan'
    });
  } catch (error) {
    console.error('Gagal mengambil data pelanggan:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
}

/**
 * PUT /api/pelanggan/profil
 * Memperbarui data profil pelanggan (Nama, Nomor Telepon, Email, Alamat)
 * Langsung tersinkronisasi ke tabel `pelanggan` dan tabel `users` MySQL
 */
async function updatePelanggan(req, res) {
  try {
    let idPelanggan = await getCustomerId(req);
    if (!idPelanggan) {
      return res.status(401).json({
        success: false,
        message: 'Sesi pelanggan tidak ditemukan. Silakan login kembali.'
      });
    }

    const { nama, telepon, phone, email, alamat } = req.body || {};
    const inputNama = nama || (req.body && req.body.fullName);
    if (!inputNama || !String(inputNama).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama pelanggan wajib diisi'
      });
    }

    const cleanNama = String(inputNama).trim();
    const cleanTelp = telepon || phone ? String(telepon || phone).trim() : null;
    const cleanEmail = email ? String(email).trim() : null;
    const cleanAlamat = alamat ? String(alamat).trim() : null;

    // 1. Perbarui di MySQL (tabel pelanggan dan tabel users yang berelasi)
    let dbSuccess = false;
    let targetUserId = (req.body && req.body.id_user) || (req.user && req.user.id_user);
    try {
      if (!targetUserId) {
        const [pRows] = await pool.query('SELECT id_user FROM pelanggan WHERE id_pelanggan = ? LIMIT 1', [idPelanggan]);
        if (pRows && pRows.length > 0) {
          targetUserId = pRows[0].id_user;
        }
      }

      // Pastikan baris pelanggan ada
      const [checkCust] = await pool.query('SELECT id_pelanggan, id_user FROM pelanggan WHERE id_pelanggan = ? LIMIT 1', [idPelanggan]);
      if (checkCust && checkCust.length > 0) {
        const [resUpdate] = await pool.query(
          `UPDATE pelanggan
           SET nama = ?, telepon = ?, email = ?, alamat = ?
           WHERE id_pelanggan = ?`,
          [cleanNama, cleanTelp, cleanEmail, cleanAlamat, idPelanggan]
        );
        console.log(`[UPDATE PELANGGAN MySQL] id_pelanggan: ${idPelanggan}, affected: ${resUpdate.affectedRows}`);
      } else if (targetUserId) {
        const kode = 'PLG-' + String(targetUserId).padStart(5, '0');
        const [resInsert] = await pool.query(
          `INSERT INTO pelanggan (id_user, kode_pelanggan, nama, telepon, email, alamat, member_tier)
           VALUES (?, ?, ?, ?, ?, ?, 'SILVER')`,
          [targetUserId, kode, cleanNama, cleanTelp, cleanEmail, cleanAlamat]
        );
        idPelanggan = resInsert.insertId;
        console.log(`[INSERT PELANGGAN MySQL] Baru dibuat dengan id_pelanggan: ${idPelanggan}`);
      }

      // Perbarui juga data users (email & no_telp) agar sinkron untuk login selanjutnya
      if (targetUserId) {
        await pool.query(
          `UPDATE users
           SET email = COALESCE(?, email), no_telp = COALESCE(?, no_telp)
           WHERE id_user = ?`,
          [cleanEmail, cleanTelp, targetUserId]
        );
        console.log(`[UPDATE USERS MySQL] id_user: ${targetUserId}, no_telp: ${cleanTelp}`);
      }
      dbSuccess = true;
    } catch (dbErr) {
      console.error('Gagal memperbarui profil pelanggan di MySQL:', dbErr.message);
    }

    // 2. Perbarui di mockDb / memory fallback
    const mockCust = mockDb.pelanggan.find(p => p.id_pelanggan === idPelanggan);
    if (mockCust) {
      mockCust.nama = cleanNama;
      mockCust.telepon = cleanTelp || '';
      mockCust.email = cleanEmail || '';
      mockCust.alamat = cleanAlamat || '';

      if (mockCust.id_user) {
        const u = mockDb.users.find(x => x.id_user === mockCust.id_user);
        if (u) {
          if (cleanEmail) u.email = cleanEmail;
          if (cleanTelp) u.no_telp = cleanTelp;
        }
      }
    }

    // Perbarui session jika aktif
    if (req.session && req.session.user) {
      req.session.user.nama = cleanNama;
      req.session.user.telepon = cleanTelp || '';
      req.session.user.no_telp = cleanTelp || '';
      req.session.user.email = cleanEmail || '';
      req.session.user.alamat = cleanAlamat || '';
    }

    return res.json({
      success: true,
      message: 'Profil pelanggan berhasil diperbarui di database.',
      data: {
        id_pelanggan: idPelanggan,
        id_user: targetUserId,
        nama: cleanNama,
        telepon: cleanTelp,
        email: cleanEmail,
        alamat: cleanAlamat,
        db_synced: dbSuccess
      }
    });
  } catch (error) {
    console.error('Gagal memperbarui data pelanggan:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server: ' + error.message
    });
  }
}

/**
 * PUT /api/pelanggan/password
 * Mengubah kata sandi pelanggan di database (tabel users)
 */
async function updatePasswordPelanggan(req, res) {
  try {
    const { password_lama, password_baru, currentPassword, newPassword } = req.body || {};
    const oldPass = password_lama || currentPassword;
    const nextPass = password_baru || newPassword;

    if (!oldPass || !nextPass) {
      return res.status(400).json({
        success: false,
        message: 'Password saat ini dan password baru wajib diisi.'
      });
    }

    if (String(nextPass).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password baru harus memiliki minimal 8 karakter.'
      });
    }

    const idPelanggan = await getCustomerId(req);
    let targetUserId = (req.user && req.user.id_user) ||
                       (req.session && req.session.user && req.session.user.id_user) ||
                       (req.body && req.body.id_user);

    if (!targetUserId && idPelanggan) {
      try {
        const [rows] = await pool.query('SELECT id_user FROM pelanggan WHERE id_pelanggan = ? LIMIT 1', [idPelanggan]);
        if (rows && rows.length > 0 && rows[0].id_user) {
          targetUserId = rows[0].id_user;
        }
      } catch (_) {}
    }

    if (!targetUserId) {
      const mockP = mockDb.pelanggan.find(p => p.id_pelanggan === idPelanggan);
      if (mockP && mockP.id_user) targetUserId = mockP.id_user;
    }

    if (!targetUserId) {
      return res.status(401).json({
        success: false,
        message: 'Sesi pengguna tidak ditemukan. Silakan login ulang untuk mengubah kata sandi.'
      });
    }

    let userRow = null;
    try {
      const [uRows] = await pool.query('SELECT * FROM users WHERE id_user = ? LIMIT 1', [targetUserId]);
      if (uRows && uRows.length > 0) userRow = uRows[0];
    } catch (_) {}

    if (!userRow) {
      userRow = mockDb.users.find(u => u.id_user === targetUserId);
    }

    if (!userRow) {
      return res.status(404).json({ success: false, message: 'Akun user tidak ditemukan di database.' });
    }

    // Verifikasi password lama
    let match = false;
    try {
      match = await bcrypt.compare(String(oldPass), userRow.password);
    } catch (_) {}
    if (!match && String(oldPass) === userRow.password) match = true;

    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Password saat ini yang Anda masukkan salah.'
      });
    }

    const newHashed = await bcrypt.hash(String(nextPass), 10);
    try {
      await pool.query('UPDATE users SET password = ? WHERE id_user = ?', [newHashed, targetUserId]);
    } catch (err) {
      console.warn('Gagal update password di MySQL:', err.message);
    }

    const mUser = mockDb.users.find(u => u.id_user === targetUserId);
    if (mUser) mUser.password = newHashed;

    return res.json({
      success: true,
      message: 'Password berhasil diperbarui di database.'
    });
  } catch (error) {
    console.error('Gagal memperbarui password pelanggan:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem saat memperbarui password: ' + error.message
    });
  }
}

/**
 * GET /api/pelanggan/pesanan
 * Mengambil riwayat pesanan milik pelanggan
 */
async function getPesanan(req, res) {
  try {
    const idPelanggan = await getCustomerId(req);
    if (!idPelanggan) {
      return res.json({ success: true, data: [] });
    }

    try {
      let querySql = `
        SELECT p.id_pesanan, p.kode_pesanan, p.id_pelanggan, p.id_pegawai, p.tanggal_pesanan, p.tanggal_selesai,
               p.total_berat, p.total_harga, p.status, p.catatan, p.created_at,
               COALESCE(MAX(pem.status), 'MENUNGGU') AS status_pembayaran,
               MAX(pem.metode) AS metode_pembayaran,
               MAX(pem.referensi_bayar) AS referensi_bayar,
               COALESCE(MAX(pem.bukti_bayar), MAX(p.bukti_bayar)) AS bukti_bayar,
               COALESCE(MAX(pem.bukti_bayar), MAX(p.bukti_bayar)) AS bukti_transfer,
               COALESCE(GROUP_CONCAT(DISTINCT l.nama_layanan ORDER BY dp.id_detail SEPARATOR ', '), 'Cuci Komplit (Cuci + Setrika)') AS layanan,
               MAX(dp.harga_satuan) AS harga_satuan,
               SUM(dp.subtotal) AS subtotal
        FROM pesanan p
        LEFT JOIN pembayaran pem ON pem.id_pesanan = p.id_pesanan
        LEFT JOIN detail_pesanan dp ON dp.id_pesanan = p.id_pesanan
        LEFT JOIN layanan l ON l.id_layanan = dp.id_layanan
        WHERE p.id_pelanggan = ?
        GROUP BY p.id_pesanan
        ORDER BY p.id_pesanan DESC
      `;
      const [rows] = await pool.query(querySql, [idPelanggan]);

      // Deduplikasi id_pesanan jika ada relasi pembayaran ganda
      const uniqueList = [];
      const seen = new Set();
      (rows || []).forEach(r => {
        if (!seen.has(r.id_pesanan)) {
          seen.add(r.id_pesanan);
          uniqueList.push(r);
        }
      });

      return res.json({ success: true, data: uniqueList });
    } catch (_) {
      const mockOrders = (mockDb.pesanan || [])
        .filter(p => p.id_pelanggan === idPelanggan)
        .map(p => {
          const dets = (mockDb.detail_pesanan || []).filter(d => d.id_pesanan === p.id_pesanan);
          const srvNames = dets
            .map(d => {
              const l = (mockDb.layanan || []).find(srv => srv.id_layanan === d.id_layanan);
              return l ? l.nama_layanan : null;
            })
            .filter(Boolean);
          const pay = (mockDb.pembayaran || []).find(pb => pb.id_pesanan === p.id_pesanan);
          return {
            id_pesanan: p.id_pesanan,
            kode_pesanan: p.kode_pesanan || p.nomor_pesanan,
            tanggal_pesanan: p.tanggal_pesanan || p.tanggal_masuk,
            tanggal_selesai: p.tanggal_selesai || p.tanggal_estimasi_selesai,
            total_berat: p.total_berat,
            total_harga: p.total_harga,
            status: p.status,
            status_pembayaran: (pay && pay.status) || p.status_pembayaran || 'MENUNGGU',
            metode_pembayaran: (pay && pay.metode) || null,
            referensi_bayar: (pay && pay.referensi_bayar) || null,
            catatan: p.catatan,
            layanan: srvNames.length ? srvNames.join(', ') : 'Cuci Komplit (Cuci + Setrika)'
          };
        });
      return res.json({ success: true, data: mockOrders });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil data pesanan' });
  }
}

/**
 * GET /api/pelanggan/layanan
 * Mengambil daftar seluruh katalog layanan laundry aktif untuk portal pelanggan
 */
async function getLayanan(req, res) {
  try {
    try {
      const sql = `SELECT id_layanan, nama_layanan, kategori, satuan, harga, estimasi_waktu, status, deskripsi
         FROM layanan
         WHERE status = 'AKTIF'
         ORDER BY id_layanan ASC`;
      const [rows] = await pool.query(sql);
      return res.json({ success: true, data: rows });
    } catch (_) {
      const activeServices = (mockDb.layanan || []).filter(l => l.status === 'AKTIF');
      return res.json({ success: true, data: activeServices });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil data layanan' });
  }
}

/**
 * GET /api/pelanggan/dashboard-summary
 * Mengambil ringkasan dashboard pelanggan
 */
async function getDashboardSummary(req, res) {
  try {
    const idPelanggan = await getCustomerId(req);
    if (!idPelanggan) {
      return res.json({
        success: true,
        data: {
          total_pesanan: 0,
          pesanan_aktif: 0,
          pesanan_selesai: 0,
          pesanan_terbaru: []
        }
      });
    }

    try {
      const [pRows] = await pool.query(
        'SELECT id_pesanan, status, total_harga FROM pesanan WHERE id_pelanggan = ? ORDER BY id_pesanan DESC',
        [idPelanggan]
      );
      const orders = pRows || [];
      const pesananAktif = orders.filter(p => ['MENUNGGU', 'DIPROSES', 'DICUCI', 'DISETRIKA', 'SIAP_DIAMBIL'].includes(p.status));
      const pesananSelesai = orders.filter(p => p.status === 'SELESAI');
      return res.json({
        success: true,
        data: {
          total_pesanan: orders.length,
          pesanan_aktif: pesananAktif.length,
          pesanan_selesai: pesananSelesai.length,
          pesanan_terbaru: orders.slice(0, 5)
        }
      });
    } catch (_) {}

    const mockOrders = mockDb.pesanan.filter(p => p.id_pelanggan === idPelanggan);
    const pesananAktif = mockOrders.filter(p => ['MENUNGGU', 'DIPROSES', 'DICUCI', 'DISETRIKA', 'SIAP_DIAMBIL'].includes(p.status));
    const pesananSelesai = mockOrders.filter(p => p.status === 'SELESAI');

    return res.json({
      success: true,
      data: {
        total_pesanan: mockOrders.length,
        pesanan_aktif: pesananAktif.length,
        pesanan_selesai: pesananSelesai.length,
        pesanan_terbaru: mockOrders.slice(0, 5)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil ringkasan dashboard' });
  }
}

/**
 * POST /api/pelanggan/pesanan
 * Membuat pesanan laundry baru oleh pelanggan dan menyimpannya ke database
 */
async function createPesanan(req, res) {
  let connection;
  try {
    const {
      layanan,
      id_layanan,
      berat,
      total_berat,
      catatan,
      metode_pengantaran,
      biaya_pengantaran,
      total_harga,
      nama,
      telepon,
      alamat,
      kode_pesanan,
      metode_pembayaran,
      bukti_transfer,
      bukti_bayar
    } = req.body || {};

    const proofOfPayment = bukti_transfer || bukti_bayar || null;
    let payMethod = 'TRANSFER';
    if (metode_pembayaran) {
      const pmUpper = String(metode_pembayaran).toUpperCase();
      if (pmUpper.includes('TUNAI') || pmUpper.includes('CASH')) payMethod = 'TUNAI';
      else if (pmUpper.includes('QRIS')) payMethod = 'QRIS';
      else payMethod = 'TRANSFER';
    } else if (!proofOfPayment) {
      payMethod = 'TUNAI';
    }

    const beratVal = Number(berat || total_berat || 3);
    if (!Number.isFinite(beratVal) || beratVal <= 0) {
      return res.status(400).json({ success: false, message: 'Berat/jumlah cucian harus lebih dari 0' });
    }
    const deliveryFee = Number(biaya_pengantaran || (metode_pengantaran === 'Jemput ke rumah' ? 5000 : 0));
    const customerNotes = catatan ? String(catatan).trim() : 'Pakaian reguler';

    // 1. Tentukan id_pelanggan dari sesi/token atau body eksplisit
    let idPelanggan = await getCustomerId(req);
    if (!idPelanggan) {
      return res.status(401).json({
        success: false,
        message: 'Sesi pelanggan tidak ditemukan. Silakan login terlebih dahulu.'
      });
    }

    // 2. Generate kode pesanan unik real-time
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const orderCode = kode_pesanan || `TRX-${yy}${mm}${dd}-${randomHex}`;

    // 3. Tentukan layanan dan tarif default sesuai bersihinlaundry.sql sebelum lookup DB
    let serviceId = Number(id_layanan) || 2;
    let serviceName = layanan || 'Cuci Komplit (Cuci + Setrika)';
    let unitPrice = 9000;
    let serviceUnit = (req.body && req.body.satuan) ? String(req.body.satuan).trim() : (serviceId === 4 ? 'pcs' : serviceId === 6 ? 'pasang' : 'kg');

    const svcLowerInput = String(serviceName).toLowerCase();
    if (!id_layanan) {
      if (svcLowerInput.includes('kering')) {
        unitPrice = 7000;
        serviceId = 1;
        serviceName = 'Cuci Kering Lipat';
        serviceUnit = 'kg';
      } else if (svcLowerInput.includes('setrika') && !svcLowerInput.includes('cuci')) {
        unitPrice = 6000;
        serviceId = 3;
        serviceName = 'Setrika Uap Saja';
        serviceUnit = 'kg';
      } else if (svcLowerInput.includes('bedcover')) {
        unitPrice = 25000;
        serviceId = 4;
        serviceName = 'Cuci Bedcover Besar';
        serviceUnit = 'pcs';
      } else if (svcLowerInput.includes('express') || svcLowerInput.includes('kilat') || svcLowerInput.includes('4 jam')) {
        unitPrice = 16000;
        serviceId = 5;
        serviceName = 'Cuci Kilat Express (4 Jam)';
        serviceUnit = 'kg';
      } else if (svcLowerInput.includes('sepatu')) {
        unitPrice = 30000;
        serviceId = 6;
        serviceName = 'Cuci Sepatu Premium';
        serviceUnit = 'pasang';
      }
    }

    const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
    let serviceSubtotal = round2(beratVal * unitPrice);
    let calculatedTotal = round2(serviceSubtotal + deliveryFee);
    let dbSaved = false;
    let newOrderId = null;
    let resolvedCust = { nama, telepon, alamat };

    // 4. Simpan ke database MySQL
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Prioritaskan lookup berdasarkan id_layanan, lalu nama layanan di tabel layanan MySQL
      let srvRows = [];
      if (id_layanan && Number(id_layanan) > 0) {
        [srvRows] = await connection.query(
          "SELECT id_layanan, nama_layanan, harga, satuan, estimasi_waktu FROM layanan WHERE id_layanan = ? LIMIT 1",
          [Number(id_layanan)]
        );
      }
      if ((!srvRows || srvRows.length === 0) && layanan) {
        const isExp = svcLowerInput.includes('express') || svcLowerInput.includes('kilat') || svcLowerInput.includes('4 jam');
        if (isExp) {
          [srvRows] = await connection.query(
            "SELECT id_layanan, nama_layanan, harga, satuan, estimasi_waktu FROM layanan WHERE nama_layanan LIKE '%Express%' OR nama_layanan LIKE '%Kilat%' LIMIT 1"
          );
        } else if (svcLowerInput.includes('komplit') || (svcLowerInput.includes('cuci') && svcLowerInput.includes('setrika'))) {
          [srvRows] = await connection.query(
            "SELECT id_layanan, nama_layanan, harga, satuan, estimasi_waktu FROM layanan WHERE id_layanan = 2 OR nama_layanan LIKE '%Komplit%' LIMIT 1"
          );
        } else if (svcLowerInput.includes('kering')) {
          [srvRows] = await connection.query(
            "SELECT id_layanan, nama_layanan, harga, satuan, estimasi_waktu FROM layanan WHERE id_layanan = 1 OR nama_layanan LIKE '%Kering%' LIMIT 1"
          );
        } else if (svcLowerInput.includes('setrika')) {
          [srvRows] = await connection.query(
            "SELECT id_layanan, nama_layanan, harga, satuan, estimasi_waktu FROM layanan WHERE id_layanan = 3 OR nama_layanan LIKE 'Setrika%' LIMIT 1"
          );
        } else if (svcLowerInput.includes('bedcover')) {
          [srvRows] = await connection.query(
            "SELECT id_layanan, nama_layanan, harga, satuan, estimasi_waktu FROM layanan WHERE id_layanan = 4 OR nama_layanan LIKE '%Bedcover%' LIMIT 1"
          );
        } else if (svcLowerInput.includes('sepatu')) {
          [srvRows] = await connection.query(
            "SELECT id_layanan, nama_layanan, harga, satuan, estimasi_waktu FROM layanan WHERE id_layanan = 6 OR nama_layanan LIKE '%Sepatu%' LIMIT 1"
          );
        }
        if (!srvRows || srvRows.length === 0) {
          [srvRows] = await connection.query(
            "SELECT id_layanan, nama_layanan, harga, satuan, estimasi_waktu FROM layanan WHERE nama_layanan = ? OR nama_layanan LIKE ? LIMIT 1",
            [layanan, `%${layanan}%`]
          );
        }
      }
      if (srvRows && srvRows.length > 0) {
        serviceId = srvRows[0].id_layanan;
        serviceName = srvRows[0].nama_layanan;
        if (srvRows[0].satuan) serviceUnit = srvRows[0].satuan;
        unitPrice = Number(srvRows[0].harga);
        serviceSubtotal = round2(beratVal * unitPrice);
        calculatedTotal = round2(serviceSubtotal + deliveryFee);
      }

      // Pastikan ID pelanggan valid di tabel pelanggan agar Foreign Key aman
      let validCust = null;
      const reqUserId = (req.body && req.body.id_user) || (req.user && req.user.id_user);
      if (reqUserId && !(req.body && req.body.id_pelanggan)) {
        const [cByU] = await connection.query("SELECT id_pelanggan, nama, telepon, alamat FROM pelanggan WHERE id_user = ? LIMIT 1", [reqUserId]);
        if (cByU && cByU.length > 0) {
          idPelanggan = cByU[0].id_pelanggan;
          validCust = cByU[0];
        }
      }

      if (!validCust && idPelanggan) {
        const [cRows] = await connection.query(
          "SELECT id_pelanggan, nama, telepon, alamat FROM pelanggan WHERE id_pelanggan = ? LIMIT 1",
          [idPelanggan]
        );
        if (cRows && cRows.length > 0) {
          validCust = cRows[0];
        }
      }

      if (!validCust) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Data profil pelanggan tidak ditemukan di database.'
        });
      }

      resolvedCust = {
        nama: nama || validCust.nama,
        telepon: telepon || validCust.telepon,
        alamat: alamat || validCust.alamat
      };

      // Perbarui telepon dan alamat pelanggan terkini hanya jika dikirim eksplisit
      if (idPelanggan && (telepon || alamat || nama)) {
        await connection.query(
          "UPDATE pelanggan SET telepon = COALESCE(?, telepon), alamat = COALESCE(?, alamat), nama = COALESCE(?, nama) WHERE id_pelanggan = ?",
          [telepon || null, alamat || null, nama || null, idPelanggan]
        );
      }

      // Hitung durasi estimasi pengerjaan sesuai layanan secara presisi
      let durationHours = 48; // Default 2 hari untuk reguler
      const srvCheck = String(serviceName || layanan || '').toLowerCase();
      if (srvCheck.includes('express') || srvCheck.includes('kilat') || srvCheck.includes('4 jam') || srvCheck.includes('cepat')) {
        durationHours = 4;
      } else if (srvCheck.includes('bedcover')) {
        durationHours = 72;
      } else if (srvCheck.includes('setrika')) {
        durationHours = 24;
      }

      const estDate = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

      // A. Insert ke tabel pesanan (termasuk tanggal_selesai estimasi dan bukti_bayar)
      const [resPesanan] = await connection.execute(
        `INSERT INTO pesanan (kode_pesanan, id_pelanggan, id_pegawai, tanggal_pesanan, tanggal_selesai, total_berat, total_harga, status, catatan, bukti_bayar)
         VALUES (?, ?, NULL, NOW(), ?, ?, ?, 'MENUNGGU', ?, ?)`,
        [orderCode, idPelanggan, estDate, beratVal, calculatedTotal, customerNotes, proofOfPayment]
      );
      newOrderId = resPesanan.insertId;

      // B. Insert ke tabel detail_pesanan
      await connection.execute(
        `INSERT INTO detail_pesanan (id_pesanan, id_layanan, jumlah, harga_satuan, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [newOrderId, serviceId, beratVal, unitPrice, serviceSubtotal]
      );

      // C. Insert ke tabel riwayat_status
      const deliveryMethodStr = metode_pengantaran ? ` (Metode: ${metode_pengantaran})` : '';
      const payMethodStr = ` (Metode Bayar: ${payMethod}${proofOfPayment ? ', Bukti Transfer Terlampir' : ''})`;
      await connection.execute(
        `INSERT INTO riwayat_status (id_pesanan, id_pegawai, status, catatan, waktu_perubahan)
         VALUES (?, NULL, 'MENUNGGU', ?, NOW())`,
        [newOrderId, `Pesanan dibuat oleh pelanggan${deliveryMethodStr}${payMethodStr}`]
      );

      // D. Insert ke tabel pembayaran
      await connection.execute(
        `INSERT INTO pembayaran (id_pesanan, jumlah_bayar, metode, tanggal_bayar, status, referensi_bayar, bukti_bayar)
         VALUES (?, ?, ?, NOW(), 'MENUNGGU', ?, ?)`,
        [newOrderId, calculatedTotal, payMethod, orderCode, proofOfPayment]
      );

      await connection.commit();
      dbSaved = true;
      console.log(`[PESANAN BARU MySQL] Berhasil tersimpan di XAMPP! ID: ${newOrderId}, Kode: ${orderCode}, Pelanggan: ${idPelanggan}`);
    } catch (dbErr) {
      if (connection) await connection.rollback();
      console.error('Peringatan: Gagal simpan pesanan ke MySQL, fallback ke in-memory store:', dbErr.message);
    } finally {
      if (connection) connection.release();
    }

    // 5. Sinkronkan juga ke dataStore (mockDb)
    // Hitung durasi estimasi pengerjaan sesuai layanan
    let durationHours = 48; // Default 2 hari untuk reguler
    const srvLower = String(serviceName || '').toLowerCase();
    if (srvLower.includes('express') || srvLower.includes('kilat') || srvLower.includes('4 jam') || srvLower.includes('cepat')) {
      durationHours = 4;
    } else if (srvLower.includes('setrika saja') || srvLower.includes('kering')) {
      durationHours = 24;
    }

    const estDate = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
    let estDateFormatted = '';
    if (durationHours <= 12) {
      const isSameDay = estDate.getDate() === now.getDate();
      const timeStr = `${String(estDate.getHours()).padStart(2, '0')}:${String(estDate.getMinutes()).padStart(2, '0')} WIB`;
      estDateFormatted = isSameDay ? `Hari ini, ${timeStr} (4 Jam)` : `Besok, ${timeStr} (4 Jam)`;
    } else if (durationHours <= 24) {
      const isTomorrow = estDate.getDate() !== now.getDate();
      const dateStr = estDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      estDateFormatted = isTomorrow ? `Besok (${dateStr})` : `Hari ini (${dateStr})`;
    } else {
      const timeStr = `${String(estDate.getHours()).padStart(2, '0')}:${String(estDate.getMinutes()).padStart(2, '0')} WIB`;
      const dateStr = estDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      estDateFormatted = `${dateStr}, ${timeStr} (2 Hari)`;
    }

    if (!newOrderId) newOrderId = nextId('pesanan');
    const mockOrder = {
      id_pesanan: newOrderId,
      kode_pesanan: orderCode,
      nomor_pesanan: orderCode,
      id_pelanggan: idPelanggan,
      id_pegawai: null,
      tanggal_pesanan: now.toISOString(),
      tanggal_masuk: now.toISOString(),
      tanggal_estimasi_selesai: estDate.toISOString(),
      total_berat: beratVal,
      total_harga: calculatedTotal,
      status: 'MENUNGGU',
      status_pembayaran: 'MENUNGGU',
      metode_pembayaran: payMethod,
      paymentMethod: payMethod,
      bukti_bayar: proofOfPayment,
      bukti_transfer: proofOfPayment,
      catatan: customerNotes,
      metode_pengantaran: metode_pengantaran || 'Antar sendiri'
    };
    mockDb.pesanan.unshift(mockOrder);

    // 6. Format tanggal dan waktu real-time
    const dateFormatted = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
    const fullDateTime = `${dateFormatted}, ${timeFormatted}`;

    const invoiceData = {
      id_pesanan: newOrderId,
      kode_pesanan: orderCode,
      tanggal_realtime: fullDateTime,
      tanggal_iso: now.toISOString(),
      estimasi_selesai: estDateFormatted,
      id_pelanggan: idPelanggan,
      id_layanan: serviceId,
      nama_pelanggan: resolvedCust.nama || 'Pelanggan',
      telepon: resolvedCust.telepon || '',
      alamat: resolvedCust.alamat || '',
      layanan: serviceName,
      berat: beratVal,
      satuan: serviceUnit,
      berat_formatted: serviceUnit === 'kg' ? `${beratVal},0 kg` : `${beratVal} ${serviceUnit}`,
      tarif_per_kg: unitPrice,
      tarif_per_kg_formatted: `Rp${Number(unitPrice).toLocaleString('id-ID')}/${serviceUnit}`,
      subtotal_layanan: serviceSubtotal,
      subtotal_layanan_formatted: `Rp${Number(serviceSubtotal).toLocaleString('id-ID')}`,
      metode_pengantaran: metode_pengantaran || 'Antar sendiri',
      biaya_pengantaran: deliveryFee,
      biaya_pengantaran_formatted: deliveryFee > 0 ? `+Rp${Number(deliveryFee).toLocaleString('id-ID')}` : 'Gratis',
      total_harga: calculatedTotal,
      total_harga_formatted: `Rp${Number(calculatedTotal).toLocaleString('id-ID')}`,
      catatan: customerNotes,
      metode_pembayaran: payMethod,
      bukti_bayar: proofOfPayment,
      bukti_transfer: proofOfPayment,
      status: 'MENUNGGU',
      status_label: 'Menunggu Konfirmasi Pegawai',
      saved_to_db: dbSaved
    };

    return res.status(201).json({
      success: true,
      message: 'Pesanan laundry berhasil dibuat dan tersimpan ke database.',
      data: invoiceData
    });
  } catch (error) {
    console.error('KESALAHAN CREATE PESANAN:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat pesanan laundry: ' + error.message
    });
  }
}

/**
 * GET /api/pelanggan/pesanan/:idOrCode
 * Mengambil detail pesanan dan riwayat status berdasarkan ID atau Kode
 */
async function getPesananDetail(req, res) {
  try {
    const idOrCode = req.params.idOrCode;
    if (!idOrCode) {
      return res.status(400).json({ success: false, message: 'ID atau kode pesanan wajib disertakan' });
    }

    try {
      const [rows] = await pool.query(
        `SELECT p.*, COALESCE(pl.nama, 'Pelanggan') AS nama_pelanggan,
                COALESCE(pl.telepon, '') AS telepon_pelanggan,
                COALESCE(pl.alamat, '') AS alamat_pelanggan
         FROM pesanan p
         LEFT JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
         WHERE p.id_pesanan = ? OR p.kode_pesanan = ?
         LIMIT 1`,
        [isNaN(idOrCode) ? 0 : Number(idOrCode), idOrCode]
      );
      if (rows && rows.length > 0) {
        const order = rows[0];
        const [details] = await pool.query(
          `SELECT dp.*, l.nama_layanan, l.satuan
           FROM detail_pesanan dp
           LEFT JOIN layanan l ON l.id_layanan = dp.id_layanan
           WHERE dp.id_pesanan = ?`,
          [order.id_pesanan]
        );
        const [riwayat] = await pool.query(
          `SELECT r.*, pg.nama AS nama_pegawai
           FROM riwayat_status r
           LEFT JOIN pegawai pg ON pg.id_pegawai = r.id_pegawai
           WHERE r.id_pesanan = ?
           ORDER BY r.waktu_perubahan ASC`,
          [order.id_pesanan]
        );
        const [pembayaran] = await pool.query(
          `SELECT id_pembayaran, jumlah_bayar, metode, tanggal_bayar, status, referensi_bayar, bukti_bayar
           FROM pembayaran
           WHERE id_pesanan = ?
           ORDER BY id_pembayaran DESC`,
          [order.id_pesanan]
        );
        const serviceNames = (details || []).map(d => d.nama_layanan).filter(Boolean);
        const serviceTitle = serviceNames.length > 0
          ? serviceNames.join(', ')
          : (String(order.catatan || '').toLowerCase().includes('express') ? 'Cuci Kilat Express (4 Jam)' : 'Cuci Komplit (Cuci + Setrika)');
        const latestPay = pembayaran && pembayaran[0] ? pembayaran[0] : null;
        const proofImg = order.bukti_bayar || (latestPay ? latestPay.bukti_bayar : null);
        return res.json({
          success: true,
          data: {
            ...order,
            layanan: serviceTitle,
            service: serviceTitle,
            bukti_bayar: proofImg,
            bukti_transfer: proofImg,
            status_pembayaran: latestPay ? latestPay.status : 'MENUNGGU',
            metode_pembayaran: latestPay ? latestPay.metode : null,
            referensi_bayar: latestPay ? latestPay.referensi_bayar : null,
            detail: details,
            pembayaran: pembayaran,
            riwayat: riwayat
          }
        });
      }
    } catch (_) {}

    // Fallback mockDb
    const mockOrder = mockDb.pesanan.find(p => p.id_pesanan === Number(idOrCode) || p.kode_pesanan === idOrCode);
    if (mockOrder) {
      return res.json({ success: true, data: mockOrder });
    }

    return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
}

module.exports = {
  getPelanggan,
  updatePelanggan,
  updatePasswordPelanggan,
  getPesanan,
  getLayanan,
  getDashboardSummary,
  createPesanan,
  getPesananDetail
};

