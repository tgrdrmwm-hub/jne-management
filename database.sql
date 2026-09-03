-- ============================================
-- DATABASE MANAGEMENT JNE — SUPABASE (PostgreSQL)
-- ============================================
-- Jalankan SQL ini di Supabase SQL Editor

-- ==========================================================
-- DROP EXISTING TABLES & POLICIES (Supaya bisa di-run berulang)
-- ==========================================================
DROP POLICY IF EXISTS "Allow all for users" ON users;
DROP POLICY IF EXISTS "Allow all for absensi" ON absensi;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user;

DROP TABLE IF EXISTS absensi CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Tabel Users (Karyawan/Kurir/Admin) - Relasi ke auth.users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Owner', 'Developer', 'Staff')),
    poin INT DEFAULT 0
);

-- 2. Tabel Absensi
CREATE TABLE IF NOT EXISTS absensi (
    id SERIAL PRIMARY KEY,
    karyawan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_masuk TIME,
    jam_keluar TIME,
    total_jam INT DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpha', 'Cuti'))
);

-- ==========================================================
-- ENABLE RLS
-- ==========================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;

-- Policy: allow all operations for authenticated and anon (development)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for absensi" ON absensi FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================
-- FUNGSI & TRIGGER UNTUK OTOMATIS MEMBUAT USER DI PUBLIC.USERS
-- ==========================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, name, role, poin)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'username', 
    new.raw_user_meta_data->>'name', 
    new.raw_user_meta_data->>'role',
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ==========================================================
-- ==========================================================
-- 3. Tabel Laporan Harian
-- ==========================================================
DROP TABLE IF EXISTS laporan_harian CASCADE;

CREATE TABLE IF NOT EXISTS laporan_harian (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kegiatan VARCHAR(255) NOT NULL,
    deskripsi TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Selesai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Jakarta', now())
);

ALTER TABLE laporan_harian ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for laporan_harian" ON laporan_harian FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================
-- 4. Tabel Aktivitas (Activity Log)
-- ==========================================================
DROP TABLE IF EXISTS aktivitas CASCADE;

CREATE TABLE IF NOT EXISTS aktivitas (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    absensi_id INT REFERENCES absensi(id) ON DELETE CASCADE,
    laporan_id INT REFERENCES laporan_harian(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'absen', 'laporan', 'system', 'user'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Jakarta', now())
);

ALTER TABLE aktivitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for aktivitas" ON aktivitas FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================
-- 5. Tabel Riwayat Poin
-- ==========================================================
DROP TABLE IF EXISTS riwayat_poin CASCADE;

CREATE TABLE IF NOT EXISTS riwayat_poin (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    absensi_id INT REFERENCES absensi(id) ON DELETE CASCADE,
    laporan_id INT REFERENCES laporan_harian(id) ON DELETE CASCADE,
    jumlah_poin INT NOT NULL,
    keterangan VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Jakarta', now())
);

ALTER TABLE riwayat_poin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for riwayat_poin" ON riwayat_poin FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================
-- 6. Trigger Sinkronisasi Otomatis Poin User
-- ==========================================================
CREATE OR REPLACE FUNCTION sync_user_poin()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    total INT;
BEGIN
    target_user_id := COALESCE(NEW.user_id, OLD.user_id);
    
    SELECT COALESCE(SUM(jumlah_poin), 0)
    INTO total
    FROM riwayat_poin
    WHERE user_id = target_user_id;

    UPDATE users
    SET poin = total
    WHERE id = target_user_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_user_poin ON riwayat_poin;

CREATE TRIGGER trigger_sync_user_poin
AFTER INSERT OR UPDATE OR DELETE ON riwayat_poin
FOR EACH ROW EXECUTE FUNCTION sync_user_poin();

