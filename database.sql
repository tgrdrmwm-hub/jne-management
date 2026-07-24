-- ============================================
-- DATABASE MANAGEMENT JNE — SUPABASE (PostgreSQL)
-- ============================================
-- Jalankan SQL ini di Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query)

-- 1. Tabel Users (Karyawan/Kurir/Admin)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Supervisor', 'Kurir'))
);

-- 2. Tabel Pengantaran Gudang
CREATE TABLE IF NOT EXISTS pengantaran_gudang (
    id SERIAL PRIMARY KEY,
    resi VARCHAR(50) NOT NULL,
    kurir_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gudang VARCHAR(100) NOT NULL,
    jumlah INT NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam TIME NOT NULL DEFAULT CURRENT_TIME,
    status VARCHAR(20) DEFAULT 'Proses' CHECK (status IN ('Proses', 'Selesai', 'Pending')),
    catatan TEXT
);

-- 3. Tabel Pengambilan Paket
CREATE TABLE IF NOT EXISTS pengambilan_paket (
    id SERIAL PRIMARY KEY,
    resi VARCHAR(50) NOT NULL,
    pengambil_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jumlah INT NOT NULL,
    lokasi VARCHAR(100) NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam TIME NOT NULL DEFAULT CURRENT_TIME,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Diambil')),
    catatan TEXT
);

-- 4. Tabel Jadwal Shift
CREATE TABLE IF NOT EXISTS jadwal_shift (
    id SERIAL PRIMARY KEY,
    karyawan_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shift VARCHAR(20) NOT NULL CHECK (shift IN ('Pagi', 'Siang', 'Malam')),
    hari VARCHAR(20) NOT NULL,
    jam_masuk TIME NOT NULL,
    jam_pulang TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
    catatan TEXT
);

-- 5. Tabel Absensi
CREATE TABLE IF NOT EXISTS absensi (
    id SERIAL PRIMARY KEY,
    karyawan_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_masuk TIME,
    jam_keluar TIME,
    total_jam INT DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpha'))
);

-- 6. Tabel Poin Karyawan
CREATE TABLE IF NOT EXISTS poin_karyawan (
    id SERIAL PRIMARY KEY,
    karyawan_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_poin INT DEFAULT 0,
    peringkat INT
);

-- 7. Tabel Riwayat Poin
CREATE TABLE IF NOT EXISTS riwayat_poin (
    id SERIAL PRIMARY KEY,
    karyawan_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    aktivitas VARCHAR(255) NOT NULL,
    poin INT NOT NULL
);

-- ==========================================================
-- DISABLE RLS (untuk development, enable di production)
-- ==========================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengantaran_gudang ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengambilan_paket ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_shift ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE poin_karyawan ENABLE ROW LEVEL SECURITY;
ALTER TABLE riwayat_poin ENABLE ROW LEVEL SECURITY;

-- Policy: allow all operations for authenticated and anon (development)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for pengantaran_gudang" ON pengantaran_gudang FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for pengambilan_paket" ON pengambilan_paket FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for jadwal_shift" ON jadwal_shift FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for absensi" ON absensi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for poin_karyawan" ON poin_karyawan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for riwayat_poin" ON riwayat_poin FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================
-- INSERT DATA AWAL (Mock Data sesuai frontend)
-- ==========================================================

-- Insert Users
INSERT INTO users (id, username, password, name, role) VALUES
(1, 'admin', 'password', 'Budi Santoso', 'Admin'),
(2, 'spv', 'password', 'Siti Aminah', 'Supervisor'),
(3, 'kurir1', 'password', 'Agus Pratama', 'Kurir'),
(4, 'kurir2', 'password', 'Dodi Setiawan', 'Kurir');

-- Reset sequence
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Insert Pengantaran Gudang
INSERT INTO pengantaran_gudang (id, resi, kurir_id, gudang, jumlah, tanggal, jam, status, catatan) VALUES
(1, 'JNE123456789', 3, 'Gudang Pusat (Jakarta)', 24, '2026-07-24', '08:30:00', 'Selesai', 'Lengkap'),
(2, 'JNE987654321', 4, 'Gudang Cabang (Bandung)', 15, '2026-07-24', '10:15:00', 'Proses', 'Menunggu validasi');

SELECT setval('pengantaran_gudang_id_seq', (SELECT MAX(id) FROM pengantaran_gudang));

-- Insert Pengambilan Paket
INSERT INTO pengambilan_paket (id, resi, pengambil_id, jumlah, lokasi, tanggal, jam, status, catatan) VALUES
(1, 'PKG00123', 3, 10, 'Gudang A', '2026-07-24', '09:00:00', 'Diambil', '-'),
(2, 'PKG00124', 4, 5, 'Gudang B', '2026-07-24', '11:00:00', 'Pending', 'Kurir belum datang');

SELECT setval('pengambilan_paket_id_seq', (SELECT MAX(id) FROM pengambilan_paket));

-- Insert Jadwal Shift
INSERT INTO jadwal_shift (id, karyawan_id, shift, hari, jam_masuk, jam_pulang, status, catatan) VALUES
(1, 3, 'Pagi', 'Senin', '08:00:00', '16:00:00', 'Aktif', '-'),
(2, 4, 'Siang', 'Senin', '16:00:00', '00:00:00', 'Aktif', '-');

SELECT setval('jadwal_shift_id_seq', (SELECT MAX(id) FROM jadwal_shift));

-- Insert Absensi
INSERT INTO absensi (id, karyawan_id, tanggal, jam_masuk, jam_keluar, total_jam, status) VALUES
(1, 3, '2026-07-24', '07:50:00', '16:05:00', 8, 'Hadir'),
(2, 4, '2026-07-24', '16:15:00', NULL, 0, 'Terlambat'),
(3, 1, '2026-07-24', NULL, NULL, 0, 'Sakit');

SELECT setval('absensi_id_seq', (SELECT MAX(id) FROM absensi));

-- Insert Poin Karyawan
INSERT INTO poin_karyawan (id, karyawan_id, total_poin, peringkat) VALUES
(1, 3, 125, 1),
(2, 4, 85, 2);

SELECT setval('poin_karyawan_id_seq', (SELECT MAX(id) FROM poin_karyawan));

-- Insert Riwayat Poin
INSERT INTO riwayat_poin (id, karyawan_id, tanggal, aktivitas, poin) VALUES
(1, 3, '2026-07-24', 'Mengantar Paket', 10),
(2, 4, '2026-07-24', 'Hadir Tepat Waktu', 5);

SELECT setval('riwayat_poin_id_seq', (SELECT MAX(id) FROM riwayat_poin));
