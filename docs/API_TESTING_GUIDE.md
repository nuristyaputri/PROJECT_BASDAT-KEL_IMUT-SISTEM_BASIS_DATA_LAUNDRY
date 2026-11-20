# PANDUAN PENGUJIAN API (API TESTING GUIDE) - CLOUDLAUNDRY

Panduan ini disusun untuk memandu pengujian fungsional seluruh Backend API pada sistem **CloudLaundry / BersihIn Laundry** menggunakan HTTP Client tools seperti **Postman, Thunder Client (VS Code), Hoppscotch**, atau **cURL**.

---

## 1. Persiapan Lingkungan Pengujian (Environment Setup)

### 1.1 Menjalankan Server Backend
Pastikan server backend telah aktif di terminal:
```bash
cd backend
npm install
npm start
# atau menggunakan nodemon:
npm run dev
```
Secara default, server Express akan berjalan pada:
- **Base URL**: `http://localhost:5000`
- **Prefix API**: `/api`

### 1.2 Konfigurasi Environment Variable di Postman / Thunder Client
Buat environment baru bernama `CloudLaundry Local` dan tambahkan variabel berikut:

| Nama Variabel | Nilai Awal (Initial Value) | Deskripsi |
| :--- | :--- | :--- |
| `base_url` | `http://localhost:5000/api` | Alamat basis API backend |
| `token_pelanggan` | *(kosong, diisi otomatis saat login)* | Token JWT hak akses Pelanggan |
| `token_pegawai` | *(kosong, diisi otomatis saat login)* | Token JWT hak akses Pegawai |
| `token_pemilik` | *(kosong, diisi otomatis saat login)* | Token JWT hak akses Pemilik |
| `id_pesanan_test` | `1` | ID pesanan untuk pengujian alur pengerjaan |

---

## 2. Urutan Pengujian End-to-End (Recommended Testing Flow)

Agar pengujian mencerminkan skenario dunia nyata, jalankan pengujian dengan urutan skenario berikut:

```
[Tahap 1: Health Check] 
       ↓
[Tahap 2: Registrasi Pelanggan Baru]
       ↓
[Tahap 3: Login Pelanggan & Dapatkan Token]
       ↓
[Tahap 4: Pelanggan Melihat Layanan & Membuat Pesanan]
       ↓
[Tahap 5: Login Pegawai & Dapatkan Token]
       ↓
[Tahap 6: Pegawai Memeriksa Antrean & Mengubah Status Cucian]
       ↓
[Tahap 7: Pegawai Memverifikasi Pembayaran & Cetak Nota]
       ↓
[Tahap 8: Login Pemilik & Melihat Laporan Omset Keuangan]
       ↓
[Tahap 9: Pengujian Skenario Galat / Error Handling]
```

---

## 3. Langkah Pengujian Langkah Demi Langkah (Step-by-Step Requests)

### TAHAP 1: Health Check Server
Memastikan server dan koneksi database MySQL aktif dan siap menerima request.

- **Method**: `GET`
- **URL**: `{{base_url}}/health`
- **Headers**: *(None)*
- **cURL Command**:
  ```bash
  curl -X GET http://localhost:5000/api/health
  ```
- **Expected Response (HTTP 200 OK)**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-16T14:00:00.000Z",
    "database": "connected"
  }
  ```

---

### TAHAP 2: Registrasi Akun Pelanggan Baru
Mendaftarkan pelanggan baru ke sistem.

- **Method**: `POST`
- **URL**: `{{base_url}}/auth/register`
- **Headers**:
  - `Content-Type: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "nama_lengkap": "Siti Aminah",
    "email": "siti.aminah@example.com",
    "password": "Password123!",
    "no_hp": "081298765432",
    "alamat": "Jl. Melati No. 45, Jakarta Selatan"
  }
  ```
- **cURL Command**:
  ```bash
  curl -X POST http://localhost:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"nama_lengkap\":\"Siti Aminah\",\"email\":\"siti.aminah@example.com\",\"password\":\"Password123!\",\"no_hp\":\"081298765432\",\"alamat\":\"Jl. Melati No. 45\"}"
  ```
- **Expected Response (HTTP 201 Created)**:
  ```json
  {
    "success": true,
    "message": "Registrasi pelanggan berhasil",
    "data": {
      "id_user": 12,
      "id_pelanggan": 8,
      "email": "siti.aminah@example.com",
      "nama_lengkap": "Siti Aminah",
      "role": "pelanggan"
    }
  }
  ```

---

### TAHAP 3: Login Pelanggan & Mendapatkan Token JWT
Melakukan autentikasi dan menyimpan token respons ke variabel `token_pelanggan`.

- **Method**: `POST`
- **URL**: `{{base_url}}/auth/login`
- **Headers**:
  - `Content-Type: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "email": "siti.aminah@example.com",
    "password": "Password123!",
    "role": "pelanggan"
  }
  ```
- **Expected Response (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login berhasil",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 12,
      "id_pelanggan": 8,
      "nama": "Siti Aminah",
      "email": "siti.aminah@example.com",
      "role": "pelanggan"
    }
  }
  ```
> **Catatan Penguji**: Salin isi field `token` di atas dan masukkan ke dalam header pengujian tahap berikutnya sebagai `Bearer <token>`.

---

### TAHAP 4: Pelanggan Membuat Pesanan Baru (Simulasi Pembayaran QRIS)
Membuat pesanan cucian baru lengkap dengan unggahan bukti transfer digital.

- **Method**: `POST`
- **URL**: `{{base_url}}/pelanggan/pesanan`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token_pelanggan}}`
- **Request Body (JSON)**:
  ```json
  {
    "id_layanan": 1,
    "jumlah": 4.5,
    "catatan": "Tolong pakaian bayi dipisahkan",
    "metode_pembayaran": "qris",
    "bukti_bayar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/..."
  }
  ```
- **Expected Response (HTTP 201 Created)**:
  ```json
  {
    "success": true,
    "message": "Pesanan laundry berhasil dibuat",
    "data": {
      "id_pesanan": 25,
      "nomor_pesanan": "ORD-202611-0025",
      "total_harga": 45000,
      "status_pesanan": "menunggu",
      "metode_pembayaran": "qris",
      "status_pembayaran": "menunggu_verifikasi"
    }
  }
  ```

---

### TAHAP 5: Login Staf Pegawai
Login menggunakan akun staf kasir/operasional.

- **Method**: `POST`
- **URL**: `{{base_url}}/auth/login`
- **Headers**:
  - `Content-Type: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "email": "budi@bersihin.com",
    "password": "Password123!",
    "role": "pegawai"
  }
  ```
- **Expected Response (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 2,
      "id_pegawai": 1,
      "nama": "Budi Santoso",
      "role": "pegawai",
      "shift": "pagi"
    }
  }
  ```

---

### TAHAP 6: Pegawai Mengubah Status Progres Cucian
Mengubah status pesanan nomor 25 menjadi "proses" (sedang dicuci).

- **Method**: `PUT`
- **URL**: `{{base_url}}/pegawai/pesanan/25/status`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token_pegawai}}`
- **Request Body (JSON)**:
  ```json
  {
    "status_pesanan": "proses",
    "catatan": "Cucian sedang dalam tahap pencucian mesin 2"
  }
  ```
- **Expected Response (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "message": "Status pesanan berhasil diperbarui menjadi proses",
    "data": {
      "id_pesanan": 25,
      "status_pesanan": "proses"
    }
  }
  ```

---

### TAHAP 7: Pegawai Memverifikasi Pembayaran QRIS
Staf kasir memverifikasi keabsahan bukti bayar QRIS yang diunggah pelanggan.

- **Method**: `PUT`
- **URL**: `{{base_url}}/pegawai/pembayaran/25/verifikasi`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token_pegawai}}`
- **Request Body**: *(None)*
- **Expected Response (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "message": "Pembayaran berhasil diverifikasi (LUNAS)",
    "data": {
      "id_pesanan": 25,
      "status_pembayaran": "lunas",
      "diverifikasi_oleh": "Budi Santoso",
      "waktu_verifikasi": "2026-11-16T14:15:20.000Z"
    }
  }
  ```

---

### TAHAP 8: Login Pemilik & Melihat Laporan Keuangan
Pemilik memeriksa laporan akumulasi pendapatan laundry.

- **Langkah 8A - Login Pemilik**:
  - `POST {{base_url}}/auth/login`
  - Body: `{"email": "pemilik@bersihin.com", "password": "Password123!", "role": "pemilik"}`

- **Langkah 8B - Ambil Ringkasan Laporan**:
  - `GET {{base_url}}/pemilik/laporan/ringkasan`
  - **Headers**: `Authorization: Bearer {{token_pemilik}}`
  - **Expected Response (HTTP 200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "total_pendapatan": 14250000,
        "total_transaksi": 182,
        "rata_rata_transaksi": 78296,
        "pesanan_selesai": 175
      }
    }
    ```

---

## 4. Pengujian Skenario Galat (Negative & Edge Case Testing)

Pengujian API harus mencakup verifikasi respon galat yang tepat pada saat terjadi kesalahan input atau pembobolan hak akses:

### Kasus 1: Mengakses Endpoint Terproteksi Tanpa Token
- **Request**: `GET {{base_url}}/pegawai/dashboard` tanpa menyertakan header `Authorization`.
- **Expected Response**: `401 Unauthorized`
  ```json
  {
    "success": false,
    "message": "Akses ditolak: Token autentikasi tidak ditemukan"
  }
  ```

### Kasus 2: Pelanggan Mencoba Mengakses API Pemilik (Role Violation)
- **Request**: `GET {{base_url}}/pemilik/laporan` dengan header `Authorization: Bearer {{token_pelanggan}}`.
- **Expected Response**: `403 Forbidden`
  ```json
  {
    "success": false,
    "message": "Akses dilarang: Peran Anda tidak memiliki izin untuk modul ini"
  }
  ```

### Kasus 3: Input Password Salah Saat Login
- **Request**: `POST {{base_url}}/auth/login` dengan password salah.
- **Expected Response**: `401 Unauthorized`
  ```json
  {
    "success": false,
    "message": "Email/username atau password tidak sesuai"
  }
  ```

### Kasus 4: Mengakses Data Pesanan yang Tidak Ada
- **Request**: `GET {{base_url}}/pegawai/pesanan/999999`
- **Expected Response**: `404 Not Found`
  ```json
  {
    "success": false,
    "message": "Data pesanan tidak ditemukan"
  }
  ```

---

## 5. Ringkasan Checklist Kesiapan Uji API

- [x] Server Backend berjalan di port 5000 tanpa crash.
- [x] Endpoint `GET /api/health` mengembalikan status database terkoneksi.
- [x] Registrasi pengguna baru berhasil menyisipkan rekod ke tabel `users` dan `pelanggan`.
- [x] Password dienkripsi dengan algoritma bcrypt (tidak plain-text).
- [x] Token JWT ditandatangani dengan secret key dan memuat identitas pengguna.
- [x] Role-Based Access Control (RBAC) menolak akses lintas peran.
- [x] Transaksi pesanan multi-tabel (`pesanan`, `detail_pesanan`, `pembayaran`, `riwayat_status`) tersimpan secara konsisten.
- [x] Upload bukti bayar QRIS berhasil disimpan dan dapat diverifikasi oleh kasir.

