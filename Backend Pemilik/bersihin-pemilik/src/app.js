require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { fail } = require('./utils/response');

const app = express();
app.use(cors());
app.use(express.json());

// Di project gabungan tim, route lain (auth, pegawai, pelanggan) di-mount di sini juga
app.use('/api/pemilik', require('./routes/pemilikRoutes'));

app.use((req, res) => fail(res, 404, 'Endpoint tidak ditemukan'));

// JSON body rusak -> 400
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return fail(res, 400, 'Format JSON tidak valid');
  console.error(err);
  fail(res, 500, 'Terjadi kesalahan pada server');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}/api`));
