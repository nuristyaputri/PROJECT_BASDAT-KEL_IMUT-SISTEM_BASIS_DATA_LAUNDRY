const express = require("express");
const router = express.Router();

const pemilik = require("../controllers/pemilikController");

const {
    verifyToken,
    authorizeRole
} = require("../middleware/authMiddleware");

router.use(verifyToken, authorizeRole("PEMILIK"));

router.get("/dashboard", pemilik.dashboard);

router.get("/profil", pemilik.profil);
router.put("/profil", pemilik.updateProfil);

// Kelola pegawai
router.get("/pegawai", pemilik.daftarPegawai);
router.get("/pegawai/:id", pemilik.detailPegawai);
router.post("/pegawai", pemilik.tambahPegawai);
router.put("/pegawai/:id", pemilik.updatePegawai);
router.patch("/pegawai/:id/status", pemilik.updateStatusPegawai);

// Kelola layanan
router.get("/layanan", pemilik.daftarLayanan);
router.get("/layanan/:id", pemilik.detailLayanan);
router.post("/layanan", pemilik.tambahLayanan);
router.put("/layanan/:id", pemilik.updateLayanan);
router.patch("/layanan/:id/status", pemilik.updateStatusLayanan);

// Pelanggan (hanya lihat)
router.get("/pelanggan", pemilik.daftarPelanggan);
router.get("/pelanggan/:id", pemilik.detailPelanggan);

// Pesanan (hanya lihat)
router.get("/pesanan", pemilik.daftarPesanan);
router.get("/pesanan/:id", pemilik.detailPesanan);

// Transaksi (hanya lihat)
router.get("/transaksi", pemilik.daftarTransaksi);
router.get("/transaksi/:id", pemilik.detailTransaksi);

// Laporan
router.get("/laporan/pendapatan", pemilik.laporanPendapatan);

module.exports = router;
