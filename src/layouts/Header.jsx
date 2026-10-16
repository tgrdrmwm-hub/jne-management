import { useState, useRef, useEffect, useMemo } from 'react';
import { Menu, Bell, LogOut, ChevronDown, CheckCircle2, ClipboardList, Settings, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { logout, updateProfile } from '../store/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { authService } from '../services/authService';
import { aktivitasService } from '../services/aktivitasService';
import { supabase } from '../lib/supabase';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/gudang': 'Pengantaran Gudang',
  '/paket': 'Pengambilan Paket',
  '/jaga': 'Jadwal Jaga',
  '/kalender': 'Kalender Kegiatan',
  '/absensi': 'Presensi',
  '/presensi': 'Presensi',
  '/poin': 'Poin Karyawan',
  '/laporan': 'Grafik & Analytics',
  '/laporan-harian': 'Laporan Harian',
  '/laporan-staff': 'Laporan Staff',
  '/staff': 'Manajemen Staff',
};

const Header = ({ toggleSidebar }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const [showNotif, setShowNotif] = useState(false);
  const [activities, setActivities] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const notifRef = useRef(null);

  // Profile data user aktif
  const [profileData, setProfileData] = useState(() => {
    try {
      const rawUser = localStorage.getItem('user');
      return rawUser ? JSON.parse(rawUser) : user || {};
    } catch {
      return user || {};
    }
  });

  // Evaluasi kelengkapan profil (No. HP dan Kontak Darurat)
  const checkProfileCompleteness = (u) => {
    if (!u || !u.id) return { isIncomplete: false, missingFields: [] };
    
    let cached = {};
    try {
      const rawCache = localStorage.getItem('staff_biodata_local_cache');
      if (rawCache) cached = JSON.parse(rawCache)[u.id] || {};
    } catch {}

    const phone = (u.no_telepon || cached.no_telepon || '').trim();
    const emergencyNum = (u.kontak_darurat_nomor || cached.kontak_darurat_nomor || '').trim();

    const missing = [];
    if (!phone) missing.push('No. WhatsApp / HP');
    if (!emergencyNum) missing.push('Kontak Darurat');

    return {
      isIncomplete: missing.length > 0,
      missingFields: missing
    };
  };

  const { isIncomplete: isProfileIncomplete, missingFields } = useMemo(() => {
    return checkProfileCompleteness(profileData);
  }, [profileData]);

  // Sinkronisasi data user dari DB & localStorage
  useEffect(() => {
    const fetchFreshProfile = async () => {
      const targetId = user?.id || profileData?.id;
      if (!targetId) return;

      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, name, username, role, no_telepon, email_pribadi, kontak_darurat_nama, kontak_darurat_nomor, kontak_darurat_hubungan, shift')
          .eq('id', targetId)
          .maybeSingle();

        if (dbUser) {
          let cached = {};
          try {
            const rawCache = localStorage.getItem('staff_biodata_local_cache');
            if (rawCache) cached = JSON.parse(rawCache)[targetId] || {};
          } catch {}

          const merged = {
            ...profileData,
            ...dbUser,
            no_telepon: dbUser.no_telepon || cached.no_telepon || profileData.no_telepon || '',
            email_pribadi: dbUser.email_pribadi || cached.email_pribadi || profileData.email_pribadi || '',
            kontak_darurat_nama: dbUser.kontak_darurat_nama || cached.kontak_darurat_nama || profileData.kontak_darurat_nama || '',
            kontak_darurat_nomor: dbUser.kontak_darurat_nomor || cached.kontak_darurat_nomor || profileData.kontak_darurat_nomor || '',
            kontak_darurat_hubungan: dbUser.kontak_darurat_hubungan || cached.kontak_darurat_hubungan || profileData.kontak_darurat_hubungan || 'Keluarga',
            shift: dbUser.shift || cached.shift || profileData.shift || 'Shift Pagi (08:00 - 17:00)',
          };

          setProfileData(merged);
          localStorage.setItem('user', JSON.stringify(merged));
          dispatch(updateProfile(merged));
        }
      } catch (err) {
        console.warn('Gagal sinkron profil di Header:', err);
      }
    };

    fetchFreshProfile();

    const handleUserUpdate = () => {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          setProfileData(parsed);
        } catch {}
      }
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, [user?.id]);

  // Notifikasi Toast Otomatis di Kanan Atas saat Login jika profil belum lengkap
  useEffect(() => {
    if (!profileData?.id) return;
    
    const isJustLoggedIn = sessionStorage.getItem('just_logged_in') === 'true';
    const notifShownThisSession = sessionStorage.getItem('profile_incomplete_toast_shown') === 'true';

    if (isProfileIncomplete && (isJustLoggedIn || !notifShownThisSession)) {
      sessionStorage.removeItem('just_logged_in');
      sessionStorage.setItem('profile_incomplete_toast_shown', 'true');

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'Profil Belum Lengkap!',
        html: `
          <div class="text-left text-xs text-slate-700 mt-1 font-sans">
            <p>Halo <b>${profileData.name || 'Pengguna'}</b>, biodata Anda belum lengkap:</p>
            <p class="text-amber-700 font-bold mt-1">⚠️ ${missingFields.join(' & ')} belum diisi.</p>
            <p class="text-[11px] text-slate-500 mt-0.5">Harap lengkapi profil untuk keperluan operasional & darurat.</p>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'Lengkapi Sekarang',
        confirmButtonColor: '#004a8d',
        showCancelButton: true,
        cancelButtonText: 'Nanti',
        cancelButtonColor: '#94a3b8',
        timer: 10000,
        timerProgressBar: true,
        customClass: {
          popup: 'rounded-2xl shadow-xl border border-amber-300 bg-white font-sans text-xs',
          confirmButton: 'text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer',
          cancelButton: 'text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/staff', { state: { openProfile: true } });
        }
      });
    }
  }, [isProfileIncomplete, profileData?.id, missingFields, navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchActivities = async () => {
    setLoadingNotif(true);
    try {
      const data = await aktivitasService.getActivities(10);
        
      if (data && data.length > 0) {
        const lastReadTimestamp = parseInt(localStorage.getItem('lastReadNotifTimestamp') || '0');
        
        const mapped = data.map(item => ({
            id: `aktivitas-${item.id}`,
            numericId: item.id,
            timestamp: item.timestamp,
            title: item.title,
            desc: item.desc,
            time: item.time,
            type: item.type,
            isNew: item.timestamp > lastReadTimestamp
        }));
        
        setActivities(mapped);
        setUnreadCount(mapped.filter(a => a.isNew).length);
      } else {
        setActivities([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Gagal mengambil aktivitas:", error);
    } finally {
      setLoadingNotif(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    
    const handleRefresh = () => fetchActivities();
    window.addEventListener('aktivitasUpdated', handleRefresh);
    window.addEventListener('absensiUpdated', handleRefresh);
    
    return () => {
      window.removeEventListener('aktivitasUpdated', handleRefresh);
      window.removeEventListener('absensiUpdated', handleRefresh);
    };
  }, []);

  const handleClearNotif = () => {
    if (activities.length > 0) {
      const highestTimestamp = Math.max(...activities.map(a => a.timestamp));
      localStorage.setItem('lastReadNotifTimestamp', highestTimestamp.toString());
    }
    
    setActivities(prev => prev.map(a => ({ ...a, isNew: false })));
    setUnreadCount(0);
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Anda akan keluar dari sistem",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31e24',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Logout',
      cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await authService.logout();
        } catch (error) {
          console.error("Logout failed", error);
        }
        sessionStorage.removeItem('just_logged_in');
        sessionStorage.removeItem('profile_incomplete_toast_shown');
        dispatch(logout());
        navigate('/login');
      }
    });
  };

  const currentPage = pageTitles[location.pathname] || 'Dashboard';
  const totalUnreadCount = unreadCount + (isProfileIncomplete ? 1 : 0);

  return (
    <header className="h-[72px] bg-white/95 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
        >
          <Menu size={22} />
        </button>

        <div className="hidden lg:block">
          <h1 className="text-lg font-bold text-gray-900">{currentPage}</h1>
          <p className="text-xs text-gray-400 -mt-0.5">JNE Operations Management</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Indikator Profil Belum Lengkap (Kanan Atas) */}
        {isProfileIncomplete && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => navigate('/staff', { state: { openProfile: true } })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-800 border border-amber-300 text-xs font-bold transition-all shadow-xs cursor-pointer group shrink-0"
            title="Klik untuk melengkapi profil & biodata Anda"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <AlertTriangle size={14} className="text-amber-600 group-hover:scale-110 transition-transform shrink-0" />
            <span className="hidden sm:inline">Lengkapi Profil</span>
          </motion.button>
        )}

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotif(!showNotif)}
            className={`p-2.5 rounded-xl transition-colors relative group cursor-pointer ${showNotif ? 'bg-blue-50 text-[var(--color-jne-blue)]' : 'text-gray-500 hover:bg-gray-100'}`}
            title="Notifikasi Aktivitas"
          >
            <Bell size={20} />
            {totalUnreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[var(--color-jne-red)] rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {/* Dropdown Notifikasi */}
          <AnimatePresence>
            {showNotif && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-50"
              >
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">Aktivitas & Notifikasi</h3>
                  {totalUnreadCount > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{totalUnreadCount} Baru</span>
                  )}
                </div>

                {/* Banner Peringatan Profil Belum Lengkap di Dropdown Notifikasi */}
                {isProfileIncomplete && (
                  <div 
                    onClick={() => { setShowNotif(false); navigate('/staff', { state: { openProfile: true } }); }}
                    className="p-4 border-b border-amber-200 bg-gradient-to-r from-amber-50/90 to-orange-50/90 hover:from-amber-100 hover:to-orange-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex gap-3 items-start">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300/80 shadow-xs">
                        <AlertTriangle size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-amber-900 group-hover:text-blue-700 transition-colors">
                            Profil Belum Lengkap
                          </p>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-200 text-amber-900 uppercase tracking-wider">
                            Penting
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800/90 mt-1 leading-relaxed">
                          Data {missingFields.join(' dan ')} Anda belum diisi.
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-blue-700 group-hover:text-blue-900">
                          <span>Lengkapi Sekarang</span>
                          <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="max-h-[360px] overflow-y-auto">
                  {loadingNotif ? (
                    <div className="p-6 text-center text-slate-400 text-sm">Memuat aktivitas...</div>
                  ) : activities.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">Belum ada riwayat aktivitas.</div>
                  ) : (
                    activities.map((notif) => (
                      <div key={`${notif.id}-${notif.time}`} className={`px-5 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group ${notif.isNew ? 'bg-blue-50/30' : ''}`}>
                        <div className="flex gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                            notif.type === 'absen' ? 'bg-emerald-100 text-emerald-600' :
                            notif.type === 'laporan' ? 'bg-amber-100 text-amber-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {notif.type === 'absen' ? <CheckCircle2 size={18} /> : 
                             notif.type === 'laporan' ? <ClipboardList size={18} /> : 
                             <Settings size={18} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-semibold text-slate-800 group-hover:text-[var(--color-jne-blue)] transition-colors">{notif.title}</p>
                              {notif.isNew && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></span>}
                            </div>
                            <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{notif.desc}</p>
                            <p className="text-[11px] text-slate-400 mt-2 font-medium flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${notif.time.startsWith('Keluar') ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                              {notif.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {unreadCount > 0 && (
                  <div className="p-3 border-t border-slate-100 text-center bg-slate-50/50">
                    <button 
                      onClick={handleClearNotif}
                      className="text-sm font-bold text-[var(--color-jne-blue)] hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      Tandai semua dibaca
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>
        
        {/* Profile Card & Avatar */}
        <div 
          onClick={() => navigate('/staff', { state: { openProfile: true } })}
          className="flex items-center gap-3 pl-2 pr-1 py-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
          title={isProfileIncomplete ? 'Profil belum lengkap - Klik untuk melengkapi' : 'Profil Anda'}
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-jne-blue)] flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:ring-2 group-hover:ring-blue-300 transition-all">
              {profileData?.name?.charAt(0) || user?.name?.charAt(0) || 'U'}
            </div>
            {isProfileIncomplete && (
              <span 
                className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-black shadow-xs animate-bounce"
                title="Profil belum lengkap"
              >
                !
              </span>
            )}
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-semibold text-slate-800 block leading-tight">{profileData?.name || user?.name}</span>
            <span className="text-[11px] text-slate-400 capitalize">{profileData?.role || user?.role}</span>
          </div>
          <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
        </div>
        
        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
