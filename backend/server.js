/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/server.js
 * Deskripsi: Server Express terpadu untuk seluruh aktor (Pemilik, Pegawai, Pelanggan).
 * =============================================================================
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { testConnection } = require('./config/database');
const apiRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 5000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'bersihin_laundry_session_secret_key_2024';

// 1. Middleware Global
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set true jika di production dengan HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 jam
  }
}));

// 2. Logging Request Sederhana
app.use((req, res, next) => {
  const now = new Date().toISOString().slice(11, 19);
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

// 3. Static Files (Melayani folder proyek root untuk kemudahan demo)
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir));

// 4. API Routes
app.use('/api', apiRoutes);

// Alias kompatibilitas jika frontend memanggil rute langsung tanpa prefix /api
app.use('/auth', require('./routes/authRoutes'));

// 5. Default Route & Pengalihan Login Terpadu
app.get([
  '/login',
  '/logout',
  '/PEGAWAI/login.html',
  '/PELANGGAN/login.html',
  '/PEMILIK/login.html',
  '*/login.html'
], (req, res) => {
  res.redirect('/login.html');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'login.html'));
});

// 6. 404 Handler untuk API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint API ${req.originalUrl} tidak ditemukan.`
  });
});

// 7. Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack || err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server.',
    data: null
  });
});

// 8. Start Server & Test DB
const server = app.listen(PORT, async () => {
  console.log('========================================================');
  console.log(`🚀 Server Backend BersihIn Laundry berjalan di:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Portal Login Terpadu: http://localhost:${PORT}/login.html`);
  console.log(`   API Health Check:     http://localhost:${PORT}/api/health`);
  console.log('========================================================');
  await testConnection();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[PERINGATAN] Port ${PORT} sedang digunakan oleh proses lain atau server sudah berjalan di tab lain.`);
    console.error(`Gunakan perintah ini di PowerShell untuk mematikan proses lama:`);
    console.error(`   Stop-Process -Name node -Force\n`);
  } else {
    console.error('Server error:', err.message);
  }
});

module.exports = app;

