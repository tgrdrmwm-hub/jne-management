import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { laporanHarianService } from '../../services/laporanHarianService';
import { staffService } from '../../services/staffService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Trash2, 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Calendar,
  LayoutGrid,
  List,
  RefreshCw,
  X,
  Award
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
        customClass: { popup: 'rounded-3xl' }
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

      // 4. Date filter
      let matchesDate = true;
      if (dateRange !== 'Semua') {
        const reportDate = new Date(r.created_at);
        const now = new Date();
        if (dateRange === 'Hari Ini') {
          matchesDate = reportDate.toDateString() === now.toDateString();
        } else if (dateRange === '7 Hari') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          matchesDate = reportDate >= sevenDaysAgo;
        } else if (dateRange === 'Bulan Ini') {
          matchesDate = 
            reportDate.getMonth() === now.getMonth() && 
            reportDate.getFullYear() === now.getFullYear();
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
          if (detailModal?.id === id) setDetailModal(null);
          fetchData();
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

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Kegiatan Operasional Staff JNE", 14, 15);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);

    const tableData = filteredReports.map((r, i) => [
      i + 1,
      new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
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

    doc.save(`Laporan_Staff_JNE_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export Excel
  const handleExportExcel = () => {
    const worksheetData = filteredReports.map((r, i) => ({
      No: i + 1,
      'Tanggal & Waktu': new Date(r.created_at).toLocaleString('id-ID'),
      'Nama Staff': r.users?.name || '-',
      'Role': r.users?.role || '-',
      'Nama Kegiatan': r.kegiatan,
      'Status': r.status,
      'Deskripsi Detail': r.deskripsi
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Staff");
    XLSX.writeFile(workbook, `Laporan_Staff_JNE_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const canDelete = (report) => {
    if (!user) return false;
    return user.role === 'Owner' || user.role === 'Developer' || user.id === report.user_id;
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
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl -mr-36 -mt-36 pointer-events-none"></div>
        
        <div className="flex gap-5 items-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/25 text-white">
            <ClipboardCheck size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Monitoring Laporan Staff</h1>
            <p className="text-slate-500 mt-1">Pantau, tinjau, dan kelola seluruh laporan kegiatan operasional staff JNE</p>
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
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm text-slate-400">
          <RefreshCw size={32} className="animate-spin mx-auto text-blue-500 mb-3" />
          <p className="font-medium text-slate-600">Memuat laporan staff...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto">
            <ClipboardCheck size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Tidak ada laporan yang ditemukan</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Belum ada laporan yang sesuai dengan kriteria pencarian atau filter yang Anda pilih.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID / CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const dateStr = new Date(report.created_at).toLocaleDateString('id-ID', {
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
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
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
                    {detailModal.users?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-tight">
                      {detailModal.users?.name || 'Staff'}
                    </h3>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">
                      Role: {detailModal.users?.role || 'Staff'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDetailModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Nama Kegiatan</span>
                  <h2 className="text-lg font-bold text-slate-800">{detailModal.kegiatan}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Status:</span>
                    <div className="mt-1">{getStatusBadge(detailModal.status)}</div>
                  </div>

                  <div className="h-8 w-px bg-slate-200"></div>

                  <div>
                    <span className="text-slate-400 block">Waktu Submit:</span>
                    <span className="font-semibold text-slate-700 mt-1 block">
                      {new Date(detailModal.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {detailModal.status === 'Selesai' && (
                    <>
                      <div className="h-8 w-px bg-slate-200"></div>
                      <div>
                        <span className="text-slate-400 block">Reward Poin:</span>
                        <span className="font-bold text-amber-500 mt-1 block flex items-center gap-1">
                          <Award size={14} /> +5 PTS
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-2">Deskripsi Detail</span>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto">
                    {detailModal.deskripsi}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {canDelete(detailModal) && (
                    <button
                      onClick={() => handleDelete(detailModal.id, detailModal.kegiatan, detailModal.status)}
                      className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 size={15} />
                      <span>Hapus Laporan</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setDetailModal(null)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
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
