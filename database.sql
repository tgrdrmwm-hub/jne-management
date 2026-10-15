-- =========================================================================
-- DATABASE MANAGEMENT JNE — SUPABASE (PostgreSQL)
-- KEBIJAKAN INTEGRITAS DATA: AMAN DARI PENGHAPUSAN (ZERO DATA LOSS)
-- =========================================================================
-- PENTING: File ini DILARANG KERAS memuat perintah DROP TABLE!
-- Seluruh tabel, data presensi, laporan harian, dan poin DIJAMIN AMAN.
-- Menggunakan pola aman: CREATE TABLE IF NOT EXISTS & ALTER TABLE ADD COLUMN.
-- =========================================================================

-- ==========================================================
-- 1. Tabel Master Users (Karyawan / Kurir / Admin / Owner)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Owner', 'Developer', 'Admin', 'Staff')),
    poin INT DEFAULT 0,
    no_telepon VARCHAR(20),
    email_pribadi VARCHAR(100),
    kontak_darurat_nama VARCHAR(100),
    kontak_darurat_nomor VARCHAR(20),
    kontak_darurat_hubungan VARCHAR(50) DEFAULT 'Keluarga',
    shift VARCHAR(50) DEFAULT 'Shift Pagi (08:00 - 17:00)'
);

-- Migrasi kolom & constraint aman (tanpa menghapus data)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS no_telepon VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_pribadi VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kontak_darurat_nama VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kontak_darurat_nomor VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kontak_darurat_hubungan VARCHAR(50) DEFAULT 'Keluarga';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS shift VARCHAR(50) DEFAULT 'Shift Pagi (08:00 - 17:00)';

-- Update check constraint role agar mendukung role 'Admin'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('Owner', 'Developer', 'Admin', 'Staff'));

-- Update role akun asri@umaratax.com menjadi Admin (Hak Kelola & Hapus Presensi)
UPDATE public.users 
SET role = 'Admin' 
WHERE username = 'asri' 
   OR email_pribadi = 'asri@umaratax.com';

-- ==========================================================
-- 2. Tabel Absensi (2 Shift: Pagi 08:00-17:00 & Siang 13:00-22:00)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.absensi (
    id SERIAL PRIMARY KEY,
    karyawan_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    shift VARCHAR(50) DEFAULT 'Shift Pagi (08:00 - 17:00)',
    jam_masuk TIME,
    jam_keluar TIME,
    total_jam INT DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpha', 'Cuti'))
);

-- Migrasi kolom shift pada tabel absensi jika belum ada
ALTER TABLE public.absensi ADD COLUMN IF NOT EXISTS shift VARCHAR(50) DEFAULT 'Shift Pagi (08:00 - 17:00)';

-- Mencegah duplikasi catatan presensi (anti double-click)
CREATE UNIQUE INDEX IF NOT EXISTS idx_absensi_karyawan_tanggal ON public.absensi (karyawan_id, tanggal);

-- ==========================================================
-- 3. Tabel Laporan Harian
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.laporan_harian (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    kegiatan VARCHAR(255) NOT NULL,
    deskripsi TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Selesai',
    bukti_foto TEXT,
    nama_penerima VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Jakarta', now())
);

-- ==========================================================
-- 4. Tabel Aktivitas (Activity Audit Log)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.aktivitas (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    absensi_id INT REFERENCES public.absensi(id) ON DELETE CASCADE,
    laporan_id INT REFERENCES public.laporan_harian(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'absen', 'laporan', 'system', 'user'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Jakarta', now())
);

-- ==========================================================
-- 5. Tabel Riwayat Poin
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.riwayat_poin (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    absensi_id INT REFERENCES public.absensi(id) ON DELETE CASCADE,
    laporan_id INT REFERENCES public.laporan_harian(id) ON DELETE CASCADE,
    jumlah_poin INT NOT NULL,
    keterangan VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Jakarta', now())
);

-- ==========================================================
-- 6. Tabel Kalender Kegiatan
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.kalender_kegiatan (
    id SERIAL PRIMARY KEY,
    judul VARCHAR(200) NOT NULL,
    kategori VARCHAR(50) NOT NULL DEFAULT 'Operasional',
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE,
    jam_mulai TIME,
    jam_selesai TIME,
    seharian BOOLEAN DEFAULT false,
    lokasi VARCHAR(150),
    pic_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    pic_nama VARCHAR(100),
    staff_terlibat JSONB DEFAULT '[]'::jsonb,
    prioritas VARCHAR(20) DEFAULT 'Biasa' CHECK (prioritas IN ('Biasa', 'Penting', 'Mendesak')),
    status VARCHAR(30) DEFAULT 'Rencana' CHECK (status IN ('Rencana', 'Berlangsung', 'Selesai', 'Dibatalkan')),
    deskripsi TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Jakarta', now())
);

-- ==========================================================
-- 7. Tabel Penjualan & Omset JNE (Cash, Cashless, HPP & Komisi)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.penjualan_jne (
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
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Jakarta', now())
);

-- ==========================================================
-- 8. Row Level Security (RLS) & Policies
-- ==========================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aktivitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riwayat_poin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kalender_kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penjualan_jne ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow all for users') THEN
        CREATE POLICY "Allow all for users" ON public.users FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'absensi' AND policyname = 'Allow all for absensi') THEN
        CREATE POLICY "Allow all for absensi" ON public.absensi FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'laporan_harian' AND policyname = 'Allow all for laporan_harian') THEN
        CREATE POLICY "Allow all for laporan_harian" ON public.laporan_harian FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'aktivitas' AND policyname = 'Allow all for aktivitas') THEN
        CREATE POLICY "Allow all for aktivitas" ON public.aktivitas FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'riwayat_poin' AND policyname = 'Allow all for riwayat_poin') THEN
        CREATE POLICY "Allow all for riwayat_poin" ON public.riwayat_poin FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kalender_kegiatan' AND policyname = 'Allow all for kalender_kegiatan') THEN
        CREATE POLICY "Allow all for kalender_kegiatan" ON public.kalender_kegiatan FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'penjualan_jne' AND policyname = 'Allow all for penjualan_jne') THEN
        CREATE POLICY "Allow all for penjualan_jne" ON public.penjualan_jne FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ==========================================================
-- 9. Trigger Sinkronisasi Otomatis Poin User
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
    FROM public.riwayat_poin
    WHERE user_id = target_user_id;

    UPDATE public.users
    SET poin = total
    WHERE id = target_user_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_user_poin ON public.riwayat_poin;

CREATE TRIGGER trigger_sync_user_poin
AFTER INSERT OR UPDATE OR DELETE ON public.riwayat_poin
FOR EACH ROW EXECUTE FUNCTION sync_user_poin();

-- ==========================================================
-- 10. Trigger Otomatis User Baru dari Supabase Auth
-- ==========================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, name, role, poin)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'username', 
    new.raw_user_meta_data->>'name', 
    COALESCE(new.raw_user_meta_data->>'role', 'Staff'),
    0
  )
  ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name,
      username = EXCLUDED.username;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ==========================================================
-- 11. Fungsi Reset Password User (Default 123456)
-- ==========================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.reset_user_password(target_user_id UUID, new_password TEXT DEFAULT '123456')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_user_password(UUID, TEXT) TO authenticated, anon;
NOTIFY pgrst, 'reload schema';
