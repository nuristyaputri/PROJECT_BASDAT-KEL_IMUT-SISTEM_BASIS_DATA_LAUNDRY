/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: database/migrate.js
 * Deskripsi: CLI Migration & Seeder Runner untuk Terminal.
 *            Cukup jalankan satu perintah: `node database/migrate.js`
 *            atau `npm run migrate` untuk otomatis membuat database, 9 tabel,
 *            serta seluruh data seeder demo.
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

// 1. Muat Environment dari backend/.env jika ada
const envPath = path.join(__dirname, '..', 'backend', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

// 2. Import mysql2/promise dari modul lokal atau backend
let mysql;
try {
  mysql = require('mysql2/promise');
} catch (e1) {
  try {
    mysql = require(path.join(__dirname, '..', 'backend', 'node_modules', 'mysql2', 'promise'));
  } catch (e2) {
    console.error('\n[ERROR] Library mysql2 tidak ditemukan.');
    console.error('Silakan jalankan instalasi dependensi terlebih dahulu:');
    console.error('   cd backend && npm install\n');
    process.exit(1);
  }
}

// 3. Konfigurasi Koneksi MySQL
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
const DB_NAME = process.env.DB_NAME || 'bersihinlaundry';

const SQL_FILE_PATH = path.join(__dirname, 'database_laundry.sql');

async function runMigration() {
  console.log('\n========================================================================');
  console.log('   MIGRASI & SEEDER BASIS DATA TERMINAL: BERSIHIN LAUNDRY');
  console.log('========================================================================');
  console.log(`[*] Target Host     : ${DB_HOST}:${DB_PORT}`);
  console.log(`[*] Target User     : ${DB_USER}`);
  console.log(`[*] Target Database : ${DB_NAME}`);
  console.log(`[*] Berkas Master   : ${path.basename(SQL_FILE_PATH)}`);
  console.log('------------------------------------------------------------------------');

  // Pastikan berkas SQL master ada
  if (!fs.existsSync(SQL_FILE_PATH)) {
    console.error(`\n[ERROR] Berkas SQL tidak ditemukan di: ${SQL_FILE_PATH}`);
    process.exit(1);
  }

  let connectionRoot = null;
  let connectionDb = null;

  try {
    console.log('[1/4] Menghubungkan ke MySQL Server...');
    connectionRoot = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true
    });
    console.log('      [OK] Terhubung ke MySQL Server.');

    // 1. Buat Database jika belum ada
    console.log(`[2/4] Membuat / Memverifikasi Database \`${DB_NAME}\`...`);
    await connectionRoot.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`      [OK] Database \`${DB_NAME}\` siap digunakan.`);
    await connectionRoot.end();
    connectionRoot = null;

    // 2. Hubungkan ke Database spesifik
    console.log(`[3/4] Menghubungkan ke Database \`${DB_NAME}\`...`);
    connectionDb = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true
    });
    console.log(`      [OK] Koneksi ke \`${DB_NAME}\` aktif.`);

    // 3. Eksekusi Script Migrasi & Seeder
    console.log('[4/4] Mengeksekusi DDL Tabel & DML Seeder Data...');
    const rawSql = fs.readFileSync(SQL_FILE_PATH, 'utf-8');

    // Matikan Foreign Key Checks saat proses migrasi massal
    await connectionDb.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connectionDb.query(rawSql);
    await connectionDb.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('      [OK] 9 Tabel relasional dan seluruh data seeder berhasil dipasang!\n');

    // 4. Verifikasi dan Tampilkan Ringkasan Data
    console.log('========================================================================');
    console.log('   RINGKASAN TABEL & JUMLAH DATA SEEDER DI DATABASE');
    console.log('========================================================================');
    console.log(
      '| No | Nama Tabel           | Status   | Total Baris | Deskripsi Singkat               |'
    );
    console.log(
      '|----+----------------------+----------+-------------+---------------------------------|'
    );

    const tables = [
      { name: 'users', desc: 'Akun login seluruh aktor' },
      { name: 'pemilik', desc: 'Profil pemilik usaha' },
      { name: 'pegawai', desc: 'Staf kasir dan operator' },
      { name: 'pelanggan', desc: 'Data kontak pelanggan' },
      { name: 'layanan', desc: 'Katalog paket & tarif' },
      { name: 'pesanan', desc: 'Data transaksi pesanan' },
      { name: 'detail_pesanan', desc: 'Rincian item pakaian' },
      { name: 'riwayat_status', desc: 'Log tahapan cucian' },
      { name: 'pembayaran', desc: 'Catatan bayar transaksi' }
    ];

    let totalAllRows = 0;
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      let count = 0;
      try {
        const [rows] = await connectionDb.query(`SELECT COUNT(*) AS total FROM \`${t.name}\``);
        count = rows[0].total;
        totalAllRows += count;
      } catch (_) {
        count = 0;
      }

      const numStr = String(i + 1).padEnd(2);
      const nameStr = t.name.padEnd(20);
      const countStr = (count + ' baris').padEnd(11);
      const descStr = t.desc.padEnd(31);

      console.log(`| ${numStr} | ${nameStr} | OK       | ${countStr} | ${descStr} |`);
    }

    console.log(
      '|----+----------------------+----------+-------------+---------------------------------|'
    );
    console.log(`  Total Keseluruhan Data : ${totalAllRows} baris tersimpan.\n`);

    // 5. Informasi Akun Login Demo
    console.log('========================================================================');
    console.log('   AKUN LOGIN SIAP PAKAI (Password: password123)');
    console.log('========================================================================');
    console.log('1. PEMILIK   : rangga@bersihin.id         (Username: pemilik)');
    console.log('2. PEGAWAI   : dina.nurhaliza@bersihin.id (Username: dina.staff)');
    console.log('3. PEGAWAI   : budi.operator@bersihin.id  (Username: budi.operator)');
    console.log('4. PELANGGAN : andi.pratama@email.com     (Username: andipratama)');
    console.log('5. PELANGGAN : rina.marlina@example.com   (Username: rinamarlina)');
    console.log('========================================================================\n');
    console.log('[SUKSES] Migrasi dan seeder database berhasil 100% tanpa kendala!\n');

  } catch (error) {
    console.error('\n------------------------------------------------------------------------');
    console.error('[GAGAL] Terjadi kesalahan saat migrasi basis data:');
    console.error(`Pesan Error: ${error.message}`);
    console.error('------------------------------------------------------------------------');

    if (error.code === 'ECONNREFUSED' || error.code === 'EACCES' || error.code === 'ETIMEDOUT') {
      console.error('\nPetunjuk Perbaikan:');
      console.error('1. Pastikan modul MySQL di XAMPP / Laragon sudah dalam status [Start].');
      console.error(`2. Pastikan port ${DB_PORT} aktif dan MySQL sedang berjalan.`);
      console.error('3. Periksa kredensial user & password di file backend/.env.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nPetunjuk Perbaikan:');
      console.error(`User '${DB_USER}' ditolak oleh MySQL. Periksa password di file backend/.env.`);
    }
    console.error('');
    process.exit(1);
  } finally {
    if (connectionRoot) await connectionRoot.end().catch(() => {});
    if (connectionDb) await connectionDb.end().catch(() => {});
  }
}

runMigration();
