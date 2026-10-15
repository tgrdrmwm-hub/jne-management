import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { laporanHarianService } from '../../services/laporanHarianService';
import { staffService } from '../../services/staffService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  Trash2, 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  LayoutGrid,
  List,
  RefreshCw,
  X,
  Award,
  Camera
} from 'lucide-react';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const LaporanStaff = () => {
  const { user } = useSelector((state) => state.auth);
  const [reports, setReports] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [selectedStaff, setSelectedStaff] = useState('Semua');
  const [dateRange, setDateRange] = useState('Semua'); // 'Semua', 'Hari Ini', '7 Hari', 'Bulan Ini'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  
  // Detail Modal
  const [detailModal, setDetailModal] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [reportsData, staffData] = await Promise.all([
        laporanHarianService.getAll(),
        staffService.getStaffList()
      ]);
      setReports(reportsData || []);
      setStaffList(staffData || []);
    } catch (error) {
      console.error('Error loading staff reports:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memuat Data',
        text: error.message || 'Terjadi kesalahan saat memuat data laporan staff.',
        customClass: { popup: 'rounded-2xl' }
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const handleUpdate = () => fetchData();
    window.addEventListener('laporanUpdated', handleUpdate);
    return () => window.removeEventListener('laporanUpdated', handleUpdate);
  }, [fetchData]);

  // Handle close modal with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDetailModal(null);
    };
    if (detailModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailModal]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // 1. Search (kegiatan, deskripsi, nama staff)
      const staffName = r.users?.name || '';
      const matchesSearch = 
        r.kegiatan?.toLowerCase().includes(search.toLowerCase()) ||
        r.deskripsi?.toLowerCase().includes(search.toLowerCase()) ||
        staffName.toLowerCase().includes(search.toLowerCase());

      // 2. Status filter
      const matchesStatus = statusFilter === 'Semua' || r.status === statusFilter;

      // 3. Staff filter
      const matchesStaff = selectedStaff === 'Semua' || r.user_id === selectedStaff;

      // 4. Date filter (menggunakan zona waktu WIB Asia/Jakarta agar akurat)
      let matchesDate = true;
      if (dateRange !== 'Semua') {
        const reportDate = new Date(r.created_at);
        const reportDateStr = reportDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        const now = new Date();
        const nowDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

        if (dateRange === 'Hari Ini') {
          matchesDate = reportDateStr === nowDateStr;
        } else if (dateRange === '7 Hari') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = reportDate >= sevenDaysAgo;
        } else if (dateRange === 'Bulan Ini') {
          const reportMonth = reportDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta', month: '2-digit', year: 'numeric' });
          const nowMonth = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta', month: '2-digit', year: 'numeric' });
          matchesDate = reportMonth === nowMonth;
        }
      }

      return matchesSearch && matchesStatus && matchesStaff && matchesDate;
    });
  }, [reports, search, statusFilter, selectedStaff, dateRange]);

  // Statistics
  const stats = useMemo(() => {
    const total = reports.length;
    const selesai = reports.filter(r => r.status === 'Selesai').length;
    const proses = reports.filter(r => r.status === 'Sedang Berjalan').length;
    const kendala = reports.filter(r => r.status === 'Terkendala').length;
    return { total, selesai, proses, kendala };
  }, [reports]);

  // Delete handler with confirmation
  const handleDelete = (id, kegiatan, status) => {
    const poinNote = status === 'Selesai' 
      ? ' Poin (+5 PTS) yang didapat staff dari laporan ini akan otomatis dibatalkan.' 
      : '';

    Swal.fire({
      title: 'Hapus Laporan Staff?',
      text: `Laporan "${kegiatan}" akan dihapus secara permanen.${poinNote}`,
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
          await laporanHarianService.deleteReport(id);
          Swal.fire({
            icon: 'success',
            title: 'Terhapus!',
            text: 'Laporan dan riwayat poin terkait berhasil dihapus.',
            timer: 2000,
            showConfirmButton: false,
            customClass: { popup: 'rounded-2xl' }
          });
          if (detailModal?.id === id) setDetailModal(null);
          fetchData();
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menghapus',
            text: error.message,
            customClass: { popup: 'rounded-2xl' }
          });
        }
      }
    });
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Kegiatan Operasional Staff JNE", 14, 15);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`, 14, 22);

    const tableData = filteredReports.map((r, i) => [
      i + 1,
      new Date(r.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      r.users?.name || 'Staff',
      r.kegiatan,
      r.status,
      r.deskripsi
    ]);

    doc.autoTable({
      head: [['No', 'Waktu', 'Nama Staff', 'Kegiatan', 'Status', 'Deskripsi']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] }
    });

    const fileDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    doc.save(`Laporan_Staff_JNE_${fileDate}.pdf`);
  };

  // Export Excel
  const handleExportExcel = () => {
    const worksheetData = filteredReports.map((r, i) => ({
      No: i + 1,
      'Tanggal & Waktu': new Date(r.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      'Nama Staff': r.users?.name || '-',
      'Role': r.users?.role || '-',
      'Nama Kegiatan': r.kegiatan,
      'Status': r.status,
      'Deskripsi Detail': r.deskripsi
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Staff");
    const fileDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    XLSX.writeFile(workbook, `Laporan_Staff_JNE_${fileDate}.xlsx`);
  };

  const canDelete = (report) => {
    if (!user) return false;
    return user.role === 'Owner' || user.role === 'Developer' || user.role === 'Admin' || user.id === report.user_id;
  };

  const getStatusBadge = (status) => {
    if (status === 'Selesai') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
          <CheckCircle2 size={12} />
          <span>Selesai</span>
        </span>
      );
    }
    if (status === 'Sedang Berjalan') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
          <Clock size={12} />
          <span>Sedang Berjalan</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
        <AlertCircle size={12} />
        <span>Terkendala</span>
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 md:p-8 shadow-xs border border-slate-200/90 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative"
      >
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white border border-slate-800 shrink-0">
            <ClipboardCheck size={28} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Monitoring Laporan Staff</h1>
            <p className="text-slate-500 text-xs mt-0.5">Pantau, tinjau, dan kelola seluruh laporan kegiatan operasional staff JNE</p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-3 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200/60"
            title="Muat ulang data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={handleExportExcel}
            className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <FileSpreadsheet size={16} />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex-1 md:flex-none px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <FileText size={16} />
            <span>PDF</span>
          </button>
        </div>
      </motion.div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Laporan</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{stats.total}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Status Selesai</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.selesai}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Sedang Berjalan</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{stats.proses}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Terkendala</p>
            <p className="text-2xl font-bold text-rose-600 mt-0.5">{stats.kendala}</p>
          </div>
        </motion.div>
      </div>

      {/* Filter & Toolbar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama staff, kegiatan, atau kata kunci deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white text-slate-700"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Semua">Semua Status</option>
              <option value="Selesai">Selesai (+5 Poin)</option>
              <option value="Sedang Berjalan">Sedang Berjalan</option>
              <option value="Terkendala">Terkendala</option>
            </select>

            {/* Staff Filter */}
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer max-w-[160px]"
            >
              <option value="Semua">Semua Staff</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Semua">Semua Waktu</option>
              <option value="Hari Ini">Hari Ini</option>
              <option value="7 Hari">7 Hari Terakhir</option>
              <option value="Bulan Ini">Bulan Ini</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="Tampilan Kartu"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="Tampilan Tabel"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>Menampilkan <b>{filteredReports.length}</b> dari {reports.length} laporan</span>
          {(search || statusFilter !== 'Semua' || selectedStaff !== 'Semua' || dateRange !== 'Semua') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('Semua');
                setSelectedStaff('Semua');
                setDateRange('Semua');
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/90 shadow-xs text-slate-400">
          <RefreshCw size={28} className="animate-spin mx-auto text-blue-600 mb-3" />
          <p className="font-semibold text-slate-700 text-sm">Memuat laporan staff...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ClipboardCheck size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800">Tidak ada laporan yang ditemukan</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            Belum ada laporan yang sesuai dengan kriteria pencarian atau filter yang Anda pilih.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID / CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const dateStr = new Date(report.created_at).toLocaleDateString('id-ID', {
              timeZone: 'Asia/Jakarta',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Card Header: Author & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {report.users?.name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm leading-snug">
                          {report.users?.name || 'Staff'}
                        </h4>
                        <span className="text-[11px] text-slate-400 capitalize">
                          {report.users?.role || 'Staff'}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>

                  {/* Kegiatan */}
                  <div>
                    <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors line-clamp-1">
                      {report.kegiatan}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <Calendar size={13} />
                      <span>{dateStr}</span>
                    </p>
                  </div>

                  {/* Deskripsi preview */}
                  <p className="text-sm text-slate-600 line-clamp-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
                    {report.deskripsi}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                    {report.status === 'Selesai' && (
                      <span className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <Award size={12} />
                        <span>+5 PTS</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDetailModal(report)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Eye size={14} />
                      <span>Detail</span>
                    </button>

                    {canDelete(report) && (
                      <button
                        onClick={() => handleDelete(report.id, report.kegiatan, report.status)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Hapus laporan ini"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">No</th>
                  <th className="py-4 px-6">Waktu</th>
                  <th className="py-4 px-6">Pelapor</th>
                  <th className="py-4 px-6">Nama Kegiatan</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Deskripsi</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {filteredReports.map((report, idx) => {
                  const dateStr = new Date(report.created_at).toLocaleDateString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-500 font-medium">
                        {dateStr}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs">
                            {report.users?.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{report.users?.name || 'Staff'}</p>
                            <span className="text-[10px] text-slate-400 capitalize">{report.users?.role || 'Staff'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-800 max-w-[200px] truncate">
                        {report.kegiatan}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="py-4 px-6 max-w-[280px] truncate text-slate-500 text-xs">
                        {report.deskripsi}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDetailModal(report)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye size={16} />
                          </button>
                          {canDelete(report) && (
                            <button
                              onClick={() => handleDelete(report.id, report.kegiatan, report.status)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus Laporan"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {detailModal && (
          <div 
            onClick={() => setDetailModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200/90 flex flex-col max-h-[90vh] my-auto"
            >
              {/* Modal Header */}
              <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-blue-500/20 shrink-0">
                    {detailModal.users?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                      {detailModal.users?.name || 'Staff'}
                    </h3>
                    <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                      Role: {detailModal.users?.role || 'Staff'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                  title="Tutup (Esc)"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Nama Kegiatan</span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-snug">{detailModal.kegiatan}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Status:</span>
                    <div className="mt-0.5">{getStatusBadge(detailModal.status)}</div>
                  </div>

                  <div className="h-7 w-px bg-slate-200"></div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Waktu Submit:</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">
                      {new Date(detailModal.created_at).toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} WIB
                    </span>
                  </div>

                  {detailModal.status === 'Selesai' && (
                    <>
                      <div className="h-7 w-px bg-slate-200"></div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Reward Poin:</span>
                        <span className="font-bold text-amber-500 mt-0.5 block flex items-center gap-1">
                          <Award size={13} /> +5 PTS
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Deskripsi Detail</span>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto">
                    {detailModal.deskripsi}
                  </div>
                </div>

                {/* Bukti Foto Penerimaan (POD) */}
                {detailModal.bukti_foto && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Camera size={14} className="text-blue-600" />
                        <span>Foto Bukti Kegiatan / Dokumentasi</span>
                      </span>
                      {detailModal.nama_penerima && (
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          Ket / Penerima: {detailModal.nama_penerima}
                        </span>
                      )}
                    </div>
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center p-2 max-h-72">
                      <img
                        src={detailModal.bukti_foto}
                        alt="Bukti Pengiriman"
                        className="max-h-68 max-w-full object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 p-3.5 sm:p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {canDelete(detailModal) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(detailModal.id, detailModal.kegiatan, detailModal.status)}
                      className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                      <span>Hapus Laporan</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setDetailModal(null)}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LaporanStaff;
