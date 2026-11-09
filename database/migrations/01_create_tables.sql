-- =============================================================================
-- SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
-- MIGRATION: DDL CREATE TABLES
-- Target RDBMS: MySQL 5.7+ / MySQL 8.0+ / MariaDB 10.3+ (phpMyAdmin)
-- Engine: InnoDB, Charset: utf8mb4, Collate: utf8mb4_unicode_ci
-- =============================================================================

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

SET FOREIGN_KEY_CHECKS = 1;

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

