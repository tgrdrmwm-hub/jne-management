import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Mail, 
  Shield, 
  User, 
  Loader2, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Phone, 
  AlertCircle, 
  Eye, 
  HeartHandshake, 
  PhoneCall, 
  MessageCircle, 
  Award,
  Sparkles,
  UserCheck,
  CheckCircle2,
  KeyRound,
  Sun,
  ShieldCheck,
  Sunset
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { staffService } from '../../services/staffService';
import { updateProfile } from '../../store/authSlice';
import { Input } from '../../components/ui/Input';

const Staff = () => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  
  // Developer dan Owner diizinkan untuk menambah akun baru & mengelola staff lain
  const isDeveloperOrOwner = currentUser?.role === 'Developer' || currentUser?.role === 'Owner' || !currentUser?.role;

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState('Semua'); // 'Semua' | 'Pagi' | 'Siang'

  // Initial Form State
  const initialForm = {
    username: '',
    name: '',
    role: 'Staff',
    shift: 'Shift Pagi (08:00 - 17:00)',
    password: '',
    no_telepon: '',
    email_pribadi: '',
    kontak_darurat_nama: '',
    kontak_darurat_nomor: '',
    kontak_darurat_hubungan: 'Orang Tua'
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  // Detail Modal State (Lihat Biodata Lengkap)
  const [detailStaff, setDetailStaff] = useState(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await staffService.getStaffList();
      setStaff(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Profil user yang sedang login (Developer atau Staff)
  const myProfile = useMemo(() => {
    if (!currentUser || !staff || staff.length === 0) return null;
    const cleanCurrentUsername = (currentUser.username || '').replace(/@umaratax\.com$/i, '').toLowerCase();
    return staff.find(s => 
      (currentUser.id && s.id === currentUser.id) || 
      (cleanCurrentUsername && s.cleanUsername?.toLowerCase() === cleanCurrentUsername) ||
      (currentUser.name && s.name?.toLowerCase() === currentUser.name?.toLowerCase())
    ) || null;
  }, [staff, currentUser]);

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'developer':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'admin':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return <Shield size={14} />;
      case 'developer':
        return <User size={14} />;
      case 'admin':
        return <ShieldCheck size={14} />;
      default:
        return <Users size={14} />;
    }
  };

  const handleOpenModal = (mode, staffData = null) => {
    setModalMode(mode);
    if (staffData) {
      setSelectedStaff(staffData);
      setFormData({
        username: (staffData.cleanUsername || staffData.username || '').replace(/@umaratax\.com$/i, ''),
        name: staffData.name || '',
        role: staffData.role || 'Staff',
        shift: staffData.shift || 'Shift Pagi (08:00 - 17:00)',
        password: '',
        no_telepon: staffData.no_telepon || '',
        email_pribadi: staffData.email_pribadi || '',
        kontak_darurat_nama: staffData.kontak_darurat_nama || '',
        kontak_darurat_nomor: staffData.kontak_darurat_nomor || '',
        kontak_darurat_hubungan: staffData.kontak_darurat_hubungan || 'Orang Tua'
      });
    } else {
      setSelectedStaff(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialForm);
    setSelectedStaff(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUsername = formData.username
      .replace(/@umaratax\.com$/i, '')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .toLowerCase()
      .trim();

    if (!cleanUsername || !formData.name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Belum Lengkap',
        text: 'Nama lengkap dan username sistem wajib diisi.',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'add') {
        await staffService.createStaff({
          ...formData,
          username: cleanUsername,
        });
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: `Staff "${formData.name}" beserta biodata & shift berhasil ditambahkan.`,
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: 'rounded-2xl' }
        });
      } else {
        const updates = {
          name: formData.name.trim(),
          username: cleanUsername,
          role: formData.role,
          shift: formData.shift,
          no_telepon: formData.no_telepon,
          email_pribadi: formData.email_pribadi,
          kontak_darurat_nama: formData.kontak_darurat_nama,
          kontak_darurat_nomor: formData.kontak_darurat_nomor,
          kontak_darurat_hubungan: formData.kontak_darurat_hubungan
        };
        await staffService.updateStaff(selectedStaff.id, updates);

        // Jika user yang diedit adalah akun yang sedang login (baik Developer maupun Staff)
        const isSelf = selectedStaff.id === currentUser?.id || 
          cleanUsername === (currentUser?.username || '').replace(/@umaratax\.com$/i, '');
        
        if (isSelf) {
          dispatch(updateProfile({
            name: updates.name,
            no_telepon: updates.no_telepon,
            email_pribadi: updates.email_pribadi,
            kontak_darurat_nama: updates.kontak_darurat_nama,
            kontak_darurat_nomor: updates.kontak_darurat_nomor,
            kontak_darurat_hubungan: updates.kontak_darurat_hubungan
          }));
        }

        Swal.fire({
          icon: 'success',
          title: 'Biodata Tersimpan',
          text: isSelf ? 'Biodata Anda berhasil diperbarui.' : `Biodata "${formData.name}" berhasil diperbarui.`,
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: 'rounded-2xl' }
        });
      }
      handleCloseModal();
      await fetchStaff();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: err.message || 'Terjadi kesalahan saat memproses data staff.',
        customClass: { popup: 'rounded-2xl' }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (targetUser) => {
    if (currentUser?.id === targetUser.id) {
      Swal.fire({
        icon: 'warning',
        title: 'Tidak Diizinkan',
        text: 'Anda tidak dapat menghapus akun Anda sendiri.',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    const displayName = targetUser.name || 'Staff';
    const displayUsername = targetUser.cleanUsername || targetUser.username?.replace(/@umaratax\.com$/i, '');

    Swal.fire({
      title: 'Hapus Staff?',
      html: `Apakah Anda yakin ingin menghapus <b>${displayName}</b> (@${displayUsername}) dari sistem? Data biodata juga akan dihapus.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31e24',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await staffService.deleteStaff(targetUser.id);
          Swal.fire({
            icon: 'success',
            title: 'Terhapus!',
            text: `Staff "${displayName}" berhasil dihapus dari database.`,
            timer: 1800,
            showConfirmButton: false,
            customClass: { popup: 'rounded-2xl' }
          });
          fetchStaff();
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menghapus',
            text: err.message,
            customClass: { popup: 'rounded-2xl' }
          });
        }
      }
    });
  };

  // Reset Password ke Default 123456
  const handleResetPassword = (targetUser) => {
    const displayName = targetUser.name || 'Staff';
    const displayUsername = targetUser.cleanUsername || targetUser.username?.replace(/@umaratax\.com$/i, '');

    Swal.fire({
      title: 'Reset Password Staff?',
      html: `
        <div style="font-size: 13px; color: #475569; text-align: center; line-height: 1.6;">
          Password untuk <b>${displayName}</b> (@${displayUsername}) akan dikembalikan ke default:
          <div style="margin: 14px auto; font-family: monospace; font-size: 20px; font-weight: bold; background: #f8fafc; padding: 8px 18px; border-radius: 12px; border: 1.5px dashed #cbd5e1; color: #0f172a; width: fit-content; letter-spacing: 2px;">
            123456
          </div>
          <span style="font-size: 11px; color: #64748b;">
            Staff dapat langsung login kembali menggunakan password <b>123456</b> dan akan diminta memperbarui password barunya saat login.
          </span>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset ke 123456',
      cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Memproses Reset Password...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        try {
          await staffService.resetPassword(targetUser);
          Swal.fire({
            icon: 'success',
            title: 'Password Berhasil Direset!',
            html: `Password untuk <b>${displayName}</b> telah berhasil dikembalikan ke default: <b style="font-family:monospace; color:#2563eb;">123456</b>.`,
            confirmButtonColor: '#2563eb',
            customClass: { popup: 'rounded-2xl' }
          });
        } catch (err) {
          const RESET_PASSWORD_SQL = `-- 1. Pastikan ekstensi pgcrypto aktif
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tambahkan kolom biodata staff jika belum ada
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS no_telepon VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_pribadi VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kontak_darurat_nama VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kontak_darurat_nomor VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kontak_darurat_hubungan VARCHAR(50);

-- 3. Fungsi reset password ke default 123456
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

-- 4. Beri izin eksekusi
GRANT EXECUTE ON FUNCTION public.reset_user_password(UUID, TEXT) TO authenticated, anon;

-- 5. Muat ulang cache schema PostgREST
NOTIFY pgrst, 'reload schema';`;

          if (err.isMissingSql || err.message?.includes('reset_user_password')) {
            Swal.fire({
              icon: 'warning',
              title: 'SQL Belum Aktif di Supabase',
              html: `
                <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
                  <p style="margin-bottom: 10px;">
                    Supabase mengamankan akun secara ketat. Anda hanya perlu <b>menjalankan 1 script SQL</b> di Supabase SQL Editor agar password staff bisa di-reset kapan saja:
                  </p>
                  <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                    <button id="btn-copy-sql" type="button" style="flex: 1; background: #0284c7; color: white; padding: 8px 12px; border-radius: 8px; font-weight: 600; font-size: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                      📋 Salin Script SQL
                    </button>
                    <a href="https://supabase.com/dashboard/project/csfaftgqkygloightmid/sql/new" target="_blank" rel="noopener noreferrer" style="flex: 1; background: #0f172a; color: white; padding: 8px 12px; border-radius: 8px; font-weight: 600; font-size: 12px; text-decoration: none; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px;">
                      ↗ Buka SQL Editor
                    </a>
                  </div>
                  <pre style="background: #0f172a; color: #38bdf8; padding: 10px; border-radius: 8px; font-size: 11px; max-height: 130px; overflow-y: auto; text-align: left; font-family: monospace;">${RESET_PASSWORD_SQL}</pre>
                  <p style="margin-top: 10px; font-size: 11px; color: #64748b;">
                    💡 <b>Cara:</b> Klik tombol <i>Salin Script SQL</i> di atas ➔ Buka SQL Editor Supabase ➔ Paste dan klik <b>Run</b> ➔ Lalu klik tombol <i>Coba Reset Lagi</i> di bawah.
                  </p>
                </div>
              `,
              showCancelButton: true,
              confirmButtonText: '🔄 Coba Reset Lagi',
              cancelButtonText: 'Tutup',
              confirmButtonColor: '#2563eb',
              cancelButtonColor: '#64748b',
              customClass: { popup: 'rounded-2xl', htmlContainer: 'text-left' },
              didOpen: () => {
                const btn = document.getElementById('btn-copy-sql');
                if (btn) {
                  btn.onclick = () => {
                    navigator.clipboard.writeText(RESET_PASSWORD_SQL);
                    btn.innerHTML = '✅ Berhasil Disalin!';
                    btn.style.background = '#16a34a';
                    setTimeout(() => {
                      btn.innerHTML = '📋 Salin Script SQL';
                      btn.style.background = '#0284c7';
                    }, 2500);
                  };
                }
              }
            }).then((res) => {
              if (res.isConfirmed) {
                handleResetPassword(targetUser);
              }
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Gagal Reset Password',
              text: err.message,
              customClass: { popup: 'rounded-2xl' }
            });
          }
        }
      }
    });
  };

  const filteredStaff = staff.filter(user => {
    const q = searchTerm.toLowerCase();
    const matchSearch = (
      user.name?.toLowerCase().includes(q) || 
      user.username?.toLowerCase().includes(q) ||
      user.role?.toLowerCase().includes(q) ||
      user.shift?.toLowerCase().includes(q) ||
      user.no_telepon?.toLowerCase().includes(q) ||
      user.email_pribadi?.toLowerCase().includes(q) ||
      user.kontak_darurat_nama?.toLowerCase().includes(q) ||
      user.kontak_darurat_nomor?.toLowerCase().includes(q)
    );

    const matchShift = 
      shiftFilter === 'Semua' ||
      (shiftFilter === 'Pagi' && user.shift?.toLowerCase().includes('pagi')) ||
      (shiftFilter === 'Siang' && user.shift?.toLowerCase().includes('siang'));

    return matchSearch && matchShift;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center border border-slate-800 shadow-xs shrink-0">
            <Users size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Data & Biodata Staff</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {staff.length} Karyawan
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Setiap staff & developer dapat mengisi nama, no. HP, email pribadi, dan kontak darurat masing-masing
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="w-full sm:w-56">
            <Input 
              icon={Search}
              placeholder="Cari nama, kontak, shift..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="!bg-slate-50/70 !text-xs !py-1.5"
            />
          </div>

          {/* Filter Shift Segments */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 shrink-0 text-xs">
            <button
              type="button"
              onClick={() => setShiftFilter('Semua')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                shiftFilter === 'Semua' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter('Pagi')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                shiftFilter === 'Pagi' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sun size={11} />
              <span>Pagi</span>
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter('Siang')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                shiftFilter === 'Siang' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sunset size={11} />
              <span>Siang</span>
            </button>
          </div>

          {isDeveloperOrOwner && (
            <button 
              onClick={() => handleOpenModal('add')}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>+ Tambah Staff Baru</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* ======================================================== */}
      {/* KARTU BIODATA USER YANG SEDANG LOGIN (DEVELOPER & STAFF) */}
      {/* ======================================================== */}
      {myProfile && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-black shrink-0 shadow-md border border-blue-400/30">
              {myProfile.name?.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base text-white">{myProfile.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                  <UserCheck size={11} />
                  <span>Anda ({myProfile.role})</span>
                </span>
                {(!myProfile.no_telepon || !myProfile.kontak_darurat_nomor) ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <AlertCircle size={11} /> Biodata Belum Lengkap
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Biodata Lengkap
                  </span>
                )}
              </div>
              <div className="text-slate-300 text-xs flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                <span>📱 {myProfile.no_telepon || <em className="text-slate-500">No. HP belum diisi</em>}</span>
                <span>•</span>
                <span>📧 {myProfile.email_pribadi || `${myProfile.cleanUsername}@umaratax.com`}</span>
                <span>•</span>
                <span className="font-semibold text-slate-200">
                  ⏱️ {myProfile.shift || 'Shift Pagi (08:00 - 17:00)'}
                </span>
                <span>•</span>
                <span>🚨 Kontak Darurat: {myProfile.kontak_darurat_nama ? `${myProfile.kontak_darurat_nama} (${myProfile.kontak_darurat_nomor})` : <em className="text-slate-500">Belum diisi</em>}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleOpenModal('edit', myProfile)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-stretch sm:self-auto justify-center shrink-0"
          >
            <Edit2 size={14} />
            <span>{(!myProfile.no_telepon || !myProfile.kontak_darurat_nomor) ? 'Isi / Lengkapi Biodata Saya' : 'Edit Biodata Saya'}</span>
          </button>
        </motion.div>
      )}

      {/* Main Table Content */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          <Loader2 size={28} className="animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-slate-500">Memuat data biodata staff...</p>
        </div>
      ) : error ? (
        <div className="h-48 flex items-center justify-center text-red-600 bg-red-50 rounded-2xl border border-red-200 p-4 text-xs font-semibold">
          <AlertCircle size={18} className="mr-2" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-bold">Profil & Akun Sistem</th>
                  <th className="py-3.5 px-4 font-bold">Role</th>
                  <th className="py-3.5 px-4 font-bold">Shift Kerja Standar</th>
                  <th className="py-3.5 px-4 font-bold">Kontak Pribadi (HP / Email)</th>
                  <th className="py-3.5 px-4 font-bold">Kontak Darurat (Emergency)</th>
                  <th className="py-3.5 px-4 font-bold text-center">Aksi Biodata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStaff.map((u) => {
                  const cleanUname = u.cleanUsername || u.username?.replace(/@umaratax\.com$/i, '');
                  const hasPhone = Boolean(u.no_telepon);
                  const hasEmergency = Boolean(u.kontak_darurat_nama || u.kontak_darurat_nomor);
                  
                  // Periksa apakah baris ini adalah akun diri sendiri yang sedang login
                  const isSelf = currentUser && (
                    (currentUser.id && u.id === currentUser.id) ||
                    (currentUser.username && cleanUname?.toLowerCase() === currentUser.username.replace(/@umaratax\.com$/i, '').toLowerCase()) ||
                    (currentUser.name && u.name?.toLowerCase() === currentUser.name?.toLowerCase())
                  );

                  // Izin edit: Developer & Owner bisa edit semua orang. Staff BISA mengedit akunnya sendiri!
                  const canEditThisStaff = isDeveloperOrOwner || isSelf;
                  const canDeleteThisStaff = isDeveloperOrOwner && currentUser?.id !== u.id;

                  return (
                    <tr 
                      key={u.id} 
                      className={`transition-colors ${isSelf ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* Profil & Akun */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border ${
                            isSelf ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-blue-400 border-slate-800'
                          }`}>
                            {u.name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 hover:text-blue-600 transition-colors">{u.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                  Akun Anda
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">@{cleanUname} • {u.poin || 0} Poin</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getRoleColor(u.role)}`}>
                          {getRoleIcon(u.role)}
                          {u.role}
                        </span>
                      </td>

                      {/* Shift Kerja Standar */}
                      <td className="py-3 px-4">
                        {u.shift?.includes('Siang') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <Sunset size={12} className="text-blue-600 shrink-0" />
                            <span>Shift Siang</span>
                            <span className="font-mono text-[9px] text-blue-600 font-medium">(13-22)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Sun size={12} className="text-amber-600 shrink-0" />
                            <span>Shift Pagi</span>
                            <span className="font-mono text-[9px] text-amber-600 font-medium">(08-17)</span>
                          </span>
                        )}
                      </td>

                      {/* Kontak Pribadi */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {hasPhone ? (
                            <a 
                              href={`https://wa.me/${u.no_telepon.replace(/[^0-9]/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 font-bold font-mono text-emerald-700 hover:text-emerald-800 hover:underline bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                              title="Kirim WhatsApp / Telepon"
                            >
                              <Phone size={11} className="text-emerald-600" />
                              <span>{u.no_telepon}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No. HP belum diisi</span>
                          )}

                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Mail size={11} className="text-slate-400 shrink-0" />
                            <span>{u.email_pribadi || `${cleanUname}@umaratax.com`}</span>
                          </div>
                        </div>
                      </td>

                      {/* Kontak Darurat (Emergency) */}
                      <td className="py-3 px-4">
                        {hasEmergency ? (
                          <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-0.5 max-w-xs">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-900">
                              <AlertCircle size={12} className="text-rose-600 shrink-0" />
                              <span className="truncate">{u.kontak_darurat_nama || 'Orang Dekat'}</span>
                              <span className="text-[9px] font-normal px-1 py-0.2 rounded bg-rose-100 text-rose-700">
                                {u.kontak_darurat_hubungan || 'Keluarga'}
                              </span>
                            </div>
                            {u.kontak_darurat_nomor && (
                              <a 
                                href={`tel:${u.kontak_darurat_nomor.replace(/[^0-9+]/g, '')}`} 
                                className="inline-flex items-center gap-1 font-mono text-[10px] text-rose-700 font-bold hover:underline"
                              >
                                <PhoneCall size={10} />
                                <span>{u.kontak_darurat_nomor}</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-1 rounded border border-slate-200/60">
                            Belum ada kontak darurat
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Tombol Lihat Biodata Detail */}
                          <button 
                            onClick={() => setDetailStaff(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Biodata Lengkap"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Tombol Edit: Aktif untuk DIRI SENDIRI (Staff maupun Developer) ATAU Admin/Developer */}
                          {canEditThisStaff && (
                            <button 
                              onClick={() => handleOpenModal('edit', u)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isSelf 
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold'
                                  : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                              }`}
                              title={isSelf ? 'Edit Biodata Saya' : 'Edit Biodata Staff'}
                            >
                              <Edit2 size={15} />
                            </button>
                          )}

                          {/* Tombol Reset Password: Hanya untuk Developer & Owner */}
                          {isDeveloperOrOwner && (
                            <button 
                              onClick={() => handleResetPassword(u)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Reset Password ke Default (123456)"
                            >
                              <KeyRound size={15} />
                            </button>
                          )}
                          
                          {/* Tombol Hapus: Hanya untuk Developer / Owner (tidak bisa hapus diri sendiri) */}
                          {canDeleteThisStaff && (
                            <button 
                              onClick={() => handleDelete(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Staff"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <Users size={32} className="mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">Tidak ada staff yang cocok</p>
                        <p className="text-xs text-slate-400 mt-0.5">Coba gunakan kata kunci pencarian yang lain.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL LIHAT DETAIL BIODATA LENGKAP */}
      {/* ======================================================== */}
      <AnimatePresence>
        {detailStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200/90 my-auto text-xs"
            >
              {/* Card Header Banner */}
              <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-black shadow-md border border-blue-400/40">
                    {detailStaff.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">{detailStaff.name}</h3>
                    <p className="text-slate-400 text-xs font-mono">@{detailStaff.cleanUsername || detailStaff.username}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getRoleColor(detailStaff.role)}`}>
                        {getRoleIcon(detailStaff.role)}
                        {detailStaff.role}
                      </span>
                      <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 font-mono">
                        <Award size={11} /> {detailStaff.poin || 0} Poin
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setDetailStaff(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                {/* 1. Shift & Jam Kerja Standar */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shift Kerja Standar</div>
                    <div className="font-bold text-xs text-slate-900 mt-0.5 flex items-center gap-1.5">
                      {detailStaff.shift?.includes('Siang') ? (
                        <Sunset size={14} className="text-blue-600" />
                      ) : (
                        <Sun size={14} className="text-amber-600" />
                      )}
                      <span>{detailStaff.shift || 'Shift Pagi (08:00 - 17:00)'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] px-2 py-1 rounded bg-slate-200/80 text-slate-700 font-mono font-medium">
                      {detailStaff.shift?.includes('Siang') ? '13:00 - 22:00 WIB' : '08:00 - 17:00 WIB'}
                    </span>
                  </div>
                </div>

                {/* 2. Kontak Pribadi */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <User size={13} className="text-blue-600" />
                    <span>Kontak & Biodata Pribadi</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[10px] text-slate-400">Nomor Telepon / WhatsApp</div>
                      <div className="font-bold font-mono text-slate-900 mt-0.5 text-xs">
                        {detailStaff.no_telepon || '-'}
                      </div>
                      {detailStaff.no_telepon && (
                        <div className="mt-2 flex gap-1.5">
                          <a 
                            href={`https://wa.me/${detailStaff.no_telepon.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1"
                          >
                            <MessageCircle size={10} /> Chat WA
                          </a>
                          <a 
                            href={`tel:${detailStaff.no_telepon}`}
                            className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[10px] flex items-center gap-1"
                          >
                            <PhoneCall size={10} /> Telepon
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[10px] text-slate-400">Email Pribadi</div>
                      <div className="font-bold text-slate-900 mt-0.5 text-xs truncate">
                        {detailStaff.email_pribadi || '-'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2">
                        Email Sistem: <span className="font-mono text-slate-600">{detailStaff.cleanUsername}@umaratax.com</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Kontak Darurat (Emergency Contact) */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle size={13} />
                    <span>Kontak Darurat (Hubungi Saat Keadaan Mendesak)</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-rose-700/80">Orang yang Bisa Dihubungi:</div>
                        <div className="font-bold text-sm text-rose-950">
                          {detailStaff.kontak_darurat_nama || 'Belum diisi'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        {detailStaff.kontak_darurat_hubungan || 'Keluarga'}
                      </span>
                    </div>

                    <div>
                      <div className="text-[10px] text-rose-700/80">Nomor Telepon Darurat:</div>
                      <div className="font-mono font-bold text-rose-900 text-sm mt-0.5">
                        {detailStaff.kontak_darurat_nomor || '-'}
                      </div>
                    </div>

                    {detailStaff.kontak_darurat_nomor && (
                      <div className="pt-2 border-t border-rose-200/70 flex gap-2">
                        <a 
                          href={`tel:${detailStaff.kontak_darurat_nomor}`}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                        >
                          <PhoneCall size={12} /> Panggil Nomor Darurat
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
                <div>
                  {isDeveloperOrOwner && (
                    <button 
                      onClick={() => {
                        const target = detailStaff;
                        setDetailStaff(null);
                        handleResetPassword(target);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Kembalikan password ke 123456"
                    >
                      <KeyRound size={13} />
                      <span>Reset Password (123456)</span>
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => setDetailStaff(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL INPUT / EDIT BIODATA STAFF */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/90 max-h-[90vh] flex flex-col my-auto text-xs"
            >
              {/* Header Pinned */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {modalMode === 'add' 
                        ? 'Tambah User & Biodata Baru' 
                        : (selectedStaff?.id === currentUser?.id ? 'Edit Biodata Saya' : `Edit Biodata: ${selectedStaff?.name}`)}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium">Lengkapi identitas, kontak pribadi & kontak darurat karyawan</p>
                  </div>
                </div>
                <button 
                  onClick={handleCloseModal} 
                  className="p-1.5 text-slate-400 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form 
                id="form-staff-biodata"
                onSubmit={handleSubmit} 
                className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-4"
              >
                {/* SECTION 1: AKUN & SISTEM */}
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 pb-1">
                    <Shield size={12} className="text-blue-600" />
                    <span>1. Informasi Akun Sistem</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium"
                        placeholder="Contoh: Ryan Pratama"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Role / Hak Akses <span className="text-red-500">*</span>
                      </label>
                      <select 
                        value={formData.role}
                        disabled={!isDeveloperOrOwner}
                        onChange={e => setFormData({...formData, role: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white font-bold cursor-pointer disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value="Staff">Staff (Kasir / Kurir / Operasional)</option>
                        <option value="Admin">Admin (Kelola & Hapus Presensi)</option>
                        <option value="Developer">Developer</option>
                        <option value="Owner">Owner</option>
                      </select>
                      {!isDeveloperOrOwner && (
                        <p className="text-[9px] text-slate-400 mt-1 italic">
                          * Hak akses akun Staff ditetapkan oleh Developer/Owner.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Field Shift Kerja Standar */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Shift Kerja Standar
                    </label>
                    <select 
                      value={formData.shift || 'Shift Pagi (08:00 - 17:00)'}
                      onChange={e => setFormData({...formData, shift: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white font-bold cursor-pointer text-xs"
                    >
                      <option value="Shift Pagi (08:00 - 17:00)">🌅 Shift Pagi (08:00 - 17:00 WIB)</option>
                      <option value="Shift Siang (13:00 - 22:00)">🌇 Shift Siang (13:00 - 22:00 WIB)</option>
                      <option value="Rolling / Fleksibel">🔄 Rolling / Fleksibel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Username Login <span className="text-red-500">*</span>
                    </label>
                    <div className="flex rounded-xl overflow-hidden border border-slate-200 focus-within:border-blue-500">
                      <input 
                        type="text" 
                        required 
                        disabled={modalMode === 'edit' && !isDeveloperOrOwner}
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase()})}
                        className="w-full px-3 py-2 outline-none font-medium disabled:bg-slate-100 disabled:text-slate-500"
                        placeholder="ryan"
                      />
                      <div className="bg-slate-50 px-3 flex items-center border-l border-slate-200 text-slate-500 text-xs font-mono font-medium">
                        @umaratax.com
                      </div>
                    </div>
                  </div>

                  {modalMode === 'add' && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-[11px] text-blue-700 flex items-start gap-2">
                      <Sparkles size={14} className="text-blue-500 shrink-0 mt-0.5" />
                      <p>Password default akun baru: <strong>123456</strong>. Karyawan dapat mengganti password setelah berhasil masuk.</p>
                    </div>
                  )}
                </div>

                {/* SECTION 2: BIODATA & KONTAK PRIBADI */}
                <div className="space-y-3 pt-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 pb-1">
                    <User size={12} className="text-emerald-600" />
                    <span>2. Biodata & Kontak Pribadi Staff</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Nomor Telepon / WhatsApp
                      </label>
                      <div className="relative">
                        <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="tel" 
                          value={formData.no_telepon}
                          onChange={e => setFormData({...formData, no_telepon: e.target.value})}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-mono"
                          placeholder="081234567890"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Email Pribadi (Gmail / Yahoo)
                      </label>
                      <div className="relative">
                        <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="email" 
                          value={formData.email_pribadi}
                          onChange={e => setFormData({...formData, email_pribadi: e.target.value})}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                          placeholder="nama.saya@gmail.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: KONTAK DARURAT (EMERGENCY) */}
                <div className="space-y-3 pt-2">
                  <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1 border-b border-rose-100 pb-1">
                    <AlertCircle size={12} />
                    <span>3. Kontak Darurat (Orang yang Bisa Dihubungi)</span>
                  </div>

                  <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-200/80 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-rose-950 mb-1">
                          Nama Orang yang Dihubungi
                        </label>
                        <input 
                          type="text" 
                          value={formData.kontak_darurat_nama}
                          onChange={e => setFormData({...formData, kontak_darurat_nama: e.target.value})}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-rose-500 outline-none"
                          placeholder="Contoh: Ibu Siti (Ibu Kandung)"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-rose-950 mb-1">
                          Hubungan
                        </label>
                        <select 
                          value={formData.kontak_darurat_hubungan}
                          onChange={e => setFormData({...formData, kontak_darurat_hubungan: e.target.value})}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-rose-500 outline-none font-semibold cursor-pointer"
                        >
                          <option value="Orang Tua">Orang Tua (Ayah / Ibu)</option>
                          <option value="Pasangan">Pasangan (Suami / Istri)</option>
                          <option value="Saudara">Saudara Kandung (Kakak / Adik)</option>
                          <option value="Keluarga">Keluarga / Kerabat</option>
                          <option value="Teman Dekat">Teman Dekat</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-rose-950 mb-1">
                        Nomor Telepon Darurat
                      </label>
                      <div className="relative">
                        <PhoneCall size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" />
                        <input 
                          type="tel" 
                          value={formData.kontak_darurat_nomor}
                          onChange={e => setFormData({...formData, kontak_darurat_nomor: e.target.value})}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-rose-500 outline-none font-mono font-bold text-rose-900"
                          placeholder="081987654321"
                        />
                      </div>
                      <p className="text-[10px] text-rose-700/80 mt-1">
                        * Kontak ini dihubungi apabila terjadi keadaan darurat, kecelakaan kerja, atau karyawan berhalangan tanpa kabar.
                      </p>
                    </div>
                  </div>
                </div>
              </form>

              {/* Footer Pinned */}
              <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50 shrink-0">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 transition-colors cursor-pointer text-xs"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  form="form-staff-biodata"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer text-xs"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{modalMode === 'add' ? 'Simpan Staff & Biodata' : 'Simpan Biodata'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Staff;
