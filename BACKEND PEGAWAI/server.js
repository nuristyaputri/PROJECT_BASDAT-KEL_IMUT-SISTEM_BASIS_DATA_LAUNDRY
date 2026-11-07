require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const pegawaiRoutes = require("./routes/pegawaiRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend BersihIn Laundry berjalan"
    });
});

app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS hasil");
        return res.status(200).json({
            success: true,
            message: "Database berhasil terhubung",
            data: rows
        });
    } catch (error) {
        console.error("TEST DATABASE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Koneksi database gagal. Periksa konfigurasi database.",
            data: null
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/pegawai", pegawaiRoutes);

// Endpoint untuk URL yang tidak tersedia.
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint tidak ditemukan",
        data: null
    });
});

// Penanganan JSON yang tidak valid dan error tak terduga.
app.use((error, req, res, next) => {
    console.error("SERVER ERROR:", error.message);
    if (res.headersSent) return next(error);
    return res.status(error.status || 500).json({
        success: false,
        message: error.type === "entity.parse.failed"
            ? "Format JSON tidak valid"
            : "Terjadi kesalahan pada server",
        data: null
    });
});

const PORT = Number(process.env.PORT) || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}

module.exports = app;
