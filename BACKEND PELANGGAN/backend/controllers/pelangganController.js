
const { pool } = require('../config/db');

// GET: Mengambil data profil pelanggan
async function getPelanggan(req, res) {
    try {
        const idPelanggan = req.session.user.id_pelanggan;

        const [rows] = await pool.query(
            `SELECT 
        id_pelanggan,
        id_user,
        kode_pelanggan,
        nama,
        telepon,
        email,
        alamat,
        created_at
       FROM pelanggan
       WHERE id_pelanggan = ?`,
            [idPelanggan]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data pelanggan tidak ditemukan'
            });
        }

        return res.json({
            success: true,
            message: 'Data pelanggan berhasil diambil',
            data: rows[0]
        });
    } catch (error) {
        console.error('Gagal mengambil data pelanggan:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
}

// PUT: Memperbarui profil pelanggan
async function updatePelanggan(req, res) {
    try {
        const idPelanggan = req.session.user.id_pelanggan;
        const { nama, telepon, email, alamat } = req.body;

        if (!nama || !String(nama).trim()) {
            return res.status(400).json({
                success: false,
                message: 'Nama pelanggan wajib diisi'
            });
        }

        await pool.query(
            `UPDATE pelanggan
       SET nama = ?, telepon = ?, email = ?, alamat = ?
       WHERE id_pelanggan = ?`,
            [
                String(nama).trim(),
                telepon || null,
                email || null,
                alamat || null,
                idPelanggan
            ]
        );

        // Perbarui data session agar informasi terbaru langsung digunakan
        req.session.user.nama = String(nama).trim();
        req.session.user.telepon = telepon || '';
        req.session.user.email = email || '';
        req.session.user.alamat = alamat || '';

        return res.json({
            success: true,
            message: 'Profil pelanggan berhasil diperbarui'
        });
    } catch (error) {
        console.error('Gagal memperbarui data pelanggan:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
}

module.exports = {
    getPelanggan,
    updatePelanggan
};
