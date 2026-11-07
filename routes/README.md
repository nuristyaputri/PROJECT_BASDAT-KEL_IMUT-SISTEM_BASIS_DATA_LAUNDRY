# Dokumentasi Router Terpadu - Bersihin Laundry

Folder `routes/` menyediakan arsitektur routing terpusat untuk mempermudah alur autentikasi dan navigasi dashboard bagi masing-masing aktor (Pemilik, Pegawai, dan Pelanggan).

---

## 1. Daftar Berkas Router

| Berkas | Lingkungan | Deskripsi |
|---|---|---|
| [`auth.js`](file:///c:/Universitas%20Pancasila/Semester%203/Basis%20Data/PROJECT_BASDAT-KEL_IMUT-SISTEM_BASIS_DATA_LAUNDRY/routes/auth.js) | Node.js / Express | Router login terpadu yang memvalidasi akun dan mengembalikan URL tujuan dashboard |
| [`auth.php`](file:///c:/Universitas%20Pancasila/Semester%203/Basis%20Data/PROJECT_BASDAT-KEL_IMUT-SISTEM_BASIS_DATA_LAUNDRY/routes/auth.php) | PHP / Apache (XAMPP) | Router PHP native yang terhubung ke MySQL database `bersihinlaundry` |
| [`pelanggan.js`](file:///c:/Universitas%20Pancasila/Semester%203/Basis%20Data/PROJECT_BASDAT-KEL_IMUT-SISTEM_BASIS_DATA_LAUNDRY/routes/pelanggan.js) | Node.js / Express | Endpoint data pesanan dan profil untuk portal pelanggan |
| [`pegawai.js`](file:///c:/Universitas%20Pancasila/Semester%203/Basis%20Data/PROJECT_BASDAT-KEL_IMUT-SISTEM_BASIS_DATA_LAUNDRY/routes/pegawai.js) | Node.js / Express | Endpoint operasional kasir dan pembaruan status cucian |
| [`pemilik.js`](file:///c:/Universitas%20Pancasila/Semester%203/Basis%20Data/PROJECT_BASDAT-KEL_IMUT-SISTEM_BASIS_DATA_LAUNDRY/routes/pemilik.js) | Node.js / Express | Endpoint monitoring omzet, data staf, dan katalog layanan |
| [`index.js`](file:///c:/Universitas%20Pancasila/Semester%203/Basis%20Data/PROJECT_BASDAT-KEL_IMUT-SISTEM_BASIS_DATA_LAUNDRY/routes/index.js) | Node.js / Express | Induk router yang menggabungkan seluruh sub-router |

---

## 2. Cara Kerja Alur Login Terpadu (Unified Login)

1. Pengguna membuka portal login tunggal: [`login.html`](file:///c:/Universitas%20Pancasila/Semester%203/Basis%20Data/PROJECT_BASDAT-KEL_IMUT-SISTEM_BASIS_DATA_LAUNDRY/login.html).
2. Pengguna dapat memilih tab aktor (**Pelanggan**, **Pegawai**, atau **Pemilik**), atau langsung mengetik username / email mereka.
3. Form mengirim permintaan POST ke router autentikasi:
   * **Node.js**: `POST /api/auth/login`
   * **PHP (XAMPP)**: `POST routes/auth.php`
4. Router memeriksa tabel `users` di basis data MySQL:
   * Jika pengguna memiliki peran `PEMILIK`, diarahkan ke `PEMILIK/dashboard.html`.
   * Jika pengguna memiliki peran `PEGAWAI`, diarahkan ke `PEGAWAI/dashboard.html`.
   * Jika pengguna memiliki peran `PELANGGAN`, diarahkan ke `PELANGGAN/dashboard.html`.
5. Sistem juga dilengkapi mode demo *standalone* (tetap dapat login dan berpindah dashboard walau server backend belum dinyalakan).

