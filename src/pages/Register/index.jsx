import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { 
  User, 
  Lock, 
  ArrowRight, 
  Globe, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Briefcase, 
  Send,
  KeyRound
} from 'lucide-react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    emailPribadi: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUsernameChange = (val) => {
    const clean = val.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
    setFormData((prev) => ({
      ...prev,
      username: clean,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validasi form
    if (!formData.name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nama Lengkap Wajib Diisi',
        text: 'Silakan masukkan nama lengkap Anda.',
        confirmButtonColor: 'var(--color-jne-blue)',
        customClass: { popup: 'rounded-2xl' },
      });
      return;
    }

    if (!formData.username.trim() || formData.username.length < 3) {
      Swal.fire({
        icon: 'warning',
        title: 'Username Kurang Panjang',
        text: 'Username minimal harus memiliki 3 karakter alfanumerik.',
        confirmButtonColor: 'var(--color-jne-blue)',
        customClass: { popup: 'rounded-2xl' },
      });
      return;
    }

    if (!formData.emailPribadi.trim() || !formData.emailPribadi.includes('@')) {
      Swal.fire({
        icon: 'warning',
        title: 'Email Pribadi Wajib Diisi',
        text: 'Silakan masukkan email pribadi yang valid untuk menerima kredensial akun dan verifikasi login.',
        confirmButtonColor: 'var(--color-jne-blue)',
        customClass: { popup: 'rounded-2xl' },
      });
      return;
    }

    setLoading(true);

    try {
      const result = await authService.register({
        name: formData.name.trim(),
        username: formData.username.trim(),
        emailPribadi: formData.emailPribadi.trim(),
        phone: formData.phone.trim(),
      });

      await Swal.fire({
        icon: 'success',
        title: 'Registrasi Berhasil!',
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #334155;">
            <p>Akun staf operasional Anda telah berhasil dibuat.</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 12px 0;">
              <div style="margin-bottom: 6px;"><b>Nama:</b> ${result.name}</div>
              <div style="margin-bottom: 6px;"><b>Username:</b> <span style="font-family: monospace; color: #0F3B73; font-weight: bold;">${result.username}</span></div>
              <div style="margin-bottom: 6px;"><b>Email Pribadi:</b> ${result.emailPribadi}</div>
              <div style="margin-bottom: 6px;"><b>Password Bawaan:</b> <span style="font-family: monospace; color: #D31225; font-weight: 900; letter-spacing: 1px;">123456</span></div>
              <div><b>Role Akses:</b> <span style="font-weight: bold; color: #1e293b;">Staff</span></div>
            </div>
            <p style="margin-top: 10px; font-size: 12px; color: #475569;">
              ✉️ Kredensial telah dikirimkan ke email pribadi Anda. Silakan login menggunakan password default <strong>123456</strong>, dan sistem akan otomatis meminta Anda untuk <strong>mengganti password baru</strong>.
            </p>
          </div>
        `,
        confirmButtonText: 'Masuk ke Sistem Sekarang',
        confirmButtonColor: 'var(--color-jne-blue)',
        customClass: { popup: 'rounded-2xl' },
      });

      navigate('/login', { state: { email: result.username } });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Pendaftaran Gagal',
        text: err.message || 'Terjadi kesalahan saat mendaftarkan akun. Silakan coba lagi.',
        confirmButtonColor: '#e31e24',
        customClass: { popup: 'rounded-2xl' },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-['Inter',system-ui,sans-serif]">
      {/* Left Side - Corporate Branding (Desktop Only) */}
      <div className="hidden lg:flex w-[50%] relative overflow-hidden bg-[var(--color-sidebar)]">
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#112440] to-[#00376a]" />

        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`
          }} 
        />

        <div className="relative z-10 p-16 flex flex-col justify-between h-full w-full max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-8">
              <span className="text-2xl font-black text-[var(--color-jne-red)]">JNE</span>
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <ShieldCheck size={14} className="text-blue-400" /> Registrasi Personel Staf
            </div>

            <h1 className="text-4xl leading-tight font-black text-white mb-6">
              Bergabung dengan<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                Ekosistem Operasional JNE
              </span>
            </h1>

            <p className="text-blue-100/80 text-base leading-relaxed max-w-lg font-light">
              Daftarkan diri Anda sebagai staf operasional JNE. Kredensial masuk akan dikirimkan langsung ke email pribadi Anda untuk diverifikasi saat login pertama.
            </p>
          </motion.div>

          {/* Value Props Cards */}
          <div className="space-y-4 my-8">
            <motion.div 
              initial={{ opacity: 0, x: -30 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.5, type: 'spring' }}
              className="bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4 max-w-md shadow-xl"
            >
              <div className="p-3 bg-blue-500/20 rounded-xl text-blue-300">
                <KeyRound size={22} />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Verifikasi Mandiri & Ganti Password</p>
                <p className="text-blue-200/70 text-xs mt-0.5">Password default dikirim ke email dan wajib diganti saat login</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -30 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.7, type: 'spring' }}
              className="bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4 max-w-md shadow-xl"
            >
              <div className="p-3 bg-red-500/20 rounded-xl text-red-300">
                <Briefcase size={22} />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Akses Presensi & Kalender Kegiatan</p>
                <p className="text-blue-200/70 text-xs mt-0.5">Langsung terhubung dengan sistem shift, presensi, dan tugas PIC</p>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-2 text-blue-200/50 text-sm mt-auto">
            <Globe size={16} /> <span>JNE Operations Portal © 2026</span>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-[50%] flex items-center justify-center p-6 sm:p-10 lg:p-14 relative overflow-y-auto max-h-screen">
        {/* Mobile Header Logo */}
        <div className="absolute top-6 left-6 lg:hidden">
          <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-md border border-gray-100">
            <span className="text-lg font-black text-[var(--color-jne-red)]">JNE</span>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md my-auto pt-14 lg:pt-0"
        >
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Daftar Akun Baru
            </h2>
            <p className="text-gray-500 text-sm mt-1.5">
              Isi data diri Anda. Kredensial akun (password default) akan dikirimkan ke email pribadi.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nama Lengkap */}
            <Input
              icon={User}
              label="Nama Lengkap"
              placeholder="Contoh: Ryan Pratama"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="!py-2.5 !bg-gray-50/50 focus:!bg-white !rounded-xl"
              required
            />

            {/* Username & Domain */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 block">
                Username Login Sistem <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-xl overflow-hidden border border-slate-300 focus-within:border-[var(--color-jne-blue)] focus-within:ring-4 focus-within:ring-[var(--color-jne-blue)]/10 transition-all bg-white">
                <div className="pl-3.5 pr-2 flex items-center text-gray-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="ryan"
                  value={formData.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="w-full py-2.5 px-2 text-sm bg-transparent outline-none font-medium text-slate-800"
                />
                <div className="bg-slate-100 px-3 flex items-center border-l border-slate-200 text-slate-600 text-xs font-mono select-none">
                  @umaratax.com
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Digunakan untuk login ke sistem JNE.
              </p>
            </div>

            {/* Email Pribadi (Wajib - untuk pengiriman kredensial) */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 block">
                Email Pribadi (Untuk Verifikasi & Password) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="email.anda@gmail.com"
                  value={formData.emailPribadi}
                  onChange={(e) => handleInputChange('emailPribadi', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-gray-50/50 focus:bg-white px-4 py-2.5 pl-10 text-sm transition-all focus:outline-none focus:border-[var(--color-jne-blue)] focus:ring-4 focus:ring-[var(--color-jne-blue)]/10 font-medium"
                />
              </div>
              <p className="text-[11px] text-blue-600 font-medium">
                ✉️ Kredensial login (username & password default: 123456) akan dikirimkan ke email ini.
              </p>
            </div>

            {/* Posisi / Role Default */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Briefcase size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Posisi Akun Baru</p>
                  <p className="text-[11px] text-slate-500">Staff (Operasional / Kurir / Gudang)</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-600 text-white shadow-2xs">
                Default Staff
              </span>
            </div>

            {/* Nomor Telepon / WhatsApp */}
            <Input
              icon={Phone}
              label="Nomor WhatsApp / Telepon (Opsional)"
              placeholder="Contoh: 081234567890"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value.replace(/[^0-9+]/g, ''))}
              className="!py-2.5 !bg-gray-50/50 focus:!bg-white !rounded-xl"
            />

            {/* Info Box Password Default & Wajib Ganti Password */}
            <div className="p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <Lock size={14} className="text-blue-600 shrink-0" />
                <span>Password Bawaan: 123456 (Wajib Ganti Saat Login)</span>
              </div>
              <p className="text-[11px] text-blue-800/80 leading-relaxed">
                Anda tidak perlu membuat password sekarang. Sistem akan otomatis menyetel password bawaan <strong>123456</strong> dan mengirimkannya ke email pribadi Anda. Saat pertama kali login, jendela ganti password baru akan muncul otomatis.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
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
                    Mendaftarkan Akun & Mengirim Email...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send size={17} />
                    Daftar & Kirim Kredensial ke Email
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Sudah memiliki akun?{' '}
              <Link 
                to="/login" 
                className="font-bold text-[var(--color-jne-blue)] hover:text-blue-700 hover:underline transition-colors"
              >
                Masuk ke Sistem
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
