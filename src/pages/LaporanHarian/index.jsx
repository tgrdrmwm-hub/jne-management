import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { laporanHarianService } from '../../services/laporanHarianService';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  Calendar,
  User,
  History
} from 'lucide-react';
import Swal from 'sweetalert2';

const LaporanHarian = () => {
  const { user } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    kegiatan: '',
    deskripsi: '',
    status: 'Selesai'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      setLoadingReports(true);
      const data = await laporanHarianService.getAll();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    const handleLaporanUpdated = () => fetchReports();
    window.addEventListener('laporanUpdated', handleLaporanUpdated);
    return () => window.removeEventListener('laporanUpdated', handleLaporanUpdated);
  }, [fetchReports]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      await laporanHarianService.createReport({
        userId: user.id,
        userName: user.name,
        kegiatan: formData.kegiatan,
        deskripsi: formData.deskripsi,
        status: formData.status
      });

      const poinText = formData.status === 'Selesai' 
        ? '<br/><br/><span style="color:#f59e0b;font-weight:bold;">+5 Poin</span> (Laporan Selesai)' 
        : '';

      Swal.fire({
        icon: 'success',
        title: 'Laporan Berhasil Terkirim',
        html: `Terima kasih atas laporan kegiatan hari ini.${poinText}`,
        confirmButtonColor: '#3b82f6',
        customClass: { popup: 'rounded-3xl' }
      });

      setFormData({ kegiatan: '', deskripsi: '', status: 'Selesai' });
      fetchReports();
    } catch (error) {
      console.error('Error creating report:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengirim Laporan',
        text: error.message || 'Terjadi kesalahan sistem.',
        customClass: { popup: 'rounded-3xl' }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id, status) => {
    const poinNote = status === 'Selesai' 
      ? ' Poin (+5 PTS) yang didapat dari laporan ini akan otomatis dibatalkan.' 
      : '';

    Swal.fire({
      title: 'Hapus Laporan Harian?',
      text: `Data laporan akan dihapus dari sistem.${poinNote}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31e24',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-3xl' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await laporanHarianService.deleteReport(id);
          Swal.fire({
            icon: 'success',
            title: 'Terhapus!',
            text: 'Laporan dan riwayat poin terkait berhasil dihapus.',
            timer: 2000,
            showConfirmButton: false,
            customClass: { popup: 'rounded-3xl' }
          });
          fetchReports();
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menghapus',
            text: error.message,
            customClass: { popup: 'rounded-3xl' }
          });
        }
      }
    });
  };

  const canDelete = (report) => {
    if (!user) return false;
    return user.role === 'Owner' || user.role === 'Developer' || user.id === report.user_id;
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="flex gap-5 items-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
            <ClipboardList size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Laporan Harian</h1>
            <p className="text-slate-500 mt-1">Formulir laporan kegiatan operasional dan tracking riwayat tugas</p>
          </div>
        </div>
      </motion.div>

      {/* Form Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Send size={20} className="text-blue-500" />
            <span>Kirim Laporan Baru</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Kegiatan</label>
              <input
                type="text"
                required
                placeholder="Contoh: Bongkar muat paket masuk, Pengantaran zona A..."
                value={formData.kegiatan}
                onChange={(e) => setFormData({ ...formData, kegiatan: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi Detail</label>
              <textarea
                required
                rows={4}
                placeholder="Ceritakan detail pelaksanaan, kendala (jika ada), dan hasil akhir..."
                value={formData.deskripsi}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 bg-slate-50 focus:bg-white resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Status Penyelesaian</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['Selesai', 'Sedang Berjalan', 'Terkendala'].map((status) => (
                  <label 
                    key={status}
                    className={`
                      flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${formData.status === status 
                        ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-semibold' 
                        : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={formData.status === status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="hidden"
                    />
                    {status === 'Selesai' && <CheckCircle2 size={20} className={formData.status === status ? 'text-blue-500' : 'text-slate-400'} />}
                    {status === 'Sedang Berjalan' && <Clock size={20} className={formData.status === status ? 'text-blue-500' : 'text-slate-400'} />}
                    {status === 'Terkendala' && <AlertCircle size={20} className={formData.status === status ? 'text-blue-500' : 'text-slate-400'} />}
                    <span>{status}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                <span>Laporan status <b>Selesai</b> otomatis mendapatkan <b>+5 Poin</b></span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    <span>Kirim Laporan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Riwayat Laporan Harian */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Riwayat Laporan</h2>
              <p className="text-xs text-slate-500">Daftar laporan operasional yang telah dikirimkan</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
            Total: {reports.length} Laporan
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {loadingReports ? (
            <div className="p-10 text-center text-slate-400">Memuat riwayat laporan...</div>
          ) : reports.length === 0 ? (
            <div className="p-10 text-center text-slate-400">Belum ada laporan harian yang tersimpan.</div>
          ) : (
            reports.map((r) => {
              const dateStr = new Date(r.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={r.id} className="p-6 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-bold text-slate-800 text-base">{r.kegiatan}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        r.status === 'Selesai' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' 
                          : r.status === 'Sedang Berjalan' 
                            ? 'bg-amber-50 text-amber-600 border border-amber-200/60' 
                            : 'bg-rose-50 text-rose-600 border border-rose-200/60'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {r.deskripsi}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <User size={14} className="text-slate-400" />
                        <span className="font-medium text-slate-600">{r.users?.name || 'Karyawan'}</span>
                        <span className="text-[10px] text-slate-400">({r.users?.role || 'Staff'})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  {canDelete(r) && (
                    <div className="pt-2 md:pt-0 shrink-0">
                      <button
                        onClick={() => handleDelete(r.id, r.status)}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Hapus Laporan (Poin otomatis dibatalkan)"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LaporanHarian;
