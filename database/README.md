# Dokumentasi Basis Data, Migrasi Terminal & phpMyAdmin - Bersihin Laundry

Dokumen ini berisi panduan lengkap migrasi skema tabel, seeder data demo, dan konfigurasi database MySQL untuk proyek Sistem Informasi Basis Data Laundry (Bersihin Laundry).

---

## 1. Migrasi Sekali Perintah di Terminal (Direkomendasikan)

Anda dapat menjalankan seluruh proses migrasi (otomatis membuat database `bersihinlaundry`, 9 tabel relasional, serta seluruh seeder data demo) langsung dari terminal hanya dengan **satu perintah**.

### Langkah-Langkah:
1. **Nyalakan MySQL**:
   Buka XAMPP Control Panel / Laragon dan klik **Start** pada modul MySQL.
2. **Buka Terminal** di direktori proyek dan jalankan salah satu perintah berikut:

```bash
# Opsi A: Menggunakan npm run (dari root proyek atau folder backend)
npm run migrate

# Opsi B: Menggunakan node langsung
node database/migrate.js

# Opsi C: Menggunakan batch file (Windows Command Prompt)
.\migrate.bat

# Opsi D: Menggunakan skrip PowerShell
.\migrate.ps1
```

Skrip migrasi terminal akan:
- Menghubungkan ke MySQL Server (`127.0.0.1:3306`).
- Otomatis membuat database `bersihinlaundry` jika belum dibuat.
- Mengeksekusi pembuatan 9 tabel relasional lengkap dengan Primary Key dan Foreign Key.
- Mengisi data seeder awal (seluruh akun Pemilik, Pegawai, Pelanggan, katalog layanan, pesanan, riwayat cucian, dan pembayaran).
- Menampilkan rekapitulasi data dan akun demo yang siap digunakan.

---

## 2. Panduan Import 1-Klik di GUI phpMyAdmin

Untuk menjalankan database pada lingkungan lokal (XAMPP, WAMP, Laragon, atau Docker):

1. **Jalankan Apache & MySQL**:
   Buka XAMPP Control Panel, lalu klik **Start** pada modul Apache dan MySQL.
2. **Buka phpMyAdmin**:
   Buka peramban (browser) dan akses alamat: [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
3. **Pilih Menu Import**:
   Pada menu navigasi atas phpMyAdmin, klik tab **Import** (tidak perlu membuat database manual terlebih dahulu).
4. **Pilih Berkas SQL**:
   Klik tombol **Choose File** / **Pilih File**, lalu arahkan ke:
   ```
   database/database_laundry.sql
   ```
5. **Jalankan Eksekusi**:
   Gulir ke bagian bawah halaman dan klik tombol **Kirim** (atau **Go**).
6. **Selesai**:
   Database `bersihinlaundry` beserta 9 tabel relasional dan seluruh data demonstrasi awal berhasil terpasang.

> **Catatan Alternatif**: Jika ingin menjalankan migrasi terpisah antara struktur tabel dan isi data, gunakan berkas berikut secara berurutan:
> 1. `database/migrations/01_create_tables.sql` (Struktur DDL)
> 2. `database/seeders/01_seed_data.sql` (Data DML)

---

## 2. Struktur Tabel & Relasi Entitas

Basis data ini terdiri dari 9 tabel relasional yang saling terhubung dengan integritas referensial (*Foreign Key Constraints*):

| No | Nama Tabel | Deskripsi | Kunci Utama (*Primary Key*) | Relasi Kunci Tamu (*Foreign Key*) |
|---|---|---|---|---|
| 1 | `users` | Akun autentikasi pengguna terpusat untuk semua aktor | `id_user` | - |
| 2 | `pemilik` | Profil data pemilik / super administrator | `id_pemilik` | `id_user` -> `users.id_user` |
| 3 | `pegawai` | Profil data staf kasir dan operator laundry | `id_pegawai` | `id_user` -> `users.id_user` |
| 4 | `pelanggan` | Data profil dan kontak pelanggan | `id_pelanggan` | `id_user` -> `users.id_user` |
| 5 | `layanan` | Katalog jenis paket cucian dan tarif harga | `id_layanan` | - |
| 6 | `pesanan` | Data induk transaksi pesanan cucian | `id_pesanan` | `id_pelanggan` -> `pelanggan.id_pelanggan`, `id_pegawai` -> `pegawai.id_pegawai` |
| 7 | `detail_pesanan` | Rincian item dan kuantitas per pesanan | `id_detail` | `id_pesanan` -> `pesanan.id_pesanan`, `id_layanan` -> `layanan.id_layanan` |
| 8 | `riwayat_status` | Log riwayat pembaruan status pengerjaan | `id_riwayat` | `id_pesanan` -> `pesanan.id_pesanan`, `id_pegawai` -> `pegawai.id_pegawai` |
| 9 | `pembayaran` | Pencatatan transaksi pembayaran pelanggan | `id_pembayaran` | `id_pesanan` -> `pesanan.id_pesanan` |

---

## 3. Akun Login Bawaan (Demo & Pengujian)

Seluruh akun demo telah di-hash menggunakan algoritma Bcrypt yang kompatibel dengan PHP maupun Node.js.

| Peran (*Role*) | Username | Email / No. HP | Password | Hak Akses Dashboard |
|---|---|---|---|---|
| **PEMILIK** | `pemilik` | `rangga@bersihin.id` | `password123` | Laporan Keuangan, Data Staf, Tarif Layanan |
| **PEGAWAI** | `dina.staff` | `dina.nurhaliza@bersihin.id` | `password123` | POS Kasir, Input Pesanan, Update Cucian |
| **PEGAWAI** | `budi.operator` | `budi.operator@bersihin.id` | `password123` | Antrean Mesin Cuci & Setrika |
| **PELANGGAN** | `andipratama` | `andi.pratama@email.com` / `081234567821` | `password123` | Tracking Pesanan Real-time, Riwayat, Profil |
| **PELANGGAN** | `rinamarlina` | `rina.marlina@example.com` / `081111111111` | `password123` | Akun Pelanggan Gold Member |

---

## 4. Konfigurasi Koneksi Database

### Konfigurasi Standar (.env)
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bersihinlaundry
```

### Konfigurasi PHP (Koneksi PDO)
```php
<?php
$host = '127.0.0.1';
$db   = 'bersihinlaundry';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     throw new \PDOException($e->getMessage(), (int)$e->getCode());
}
?>
```

