/**
 * Konfigurasi Koneksi Database MySQL menggunakan mysql2/promise
 * Mendukung connection pool dan async/await
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Membuat Pool Koneksi Database MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bersihinlaundry',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true
});

/**
 * Fungsi untuk menguji apakah koneksi ke MySQL berhasil
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Berhasil terhubung ke database MySQL (' + (process.env.DB_NAME || 'bersihinlaundry') + ')');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Gagal terhubung ke database MySQL:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};

