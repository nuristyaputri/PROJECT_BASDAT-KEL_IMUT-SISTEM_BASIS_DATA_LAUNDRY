// Membuat token PEMILIK untuk testing lokal (sebelum modul /auth/login anggota 1 jadi)
// Pakai: npm run token   (id_user harus ada di tabel users dengan role PEMILIK)
require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { id_user: 1, username: 'OWN001', role: 'PEMILIK' },
  process.env.JWT_SECRET,
  { expiresIn: '1d' }
);
console.log('\nGunakan di header:\nAuthorization: Bearer ' + token + '\n');
