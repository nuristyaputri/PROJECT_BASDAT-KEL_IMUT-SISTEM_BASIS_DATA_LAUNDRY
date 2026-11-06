# BersihIn Laundry - Backend Modul PEMILIK

Node.js + Express + MySQL (sesuai Kontrak API v1.0). Base URL: `http://localhost:3000/api`

## Menjalankan
1. `npm install`
2. Salin `.env.example` menjadi `.env`, isi koneksi MySQL (XAMPP) dan `JWT_SECRET`
   (harus sama dengan secret di modul auth Anggota 1).
3. Pastikan database `db_bersihin_laundry` sudah ada. `database/schema.sql` hanya referensi asumsi kolom.
4. `npm start`
5. Untuk testing sebelum login jadi: `npm run token`, lalu pakai header `Authorization: Bearer <token>`.

## Endpoint (semua wajib token role PEMILIK)
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | /pemilik/dashboard | Statistik dashboard |
| GET / PUT | /pemilik/profil | Lihat / ubah profil |
| GET / POST | /pemilik/pegawai | Daftar / tambah pegawai (akun + profil) |
| PUT | /pemilik/pegawai/:id | Ubah data pegawai |
| PATCH | /pemilik/pegawai/:id/status | `{"status":"AKTIF"\|"NONAKTIF"}` |
| GET | /pemilik/pelanggan | Daftar pelanggan |
| GET / POST | /pemilik/layanan | Daftar / tambah layanan |
| PUT | /pemilik/layanan/:id | Ubah layanan |
| PATCH | /pemilik/layanan/:id/status | Aktif / nonaktifkan layanan |
| GET | /pemilik/transaksi | Seluruh transaksi |
| GET | /pemilik/laporan?mulai=YYYY-MM-DD&akhir=YYYY-MM-DD | Laporan pendapatan (filter opsional) |

## Contoh
POST /pemilik/pegawai
    { "username": "PGW002", "password": "password123", "nama": "Budi", "telepon": "0812", "email": "budi@email.com", "alamat": "Depok" }

POST /pemilik/layanan
    { "nama_layanan": "Cuci Kering", "harga": 7000, "satuan": "kg" }

## Catatan
- Data transaksi tidak bisa dihapus (tidak ada endpoint DELETE).
- Laporan dihitung dari pembayaran berstatus BERHASIL (masih poin diskusi tim).
- Jangan upload `.env` ke GitHub (sudah ada di `.gitignore`).
