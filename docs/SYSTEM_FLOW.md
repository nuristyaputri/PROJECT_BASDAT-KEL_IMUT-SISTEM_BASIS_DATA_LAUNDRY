# DOKUMENTASI ALUR SISTEM (SYSTEM FLOW) - CLOUDLAUNDRY

Dokumen ini memvisualisasikan seluruh alur kerja, logika bisnis, dan interaksi data pada sistem **CloudLaundry / BersihIn Laundry** menggunakan diagram Mermaid standar yang didasarkan langsung pada kode sumber aktual.

---

## 1. Alur Login & Autentikasi Sistem (Unified Auth Flow)

Diagram berikut menggambarkan alur ketika pengguna mengakses `login.html`, memilih peran, hingga menerima token JWT dan diarahkan ke dasbor masing-masing:

```mermaid
flowchart TD
    A["Mulai: Akses login.html"] --> B["Pilih Tab Role: Pelanggan / Pegawai / Pemilik"]
    B --> C["Input Email / Username & Password"]
    C --> D["Klik Tombol 'Masuk'"]
    D --> E["Frontend kirim HTTP POST ke /api/auth/login"]
    E --> F["Backend: Cari pengguna di tabel 'users' berdasarkan email/username"]
    F --> G{"User Ditemukan?"}
    G -- "Tidak" --> H["Kembalikan HTTP 401: Kredensial tidak valid"]
    H --> I["Tampilkan Alert Error di Frontend"]
    G -- "Ya" --> J["Backend: Verifikasi kata sandi dengan bcrypt.compare"]
    J --> K{"Password Cocok?"}
    K -- "Tidak" --> H
    K -- "Ya" --> L{"Role Sesuai dengan Permintaan?"}
    L -- "Tidak" --> M["Kembalikan HTTP 403: Role tidak memiliki izin"]
    M --> I
    L -- "Ya" --> N["Backend: Generate JWT Token (payload: id_user, role, email)"]
    N --> O["Kembalikan HTTP 200: Token & Data Profil User"]
    O --> P["Frontend: Simpan token di localStorage (bersihin_token)"]
    P --> Q{"Cek Role Pengguna"}
    Q -- "pelanggan" --> R["Redirect ke PELANGGAN/dashboard.html"]
    Q -- "pegawai" --> S["Redirect ke PEGAWAI/dashboard.html"]
    Q -- "pemilik" --> T["Redirect ke PEMILIK/dashboard.html"]
```

---

## 2. Alur Aktivitas Pelanggan (Customer Journey)

Diagram berikut memetakan keseluruhan aktivitas yang dapat dilakukan oleh akun pelanggan:

```mermaid
flowchart TD
    A["Pelanggan Masuk ke Portal"] --> B["PELANGGAN/dashboard.html"]
    B --> C{"Pilih Menu Aktivitas"}
    C --> D["Lihat Katalog Layanan (layanan.html)"]
    D --> E["Buat Pesanan Laundry (pesanan.html)"]
    C --> E
    E --> F["Isi Kuantitas/Berat & Pilih Metode Bayar"]
    F --> G{"Metode Pembayaran"}
    G -- "QRIS" --> H["Unggah Foto Bukti Transfer Base64"]
    G -- "Tunai" --> I["Konfirmasi Bayar di Tempat (COD)"]
    H --> J["Kirim Pesanan (POST /api/pelanggan/pesanan)"]
    I --> J
    J --> K["Pantau Progres Pengerjaan (status.html)"]
    C --> K
    C --> L["Lihat Histori Transaksi (riwayat.html)"]
    L --> M["Lihat / Cetak Invoice Nota (invoice.html)"]
    C --> N["Pengaturan Akun (profil.html / editprofil.html)"]
    C --> O["Keluar / Logout"]
```

---

## 3. Alur Aktivitas Staf Pegawai (Staff Operational Flow)

Diagram berikut menyajikan alur operasional kerja harian staf laundry dan kasir:

```mermaid
flowchart TD
    A["Pegawai Masuk ke Portal"] --> B["PEGAWAI/dashboard.html"]
    B --> C{"Pilih Menu Pekerjaan"}
    C --> D["Kelola Antrean Pesanan (datapesanan.html)"]
    D --> E["Buka Status Pesanan (statuspesanan.html)"]
    E --> F["Ubah Tahapan: Menunggu -> Proses (Cuci/Setrika) -> Siap Diambil -> Selesai"]
    F --> G["Kirim Update (PUT /api/pegawai/pesanan/:id/status)"]
    C --> H["Periksa Transaksi Kasir (datatransaksi.html)"]
    H --> I{"Metode Pembayaran"}
    I -- "QRIS" --> J["Lihat Preview Foto Bukti Transfer"]
    J --> K["Klik Verifikasi Lunas (PUT /api/pegawai/pembayaran/:id/verifikasi)"]
    I -- "Tunai" --> L["Terima Pembayaran Tunai & Tandai Lunas"]
    C --> M["Pemeriksaan Invoice & Cetak Struk (invoice.html)"]
    M --> N["Klik Cetak Struk Kasir (window.print)"]
    C --> O["Data Pelanggan (datapelanggan.html)"]
    C --> P["Pengaturan Profil & Shift Kerja (profil.html)"]
```

---

## 4. Alur Aktivitas Pemilik / Owner (Executive Management Flow)

Diagram berikut menyajikan pengawasan bisnis, audit keuangan, dan manajemen staf oleh pemilik:

```mermaid
flowchart TD
    A["Pemilik Masuk ke Portal"] --> B["PEMILIK/dashboard.html"]
    B --> C{"Pilih Menu Pemilik"}
    C --> D["Analisis Laporan Omset (laporan.html)"]
    D --> E["Filter Periode: Harian / Mingguan / Bulanan / Rentang Tanggal"]
    E --> F["Ekspor Rekap Keuangan & Audit Performa"]
    C --> G["Kelola Staf Pegawai (datapegawai.html)"]
    G --> H["Pendaftaran Staf Baru (tambahpegawai.html)"]
    G --> I["Hapus / Nonaktifkan Pegawai"]
    C --> J["Kelola Master Layanan (layananpegawai.html)"]
    J --> K["Tambah Layanan Baru (tambahlayanan.html)"]
    J --> L["Perbarui Tarif Harga (editlayanan.html)"]
    C --> M["Audit Transaksi (transaksi.html)"]
    C --> N["Kelola Direktori Pelanggan (datapelanggan.html)"]
    C --> O["Profil Bisnis & Akun (profil.html)"]
```

---

## 5. Alur Pembuatan Pesanan Laundry (Order Placement Lifecycle)

Diagram alur transaksi pemesanan dari form input pelanggan hingga tersimpan di basis data:

```mermaid
sequenceDiagram
    autonumber
    actor Pelanggan as Pelanggan (Browser)
    participant Frontend as JS/pelanggan.js
    participant Server as Express Server (API)
    participant Auth as authMiddleware
    participant DB as Basis Data MySQL

    Pelanggan->>Frontend: Membuka form pesanan.html & pilih jenis layanan
    Frontend->>Server: GET /api/pelanggan/layanan
    Server-->>Frontend: Daftar paket dan harga layanan
    Pelanggan->>Frontend: Mengisi berat/pcs, catatan, metode bayar (QRIS/Tunai)
    alt Pembayaran QRIS
        Pelanggan->>Frontend: Unggah foto struk transfer (dikompresi ke Base64)
    end
    Pelanggan->>Frontend: Klik tombol 'Konfirmasi & Buat Pesanan'
    Frontend->>Server: POST /api/pelanggan/pesanan (Authorization: Bearer Token)
    Server->>Auth: Verifikasi token JWT & role 'pelanggan'
    Auth-->>Server: Token valid (User ID terkonfirmasi)
    Server->>DB: INSERT INTO pesanan (id_pelanggan, nomor_pesanan, total_harga, status, metode_bayar, bukti_bayar)
    Server->>DB: INSERT INTO detail_pesanan (id_pesanan, id_layanan, jumlah, subtotal)
    Server->>DB: INSERT INTO pembayaran (id_pesanan, jumlah_bayar, metode_bayar, status_pembayaran)
    Server->>DB: INSERT INTO riwayat_status (id_pesanan, status, keterangan)
    DB-->>Server: Transaksi sukses tersimpan
    Server-->>Frontend: HTTP 201 Created (Data Pesanan & Nomor Faktur)
    Frontend-->>Pelanggan: Tampilkan modal sukses & navigasikan ke invoice.html / status.html
```

---

## 6. Alur Transaksi, Verifikasi Pembayaran & Pencetakan Struk

Diagram berikut mengilustrasikan alur pemeriksaan bukti bayar dan settlement di kasir:

```mermaid
flowchart TD
    A["Pesanan Berhasil Masuk ke Sistem"] --> B{"Metode Pembayaran"}
    B -- "QRIS" --> C["Status Pembayaran Awal: 'menunggu_verifikasi'"]
    C --> D["Staf Kasir membuka PEGAWAI/datatransaksi.html"]
    D --> E["Buka Invoice / Detail Pesanan (PEGAWAI/invoice.html)"]
    E --> F["Tampil Komponen: Foto Bukti Transaksi Pembayaran QRIS"]
    F --> G["Kasir memeriksa mutasi bank / notifikasi EDC QRIS"]
    G --> H{"Dana Diterima?"}
    H -- "Ya" --> I["Kasir Klik Tombol 'Verifikasi Pembayaran'"]
    I --> J["Backend: Update status_pembayaran = 'lunas' di tabel pembayaran"]
    H -- "Tidak" --> K["Kasir Menghubungi Pelanggan untuk Klarifikasi"]
    B -- "Tunai (COD)" --> L["Status Pembayaran Awal: 'belum_lunas'"]
    L --> M["Pelanggan datang ke outlet laundry menyerahkan cucian/dana"]
    M --> N["Kasir menerima uang fisik & update status pembayaran menjadi 'lunas'"]
    J --> O["Nota Bertanda 'LUNAS'"]
    N --> O
    O --> P["Kasir Klik 'Cetak Struk Kasir'"]
    P --> Q["Printer Thermal mencetak fisik struk transaksi"]
```

---

## 7. Arsitektur Komunikasi Frontend, Backend, dan Database

Diagram berikut memetakan relasi hierarki antara klien, middleware autentikasi, API controller, dan database server:

```mermaid
graph LR
    subgraph ClientLayer ["1. Lapisan Klien (Frontend)"]
        UI_Guest["Landing & Login (HTML/Tailwind)"]
        UI_Pelanggan["Portal Pelanggan (JS/pelanggan.js)"]
        UI_Pegawai["Portal Pegawai (JS/pegawai.js)"]
        UI_Pemilik["Portal Pemilik (JS/pemilik.js)"]
        LocalStorage[("localStorage (JWT & Fallback)")]
    end

    subgraph ServerLayer ["2. Lapisan Server & API (Express.js)"]
        ServerCore["server.js (CORS, JSON Parser, Logger)"]
        APIRouter["routes/index.js (/api)"]
        AuthMid["authMiddleware.js (JWT Guard & Role Guard)"]
        
        subgraph Controllers ["Controllers"]
            CtrlAuth["authController.js"]
            CtrlPegawai["pegawaiController.js"]
            CtrlPelanggan["pelangganController.js"]
            CtrlPemilik["pemilikController.js"]
        end
    end

    subgraph DataLayer ["3. Lapisan Basis Data (MySQL)"]
        DBPool["config/database.js (Connection Pool)"]
        MySQL[("Database MySQL (9 Tabel)")]
    end

    UI_Guest -->|"HTTP POST /api/auth/login"| ServerCore
    UI_Pelanggan -->|"Fetch with Bearer Token"| ServerCore
    UI_Pegawai -->|"Fetch with Bearer Token"| ServerCore
    UI_Pemilik -->|"Fetch with Bearer Token"| ServerCore
    UI_Pelanggan <--> LocalStorage
    UI_Pegawai <--> LocalStorage
    UI_Pemilik <--> LocalStorage

    ServerCore --> APIRouter
    APIRouter --> AuthMid
    AuthMid --> Controllers

    Controllers --> DBPool
    DBPool <--> MySQL
```

