
const express = require('express');
const router = express.Router();

const {
    login,
    logout,
    getSession
} = require('../controllers/authController');

// Login pelanggan
router.post('/login', login);

// Logout pelanggan
router.post('/logout', logout);

// Mengecek session pelanggan
router.get('/session', getSession);

module.exports = router;
