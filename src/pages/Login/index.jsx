import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginStart, loginSuccess, loginFailure } from '../../store/authSlice';
import { authService } from '../../services/authService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { User, Lock, LogIn, ArrowRight, Package, Truck, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);

  const handleLogin = (e) => {
    e.preventDefault();
    dispatch(loginStart());

    setTimeout(async () => {
      try {
        const user = await authService.login(username, password);
        dispatch(loginSuccess(user));
        Swal.fire({
          icon: 'success',
          title: 'Login Berhasil',
          text: `Selamat datang, ${user.name}!`,
          timer: 1500,
          showConfirmButton: false,
          background: '#fff',
          customClass: { popup: 'rounded-2xl' }
        });
        navigate('/dashboard');
      } catch (error) {
        dispatch(loginFailure(error.message));
        Swal.fire({
          icon: 'error',
          title: 'Akses Ditolak',
          text: error.message || 'Kredensial yang Anda masukkan tidak valid.',
          background: '#fff',
          customClass: { popup: 'rounded-2xl' },
          confirmButtonColor: '#e31e24'
        });
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-['Inter',system-ui,sans-serif]">
      {/* Left Side - Branding & Illustration */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-[var(--color-sidebar)]">
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#112440] to-[#00376a]" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`
        }} />

        {/* Animated Orbs */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-32 w-[30rem] h-[30rem] bg-blue-500 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-0 right-0 w-[40rem] h-[40rem] bg-red-600 rounded-full blur-[150px]" 
        />

        <div className="relative z-10 p-16 flex flex-col justify-between h-full w-full max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-8">
              <span className="text-2xl font-black text-[var(--color-jne-red)]">JNE</span>
            </div>
            <h1 className="text-4xl leading-tight font-black text-white mb-6">
              Sistem Operasional<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Terintegrasi</span>
            </h1>
            <p className="text-blue-100/80 text-lg leading-relaxed max-w-lg font-light">
              Tingkatkan efisiensi pengelolaan gudang, pemantauan kurir, dan layanan logistik dengan platform manajemen real-time kami.
            </p>
          </motion.div>

          {/* Floating Feature Cards */}
          <div className="relative h-64 w-full mt-12">
            <motion.div 
              initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, type: 'spring' }}
              className="absolute top-0 left-0 bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4 w-64 shadow-2xl"
            >
              <div className="p-3 bg-blue-500/20 rounded-xl text-blue-300"><Truck size={24} /></div>
              <div>
                <p className="text-white font-bold text-sm">Tracking Kurir</p>
                <p className="text-blue-200/70 text-xs mt-0.5">Pantau real-time</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8, type: 'spring' }}
              className="absolute top-24 right-8 bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4 w-64 shadow-2xl"
            >
              <div className="p-3 bg-red-500/20 rounded-xl text-red-300"><Package size={24} /></div>
              <div>
                <p className="text-white font-bold text-sm">Manajemen Gudang</p>
                <p className="text-blue-200/70 text-xs mt-0.5">Sirkulasi paket cepat</p>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-2 text-blue-200/50 text-sm mt-auto">
            <Globe size={16} /> <span>JNE Operations Portal © 2026</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 lg:p-16 relative">
        {/* Mobile Logo Only */}
        <div className="absolute top-8 left-8 lg:hidden">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-100">
            <span className="text-xl font-black text-[var(--color-jne-red)]">JNE</span>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Selamat Datang </h2>
            <p className="text-gray-500 text-sm">Silakan masukkan kredensial Anda untuk masuk ke sistem manajemen.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-5">
              <Input
                icon={User}
                label="Username"
                placeholder="misal: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="!py-3 !bg-gray-50/50 focus:!bg-white !rounded-xl"
                required
              />
              
              <Input
                icon={Lock}
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="!py-3 !bg-gray-50/50 focus:!bg-white !rounded-xl"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full !rounded-xl !py-3.5 !text-base bg-gradient-to-r from-[var(--color-jne-blue)] to-blue-600 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25 border-none transition-all group" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memverifikasi...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Masuk ke Sistem
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          {/* Demo Login Badges */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 text-center lg:text-left">Akses Demo Cepat</p>
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              {[
                { label: 'Admin', user: 'admin', bg: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100' },
                { label: 'SPV', user: 'spv', bg: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100' },
                { label: 'Kurir', user: 'kurir1', bg: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-100' },
              ].map((cred) => (
                <button
                  key={cred.user}
                  type="button"
                  onClick={() => { setUsername(cred.user); setPassword('password'); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-sm font-semibold ${cred.bg}`}
                >
                  <User size={14} />
                  {cred.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-3 text-center lg:text-left">
              *Klik tombol di atas untuk login otomatis tanpa mengetik.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
