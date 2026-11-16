# DOKUMENTASI INTEGRASI FRONTEND & BACKEND - CLOUDLAUNDRY

Dokumen ini menyajikan pemetaan komprehensif integrasi antara seluruh antarmuka pengguna (Frontend) dengan Application Programming Interface (Backend REST API) pada sistem **CloudLaundry / BersihIn Laundry**.

Dokumen ini membedah status integrasi secara faktual berdasarkan hasil audit source code, menyoroti perbedaan dan ketidaksesuaian rute (discrepancies), serta memberikan rekomendasi penyempurnaan teknis tanpa mengubah kode sumber yang ada.

---

## 1. Matriks Pemetaan Integrasi Frontend & Backend

Status Integrasi dikategorikan menjadi 4 jenis:
- **`TERINTEGRASI`**: Frontend memanggil endpoint yang aktif di backend dan memproses respons data riil dari database.
- **`TERINTEGRASI (HYBRID / DENGAN FALLBACK)`**: Frontend mencoba memanggil endpoint backend, namun menyediakan fallback ke penyimpanan lokal (`localStorage`) jika backend offline atau terjadi kegagalan jaringan.
- **`PERLU VERIFIKASI`**: Terdapat perbedaan URL atau penamaan parameter antara kamus rute frontend dengan rute backend aktif.
- **`TIDAK DIGUNAKAN`**: Endpoint atau rute lama yang tidak lagi dipanggil oleh antarmuka frontend aktif.

### 1.1 Modul Autentikasi (Publik & Universal)

| Role | Halaman Frontend | Fungsi / Komponen | HTTP Method | Endpoint Backend Aktif | Status Integrasi | Catatan Implementasi |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| Universal | `login.html` | Unified Login (Pelanggan, Pegawai, Pemilik) | `POST` | `/api/auth/login` | `TERINTEGRASI` | Header `Content-Type: application/json`. Token JWT disimpan di `localStorage.setItem('bersihin_token', data.token)`. |
| Pelanggan | `login.html` | Registrasi Akun Pelanggan Baru | `POST` | `/api/auth/register` | `TERINTEGRASI` | Membuat user di tabel `users` dan data di tabel `pelanggan`. |
| Universal | Seluruh Halaman | Validasi Token & Profil Sesi | `GET` | `/api/auth/me` | `TERINTEGRASI` | Memvalidasi keabsahan token JWT dan mengembalikan identitas pengguna. |
| Universal | Seluruh Halaman | Tombol Logout | `POST` | `/api/auth/logout` | `TERINTEGRASI` | Menghapus token dari `localStorage` dan meredireksi ke `login.html`. |
| Universal | Seluruh Halaman | Ubah Kata Sandi Akun | `PUT` | `/api/auth/change-password` | `TERINTEGRASI` | Tersedia juga endpoint spesifik per role. |

---

### 1.2 Modul Staf Pegawai (`PEGAWAI/`)

| Role | Halaman Frontend | Fungsi / Komponen | HTTP Method | Endpoint Backend Aktif | Status Integrasi | Catatan Implementasi |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| Pegawai | `dashboard.html` | Statistik Harian Operasional | `GET` | `/api/pegawai/dashboard` | `TERINTEGRASI (HYBRID)` | Menampilkan ringkasan cucian baru, proses, dan siap ambil. Memiliki fallback data lokal jika offline. |
| Pegawai | `dashboard.html` | Antrean Cucian Terkini | `GET` | `/api/pegawai/pesanan` | `TERINTEGRASI` | Menampilkan 5 antrean pesanan paling awal yang perlu dikerjakan. |
| Pegawai | `datapesanan.html` | Master Daftar Pesanan Masuk | `GET` | `/api/pegawai/pesanan` | `TERINTEGRASI` | Mengambil seluruh antrean pesanan dari database, mendukung filter status. |
| Pegawai | `detailpesanan.html` | Rincian Pesanan & Item Cucian | `GET` | `/api/pegawai/pesanan/:id` | `TERINTEGRASI` | Mengambil detail lengkap relasi tabel `pesanan` dan `detail_pesanan`. |
| Pegawai | `statuspesanan.html` | Pembaruan Status Cucian | `PUT` / `PATCH` | `/api/pegawai/pesanan/:id/status` | `TERINTEGRASI` | Memperbarui kolom `status_pesanan` dan mencatat entri di `riwayat_status`. |
| Pegawai | `datatransaksi.html` | Daftar Transaksi Keuangan | `GET` | `/api/pegawai/transaksi` | `TERINTEGRASI` | Mengambil data pembayaran dari tabel `pembayaran` dan `pesanan`. |
| Pegawai | `datatransaksi.html` | Verifikasi Pembayaran QRIS/Tunai | `PUT` | `/api/pegawai/pembayaran/:id/verifikasi` | `TERINTEGRASI` | Mengubah status pembayaran menjadi `lunas` dan mencatat waktu verifikasi. |
| Pegawai | `invoice.html` | Cetak Struk Kasir & Bukti QRIS | `GET` | `/api/pegawai/pesanan/:id` | `TERINTEGRASI` | Merender data nota kasir, menampilkan bukti foto QRIS jika pembayaran non-tunai. |
| Pegawai | `datapelanggan.html` | Direktori Pelanggan | `GET` | `/api/pegawai/pelanggan` | `TERINTEGRASI` | Menampilkan daftar pelanggan yang pernah bertransaksi. |
| Pegawai | `detailpelanggan.html` | Detail & Riwayat Pesanan Pelanggan | `GET` | `/api/pegawai/pelanggan/:id` | `TERINTEGRASI` | Riwayat pesanan spesifik satu pelanggan. |
| Pegawai | `profil.html` | Informasi Profil Pegawai | `GET` | `/api/pegawai/profil` | `TERINTEGRASI` | Membaca biodata dan shift kerja pegawai login. |
| Pegawai | `editprofil.html` | Perbarui Profil Pegawai | `PUT` | `/api/pegawai/profil` | `TERINTEGRASI` | Memperbarui nama, telepon, dan alamat pegawai. |
| Pegawai | `password.html` | Ubah Password Pegawai | `PUT` | `/api/pegawai/password` | `TERINTEGRASI` | Mengganti kata sandi staf. |

---

### 1.3 Modul Pelanggan (`PELANGGAN/`)

| Role | Halaman Frontend | Fungsi / Komponen | HTTP Method | Endpoint Backend Aktif | Status Integrasi | Catatan Implementasi |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| Pelanggan | `dashboard.html` | Statistik & Status Cucian Aktif | `GET` | `/api/pelanggan/dashboard` | `TERINTEGRASI (HYBRID)` | Menampilkan widget status progres cucian terkini pelanggan. |
| Pelanggan | `layanan.html` | Katalog Tarif & Jenis Layanan | `GET` | `/api/pelanggan/layanan` | `TERINTEGRASI` | Mengambil data aktif dari tabel `layanan` (harga per satuan/kg). |
| Pelanggan | `pesanan.html` | Buat Pesanan Baru | `POST` | `/api/pelanggan/pesanan` | `TERINTEGRASI` | Mengirim payload order: layanan, jumlah, catatan, metode bayar, dan bukti bayar QRIS. |
| Pelanggan | `status.html` | Pelacakan Real-time Pesanan | `GET` | `/api/pelanggan/pesanan/:id/status` | `TERINTEGRASI` | Mengambil data timeline status dari tabel `riwayat_status`. |
| Pelanggan | `riwayat.html` | Riwayat Pesanan Selesai | `GET` | `/api/pelanggan/riwayat` | `TERINTEGRASI` | Mengambil histori pesanan yang telah diselesaikan. |
| Pelanggan | `invoice.html` | Tampilan Faktur / Nota Digital | `GET` | `/api/pelanggan/pesanan/:id` | `TERINTEGRASI` | Menampilkan nota resmi transaksi beserta status lunas. |
| Pelanggan | `dtltransaksi.html` | Rincian Transaksi & Metode Bayar | `GET` | `/api/pelanggan/pesanan/:id` | `TERINTEGRASI` | Menampilkan detail pembayaran dan rincian cucian. |
| Pelanggan | `profil.html` | Informasi Profil Akun | `GET` | `/api/pelanggan/profil` | `TERINTEGRASI` | Memuat data nama, no hp, alamat domisili. |
| Pelanggan | `editprofil.html` | Ubah Biodata & Alamat | `PUT` | `/api/pelanggan/profil` | `TERINTEGRASI` | Memperbarui identitas pelanggan di database. |
| Pelanggan | `password.html` | Ganti Kata Sandi Pelanggan | `PUT` | `/api/pelanggan/password` | `TERINTEGRASI` | Validasi password lama dan update ke password baru. |

---

### 1.4 Modul Pemilik (`PEMILIK/`)

| Role | Halaman Frontend | Fungsi / Komponen | HTTP Method | Endpoint Backend Aktif | Status Integrasi | Catatan Implementasi |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| Pemilik | `dashboard.html` | Metrik Eksekutif & Omset | `GET` | `/api/pemilik/dashboard` | `TERINTEGRASI (HYBRID)` | Menampilkan total omset bulan ini, total pesanan, grafik pertumbuhan. |
| Pemilik | `datapegawai.html` | Manajemen Daftar Pegawai | `GET` | `/api/pemilik/pegawai` | `TERINTEGRASI` | Menampilkan tabel seluruh staf pegawai laundry. |
| Pemilik | `tambahpegawai.html` | Pendaftaran Staf Baru | `POST` | `/api/pemilik/pegawai` | `TERINTEGRASI` | Menambahkan akun user (role: pegawai) dan data shift kerja. |
| Pemilik | `datapegawai.html` | Hapus / Nonaktifkan Pegawai | `DELETE` | `/api/pemilik/pegawai/:id` | `TERINTEGRASI` | Menghapus atau menonaktifkan akun staf. |
| Pemilik | `datapelanggan.html` | CRM Master Pelanggan | `GET` | `/api/pemilik/pelanggan` | `TERINTEGRASI` | Membaca daftar seluruh pelanggan dan akumulasi transaksi. |
| Pemilik | `tambahpelanggan.html` | Tambah Pelanggan Baru | `POST` | `/api/pemilik/pelanggan` | `TERINTEGRASI` | Mendaftarkan pelanggan via portal pemilik. |
| Pemilik | `datapelanggan.html` | Hapus Data Pelanggan | `DELETE` | `/api/pemilik/pelanggan/:id` | `TERINTEGRASI` | Menghapus pelanggan dari database. |
| Pemilik | `layananpegawai.html` | Master Katalog Layanan | `GET` | `/api/pemilik/layanan` | `TERINTEGRASI` | Mengambil seluruh katalog layanan dan tarif per satuan. |
| Pemilik | `tambahlayanan.html` | Tambah Layanan Baru | `POST` | `/api/pemilik/layanan` | `TERINTEGRASI` | Menambahkan jenis layanan baru ke tabel `layanan`. |
| Pemilik | `editlayanan.html` | Ubah Tarif & Deskripsi Layanan | `PUT` | `/api/pemilik/layanan/:id` | `TERINTEGRASI` | Memperbarui tarif per kg atau estimasi durasi kerja. |
| Pemilik | `layananpegawai.html` | Hapus Layanan | `DELETE` | `/api/pemilik/layanan/:id` | `TERINTEGRASI` | Menghapus opsi layanan dari database. |
| Pemilik | `transaksi.html` | Audit Transaksi Pembayaran | `GET` | `/api/pemilik/transaksi` | `TERINTEGRASI` | Monitoring seluruh arus kas masuk dari pelanggan. |
| Pemilik | `laporan.html` | Laporan Keuangan & Rekap Periodik | `GET` | `/api/pemilik/laporan` | `TERINTEGRASI` | Laporan akuntansi berdasarkan filter tanggal harian/bulanan. |
| Pemilik | `laporan.html` | Ringkasan Analitik Laporan | `GET` | `/api/pemilik/laporan/ringkasan` | `TERINTEGRASI` | Ringkasan statistik performa omset dan rata-rata order. |
| Pemilik | `profil.html` | Profil Pemilik | `GET` | `/api/pemilik/profil` | `TERINTEGRASI` | Memuat data akun pemilik. |
| Pemilik | `editprofil.html` | Update Profil Pemilik | `PUT` | `/api/pemilik/profil` | `TERINTEGRASI` | Memperbarui kontak dan profil pemilik. |
| Pemilik | `password.html` | Ubah Password Pemilik | `PUT` | `/api/pemilik/password` | `TERINTEGRASI` | Memperbarui kata sandi pemilik. |

---

## 2. Analisis Ketidaksesuaian Rute & Potensi Masalah (Discrepancies)

Berdasarkan audit mendalam kode sumber antara JavaScript frontend (`JS/pelanggan.js`, `JS/pemilik.js`, `JS/pegawai.js`) dengan rute aktif backend (`backend/routes/`), ditemukan beberapa ketidaksesuaian arsitektural:

### 2.1 Ketidaksinkronan Objek `API_ROUTES` di Skrip Frontend
Pada file `JS/pelanggan.js` dan `JS/pemilik.js`, didefinisikan sebuah objek konfigurasi rute (`API_ROUTES`), namun rute di dalamnya menggunakan istilah bahasa Inggris (versi rancangan awal), sementara router backend menggunakan bahasa Indonesia yang konsisten:

#### Kasus Pada `JS/pelanggan.js`:
- Objek `API_ROUTES` mendeklarasikan:
  - `orders: '/api/pelanggan/orders'` $\rightarrow$ **Rute Backend Aktif:** `/api/pelanggan/pesanan`
  - `profile: '/api/pelanggan/profile'` $\rightarrow$ **Rute Backend Aktif:** `/api/pelanggan/profil`
  - `updateProfile: '/api/pelanggan/profile/update'` $\rightarrow$ **Rute Backend Aktif:** `PUT /api/pelanggan/profil`
  - `services: '/api/pelanggan/services'` $\rightarrow$ **Rute Backend Aktif:** `/api/pelanggan/layanan`
  - `tracking: '/api/pelanggan/tracking'` $\rightarrow$ **Rute Backend Aktif:** `/api/pelanggan/pesanan/:id/status`
- **Dampak & Mitigasi Aktual Saat Ini:**
  Beberapa fungsi pemanggil di skrip pelanggan telah langsung melakukan `fetch('/api/pelanggan/pesanan')` secara eksplisit, atau mengandalkan mekanisme fallback ke `localStorage` (`bersihin_unified_orders`) saat endpoint berbahasa Inggris menghasilkan status HTTP `404 Not Found`.

#### Kasus Pada `JS/pemilik.js`:
- Objek `API_ROUTES` mendeklarasikan:
  - `employees: '/api/pemilik/employees'` $\rightarrow$ **Rute Backend Aktif:** `/api/pemilik/pegawai`
  - `services: '/api/pemilik/services'` $\rightarrow$ **Rute Backend Aktif:** `/api/pemilik/layanan`
  - `transactions: '/api/pemilik/transactions'` $\rightarrow$ **Rute Backend Aktif:** `/api/pemilik/transaksi`
  - `reports: '/api/pemilik/reports'` $\rightarrow$ **Rute Backend Aktif:** `/api/pemilik/laporan`
- **Dampak & Mitigasi Aktual Saat Ini:**
  Logika fungsi CRUD di `JS/pemilik.js` telah memiliki mapping otomatis dan fallback ke data lokal `bersihin_unified_orders` dan `bersihin_services` sehingga antarmuka tetap berjalan mulus meskipun terjadi perbedaan kamus konstanta.

### 2.2 Keberadaan Rute Inaktif di Folder Root (`/routes`)
- Folder `/routes` di direktori utama proyek (`routes/auth.js`, `routes/pegawai.js`, `routes/pelanggan.js`, `routes/pemilik.js`, `routes/index.js`, dan `routes/auth.php`) adalah rute legacy independen yang **TIDAK diimpor sama sekali** oleh server aktif `backend/server.js`.
- Semua permintaan API yang sah diarahkan oleh Express melalui `backend/routes/index.js`. Rute di root bertindak sebagai artefak historis.

### 2.3 Perbedaan Format Data Respons (`res.data` vs `res`)
- Beberapa fungsi pembantu di frontend mengharapkan data dibungkus dalam `{ success: true, data: [...] }`.
- Backend controller CloudLaundry telah menerapkan pembungkusan JSON standar tersebut dengan konsisten, namun beberapa handler lama pada antarmuka memeriksa kondisi ganda:
  ```javascript
  const records = result.data || result.pesanan || result;
  ```
  Hal ini merupakan praktik defensive programming yang baik untuk menjaga kestabilan tampilan.

---

## 3. Rekomendasi Penyempurnaan Teknis (Tanpa Mengubah Source Code Saat Ini)

Untuk penyempurnaan tahap rilis produksi berikutnya, berikut rekomendasi perbaikan yang disarankan untuk pengembang:

1. **Penyelarasan Kamus `API_ROUTES`**:
   - Memperbarui konstanta `API_ROUTES` pada `JS/pelanggan.js` dan `JS/pemilik.js` agar seratus persen mengacu pada endpoint berbahasa Indonesia yang terpasang di `backend/routes/` (`/api/pelanggan/pesanan`, `/api/pemilik/pegawai`, dll.).
2. **Penghapusan / Pengarsipan Folder `/routes` di Root**:
   - Memindahkan folder `/routes` di root ke direktori terpisah (misal `archive/routes_legacy/`) untuk menghindari kebingungan bagi anggota tim pengembang atau asisten lab yang sedang memeriksa project.
3. **Penyatuan Kunci Penyimpanan Token (`Auth Storage Key`)**:
   - Saat ini terdapat pemisahan antara `bersihin_token`, `bersihin_staff_token`, dan `bersihin_owner_token`. Disarankan untuk mengonsolidasikan ke satu kunci universal `bersihin_token` dengan mengandalkan payload decoded JWT (`role: 'pelanggan' | 'pegawai' | 'pemilik'`) sebagai verifikator tunggal otoritas akses.
4. **Validasi File Bukti Bayar QRIS**:
   - Pada `PELANGGAN/pesanan.html`, bukti bayar disimpan dalam bentuk Base64 string pada kolom database text/longtext. Untuk performa optimal dalam jangka panjang, disarankan untuk mengimplementasikan middleware upload file (seperti `multer`) agar gambar bukti transfer disimpan di penyimpanan statis server (`uploads/bukti/`) dan database hanya menyimpan nama berkas / URL-nya.

