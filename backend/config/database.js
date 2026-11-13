/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/config/database.js
 * Deskripsi: Pool koneksi database MySQL menggunakan mysql2/promise.
 * =============================================================================
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bersihinlaundry',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  decimalNumbers: true,
  namedPlaceholders: true
});

/**
 * Pastikan kolom-kolom terbaru tersedia pada database XAMPP MySQL pengguna
 * serta perbaiki otomatis pelanggan yang id_user-nya masih NULL (seperti Maya Anggraini)
 * tanpa merusak tabel atau data yang sudah ada di phpMyAdmin.
 */
let schemaChecked = false;
async function ensureSchema() {
  if (schemaChecked) return;
  schemaChecked = true;
  try {
    await pool.query("ALTER TABLE `users` ADD COLUMN `no_telp` VARCHAR(20) DEFAULT NULL AFTER `email`").catch(() => {});
    await pool.query("ALTER TABLE `pesanan` ADD COLUMN `bukti_bayar` LONGTEXT DEFAULT NULL AFTER `catatan`").catch(() => {});
    await pool.query("ALTER TABLE `pembayaran` ADD COLUMN `bukti_bayar` LONGTEXT DEFAULT NULL AFTER `referensi_bayar`").catch(() => {});

    // Otomatis buat akun users & isi id_user untuk setiap pelanggan di tabel pelanggan yang id_user-nya masih NULL
    const DEFAULT_HASH = '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'; // password123
    const [unlinkedCustomers] = await pool.query(
      "SELECT id_pelanggan, nama, telepon, email FROM pelanggan WHERE id_user IS NULL"
    ).catch(() => [[]]);

    if (Array.isArray(unlinkedCustomers) && unlinkedCustomers.length > 0) {
      for (const cust of unlinkedCustomers) {
        try {
          const cleanEmail = cust.email ? String(cust.email).trim().toLowerCase() : null;
          const cleanPhone = cust.telepon ? String(cust.telepon).trim() : null;
          const baseUsername = String(cust.nama || (cleanEmail ? cleanEmail.split('@')[0] : 'pelanggan'))
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '') || `pelanggan${cust.id_pelanggan}`;

          // Cek apakah sudah ada baris di tabel users dengan email, no_telp, atau username tersebut
          const [existingUsers] = await pool.execute(
            "SELECT id_user FROM users WHERE (email IS NOT NULL AND email = ?) OR (no_telp IS NOT NULL AND no_telp = ?) OR username = ? LIMIT 1",
            [cleanEmail || '', cleanPhone || '', baseUsername]
          );

          let targetUserId = existingUsers && existingUsers.length > 0 ? existingUsers[0].id_user : null;

          if (!targetUserId) {
            let finalUsername = baseUsername;
            const [uCheck] = await pool.execute("SELECT id_user FROM users WHERE username = ? LIMIT 1", [finalUsername]);
            if (uCheck && uCheck.length > 0) {
              finalUsername = `${baseUsername}${cust.id_pelanggan}`;
            }

            const [insUser] = await pool.execute(
              "INSERT INTO users (username, email, no_telp, password, role, status) VALUES (?, ?, ?, ?, 'PELANGGAN', 'AKTIF')",
              [finalUsername, cleanEmail, cleanPhone, DEFAULT_HASH]
            );
            targetUserId = insUser.insertId;
          }

          if (targetUserId) {
            await pool.execute(
              "UPDATE pelanggan SET id_user = ? WHERE id_pelanggan = ?",
              [targetUserId, cust.id_pelanggan]
            );
            console.log(`[AUTO-SYNC MySQL] Pelanggan '${cust.nama}' (id_pelanggan=${cust.id_pelanggan}) berhasil dihubungkan ke id_user=${targetUserId}`);
          }
        } catch (syncErr) {
          console.warn(`Gagal sinkronisasi id_user untuk pelanggan ID ${cust.id_pelanggan}:`, syncErr.message);
        }
      }
    }

    // Pastikan tidak ada nilai NULL pada seluruh kolom di 9 tabel database MySQL XAMPP
    const cleanNullQueries = [
      "UPDATE `users` SET `email` = CONCAT(username, '@bersihin.id') WHERE `email` IS NULL OR `email` = ''",
      "UPDATE `users` SET `no_telp` = '081200000000' WHERE `no_telp` IS NULL OR `no_telp` = ''",
      "UPDATE `pemilik` SET `alamat` = 'Jl. Margonda Raya No. 10, Depok, Jawa Barat' WHERE `alamat` IS NULL OR `alamat` = ''",
      "UPDATE `pegawai` SET `alamat` = 'Jl. Margonda Raya, Depok' WHERE `alamat` IS NULL OR `alamat` = ''",
      "UPDATE `pelanggan` SET `email` = CONCAT(LOWER(REPLACE(nama, ' ', '')), '@example.com') WHERE `email` IS NULL OR `email` = ''",
      "UPDATE `pelanggan` SET `alamat` = 'Depok, Jawa Barat' WHERE `alamat` IS NULL OR `alamat` = ''",
      "UPDATE `layanan` SET `estimasi_waktu` = '2 Hari' WHERE `estimasi_waktu` IS NULL OR `estimasi_waktu` = ''",
      "UPDATE `layanan` SET `deskripsi` = nama_layanan WHERE `deskripsi` IS NULL OR `deskripsi` = ''",
      "UPDATE `pesanan` SET `id_pegawai` = 1 WHERE `id_pegawai` IS NULL",
      "UPDATE `pesanan` SET `tanggal_selesai` = DATE_ADD(`tanggal_pesanan`, INTERVAL 2 DAY) WHERE `tanggal_selesai` IS NULL",
      "UPDATE `pesanan` SET `total_berat` = 1.00 WHERE `total_berat` IS NULL",
      "UPDATE `pesanan` SET `catatan` = '-' WHERE `catatan` IS NULL OR `catatan` = ''",
      "UPDATE `pesanan` SET `bukti_bayar` = COALESCE((SELECT `referensi_bayar` FROM `pembayaran` WHERE `pembayaran`.`id_pesanan` = `pesanan`.`id_pesanan` LIMIT 1), '-') WHERE `bukti_bayar` IS NULL OR `bukti_bayar` = ''",
      "UPDATE `riwayat_status` SET `id_pegawai` = 1 WHERE `id_pegawai` IS NULL",
      "UPDATE `riwayat_status` SET `catatan` = CONCAT('Status: ', `status`) WHERE `catatan` IS NULL OR `catatan` = ''",
      "UPDATE `pembayaran` SET `referensi_bayar` = CONCAT(`metode`, '-', `id_pesanan`) WHERE `referensi_bayar` IS NULL OR `referensi_bayar` = ''",
      "UPDATE `pembayaran` SET `bukti_bayar` = COALESCE(`referensi_bayar`, '-') WHERE `bukti_bayar` IS NULL OR `bukti_bayar` = ''"
    ];
    for (const q of cleanNullQueries) {
      await pool.query(q).catch(() => {});
    }
  } catch (_) {}
}

/**
 * Reset penuh database MySQL XAMPP sesuai seeder database_laundry.sql tanpa nilai NULL
 */
async function resetDatabaseToSeeder() {
  const fs = require('fs');
  const sqlPath = path.join(__dirname, '..', '..', 'database', 'database_laundry.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  const statements = sqlContent
    .replace(/--.*$/gm, '')
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !/^CREATE\s+DATABASE/i.test(s) && !/^USE\s+/i.test(s));

  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    schemaChecked = false;
    await ensureSchema();
    return true;
  } finally {
    conn.release();
  }
}

/**
 * Uji konektivitas database MySQL
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log(`Database MySQL berhasil terhubung: ${process.env.DB_NAME || 'bersihinlaundry'}`);
    conn.release();
    await ensureSchema();
    return true;
  } catch (error) {
    console.warn(`Peringatan: Tidak dapat terhubung ke MySQL (${error.message}). Sistem berjalan dengan data cadangan.`);
    return false;
  }
}

pool.testConnection = testConnection;
pool.ensureSchema = ensureSchema;
pool.resetDatabaseToSeeder = resetDatabaseToSeeder;
module.exports = pool;

