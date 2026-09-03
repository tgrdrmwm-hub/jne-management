import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserCheck, 
  BarChart3,
  Users,
  X,
  ChevronRight,
  ClipboardList,
  ClipboardCheck,
  Coins
} from 'lucide-react';
import clsx from 'clsx';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { path: '/absensi', name: 'Absensi', icon: UserCheck },
  { path: '/laporan-harian', name: 'Laporan Harian', icon: ClipboardList },
  { path: '/laporan-staff', name: 'Laporan Staff', icon: ClipboardCheck, roles: ['Owner', 'Developer'] },
  { path: '/poin', name: 'Poin Karyawan', icon: Coins },
  { path: '/staff', name: 'Staff', icon: Users },
  { path: '/laporan', name: 'Grafik & Analytics', icon: BarChart3, roles: ['Owner', 'Developer'] },
];

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useSelector((state) => state.auth);
  
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      <aside 
        className={clsx(
          "fixed top-0 left-0 z-50 h-screen w-20 bg-[var(--color-sidebar)] text-white transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-full lg:flex-shrink-0 flex flex-col items-center",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header Logo */}
        <div className="h-[72px] flex items-center justify-center w-full border-b border-white/[0.06] shrink-0">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-sm font-black text-white tracking-tighter">JNE</span>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden absolute right-4 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* User Profile */}
        <div className="w-full py-4 border-b border-white/[0.06] shrink-0 flex justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20 relative group cursor-pointer">
            {user?.name?.charAt(0) || 'U'}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[var(--color-sidebar)]"></span>
            
            {/* Tooltip */}
            <div className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
              {user?.name || 'User'} - {user?.role || 'Staff'}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 w-full flex flex-col items-center space-y-2">
          {navItems.map((item) => {
            if (item.roles && !item.roles.includes(user?.role)) {
              return null;
            }
            
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.name}
                className={({ isActive }) => clsx(
                  "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-gradient-to-br from-blue-600/20 to-blue-500/10 text-blue-400 border border-blue-500/20" 
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    )}
                    <Icon size={22} className={isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"} />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06] w-full shrink-0 flex justify-center">
          <div className="w-8 h-8 rounded-full bg-white/[0.02] flex items-center justify-center text-[10px] text-slate-500" title="© 2026 JNE">
            JNE
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
