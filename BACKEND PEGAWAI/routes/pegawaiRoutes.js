const express = require("express");
const router = express.Router();

const pegawai = require("../controllers/pegawaiController");

const {
    verifyToken,
    authorizeRole
} = require("../middleware/authMiddleware");

router.use(verifyToken, authorizeRole("PEGAWAI"));

router.get("/dashboard", pegawai.dashboard);

router.get("/profil", pegawai.profil);
router.put("/profil", pegawai.updateProfil);

router.get("/pelanggan", pegawai.daftarPelanggan);
router.get("/pelanggan/:id", pegawai.detailPelanggan);
router.post("/pelanggan", pegawai.tambahPelanggan);
router.put("/pelanggan/:id", pegawai.updatePelanggan);

router.get("/pesanan", pegawai.daftarPesanan);
router.get("/pesanan/:id", pegawai.detailPesanan);
router.post("/pesanan", pegawai.tambahPesanan);
router.patch("/pesanan/:id/status", pegawai.updateStatus);

router.get("/transaksi", pegawai.daftarTransaksi);
router.get("/transaksi/:id", pegawai.detailTransaksi);
router.post("/transaksi/:id/pembayaran", pegawai.tambahPembayaran);
router.patch(
    "/transaksi/:id/pembayaran/:id_pembayaran/status",
    pegawai.updateStatusPembayaran
);

module.exports = router;