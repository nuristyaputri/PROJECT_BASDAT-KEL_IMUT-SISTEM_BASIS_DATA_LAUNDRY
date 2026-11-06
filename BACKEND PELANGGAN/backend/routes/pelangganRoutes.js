
const express = require('express');
const router = express.Router();

const {
    getPelanggan,
    updatePelanggan
} = require('../controllers/pelangganController');

const {
    requireCustomerAuth
} = require('../middleware/authMiddleware');

// Mengambil profil pelanggan
router.get('/profil', requireCustomerAuth, getPelanggan);

// Memperbarui profil pelanggan
router.put('/profil', requireCustomerAuth, updatePelanggan);

module.exports = router;
