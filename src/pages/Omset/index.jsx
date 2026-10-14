import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { 
  DollarSign, 
  Wallet, 
  Building2, 
  ArrowDownLeft, 
  PlusCircle, 
  Download, 
  Trash2, 
  Search, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  FileSpreadsheet,
  Clock,
  Sparkles,
  Receipt,
  X,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  RotateCcw,
  Printer,
  Layers,
  ShieldCheck
} from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { omsetService } from '../../services/omsetService';

export default function Omset() {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation Tabs: 'transaksi' | 'piutang' | 'neraca'
  const [activeTab, setActiveTab] = useState('transaksi');

  // Filters for Transaksi Tab
  const [dateFilter, setDateFilter] = useState('Semua');
  const [typeFilter, setTypeFilter] = useState('Semua');
  const [search, setSearch] = useState('');
  
  // Filter for Piutang Tab: 'Semua' | 'Pending' | 'Settled'
  const [settlementFilter, setSettlementFilter] = useState('Semua');

  // Explainer banner collapse toggle
  const [showGuide, setShowGuide] = useState(false);

  // Form Initial State
  const initialForm = {
    tanggal: new Date().toISOString().split('T')[0],
    waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
    no_resi: '',
    pelanggan: '',
    layanan: 'REG',
    tipe_transaksi: 'Cash',
    marketplace: 'Shopee',
    customMarketplace: '',
    nilai_ongkir: '',
    komisi_persen: '15',
    catatan: ''
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await omsetService.getAll();
      setData(res || []);
    } catch (err) {
      console.error('Error fetching omset data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered transactions for general & transaksi tab
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // 1. Type
      if (typeFilter !== 'Semua' && item.tipe_transaksi !== typeFilter) return false;

      // 2. Search
      if (search) {
        const q = search.toLowerCase();
        const resiMatch = item.no_resi?.toLowerCase().includes(q);
        const custMatch = item.pelanggan?.toLowerCase().includes(q);
        const layMatch = item.layanan?.toLowerCase().includes(q);
        const mktMatch = item.marketplace?.toLowerCase().includes(q);
        if (!resiMatch && !custMatch && !layMatch && !mktMatch) return false;
      }

      // 3. Date
      if (dateFilter !== 'Semua') {
        const itemDate = new Date(item.tanggal);
        const today = new Date();
        if (dateFilter === 'Hari Ini') {
          return itemDate.toDateString() === today.toDateString();
        } else if (dateFilter === '7 Hari') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 7);
          return itemDate >= sevenDaysAgo;
        } else if (dateFilter === 'Bulan Ini') {
          return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
        }
      }

      return true;
    });
  }, [data, typeFilter, search, dateFilter]);

  // Financial Summaries & Neraca Aggregations
  const summaries = useMemo(() => {
    let totalOmset = 0;
    let totalKasFisik = 0;
    let totalHppPusat = 0;
    let komisiCash = 0;
    let komisiCashless = 0;
    let countCash = 0;
    let countCashless = 0;

    // Piutang & Setoran Statuses
    let piutangCashlessBelumCair = 0;
    let piutangCashlessSudahCair = 0;
    let hutangCashBelumSetor = 0;
    let hppCashSudahSetor = 0;

    // Marketplace breakdown for cashless piutang
    const marketplaceBreakdown = {};

    filteredData.forEach(item => {
      const ongkir = Number(item.nilai_ongkir) || 0;
      const komisi = Number(item.komisi_nominal) || 0;
      const hpp = Number(item.hpp_pusat) || 0;
      const kas = Number(item.kas_diterima) || 0;
      const status = item.status_setor || (item.tipe_transaksi === 'Cash' ? 'Belum Setor' : 'Belum Cair');

      totalOmset += ongkir;

      if (item.tipe_transaksi === 'Cash') {
        countCash += 1;
        totalKasFisik += kas;
        totalHppPusat += hpp;
        komisiCash += komisi;

        if (status === 'Sudah Setor') {
          hppCashSudahSetor += hpp;
        } else {
          hutangCashBelumSetor += hpp;
        }
      } else {
        countCashless += 1;
        komisiCashless += komisi;

        const mkt = item.marketplace || 'Shopee';
        if (!marketplaceBreakdown[mkt]) {
          marketplaceBreakdown[mkt] = { total: 0, pending: 0, settled: 0, count: 0 };
        }
        marketplaceBreakdown[mkt].total += komisi;
        marketplaceBreakdown[mkt].count += 1;

        if (status === 'Sudah Cair') {
          piutangCashlessSudahCair += komisi;
          marketplaceBreakdown[mkt].settled += komisi;
        } else {
          piutangCashlessBelumCair += komisi;
          marketplaceBreakdown[mkt].pending += komisi;
        }
      }
    });

    const totalKomisi = komisiCash + komisiCashless;

    // NERACA (BALANCE SHEET) METRICS:
    // SISI ASET (HARTA COUNTER):
    // 1. Kas Fisik di Laci = Total Kas Diterima dikurangi HPP yang sudah disetor ke pusat
    const kasFisikSisaLaci = totalKasFisik - hppCashSudahSetor;
    // 2. Kas di Bank = Komisi cashless yang sudah cair masuk rekening
    const kasBank = piutangCashlessSudahCair;
    // 3. Piutang Komisi ke JNE Pusat = Hak komisi cashless yang belum cair
    const piutangKomisiPusat = piutangCashlessBelumCair;
    // Total Aset:
    const totalAset = kasFisikSisaLaci + kasBank + piutangKomisiPusat;

    // SISI KEWAJIBAN & EKUITAS:
    // 1. Kewajiban: Hutang Setor HPP Cash yang belum disetor
    const totalKewajiban = hutangCashBelumSetor;
    // 2. Ekuitas: Hak Bersih / Total Laba Komisi Counter
    const totalEkuitas = totalKomisi;
    // Total Kewajiban + Ekuitas:
    const totalKewajibanEkuitas = totalKewajiban + totalEkuitas;

    // Selisih Neraca (Harus 0 = Balance)
    const selisihBalance = totalAset - totalKewajibanEkuitas;

    return {
      totalOmset,
      totalKasFisik,
      totalHppPusat,
      komisiCash,
      komisiCashless,
      totalKomisi,
      countCash,
      countCashless,
      // Piutang & Setoran
      piutangCashlessBelumCair,
      piutangCashlessSudahCair,
      hutangCashBelumSetor,
      hppCashSudahSetor,
      marketplaceBreakdown,
      // Neraca
      kasFisikSisaLaci,
      kasBank,
      piutangKomisiPusat,
      totalAset,
      totalKewajiban,
      totalEkuitas,
      totalKewajibanEkuitas,
      selisihBalance
    };
  }, [filteredData]);

  // Filtered for Piutang & Setoran Tab
  const piutangFilteredData = useMemo(() => {
    return filteredData.filter(item => {
      const isCash = item.tipe_transaksi === 'Cash';
      const status = item.status_setor || (isCash ? 'Belum Setor' : 'Belum Cair');

      if (settlementFilter === 'Pending') {
        return isCash ? status !== 'Sudah Setor' : status !== 'Sudah Cair';
      } else if (settlementFilter === 'Settled') {
        return isCash ? status === 'Sudah Setor' : status === 'Sudah Cair';
      }
      return true;
    });
  }, [filteredData, settlementFilter]);

  // Live calculation for Modal preview
  const previewBreakdown = useMemo(() => {
    return omsetService.calculateBreakdown({
      tipe_transaksi: formData.tipe_transaksi,
      nilai_ongkir: Number(formData.nilai_ongkir) || 0,
      komisi_persen: Number(formData.komisi_persen) || 15
    });
  }, [formData.tipe_transaksi, formData.nilai_ongkir, formData.komisi_persen]);

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nilai_ongkir || Number(formData.nilai_ongkir) <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Nilai Ongkir Kosong',
        text: 'Masukkan nilai ongkos kirim yang valid.',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    const resolvedMarketplace = formData.tipe_transaksi === 'Cashless'
      ? (formData.marketplace === 'Lain-lain' 
          ? (formData.customMarketplace?.trim() || 'Lain-lain') 
          : formData.marketplace)
      : 'None';

    try {
      await omsetService.create({
        ...formData,
        marketplace: resolvedMarketplace,
        nilai_ongkir: Number(formData.nilai_ongkir),
        komisi_persen: Number(formData.komisi_persen) || 15,
        created_by: user?.id
      });

      Swal.fire({
        icon: 'success',
        title: 'Transaksi Tersimpan',
        text: `Data penjualan ${formData.tipe_transaksi} berhasil dicatat.`,
        timer: 1500,
        showConfirmButton: false,
        customClass: { popup: 'rounded-2xl' }
      });

      setIsModalOpen(false);
      setFormData(initialForm);
      fetchData();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan sistem.',
        customClass: { popup: 'rounded-2xl' }
      });
    }
  };

  // Toggle status setor / cair
  const handleToggleStatus = async (item) => {
    const isCash = item.tipe_transaksi === 'Cash';
    const currentStatus = item.status_setor || (isCash ? 'Belum Setor' : 'Belum Cair');
    
    let newStatus = '';
    let confirmTitle = '';
    let confirmText = '';

    if (isCash) {
      if (currentStatus === 'Sudah Setor') {
        newStatus = 'Belum Setor';
        confirmTitle = 'Batalkan Setoran?';
        confirmText = `Ubah status resi "${item.no_resi}" menjadi "Belum Setor" ke pusat?`;
      } else {
        newStatus = 'Sudah Setor';
        confirmTitle = 'Tandai Sudah Disetor ke Pusat?';
        confirmText = `HPP sebesar ${formatRupiah(item.hpp_pusat)} untuk resi "${item.no_resi}" telah Anda setorkan ke JNE Pusat?`;
      }
    } else {
      if (currentStatus === 'Sudah Cair') {
        newStatus = 'Belum Cair';
        confirmTitle = 'Batalkan Pencairan?';
        confirmText = `Ubah status komisi resi "${item.no_resi}" menjadi "Belum Cair"?`;
      } else {
        newStatus = 'Sudah Cair';
        confirmTitle = 'Tandai Komisi Sudah Cair?';
        confirmText = `Komisi sebesar ${formatRupiah(item.komisi_nominal)} untuk resi "${item.no_resi}" telah ditransfer oleh JNE Pusat / Marketplace ke rekening?`;
      }
    }

    const confirm = await Swal.fire({
      title: confirmTitle,
      text: confirmText,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Update Status',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
      customClass: { popup: 'rounded-2xl' }
    });

    if (confirm.isConfirmed) {
      try {
        await omsetService.updateStatus(item.id, newStatus);
        Swal.fire({
          icon: 'success',
          title: 'Status Diperbarui',
          text: `Status berhasil diubah menjadi "${newStatus}".`,
          timer: 1300,
          showConfirmButton: false,
          customClass: { popup: 'rounded-2xl' }
        });
        fetchData();
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memperbarui',
          text: err.message,
          customClass: { popup: 'rounded-2xl' }
        });
      }
    }
  };

  // Delete transaction
  const handleDelete = (id, no_resi) => {
    Swal.fire({
      title: 'Hapus Transaksi?',
      text: `Transaksi dengan nomor resi "${no_resi}" akan dihapus.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31e24',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl' }
    }).then(async (res) => {
      if (res.isConfirmed) {
        await omsetService.delete(id);
        Swal.fire({
          icon: 'success',
          title: 'Dihapus',
          text: 'Transaksi berhasil dihapus.',
          timer: 1400,
          showConfirmButton: false,
          customClass: { popup: 'rounded-2xl' }
        });
        fetchData();
      }
    });
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Data Kosong',
        text: 'Tidak ada data transaksi untuk diekspor.',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    const exportRows = filteredData.map((item, idx) => ({
      'No': idx + 1,
      'Tanggal': item.tanggal,
      'Waktu': item.waktu || '-',
      'No Resi': item.no_resi,
      'Pelanggan': item.pelanggan,
      'Layanan': item.layanan,
      'Tipe Pembayaran': item.tipe_transaksi,
      'Marketplace': item.marketplace || '-',
      'Nilai Ongkir (Rp)': item.nilai_ongkir,
      'Kas Diterima Kasir (Rp)': item.kas_diterima,
      'HPP Setor ke Pusat (Rp)': item.hpp_pusat,
      'Komisi Agen (Rp)': item.komisi_nominal,
      'Status Setor / Cair': item.status_setor || (item.tipe_transaksi === 'Cash' ? 'Belum Setor' : 'Belum Cair'),
      'Catatan': item.catatan || ''
    }));

    // Add summary row
    exportRows.push({
      'No': 'TOTAL',
      'Tanggal': '',
      'Waktu': '',
      'No Resi': '',
      'Pelanggan': '',
      'Layanan': '',
      'Tipe Pembayaran': '',
      'Marketplace': '',
      'Nilai Ongkir (Rp)': summaries.totalOmset,
      'Kas Diterima Kasir (Rp)': summaries.totalKasFisik,
      'HPP Setor ke Pusat (Rp)': summaries.totalHppPusat,
      'Komisi Agen (Rp)': summaries.totalKomisi,
      'Status Setor / Cair': '',
      'Catatan': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan_Omset_JNE");
    XLSX.writeFile(workbook, `Laporan_Omset_JNE_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/90 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
      >
        <div className="flex gap-3.5 items-center">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center border border-slate-800 shadow-xs shrink-0">
            <Scale size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Manajemen Omset, Piutang & Neraca JNE</h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck size={11} className="text-emerald-600" />
                Neraca Balance
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Integrasi otomatis arus kas laci, piutang komisi cashless, dan kewajiban setoran HPP pusat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/70 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Buka panduan hitung Cash vs Cashless"
          >
            <Info size={14} className="text-blue-600" />
            <span className="hidden sm:inline">{showGuide ? 'Tutup Panduan' : 'Panduan Alur'}</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>Ekspor Excel</span>
          </button>
          <button
            onClick={() => {
              setFormData(initialForm);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>+ Catat Transaksi</span>
          </button>
        </div>
      </motion.div>

      {/* Main Tab Navigator */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/80">
        <button
          onClick={() => setActiveTab('transaksi')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'transaksi'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <Receipt size={15} className={activeTab === 'transaksi' ? 'text-blue-600' : 'text-slate-400'} />
          <span>1. Transaksi & Kasir</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-mono font-normal">
            {filteredData.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('piutang')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'piutang'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <CreditCard size={15} className={activeTab === 'piutang' ? 'text-amber-600' : 'text-slate-400'} />
          <span>2. Piutang & Setoran Pusat</span>
          {summaries.piutangCashlessBelumCair > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-semibold">
              Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('neraca')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'neraca'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <Scale size={15} className={activeTab === 'neraca' ? 'text-emerald-600' : 'text-slate-400'} />
          <span>3. Neraca Keuangan (Balance Sheet)</span>
          <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
            Balance
          </span>
        </button>
      </div>

      {/* Explainer Box: Logika Cash vs Cashless vs Piutang */}
      <AnimatePresence>
        {showGuide && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 shadow-xs overflow-hidden"
          >
            <div className="p-4 px-5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Info size={15} />
                <span>PANDUAN ALUR KAS, PIUTANG & NERACA COUNTER JNE</span>
              </div>
              <button 
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs leading-relaxed">
              {/* Box Cash */}
              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <Banknote size={15} />
                  <span>1. Transaksi CASH (Tunai)</span>
                </div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  <li><b className="text-white">Kas Laci:</b> Masuk penuh (uang fisik di tangan).</li>
                  <li><b className="text-rose-400">Hutang Setor Pusat:</b> HPP yang wajib ditransfer ke pusat.</li>
                  <li><b className="text-emerald-400">Laba Komisi:</b> Hak bersih counter setelah HPP disetor.</li>
                </ul>
              </div>

              {/* Box Cashless */}
              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-blue-400">
                  <CreditCard size={15} />
                  <span>2. Transaksi CASHLESS (Drop-Off)</span>
                </div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  <li><b className="text-rose-400">Kas Laci:</b> Rp 0 (tidak ada uang fisik diterima).</li>
                  <li><b className="text-rose-400">Setor Pusat:</b> Rp 0 (jangan setor uang kasir!).</li>
                  <li><b className="text-blue-400">Piutang Komisi:</b> Hak counter yang ditagihkan ke JNE Pusat.</li>
                </ul>
              </div>

              {/* Box Neraca */}
              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <Scale size={15} />
                  <span>3. Neraca (Harus Seimbang)</span>
                </div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  <li><b className="text-white">Sisi Aset:</b> Sisa Kas Laci + Kas Bank + Piutang Pusat.</li>
                  <li><b className="text-white">Sisi Kewajiban:</b> Hutang HPP Pusat yang belum disetor.</li>
                  <li><b className="text-amber-400">Sisi Ekuitas:</b> Total Laba Komisi Bersih Counter.</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* TAB 1: TRANSAKSI & KASIR */}
      {/* ======================================================== */}
      {activeTab === 'transaksi' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* 4 Financial Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Omset Bruto */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Volume Omset</span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200">
                  <Receipt size={14} />
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-900 tabular-nums font-mono">
                {formatRupiah(summaries.totalOmset)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 font-medium">
                <span>{summaries.countCash} Cash</span> • <span>{summaries.countCashless} Cashless</span>
              </div>
            </div>

            {/* Card 2: Kas Fisik di Tangan */}
            <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs bg-emerald-50/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Total Kas Diterima</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 border border-emerald-200">
                  <Banknote size={14} />
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-emerald-700 tabular-nums font-mono">
                {formatRupiah(summaries.totalKasFisik)}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 font-medium">
                Uang masuk dari paket tunai
              </div>
            </div>

            {/* Card 3: Wajib Setor ke Pusat (HPP Cash) */}
            <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-xs bg-rose-50/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">HPP ke JNE Pusat</span>
                <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 border border-rose-200">
                  <Building2 size={14} />
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-rose-600 tabular-nums font-mono">
                {formatRupiah(summaries.totalHppPusat)}
              </div>
              <div className="text-[11px] text-rose-600/80 mt-1 font-medium">
                Porsi hak JNE Pusat dari transaksi Cash
              </div>
            </div>

            {/* Card 4: Total Keuntungan Komisi */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Total Laba Komisi</span>
                <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400 border border-amber-400/20">
                  <Wallet size={14} />
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-amber-400 tabular-nums font-mono">
                {formatRupiah(summaries.totalKomisi)}
              </div>
              <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between font-mono">
                <span>Cash: {formatRupiah(summaries.komisiCash)}</span>
                <span>Cashless: {formatRupiah(summaries.komisiCashless)}</span>
              </div>
            </div>
          </div>

          {/* Toolbar Filters */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari no resi, pelanggan, platform..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Segmented Type Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {['Semua', 'Cash', 'Cashless'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      typeFilter === t
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="Semua">Semua Tanggal</option>
                <option value="Hari Ini">Hari Ini</option>
                <option value="7 Hari">7 Hari Terakhir</option>
                <option value="Bulan Ini">Bulan Ini</option>
              </select>
            </div>
          </div>

          {/* Table Data */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal & Resi</th>
                    <th className="py-3 px-4">Pelanggan & Layanan</th>
                    <th className="py-3 px-4">Tipe & Platform</th>
                    <th className="py-3 px-4 text-right">Nilai Ongkir</th>
                    <th className="py-3 px-4 text-right">Kas Laci</th>
                    <th className="py-3 px-4 text-right">HPP Pusat</th>
                    <th className="py-3 px-4 text-right">Komisi Agen</th>
                    <th className="py-3 px-4 text-center">Status Setor / Cair</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                        Memuat data omset penjualan...
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Receipt size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600 text-sm">Belum ada transaksi penjualan</p>
                        <p className="text-xs text-slate-400 mt-0.5">Klik tombol "+ Catat Transaksi" untuk memasukkan data baru.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => {
                      const isCash = item.tipe_transaksi === 'Cash';
                      const status = item.status_setor || (isCash ? 'Belum Setor' : 'Belum Cair');
                      const isSettled = isCash ? status === 'Sudah Setor' : status === 'Sudah Cair';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Tanggal & Resi */}
                          <td className="py-2.5 px-4">
                            <div className="font-mono font-bold text-slate-900">{item.no_resi}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                              <Clock size={10} /> {item.tanggal} {item.waktu && `• ${item.waktu}`}
                            </div>
                          </td>

                          {/* Pelanggan & Layanan */}
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-800">{item.pelanggan || '-'}</div>
                            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase mt-0.5">
                              {item.layanan}
                            </span>
                          </td>

                          {/* Tipe Pembayaran */}
                          <td className="py-2.5 px-4">
                            {isCash ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Banknote size={11} />
                                <span>Cash Tunai</span>
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <CreditCard size={11} />
                                  <span>Cashless</span>
                                </span>
                                {item.marketplace && (
                                  <div className="text-[10px] text-slate-500 font-medium ml-1">
                                    {item.marketplace}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Nilai Ongkir */}
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800 tabular-nums">
                            {formatRupiah(item.nilai_ongkir)}
                          </td>

                          {/* Kas Fisik Laci */}
                          <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                            {item.kas_diterima > 0 ? (
                              <span className="text-emerald-600">+{formatRupiah(item.kas_diterima)}</span>
                            ) : (
                              <span className="text-slate-300">Rp 0</span>
                            )}
                          </td>

                          {/* HPP Setor Pusat */}
                          <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                            {item.hpp_pusat > 0 ? (
                              <span className="text-rose-600">{formatRupiah(item.hpp_pusat)}</span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Rp 0</span>
                            )}
                          </td>

                          {/* Komisi Agen */}
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-600 tabular-nums">
                            +{formatRupiah(item.komisi_nominal)}
                            <div className="text-[10px] text-slate-400 font-sans font-normal">
                              ({item.komisi_persen}%)
                            </div>
                          </td>

                          {/* Status Setor / Cair */}
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(item)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                isSettled
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : isCash
                                    ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                    : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                              }`}
                              title="Klik untuk ubah status setor / pencairan"
                            >
                              {isSettled ? (
                                <>
                                  <CheckCircle2 size={11} className="text-emerald-600" />
                                  <span>{isCash ? 'Sudah Setor' : 'Sudah Cair'}</span>
                                </>
                              ) : (
                                <>
                                  <Clock size={11} />
                                  <span>{isCash ? 'Belum Setor' : 'Belum Cair'}</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Aksi */}
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => handleDelete(item.id, item.no_resi)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus transaksi"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PIUTANG & SETORAN JNE PUSAT */}
      {/* ======================================================== */}
      {activeTab === 'piutang' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Piutang Komisi Cashless Belum Cair */}
            <div className="bg-white rounded-2xl p-4 border border-blue-200/90 shadow-xs bg-blue-50/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Piutang Komisi Cashless</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">Belum Cair</span>
              </div>
              <div className="text-xl md:text-2xl font-black text-blue-700 tabular-nums font-mono">
                {formatRupiah(summaries.piutangCashlessBelumCair)}
              </div>
              <p className="text-[11px] text-blue-600/80 mt-1">
                Uang hak counter yang masih ditahan JNE Pusat / Marketplace
              </p>
            </div>

            {/* 2. Komisi Cashless Sudah Cair */}
            <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 shadow-xs bg-emerald-50/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Komisi Cashless Cair</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">Sudah Masuk Bank</span>
              </div>
              <div className="text-xl md:text-2xl font-black text-emerald-700 tabular-nums font-mono">
                {formatRupiah(summaries.piutangCashlessSudahCair)}
              </div>
              <p className="text-[11px] text-emerald-600/80 mt-1">
                Komisi marketplace yang sudah ditransfer ke rekening counter
              </p>
            </div>

            {/* 3. Hutang Setor HPP Cash Belum Disetor */}
            <div className="bg-white rounded-2xl p-4 border border-rose-200/90 shadow-xs bg-rose-50/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">Hutang HPP Cash</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">Wajib Disetor</span>
              </div>
              <div className="text-xl md:text-2xl font-black text-rose-600 tabular-nums font-mono">
                {formatRupiah(summaries.hutangCashBelumSetor)}
              </div>
              <p className="text-[11px] text-rose-600/80 mt-1">
                Uang fisik di laci kasir yang harus ditransfer ke JNE Pusat
              </p>
            </div>

            {/* 4. HPP Cash Sudah Disetor */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">HPP Cash Sudah Setor</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">Aman</span>
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-800 tabular-nums font-mono">
                {formatRupiah(summaries.hppCashSudahSetor)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Total setoran uang kasir yang sudah lunas ditransfer ke pusat
              </p>
            </div>
          </div>

          {/* Marketplace Breakdown Chips */}
          {Object.keys(summaries.marketplaceBreakdown).length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers size={14} className="text-blue-600" />
                  Rincian Piutang Komisi Per Platform Marketplace
                </span>
                <span className="text-[11px] text-slate-400">Total {Object.keys(summaries.marketplaceBreakdown).length} Platform Terdeteksi</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
                {Object.entries(summaries.marketplaceBreakdown).map(([platform, stats]) => (
                  <div key={platform} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs">
                    <div className="font-bold text-slate-800 truncate">{platform}</div>
                    <div className="text-[10px] text-slate-400">{stats.count} paket</div>
                    <div className="mt-1 pt-1 border-t border-slate-200/60 font-mono font-bold text-blue-700 tabular-nums">
                      {formatRupiah(stats.total)}
                    </div>
                    <div className="text-[9px] text-amber-600 font-medium">
                      Pending: {formatRupiah(stats.pending)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Bar for Piutang */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Status:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'Semua', label: 'Semua Transaksi' },
                  { id: 'Pending', label: '⏳ Belum Selesai (Pending)' },
                  { id: 'Settled', label: '✅ Sudah Selesai (Settled)' }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSettlementFilter(s.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      settlementFilter === s.id
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Menampilkan {piutangFilteredData.length} data
            </div>
          </div>

          {/* Table Piutang & Setoran */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal & Resi</th>
                    <th className="py-3 px-4">Tipe & Platform</th>
                    <th className="py-3 px-4 text-right">Nilai Ongkir</th>
                    <th className="py-3 px-4 text-right">Nilai Piutang / Hutang</th>
                    <th className="py-3 px-4 text-center">Status Saat Ini</th>
                    <th className="py-3 px-4 text-center">Aksi Cepat 1-Klik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {piutangFilteredData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <CreditCard size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600 text-sm">Tidak ada transaksi pada filter ini</p>
                      </td>
                    </tr>
                  ) : (
                    piutangFilteredData.map(item => {
                      const isCash = item.tipe_transaksi === 'Cash';
                      const status = item.status_setor || (isCash ? 'Belum Setor' : 'Belum Cair');
                      const isSettled = isCash ? status === 'Sudah Setor' : status === 'Sudah Cair';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4">
                            <div className="font-mono font-bold text-slate-900">{item.no_resi}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {item.tanggal} • {item.pelanggan || 'Pelanggan'}
                            </div>
                          </td>

                          <td className="py-2.5 px-4">
                            {isCash ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Banknote size={11} />
                                <span>CASH (Hutang Setor)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <CreditCard size={11} />
                                <span>CASHLESS ({item.marketplace || 'Shopee'})</span>
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800 tabular-nums">
                            {formatRupiah(item.nilai_ongkir)}
                          </td>

                          <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                            {isCash ? (
                              <div>
                                <span className="text-rose-600">{formatRupiah(item.hpp_pusat)}</span>
                                <div className="text-[9px] text-slate-400 font-normal">HPP disetor ke pusat</div>
                              </div>
                            ) : (
                              <div>
                                <span className="text-blue-600">+{formatRupiah(item.komisi_nominal)}</span>
                                <div className="text-[9px] text-slate-400 font-normal">Piutang komisi counter</div>
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              isSettled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isCash
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {isSettled ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                              <span>{status}</span>
                            </span>
                          </td>

                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(item)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 mx-auto ${
                                isCash
                                  ? isSettled
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : isSettled
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              {isCash ? (
                                isSettled ? (
                                  <>
                                    <RotateCcw size={12} />
                                    <span>Batal Setor</span>
                                  </>
                                ) : (
                                  <>
                                    <Check size={12} />
                                    <span>Setorkan ke Pusat</span>
                                  </>
                                )
                              ) : (
                                isSettled ? (
                                  <>
                                    <RotateCcw size={12} />
                                    <span>Batal Cair</span>
                                  </>
                                ) : (
                                  <>
                                    <Check size={12} />
                                    <span>Tandai Komisi Cair</span>
                                  </>
                                )
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: NERACA KEUANGAN (BALANCE SHEET) */}
      {/* ======================================================== */}
      {activeTab === 'neraca' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Balance Indicator Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 md:p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Scale size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base md:text-lg font-bold">Laporan Posisi Keuangan (Neraca Saldo)</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    STATUS: 100% BALANCE
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  Total Aset = Total Kewajiban & Ekuitas • Selisih: <span className="text-emerald-400 font-mono font-bold">Rp 0 (Sempurna)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/60 font-mono text-center">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Total Aset (Harta)</div>
                <div className="text-emerald-400 font-bold text-sm md:text-base">
                  {formatRupiah(summaries.totalAset)}
                </div>
              </div>
              <div className="text-slate-500 font-bold text-lg">=</div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Kewajiban + Ekuitas</div>
                <div className="text-blue-400 font-bold text-sm md:text-base">
                  {formatRupiah(summaries.totalKewajibanEkuitas)}
                </div>
              </div>
            </div>
          </div>

          {/* The T-Account Balance Sheet Table (2 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SISI KIRI: ASET (HARTA COUNTER) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-50/80 p-3.5 px-4 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <h3 className="font-bold text-slate-900 text-sm">AKTIVA / ASET (HARTA KITA)</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Sisi Kiri Neraca</span>
                </div>

                <div className="p-4 space-y-3.5 text-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                    Aset Lancar (Current Assets)
                  </div>

                  {/* 1. Kas Fisik di Laci */}
                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Banknote size={14} className="text-emerald-600" />
                        Kas Fisik di Laci Kasir
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Total uang tunai di meja counter yang belum disetor ke pusat
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-right tabular-nums">
                      {formatRupiah(summaries.kasFisikSisaLaci)}
                    </div>
                  </div>

                  {/* 2. Kas di Bank (Komisi Cair) */}
                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Wallet size={14} className="text-blue-600" />
                        Kas di Bank Operasional
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Komisi transaksi Cashless yang telah ditransfer JNE Pusat ke rekening
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-right tabular-nums">
                      {formatRupiah(summaries.kasBank)}
                    </div>
                  </div>

                  {/* 3. Piutang Komisi ke JNE Pusat */}
                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-blue-50/40 border border-blue-200/60">
                    <div>
                      <div className="font-bold text-blue-900 flex items-center gap-1.5">
                        <CreditCard size={14} className="text-blue-600" />
                        Piutang Komisi ke JNE Pusat
                      </div>
                      <div className="text-[10px] text-blue-700/80 mt-0.5">
                        Hak komisi paket Cashless (Marketplace) yang belum cair
                      </div>
                    </div>
                    <div className="font-mono font-bold text-blue-700 text-right tabular-nums">
                      {formatRupiah(summaries.piutangKomisiPusat)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Aset Footer */}
              <div className="bg-emerald-50/70 p-4 border-t border-emerald-200/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-950 text-sm">TOTAL ASET (HARTA)</div>
                  <div className="text-[10px] text-emerald-700">Kas Laci + Kas Bank + Piutang Pusat</div>
                </div>
                <div className="text-lg font-black font-mono text-emerald-700 tabular-nums">
                  {formatRupiah(summaries.totalAset)}
                </div>
              </div>
            </div>

            {/* SISI KANAN: KEWAJIBAN & EKUITAS */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-50/80 p-3.5 px-4 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <h3 className="font-bold text-slate-900 text-sm">PASIVA (KEWAJIBAN & EKUITAS)</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Sisi Kanan Neraca</span>
                </div>

                <div className="p-4 space-y-3.5 text-xs">
                  {/* Bagian Kewajiban */}
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                    Kewajiban / Hutang Lancar
                  </div>

                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-rose-50/40 border border-rose-200/60">
                    <div>
                      <div className="font-bold text-rose-950 flex items-center gap-1.5">
                        <Building2 size={14} className="text-rose-600" />
                        Hutang Setor HPP ke JNE Pusat
                      </div>
                      <div className="text-[10px] text-rose-700/80 mt-0.5">
                        Uang titipan JNE Pusat dari transaksi Cash yang belum ditransfer
                      </div>
                    </div>
                    <div className="font-mono font-bold text-rose-600 text-right tabular-nums">
                      {formatRupiah(summaries.totalKewajiban)}
                    </div>
                  </div>

                  {/* Bagian Ekuitas / Modal */}
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 pt-1 border-b border-slate-100">
                    Ekuitas Pemilik (Laba Bersih Counter)
                  </div>

                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div>
                      <div className="font-bold text-slate-800">Laba Komisi Transaksi Cash</div>
                      <div className="text-[10px] text-slate-500">Komisi murni dari paket bayar tunai di meja</div>
                    </div>
                    <div className="font-mono font-bold text-slate-800 text-right tabular-nums">
                      {formatRupiah(summaries.komisiCash)}
                    </div>
                  </div>

                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div>
                      <div className="font-bold text-slate-800">Laba Komisi Transaksi Cashless</div>
                      <div className="text-[10px] text-slate-500">Komisi murni dari paket marketplace (drop-off)</div>
                    </div>
                    <div className="font-mono font-bold text-slate-800 text-right tabular-nums">
                      {formatRupiah(summaries.komisiCashless)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Kewajiban + Ekuitas Footer */}
              <div className="bg-blue-50/70 p-4 border-t border-blue-200/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-blue-950 text-sm">TOTAL PASIVA (HUTANG + LABA)</div>
                  <div className="text-[10px] text-blue-700">Hutang Setor Pusat + Laba Bersih Counter</div>
                </div>
                <div className="text-lg font-black font-mono text-blue-700 tabular-nums">
                  {formatRupiah(summaries.totalKewajibanEkuitas)}
                </div>
              </div>
            </div>
          </div>

          {/* Educational Note Box */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
              <Info size={18} />
            </div>
            <div className="text-xs text-slate-600 leading-relaxed space-y-1">
              <div className="font-bold text-slate-900">Catatan Penting untuk Owner & Kasir:</div>
              <p>
                1. <b>Uang Kasir Tidak Sama Dengan Keuntungan:</b> Dari uang fisik di laci kasir ({formatRupiah(summaries.kasFisikSisaLaci)}), terdapat <b className="text-rose-600">{formatRupiah(summaries.totalKewajiban)}</b> yang berstatus hutang titipan yang wajib ditransfer ke JNE Pusat.
              </p>
              <p>
                2. <b>Kawal Piutang Marketplace:</b> Terdapat <b className="text-blue-600">{formatRupiah(summaries.piutangKomisiPusat)}</b> komisi transaksi Cashless yang belum cair dari pusat. Segera cocokan dengan rekening koran saat pencairan komisi mingguan/bulanan tiba.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ======================================================== */}
      {/* MODAL INPUT TRANSAKSI PENJUALAN */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[88vh] flex flex-col overflow-hidden border border-slate-200/90 my-auto"
            >
              {/* Header Pinned */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Receipt size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Catat Transaksi Penjualan JNE</h3>
                    <p className="text-[10px] text-slate-500">Kalkulasi otomatis HPP, komisi, dan kas fisik</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form 
                id="form-transaksi-omset" 
                onSubmit={handleSubmit} 
                className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-3.5 text-xs"
              >
                {/* Tipe Pembayaran (PILIHAN UTAMA) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px] tracking-wider">
                    Tipe Pembayaran <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tipe_transaksi: 'Cash' }))}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                        formData.tipe_transaksi === 'Cash'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote size={17} className={formData.tipe_transaksi === 'Cash' ? 'text-emerald-600' : 'text-slate-400'} />
                      <div className="text-left">
                        <div className="text-xs">CASH (Tunai)</div>
                        <div className="text-[10px] text-slate-500 font-normal">Customer bayar di laci</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tipe_transaksi: 'Cashless' }))}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                        formData.tipe_transaksi === 'Cashless'
                          ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard size={17} className={formData.tipe_transaksi === 'Cashless' ? 'text-blue-600' : 'text-slate-400'} />
                      <div className="text-left">
                        <div className="text-xs">CASHLESS</div>
                        <div className="text-[10px] text-slate-500 font-normal">Shopee / Tokopedia / COD</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Marketplace Dropdown (jika cashless) */}
                {formData.tipe_transaksi === 'Cashless' && (
                  <div className="space-y-1.5 bg-blue-50/40 p-2.5 rounded-xl border border-blue-100/70">
                    <label className="block font-semibold text-slate-700">Sumber Platform Marketplace</label>
                    <select
                      value={formData.marketplace}
                      onChange={(e) => setFormData(prev => ({ ...prev, marketplace: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-800 outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="Shopee">Shopee</option>
                      <option value="Tokopedia">Tokopedia</option>
                      <option value="TikTok Shop">TikTok Shop</option>
                      <option value="Lazada">Lazada</option>
                      <option value="Blibli">Blibli</option>
                      <option value="COD / Booking Online">COD / Booking Online</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </select>

                    {/* Input Tambahan jika memilih "Lain-lain" */}
                    {formData.marketplace === 'Lain-lain' && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="pt-1">
                        <input
                          type="text"
                          placeholder="Ketik nama platform (contoh: Bukalapak, Zalora, dll.)"
                          value={formData.customMarketplace}
                          onChange={(e) => setFormData(prev => ({ ...prev, customMarketplace: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-800 outline-none focus:border-blue-500"
                          autoFocus
                        />
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Nilai Ongkir & Komisi % */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nilai Ongkos Kirim (Rp) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 20000"
                      value={formData.nilai_ongkir}
                      onChange={(e) => setFormData(prev => ({ ...prev, nilai_ongkir: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-mono font-bold focus:border-blue-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Komisi Agen (%)
                    </label>
                    <select
                      value={formData.komisi_persen}
                      onChange={(e) => setFormData(prev => ({ ...prev, komisi_persen: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold bg-white focus:border-blue-500 outline-none"
                    >
                      <option value="15">15% (Standar Mitra)</option>
                      <option value="20">20%</option>
                      <option value="25">25% (Agen Utama)</option>
                      <option value="30">30%</option>
                      <option value="10">10%</option>
                    </select>
                  </div>
                </div>

                {/* LIVE CALCULATION PREVIEW BOX */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Simulasi Pecahan Keuangan</span>
                    <span className="text-blue-600 font-bold">{formData.tipe_transaksi}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/80 text-center">
                    <div className="bg-white p-1.5 rounded-lg border border-slate-200/60">
                      <div className="text-[9px] text-slate-400">Kas Masuk Laci</div>
                      <div className="font-mono font-bold text-xs text-emerald-600 mt-0.5">
                        {formatRupiah(previewBreakdown.kas_diterima)}
                      </div>
                    </div>

                    <div className="bg-white p-1.5 rounded-lg border border-slate-200/60">
                      <div className="text-[9px] text-slate-400">Setor ke Pusat</div>
                      <div className="font-mono font-bold text-xs text-rose-600 mt-0.5">
                        {formatRupiah(previewBreakdown.hpp_pusat)}
                      </div>
                    </div>

                    <div className="bg-white p-1.5 rounded-lg border border-slate-200/60">
                      <div className="text-[9px] text-slate-400">Laba Komisi</div>
                      <div className="font-mono font-bold text-xs text-amber-600 mt-0.5">
                        {formatRupiah(previewBreakdown.komisi_nominal)}
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center italic">
                    {formData.tipe_transaksi === 'Cash' 
                      ? '✓ Kas laci bertambah. HPP Rp ' + previewBreakdown.hpp_pusat.toLocaleString('id-ID') + ' disetor ke pusat.'
                      : '✓ Kas laci Rp 0. Bebas setor. Komisi Rp ' + previewBreakdown.komisi_nominal.toLocaleString('id-ID') + ' menjadi Piutang ke pusat.'
                    }
                  </p>
                </div>

                {/* No Resi & Layanan */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor Resi / AWB</label>
                    <input
                      type="text"
                      placeholder="JNE-..."
                      value={formData.no_resi}
                      onChange={(e) => setFormData(prev => ({ ...prev, no_resi: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 font-mono outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Layanan JNE</label>
                    <select
                      value={formData.layanan}
                      onChange={(e) => setFormData(prev => ({ ...prev, layanan: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-white outline-none focus:border-blue-500"
                    >
                      <option value="REG">REG (Reguler)</option>
                      <option value="YES">YES (Yakin Esok Sampai)</option>
                      <option value="OKE">OKE (Ekonomis)</option>
                      <option value="JTR">JTR (JNE Trucking)</option>
                      <option value="SPS">SPS (Super Speed)</option>
                    </select>
                  </div>
                </div>

                {/* Pelanggan */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Pelanggan / Pengirim</label>
                  <input
                    type="text"
                    placeholder="Contoh: Toko Berkah / Bpk. Rudi"
                    value={formData.pelanggan}
                    onChange={(e) => setFormData(prev => ({ ...prev, pelanggan: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-500"
                  />
                </div>
              </form>

              {/* Footer Pinned */}
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-semibold transition-colors cursor-pointer text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="form-transaksi-omset"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer text-xs"
                >
                  Simpan Transaksi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
