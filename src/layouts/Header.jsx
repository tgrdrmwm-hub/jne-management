import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, LogOut, ChevronDown, CheckCircle2, ClipboardList, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { authService } from '../services/authService';
import { aktivitasService } from '../services/aktivitasService';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/gudang': 'Pengantaran Gudang',
  '/paket': 'Pengambilan Paket',
  '/jaga': 'Jadwal Jaga',
  '/absensi': 'Absensi',
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
      const data = await aktivitasService.getActivities(10); // Ambil 10 aktivitas terbaru
        
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
    
    // Listen for global events to refresh notifications
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
    
    // Update state to reflect everything is read without clearing history
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
        dispatch(logout());
        navigate('/login');
      }
    });
  };

  const currentPage = pageTitles[location.pathname] || 'Dashboard';

  return (
    <header className="h-[72px] bg-white/95 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <Menu size={22} />
        </button>

        <div className="hidden lg:block">
          <h1 className="text-lg font-bold text-gray-900">{currentPage}</h1>
          <p className="text-xs text-gray-400 -mt-0.5">JNE Operations Management</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotif(!showNotif)}
            className={`p-2.5 rounded-xl transition-colors relative group ${showNotif ? 'bg-blue-50 text-[var(--color-jne-blue)]' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--color-jne-red)] rounded-full ring-2 ring-white"></span>
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
                  <h3 className="font-bold text-slate-800">Aktivitas Sistem</h3>
                  {unreadCount > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount} Baru</span>
                  )}
                </div>
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
                      className="text-sm font-bold text-[var(--color-jne-blue)] hover:text-blue-700 transition-colors"
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
        
        {/* Profile */}
        <div className="flex items-center gap-3 pl-2 pr-1 py-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-jne-blue)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {user?.name?.charAt(0)}
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-semibold text-slate-800 block leading-tight">{user?.name}</span>
            <span className="text-[11px] text-slate-400 capitalize">{user?.role}</span>
          </div>
          <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
        </div>
        
        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
