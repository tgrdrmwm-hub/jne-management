import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserCheck, 
  BarChart3,
  Users,
  X,
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { path: '/absensi', name: 'Absensi', icon: UserCheck },
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
          "fixed top-0 left-0 z-50 h-screen w-72 bg-[var(--color-sidebar)] text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-full lg:flex-shrink-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header Logo */}
        <div className="h-[72px] flex items-center justify-between px-6 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-sm font-black text-white tracking-tighter">JNE</span>
            </div>
            <div>
              <span className="text-base font-bold text-white">JNE<span className="text-[var(--color-jne-red)]">.</span>ops</span>
              <p className="text-[10px] text-slate-400 -mt-0.5">Management System</p>
            </div>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* User Profile */}
        <div className="px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white truncate">{user?.name || 'User'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] text-slate-400 capitalize">{user?.role || 'Staff'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Menu</p>
          {navItems.map((item) => {
            if (item.roles && !item.roles.includes(user?.role)) {
              return null;
            }
            
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-white font-medium border border-blue-500/20" 
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                    )}
                    <div className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                      isActive ? "bg-blue-500/20 text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                    )}>
                      <Icon size={18} />
                    </div>
                    <span className="flex-1 text-sm truncate">{item.name}</span>
                    {isActive && <ChevronRight size={14} className="text-blue-400" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06] shrink-0">
          <div className="text-center">
            <p className="text-[10px] text-slate-500">© 2026 JNE Operations</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
