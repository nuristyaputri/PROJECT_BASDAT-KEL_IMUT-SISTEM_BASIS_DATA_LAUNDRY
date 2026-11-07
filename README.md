
# Sistem Basis Data Laundry

## 1. Deskripsi Proyek

Proyek ini membahas rancangan sistem basis data untuk usaha laundry. Sistem ini dibuat untuk membantu pencatatan data pelanggan, pegawai, layanan laundry, dan transaksi agar lebih teratur dan mudah dicari.

## 2. Anggota Kelompok

1. Nazwa Aulia Hanifa — 4525210053
2. Nevilla Ghilar Apryanti — 4525210054
3. Nuristya Putri Agustina — 4525210055
4. Ratu Annisaa Nabila Meysun — 4525210063
5. Tazkia Putri Arsyad — 4525210073
6. Septia Fitri Rahmadhani — 4525210097


## Link Pengumpulan Tugas

Semua file dan hasil pengerjaan tugas Sistem Basis Data Laundry dapat diakses melalui link Google Drive berikut.

**Folder Google Drive:** [Klik di sini untuk melihat semua file tugas](https://drive.google.com/drive/folders/1P9mAvXEskiaN0fCUKwG26f0a9xHlJnWL?usp=sharing)

## 4. Product Requirements Document (PRD)

### 4.1 Latar Belakang

Usaha laundry memiliki banyak data yang perlu dicatat, mulai dari data pelanggan, jenis layanan, pegawai, sampai transaksi. Jika pencatatan masih dilakukan secara manual, data bisa tercampur dan proses pencarian informasi menjadi lebih sulit.

Oleh karena itu, diperlukan rancangan sistem basis data laundry yang dapat membantu penyimpanan data dengan lebih terstruktur.

### 4.2 Tujuan Sistem

Tujuan dari sistem basis data laundry ini adalah:
- Menyimpan data pelanggan dengan rapi.
- Menyimpan data pegawai yang bekerja di laundry.
- Mengelola informasi layanan dan harga laundry.
- Mencatat transaksi laundry dari pakaian masuk sampai selesai.
- Mencatat berat cucian dan biaya layanan.
- Mempermudah pencarian data transaksi pelanggan.

### 4.3 Pengguna Sistem

Pengguna yang berkaitan dengan sistem ini adalah:

- **Pegawai laundry:** mencatat data pelanggan, layanan, transaksi, dan status cucian.
- **Pemilik laundry:** memeriksa transaksi dan informasi pembayaran.
- **Pelanggan:** sebagai pihak yang menggunakan layanan laundry dan datanya dicatat dalam sistem.

### 4.4 Ruang Lingkup

Sistem yang dirancang meliputi:
- Pengelolaan data pelanggan.
- Pengelolaan data pegawai.
- Pengelolaan data layanan laundry.
- Pencatatan transaksi laundry.
- Pencatatan detail layanan pada setiap transaksi.
- Pencatatan status pengerjaan dan total pembayaran.

Proyek ini berfokus pada analisis kebutuhan dan rancangan basis data, bukan aplikasi laundry yang sudah siap digunakan.

### 4.5 Kebutuhan Fungsional

| Kode | Kebutuhan |
|---|---|
| FR-01 | Sistem dapat menyimpan data pelanggan. |
| FR-02 | Sistem dapat menyimpan data pegawai. |
| FR-03 | Sistem dapat menyimpan jenis layanan, harga per kilogram, dan estimasi pengerjaan. |
| FR-04 | Sistem dapat mencatat transaksi laundry. |
| FR-05 | Sistem dapat mencatat berat cucian, harga, dan subtotal layanan. |
| FR-06 | Sistem dapat menyimpan status transaksi, seperti diproses, selesai, atau diambil. |
| FR-07 | Satu pelanggan dapat melakukan beberapa transaksi. |
| FR-08 | Satu pegawai dapat menangani beberapa transaksi. |
| FR-09 | Satu transaksi dapat memiliki beberapa detail layanan. |
| FR-10 | Data transaksi dapat dicari berdasarkan nomor transaksi atau pelanggan. |

### 4.6 Kebutuhan Nonfungsional

- Data disimpan dengan struktur yang jelas dan konsisten.
- Setiap entitas utama memiliki primary key sebagai identitas unik.
- Hubungan antarentitas harus sesuai dengan rancangan ERD.
- Nama tabel dan atribut dibuat agar mudah dipahami.
- Rancangan basis data dapat dikembangkan jika ada kebutuhan baru.

### 4.7 Rancangan Entitas dan Atribut

**1. Pelanggan**
- Kode_Pelanggan (Primary Key)
- Nama_Pelanggan
- No_Telp
- Alamat

**2. Pegawai**
- Kode_Pegawai (Primary Key)
- Nama_Pegawai
- Jabatan
- No_Telp

**3. Layanan**
- Kode_Layanan (Primary Key)
- Nama_Layanan
- Harga_Per_Kg
- Estimasi_Hari

**4. Transaksi**
- No_Transaksi (Primary Key)
- Tanggal_Masuk
- Tanggal_Selesai
- Status
- Total_Bayar
- Kode_Pelanggan (Foreign Key)
- Kode_Pegawai (Foreign Key)

**5. Detail_Transaksi**
- No_Transaksi (Foreign Key)
- Kode_Layanan (Foreign Key)
- Berat
- Harga
- Subtotal

Pada rancangan Detail_Transaksi, No_Transaksi dan Kode_Layanan dapat digunakan sebagai primary key gabungan (composite key), sesuai dengan rancangan schema diagram.

### 4.8 Aturan Bisnis

1. Setiap pelanggan memiliki kode pelanggan yang berbeda.
2. Setiap pegawai memiliki kode pegawai yang berbeda.
3. Setiap layanan memiliki kode layanan yang berbeda.
4. Setiap transaksi memiliki nomor transaksi yang unik.
5. Setiap transaksi berkaitan dengan satu pelanggan.
6. Setiap transaksi ditangani oleh satu pegawai.
7. Satu transaksi dapat memiliki beberapa detail layanan.
8. Satu layanan dapat digunakan dalam banyak detail transaksi.
9. Total pembayaran dihitung berdasarkan subtotal layanan yang digunakan.

### 4.9 Relationship dan Kardinalitas

| Relationship | Kardinalitas | Penjelasan |
|---|---|---|
| Pelanggan — Melakukan — Transaksi | 1:N | Satu pelanggan dapat melakukan banyak transaksi. |
| Pegawai — Menangani — Transaksi | 1:N | Satu pegawai dapat menangani banyak transaksi. |
| Transaksi — Memiliki — Detail_Transaksi | 1:N | Satu transaksi dapat memiliki beberapa detail transaksi. |
| Layanan — Digunakan Pada — Detail_Transaksi | 1:N | Satu layanan dapat digunakan dalam banyak detail transaksi. |

### 4.10 Kriteria Penerimaan

Rancangan sistem dinyatakan sesuai dengan kebutuhan tugas jika:
- Entitas dan atribut utama sudah dicantumkan.
- Primary key dan foreign key sudah ditentukan.
- Relationship dan kardinalitas sudah dijelaskan.
- Detail transaksi dapat menghubungkan transaksi dengan layanan.
- Nama entitas dan atribut konsisten dengan ERD dan schema diagram.

### 4.11 Batasan Sistem

Rancangan ini belum mencakup pembayaran online, notifikasi otomatis, layanan antar-jemput, akun pelanggan, atau laporan keuangan secara lengkap. Fitur tersebut dapat dikembangkan jika sistem dilanjutkan pada tahap berikutnya.

## 5. Kesimpulan

Rancangan basis data sistem laundry ini diharapkan dapat membantu proses pencatatan pelanggan, pegawai, layanan, dan transaksi secara lebih teratur. Dengan adanya ERD dan rancangan kebutuhan sistem, struktur data yang akan digunakan menjadi lebih mudah dipahami sebelum dikembangkan menjadi aplikasi.