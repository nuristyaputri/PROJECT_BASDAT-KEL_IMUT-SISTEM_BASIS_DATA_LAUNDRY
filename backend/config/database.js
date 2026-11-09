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
 * Uji konektivitas database MySQL
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log(`Database MySQL berhasil terhubung: ${process.env.DB_NAME || 'bersihinlaundry'}`);
    conn.release();
    return true;
  } catch (error) {
    console.warn(`Peringatan: Tidak dapat terhubung ke MySQL (${error.message}). Sistem berjalan dengan data cadangan.`);
    return false;
  }
}

pool.testConnection = testConnection;
module.exports = pool;

