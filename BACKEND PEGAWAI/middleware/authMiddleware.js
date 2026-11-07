const jwt = require("jsonwebtoken");
const db = require("../config/database");

async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Token tidak ditemukan. Gunakan Authorization: Bearer <token>.", data: null });
    }
    const token = authHeader.slice(7).trim();
    if (!token) return res.status(401).json({ success: false, message: "Token tidak ditemukan", data: null });
    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET belum diatur pada file .env");
        return res.status(500).json({ success: false, message: "Konfigurasi autentikasi server belum lengkap", data: null });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !Number.isInteger(Number(decoded.id_user)) || !decoded.role) {
            return res.status(401).json({ success: false, message: "Isi token tidak valid", data: null });
        }
        // Pastikan akun belum dinonaktifkan setelah token diterbitkan.
        const [users] = await db.execute(
            "SELECT id_user, username, role, status FROM users WHERE id_user = ? LIMIT 1",
            [Number(decoded.id_user)]
        );
        if (!users.length || users[0].status !== "AKTIF") {
            return res.status(401).json({ success: false, message: "Akun tidak ditemukan atau sudah nonaktif. Silakan login kembali.", data: null });
        }
        if (users[0].role !== decoded.role) {
            return res.status(401).json({ success: false, message: "Hak akses akun telah berubah. Silakan login kembali.", data: null });
        }
        req.user = {
            id_user: users[0].id_user,
            username: users[0].username,
            role: users[0].role
        };
        return next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError" || error.name === "NotBeforeError") {
            return res.status(401).json({ success: false, message: "Token tidak valid atau kedaluwarsa", data: null });
        }
        console.error("AUTH MIDDLEWARE ERROR:", error);
        return res.status(500).json({ success: false, message: "Gagal memverifikasi autentikasi", data: null });
    }
}

function authorizeRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "Kamu tidak memiliki hak akses", data: null });
        }
        return next();
    };
}

module.exports = { verifyToken, authorizeRole };
