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
    role VARCHAR(20) NOT NULL CHECK (role IN ('Owner', 'Developer', 'Staff'))
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
  INSERT INTO public.users (id, username, name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'username', 
    new.raw_user_meta_data->>'name', 
    new.raw_user_meta_data->>'role'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
