import { Menu, Bell, LogOut, Search, ChevronDown } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { authService } from '../services/authService';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/gudang': 'Pengantaran Gudang',
  '/paket': 'Pengambilan Paket',
  '/jaga': 'Jadwal Jaga',
  '/absensi': 'Absensi',
  '/poin': 'Poin Karyawan',
  '/laporan': 'Grafik & Analytics',
};

const Header = ({ toggleSidebar }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

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
    <header className="h-[72px] bg-white/80 backdrop-blur-xl border-b border-gray-200/60 flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0">
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
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-100/80 px-4 py-2.5 rounded-xl border border-transparent focus-within:border-blue-200 focus-within:bg-white focus-within:shadow-sm transition-all">
          <Search size={16} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari..." 
            className="bg-transparent border-none outline-none text-sm w-48 text-gray-700 placeholder-gray-400"
          />
        </div>

        {/* Notification */}
        <button className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors relative group">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--color-jne-red)] rounded-full ring-2 ring-white"></span>
        </button>
        
        <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>
        
        {/* Profile */}
        <div className="flex items-center gap-3 pl-2 pr-1 py-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
            {user?.name?.charAt(0)}
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-semibold text-gray-800 block leading-tight">{user?.name}</span>
            <span className="text-[11px] text-gray-400 capitalize">{user?.role}</span>
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
