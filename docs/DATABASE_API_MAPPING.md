# DOKUMENTASI PEMETAAN DATABASE & BACKEND API - CLOUDLAUNDRY

Dokumen ini menjelaskan hubungan terperinci antara endpoint Backend API dengan skema relasional tabel dan kolom database MySQL pada sistem **CloudLaundry / BersihIn Laundry**.

Analisis disusun berdasarkan DDL migration database (`database/migrations/01_create_tables.sql`), dump SQL (`database/database_laundry.sql`), skrip seeder, dan query SQL pada controller backend.

---

## 1. Skema Relasional Basis Data Laundry

Sistem CloudLaundry mengelola 9 tabel inti relasional yang saling terhubung:

```
[users] (id_user)
   │
   ├── (1:1)──> [pemilik] (id_pemilik, id_user)
   │
   ├── (1:1)──> [pegawai] (id_pegawai, id_user)
   │               │
   │               ├── (1:N)──> [pesanan] (id_pegawai)
   │               └── (1:N)──> [pembayaran] (id_pegawai_verifikasi)
   │
   └── (1:1)──> [pelanggan] (id_pelanggan, id_user)
                   │
                   └── (1:N)──> [pesanan] (id_pesanan, id_pelanggan)
                                   │
                                   ├── (1:N)──> [detail_pesanan] (id_detail, id_layanan) <── [layanan]
                                   ├── (1:N)──> [riwayat_status] (id_riwayat, id_pesanan)
                                   └── (1:1)──> [pembayaran] (id_pembayaran, id_pesanan)
```

---

## 2. Struktur Spesifikasi Tabel & Kolom Database

### 2.1 Tabel `users`
Tabel induk otentikasi dan kredensial sistem.
- `id_user`: `INT AUTO_INCREMENT` (PRIMARY KEY)
- `username`: `VARCHAR(50) UNIQUE NOT NULL` - Username/email login
- `password`: `VARCHAR(255) NOT NULL` - Hash kata sandi bcrypt
- `role`: `ENUM('pemilik', 'pegawai', 'pelanggan') NOT NULL` - Hak otoritas akses
- `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

### 2.2 Tabel `pemilik`
Menyimpan profil pimpinan/pemilik laundry.
- `id_pemilik`: `INT AUTO_INCREMENT` (PRIMARY KEY)
- `id_user`: `INT NOT NULL` (FOREIGN KEY $\rightarrow$ `users(id_user)` ON DELETE CASCADE)
- `nama_pemilik`: `VARCHAR(100) NOT NULL`
- `no_telepon`: `VARCHAR(15)`
- `email`: `VARCHAR(100)`
- `alamat`: `TEXT`

### 2.3 Tabel `pegawai`
Menyimpan data staf operasional dan kasir.
- `id_pegawai`: `INT AUTO_INCREMENT` (PRIMARY KEY)
- `id_user`: `INT NOT NULL` (FOREIGN KEY $\rightarrow$ `users(id_user)` ON DELETE CASCADE)
- `nama_pegawai`: `VARCHAR(100) NOT NULL`
- `no_telepon`: `VARCHAR(15)`
- `email`: `VARCHAR(100)`
- `shift`: `ENUM('pagi', 'siang', 'malam')` atau `VARCHAR(20)`
- `alamat`: `TEXT`

### 2.4 Tabel `pelanggan`
Menyimpan data master konsumen laundry.
- `id_pelanggan`: `INT AUTO_INCREMENT` (PRIMARY KEY)
- `id_user`: `INT NOT NULL` (FOREIGN KEY $\rightarrow$ `users(id_user)` ON DELETE CASCADE)
- `nama_pelanggan`: `VARCHAR(100) NOT NULL`
- `no_telepon`: `VARCHAR(15)`
- `email`: `VARCHAR(100)`
- `alamat`: `TEXT`
- `poin`: `INT DEFAULT 0`

### 2.5 Tabel `layanan`
Menyimpan katalog jenis paket cucian dan tarif harga.
- `id_layanan`: `INT AUTO_INCREMENT` (PRIMARY KEY)
- `nama_layanan`: `VARCHAR(100) NOT NULL` (misal: "Cuci Komplit Reguler", "Cuci Kering Setrika Express")
- `jenis_layanan`: `ENUM('kiloan', 'satuan') NOT NULL`
- `harga`: `DECIMAL(10,2) NOT NULL` - Tarif per satuan/kg
- `estimasi_waktu`: `VARCHAR(50)` (misal: "2 Hari", "24 Jam", "6 Jam")
- `deskripsi`: `TEXT`

### 2.6 Tabel `pesanan`
Tabel master transaksi pencucian laundry.
- `id_pesanan`: `INT AUTO_INCREMENT` (PRIMARY KEY)
- `nomor_pesanan`: `VARCHAR(50) UNIQUE NOT NULL` - Nomor faktur/nota (contoh: "ORD-202411-001")
- `id_pelanggan`: `INT NOT NULL` (FOREIGN KEY $\rightarrow$ `pelanggan(id_pelanggan)`)
- `id_pegawai`: `INT NULL` (FOREIGN KEY $\rightarrow$ `pegawai(id_pegawai)`) - Staf yang memproses/menerima
- `tanggal_pesanan`: `DATETIME DEFAULT CURRENT_TIMESTAMP`
- `tanggal_selesai`: `DATETIME NULL`
- `status_pesanan`: `ENUM('menunggu', 'proses', 'siap_diambil', 'selesai', 'dibatalkan') DEFAULT 'menunggu'`
- `total_harga`: `DECIMAL(10,2) NOT NULL DEFAULT 0.00`
- `catatan`: `TEXT`
- `metode_pembayaran`: `ENUM('tunai', 'qris', 'transfer')`
- `bukti_bayar`: `LONGTEXT NULL` - String Base64 / URL bukti transfer pembayaran QRIS

### 2.7 Tabel `detail_pesanan`
Rincian item layanan yang diambil dalam satu pesanan.
- `id_detail`: `INT AUTO_INCREMENT` (PRIMARY KEY)
- `id_pesanan`: `INT NOT NULL` (FOREIGN KEY $\rightarrow$ `pesanan(id_pesanan)` ON DELETE CASCADE)
- `id_layanan`: `INT NOT NULL` (FOREIGN KEY $\rightarrow$ `layanan(id_layanan)`)
- `jumlah`: `DECIMAL(6,2) NOT NULL` - Berat (kg) atau kuantitas (pcs)
- `subtotal`: `DECIMAL(10,2) NOT NULL` - Hasil kali jumlah $\times$ harga layanan

### 2.8 Tabel `riwayat_status`
Audit trail pelacakan histori perubahan progres cucian.
- `id_riwayat`: `INT AUTO_INCREMENT` (PRIMARY KEY)
- `id_pesanan`: `INT NOT NULL` (FOREIGN KEY $\rightarrow$ `pesanan(id_pesanan)` ON DELETE CASCADE)
- `status`: `VARCHAR(50) NOT NULL` (misal: 'menunggu', 'proses', 'selesai')
- `keterangan`: `TEXT`
- `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

### 2.9 Tabel `pembayaran`
Pencatatan status settlement keuangan dan verifikasi kasir.
- `id_pembayaran`: `INT AUTO_INCREMENT` (PRIMARY KEY)
- `id_pesanan`: `INT NOT NULL` (FOREIGN KEY $\rightarrow$ `pesanan(id_pesanan)` ON DELETE CASCADE)
- `tanggal_bayar`: `DATETIME DEFAULT CURRENT_TIMESTAMP`
- `jumlah_bayar`: `DECIMAL(10,2) NOT NULL`
- `metode_pembayaran`: `ENUM('tunai', 'qris', 'transfer') NOT NULL`
- `status_pembayaran`: `ENUM('belum_lunas', 'menunggu_verifikasi', 'lunas') DEFAULT 'belum_lunas'`
- `bukti_bayar`: `LONGTEXT NULL`
- `id_pegawai_verifikasi`: `INT NULL` (FOREIGN KEY $\rightarrow$ `pegawai(id_pegawai)`)

---

## 3. Matriks Pemetaan Endpoint API terhadap Tabel & Operasi Database

Berikut adalah tabel pemetaan lengkap antara setiap kelompok endpoint API aktif dengan tabel basis data dan tipe operasi SQL-nya (Create, Read, Update, Delete):

| Modul API | HTTP Method & Endpoint | Tabel Database Terkait | Operasi SQL | Kolom Utama yang Terlibat |
| :--- | :--- | :--- | :---: | :--- |
| **Authentication** | `POST /api/auth/login` | `users`, `pelanggan`, `pegawai`, `pemilik` | `SELECT` | `users.username`, `users.password`, `users.role`, join ke tabel profil sesuai role |
| **Authentication** | `POST /api/auth/register` | `users`, `pelanggan` | `INSERT` | `users.username`, `users.password`, `users.role`, `pelanggan.nama_pelanggan`, `pelanggan.no_telepon`, `pelanggan.email`, `pelanggan.alamat` |
| **Authentication** | `GET /api/auth/me` | `users`, profil role terkait | `SELECT` | `users.id_user`, `users.username`, `users.role` |
| **Authentication** | `PUT /api/auth/change-password` | `users` | `UPDATE` | `users.password` (di-hash ulang menggunakan bcrypt) |
| **Pegawai (Dashboard)** | `GET /api/pegawai/dashboard` | `pesanan`, `pembayaran` | `SELECT` (COUNT, SUM) | `pesanan.status_pesanan`, `pesanan.tanggal_pesanan`, `pembayaran.jumlah_bayar` |
| **Pegawai (Pesanan)** | `GET /api/pegawai/pesanan` | `pesanan`, `pelanggan`, `layanan`, `detail_pesanan` | `SELECT` | `pesanan.*`, `pelanggan.nama_pelanggan`, `layanan.nama_layanan` |
| **Pegawai (Pesanan)** | `GET /api/pegawai/pesanan/:id` | `pesanan`, `detail_pesanan`, `pelanggan`, `layanan`, `pembayaran` | `SELECT` | Full detail satu nota pesanan dan bukti bayar |
| **Pegawai (Pesanan)** | `POST /api/pegawai/pesanan` | `pesanan`, `detail_pesanan`, `pembayaran`, `riwayat_status` | `INSERT` | Pembuatan nota cucian langsung di kasir oleh pegawai |
| **Pegawai (Status)** | `PUT /api/pegawai/pesanan/:id/status` | `pesanan`, `riwayat_status` | `UPDATE`, `INSERT` | `pesanan.status_pesanan`, `riwayat_status.status`, `riwayat_status.keterangan` |
| **Pegawai (Transaksi)** | `GET /api/pegawai/transaksi` | `pembayaran`, `pesanan`, `pelanggan` | `SELECT` | `pembayaran.*`, `pesanan.nomor_pesanan`, `pelanggan.nama_pelanggan` |
| **Pegawai (Verifikasi)** | `PUT /api/pegawai/pembayaran/:id/verifikasi` | `pembayaran`, `pesanan` | `UPDATE` | `pembayaran.status_pembayaran` = 'lunas', `pembayaran.id_pegawai_verifikasi` |
| **Pegawai (Pelanggan)** | `GET /api/pegawai/pelanggan` | `pelanggan`, `pesanan` | `SELECT` | `pelanggan.*`, COUNT(`pesanan.id_pesanan`) |
| **Pegawai (Pelanggan)** | `GET /api/pegawai/pelanggan/:id` | `pelanggan`, `pesanan` | `SELECT` | Detail identitas dan riwayat pesanan pelanggan tertentu |
| **Pegawai (Profil)** | `GET /api/pegawai/profil` | `pegawai`, `users` | `SELECT` | `pegawai.*`, `users.username` |
| **Pegawai (Profil)** | `PUT /api/pegawai/profil` | `pegawai` | `UPDATE` | `pegawai.nama_pegawai`, `pegawai.no_telepon`, `pegawai.alamat` |
| **Pelanggan (Dashboard)**| `GET /api/pelanggan/dashboard` | `pesanan`, `detail_pesanan`, `pelanggan` | `SELECT` | Menghitung cucian aktif milik pelanggan yang sedang login |
| **Pelanggan (Layanan)** | `GET /api/pelanggan/layanan` | `layanan` | `SELECT` | `layanan.id_layanan`, `layanan.nama_layanan`, `layanan.harga`, `layanan.estimasi_waktu` |
| **Pelanggan (Pesanan)** | `POST /api/pelanggan/pesanan` | `pesanan`, `detail_pesanan`, `pembayaran`, `riwayat_status` | `INSERT` | Insert order baru, kalkulasi `total_harga`, simpan `bukti_bayar` Base64 |
| **Pelanggan (Pesanan)** | `GET /api/pelanggan/pesanan` | `pesanan`, `detail_pesanan`, `layanan` | `SELECT` | Daftar seluruh pesanan milik id_pelanggan pemanggil |
| **Pelanggan (Tracking)**| `GET /api/pelanggan/pesanan/:id/status`| `riwayat_status`, `pesanan` | `SELECT` | `riwayat_status.status`, `riwayat_status.keterangan`, `riwayat_status.created_at` |
| **Pelanggan (Riwayat)** | `GET /api/pelanggan/riwayat` | `pesanan`, `pembayaran` | `SELECT` | Pesanan dengan `status_pesanan` = 'selesai' milik pelanggan |
| **Pelanggan (Profil)**  | `GET /api/pelanggan/profil` | `pelanggan`, `users` | `SELECT` | `pelanggan.*`, `users.username` |
| **Pelanggan (Profil)**  | `PUT /api/pelanggan/profil` | `pelanggan` | `UPDATE` | `pelanggan.nama_pelanggan`, `pelanggan.no_telepon`, `pelanggan.alamat` |
| **Pemilik (Dashboard)** | `GET /api/pemilik/dashboard` | `pesanan`, `pembayaran`, `pelanggan`, `pegawai` | `SELECT` (SUM, COUNT) | Total omset, statistik pertumbuhan transaksi, jumlah pengguna |
| **Pemilik (Pegawai)**   | `GET /api/pemilik/pegawai` | `pegawai`, `users` | `SELECT` | Daftar staf lengkap dengan info akun login |
| **Pemilik (Pegawai)**   | `POST /api/pemilik/pegawai` | `users`, `pegawai` | `INSERT` (Transaction) | Buat user (role: 'pegawai'), hash password, buat data pegawai |
| **Pemilik (Pegawai)**   | `DELETE /api/pemilik/pegawai/:id` | `pegawai`, `users` | `DELETE` | Menghapus data pegawai dan akun login terkait |
| **Pemilik (Layanan)**   | `GET /api/pemilik/layanan` | `layanan` | `SELECT` | Seluruh data master paket laundry |
| **Pemilik (Layanan)**   | `POST /api/pemilik/layanan` | `layanan` | `INSERT` | `nama_layanan`, `jenis_layanan`, `harga`, `estimasi_waktu`, `deskripsi` |
| **Pemilik (Layanan)**   | `PUT /api/pemilik/layanan/:id` | `layanan` | `UPDATE` | Pembaruan tarif harga atau informasi estimasi pengerjaan |
| **Pemilik (Layanan)**   | `DELETE /api/pemilik/layanan/:id` | `layanan` | `DELETE` | Menghapus paket layanan |
| **Pemilik (Pelanggan)** | `GET /api/pemilik/pelanggan` | `pelanggan`, `users`, `pesanan` | `SELECT` | Daftar seluruh pelanggan beserta kalkulasi akumulasi transaksi |
| **Pemilik (Pelanggan)** | `POST /api/pemilik/pelanggan` | `users`, `pelanggan` | `INSERT` | Mendaftarkan akun pelanggan baru |
| **Pemilik (Pelanggan)** | `DELETE /api/pemilik/pelanggan/:id` | `pelanggan`, `users` | `DELETE` | Menghapus pelanggan |
| **Pemilik (Transaksi)** | `GET /api/pemilik/transaksi` | `pembayaran`, `pesanan`, `pelanggan`, `pegawai` | `SELECT` | Audit lengkap seluruh transaksi pembayaran masuk |
| **Pemilik (Laporan)**   | `GET /api/pemilik/laporan` | `pesanan`, `pembayaran`, `pelanggan`, `detail_pesanan` | `SELECT` | Filter berdasarkan tanggal: hitung omset kotor, pesanan selesai |
| **Pemilik (Ringkasan)** | `GET /api/pemilik/laporan/ringkasan` | `pembayaran`, `pesanan` | `SELECT` (SUM, AVG) | Rekapitulasi finansial untuk kartu ringkasan eksekutif |
| **Pemilik (Profil)**    | `GET /api/pemilik/profil` | `pemilik`, `users` | `SELECT` | `pemilik.*`, `users.username` |
| **Pemilik (Profil)**    | `PUT /api/pemilik/profil` | `pemilik` | `UPDATE` | `pemilik.nama_pemilik`, `pemilik.no_telepon`, `pemilik.alamat` |

---

## 4. Integritas Relasional & Transaksional Database (ACID)

Pada proses pembuatan pesanan (`POST /api/pelanggan/pesanan` dan `POST /api/pegawai/pesanan`), backend menerapkan pola transaksi multi-tabel:
1. **Insert Induk Pesanan**: Menyimpan data utama ke tabel `pesanan` dan mendapatkan nilai `id_pesanan` yang baru dibuat.
2. **Insert Rincian Item**: Menyimpan setiap layanan terpilih ke tabel `detail_pesanan` dengan mereferensikan `id_pesanan`.
3. **Insert Rekod Pembayaran**: Membuat tagihan awal di tabel `pembayaran` dengan status `menunggu_verifikasi` (untuk QRIS) atau `belum_lunas` (untuk Tunai).
4. **Insert Histori Status Awal**: Menyisipkan rekod pertama di tabel `riwayat_status` dengan status `'menunggu'` dan keterangan `'Pesanan berhasil dibuat'`.
5. Apabila salah satu langkah di atas gagal, operasi dapat di-rollback untuk menjamin konsistensi data.

