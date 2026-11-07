# Backend Terpadu - BersihIn Laundry

Folder ini merupakan backend tunggal terpadu (*single consolidated backend*) untuk seluruh sistem informasi laundry, mencakup seluruh peran pengguna: **Pemilik**, **Pegawai**, dan **Pelanggan**.

---

## 📁 Struktur Direktori

```text
backend/
├── config/
│   ├── database.js          # Pool koneksi MySQL (mysql2/promise)
│   └── dataStore.js         # In-memory mock store cadangan untuk demo instan
├── controllers/
│   ├── authController.js    # Autentikasi multi-peran (login, logout, session, password)
│   ├── pegawaiController.js # Fitur operasional kasir/pegawai
│   ├── pelangganController.js # Fitur profil, riwayat, dan pesanan pelanggan
│   └── pemilikController.js # Fitur analitik, kelola pegawai & layanan pemilik
├── middleware/
│   └── authMiddleware.js    # JWT verification, Role authorization, Session check
├── routes/
│   ├── authRoutes.js        # Rute /api/auth/*
│   ├── pegawaiRoutes.js     # Rute /api/pegawai/*
│   ├── pelangganRoutes.js   # Rute /api/pelanggan/*
│   ├── pemilikRoutes.js     # Rute /api/pemilik/*
│   └── index.js             # Rute induk /api/*
├── .env                     # Konfigurasi database & environment aktif
├── .env.example             # Contoh template konfigurasi
├── package.json             # Dependensi Express, mysql2, bcryptjs, jsonwebtoken, cors
└── server.js                # Entry point server Express tunggal
```

---

## 🚀 Cara Menjalankan Server

### 1. Instalasi Dependensi
Buka terminal pada folder `backend/` lalu jalankan:
```bash
cd backend
npm install
```

### 2. Konfigurasi Database (.env)
Buka file `.env` dan sesuaikan kredensial MySQL phpMyAdmin Anda:
```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bersihinlaundry
JWT_SECRET=bersihin_laundry_jwt_secret_key_2024_secure
SESSION_SECRET=bersihin_laundry_session_secret_key_2024
```

### 3. Jalankan Server
```bash
npm start
# atau mode auto-reload:
npm run dev
```

Server akan aktif pada: `http://localhost:5000`
Akses login langsung di browser: `http://localhost:5000/login.html`

---

## 📡 Daftar Endpoint API

### Autentikasi (`/api/auth`)
- `POST /api/auth/login`: Login terpadu (Pemilik, Pegawai, Pelanggan)
- `POST /api/auth/logout`: Menghapus sesi / token
- `GET /api/auth/me`: Mengambil data pengguna aktif (butuh token)
- `PUT /api/auth/password`: Mengubah kata sandi pengguna

### Pegawai (`/api/pegawai`)
- `GET /api/pegawai/dashboard`: Statistik dashboard kasir
- `GET/PUT /api/pegawai/profil`: Profil pegawai
- `GET/POST/PUT /api/pegawai/pelanggan`: Kelola pelanggan
- `GET/POST/PATCH /api/pegawai/pesanan`: Kelola pesanan & status
- `GET/POST/PATCH /api/pegawai/transaksi`: Kelola pembayaran

### Pemilik (`/api/pemilik`)
- `GET /api/pemilik/dashboard`: Statistik omzet, pesanan, dan grafik
- `GET/POST/PUT/PATCH /api/pemilik/pegawai`: Kelola akun pegawai
- `GET/POST/PUT/PATCH /api/pemilik/layanan`: Kelola tarif & layanan
- `GET /api/pemilik/laporan/pendapatan`: Laporan keuangan & omzet

### Pelanggan (`/api/pelanggan`)
- `GET/PUT /api/pelanggan/profil`: Profil pelanggan
- `GET /api/pelanggan/pesanan`: Riwayat pesanan pelanggan
- `GET /api/pelanggan/layanan`: Katalog layanan laundry
- `GET /api/pelanggan/dashboard-summary`: Ringkasan status pesanan aktif

---

## 🛡️ Catatan Keandalan (High Availability)
Jika database MySQL belum dinyalakan atau belum diimpor, server secara otomatis beralih ke `config/dataStore.js` (in-memory mock store) sehingga aplikasi tetap dapat didemokan tanpa error koneksi database.

