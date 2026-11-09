-- =============================================================================
-- SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
-- FILE ALL-IN-ONE: DATABASE + MIGRATION + SEEDER (phpMyAdmin Ready)
--
-- CARA IMPORT 1-KLIK DI phpMyAdmin:
-- 1. Buka http://localhost/phpmyadmin di browser Anda.
-- 2. Klik tab "Import" di menu atas (tidak perlu buat database manual terlebih dahulu).
-- 3. Klik tombol "Choose File" dan pilih file: database_laundry.sql
-- 4. Gulir ke bawah dan klik tombol "Kirim" / "Go".
-- 5. Database `bersihinlaundry` beserta 9 tabel dan seluruh data seeder otomatis terpasang!
--
-- DAFTAR AKUN LOGIN DEMO (Semua password: password123):
-- - PEMILIK   : username: pemilik         | email: rangga@bersihin.id
-- - PEGAWAI 1 : username: dina.staff      | email: dina.nurhaliza@bersihin.id
-- - PEGAWAI 2 : username: budi.operator   | email: budi.operator@bersihin.id
-- - PELANGGAN : username: andipratama     | email: andi.pratama@email.com (081234567821)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `bersihinlaundry` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bersihinlaundry`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `pembayaran`;
DROP TABLE IF EXISTS `riwayat_status`;
DROP TABLE IF EXISTS `detail_pesanan`;
DROP TABLE IF EXISTS `pesanan`;
DROP TABLE IF EXISTS `layanan`;
DROP TABLE IF EXISTS `pelanggan`;
DROP TABLE IF EXISTS `pegawai`;
DROP TABLE IF EXISTS `pemilik`;
DROP TABLE IF EXISTS `users`;

-- -----------------------------------------------------------------------------
-- 1. TABEL: users (Akun Autentikasi Terpusat untuk Seluruh Aktor)
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id_user` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `no_telp` VARCHAR(20) DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('PEMILIK', 'PEGAWAI', 'PELANGGAN') NOT NULL,
  `status` ENUM('AKTIF', 'NONAKTIF') NOT NULL DEFAULT 'AKTIF',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `idx_users_username` (`username`),
  UNIQUE KEY `idx_users_email` (`email`),
  KEY `idx_users_no_telp` (`no_telp`),
  KEY `idx_users_role_status` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. TABEL: pemilik (Profil Pemilik Bisnis / Super Admin)
-- -----------------------------------------------------------------------------
CREATE TABLE `pemilik` (
  `id_pemilik` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_user` INT UNSIGNED NOT NULL,
  `kode_pemilik` VARCHAR(20) NOT NULL,
  `nama` VARCHAR(100) NOT NULL,
  `telepon` VARCHAR(20) NOT NULL,
  `alamat` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pemilik`),
  UNIQUE KEY `idx_pemilik_kode` (`kode_pemilik`),
  KEY `idx_pemilik_user` (`id_user`),
  CONSTRAINT `fk_pemilik_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. TABEL: pegawai (Data Diri dan Jabatan Staf Laundry)
-- -----------------------------------------------------------------------------
CREATE TABLE `pegawai` (
  `id_pegawai` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_user` INT UNSIGNED NOT NULL,
  `kode_pegawai` VARCHAR(20) NOT NULL,
  `nama` VARCHAR(100) NOT NULL,
  `telepon` VARCHAR(20) NOT NULL,
  `alamat` TEXT DEFAULT NULL,
  `jabatan` VARCHAR(50) NOT NULL DEFAULT 'Kasir',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pegawai`),
  UNIQUE KEY `idx_pegawai_kode` (`kode_pegawai`),
  KEY `idx_pegawai_user` (`id_user`),
  CONSTRAINT `fk_pegawai_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. TABEL: pelanggan (Data Pelanggan Laundry)
-- -----------------------------------------------------------------------------
CREATE TABLE `pelanggan` (
  `id_pelanggan` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_user` INT UNSIGNED DEFAULT NULL,
  `kode_pelanggan` VARCHAR(20) NOT NULL,
  `nama` VARCHAR(100) NOT NULL,
  `telepon` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `alamat` TEXT DEFAULT NULL,
  `member_tier` ENUM('REGULER', 'SILVER', 'GOLD') NOT NULL DEFAULT 'SILVER',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pelanggan`),
  UNIQUE KEY `idx_pelanggan_kode` (`kode_pelanggan`),
  KEY `idx_pelanggan_telepon` (`telepon`),
  KEY `idx_pelanggan_user` (`id_user`),
  CONSTRAINT `fk_pelanggan_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. TABEL: layanan (Katalog Paket dan Harga Laundry)
-- -----------------------------------------------------------------------------
CREATE TABLE `layanan` (
  `id_layanan` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama_layanan` VARCHAR(100) NOT NULL,
  `kategori` ENUM('KILOAN', 'SATUAN', 'EXPRESS', 'SPECIAL') NOT NULL DEFAULT 'KILOAN',
  `satuan` VARCHAR(20) NOT NULL DEFAULT 'kg',
  `harga` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `estimasi_waktu` VARCHAR(50) DEFAULT '2 Hari',
  `status` ENUM('AKTIF', 'NONAKTIF') NOT NULL DEFAULT 'AKTIF',
  `deskripsi` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_layanan`),
  KEY `idx_layanan_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. TABEL: pesanan (Transaksi Induk Cucian Laundry)
-- -----------------------------------------------------------------------------
CREATE TABLE `pesanan` (
  `id_pesanan` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode_pesanan` VARCHAR(30) NOT NULL,
  `id_pelanggan` INT UNSIGNED NOT NULL,
  `id_pegawai` INT UNSIGNED DEFAULT NULL,
  `tanggal_pesanan` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tanggal_selesai` DATETIME DEFAULT NULL,
  `total_berat` DECIMAL(8,2) DEFAULT NULL,
  `total_harga` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('MENUNGGU', 'DIPROSES', 'DICUCI', 'DISETRIKA', 'SIAP_DIAMBIL', 'SELESAI', 'DIBATALKAN') NOT NULL DEFAULT 'MENUNGGU',
  `catatan` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pesanan`),
  UNIQUE KEY `idx_pesanan_kode` (`kode_pesanan`),
  KEY `idx_pesanan_pelanggan` (`id_pelanggan`),
  KEY `idx_pesanan_pegawai` (`id_pegawai`),
  KEY `idx_pesanan_status` (`status`),
  KEY `idx_pesanan_tanggal` (`tanggal_pesanan`),
  CONSTRAINT `fk_pesanan_pelanggan` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pesanan_pegawai` FOREIGN KEY (`id_pegawai`) REFERENCES `pegawai` (`id_pegawai`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. TABEL: detail_pesanan (Rincian Item Layanan Tiap Pesanan)
-- -----------------------------------------------------------------------------
CREATE TABLE `detail_pesanan` (
  `id_detail` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_pesanan` INT UNSIGNED NOT NULL,
  `id_layanan` INT UNSIGNED NOT NULL,
  `jumlah` DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  `harga_satuan` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id_detail`),
  KEY `idx_detail_pesanan` (`id_pesanan`),
  KEY `idx_detail_layanan` (`id_layanan`),
  CONSTRAINT `fk_detail_pesanan` FOREIGN KEY (`id_pesanan`) REFERENCES `pesanan` (`id_pesanan`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detail_layanan` FOREIGN KEY (`id_layanan`) REFERENCES `layanan` (`id_layanan`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. TABEL: riwayat_status (Log Audit Perubahan Tahapan Laundry)
-- -----------------------------------------------------------------------------
CREATE TABLE `riwayat_status` (
  `id_riwayat` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_pesanan` INT UNSIGNED NOT NULL,
  `id_pegawai` INT UNSIGNED DEFAULT NULL,
  `status` VARCHAR(30) NOT NULL,
  `catatan` VARCHAR(255) DEFAULT NULL,
  `waktu_perubahan` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_riwayat`),
  KEY `idx_riwayat_pesanan` (`id_pesanan`),
  KEY `idx_riwayat_pegawai` (`id_pegawai`),
  CONSTRAINT `fk_riwayat_pesanan` FOREIGN KEY (`id_pesanan`) REFERENCES `pesanan` (`id_pesanan`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_riwayat_pegawai` FOREIGN KEY (`id_pegawai`) REFERENCES `pegawai` (`id_pegawai`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. TABEL: pembayaran (Transaksi Kasir / QRIS / Transfer Pembayaran)
-- -----------------------------------------------------------------------------
CREATE TABLE `pembayaran` (
  `id_pembayaran` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_pesanan` INT UNSIGNED NOT NULL,
  `jumlah_bayar` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `metode` ENUM('TUNAI', 'QRIS', 'TRANSFER') NOT NULL DEFAULT 'TUNAI',
  `tanggal_bayar` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('MENUNGGU', 'BERHASIL', 'GAGAL') NOT NULL DEFAULT 'MENUNGGU',
  `referensi_bayar` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id_pembayaran`),
  KEY `idx_pembayaran_pesanan` (`id_pesanan`),
  KEY `idx_pembayaran_status` (`status`),
  CONSTRAINT `fk_pembayaran_pesanan` FOREIGN KEY (`id_pesanan`) REFERENCES `pesanan` (`id_pesanan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- INSERT DATA AWAL (SEEDER DEMO)
-- =============================================================================

-- 1. users
INSERT INTO `users` (`id_user`, `username`, `email`, `no_telp`, `password`, `role`, `status`, `created_at`) VALUES
(1, 'pemilik', 'rangga@bersihin.id', '081211223344', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'PEMILIK', 'AKTIF', '2024-01-01 08:00:00'),
(2, 'dina.staff', 'dina.nurhaliza@bersihin.id', '081298765432', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'PEGAWAI', 'AKTIF', '2024-01-15 08:00:00'),
(3, 'budi.operator', 'budi.operator@bersihin.id', '081377889900', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'PEGAWAI', 'AKTIF', '2024-02-01 08:00:00'),
(4, 'andipratama', 'andi.pratama@email.com', '081234567821', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'PELANGGAN', 'AKTIF', '2024-03-01 09:00:00'),
(5, 'rinamarlina', 'rina.marlina@example.com', '081111111111', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'PELANGGAN', 'AKTIF', '2024-03-10 10:00:00'),
(6, 'dedikurniawan', 'dedi.kurniawan@example.com', '082222222222', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'PELANGGAN', 'AKTIF', '2024-03-15 11:00:00');

-- 2. pemilik
INSERT INTO `pemilik` (`id_pemilik`, `id_user`, `kode_pemilik`, `nama`, `telepon`, `alamat`, `created_at`) VALUES
(1, 1, 'OWN-001', 'Rangga Saputra', '081211223344', 'Jl. Margonda Raya No. 10, Depok, Jawa Barat', '2024-01-01 08:00:00');

-- 3. pegawai
INSERT INTO `pegawai` (`id_pegawai`, `id_user`, `kode_pegawai`, `nama`, `telepon`, `alamat`, `jabatan`, `created_at`) VALUES
(1, 2, 'PGW-001', 'Dina Nurhaliza', '081298765432', 'Jl. Sawo Manila No. 15, Pasar Minggu, Jakarta Selatan', 'Kasir Utama', '2024-01-15 08:00:00'),
(2, 3, 'PGW-002', 'Budi Santoso', '081377889900', 'Jl. Lenteng Agung Timur No. 22, Jakarta Selatan', 'Operator Cuci & Setrika', '2024-02-01 08:00:00');

-- 4. pelanggan
INSERT INTO `pelanggan` (`id_pelanggan`, `id_user`, `kode_pelanggan`, `nama`, `telepon`, `email`, `alamat`, `member_tier`, `created_at`) VALUES
(1, 4, 'PLG-08129', 'Andi Pratama', '081234567821', 'andi.pratama@email.com', 'Jl. Kemang Raya No. 45, RT 02 / RW 05, Mampang Prapatan, Jakarta Selatan', 'SILVER', '2024-03-01 09:00:00'),
(2, 5, 'PLG-08130', 'Rina Marlina', '081111111111', 'rina.marlina@example.com', 'Jl. Kukusan Raya No. 5, Beji, Depok', 'GOLD', '2024-03-10 10:00:00'),
(3, 6, 'PLG-08131', 'Dedi Kurniawan', '082222222222', 'dedi.kurniawan@example.com', 'Jl. Beji Timur No. 12, Depok', 'REGULER', '2024-03-15 11:00:00'),
(4, NULL, 'PLG-08132', 'Maya Anggraini', '083333333333', 'maya@example.com', 'Jl. Pondok Cina No. 7, Beji, Depok', 'REGULER', '2024-04-01 14:00:00');

-- 5. layanan
INSERT INTO `layanan` (`id_layanan`, `nama_layanan`, `kategori`, `satuan`, `harga`, `estimasi_waktu`, `status`, `deskripsi`, `created_at`) VALUES
(1, 'Cuci Kering Lipat', 'KILOAN', 'kg', 7000.00, '2 Hari', 'AKTIF', 'Cuci bersih, kering wangi, dan dilipat rapi higienis.', '2024-01-01 08:00:00'),
(2, 'Cuci Komplit (Cuci + Setrika)', 'KILOAN', 'kg', 9000.00, '2 Hari', 'AKTIF', 'Paket favorit: cuci bersih anti bakteri plus setrika uap rapi.', '2024-01-01 08:00:00'),
(3, 'Setrika Uap Saja', 'KILOAN', 'kg', 6000.00, '1 Hari', 'AKTIF', 'Pakaian disetrika menggunakan setrika uap profesional bebas kusut.', '2024-01-01 08:00:00'),
(4, 'Cuci Bedcover Besar', 'SATUAN', 'pcs', 25000.00, '3 Hari', 'AKTIF', 'Perawatan khusus bedcover ukuran King/Queen bersih maksimal.', '2024-01-01 08:00:00'),
(5, 'Cuci Kilat Express (4 Jam)', 'EXPRESS', 'kg', 16000.00, '4 Jam', 'AKTIF', 'Solusi pakaian darurat cepat kering dan bersih dalam 4 jam.', '2024-01-01 08:00:00'),
(6, 'Cuci Sepatu Premium', 'SPECIAL', 'pasang', 30000.00, '2 Hari', 'AKTIF', 'Deep cleaning sepatu sneakers / canvas / formal.', '2024-01-01 08:00:00');

-- 6. pesanan
INSERT INTO `pesanan` (`id_pesanan`, `kode_pesanan`, `id_pelanggan`, `id_pegawai`, `tanggal_pesanan`, `tanggal_selesai`, `total_berat`, `total_harga`, `status`, `catatan`, `created_at`) VALUES
(1, 'TRX-240518-01', 1, 1, '2024-05-18 10:15:00', '2024-05-20 16:00:00', 4.50, 40500.00, 'DICUCI', 'Pewangi aroma Lavender, jangan campur baju putih', '2024-05-18 10:15:00'),
(2, 'TRX-240519-02', 2, 1, '2024-05-19 11:30:00', '2024-05-21 14:00:00', 3.00, 52000.00, 'DISETRIKA', 'Termasuk 1 bedcover sedang', '2024-05-19 11:30:00'),
(3, 'TRX-240517-03', 3, 2, '2024-05-17 09:00:00', '2024-05-19 17:00:00', 5.00, 45000.00, 'SIAP_DIAMBIL', 'Sudah konfirmasi via WhatsApp', '2024-05-17 09:00:00'),
(4, 'TRX-240510-04', 1, 1, '2024-05-10 13:00:00', '2024-05-12 15:30:00', 6.00, 54000.00, 'SELESAI', 'Pelanggan puas, ambil tepat waktu', '2024-05-10 13:00:00'),
(5, 'TRX-240520-05', 4, 1, '2024-05-20 08:45:00', '2024-05-22 12:00:00', 2.50, 22500.00, 'MENUNGGU', 'Minta dipisahkan kemeja kerja', '2024-05-20 08:45:00');

-- 7. detail_pesanan
INSERT INTO `detail_pesanan` (`id_detail`, `id_pesanan`, `id_layanan`, `jumlah`, `harga_satuan`, `subtotal`) VALUES
(1, 1, 2, 4.50, 9000.00, 40500.00),
(2, 2, 2, 3.00, 9000.00, 27000.00),
(3, 2, 4, 1.00, 25000.00, 25000.00),
(4, 3, 2, 5.00, 9000.00, 45000.00),
(5, 4, 2, 6.00, 9000.00, 54000.00),
(6, 5, 2, 2.50, 9000.00, 22500.00);

-- 8. riwayat_status
INSERT INTO `riwayat_status` (`id_riwayat`, `id_pesanan`, `id_pegawai`, `status`, `catatan`, `waktu_perubahan`) VALUES
(1, 1, 1, 'MENUNGGU', 'Pesanan diterima di kasir dan ditimbang', '2024-05-18 10:15:00'),
(2, 1, 1, 'DIPROSES', 'Pesanan dipilah dan masuk antrean mesin', '2024-05-18 11:00:00'),
(3, 1, 2, 'DICUCI', 'Sedang dalam proses pencucian mesin 02', '2024-05-18 11:30:00'),
(4, 2, 1, 'MENUNGGU', 'Pesanan diterima di kasir', '2024-05-19 11:30:00'),
(5, 2, 2, 'DIPROSES', 'Masuk pemilahan', '2024-05-19 12:00:00'),
(6, 2, 2, 'DICUCI', 'Proses cuci selesai', '2024-05-19 13:45:00'),
(7, 2, 2, 'DISETRIKA', 'Sedang dalam tahap setrika uap', '2024-05-19 15:00:00'),
(8, 3, 2, 'MENUNGGU', 'Pesanan diterima', '2024-05-17 09:00:00'),
(9, 3, 2, 'DICUCI', 'Proses cuci', '2024-05-17 10:00:00'),
(10, 3, 2, 'DISETRIKA', 'Setrika rapi', '2024-05-18 14:00:00'),
(11, 3, 1, 'SIAP_DIAMBIL', 'Pakaian sudah dikemas dan siap di rak 03', '2024-05-19 09:00:00'),
(12, 4, 1, 'MENUNGGU', 'Pesanan diterima', '2024-05-10 13:00:00'),
(13, 4, 2, 'DICUCI', 'Selesai dicuci', '2024-05-10 15:00:00'),
(14, 4, 2, 'DISETRIKA', 'Selesai setrika', '2024-05-11 11:00:00'),
(15, 4, 1, 'SIAP_DIAMBIL', 'Siap diambil di outlet', '2024-05-11 16:00:00'),
(16, 4, 1, 'SELESAI', 'Pesanan telah diambil oleh Andi Pratama', '2024-05-12 15:30:00');

-- 9. pembayaran
INSERT INTO `pembayaran` (`id_pembayaran`, `id_pesanan`, `jumlah_bayar`, `metode`, `tanggal_bayar`, `status`, `referensi_bayar`) VALUES
(1, 1, 40500.00, 'QRIS', '2024-05-18 10:20:00', 'BERHASIL', 'QRIS-20240518-091823'),
(2, 2, 52000.00, 'TRANSFER', '2024-05-19 11:35:00', 'BERHASIL', 'TRF-BCA-889123'),
(3, 3, 45000.00, 'TUNAI', '2024-05-17 09:05:00', 'BERHASIL', 'CASH-OUTLET-001'),
(4, 4, 54000.00, 'QRIS', '2024-05-10 13:05:00', 'BERHASIL', 'QRIS-20240510-081231'),
(5, 5, 22500.00, 'TUNAI', '2024-05-20 08:50:00', 'MENUNGGU', 'BAYAR-DI-AKHIR');

SET FOREIGN_KEY_CHECKS = 1;

