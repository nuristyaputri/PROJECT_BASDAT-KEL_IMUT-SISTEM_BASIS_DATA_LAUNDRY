/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: backend/routes/authRoutes.js
 * Deskripsi: Rute autentikasi terpadu untuk login, logout, profil akun, dan ganti password.
 * =============================================================================
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Endpoint publik
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authController.logout);

// Endpoint terproteksi (butuh token)
router.get('/me', verifyToken, authController.me);
router.put('/password', verifyToken, authController.updatePassword);

module.exports = router;

