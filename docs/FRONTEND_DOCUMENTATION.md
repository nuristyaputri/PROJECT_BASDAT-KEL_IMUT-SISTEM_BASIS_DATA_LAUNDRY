# DOKUMENTASI FRONTEND - SISTEM CLOUDLAUNDRY / BERSIHIN LAUNDRY

Dokumen ini menyajikan analisis komprehensif seluruh antarmuka pengguna (Frontend), skrip logika klien (JavaScript), serta integrasi komunikasi data dengan REST API Backend pada sistem **CloudLaundry / BersihIn Laundry**.

---

## 1. Arsitektur Frontend & Pola Desain Klien

Sistem antarmuka CloudLaundry dibangun menggunakan arsitektur web modern berbasis **Vanilla HTML5, Tailwind CSS (via CDN), Lucide Icons, Google Fonts (Poppins), serta Vanilla JavaScript (ES6+)**.

### 1.1 Pola Komunikasi Jaringan (Fetch API & Asinkron)
- Seluruh permintaan HTTP ke backend dijalankan melalui native `fetch()` API yang dibungkus di dalam fungsi-fungsi asinkron (`async/await`).
- Request HTTP yang membutuhkan hak akses dilindungi dengan menyertakan header otorisasi standar:
  ```javascript
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  }
  ```
- Respons API dari backend diterima dalam format JSON (`await response.json()`).

### 1.2 Manajemen Autentikasi & Penyimpanan Sesi
Sistem menggunakan `localStorage` (dengan fallback ke `sessionStorage`) untuk mengelola sesi pengguna:
1. `bersihin_token` / `bersihin_staff_token` / `bersihin_owner_token`: Menyimpan JSON Web Token (JWT) yang didapat saat login.
2. `bersihin_user` / `bersihin_staff_user` / `bersihin_owner_user`: Menyimpan objek profil pengguna terotentikasi dalam format string JSON (`id`, `nama`, `email`, `role`, dll.).
3. `bersihin_active_role`: Menandai peran aktif (`pelanggan`, `pegawai`, atau `pemilik`).

### 1.3 Mekanisme Mock / Hybrid Local Data Store
Frontend CloudLaundry mengimplementasikan mekanisme ketahanan operasional:
- Apabila backend API aktif dan database MySQL terhubung, aplikasi memprioritaskan data live melalui REST API.
- Apabila koneksi backend terputus, endpoint mengembalikan galat, atau sistem diuji secara offline, sistem frontend menyediakan fallback ke data lokal (`localStorage`) seperti:
  - `bersihin_unified_orders`: Sinkronisasi pesanan antar role.
  - `bersihin_transactions`: Data riwayat pembayaran dan transaksi.
  - `bersihin_orders`: Data pesanan pelanggan lokal.
  - `bersihin_customers`: Data direktori pelanggan.
  - `bersihin_services`: Data katalog layanan laundry.

---

## 2. Struktur Modul Frontend & Pembagian Peran

Aplikasi terbagi menjadi 4 area utama:
1. **Root (Landing & Otentikasi)**: Akses publik untuk login, registrasi, dan onboarding.
2. **Area Pelanggan (`PELANGGAN/`)**: Portal mandiri bagi pelanggan laundry untuk melihat katalog, membuat pesanan, mengunggah bukti bayar QRIS, melacak status pengerjaan, dan melihat riwayat/invoice.
3. **Area Pegawai (`PEGAWAI/`)**: Portal operasional bagi staf kasir dan staf produksi laundry untuk mengelola antrean cucian, mengubah status progres (Diterima, Dicuci, Disetrika, Selesai), memeriksa transaksi, memverifikasi pembayaran, dan mencetak struk kasir.
4. **Area Pemilik (`PEMILIK/`)**: Portal manajemen eksekutif untuk melihat analitik omset, mengelola data master staf pegawai, data pelanggan, tarif katalog layanan, serta laporan rekap keuangan.

---

## 3. Dokumentasi Halaman Publik / Root

### 3.1 `index.html` (Landing Page)
- **Role**: Publik / Pengunjung Tanpa Login.
- **Tujuan**: Halaman muka (landing page) promosi BersihIn Laundry yang memperkenalkan fitur layanan, pricelist, keunggulan, serta tombol akses masuk sistem.
- **Fitur**: Navigasi ke form login, hero section, perkenalan jenis layanan (Kiloan, Satuan, Express, Sepatu).
- **Endpoint API**: Tidak memanggil endpoint API langsung (konten presentasional).
- **Status Integrasi**: `TERINTEGRASI` (Sebagai gerbang awal navigasi).

### 3.2 `login.html` (Unified Authentication Portal)
- **Role**: Publik / Seluruh Pengguna (Pelanggan, Pegawai, Pemilik).
- **Tujuan**: Pusat gerbang autentikasi tunggal (Unified Login) dan pendaftaran akun pelanggan baru.
- **Fitur**:
  - Tab pilihan peran: Pelanggan, Pegawai, Pemilik.
  - Form Login: Input email/username dan password.
  - Form Registrasi: Khusus pelanggan untuk mendaftar akun baru (nama lengkap, no. telepon, email, password, konfirmasi password).
  - Tampilkan/sembunyikan password (eye toggle icon).
- **Data yang Dikirim**:
  - Login: `{ email, password, role }`
  - Register: `{ nama_lengkap, email, no_hp, password, alamat }`
- **Endpoint API yang Dipanggil**:
  - `POST /api/auth/login` (atau `/auth/login`)
  - `POST /api/auth/register` (atau `/auth/register`)
- **Penyimpanan Klien**:
  - Menyimpan JWT token ke `bersihin_token` dan objek pengguna ke `bersihin_user`.
- **Navigasi Pasca Login**:
  - Role `pelanggan` -> diarahkan ke `PELANGGAN/dashboard.html`
  - Role `pegawai` -> diarahkan ke `PEGAWAI/dashboard.html`
  - Role `pemilik` -> diarahkan ke `PEMILIK/dashboard.html`
- **Status Integrasi**: `TERINTEGRASI`.

---

## 4. Dokumentasi Halaman Portal Pegawai (`PEGAWAI/`)

Logika JavaScript utama untuk seluruh halaman pegawai dikonsolidasikan pada skrip `JS/pegawai.js` dan inline script pendukung di setiap file HTML.

### 4.1 `PEGAWAI/dashboard.html`
- **Role**: Pegawai.
- **Tujuan**: Pusat kendali kerja harian pegawai, menampilkan ringkasan beban kerja dan antrean aktif.
- **Fitur**:
  - Statistik ringkasan (Pesanan Baru, Sedang Dicuci, Siap Ambil, Total Hari Ini).
  - Daftar antrean cucian terbaru.
  - Quick action update status pesanan langsung.
  - Progres shift pegawai.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pegawai/dashboard` (Statistik operasional hari ini)
  - `GET /api/pegawai/pesanan` (Daftar antrean aktif)
- **Status Integrasi**: `TERINTEGRASI` (Didukung fallback `localStorage`).

### 4.2 `PEGAWAI/datapesanan.html`
- **Role**: Pegawai.
- **Tujuan**: Menampilkan seluruh data pesanan cucian yang masuk ke sistem.
- **Fitur**:
  - Tabel master pesanan lengkap dengan nomor nota/invoice, nama pelanggan, layanan, berat/kuantitas, total tagihan, dan status pengerjaan.
  - Filter berdasarkan status (Semua, Menunggu, Proses, Selesai, Diambil).
  - Pencarian berdasarkan nama pelanggan atau nomor pesanan.
  - Tombol aksi menuju detail pesanan dan update status.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pegawai/pesanan`
- **Status Integrasi**: `TERINTEGRASI`.

### 4.3 `PEGAWAI/statuspesanan.html`
- **Role**: Pegawai.
- **Tujuan**: Modul interaktif khusus untuk memperbarui tahapan pengerjaan laundry secara real-time.
- **Fitur**:
  - Mengubah status pesanan: `menunggu`, `proses` (dicuci/disetrika), `siap_diambil`, `selesai`, `dibatalkan`.
  - Input catatan produksi (misal: "baju putih dipisah", "noda membandel telah dihilangkan").
- **Data yang Dikirim**:
  - Payload: `{ status_pesanan, catatan }`
- **Endpoint API yang Dipanggil**:
  - `PUT /api/pegawai/pesanan/:id/status` (atau `PATCH /api/pegawai/pesanan/:id/status`)
- **Status Integrasi**: `TERINTEGRASI`.

### 4.4 `PEGAWAI/datatransaksi.html`
- **Role**: Pegawai.
- **Tujuan**: Menampilkan catatan transaksi pembayaran yang dilakukan oleh pelanggan.
- **Fitur**:
  - Menampilkan daftar transaksi masuk, metode pembayaran (Tunai/COD vs QRIS), dan status verifikasi pembayaran (`lunas`, `menunggu_verifikasi`, `belum_lunas`).
  - Verifikasi manual pembayaran QRIS.
  - Paginasi data dinamis ("Menampilkan X dari Y data").
- **Endpoint API yang Dipanggil**:
  - `GET /api/pegawai/transaksi`
  - `PUT /api/pegawai/pembayaran/:id/verifikasi`
- **Status Integrasi**: `TERINTEGRASI`.

### 4.5 `PEGAWAI/datapelanggan.html` & `PEGAWAI/detailpelanggan.html`
- **Role**: Pegawai.
- **Tujuan**: Melihat direktori pelanggan terdaftar dan riwayat cucian per pelanggan.
- **Fitur**:
  - Pencarian pelanggan berdasarkan nama atau nomor telepon.
  - Menampilkan total pesanan yang pernah dibuat oleh pelanggan tersebut.
  - Detail riwayat pemesanan pelanggan.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pegawai/pelanggan`
  - `GET /api/pegawai/pelanggan/:id`
- **Status Integrasi**: `TERINTEGRASI`.

### 4.6 `PEGAWAI/detailpesanan.html`
- **Role**: Pegawai.
- **Tujuan**: Menampilkan rincian komprehensif satu transaksi pesanan cucian.
- **Fitur**:
  - Informasi rincian pakaian/layanan yang dipilih.
  - Bobot timbangan kilogram dan harga satuan.
  - Status pembayaran dan status pengerjaan.
  - Tombol cetak struk kasir.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pegawai/pesanan/:id`
- **Status Integrasi**: `TERINTEGRASI`.

### 4.7 `PEGAWAI/invoice.html`
- **Role**: Pegawai.
- **Tujuan**: Tampilan invoice digital resmi dan bukti pemeriksaan kasir.
- **Fitur**:
  - Layout faktur siap cetak untuk kasir.
  - Tampilan otomatis komponen pembayaran:
    - Jika pembayaran **QRIS**: Menampilkan preview foto bukti transfer/struk pembayaran digital berserta status verifikasi.
    - Jika pembayaran **Tunai (COD)**: Menampilkan pemberitahuan bahwa pembayaran dilakukan tunai saat penyerahan cucian.
  - Tombol **"Cetak Struk Kasir"** yang memicu `window.print()` dengan CSS khusus struk thermal.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pegawai/pesanan/:id`
- **Status Integrasi**: `TERINTEGRASI`.

### 4.8 `PEGAWAI/profil.html`, `editprofil.html`, `password.html`
- **Role**: Pegawai.
- **Tujuan**: Pengelolaan data akun dan keamanan mandiri staf pegawai.
- **Fitur**:
  - Menampilkan biodata staf, shift kerja, email, no HP.
  - Form ubah nama, nomor kontak.
  - Form ubah kata sandi (password lama, password baru, konfirmasi).
- **Endpoint API yang Dipanggil**:
  - `GET /api/pegawai/profil`
  - `PUT /api/pegawai/profil`
  - `PUT /api/pegawai/password`
- **Status Integrasi**: `TERINTEGRASI`.

---

## 5. Dokumentasi Halaman Portal Pelanggan (`PELANGGAN/`)

Logika JavaScript klien untuk seluruh halaman portal pelanggan dikelola melalui skrip `JS/pelanggan.js`.

### 5.1 `PELANGGAN/dashboard.html`
- **Role**: Pelanggan.
- **Tujuan**: Halaman beranda pelanggan yang menyajikan status aktif cucian yang sedang dikerjakan.
- **Fitur**:
  - Kartu ucapan selamat datang personal dengan nama pengguna.
  - Widget pelacakan langsung cucian aktif (Status step: Menunggu -> Cuci -> Setrika -> Siap Ambil).
  - Quick summary: Total Cucian Aktif, Total Pengeluaran Bulan Ini.
  - Tombol pemesanan cepat ("Pesan Sekarang").
- **Endpoint API yang Dipanggil**:
  - `GET /api/pelanggan/dashboard`
  - `GET /api/pelanggan/pesanan`
- **Status Integrasi**: `TERINTEGRASI`.

### 5.2 `PELANGGAN/layanan.html`
- **Role**: Pelanggan.
- **Tujuan**: Katalog layanan laundry yang tersedia di BersihIn Laundry.
- **Fitur**:
  - Menampilkan kartu layanan (Cuci Komplit Kiloan, Cuci Kering Setrika, Cuci Satuan Jas/Bedcover, Cuci Sepatu, Express).
  - Menampilkan deskripsi, estimasi waktu pengerjaan, dan tarif per kg / per pcs.
  - Tombol "Pilih Layanan" yang mengarahkan langsung ke form order dengan autofill layanan terpilih.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pelanggan/layanan`
- **Status Integrasi**: `TERINTEGRASI`.

### 5.3 `PELANGGAN/pesanan.html`
- **Role**: Pelanggan.
- **Tujuan**: Formulir pembuatan pesanan laundry baru oleh pelanggan.
- **Fitur**:
  - Pemilihan layanan laundry (dropdown dinamis dari API/database).
  - Estimasi kuantitas / berat cucian (kg atau pcs).
  - Catatan khusus pelanggan (misal: "jangan terlalu panas saat setrika").
  - Opsi penjemputan / antar (Ambil Sendiri vs Delivery).
  - Pilihan metode pembayaran:
    - **Tunai / COD** (bayar saat serah terima).
    - **QRIS / Transfer Bank** (menampilkan QRIS barcode statis dan input unggah foto bukti transfer).
  - Konversi bukti pembayaran ke format Base64 image data string untuk disimpan ke sistem.
- **Data yang Dikirim**:
  ```json
  {
    "id_layanan": 1,
    "jumlah": 3.5,
    "catatan": "Pisahkan pakaian putih",
    "metode_pembayaran": "qris",
    "bukti_bayar": "data:image/jpeg;base64,..."
  }
  ```
- **Endpoint API yang Dipanggil**:
  - `GET /api/pelanggan/layanan` (mengambil daftar opsi)
  - `POST /api/pelanggan/pesanan` (mengirim data order baru)
- **Status Integrasi**: `TERINTEGRASI`.

### 5.4 `PELANGGAN/status.html`
- **Role**: Pelanggan.
- **Tujuan**: Pelacakan status pengerjaan laundry aktif secara real-time.
- **Fitur**:
  - Input nomor resi / kode nota pesanan atau memilih dari daftar aktif.
  - Stepper visual interaktif dengan status:
    1. Pesanan Diterima / Menunggu Konfirmasi
    2. Sedang Dicuci (Washing)
    3. Sedang Disetrika (Ironing)
    4. Selesai & Siap Diambil / Diantar
  - Rincian estimasi selesai pengerjaan.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pelanggan/pesanan/:id/status` (atau `GET /api/pelanggan/pesanan/:id`)
- **Status Integrasi**: `TERINTEGRASI`.

### 5.5 `PELANGGAN/riwayat.html`
- **Role**: Pelanggan.
- **Tujuan**: Arsip histori seluruh pesanan laundry yang pernah dibuat pelanggan.
- **Fitur**:
  - Tabel dan card list riwayat pesanan (termasuk yang sudah selesai maupun dibatalkan).
  - Filter pencarian riwayat.
  - Link menuju halaman invoice dan rincian transaksi masing-masing pesanan.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pelanggan/riwayat` (atau `GET /api/pelanggan/pesanan`)
- **Status Integrasi**: `TERINTEGRASI`.

### 5.6 `PELANGGAN/dtltransaksi.html` & `PELANGGAN/invoice.html`
- **Role**: Pelanggan.
- **Tujuan**: Menampilkan bukti faktur / nota pembayaran resmi pelanggan.
- **Fitur**:
  - Ringkasan rincian biaya: tarif dasar, berat/pcs, subtotal, diskon (jika ada), dan total pembayaran.
  - Tampilan status pembayaran (LUNAS / MENUNGGU PEMBAYARAN).
  - Tampilan bukti pembayaran QRIS jika pelanggan memilih metode transfer.
  - Tombol cetak / unduh PDF nota pembayaran.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pelanggan/pesanan/:id`
- **Status Integrasi**: `TERINTEGRASI`.

### 5.7 `PELANGGAN/profil.html`, `editprofil.html`, `password.html`
- **Role**: Pelanggan.
- **Tujuan**: Pengelolaan profil akun pelanggan, nomor telepon pengiriman, alamat domisili, dan keamanan kata sandi.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pelanggan/profil`
  - `PUT /api/pelanggan/profil`
  - `PUT /api/pelanggan/password`
- **Status Integrasi**: `TERINTEGRASI`.

---

## 6. Dokumentasi Halaman Portal Pemilik (`PEMILIK/`)

Seluruh logika frontend untuk pemilik diatur oleh skrip `JS/pemilik.js`.

### 6.1 `PEMILIK/dashboard.html`
- **Role**: Pemilik / Owner.
- **Tujuan**: Dasbor eksekutif pemantauan performa bisnis dan kesehatan finansial laundry.
- **Fitur**:
  - Metrik Utama: Total Pendapatan Bulan Ini, Total Transaksi, Pelanggan Aktif, Pesanan Aktif.
  - Grafik pertumbuhan transaksi & pendapatan bulanan.
  - Tabel 5 transaksi cucian paling baru.
  - Indikator performa operasional.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pemilik/dashboard`
  - `GET /api/pemilik/laporan/ringkasan`
- **Status Integrasi**: `TERINTEGRASI`.

### 6.2 `PEMILIK/datapegawai.html` & `PEMILIK/tambahpegawai.html`
- **Role**: Pemilik.
- **Tujuan**: Manajemen sumber daya manusia (SDM) staf kasir dan operasional laundry.
- **Fitur**:
  - Tabel daftar staf pegawai (Nama, Email, No HP, Shift Kerja, Status Aktif).
  - Form pendaftaran staf pegawai baru (`tambahpegawai.html`) lengkap dengan validasi akun.
  - Tombol ubah status aktif/nonaktif pegawai.
  - Tombol hapus pegawai.
- **Data yang Dikirim pada Tambah Pegawai**:
  ```json
  {
    "nama_lengkap": "Budi Santoso",
    "email": "budi@bersihin.com",
    "password": "Password123!",
    "no_hp": "081234567890",
    "shift": "Pagi",
    "alamat": "Jl. Mawar No. 10"
  }
  ```
- **Endpoint API yang Dipanggil**:
  - `GET /api/pemilik/pegawai`
  - `POST /api/pemilik/pegawai`
  - `DELETE /api/pemilik/pegawai/:id`
- **Status Integrasi**: `TERINTEGRASI`.

### 6.3 `PEMILIK/layananpegawai.html`, `tambahlayanan.html`, `editlayanan.html`
- **Role**: Pemilik.
- **Tujuan**: Pengelolaan master katalog layanan laundry, jenis satuan, dan tarif harga.
- **Fitur**:
  - Tabel daftar seluruh layanan laundry berserta status aktif/tersedia.
  - Form penambahan paket layanan baru: Nama Layanan, Jenis (Kiloan/Satuan), Harga per Satuan, Estimasi Jam/Hari Pengerjaan, Deskripsi.
  - Form pembaruan tarif layanan (`editlayanan.html`).
  - Hapus / nonaktifkan layanan dari sistem.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pemilik/layanan`
  - `POST /api/pemilik/layanan`
  - `PUT /api/pemilik/layanan/:id`
  - `DELETE /api/pemilik/layanan/:id`
- **Status Integrasi**: `TERINTEGRASI`.

### 6.4 `PEMILIK/datapelanggan.html` & `PEMILIK/tambahpelanggan.html`
- **Role**: Pemilik.
- **Tujuan**: Manajemen basis data pelanggan (CRM sederhana) dan pendaftaran pelanggan offline oleh admin pemilik.
- **Fitur**:
  - Direktori seluruh pelanggan yang terdaftar di sistem.
  - Riwayat total pengeluaran (Lifetime Value) dan frekuensi mencuci pelanggan.
  - Tambah data pelanggan baru secara manual.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pemilik/pelanggan`
  - `POST /api/pemilik/pelanggan`
  - `DELETE /api/pemilik/pelanggan/:id`
- **Status Integrasi**: `TERINTEGRASI`.

### 6.5 `PEMILIK/transaksi.html` & `PEMILIK/invoice.html`
- **Role**: Pemilik.
- **Tujuan**: Audit seluruh transaksi keuangan dan pemeriksaan bukti nota transaksi kasir.
- **Fitur**:
  - Menampilkan seluruh catatan pembayaran yang masuk.
  - Filter rentang tanggal transaksi dan filter metode pembayaran.
  - Akses nota/invoice lengkap setiap transaksi.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pemilik/transaksi`
  - `GET /api/pemilik/transaksi/:id`
- **Status Integrasi**: `TERINTEGRASI`.

### 6.6 `PEMILIK/laporan.html`
- **Role**: Pemilik.
- **Tujuan**: Pelaporan akuntansi dan analisis rekap pendapatan laundry.
- **Fitur**:
  - Filter laporan berdasarkan periode: Harian, Mingguan, Bulanan, atau Kustom Tanggal.
  - Rekap total omset bruto, jumlah pesanan selesai, dan rata-rata nilai transaksi.
  - Tabel rincian breakdown transaksi pada periode terpilih (disinkronkan dengan data aktual database).
  - Fitur ekspor laporan / cetak rekap pembukuan.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pemilik/laporan`
  - `GET /api/pemilik/laporan/ringkasan`
- **Status Integrasi**: `TERINTEGRASI`.

### 6.7 `PEMILIK/profil.html`, `editprofil.html`, `password.html`
- **Role**: Pemilik.
- **Tujuan**: Pengaturan akun pemilik bisnis, kontak darurat outlet, dan pembaruan password.
- **Endpoint API yang Dipanggil**:
  - `GET /api/pemilik/profil`
  - `PUT /api/pemilik/profil`
  - `PUT /api/pemilik/password`
- **Status Integrasi**: `TERINTEGRASI`.

---

## 7. Penanganan Galat & Umpan Balik Pengguna (Error Handling)

Frontend mengimplementasikan pola umpan balik pengguna yang seragam:
1. **Validasi Formulir di Sisi Klien**: Memastikan field penting (seperti format email, panjang minimal password 6 karakter, kesesuaian konfirmasi password, nomor handphone valid) diperiksa sebelum HTTP request dikirim.
2. **Visual Alert / Toast Notification**: Menampilkan pop-up notifikasi (sukses berwarna hijau, gagal/peringatan berwarna merah) saat menerima HTTP status 4xx atau 5xx dari backend.
3. **Session Expiration Interception**: Apabila backend mengembalikan respons `401 Unauthorized` atau `403 Forbidden` (misal token JWT kadaluarsa), skrip frontend otomatis menghapus token dari `localStorage` dan mengarahkan pengguna kembali ke `login.html`.

