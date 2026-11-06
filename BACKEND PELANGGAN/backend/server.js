
/**
 * Server Utama Backend Node.js + Express.js
 * Project: BersihIn Laundry
 * Modul: Pelanggan
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '.env')
});

// Koneksi database
const { testConnection } = require('./config/db');

// Import router
const authRoutes = require('./routes/authRoutes');
const pelangganRoutes = require('./routes/pelangganRoutes');

// Inisialisasi Express
const app = express();
const PORT = process.env.PORT || 5000;

// ======================================
// 1. MIDDLEWARE
// ======================================

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================
// 2. SESSION
// ======================================

app.use(session({
  name: 'bersihin.sid',
  secret: process.env.SESSION_SECRET || 'bersihinlaundry_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// ======================================
// 3. FILE STATIS FRONTEND
// ======================================

app.use(express.static(path.join(__dirname, '..')));

// ======================================
// 4. CEK STATUS SERVER
// ======================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API BersihIn Laundry berhasil berjalan.',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      login: 'POST /api/auth/login',
      logout: 'POST /api/auth/logout',
      session: 'GET /api/auth/session',
      profil: 'GET /api/pelanggan/profil',
      updateProfil: 'PUT /api/pelanggan/profil'
    }
  });
});

// ======================================
// 5. REGISTRASI ROUTER API
// ======================================

app.use('/api/auth', authRoutes);
app.use('/api/pelanggan', pelangganRoutes);

// ======================================
// 6. ROUTE TIDAK DITEMUKAN
// ======================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rute ${req.method} ${req.originalUrl} tidak ditemukan.`,
    data: null
  });
});

// ======================================
// 7. ERROR HANDLER
// ======================================

app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server.',
    error: process.env.NODE_ENV === 'development'
      ? err.message
      : undefined
  });
});

// ======================================
// 8. MENJALANKAN SERVER
// ======================================

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log('==========================================');
    console.log('Backend BersihIn Laundry aktif!');
    console.log(`URL: http://localhost:${PORT}`);
    console.log('Modul: Pelanggan');
    console.log('==========================================');

    try {
      await testConnection();
    } catch (error) {
      console.error('Koneksi database gagal:', error.message);
    }
  });
}

module.exports = app;
