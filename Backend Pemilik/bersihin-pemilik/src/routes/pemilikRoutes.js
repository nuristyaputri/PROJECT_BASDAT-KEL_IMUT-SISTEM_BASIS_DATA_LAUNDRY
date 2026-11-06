const router = require('express').Router();
const { verifyToken, authorizeRole } = require('../middleware/auth');
const c = require('../controllers/pemilikController');

// Semua endpoint pemilik wajib login dengan role PEMILIK
router.use(verifyToken, authorizeRole('PEMILIK'));

router.get('/dashboard', c.dashboard);

router.get('/profil', c.getProfil);
router.put('/profil', c.updateProfil);

router.get('/pegawai', c.listPegawai);
router.post('/pegawai', c.createPegawai);
router.put('/pegawai/:id', c.updatePegawai);
router.patch('/pegawai/:id/status', c.statusPegawai);

router.get('/pelanggan', c.listPelanggan);

router.get('/layanan', c.listLayanan);
router.post('/layanan', c.createLayanan);
router.put('/layanan/:id', c.updateLayanan);
router.patch('/layanan/:id/status', c.statusLayanan);

router.get('/transaksi', c.listTransaksi);
router.get('/laporan', c.laporan);

module.exports = router;
