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
    poin INT DEFAULT 0,
    no_telepon VARCHAR(20),
    email_pribadi VARCHAR(100),
    kontak_darurat_nama VARCHAR(100),
    kontak_darurat_nomor VARCHAR(20),
    kontak_darurat_hubungan VARCHAR(50) DEFAULT 'Keluarga'
);

-- Migrasi jika kolom belum ada di tabel users yang sudah berjalan
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS no_telepon VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_pribadi VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kontak_darurat_nama VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kontak_darurat_nomor VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kontak_darurat_hubungan VARCHAR(50) DEFAULT 'Keluarga';

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
-- FUNGSI RESET PASSWORD USER KE DEFAULT (123456)
-- ==========================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.reset_user_password(target_user_id UUID, new_password TEXT DEFAULT '123456')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
BEGIN
  -- Update hash password ke 123456 di tabel auth.users menggunakan bcrypt
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_user_password(UUID, TEXT) TO authenticated, anon;
NOTIFY pgrst, 'reload schema';

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
    bukti_foto TEXT,
    nama_penerima VARCHAR(100),
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

-- ==========================================================
-- 7. Tabel Kalender Kegiatan
-- ==========================================================
DROP TABLE IF EXISTS kalender_kegiatan CASCADE;

CREATE TABLE IF NOT EXISTS kalender_kegiatan (
    id SERIAL PRIMARY KEY,
    judul VARCHAR(200) NOT NULL,
    kategori VARCHAR(50) NOT NULL DEFAULT 'Operasional',
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE,
    jam_mulai TIME,
    jam_selesai TIME,
    seharian BOOLEAN DEFAULT false,
    lokasi VARCHAR(150),
    pic_id UUID REFERENCES users(id) ON DELETE SET NULL,
    pic_nama VARCHAR(100),
    staff_terlibat JSONB DEFAULT '[]'::jsonb,
    prioritas VARCHAR(20) DEFAULT 'Biasa' CHECK (prioritas IN ('Biasa', 'Penting', 'Mendesak')),
    status VARCHAR(30) DEFAULT 'Rencana' CHECK (status IN ('Rencana', 'Berlangsung', 'Selesai', 'Dibatalkan')),
    deskripsi TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Jakarta', now())
);

ALTER TABLE kalender_kegiatan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for kalender_kegiatan" ON kalender_kegiatan FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================
-- 8. Tabel Penjualan & Omset JNE (Cash, Cashless, HPP & Komisi)
-- ==========================================================
DROP TABLE IF EXISTS penjualan_jne CASCADE;

CREATE TABLE IF NOT EXISTS penjualan_jne (
    id SERIAL PRIMARY KEY,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu TIME DEFAULT CURRENT_TIME,
    no_resi VARCHAR(50),
    pelanggan VARCHAR(100) DEFAULT 'Pelanggan Counter',
    layanan VARCHAR(30) DEFAULT 'REG',
    tipe_transaksi VARCHAR(20) NOT NULL CHECK (tipe_transaksi IN ('Cash', 'Cashless')),
    marketplace VARCHAR(50) DEFAULT 'None',
    nilai_ongkir NUMERIC(12, 2) NOT NULL DEFAULT 0,
    komisi_persen NUMERIC(5, 2) NOT NULL DEFAULT 15,
    komisi_nominal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    hpp_pusat NUMERIC(12, 2) NOT NULL DEFAULT 0,
    kas_diterima NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status_setor VARCHAR(30) DEFAULT 'Belum Setor',
    catatan TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Jakarta', now())
);

ALTER TABLE penjualan_jne ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for penjualan_jne" ON penjualan_jne FOR ALL USING (true) WITH CHECK (true);



