-- =============================================================================
-- SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
-- SEEDER: DML INSERT DATA AWAL (DEMO & TESTING LENGKAP)
-- Catatan Password: Seluruh akun demo menggunakan kata sandi: password123
-- Hash Bcrypt: $2b$10$iICWhh6WnOyszRoHVAMWve1fBa6A920IUljkjqcWZ0h0vbGhWlyTG
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. SEED: users (Akun Login Pemilik, Pegawai, Pelanggan)
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`id_user`, `username`, `email`, `no_telp`, `password`, `role`, `status`, `created_at`) VALUES
-- 1: Pemilik
(1, 'pemilik', 'rangga@bersihin.id', '081211223344', '$2b$10$iICWhh6WnOyszRoHVAMWve1fBa6A920IUljkjqcWZ0h0vbGhWlyTG', 'PEMILIK', 'AKTIF', '2024-01-01 08:00:00'),
-- 2-3: Pegawai
(2, 'dina.staff', 'dina.nurhaliza@bersihin.id', '081298765432', '$2b$10$iICWhh6WnOyszRoHVAMWve1fBa6A920IUljkjqcWZ0h0vbGhWlyTG', 'PEGAWAI', 'AKTIF', '2024-01-15 08:00:00'),
(3, 'budi.operator', 'budi.operator@bersihin.id', '081377889900', '$2b$10$iICWhh6WnOyszRoHVAMWve1fBa6A920IUljkjqcWZ0h0vbGhWlyTG', 'PEGAWAI', 'AKTIF', '2024-02-01 08:00:00'),
-- 4-6: Pelanggan
(4, 'andipratama', 'andi.pratama@email.com', '081234567821', '$2b$10$iICWhh6WnOyszRoHVAMWve1fBa6A920IUljkjqcWZ0h0vbGhWlyTG', 'PELANGGAN', 'AKTIF', '2024-03-01 09:00:00'),
(5, 'rinamarlina', 'rina.marlina@example.com', '081111111111', '$2b$10$iICWhh6WnOyszRoHVAMWve1fBa6A920IUljkjqcWZ0h0vbGhWlyTG', 'PELANGGAN', 'AKTIF', '2024-03-10 10:00:00'),
(6, 'dedikurniawan', 'dedi.kurniawan@example.com', '082222222222', '$2b$10$iICWhh6WnOyszRoHVAMWve1fBa6A920IUljkjqcWZ0h0vbGhWlyTG', 'PELANGGAN', 'AKTIF', '2024-03-15 11:00:00');

-- -----------------------------------------------------------------------------
-- 2. SEED: pemilik (Profil Pemilik Usaha)
-- -----------------------------------------------------------------------------
INSERT INTO `pemilik` (`id_pemilik`, `id_user`, `kode_pemilik`, `nama`, `telepon`, `alamat`, `created_at`) VALUES
(1, 1, 'OWN-001', 'Rangga Saputra', '081211223344', 'Jl. Margonda Raya No. 10, Depok, Jawa Barat', '2024-01-01 08:00:00');

-- -----------------------------------------------------------------------------
-- 3. SEED: pegawai (Staf Kasir & Operator)
-- -----------------------------------------------------------------------------
INSERT INTO `pegawai` (`id_pegawai`, `id_user`, `kode_pegawai`, `nama`, `telepon`, `alamat`, `jabatan`, `created_at`) VALUES
(1, 2, 'PGW-001', 'Dina Nurhaliza', '081298765432', 'Jl. Sawo Manila No. 15, Pasar Minggu, Jakarta Selatan', 'Kasir Utama', '2024-01-15 08:00:00'),
(2, 3, 'PGW-002', 'Budi Santoso', '081377889900', 'Jl. Lenteng Agung Timur No. 22, Jakarta Selatan', 'Operator Cuci & Setrika', '2024-02-01 08:00:00');

-- -----------------------------------------------------------------------------
-- 4. SEED: pelanggan (Daftar Pelanggan Setia)
-- -----------------------------------------------------------------------------
INSERT INTO `pelanggan` (`id_pelanggan`, `id_user`, `kode_pelanggan`, `nama`, `telepon`, `email`, `alamat`, `member_tier`, `created_at`) VALUES
(1, 4, 'PLG-08129', 'Andi Pratama', '081234567821', 'andi.pratama@email.com', 'Jl. Kemang Raya No. 45, RT 02 / RW 05, Mampang Prapatan, Jakarta Selatan', 'SILVER', '2024-03-01 09:00:00'),
(2, 5, 'PLG-08130', 'Rina Marlina', '081111111111', 'rina.marlina@example.com', 'Jl. Kukusan Raya No. 5, Beji, Depok', 'GOLD', '2024-03-10 10:00:00'),
(3, 6, 'PLG-08131', 'Dedi Kurniawan', '082222222222', 'dedi.kurniawan@example.com', 'Jl. Beji Timur No. 12, Depok', 'REGULER', '2024-03-15 11:00:00'),
(4, NULL, 'PLG-08132', 'Maya Anggraini', '083333333333', 'maya@example.com', 'Jl. Pondok Cina No. 7, Beji, Depok', 'REGULER', '2024-04-01 14:00:00');

-- -----------------------------------------------------------------------------
-- 5. SEED: layanan (Katalog Paket Laundry)
-- -----------------------------------------------------------------------------
INSERT INTO `layanan` (`id_layanan`, `nama_layanan`, `kategori`, `satuan`, `harga`, `estimasi_waktu`, `status`, `deskripsi`, `created_at`) VALUES
(1, 'Cuci Kering Lipat', 'KILOAN', 'kg', 7000.00, '2 Hari', 'AKTIF', 'Cuci bersih, kering wangi, dan dilipat rapi higienis.', '2024-01-01 08:00:00'),
(2, 'Cuci Komplit (Cuci + Setrika)', 'KILOAN', 'kg', 9000.00, '2 Hari', 'AKTIF', 'Paket favorit: cuci bersih anti bakteri plus setrika uap rapi.', '2024-01-01 08:00:00'),
(3, 'Setrika Uap Saja', 'KILOAN', 'kg', 6000.00, '1 Hari', 'AKTIF', 'Pakaian disetrika menggunakan setrika uap profesional bebas kusut.', '2024-01-01 08:00:00'),
(4, 'Cuci Bedcover Besar', 'SATUAN', 'pcs', 25000.00, '3 Hari', 'AKTIF', 'Perawatan khusus bedcover ukuran King/Queen bersih maksimal.', '2024-01-01 08:00:00'),
(5, 'Cuci Kilat Express (4 Jam)', 'EXPRESS', 'kg', 16000.00, '4 Jam', 'AKTIF', 'Solusi pakaian darurat cepat kering dan bersih dalam 4 jam.', '2024-01-01 08:00:00'),
(6, 'Cuci Sepatu Premium', 'SPECIAL', 'pasang', 30000.00, '2 Hari', 'AKTIF', 'Deep cleaning sepatu sneakers / canvas / formal.', '2024-01-01 08:00:00');

-- -----------------------------------------------------------------------------
-- 6. SEED: pesanan (Data Transaksi Cucian)
-- -----------------------------------------------------------------------------
INSERT INTO `pesanan` (`id_pesanan`, `kode_pesanan`, `id_pelanggan`, `id_pegawai`, `tanggal_pesanan`, `tanggal_selesai`, `total_berat`, `total_harga`, `status`, `catatan`, `created_at`) VALUES
-- Pesanan 1: Milik Andi Pratama (Sedang Dicuci)
(1, 'TRX-240518-01', 1, 1, '2024-05-18 10:15:00', '2024-05-20 16:00:00', 4.50, 40500.00, 'DICUCI', 'Pewangi aroma Lavender, jangan campur baju putih', '2024-05-18 10:15:00'),
-- Pesanan 2: Milik Rina Marlina (Sedang Disetrika)
(2, 'TRX-240519-02', 2, 1, '2024-05-19 11:30:00', '2024-05-21 14:00:00', 3.00, 52000.00, 'DISETRIKA', 'Termasuk 1 bedcover sedang', '2024-05-19 11:30:00'),
-- Pesanan 3: Milik Dedi Kurniawan (Siap Diambil)
(3, 'TRX-240517-03', 3, 2, '2024-05-17 09:00:00', '2024-05-19 17:00:00', 5.00, 45000.00, 'SIAP_DIAMBIL', 'Sudah konfirmasi via WhatsApp', '2024-05-17 09:00:00'),
-- Pesanan 4: Milik Andi Pratama (Sudah Selesai & Diambil)
(4, 'TRX-240510-04', 1, 1, '2024-05-10 13:00:00', '2024-05-12 15:30:00', 6.00, 54000.00, 'SELESAI', 'Pelanggan puas, ambil tepat waktu', '2024-05-10 13:00:00'),
-- Pesanan 5: Milik Maya Anggraini (Baru Masuk Menunggu Diproses)
(5, 'TRX-240520-05', 4, 1, '2024-05-20 08:45:00', '2024-05-22 12:00:00', 2.50, 22500.00, 'MENUNGGU', 'Minta dipisahkan kemeja kerja', '2024-05-20 08:45:00');

-- -----------------------------------------------------------------------------
-- 7. SEED: detail_pesanan (Item Rincian Cucian)
-- -----------------------------------------------------------------------------
INSERT INTO `detail_pesanan` (`id_detail`, `id_pesanan`, `id_layanan`, `jumlah`, `harga_satuan`, `subtotal`) VALUES
-- Rincian TRX-240518-01: 4.5 kg Cuci Komplit
(1, 1, 2, 4.50, 9000.00, 40500.00),
-- Rincian TRX-240519-02: 3 kg Cuci Komplit + 1 Bedcover Besar
(2, 2, 2, 3.00, 9000.00, 27000.00),
(3, 2, 4, 1.00, 25000.00, 25000.00),
-- Rincian TRX-240517-03: 5 kg Cuci Komplit
(4, 3, 2, 5.00, 9000.00, 45000.00),
-- Rincian TRX-240510-04: 6 kg Cuci Komplit
(5, 4, 2, 6.00, 9000.00, 54000.00),
-- Rincian TRX-240520-05: 2.5 kg Cuci Komplit
(6, 5, 2, 2.50, 9000.00, 22500.00);

-- -----------------------------------------------------------------------------
-- 8. SEED: riwayat_status (Log Perubahan Status)
-- -----------------------------------------------------------------------------
INSERT INTO `riwayat_status` (`id_riwayat`, `id_pesanan`, `id_pegawai`, `status`, `catatan`, `waktu_perubahan`) VALUES
-- Log TRX-240518-01
(1, 1, 1, 'MENUNGGU', 'Pesanan diterima di kasir dan ditimbang', '2024-05-18 10:15:00'),
(2, 1, 1, 'DIPROSES', 'Pesanan dipilah dan masuk antrean mesin', '2024-05-18 11:00:00'),
(3, 1, 2, 'DICUCI', 'Sedang dalam proses pencucian mesin 02', '2024-05-18 11:30:00'),

-- Log TRX-240519-02
(4, 2, 1, 'MENUNGGU', 'Pesanan diterima di kasir', '2024-05-19 11:30:00'),
(5, 2, 2, 'DIPROSES', 'Masuk pemilahan', '2024-05-19 12:00:00'),
(6, 2, 2, 'DICUCI', 'Proses cuci selesai', '2024-05-19 13:45:00'),
(7, 2, 2, 'DISETRIKA', 'Sedang dalam tahap setrika uap', '2024-05-19 15:00:00'),

-- Log TRX-240517-03
(8, 3, 2, 'MENUNGGU', 'Pesanan diterima', '2024-05-17 09:00:00'),
(9, 3, 2, 'DICUCI', 'Proses cuci', '2024-05-17 10:00:00'),
(10, 3, 2, 'DISETRIKA', 'Setrika rapi', '2024-05-18 14:00:00'),
(11, 3, 1, 'SIAP_DIAMBIL', 'Pakaian sudah dikemas dan siap di rak 03', '2024-05-19 09:00:00'),

-- Log TRX-240510-04 (SELESAI)
(12, 4, 1, 'MENUNGGU', 'Pesanan diterima', '2024-05-10 13:00:00'),
(13, 4, 2, 'DICUCI', 'Selesai dicuci', '2024-05-10 15:00:00'),
(14, 4, 2, 'DISETRIKA', 'Selesai setrika', '2024-05-11 11:00:00'),
(15, 4, 1, 'SIAP_DIAMBIL', 'Siap diambil di outlet', '2024-05-11 16:00:00'),
(16, 4, 1, 'SELESAI', 'Pesanan telah diambil oleh Andi Pratama', '2024-05-12 15:30:00');

-- -----------------------------------------------------------------------------
-- 9. SEED: pembayaran (Pembayaran Kasir / Digital)
-- -----------------------------------------------------------------------------
INSERT INTO `pembayaran` (`id_pembayaran`, `id_pesanan`, `jumlah_bayar`, `metode`, `tanggal_bayar`, `status`, `referensi_bayar`) VALUES
(1, 1, 40500.00, 'QRIS', '2024-05-18 10:20:00', 'BERHASIL', 'QRIS-20240518-091823'),
(2, 2, 52000.00, 'TRANSFER', '2024-05-19 11:35:00', 'BERHASIL', 'TRF-BCA-889123'),
(3, 3, 45000.00, 'TUNAI', '2024-05-17 09:05:00', 'BERHASIL', 'CASH-OUTLET-001'),
(4, 4, 54000.00, 'QRIS', '2024-05-10 13:05:00', 'BERHASIL', 'QRIS-20240510-081231'),
(5, 5, 22500.00, 'TUNAI', '2024-05-20 08:50:00', 'MENUNGGU', 'BAYAR-DI-AKHIR');

SET FOREIGN_KEY_CHECKS = 1;

