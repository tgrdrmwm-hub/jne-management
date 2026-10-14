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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);

  const handleLogin = (e) => {
    e.preventDefault();
    dispatch(loginStart());

    setTimeout(async () => {
      try {
        const user = await authService.login(email, password);
        dispatch(loginSuccess(user));
        
        if (password === '123456') {
          const { value: formValues } = await Swal.fire({
            title: 'Ganti Password Wajib',
            html: `
              <p style="font-size:14px; margin-bottom:10px;">Anda masih menggunakan password bawaan. Silakan ganti password Anda untuk keamanan.</p>
              <input type="password" id="swal-input1" class="swal2-input" placeholder="Password Baru">
              <input type="password" id="swal-input2" class="swal2-input" placeholder="Konfirmasi Password Baru">
            `,
            focusConfirm: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonText: 'Simpan Password',
            confirmButtonColor: 'var(--color-jne-blue)',
            preConfirm: () => {
              const p1 = document.getElementById('swal-input1').value;
              const p2 = document.getElementById('swal-input2').value;
              if (!p1 || !p2) {
                Swal.showValidationMessage('Password tidak boleh kosong');
                return false;
              }
              if (p1 !== p2) {
                Swal.showValidationMessage('Password baru tidak cocok');
                return false;
              }
              if (p1.length < 6) {
                Swal.showValidationMessage('Password minimal 6 karakter');
                return false;
              }
              return p1;
            }
          });

          if (formValues) {
            Swal.fire({
              title: 'Menyimpan...',
              allowOutsideClick: false,
              didOpen: () => Swal.showLoading()
            });
            await authService.updatePassword(formValues);
            Swal.fire({
              icon: 'success',
              title: 'Berhasil',
              text: 'Password Anda telah diperbarui!',
              timer: 1500,
              showConfirmButton: false,
              customClass: { popup: 'rounded-2xl' }
            });
          }
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Login Berhasil',
            text: `Selamat datang, ${user.name}!`,
            timer: 1500,
            showConfirmButton: false,
            background: '#fff',
            customClass: { popup: 'rounded-2xl' }
          });
        }
        
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

        {/* Architectural subtle ambient accent */}
        <div className="absolute inset-0 bg-radial-gradient from-blue-900/30 via-slate-900/10 to-transparent pointer-events-none" />

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
                label="Email"
                placeholder="misal: owner@umaratax.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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


        </motion.div>
      </div>
    </div>
  );
};

export default Login;
