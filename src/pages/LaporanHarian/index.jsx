import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { laporanHarianService } from '../../services/laporanHarianService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  Calendar,
  User,
  History,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  X,
  FileUp,
  Search,
  Check,
  HelpCircle,
  FileDown,
  Camera,
  Image,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

const LaporanHarian = () => {
  const { user } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    kegiatan: '',
    deskripsi: '',
    status: 'Selesai',
    buktiFoto: '',
    namaPenerima: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [previewPhotoData, setPreviewPhotoData] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Export & Import State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importError, setImportError] = useState(null);

  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);

  // Click outside to close export menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      setLoadingReports(true);
      const data = await laporanHarianService.getAll();
      setReports(data || []);
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

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (r.kegiatan && r.kegiatan.toLowerCase().includes(q)) ||
      (r.deskripsi && r.deskripsi.toLowerCase().includes(q)) ||
      (r.users?.name && r.users.name.toLowerCase().includes(q));

    const matchStatus = statusFilter === 'Semua' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (reports.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Data Kosong',
        text: 'Belum ada data laporan harian untuk diekspor.',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    const exportList = filteredReports.length > 0 ? filteredReports : reports;
    const worksheetData = exportList.map((r, i) => ({
      No: i + 1,
      'Tanggal & Waktu': new Date(r.created_at).toLocaleString('id-ID'),
      'Nama Staff': r.users?.name || 'Staff',
      'Peran': r.users?.role || 'Staff',
      'Nama Kegiatan': r.kegiatan,
      'Status Penyelesaian': r.status,
      'Deskripsi Detail': r.deskripsi
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 24 },
      { wch: 14 },
      { wch: 35 },
      { wch: 20 },
      { wch: 55 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Harian");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Laporan_Harian_JNE_${dateStr}.xlsx`);

    Swal.fire({
      icon: 'success',
      title: 'Ekspor Excel Berhasil',
      text: `File Laporan_Harian_JNE_${dateStr}.xlsx berhasil diunduh.`,
      timer: 1600,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' }
    });
    setShowExportMenu(false);
  };

  // Export to CSV (.csv)
  const handleExportCSV = () => {
    if (reports.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Data Kosong',
        text: 'Belum ada data laporan harian untuk diekspor.',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    const exportList = filteredReports.length > 0 ? filteredReports : reports;
    const worksheetData = exportList.map((r, i) => ({
      No: i + 1,
      'Tanggal & Waktu': new Date(r.created_at).toLocaleString('id-ID'),
      'Nama Staff': r.users?.name || 'Staff',
      'Peran': r.users?.role || 'Staff',
      'Nama Kegiatan': r.kegiatan,
      'Status Penyelesaian': r.status,
      'Deskripsi Detail': r.deskripsi
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Harian");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Laporan_Harian_JNE_${dateStr}.csv`, { bookType: 'csv' });

    Swal.fire({
      icon: 'success',
      title: 'Ekspor CSV Berhasil',
      text: `File Laporan_Harian_JNE_${dateStr}.csv berhasil diunduh.`,
      timer: 1600,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' }
    });
    setShowExportMenu(false);
  };

  // Download Template
  const handleDownloadTemplate = (format = 'xlsx') => {
    const templateRows = [
      {
        'Nama Kegiatan': 'Sortir Paket Hub Operasional Gelombang Pagi',
        'Deskripsi Detail': 'Sortir 150 paket reguler dan YES tujuan dalam kota tuntas sesuai jadwal SLA.',
        'Status': 'Selesai'
      },
      {
        'Nama Kegiatan': 'Pengantaran Paket Kurir Area Rute Barat',
        'Deskripsi Detail': 'Pengantaran kurir ke cluster perumahan, 2 paket reschedule alamat penerima tutup.',
        'Status': 'Sedang Berjalan'
      },
      {
        'Nama Kegiatan': 'Maintenance Scanner Barcode Gudang',
        'Deskripsi Detail': 'Pengecekan PDT barcode scanner dan penggantian baterai cadangan logistik.',
        'Status': 'Selesai'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    worksheet['!cols'] = [
      { wch: 35 },
      { wch: 60 },
      { wch: 18 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    if (format === 'csv') {
      XLSX.writeFile(workbook, "Template_Import_Laporan_Harian.csv", { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, "Template_Import_Laporan_Harian.xlsx");
    }
    setShowExportMenu(false);
  };

  // Handle File Selection for Import
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          setImportError('File kosong atau tidak berisi baris data.');
          setImportData([]);
          return;
        }

        const validRows = [];
        rawRows.forEach((row) => {
          const kegiatan = (
            row['Nama Kegiatan'] ||
            row['nama_kegiatan'] ||
            row['Kegiatan'] ||
            row['kegiatan'] ||
            row['Judul Kegiatan'] ||
            row['Activity'] ||
            row['Task'] ||
            ''
          ).toString().trim();

          const deskripsi = (
            row['Deskripsi Detail'] ||
            row['deskripsi_detail'] ||
            row['Deskripsi'] ||
            row['deskripsi'] ||
            row['Keterangan'] ||
            row['Catatan'] ||
            row['Description'] ||
            ''
          ).toString().trim();

          let status = (
            row['Status Penyelesaian'] ||
            row['Status'] ||
            row['status'] ||
            'Selesai'
          ).toString().trim();

          const lower = status.toLowerCase();
          if (lower.includes('jalan') || lower.includes('proses') || lower.includes('progress')) {
            status = 'Sedang Berjalan';
          } else if (lower.includes('kendala') || lower.includes('pending') || lower.includes('batal')) {
            status = 'Terkendala';
          } else {
            status = 'Selesai';
          }

          if (kegiatan) {
            validRows.push({
              kegiatan,
              deskripsi: deskripsi || '-',
              status,
            });
          }
        });

        if (validRows.length === 0) {
          setImportError('Tidak ditemukan baris yang valid. Pastikan tabel memuat kolom "Nama Kegiatan" dan "Deskripsi Detail".');
          setImportData([]);
          return;
        }

        setImportData(validRows);
      } catch (err) {
        console.error('Error parsing file:', err);
        setImportError('Gagal membaca file. Pastikan format file adalah Excel (.xlsx / .xls) atau CSV (.csv) yang valid.');
        setImportData([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit Batch Import
  const handleExecuteImport = async () => {
    if (importData.length === 0) return;
    setIsProcessingImport(true);
    try {
      await laporanHarianService.createBatchReports(importData, user);
      Swal.fire({
        icon: 'success',
        title: 'Import Berhasil!',
        html: `<b>${importData.length}</b> data laporan harian berhasil ditambahkan ke database.`,
        timer: 2000,
        showConfirmButton: false,
        customClass: { popup: 'rounded-2xl' }
      });
      setIsImportModalOpen(false);
      setImportData([]);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchReports();
    } catch (err) {
      console.error('Error importing:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengimpor',
        text: err.message || 'Terjadi kesalahan sistem saat menyimpan data import.',
        customClass: { popup: 'rounded-2xl' }
      });
    } finally {
      setIsProcessingImport(false);
    }
  };

  // Handle Photo Compression & Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'warning',
        title: 'Format Tidak Didukung',
        text: 'Mohon pilih file gambar (JPG, PNG, WEBP).',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'File Terlalu Besar',
        text: 'Maksimal ukuran file foto adalah 10MB.',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        setFormData(prev => ({
          ...prev,
          buktiFoto: compressedBase64
        }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

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
        status: formData.status,
        buktiFoto: formData.buktiFoto || null,
        namaPenerima: formData.namaPenerima?.trim() || null
      });

      const poinText = formData.status === 'Selesai' 
        ? '<br/><br/><span style="color:#f59e0b;font-weight:bold;">+5 Poin</span> (Laporan Selesai)' 
        : '';

      Swal.fire({
        icon: 'success',
        title: 'Laporan Berhasil Terkirim',
        html: `Terima kasih atas laporan kegiatan hari ini.${poinText}`,
        confirmButtonColor: '#3b82f6',
        customClass: { popup: 'rounded-2xl' }
      });

      setFormData({ kegiatan: '', deskripsi: '', status: 'Selesai', buktiFoto: '', namaPenerima: '' });
      fetchReports();
    } catch (error) {
      console.error('Error creating report:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengirim Laporan',
        text: error.message || 'Terjadi kesalahan sistem.',
        customClass: { popup: 'rounded-2xl' }
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
          fetchReports();
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

  const canDelete = (report) => {
    if (!user) return false;
    return user.role === 'Owner' || user.role === 'Developer' || user.id === report.user_id;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 font-['Inter',system-ui,sans-serif]">
      {/* Header Banner - Anti-Slop Clean Surface */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
      >
        <div className="flex gap-4 items-center">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Laporan Harian</h1>
            <p className="text-xs text-slate-500 mt-0.5">Operasional Hub JNE • Log harian kegiatan dan penugasan karyawan</p>
          </div>
        </div>

        {/* Action Buttons: Import & Export */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Import Button */}
          <button
            type="button"
            onClick={() => {
              setImportData([]);
              setFileName('');
              setImportError(null);
              setIsImportModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-colors cursor-pointer active:scale-[0.98]"
          >
            <Upload size={14} className="text-blue-600" />
            <span>Import Excel / CSV</span>
          </button>

          {/* Export Dropdown Menu Button */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer active:scale-[0.98]"
            >
              <Download size={14} />
              <span>Ekspor Data</span>
              <ChevronDown size={13} className={`transition-transform duration-150 ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Ekspor Data Laporan
                </div>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  <span>Unduh File Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText size={15} className="text-blue-600" />
                  <span>Unduh File CSV (.csv)</span>
                </button>

                <div className="my-1 border-t border-slate-100"></div>

                <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Template Format Import
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('xlsx')}
                  className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileDown size={15} className="text-purple-600" />
                  <span>Template Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('csv')}
                  className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileDown size={15} className="text-amber-600" />
                  <span>Template CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Form Section - Clean Precision */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold tracking-tight text-slate-800">Kirim Laporan Baru</h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Karyawan: <b className="text-slate-700">{user?.name || 'Staff'}</b>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Kegiatan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Bongkar muat paket masuk, Pengantaran rute A..."
                value={formData.kegiatan}
                onChange={(e) => setFormData({ ...formData, kegiatan: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs font-medium text-slate-800 bg-slate-50/60 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status Penyelesaian
              </label>
              {/* Segmented Control */}
              <div className="flex p-1 bg-slate-100 rounded-lg gap-1 border border-slate-200/60">
                {['Selesai', 'Sedang Berjalan', 'Terkendala'].map((status) => {
                  const active = formData.status === status;
                  const dotColor = status === 'Selesai' ? 'bg-emerald-500' : status === 'Sedang Berjalan' ? 'bg-amber-500' : 'bg-rose-500';
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFormData({ ...formData, status })}
                      className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      <span>{status}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Deskripsi Detail <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Jelaskan detail pelaksanaan kegiatan, kendala operasional (jika ada), dan hasil tuntas..."
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs font-medium text-slate-800 bg-slate-50/60 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Upload Lampiran Foto Bukti Kegiatan (Opsional untuk semua staff) */}
          <div className="bg-slate-50/70 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Camera size={14} className="text-slate-600" />
                <span>Lampiran Foto / Bukti Kegiatan</span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded border border-slate-200">
                  Opsional
                </span>
              </label>

              {formData.buktiFoto && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, buktiFoto: '', namaPenerima: '' }))}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <X size={12} />
                  <span>Hapus Foto</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              {/* File input */}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="w-full text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200/70 file:text-slate-700 hover:file:bg-slate-300/70 cursor-pointer"
                />
              </div>

              {/* Input Penerima / Catatan HANYA muncul jika ada foto terlampir */}
              {formData.buktiFoto && (
                <div className="sm:w-72">
                  <input
                    type="text"
                    placeholder="Penerima paket / Keterangan foto (opsional)"
                    value={formData.namaPenerima || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, namaPenerima: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-xs font-medium text-slate-800 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Thumbnail Preview jika foto dipilih */}
            {formData.buktiFoto && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center gap-3">
                <div 
                  onClick={() => setPreviewPhotoData({
                    kegiatan: formData.kegiatan || 'Bukti Kegiatan',
                    bukti_foto: formData.buktiFoto,
                    nama_penerima: formData.namaPenerima,
                    created_at: new Date().toISOString()
                  })}
                  className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-300 shadow-2xs group cursor-pointer shrink-0"
                >
                  <img src={formData.buktiFoto} alt="Bukti Foto" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <Eye size={14} />
                  </div>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Foto bukti terlampir</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Klik thumbnail untuk melihat pratinjau penuh. Boleh dikosongkan jika kegiatan tidak memerlukan foto.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
              <span>Laporan berstatus <b>Selesai</b> otomatis mendapatkan <b>+5 Poin Performa</b>.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer active:scale-[0.98] w-full sm:w-auto"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={14} />
                  <span>Kirim Laporan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Riwayat Laporan Harian - Clean Table / List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
      >
        {/* Section Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <History size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-800">Riwayat Laporan</h2>
              <p className="text-[11px] text-slate-500">Daftar rekapan laporan operasional staff</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md tabular-nums">
              Total: {reports.length}
            </span>

            {/* Quick Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-emerald-50 text-emerald-700 font-semibold text-xs border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="Ekspor ke Excel (.xlsx)"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Excel</span>
            </button>

            {/* Quick Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-blue-50 text-blue-700 font-semibold text-xs border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="Ekspor ke CSV (.csv)"
            >
              <FileText size={13} className="text-blue-600" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 sm:px-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kegiatan, catatan, staf..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">Status:</span>
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
              {['Semua', 'Selesai', 'Sedang Berjalan', 'Terkendala'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List of Reports */}
        <div className="divide-y divide-slate-100">
          {loadingReports ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">Memuat riwayat laporan...</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">Belum ada laporan harian yang tersimpan.</div>
          ) : filteredReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              Tidak ada laporan yang sesuai dengan filter pencarian.
            </div>
          ) : (
            filteredReports.map((r) => {
              const dateStr = new Date(r.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              const isSelesai = r.status === 'Selesai';
              const isBerjalan = r.status === 'Sedang Berjalan';

              return (
                <div key={r.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                        isSelesai 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : isBerjalan 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isSelesai ? 'bg-emerald-500' : isBerjalan ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        <span>{r.status}</span>
                      </span>

                      <h3 className="font-semibold text-slate-900 text-sm">{r.kegiatan}</h3>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                      {r.deskripsi}
                    </p>

                    {/* Bukti Foto Penerimaan (POD) */}
                    {r.bukti_foto && (
                      <div className="flex items-center gap-3 pt-1">
                        <div 
                          onClick={() => setPreviewPhotoData(r)}
                          className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-300 shadow-2xs group cursor-pointer shrink-0"
                          title="Klik untuk memperbesar bukti foto"
                        >
                          <img src={r.bukti_foto} alt="POD" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye size={14} />
                          </div>
                        </div>
                        <div className="text-xs">
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoData(r)}
                            className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Image size={13} />
                            <span>Lihat Foto Bukti</span>
                          </button>
                          {r.nama_penerima && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Penerima / Ket: <span className="font-semibold text-slate-700">{r.nama_penerima}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                      <div className="flex items-center gap-1 font-medium">
                        <User size={13} className="text-slate-400" />
                        <span className="text-slate-700 font-semibold">{r.users?.name || 'Karyawan'}</span>
                        <span className="text-[10px] text-slate-400">({r.users?.role || 'Staff'})</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1 font-medium tabular-nums">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  {canDelete(r) && (
                    <div className="self-end md:self-start shrink-0">
                      <button
                        onClick={() => handleDelete(r.id, r.status)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Laporan (Poin otomatis dibatalkan)"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* ---------------------------------------------------- */}
      {/* MODAL IMPORT EXCEL / CSV - Anti-Slop Precision */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Upload size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Import Laporan Harian</h3>
                    <p className="text-[11px] text-slate-500">Mendukung file spreadsheet Excel (.xlsx, .xls) atau CSV (.csv)</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Upload Drag & Drop Area */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="excel-file-input"
                  />
                  <label
                    htmlFor="excel-file-input"
                    className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors mb-2">
                      <FileUp size={20} />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 mb-0.5">
                      {fileName ? fileName : 'Klik untuk memilih file spreadsheet'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Format yang didukung: .xlsx, .xls, .csv
                    </span>
                  </label>
                </div>

                {/* Template Download Prompt */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                    <HelpCircle size={14} className="text-blue-600 shrink-0" />
                    <span>Format kolom harus sesuai template resmi JNE:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate('xlsx')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-700 rounded-md font-semibold text-[11px] border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <FileSpreadsheet size={12} className="text-emerald-600" />
                      <span>Template Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate('csv')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px] border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <FileText size={12} className="text-blue-600" />
                      <span>Template CSV</span>
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {importError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0 text-rose-600" />
                    <span>{importError}</span>
                  </div>
                )}

                {/* Preview Table If Data Found */}
                {importData.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        <span>Pratinjau Data ({importData.length} baris terdeteksi):</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-normal">Maks 5 baris pertama</span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-700 font-bold text-[11px]">
                          <tr>
                            <th className="p-2">No</th>
                            <th className="p-2">Kegiatan</th>
                            <th className="p-2">Deskripsi</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
                          {importData.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="p-2 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="p-2 font-semibold text-slate-800">{row.kegiatan}</td>
                              <td className="p-2 text-slate-600 truncate max-w-xs">{row.deskripsi}</td>
                              <td className="p-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  disabled={importData.length === 0 || isProcessingImport}
                  onClick={handleExecuteImport}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isProcessingImport ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Simpan & Import {importData.length > 0 ? `(${importData.length} Data)` : ''}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX MODAL: PREVIEW FOTO BUKTI PENGIRIMAN (POD) */}
      <AnimatePresence>
        {previewPhotoData && (
          <div 
            onClick={() => setPreviewPhotoData(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto cursor-pointer"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200/90 my-auto cursor-default"
            >
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Camera size={15} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Foto Bukti Dokumentasi Kegiatan</h3>
                    <p className="text-[11px] text-slate-500">{previewPhotoData.kegiatan}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewPhotoData(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 bg-slate-900 flex items-center justify-center min-h-[260px] max-h-[450px] overflow-hidden">
                <img
                  src={previewPhotoData.bukti_foto}
                  alt="Bukti Foto Kegiatan"
                  className="max-h-[420px] max-w-full object-contain rounded-lg"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  {previewPhotoData.nama_penerima ? (
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Penerima / Keterangan:</span>
                      <p className="font-bold text-slate-800">{previewPhotoData.nama_penerima}</p>
                    </div>
                  ) : (
                    <span className="text-slate-400">Dokumentasi bukti kegiatan operasional</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewPhotoData(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition-colors cursor-pointer text-xs"
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

export default LaporanHarian;
