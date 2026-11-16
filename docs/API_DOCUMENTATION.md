# DOKUMENTASI API BACKEND - BERSIHIN LAUNDRY / CLOUDLAUNDRY

Dokumen ini menyajikan spesifikasi teknis lengkap seluruh antarmuka pemrograman aplikasi (*Application Programming Interface* / API) backend untuk sistem **BersihIn Laundry / CloudLaundry**. Seluruh endpoint dianalisis dan didokumentasikan berdasarkan implementasi aktual pada direktori `backend/`.

---

## 1. Arsitektur & Konfigurasi Umum Backend

### 1.1 Informasi Server & Base URL
* **Lingkungan Runtime**: Node.js (v18+)
* **Framework Web**: Express.js (v4.19+)
* **Protokol**: HTTP / HTTPS
* **Default Port**: `5000` (dapat dikonfigurasi melalui variabel lingkungan `PORT`)
* **Base URL**: `http://localhost:5000`
* **Prefix API Utama**: `/api`
* **Alias Rute Kompatibilitas**: `/auth` dialiaskan ke `/api/auth` untuk mendukung pemanggilan langsung dari frontend.

### 1.2 Identifikasi Routing Aktif vs Tidak Aktif
Berdasarkan audit arsitektur kode sumber:
* **Rute Aktif (Digunakan Server)**: Seluruh berkas di dalam folder `backend/routes/` (`index.js`, `authRoutes.js`, `pegawaiRoutes.js`, `pelangganRoutes.js`, `pemilikRoutes.js`). Berkas `backend/server.js` secara eksplisit memasang rute ini melalui baris `app.use('/api', apiRoutes)` dan `app.use('/auth', require('./routes/authRoutes'))`.
* **Rute Tidak Aktif / Legacy / Standalone**: Berkas di dalam folder `routes/` pada root proyek (`routes/auth.js`, `routes/auth.php`, `routes/index.js`, `routes/pegawai.js`, `routes/pelanggan.js`, `routes/pemilik.js`). Berkas-berkas ini merupakan versi pengujian awal atau router mandiri PHP native dan **TIDAK** dimuat oleh `backend/server.js`. Oleh karena itu, berkas di root `routes/` dikategorikan sebagai **TIDAK DIGUNAKAN OLEH SERVER UTAMA**.

### 1.3 Format Standar Respons API
Seluruh respons API mengembalikan format JSON konsisten:
```json
{
  "success": true,
  "message": "Deskripsi pesan status operasi",
  "data": {}
}
```
* `success` (*boolean*): Menandakan keberhasilan operasi (`true` untuk sukses 2xx, `false` untuk kegagalan 4xx/5xx).
* `message` (*string*): Penjelasan status operasi dalam bahasa Indonesia yang dapat langsung ditampilkan ke antarmuka pengguna.
* `data` (*object* | *array* | *null*): Muatan data hasil pemrosesan. Jika terjadi kegagalan, bernilai `null`.

### 1.4 Mekanisme Autentikasi & Otorisasi
1. **JSON Web Token (JWT)**:
   * Dihasilkan saat pengguna berhasil login melalui endpoint `POST /api/auth/login`.
   * Algoritma: `HS256`.
   * Rahasia Kunci: Diambil dari `process.env.JWT_SECRET` (dengan nilai cadangan aman terkonfigurasi).
   * Masa Berlaku: 24 jam (`expiresIn: '24h'`).
   * Payload Token:
     ```json
     {
       "id_user": 1,
       "username": "pemilik",
       "role": "PEMILIK",
       "email": "rangga@bersihin.id",
       "nama": "Rangga Saputra",
       "id_pelanggan": null
     }
     ```
   * Header Permintaan: Klien wajib menyertakan token pada header:
     ```http
     Authorization: Bearer <token_jwt>
     ```
2. **Session & Cookie**:
   * Server Express mengaktifkan `express-session` dengan nama cookie sesi `bersihin.sid`.
   * Pada saat login berhasil, data pengguna dan token juga dicadangkan ke `req.session.user` dan `req.session.token`.
3. **Middleware Otorisasi Role-Based Access Control (RBAC)**:
   * `verifyToken`: Memvalidasi keberadaan dan keabsahan token JWT dari header `Authorization` atau sesi aktif.
   * `authorizeRole(...allowedRoles)`: Membatasi hak akses rute hanya untuk peran tertentu (`PEMILIK`, `PEGAWAI`, atau `PELANGGAN`).
   * `requireCustomerAuth`: Middleware adaptif khusus aktor pelanggan yang mendukung token JWT header, sesi server, parameter identitas fallback, maupun mode demonstrasi.

---

## 2. API Health Check

### GET /api/health
* **Nama Endpoint**: Pemeriksaan Status Backend API
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/health`
* **Deskripsi**: Memeriksa ketersediaan dan status server backend secara realtime.
* **Role Akses**: Publik (Semua role tanpa autentikasi)
* **Status Autentikasi**: Publik (Tidak memerlukan token)
* **Middleware**: Tidak ada
* **Request Headers**: Tidak diperlukan
* **Path Parameters**: Tidak ada
* **Query Parameters**: Tidak ada
* **Request Body**: Tidak ada
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Backend API Bersihin Laundry aktif dan berjalan normal.",
  "timestamp": "2026-11-16T14:30:00.000Z"
}
```

---

## 3. Modul 1: Authentication API

Rute ini dipasang pada prefix `/api/auth` (dan alias `/auth`).

### 3.1 POST /api/auth/login
* **Nama Endpoint**: Autentikasi Akun Terpadu (Unified Login)
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/auth/login`
* **Deskripsi**: Mengautentikasi pengguna untuk ketiga aktor (Pelanggan, Pegawai, atau Pemilik) menggunakan username, email, atau nomor telepon, kemudian mengembalikan JWT token dan URL pengalihan dashboard yang sesuai.
* **Role Akses**: Publik
* **Status Autentikasi**: Publik
* **Middleware**: Tidak ada
* **Request Headers**: `Content-Type: application/json`
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `identifier` | String | Ya* | Username, alamat email, atau nomor telepon terdaftar (*bisa digantikan `username`, `email`, atau `telepon`). |
  | `password` | String | Ya | Kata sandi akun pengguna. |
  | `role` | String | Tidak | Filter opsional peran pengguna (`PELANGGAN`, `PEGAWAI`, `PEMILIK`). |
* **Contoh Request Body**:
```json
{
  "identifier": "pemilik",
  "password": "password123"
}
```
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Login berhasil. Selamat datang, Rangga Saputra!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id_user": 1,
      "username": "pemilik",
      "email": "rangga@bersihin.id",
      "nama": "Rangga Saputra",
      "role": "PEMILIK",
      "telepon": "081211223344",
      "alamat": "Jl. Margonda Raya No. 10, Depok, Jawa Barat",
      "id_pelanggan": null
    },
    "redirect": "PEMILIK/dashboard.html",
    "authSource": "database"
  }
}
```
* **Contoh Response Error (400 Bad Request)**:
```json
{
  "success": false,
  "message": "Username/email/telepon dan password wajib diisi.",
  "data": null
}
```
* **Contoh Response Error (401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Kata sandi yang Anda masukkan salah.",
  "data": null
}
```
* **Contoh Response Error (404 Not Found)**:
```json
{
  "success": false,
  "message": "Akun dengan identitas \"user_salah\" tidak ditemukan.",
  "data": null
}
```

---

### 3.2 POST /api/auth/register
* **Nama Endpoint**: Pendaftaran Akun Pelanggan Baru
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/auth/register`
* **Deskripsi**: Mendaftarkan akun pelanggan baru ke tabel `users` dan membuat data profil relasional pada tabel `pelanggan`.
* **Role Akses**: Publik
* **Status Autentikasi**: Publik
* **Middleware**: Tidak ada
* **Request Headers**: `Content-Type: application/json`
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `nama` | String | Ya | Nama lengkap pelanggan (minimal 2 karakter). |
  | `email` | String | Ya | Alamat email unik pelanggan. |
  | `password` | String | Ya | Kata sandi minimal 6 karakter. |
  | `telepon` | String | Tidak | Nomor telepon/WhatsApp aktif pelanggan. |
* **Contoh Request Body**:
```json
{
  "nama": "Siti Aminah",
  "email": "siti.aminah@example.com",
  "password": "password123",
  "telepon": "081234567899"
}
```
* **Contoh Response Sukses (201 Created)**:
```json
{
  "success": true,
  "message": "Pendaftaran akun pelanggan baru berhasil.",
  "data": {
    "id_user": 8,
    "id_pelanggan": 5,
    "username": "sitiaminah",
    "email": "siti.aminah@example.com",
    "nama": "Siti Aminah",
    "role": "PELANGGAN",
    "created_at": "2026-11-16T14:35:00.000Z",
    "redirect": "PELANGGAN/dashboard.html"
  }
}
```
* **Contoh Response Error (409 Conflict)**:
```json
{
  "success": false,
  "message": "Email ini sudah terdaftar dalam sistem.",
  "data": null
}
```

---

### 3.3 POST /api/auth/reset-password
* **Nama Endpoint**: Reset Kata Sandi Pengguna
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/auth/reset-password`
* **Deskripsi**: Mengatur ulang kata sandi pengguna berdasarkan email terdaftar menggunakan hash bcrypt baru.
* **Role Akses**: Publik
* **Status Autentikasi**: Publik
* **Middleware**: Tidak ada
* **Request Headers**: `Content-Type: application/json`
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `email` | String | Ya | Alamat email akun yang ingin direset. |
  | `newPassword` | String | Ya | Kata sandi baru pengguna. |
* **Contoh Request Body**:
```json
{
  "email": "andi.pratama@email.com",
  "newPassword": "passwordBaru123"
}
```
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Kata sandi berhasil diperbarui.",
  "data": null
}
```

---

### 3.4 POST /api/auth/logout
* **Nama Endpoint**: Pengakhiran Sesi Pengguna (Logout)
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/auth/logout`
* **Deskripsi**: Menghancurkan sesi server Express dan menghapus cookie sesi klien.
* **Role Akses**: Semua Peran
* **Status Autentikasi**: Publik / Terotentikasi
* **Middleware**: Tidak ada
* **Request Headers**: `Content-Type: application/json`
* **Request Body**: Tidak ada
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Logout berhasil. Sesi telah diakhiri.",
  "data": {
    "redirect": "/login.html"
  }
}
```

---

### 3.5 GET /api/auth/me
* **Nama Endpoint**: Profil Akun Pengguna Aktif
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/auth/me`
* **Deskripsi**: Mengambil profil lengkap akun yang sedang login dari gabungan tabel `users` dan tabel profil perannya (`pemilik`, `pegawai`, atau `pelanggan`).
* **Role Akses**: Semua Peran
* **Status Autentikasi**: Terotentikasi
* **Middleware**: `verifyToken`
* **Request Headers**: `Authorization: Bearer <token>`
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Data akun berhasil dimuat.",
  "data": {
    "id_user": 2,
    "username": "dina.staff",
    "email": "dina.nurhaliza@bersihin.id",
    "no_telp": "081298765432",
    "role": "PEGAWAI",
    "status": "AKTIF",
    "id_pegawai": 1,
    "kode_pegawai": "PGW-001",
    "jabatan": "Kasir Utama",
    "nama": "Dina Nurhaliza",
    "telepon": "081298765432",
    "alamat": "Jl. Sawo Manila No. 15, Pasar Minggu, Jakarta Selatan"
  }
}
```

---

### 3.6 PUT /api/auth/password
* **Nama Endpoint**: Pembaruan Kata Sandi Mandiri
* **Method**: `PUT`
* **URL**: `http://localhost:5000/api/auth/password`
* **Deskripsi**: Mengubah kata sandi pengguna aktif setelah memverifikasi kecocokan kata sandi lama.
* **Role Akses**: Semua Peran
* **Status Autentikasi**: Terotentikasi
* **Middleware**: `verifyToken`
* **Request Headers**:
  * `Authorization: Bearer <token>`
  * `Content-Type: application/json`
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `oldPassword` | String | Ya | Kata sandi lama pengguna. |
  | `newPassword` | String | Ya | Kata sandi baru minimal 6 karakter. |
* **Contoh Request Body**:
```json
{
  "oldPassword": "password123",
  "newPassword": "passwordBaru456"
}
```
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Kata sandi akun Anda berhasil diperbarui.",
  "data": null
}
```

---

## 4. Modul 2: Pegawai & Kasir API

Rute ini dipasang pada prefix `/api/pegawai` dan dilindungi middleware:
`router.use(verifyToken, authorizeRole('PEGAWAI', 'PEMILIK'))`.

### 4.1 GET /api/pegawai/dashboard
* **Nama Endpoint**: Statistik Operasional Kasir & Pegawai
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pegawai/dashboard`
* **Deskripsi**: Mengambil ringkasan data operasional harian kasir: antrean pesanan, pesanan diproses, pesanan siap diambil, serta pendapatan hari ini.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Request Headers**: `Authorization: Bearer <token>`
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Dashboard kasir & pegawai berhasil dimuat dari MySQL XAMPP",
  "data": {
    "total_pesanan_hari_ini": 5,
    "pesanan_menunggu": 1,
    "pesanan_diproses": 2,
    "pesanan_siap_diambil": 1,
    "pesanan_selesai": 1,
    "pendapatan_hari_ini": 191500,
    "total_pelanggan": 4
  }
}
```

---

### 4.2 GET /api/pegawai/profil
* **Nama Endpoint**: Detail Profil Pegawai Aktif
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pegawai/profil`
* **Deskripsi**: Menampilkan rincian data pegawai dari tabel `pegawai` dan akun `users`.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Request Headers**: `Authorization: Bearer <token>`
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Profil pegawai berhasil diambil dari MySQL XAMPP",
  "data": {
    "id_pegawai": 1,
    "kode_pegawai": "PGW-001",
    "nama": "Dina Nurhaliza",
    "telepon": "081298765432",
    "alamat": "Jl. Sawo Manila No. 15, Pasar Minggu, Jakarta Selatan",
    "jabatan": "Kasir Utama",
    "username": "dina.staff",
    "email": "dina.nurhaliza@bersihin.id"
  }
}
```

---

### 4.3 PUT /api/pegawai/profil
* **Nama Endpoint**: Perbarui Profil Pegawai
* **Method**: `PUT`
* **URL**: `http://localhost:5000/api/pegawai/profil`
* **Deskripsi**: Mengubah nama, nomor telepon, dan alamat pegawai.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `nama` | String | Tidak | Nama baru pegawai. |
  | `telepon` | String | Tidak | Nomor telepon pegawai. |
  | `alamat` | String | Tidak | Alamat tempat tinggal. |
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Profil pegawai berhasil diperbarui di MySQL XAMPP",
  "data": {
    "id_pegawai": 1,
    "nama": "Dina Nurhaliza, S.E.",
    "telepon": "081298765432",
    "alamat": "Jl. Sawo Manila No. 15, Pasar Minggu"
  }
}
```

---

### 4.4 GET /api/pegawai/pelanggan
* **Nama Endpoint**: Daftar Pelanggan (Kasir View)
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pegawai/pelanggan`
* **Deskripsi**: Mengambil seluruh daftar pelanggan terdaftar beserta total akumulasi pesanan untuk keperluan POS kasir.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Request Headers**: `Authorization: Bearer <token>`
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Daftar pelanggan berhasil diambil dari MySQL XAMPP",
  "data": [
    {
      "id_pelanggan": 1,
      "kode_pelanggan": "PLG-08129",
      "nama": "Andi Pratama",
      "telepon": "081234567821",
      "email": "andi.pratama@email.com",
      "alamat": "Jl. Kemang Raya No. 45, Jakarta Selatan",
      "member_tier": "SILVER",
      "total_pesanan": 2
    }
  ]
}
```

---

### 4.5 GET /api/pegawai/pelanggan/:id
* **Nama Endpoint**: Detail Pelanggan & Riwayat Pesanan
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pegawai/pelanggan/:id`
* **Deskripsi**: Mengambil rincian profil pelanggan tertentu beserta riwayat pesanan cucian yang pernah dilakukan.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pelanggan).
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Detail pelanggan berhasil diambil dari MySQL XAMPP",
  "data": {
    "pelanggan": {
      "id_pelanggan": 1,
      "kode_pelanggan": "PLG-08129",
      "nama": "Andi Pratama",
      "telepon": "081234567821",
      "email": "andi.pratama@email.com",
      "alamat": "Jl. Kemang Raya No. 45, Jakarta Selatan",
      "member_tier": "SILVER"
    },
    "pesanan": [
      {
        "id_pesanan": 1,
        "kode_pesanan": "TRX-240518-01",
        "total_harga": 40500,
        "status": "DICUCI",
        "tanggal_pesanan": "2024-05-18T03:15:00.000Z"
      }
    ]
  }
}
```

---

### 4.6 POST /api/pegawai/pelanggan
* **Nama Endpoint**: Tambah Pelanggan Baru via Kasir
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/pegawai/pelanggan`
* **Deskripsi**: Mendaftarkan pelanggan baru langsung di meja kasir. Otomatis membuatkan akun `users` dengan kata sandi bawaan `password123`.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `nama` | String | Ya | Nama pelanggan. |
  | `telepon` | String | Ya | Nomor telepon pelanggan. |
  | `email` | String | Tidak | Alamat email (otomatis jika dikosongkan). |
  | `alamat` | String | Tidak | Alamat penjemputan/pengantaran. |
  | `member_tier` | String | Tidak | Kategori member (`REGULER`, `SILVER`, `GOLD`). Default: `REGULER`. |
* **Contoh Request Body**:
```json
{
  "nama": "Bambang Pamungkas",
  "telepon": "081299887766",
  "alamat": "Jl. Fatmawati No. 12, Jakarta Selatan",
  "member_tier": "REGULER"
}
```
* **Contoh Response Sukses (201 Created)**:
```json
{
  "success": true,
  "message": "Pelanggan baru berhasil ditambahkan di MySQL XAMPP",
  "data": {
    "id_pelanggan": 5,
    "kode_pelanggan": "PLG-17317",
    "nama": "Bambang Pamungkas",
    "telepon": "081299887766",
    "email": "bambangpamungkas@example.com",
    "alamat": "Jl. Fatmawati No. 12, Jakarta Selatan",
    "member_tier": "REGULER"
  }
}
```

---

### 4.7 PUT /api/pegawai/pelanggan/:id
* **Nama Endpoint**: Perbarui Data Pelanggan
* **Method**: `PUT`
* **URL**: `http://localhost:5000/api/pegawai/pelanggan/:id`
* **Deskripsi**: Memperbarui informasi nama, telepon, email, alamat, atau tier member pelanggan.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pelanggan).
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Data pelanggan berhasil diperbarui di MySQL XAMPP",
  "data": {
    "id_pelanggan": 5,
    "nama": "Bambang Pamungkas",
    "member_tier": "SILVER"
  }
}
```

---

### 4.8 GET /api/pegawai/pesanan
* **Nama Endpoint**: Daftar Seluruh Pesanan Cucian (Kasir POS)
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pegawai/pesanan`
* **Deskripsi**: Mengambil seluruh antrean pesanan laundry lengkap dengan nama pelanggan, rincian status pengerjaan, dan status verifikasi pembayaran mutasi rekening.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Request Headers**: `Authorization: Bearer <token>`
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Data pesanan berhasil diambil",
  "data": [
    {
      "id_pesanan": 2,
      "kode_pesanan": "TRX-240519-02",
      "id_pelanggan": 2,
      "nama_pelanggan": "Rina Marlina",
      "telepon_pelanggan": "081111111111",
      "alamat_pelanggan": "Jl. Kukusan Raya No. 5, Beji, Depok",
      "total_berat": 3.00,
      "total_harga": 52000.00,
      "status": "DISETRIKA",
      "status_pembayaran": "BERHASIL",
      "metode_pembayaran": "TRANSFER",
      "bukti_bayar": "TRF-VERIFIED-240519-02",
      "catatan": "Termasuk 1 bedcover sedang"
    }
  ]
}
```

---

### 4.9 GET /api/pegawai/pesanan/:id
* **Nama Endpoint**: Detail Lengkap Pesanan Cucian
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pegawai/pesanan/:id`
* **Deskripsi**: Mengambil rincian invoice lengkap: data pelanggan, item layanan yang dipesan (`detail_pesanan`), riwayat status, dan transaksi pembayaran.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pesanan).
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Detail pesanan berhasil diambil",
  "data": {
    "pesanan": {
      "id_pesanan": 1,
      "kode_pesanan": "TRX-240518-01",
      "nama_pelanggan": "Andi Pratama",
      "telepon_pelanggan": "081234567821",
      "alamat_pelanggan": "Jl. Kemang Raya No. 45",
      "total_berat": 4.50,
      "total_harga": 40500.00,
      "status": "DICUCI"
    },
    "detail": [
      {
        "id_detail": 1,
        "id_layanan": 2,
        "nama_layanan": "Cuci Komplit (Cuci + Setrika)",
        "kategori": "KILOAN",
        "satuan": "kg",
        "jumlah": 4.50,
        "harga_satuan": 9000.00,
        "subtotal": 40500.00
      }
    ],
    "pembayaran": [
      {
        "id_pembayaran": 1,
        "jumlah_bayar": 40500.00,
        "metode": "QRIS",
        "status": "BERHASIL",
        "bukti_bayar": "QRIS-VERIFIED-240518-01"
      }
    ],
    "riwayat": []
  }
}
```

---

### 4.10 POST /api/pegawai/pesanan
* **Nama Endpoint**: Buat Pesanan Baru di Meja Kasir (POS)
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/pegawai/pesanan`
* **Deskripsi**: Membuat transaksi cucian baru di kasir, menghitung subtotal per item layanan, dan membuat baris pembayaran awal.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `id_pelanggan` | Integer | Ya | ID pelanggan terdaftar. |
  | `catatan` | String | Tidak | Instruksi pengerjaan cucian. |
  | `items` | Array | Ya | Daftar item layanan: `[{ id_layanan, jumlah }]`. |
  | `metode_bayar` | String | Tidak | `TUNAI`, `QRIS`, atau `TRANSFER` (default `TUNAI`). |
  | `bayar_langsung`| Boolean | Tidak | Jika `true`, pembayaran langsung berstatus `BERHASIL`. |
* **Contoh Request Body**:
```json
{
  "id_pelanggan": 1,
  "catatan": "Jangan campur pakaian putih",
  "items": [
    { "id_layanan": 2, "jumlah": 3.5 }
  ],
  "metode_bayar": "TUNAI",
  "bayar_langsung": true
}
```
* **Contoh Response Sukses (201 Created)**:
```json
{
  "success": true,
  "message": "Pesanan berhasil dibuat di MySQL XAMPP",
  "data": {
    "id_pesanan": 6,
    "kode_pesanan": "TRX-261116-006",
    "total_harga": 31500,
    "total_berat": 3.5,
    "status": "MENUNGGU"
  }
}
```

---

### 4.11 PATCH /api/pegawai/pesanan/:id/status
* **Nama Endpoint**: Perbarui Tahapan Status Cucian
* **Method**: `PATCH`
* **URL**: `http://localhost:5000/api/pegawai/pesanan/:id/status`
* **Deskripsi**: Memperbarui progres cucian (`MENUNGGU` -> `DIPROSES` -> `DICUCI` -> `DISETRIKA` -> `SIAP_DIAMBIL` -> `SELESAI` -> `DIBATALKAN`) dan otomatis mencatat ke tabel `riwayat_status`.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pesanan).
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `status` | String | Ya | Status baru pesanan. |
  | `catatan` | String | Tidak | Catatan perubahan status. |
* **Contoh Request Body**:
```json
{
  "status": "DISETRIKA",
  "catatan": "Pakaian masuk mesin setrika uap rak 2"
}
```
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Status pesanan berhasil diperbarui menjadi DISETRIKA di MySQL XAMPP",
  "data": {
    "id_pesanan": 1,
    "status": "DISETRIKA"
  }
}
```

---

### 4.12 POST /api/pegawai/pesanan/:id/konfirmasi-pembayaran
* **Nama Endpoint**: Konfirmasi Pembayaran Lunas (Kasir Verification)
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/pegawai/pesanan/:id/konfirmasi-pembayaran`
* **Deskripsi**: Kasir memverifikasi bahwa uang tunai fisik telah diterima atau mutasi QRIS/Transfer bank telah valid. Mengubah status pembayaran menjadi `BERHASIL`.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pesanan).
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `metode` | String | Tidak | `TUNAI`, `QRIS`, `TRANSFER`. |
  | `referensi_bayar` | String | Tidak | Nomor mutasi/referensi bukti pembayaran. |
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Pembayaran pesanan TRX-240520-05 berhasil dikonfirmasi LUNAS",
  "data": {
    "id_pesanan": 5,
    "status_pembayaran": "BERHASIL",
    "metode": "TUNAI"
  }
}
```

---

### 4.13 POST /api/pegawai/pesanan/:id/tolak
* **Nama Endpoint**: Tolak Bukti Pembayaran / Batalkan Pesanan
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/pegawai/pesanan/:id/tolak`
* **Deskripsi**: Menolak bukti pembayaran yang tidak valid atau membatalkan pesanan.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pesanan).
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `alasan` | String | Tidak | Alasan penolakan. |
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Pesanan berhasil ditolak/dibatalkan",
  "data": {
    "id_pesanan": 5,
    "status_pesanan": "DIBATALKAN",
    "status_pembayaran": "GAGAL"
  }
}
```

---

### 4.14 GET /api/pegawai/transaksi
* **Nama Endpoint**: Daftar Riwayat Transaksi & Pembayaran
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pegawai/transaksi`
* **Deskripsi**: Menampilkan tabel log transaksi pembayaran seluruh pesanan laundry.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Data transaksi berhasil diambil",
  "data": [
    {
      "id_pesanan": 1,
      "kode_pesanan": "TRX-240518-01",
      "nama_pelanggan": "Andi Pratama",
      "total_harga": 40500,
      "id_pembayaran": 1,
      "jumlah_bayar": 40500,
      "metode": "QRIS",
      "status_pembayaran": "BERHASIL"
    }
  ]
}
```

---

### 4.15 GET /api/pegawai/transaksi/:id
* **Nama Endpoint**: Rincian Transaksi Pembayaran Tertentu
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pegawai/transaksi/:id`
* **Deskripsi**: Mengambil riwayat detail pembayaran untuk pesanan tertentu.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pesanan).

---

### 4.16 POST /api/pegawai/transaksi/:id/pembayaran
* **Nama Endpoint**: Tambah Catatan Pembayaran Baru
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/pegawai/transaksi/:id/pembayaran`
* **Deskripsi**: Menambahkan baris pembayaran baru untuk pesanan yang belum lunas.
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pesanan).
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `jumlah_bayar` | Number | Ya | Nominal yang dibayarkan. |
  | `metode` | String | Tidak | `TUNAI`, `QRIS`, `TRANSFER` (default `TUNAI`). |
  | `referensi_bayar` | String | Tidak | Nomor referensi/mutasi. |
  | `status` | String | Tidak | `MENUNGGU` atau `BERHASIL` (default `BERHASIL`). |
* **Contoh Response Sukses (201 Created)**:
```json
{
  "success": true,
  "message": "Pembayaran berhasil dicatat",
  "data": {
    "id_pembayaran": 6,
    "jumlah_bayar": 22500,
    "metode": "TUNAI",
    "status": "BERHASIL"
  }
}
```

---

### 4.17 PATCH /api/pegawai/transaksi/:id/pembayaran/:id_pembayaran/status
* **Nama Endpoint**: Ubah Status Pembayaran Spesifik
* **Method**: `PATCH`
* **URL**: `http://localhost:5000/api/pegawai/transaksi/:id/pembayaran/:id_pembayaran/status`
* **Deskripsi**: Mengubah status pembayaran tertentu (`MENUNGGU`, `BERHASIL`, `GAGAL`).
* **Role Akses**: `PEGAWAI`, `PEMILIK`
* **Path Parameters**:
  * `id`: ID Pesanan
  * `id_pembayaran`: ID Pembayaran
* **Request Body**: `status` (`BERHASIL`, `MENUNGGU`, `GAGAL`).

---

## 5. Modul 3: Pelanggan API

Rute ini dipasang pada prefix `/api/pelanggan` dan menggunakan middleware adaptif `requireCustomerAuth`.

### 5.1 GET /api/pelanggan/profil (Alias: /api/pelanggan/profile)
* **Nama Endpoint**: Profil Akun Pelanggan
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pelanggan/profil`
* **Deskripsi**: Menampilkan data profil pelanggan: nama, telepon, email, alamat, dan tier loyalitas (`member_tier`).
* **Role Akses**: `PELANGGAN`
* **Query Parameters (Opsional)**: `?id_pelanggan=1&id_user=4`
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Data profil pelanggan berhasil diambil.",
  "data": {
    "id_pelanggan": 1,
    "id_user": 4,
    "kode_pelanggan": "PLG-08129",
    "nama": "Andi Pratama",
    "telepon": "081234567821",
    "email": "andi.pratama@email.com",
    "alamat": "Jl. Kemang Raya No. 45, Jakarta Selatan",
    "member_tier": "SILVER"
  }
}
```

---

### 5.2 PUT & POST /api/pelanggan/profil (Alias: /api/pelanggan/profile)
* **Nama Endpoint**: Perbarui Profil Pelanggan
* **Method**: `PUT` / `POST`
* **URL**: `http://localhost:5000/api/pelanggan/profil`
* **Deskripsi**: Memperbarui nama, telepon, email, atau alamat tempat tinggal pelanggan.
* **Role Akses**: `PELANGGAN`
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `nama` | String | Tidak | Nama baru pelanggan. |
  | `telepon` | String | Tidak | Nomor telepon/WhatsApp. |
  | `email` | String | Tidak | Alamat email baru. |
  | `alamat` | String | Tidak | Alamat pengantaran cucian. |
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Profil pelanggan berhasil diperbarui.",
  "data": {
    "id_pelanggan": 1,
    "nama": "Andi Pratama",
    "telepon": "081234567821",
    "alamat": "Jl. Kemang Raya No. 45, Jakarta Selatan"
  }
}
```

---

### 5.3 PUT & POST /api/pelanggan/password
* **Nama Endpoint**: Ganti Kata Sandi Pelanggan
* **Method**: `PUT` / `POST`
* **URL**: `http://localhost:5000/api/pelanggan/password`
* **Deskripsi**: Memperbarui kata sandi akun pelanggan.
* **Role Akses**: `PELANGGAN`
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `oldPassword` | String | Ya | Kata sandi saat ini. |
  | `newPassword` | String | Ya | Kata sandi baru minimal 6 karakter. |
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Kata sandi berhasil diperbarui.",
  "data": null
}
```

---

### 5.4 GET /api/pelanggan/pesanan (Alias: /api/pelanggan/orders)
* **Nama Endpoint**: Riwayat Pesanan Saya
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pelanggan/pesanan`
* **Deskripsi**: Mengambil seluruh riwayat pesanan cucian milik pelanggan yang sedang aktif.
* **Role Akses**: `PELANGGAN`
* **Query Parameters (Opsional)**:
  * `id_pelanggan`: ID Pelanggan spesifik
  * `status`: Filter status cucian
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Data riwayat pesanan berhasil diambil.",
  "data": [
    {
      "id_pesanan": 1,
      "kode_pesanan": "TRX-240518-01",
      "layanan": "Cuci Komplit (Cuci + Setrika)",
      "total_berat": 4.50,
      "total_harga": 40500,
      "status": "DICUCI",
      "status_pembayaran": "BERHASIL",
      "metode_pembayaran": "QRIS",
      "tanggal_pesanan": "2024-05-18T03:15:00.000Z"
    }
  ]
}
```

---

### 5.5 POST /api/pelanggan/pesanan (Alias: /api/pelanggan/orders)
* **Nama Endpoint**: Buat Pesanan Laundry Online (Checkout Pelanggan)
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/pelanggan/pesanan`
* **Deskripsi**: Pelanggan memesan layanan laundry secara online, memilih metode pembayaran (`TUNAI`, `QRIS`, `TRANSFER`), mengunggah bukti bayar digital (Base64 atau file), dan menyertakan catatan khusus pakaian.
* **Role Akses**: `PELANGGAN` / Publik (Didukung Fallback)
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `id_pelanggan` | Integer | Tidak | ID Pelanggan (otomatis dari auth jika ada). |
  | `items` | Array | Ya | Daftar layanan: `[{ id_layanan, jumlah }]`. |
  | `metode_pembayaran`| String | Ya | `TUNAI`, `QRIS`, atau `TRANSFER`. |
  | `catatan` | String | Tidak | Instruksi pencucian (misal: "Pewangi Lavender"). |
  | `bukti_bayar` | String | Tidak | Foto struk bukti pembayaran transfer / QRIS (URL atau Base64). |
* **Contoh Request Body**:
```json
{
  "items": [
    { "id_layanan": 2, "jumlah": 3 }
  ],
  "metode_pembayaran": "QRIS",
  "catatan": "Jangan campur pakaian putih",
  "bukti_bayar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
}
```
* **Contoh Response Sukses (201 Created)**:
```json
{
  "success": true,
  "message": "Pesanan laundry online Anda berhasil dibuat.",
  "data": {
    "id_pesanan": 7,
    "kode_pesanan": "TRX-261116-007",
    "total_harga": 27000,
    "status": "MENUNGGU",
    "metode_pembayaran": "QRIS",
    "tanggal_pesanan": "2026-11-16T14:40:00.000Z"
  }
}
```

---

### 5.6 GET /api/pelanggan/pesanan/:idOrCode (Alias: /api/pelanggan/status/:idOrCode)
* **Nama Endpoint**: Tracking Status & Pemeriksaan Invoice Pelanggan
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pelanggan/pesanan/:idOrCode`
* **Deskripsi**: Melacak tahapan cucian secara real-time berdasarkan kode pesanan (`TRX-...`) atau ID numerik. Digunakan pada halaman tracking status dan invoice pelanggan.
* **Role Akses**: Publik / Pelanggan
* **Path Parameters**: `idOrCode` (Kode Pesanan seperti `TRX-240518-01` atau ID numerik `1`).
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Data status pesanan berhasil ditemukan.",
  "data": {
    "id_pesanan": 1,
    "kode_pesanan": "TRX-240518-01",
    "nama_pelanggan": "Andi Pratama",
    "status": "DICUCI",
    "status_pembayaran": "BERHASIL",
    "metode_pembayaran": "QRIS",
    "total_harga": 40500,
    "total_berat": 4.5,
    "bukti_bayar": "QRIS-VERIFIED-240518-01",
    "items": [
      {
        "nama_layanan": "Cuci Komplit (Cuci + Setrika)",
        "jumlah": 4.5,
        "harga_satuan": 9000,
        "subtotal": 40500
      }
    ],
    "riwayat": [
      { "status": "MENUNGGU", "waktu_perubahan": "2024-05-18 10:15:00" },
      { "status": "DIPROSES", "waktu_perubahan": "2024-05-18 11:00:00" },
      { "status": "DICUCI", "waktu_perubahan": "2024-05-18 11:30:00" }
    ]
  }
}
```

---

### 5.7 GET /api/pelanggan/layanan (Alias: /api/pelanggan/services)
* **Nama Endpoint**: Katalog Layanan Laundry Aktif
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pelanggan/layanan`
* **Deskripsi**: Mengambil seluruh paket layanan laundry yang sedang aktif untuk ditampilkan pada katalog harga dan formulir pemesanan.
* **Role Akses**: Publik / Pelanggan
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Daftar layanan berhasil diambil.",
  "data": [
    {
      "id_layanan": 1,
      "nama_layanan": "Cuci Kering Lipat",
      "kategori": "KILOAN",
      "satuan": "kg",
      "harga": 7000,
      "estimasi_waktu": "2 Hari",
      "status": "AKTIF",
      "deskripsi": "Cuci bersih, kering wangi, dan dilipat rapi higienis."
    },
    {
      "id_layanan": 2,
      "nama_layanan": "Cuci Komplit (Cuci + Setrika)",
      "kategori": "KILOAN",
      "satuan": "kg",
      "harga": 9000,
      "estimasi_waktu": "2 Hari",
      "status": "AKTIF",
      "deskripsi": "Paket favorit: cuci bersih anti bakteri plus setrika uap rapi."
    }
  ]
}
```

---

### 5.8 GET /api/pelanggan/dashboard-summary
* **Nama Endpoint**: Ringkasan Dashboard Pelanggan
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pelanggan/dashboard-summary`
* **Deskripsi**: Mengambil statistik ringkas pelanggan: pesanan aktif, cucian selesai, dan tier loyalitas.
* **Role Akses**: `PELANGGAN`
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Ringkasan dashboard pelanggan berhasil diambil.",
  "data": {
    "pesanan_aktif": 1,
    "pesanan_selesai": 1,
    "total_transaksi": 2,
    "member_tier": "SILVER"
  }
}
```

---

## 6. Modul 4: Pemilik API (Owner Console)

Rute ini dipasang pada prefix `/api/pemilik` dan dilindungi middleware:
`router.use(verifyToken, authorizeRole('PEMILIK'))`.

### 6.1 GET /api/pemilik/dashboard
* **Nama Endpoint**: Ringkasan Eksekutif Pemilik (Executive Summary)
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/dashboard`
* **Deskripsi**: Menghitung omzet total, omzet bulan ini, total pesanan, pesanan diproses, pesanan selesai, total staf aktif, total pelanggan, dan 5 aktivitas transaksi terbaru.
* **Role Akses**: `PEMILIK`
* **Request Headers**: `Authorization: Bearer <token>`
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Data dashboard pemilik berhasil diambil dari MySQL XAMPP",
  "data": {
    "total_pelanggan": 4,
    "total_pegawai": 2,
    "pegawai_aktif": 2,
    "total_layanan": 6,
    "total_pesanan": 5,
    "pesanan_menunggu": 1,
    "pesanan_diproses": 2,
    "pesanan_selesai": 1,
    "pendapatan_total": 191500,
    "pendapatan_bulan_ini": 191500,
    "aktivitas_terbaru": [
      {
        "id_pesanan": 5,
        "kode_pesanan": "TRX-240520-05",
        "status": "MENUNGGU",
        "total_harga": 22500,
        "nama_pelanggan": "Maya Anggraini",
        "nama_layanan": "Cuci Komplit (Cuci + Setrika)"
      }
    ]
  }
}
```

---

### 6.2 GET /api/pemilik/profil
* **Nama Endpoint**: Profil Pemilik Laundry
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/profil`
* **Deskripsi**: Menampilkan data profil pemilik dari tabel `pemilik` dan akun `users`.
* **Role Akses**: `PEMILIK`
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Profil pemilik berhasil diambil dari MySQL XAMPP",
  "data": {
    "id_pemilik": 1,
    "kode_pemilik": "OWN-001",
    "nama": "Rangga Saputra",
    "telepon": "081211223344",
    "alamat": "Jl. Margonda Raya No. 10, Depok, Jawa Barat",
    "username": "pemilik",
    "email": "rangga@bersihin.id"
  }
}
```

---

### 6.3 PUT /api/pemilik/profil
* **Nama Endpoint**: Perbarui Profil Pemilik
* **Method**: `PUT`
* **URL**: `http://localhost:5000/api/pemilik/profil`
* **Deskripsi**: Memperbarui nama, telepon, dan alamat pemilik bisnis.
* **Role Akses**: `PEMILIK`
* **Request Body**: `nama`, `telepon`, `alamat`.

---

### 6.4 GET /api/pemilik/pegawai
* **Nama Endpoint**: Daftar Seluruh Staf Pegawai
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/pegawai`
* **Deskripsi**: Menampilkan seluruh data pegawai, posisi jabatan, kontak, dan status keaktifan akun.
* **Role Akses**: `PEMILIK`
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Daftar pegawai berhasil diambil dari MySQL XAMPP",
  "data": [
    {
      "id_pegawai": 1,
      "kode_pegawai": "PGW-001",
      "nama": "Dina Nurhaliza",
      "telepon": "081298765432",
      "alamat": "Jl. Sawo Manila No. 15, Pasar Minggu",
      "jabatan": "Kasir Utama",
      "username": "dina.staff",
      "email": "dina.nurhaliza@bersihin.id",
      "status": "AKTIF"
    }
  ]
}
```

---

### 6.5 GET /api/pemilik/pegawai/:id
* **Nama Endpoint**: Detail Data Pegawai
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/pegawai/:id`
* **Deskripsi**: Mengambil data spesifik pegawai beserta statistik cucian yang ditangani.
* **Role Akses**: `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pegawai).

---

### 6.6 POST /api/pemilik/pegawai
* **Nama Endpoint**: Tambah Pegawai Baru
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/pemilik/pegawai`
* **Deskripsi**: Pemilik menambahkan akun staf pegawai baru ke tabel `users` (role `PEGAWAI`) dan membuat baris profil di tabel `pegawai`.
* **Role Akses**: `PEMILIK`
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `nama` | String | Ya | Nama lengkap staf. |
  | `username` | String | Tidak | Username unik akun pegawai. |
  | `email` | String | Ya | Email unik staf. |
  | `password` | String | Ya | Kata sandi minimal 6 karakter. |
  | `telepon` | String | Ya | Nomor telepon aktif staf. |
  | `jabatan` | String | Tidak | Posisi/jabatan (default: `Kasir`). |
  | `alamat` | String | Tidak | Alamat tempat tinggal. |
* **Contoh Request Body**:
```json
{
  "nama": "Ahmad Fauzi",
  "username": "ahmad.operator",
  "email": "ahmad.fauzi@bersihin.id",
  "password": "password123",
  "telepon": "081299112233",
  "jabatan": "Operator Cuci Mesin"
}
```
* **Contoh Response Sukses (201 Created)**:
```json
{
  "success": true,
  "message": "Pegawai berhasil ditambahkan di MySQL XAMPP",
  "data": {
    "id_pegawai": 3,
    "kode_pegawai": "PGW-003",
    "nama": "Ahmad Fauzi",
    "username": "ahmad.operator",
    "jabatan": "Operator Cuci Mesin",
    "status": "AKTIF"
  }
}
```

---

### 6.7 PUT /api/pemilik/pegawai/:id
* **Nama Endpoint**: Perbarui Data Pegawai
* **Method**: `PUT`
* **URL**: `http://localhost:5000/api/pemilik/pegawai/:id`
* **Deskripsi**: Mengubah profil staf, jabatan, kontak, atau kata sandi oleh pemilik.
* **Role Akses**: `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pegawai).

---

### 6.8 PATCH /api/pemilik/pegawai/:id/status
* **Nama Endpoint**: Aktifkan / Nonaktifkan Akun Pegawai
* **Method**: `PATCH`
* **URL**: `http://localhost:5000/api/pemilik/pegawai/:id/status`
* **Deskripsi**: Mengubah status keaktifan staf (`AKTIF` atau `NONAKTIF`).
* **Role Akses**: `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pegawai).
* **Request Body**:
```json
{
  "status": "NONAKTIF"
}
```

---

### 6.9 GET /api/pemilik/layanan
* **Nama Endpoint**: Manajemen Master Katalog Layanan
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/layanan`
* **Deskripsi**: Mengambil seluruh daftar layanan laundry (baik aktif maupun nonaktif) untuk kebutuhan manajemen tarif pemilik.
* **Role Akses**: `PEMILIK`
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Daftar layanan berhasil diambil dari MySQL XAMPP",
  "data": [
    {
      "id_layanan": 2,
      "nama_layanan": "Cuci Komplit (Cuci + Setrika)",
      "kategori": "KILOAN",
      "satuan": "kg",
      "harga": 9000,
      "estimasi_waktu": "2 Hari",
      "status": "AKTIF",
      "deskripsi": "Paket favorit: cuci bersih anti bakteri plus setrika uap rapi."
    }
  ]
}
```

---

### 6.10 GET /api/pemilik/layanan/:id
* **Nama Endpoint**: Detail Spesifik Layanan
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/layanan/:id`
* **Deskripsi**: Mengambil rincian tarif dan deskripsi layanan berdasarkan ID.
* **Role Akses**: `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Layanan).

---

### 6.11 POST /api/pemilik/layanan
* **Nama Endpoint**: Tambah Layanan Laundry Baru
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/pemilik/layanan`
* **Deskripsi**: Menambahkan paket layanan laundry baru ke database.
* **Role Akses**: `PEMILIK`
* **Request Body**:
  | Field | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `nama_layanan` | String | Ya | Nama paket layanan laundry. |
  | `kategori` | String | Ya | `KILOAN`, `SATUAN`, `EXPRESS`, atau `SPECIAL`. |
  | `satuan` | String | Ya | `kg`, `pcs`, `meter`, `pasang`. |
  | `harga` | Number | Ya | Tarif per satuan (minimal 0). |
  | `estimasi_waktu` | String | Tidak | Perkiraan durasi (misal: "2 Hari", "4 Jam"). |
  | `deskripsi` | String | Tidak | Deskripsi keunggulan layanan. |
* **Contoh Request Body**:
```json
{
  "nama_layanan": "Cuci Karpet Tebal",
  "kategori": "SPECIAL",
  "satuan": "meter",
  "harga": 15000,
  "estimasi_waktu": "3 Hari",
  "deskripsi": "Cuci bersih karpet dengan shampo antibakteri dan pengeringan uap."
}
```
* **Contoh Response Sukses (201 Created)**:
```json
{
  "success": true,
  "message": "Layanan berhasil ditambahkan di MySQL XAMPP",
  "data": {
    "id_layanan": 7,
    "nama_layanan": "Cuci Karpet Tebal",
    "harga": 15000,
    "status": "AKTIF"
  }
}
```

---

### 6.12 PUT /api/pemilik/layanan/:id
* **Nama Endpoint**: Perbarui Tarif & Rincian Layanan
* **Method**: `PUT`
* **URL**: `http://localhost:5000/api/pemilik/layanan/:id`
* **Deskripsi**: Mengubah nama, harga, satuan, estimasi waktu, atau deskripsi layanan.
* **Role Akses**: `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Layanan).

---

### 6.13 PATCH /api/pemilik/layanan/:id/status
* **Nama Endpoint**: Ubah Status Aktif Layanan
* **Method**: `PATCH`
* **URL**: `http://localhost:5000/api/pemilik/layanan/:id/status`
* **Deskripsi**: Mengaktifkan atau menonaktifkan ketersediaan paket layanan laundry (`AKTIF` atau `NONAKTIF`).
* **Role Akses**: `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Layanan).
* **Request Body**:
```json
{
  "status": "NONAKTIF"
}
```

---

### 6.14 GET /api/pemilik/pelanggan
* **Nama Endpoint**: Monitoring Pelanggan (Owner View)
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/pelanggan`
* **Deskripsi**: Menampilkan data pelanggan beserta riwayat total transaksi dan nilai belanja (*customer lifetime value*).
* **Role Akses**: `PEMILIK`

---

### 6.15 GET /api/pemilik/pelanggan/:id
* **Nama Endpoint**: Detail Pelanggan & Analisis Belanja
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/pelanggan/:id`
* **Deskripsi**: Rincian riwayat seluruh pesanan pelanggan tertentu.
* **Role Akses**: `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pelanggan).

---

### 6.16 GET /api/pemilik/pesanan
* **Nama Endpoint**: Monitoring Seluruh Pesanan Laundry
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/pesanan`
* **Deskripsi**: Memantau daftar seluruh cucian pelanggan yang masuk, sedang dikerjakan, maupun selesai.
* **Role Akses**: `PEMILIK`

---

### 6.17 GET /api/pemilik/pesanan/:id
* **Nama Endpoint**: Detail Pesanan Cucian (Owner View)
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/pesanan/:id`
* **Deskripsi**: Melihat lembar rincian pesanan tertentu secara utuh.
* **Role Akses**: `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pesanan).

---

### 6.18 GET /api/pemilik/transaksi
* **Nama Endpoint**: Monitoring Seluruh Mutasi Transaksi
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/transaksi`
* **Deskripsi**: Menampilkan rekap transaksi pembayaran laundry untuk audit finansial pemilik.
* **Role Akses**: `PEMILIK`

---

### 6.19 GET /api/pemilik/transaksi/:id
* **Nama Endpoint**: Detail Mutasi Transaksi Pembayaran
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/transaksi/:id`
* **Deskripsi**: Memeriksa rincian bukti bayar dan metode transaksi pada pesanan tertentu.
* **Role Akses**: `PEMILIK`
* **Path Parameters**: `id` (*integer* - ID Pesanan).

---

### 6.20 GET /api/pemilik/laporan/pendapatan
* **Nama Endpoint**: Laporan Finansial & Rekapitulasi Pendapatan
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/pemilik/laporan/pendapatan`
* **Deskripsi**: Mengagregasi data finansial bisnis dari database MySQL: omzet total, rincian per metode bayar (`TUNAI`, `QRIS`, `TRANSFER`), rekap harian, rekapitulasi bulanan (transaksi, pendapatan, estimasi pengeluaran, laba bersih), serta total pelanggan.
* **Role Akses**: `PEMILIK`
* **Query Parameters (Opsional)**:
  * `dari`: Tanggal awal format `YYYY-MM-DD` (contoh: `2024-05-01`).
  * `sampai`: Tanggal akhir format `YYYY-MM-DD` (contoh: `2024-05-31`).
* **Contoh Response Sukses (200 OK)**:
```json
{
  "success": true,
  "message": "Laporan pendapatan berhasil diambil dari MySQL XAMPP",
  "data": {
    "periode": {
      "dari": null,
      "sampai": null
    },
    "total_pesanan": 4,
    "total_pendapatan": 191500,
    "total_pelanggan": 4,
    "pendapatan_per_metode": [
      { "metode": "QRIS", "jumlah": 94500 },
      { "metode": "TRANSFER", "jumlah": 52000 },
      { "metode": "TUNAI", "jumlah": 45000 }
    ],
    "pendapatan_harian": [
      { "tanggal": "2024-05-19", "jumlah": 52000, "total_transaksi": 1 },
      { "tanggal": "2024-05-18", "jumlah": 40500, "total_transaksi": 1 },
      { "tanggal": "2024-05-17", "jumlah": 45000, "total_transaksi": 1 },
      { "tanggal": "2024-05-10", "jumlah": 54000, "total_transaksi": 1 }
    ],
    "pendapatan_bulanan": [
      {
        "bulan_key": "2024-05",
        "bulan_label": "Mei 2024",
        "total_transaksi": 4,
        "total_pendapatan": 191500,
        "total_pengeluaran": 72770,
        "laba_bersih": 118730
      }
    ],
    "pesanan_per_status": {
      "MENUNGGU": 1,
      "DIPROSES": 0,
      "DICUCI": 1,
      "DISETRIKA": 1,
      "SIAP_DIAMBIL": 1,
      "SELESAI": 1,
      "DIBATALKAN": 0
    }
  }
}
```

---

## 7. Ringkasan Seluruh Endpoint Backend API

| No | Modul | Method | URL Endpoint | Proteksi Role | Handler Controller |
|---|---|---|---|---|---|
| 1 | Health | GET | `/api/health` | Publik | `router.get` inline |
| 2 | Auth | POST | `/api/auth/login` | Publik | `authController.login` |
| 3 | Auth | POST | `/api/auth/register` | Publik | `authController.register` |
| 4 | Auth | POST | `/api/auth/reset-password` | Publik | `authController.resetPassword` |
| 5 | Auth | POST | `/api/auth/logout` | Publik / All | `authController.logout` |
| 6 | Auth | GET | `/api/auth/me` | JWT (Semua Role) | `authController.me` |
| 7 | Auth | PUT | `/api/auth/password` | JWT (Semua Role) | `authController.updatePassword` |
| 8 | Pegawai | GET | `/api/pegawai/dashboard` | `PEGAWAI`, `PEMILIK` | `pegawai.dashboard` |
| 9 | Pegawai | GET | `/api/pegawai/profil` | `PEGAWAI`, `PEMILIK` | `pegawai.profil` |
| 10 | Pegawai | PUT | `/api/pegawai/profil` | `PEGAWAI`, `PEMILIK` | `pegawai.updateProfil` |
| 11 | Pegawai | GET | `/api/pegawai/pelanggan` | `PEGAWAI`, `PEMILIK` | `pegawai.daftarPelanggan` |
| 12 | Pegawai | GET | `/api/pegawai/pelanggan/:id` | `PEGAWAI`, `PEMILIK` | `pegawai.detailPelanggan` |
| 13 | Pegawai | POST | `/api/pegawai/pelanggan` | `PEGAWAI`, `PEMILIK` | `pegawai.tambahPelanggan` |
| 14 | Pegawai | PUT | `/api/pegawai/pelanggan/:id` | `PEGAWAI`, `PEMILIK` | `pegawai.updatePelanggan` |
| 15 | Pegawai | GET | `/api/pegawai/pesanan` | `PEGAWAI`, `PEMILIK` | `pegawai.daftarPesanan` |
| 16 | Pegawai | GET | `/api/pegawai/pesanan/:id` | `PEGAWAI`, `PEMILIK` | `pegawai.detailPesanan` |
| 17 | Pegawai | POST | `/api/pegawai/pesanan` | `PEGAWAI`, `PEMILIK` | `pegawai.tambahPesanan` |
| 18 | Pegawai | PATCH | `/api/pegawai/pesanan/:id/status` | `PEGAWAI`, `PEMILIK` | `pegawai.updateStatus` |
| 19 | Pegawai | POST | `/api/pegawai/pesanan/:id/konfirmasi-pembayaran` | `PEGAWAI`, `PEMILIK` | `pegawai.konfirmasiPembayaran` |
| 20 | Pegawai | POST | `/api/pegawai/pesanan/:id/tolak` | `PEGAWAI`, `PEMILIK` | `pegawai.tolakPesanan` |
| 21 | Pegawai | GET | `/api/pegawai/transaksi` | `PEGAWAI`, `PEMILIK` | `pegawai.daftarTransaksi` |
| 22 | Pegawai | GET | `/api/pegawai/transaksi/:id` | `PEGAWAI`, `PEMILIK` | `pegawai.detailTransaksi` |
| 23 | Pegawai | POST | `/api/pegawai/transaksi/:id/pembayaran` | `PEGAWAI`, `PEMILIK` | `pegawai.tambahPembayaran` |
| 24 | Pegawai | PATCH | `/api/pegawai/transaksi/:id/pembayaran/:id_pembayaran/status` | `PEGAWAI`, `PEMILIK` | `pegawai.updateStatusPembayaran` |
| 25 | Pelanggan | GET | `/api/pelanggan/profil` | `PELANGGAN` | `pelanggan.getPelanggan` |
| 26 | Pelanggan | PUT | `/api/pelanggan/profil` | `PELANGGAN` | `pelanggan.updatePelanggan` |
| 27 | Pelanggan | PUT | `/api/pelanggan/password` | `PELANGGAN` | `pelanggan.updatePasswordPelanggan` |
| 28 | Pelanggan | GET | `/api/pelanggan/pesanan` | `PELANGGAN` | `pelanggan.getPesanan` |
| 29 | Pelanggan | POST | `/api/pelanggan/pesanan` | `PELANGGAN` | `pelanggan.createPesanan` |
| 30 | Pelanggan | GET | `/api/pelanggan/pesanan/:idOrCode` | Publik / `PELANGGAN` | `pelanggan.getPesananDetail` |
| 31 | Pelanggan | GET | `/api/pelanggan/layanan` | Publik / `PELANGGAN` | `pelanggan.getLayanan` |
| 32 | Pelanggan | GET | `/api/pelanggan/dashboard-summary` | `PELANGGAN` | `pelanggan.getDashboardSummary` |
| 33 | Pemilik | GET | `/api/pemilik/dashboard` | `PEMILIK` | `pemilik.dashboard` |
| 34 | Pemilik | GET | `/api/pemilik/profil` | `PEMILIK` | `pemilik.profil` |
| 35 | Pemilik | PUT | `/api/pemilik/profil` | `PEMILIK` | `pemilik.updateProfil` |
| 36 | Pemilik | GET | `/api/pemilik/pegawai` | `PEMILIK` | `pemilik.daftarPegawai` |
| 37 | Pemilik | GET | `/api/pemilik/pegawai/:id` | `PEMILIK` | `pemilik.detailPegawai` |
| 38 | Pemilik | POST | `/api/pemilik/pegawai` | `PEMILIK` | `pemilik.tambahPegawai` |
| 39 | Pemilik | PUT | `/api/pemilik/pegawai/:id` | `PEMILIK` | `pemilik.updatePegawai` |
| 40 | Pemilik | PATCH | `/api/pemilik/pegawai/:id/status` | `PEMILIK` | `pemilik.updateStatusPegawai` |
| 41 | Pemilik | GET | `/api/pemilik/layanan` | `PEMILIK` | `pemilik.daftarLayanan` |
| 42 | Pemilik | GET | `/api/pemilik/layanan/:id` | `PEMILIK` | `pemilik.detailLayanan` |
| 43 | Pemilik | POST | `/api/pemilik/layanan` | `PEMILIK` | `pemilik.tambahLayanan` |
| 44 | Pemilik | PUT | `/api/pemilik/layanan/:id` | `PEMILIK` | `pemilik.updateLayanan` |
| 45 | Pemilik | PATCH | `/api/pemilik/layanan/:id/status` | `PEMILIK` | `pemilik.updateStatusLayanan` |
| 46 | Pemilik | GET | `/api/pemilik/pelanggan` | `PEMILIK` | `pemilik.daftarPelanggan` |
| 47 | Pemilik | GET | `/api/pemilik/pelanggan/:id` | `PEMILIK` | `pemilik.detailPelanggan` |
| 48 | Pemilik | GET | `/api/pemilik/pesanan` | `PEMILIK` | `pemilik.daftarPesanan` |
| 49 | Pemilik | GET | `/api/pemilik/pesanan/:id` | `PEMILIK` | `pemilik.detailPesanan` |
| 50 | Pemilik | GET | `/api/pemilik/transaksi` | `PEMILIK` | `pemilik.daftarTransaksi` |
| 51 | Pemilik | GET | `/api/pemilik/transaksi/:id` | `PEMILIK` | `pemilik.detailTransaksi` |
| 52 | Pemilik | GET | `/api/pemilik/laporan/pendapatan` | `PEMILIK` | `pemilik.laporanPendapatan` |

