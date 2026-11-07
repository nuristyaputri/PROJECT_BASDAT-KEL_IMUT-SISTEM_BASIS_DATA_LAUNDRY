const db = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ======================================
// 1. LOGIN
// ======================================
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (typeof username !== "string" || !username.trim() || typeof password !== "string" || !password) {
            return res.status(400).json({
                success: false,
                message: "Username dan password wajib diisi",
                data: null
            });
        }

        // Pastikan JWT_SECRET tersedia
        if (!process.env.JWT_SECRET) {
            console.error("LOGIN ERROR: JWT_SECRET belum diatur");
            return res.status(500).json({
                success: false,
                message: "Konfigurasi autentikasi server belum lengkap",
                data: null
            });
        }

        // Cari akun aktif
        const [users] = await db.execute(
            `SELECT id_user, username, email, password, role, status
             FROM users
             WHERE username = ? AND status = 'AKTIF'
             LIMIT 1`,
            [username.trim()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Username atau password salah",
                data: null
            });
        }

        const user = users[0];

        // Cocokkan password dengan hash bcrypt
        const passwordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                message: "Username atau password salah",
                data: null
            });
        }

        // Buat JWT
        const token = jwt.sign(
            {
                id_user: user.id_user,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login berhasil",
            data: {
                token,
                user: {
                    id_user: user.id_user,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server",
            data: null
        });
    }
};


// ======================================
// 2. LOGOUT
// ======================================
exports.logout = async (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Logout berhasil. Silakan hapus token di frontend.",
        data: null
    });
};


// ======================================
// 3. CEK USER YANG SEDANG LOGIN
// ======================================
exports.me = async (req, res) => {
    try {
        const idUser = req.user.id_user;

        const [users] = await db.execute(
            `SELECT id_user, username, email, role, status
             FROM users
             WHERE id_user = ? AND status = 'AKTIF'
             LIMIT 1`,
            [idUser]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Data pengguna tidak ditemukan",
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data pengguna berhasil ditemukan",
            data: users[0]
        });

    } catch (error) {
        console.error("ME ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server",
            data: null
        });
    }
};


// ======================================
// 4. GANTI PASSWORD
// ======================================
exports.updatePassword = async (req, res) => {
    try {
        const { password_lama, password_baru } = req.body || {};
        const idUser = req.user.id_user;

        if (!password_lama || !password_baru) {
            return res.status(400).json({
                success: false,
                message: "Password lama dan password baru wajib diisi",
                data: null
            });
        }

        if (password_baru.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password baru minimal 8 karakter",
                data: null
            });
        }

        const [users] = await db.execute(
            "SELECT password FROM users WHERE id_user = ? LIMIT 1",
            [idUser]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Akun tidak ditemukan",
                data: null
            });
        }

        const passwordValid = await bcrypt.compare(
            password_lama,
            users[0].password
        );

        if (!passwordValid) {
            return res.status(400).json({
                success: false,
                message: "Password lama salah",
                data: null
            });
        }

        const passwordHash = await bcrypt.hash(password_baru, 10);

        await db.execute(
            "UPDATE users SET password = ? WHERE id_user = ?",
            [passwordHash, idUser]
        );

        return res.status(200).json({
            success: true,
            message: "Password berhasil diubah",
            data: null
        });

    } catch (error) {
        console.error("UPDATE PASSWORD ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server",
            data: null
        });
    }
};