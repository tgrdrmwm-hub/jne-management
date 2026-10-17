import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { 
  Wallet, 
  Building2, 
  PlusCircle, 
  Trash2, 
  Search, 
  Info, 
  FileSpreadsheet,
  Clock,
  Receipt,
  X,
  Banknote,
  CheckCircle2,
  Scale,
  Check,
  RotateCcw,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Lock,
  UserCheck,
  TrendingUp,
  Percent,
  Minus,
  Plus,
  Download
} from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { omsetService } from '../../services/omsetService';

export default function Omset() {
  const { user } = useSelector((state) => state.auth);
  const userRole = (user?.role || '').toLowerCase();
  const canSetorKePusat = ['admin', 'developer', 'owner'].includes(userRole);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation Tabs: 'rekap' | 'neraca'
  const [activeTab, setActiveTab] = useState('rekap');

  // Filters
  const [dateFilter, setDateFilter] = useState('Semua');
  const [search, setSearch] = useState('');
  
  // Explainer banner collapse toggle
  const [showGuide, setShowGuide] = useState(false);

  // Form Initial State (Rekap Hasil Akhir Harian & Laba Bersih)
  const initialForm = {
    tanggal: new Date().toISOString().split('T')[0],
    nama_kantor: 'JNE Ngemplak', // 2 Cabang: JNE Ngemplak & JNE Nusukan
    nilai_ongkir: '', // Hasil / Nilai Transaksi dasar harian
    asuransi: '', // Biaya Asuransi
    pendapatan_toko: '', // Nominal Pendapatan Toko Kotor (manual Rp)
    piutang_customer: '', // Piutang Customer / Belum Bayar (-)
    diskon_customer: '', // Discount / Potongan Customer (-)
    bayar_customer: '', // Bayar Customer / Pelunasan Piutang (+)
    catatan: ''
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [kantorFilter, setKantorFilter] = useState('Semua'); // 'Semua' | 'JNE Ngemplak' | 'JNE Nusukan'

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

  // Daftar nama cabang/kantor (default: JNE Ngemplak & JNE Nusukan)
  const uniqueKantorList = useMemo(() => {
    const setK = new Set(['JNE Ngemplak', 'JNE Nusukan']);
    data.forEach(item => {
      let k = item.nama_kantor || item.kantor;
      if (k === 'Kantor JNE 1') k = 'JNE Ngemplak';
      if (k === 'Kantor JNE 2' || k?.toLowerCase() === 'nususkan') k = 'JNE Nusukan';
      if (k && k.trim()) {
        setK.add(k.trim());
      }
    });
    return Array.from(setK);
  }, [data]);

  // Filtered transactions for rekap tab
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Normalisasi nama kantor
      let itemKantor = (item.nama_kantor || item.kantor || 'JNE Ngemplak').trim();
      if (itemKantor === 'Kantor JNE 1') itemKantor = 'JNE Ngemplak';
      if (itemKantor === 'Kantor JNE 2' || itemKantor.toLowerCase() === 'nususkan') itemKantor = 'JNE Nusukan';

      // 1. Search (tanggal / catatan / nomor rekap / kantor)
      if (search) {
        const q = search.toLowerCase();
        const dateMatch = item.tanggal?.toLowerCase().includes(q);
        const noteMatch = item.catatan?.toLowerCase().includes(q);
        const resiMatch = item.no_resi?.toLowerCase().includes(q);
        const kantorMatch = itemKantor.toLowerCase().includes(q);
        if (!dateMatch && !noteMatch && !resiMatch && !kantorMatch) return false;
      }

      // 2. Kantor Filter (JNE Ngemplak vs JNE Nusukan)
      if (kantorFilter !== 'Semua') {
        if (itemKantor.toLowerCase() !== kantorFilter.toLowerCase().trim()) return false;
      }

      // 3. Date Filter
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
  }, [data, search, kantorFilter, dateFilter]);

  // Financial Summaries & Neraca Aggregations
  // Rumus Laba Bersih: Pendapatan Toko - Piutang Customer - Discount Customer + Bayar Customer
  const summaries = useMemo(() => {
    let totalHasil = 0;
    let totalAsuransi = 0;
    let totalKasFisik = 0;
    let totalHppPusat = 0;
    let totalPendapatanKotor = 0;
    let totalPiutangCustomer = 0;
    let totalDiskonCustomer = 0;
    let totalBayarCustomer = 0;
    let totalLabaBersih = 0;
    let countRekap = 0;

    let hppSudahSetor = 0;
    let hutangHppBelumSetor = 0;

    filteredData.forEach(item => {
      const hasil = Number(item.nilai_ongkir) || 0;
      const asuransi = Number(item.asuransi) || 0;
      const pendapatan = Number(item.pendapatan_toko !== undefined ? item.pendapatan_toko : item.komisi_nominal) || 0;
      const piutang = Number(item.piutang_customer) || 0;
      const diskon = Number(item.diskon_customer) || 0;
      const bayar = Number(item.bayar_customer) || 0;
      
      const labaBersih = item.laba_bersih !== undefined && item.laba_bersih !== null
        ? Number(item.laba_bersih)
        : (pendapatan - piutang - diskon + bayar);

      const hpp = Number(item.hpp_pusat) || Math.max(0, (hasil + asuransi) - pendapatan);
      const kas = Number(item.kas_diterima) || (hasil + asuransi - piutang - diskon + bayar);
      const status = item.status_setor || 'Belum Setor';

      totalHasil += hasil;
      totalAsuransi += asuransi;
      totalKasFisik += kas;
      totalHppPusat += hpp;
      totalPendapatanKotor += pendapatan;
      totalPiutangCustomer += piutang;
      totalDiskonCustomer += diskon;
      totalBayarCustomer += bayar;
      totalLabaBersih += labaBersih;
      countRekap += 1;

      if (status === 'Sudah Setor') {
        hppSudahSetor += hpp;
      } else {
        hutangHppBelumSetor += hpp;
      }
    });

    // Total Omset Kotor = Total Hasil + Total Asuransi
    const totalOmset = totalHasil + totalAsuransi;

    // SISI NERACA SALDO (BALANCE SHEET):
    // 1. Kas Fisik Sisa di Laci = Total Kas Diterima dikurangi HPP yang sudah ditransfer ke pusat
    const kasFisikSisaLaci = totalKasFisik - hppSudahSetor;
    
    // 2. Total Aset Aktiva (Harta Nyata Counter):
    //    Kas Fisik Sisa Laci + Bukti Setoran Pusat Tersalurkan = Total Kas Diterima
    const totalAset = kasFisikSisaLaci + hppSudahSetor;

    // 3. Sisi Pasiva (Kewajiban & Ekuitas):
    //    Kewajiban Hutang Setor HPP Belum Disetor + HPP Sudah Setor + Total Laba Bersih Toko
    //    Secara matematis: HPP Pusat + Laba Bersih = Total Kas Diterima!
    const totalKewajiban = hutangHppBelumSetor;
    const totalEkuitas = totalLabaBersih;
    const totalKewajibanEkuitas = totalKewajiban + hppSudahSetor + totalEkuitas;

    // Selisih Neraca: 100% selalu Rp 0 (Pasti Seimbang)
    const selisihBalance = totalAset - totalKewajibanEkuitas;

    return {
      totalHasil,
      totalAsuransi,
      totalOmset,
      totalKasFisik,
      totalHppPusat,
      totalPendapatanKotor,
      totalPiutangCustomer,
      totalDiskonCustomer,
      totalBayarCustomer,
      totalLabaBersih,
      countRekap,
      hppSudahSetor,
      hutangHppBelumSetor,
      kasFisikSisaLaci,
      totalAset,
      totalKewajiban,
      totalEkuitas,
      totalKewajibanEkuitas,
      selisihBalance
    };
  }, [filteredData]);

  // Live calculation for Modal preview
  const previewBreakdown = useMemo(() => {
    return omsetService.calculateBreakdown({
      nilai_ongkir: Number(formData.nilai_ongkir) || 0,
      asuransi: Number(formData.asuransi) || 0,
      pendapatan_toko: Number(formData.pendapatan_toko) || 0,
      piutang_customer: Number(formData.piutang_customer) || 0,
      diskon_customer: Number(formData.diskon_customer) || 0,
      bayar_customer: Number(formData.bayar_customer) || 0
    });
  }, [
    formData.nilai_ongkir, 
    formData.asuransi, 
    formData.pendapatan_toko,
    formData.piutang_customer,
    formData.diskon_customer,
    formData.bayar_customer
  ]);

  // Form submit (Simpan Rekap Hasil Akhir Harian)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nilai_ongkir || Number(formData.nilai_ongkir) <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Hasil Transaksi Kosong',
        text: 'Masukkan nilai transaksi / hasil harian yang valid.',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    try {
      await omsetService.create({
        tanggal: formData.tanggal,
        nama_kantor: formData.nama_kantor?.trim() || 'JNE Ngemplak',
        hasil_transaksi: Number(formData.nilai_ongkir),
        nilai_ongkir: Number(formData.nilai_ongkir),
        asuransi: Number(formData.asuransi) || 0,
        pendapatan_toko: Number(formData.pendapatan_toko) || 0,
        piutang_customer: Number(formData.piutang_customer) || 0,
        diskon_customer: Number(formData.diskon_customer) || 0,
        bayar_customer: Number(formData.bayar_customer) || 0,
        catatan: formData.catatan,
        created_by: user?.id
      });

      Swal.fire({
        icon: 'success',
        title: 'Rekap Harian Tersimpan',
        text: `Data rekap hasil akhir harian tanggal ${formData.tanggal} berhasil dicatat.`,
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

  // Alert jika akun non-admin/non-developer mencoba mengubah status setoran
  const handleUnauthorizedSetor = () => {
    Swal.fire({
      icon: 'warning',
      title: 'Akses Ditolak',
      html: `
        <div class="text-xs text-slate-600 space-y-2 text-left">
          <p>Hanya akun <b>Admin</b> dan <b>Developer</b> yang memiliki wewenang untuk menyetorkan HPP dan mengubah status setoran ke JNE Pusat.</p>
          <div class="p-2.5 bg-slate-100 rounded-xl font-mono text-[11px] text-slate-700">
            Peran Anda saat ini: <span class="font-bold uppercase text-amber-700">${user?.role || 'Staff'}</span>
          </div>
        </div>
      `,
      confirmButtonText: 'Mengerti',
      confirmButtonColor: '#2563eb',
      customClass: { popup: 'rounded-2xl' }
    });
  };

  // Toggle status setor HPP ke JNE Pusat (Khusus Admin & Developer)
  const handleToggleStatus = async (item) => {
    if (!canSetorKePusat) {
      handleUnauthorizedSetor();
      return;
    }

    const currentStatus = item.status_setor || 'Belum Setor';
    const isSudahSetor = currentStatus === 'Sudah Setor';
    const newStatus = isSudahSetor ? 'Belum Setor' : 'Sudah Setor';
    
    const confirmTitle = isSudahSetor ? 'Batalkan Status Setoran?' : 'Konfirmasi Setor ke Pusat?';
    const confirmText = isSudahSetor
      ? `Ubah status rekap tanggal "${item.tanggal}" kembali menjadi "Belum Setor"?`
      : `HPP sebesar ${formatRupiah(item.hpp_pusat)} untuk rekap tanggal "${item.tanggal}" telah Anda setorkan ke JNE Pusat?`;

    const confirm = await Swal.fire({
      title: confirmTitle,
      text: confirmText,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: isSudahSetor ? 'Ya, Batalkan' : 'Ya, Sudah Setor',
      cancelButtonText: 'Batal',
      confirmButtonColor: isSudahSetor ? '#64748b' : '#2563eb',
      customClass: { popup: 'rounded-2xl' }
    });

    if (confirm.isConfirmed) {
      try {
        await omsetService.updateStatus(item.id, newStatus);
        Swal.fire({
          icon: 'success',
          title: 'Status Diperbarui',
          text: `Status rekap tanggal ${item.tanggal} berhasil diubah menjadi "${newStatus}".`,
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

  // Delete transaction (Khusus Admin & Developer)
  const handleDelete = (id, tanggal) => {
    if (!canSetorKePusat) {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Ditolak',
        text: 'Hanya Admin dan Developer yang berwenang menghapus data rekapitulasi harian.',
        confirmButtonColor: '#2563eb',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    Swal.fire({
      title: 'Hapus Rekap Harian?',
      text: `Data rekapitulasi penjualan tanggal "${tanggal}" akan dihapus.`,
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
          text: 'Data rekap harian berhasil dihapus.',
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
        text: 'Tidak ada data rekap penjualan untuk diekspor.',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    const exportRows = filteredData.map((item, idx) => {
      const pendapatan = Number(item.pendapatan_toko !== undefined ? item.pendapatan_toko : item.komisi_nominal) || 0;
      const piutang = Number(item.piutang_customer) || 0;
      const diskon = Number(item.diskon_customer) || 0;
      const bayar = Number(item.bayar_customer) || 0;
      const labaBersih = item.laba_bersih !== undefined ? Number(item.laba_bersih) : (pendapatan - piutang - diskon + bayar);

      return {
        'No': idx + 1,
        'Tanggal Rekap': item.tanggal,
        'Kantor JNE': item.nama_kantor === 'Kantor JNE 2' ? 'JNE Nusukan' : (item.nama_kantor || 'JNE Ngemplak'),
        'Hasil / Nilai Transaksi (Rp)': item.nilai_ongkir,
        'Biaya Asuransi (Rp)': item.asuransi || 0,
        'Pendapatan Toko Kotor (Rp)': pendapatan,
        'Piutang Customer (Rp)': piutang,
        'Discount Customer (Rp)': diskon,
        'Bayar Customer (Rp)': bayar,
        'Laba Bersih Toko (Rp)': labaBersih,
        'Total Kas Masuk Laci (Rp)': item.kas_diterima || (Number(item.nilai_ongkir) + Number(item.asuransi || 0) - piutang - diskon + bayar),
        'HPP Setor ke Pusat (Rp)': item.hpp_pusat,
        'Status Setor ke Pusat': item.status_setor || 'Belum Setor',
        'Catatan Closing': item.catatan || ''
      };
    });

    // Add summary row
    exportRows.push({
      'No': 'TOTAL',
      'Tanggal Rekap': '',
      'Hasil / Nilai Transaksi (Rp)': summaries.totalHasil,
      'Biaya Asuransi (Rp)': summaries.totalAsuransi,
      'Pendapatan Toko Kotor (Rp)': summaries.totalPendapatanKotor,
      'Piutang Customer (Rp)': summaries.totalPiutangCustomer,
      'Discount Customer (Rp)': summaries.totalDiskonCustomer,
      'Bayar Customer (Rp)': summaries.totalBayarCustomer,
      'Laba Bersih Toko (Rp)': summaries.totalLabaBersih,
      'Total Kas Masuk Laci (Rp)': summaries.totalKasFisik,
      'HPP Setor ke Pusat (Rp)': summaries.totalHppPusat,
      'Status Setor ke Pusat': `Sudah: ${formatRupiah(summaries.hppSudahSetor)} | Belum: ${formatRupiah(summaries.hutangHppBelumSetor)}`,
      'Catatan Closing': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap_Penjualan_JNE");
    XLSX.writeFile(workbook, `Rekap_Penjualan_JNE_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const formatTanggalIndo = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Ekspor Excel (.xlsx) per 1 Laporan Rekap Harian
  const exportSingleExcel = (item) => {
    const itemKantor = item.nama_kantor === 'Kantor JNE 1' ? 'JNE Ngemplak' :
                       (item.nama_kantor === 'Kantor JNE 2' || item.nama_kantor?.toLowerCase() === 'nususkan') ? 'JNE Nusukan' :
                       (item.nama_kantor || 'JNE Ngemplak');

    const pendapatan = Number(item.pendapatan_toko !== undefined ? item.pendapatan_toko : item.komisi_nominal) || 0;
    const piutang = Number(item.piutang_customer) || 0;
    const diskon = Number(item.diskon_customer) || 0;
    const bayar = Number(item.bayar_customer) || 0;
    const labaBersih = item.laba_bersih !== undefined && item.laba_bersih !== null
      ? Number(item.laba_bersih)
      : (pendapatan - piutang - diskon + bayar);
    const kasMasuk = Number(item.kas_diterima) || (Number(item.nilai_ongkir) + Number(item.asuransi || 0) - piutang - diskon + bayar);
    const status = item.status_setor || 'Belum Setor';

    const exportData = [
      { 'Komponen Rekap Harian': 'KANTOR CABANG JNE', 'Nilai / Keterangan': itemKantor },
      { 'Komponen Rekap Harian': 'TANGGAL REKAP', 'Nilai / Keterangan': item.tanggal },
      { 'Komponen Rekap Harian': 'HARI & TANGGAL LENGKAP', 'Nilai / Keterangan': formatTanggalIndo(item.tanggal) },
      { 'Komponen Rekap Harian': 'STATUS SETORAN PUSAT', 'Nilai / Keterangan': status },
      { 'Komponen Rekap Harian': '', 'Nilai / Keterangan': '' },
      { 'Komponen Rekap Harian': '1. Hasil / Nilai Transaksi Dasar (Rp)', 'Nilai / Keterangan': Number(item.nilai_ongkir) || 0 },
      { 'Komponen Rekap Harian': '2. Biaya Asuransi Paket (Rp)', 'Nilai / Keterangan': Number(item.asuransi) || 0 },
      { 'Komponen Rekap Harian': '3. Total Transaksi + Asuransi (Rp)', 'Nilai / Keterangan': (Number(item.nilai_ongkir) || 0) + (Number(item.asuransi) || 0) },
      { 'Komponen Rekap Harian': '4. Pendapatan Toko Kotor (Komisi) (Rp)', 'Nilai / Keterangan': pendapatan },
      { 'Komponen Rekap Harian': '5. HPP Wajib Setor ke JNE Pusat (Rp)', 'Nilai / Keterangan': Number(item.hpp_pusat) || 0 },
      { 'Komponen Rekap Harian': '', 'Nilai / Keterangan': '' },
      { 'Komponen Rekap Harian': '--- PENYESUAIAN CUSTOMER ---', 'Nilai / Keterangan': '' },
      { 'Komponen Rekap Harian': '(-) Piutang Customer Belum Bayar (Rp)', 'Nilai / Keterangan': piutang },
      { 'Komponen Rekap Harian': '(-) Discount Customer Toko (Rp)', 'Nilai / Keterangan': diskon },
      { 'Komponen Rekap Harian': '(+) Bayar Piutang Customer (Rp)', 'Nilai / Keterangan': bayar },
      { 'Komponen Rekap Harian': '', 'Nilai / Keterangan': '' },
      { 'Komponen Rekap Harian': '--- HASIL AKHIR & KAS LACI ---', 'Nilai / Keterangan': '' },
      { 'Komponen Rekap Harian': 'LABA BERSIH TOKO (NET PROFIT) (Rp)', 'Nilai / Keterangan': labaBersih },
      { 'Komponen Rekap Harian': 'TOTAL KAS FISIK DI LACI (Kas Masuk) (Rp)', 'Nilai / Keterangan': kasMasuk },
      { 'Komponen Rekap Harian': '', 'Nilai / Keterangan': '' },
      { 'Komponen Rekap Harian': 'Keterangan / Catatan Closing', 'Nilai / Keterangan': item.catatan || 'Rekap Harian JNE' },
      { 'Komponen Rekap Harian': 'Waktu Input Data', 'Nilai / Keterangan': item.waktu || '-' },
      { 'Komponen Rekap Harian': 'Waktu Ekspor Laporan', 'Nilai / Keterangan': new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) }
    ];

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [{ wch: 44 }, { wch: 36 }];
    const workbook = XLSX.utils.book_new();
    const cleanKantor = itemKantor.replace(/\s+/g, '_');
    XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap_${item.tanggal}`);
    XLSX.writeFile(workbook, `Laporan_Rekap_${cleanKantor}_${item.tanggal}.xlsx`);

    Swal.fire({
      icon: 'success',
      title: 'Ekspor Excel Berhasil',
      text: `File Laporan_Rekap_${cleanKantor}_${item.tanggal}.xlsx berhasil diunduh.`,
      timer: 2000,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' }
    });
  };

  // Ekspor PDF (.pdf) per 1 Laporan Rekap Harian
  const exportSinglePDF = (item) => {
    const itemKantor = item.nama_kantor === 'Kantor JNE 1' ? 'JNE Ngemplak' :
                       (item.nama_kantor === 'Kantor JNE 2' || item.nama_kantor?.toLowerCase() === 'nususkan') ? 'JNE Nusukan' :
                       (item.nama_kantor || 'JNE Ngemplak');

    const pendapatan = Number(item.pendapatan_toko !== undefined ? item.pendapatan_toko : item.komisi_nominal) || 0;
    const piutang = Number(item.piutang_customer) || 0;
    const diskon = Number(item.diskon_customer) || 0;
    const bayar = Number(item.bayar_customer) || 0;
    const labaBersih = item.laba_bersih !== undefined && item.laba_bersih !== null
      ? Number(item.laba_bersih)
      : (pendapatan - piutang - diskon + bayar);
    const kasMasuk = Number(item.kas_diterima) || (Number(item.nilai_ongkir) + Number(item.asuransi || 0) - piutang - diskon + bayar);
    const status = item.status_setor || 'Belum Setor';

    const doc = new jsPDF();

    // Top Header Banner JNE Corporate Blue
    doc.setFillColor(0, 74, 141);
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text("LAPORAN REKAP HASIL AKHIR & SETORAN HARIAN JNE", 14, 11);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cabang: ${itemKantor}  |  Tanggal: ${formatTanggalIndo(item.tanggal)} (${item.tanggal})`, 14, 18);

    // Meta details
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.text(`Status Setoran ke Pusat : ${status}`, 14, 32);
    doc.text(`Catatan Closing            : ${item.catatan || 'Rekap Harian JNE'}`, 14, 38);
    doc.text(`Dicetak Pada                 : ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`, 14, 44);

    const tableRows = [
      ['1. Hasil / Nilai Transaksi Dasar', formatRupiah(item.nilai_ongkir)],
      ['2. Biaya Asuransi Paket', `+ ${formatRupiah(item.asuransi || 0)}`],
      ['3. Total Transaksi + Asuransi', formatRupiah((Number(item.nilai_ongkir) || 0) + (Number(item.asuransi) || 0))],
      ['4. Pendapatan Toko Kotor (Komisi)', formatRupiah(pendapatan)],
      ['5. HPP Wajib Setor ke JNE Pusat', formatRupiah(item.hpp_pusat)],
      ['6. (-) Piutang Customer Belum Bayar', `- ${formatRupiah(piutang)}`],
      ['7. (-) Discount Customer Toko', `- ${formatRupiah(diskon)}`],
      ['8. (+) Bayar Piutang Customer', `+ ${formatRupiah(bayar)}`],
      ['9. LABA BERSIH TOKO (NET PROFIT)', formatRupiah(labaBersih)],
      ['10. TOTAL KAS FISIK DI LACI (Kas Masuk)', formatRupiah(kasMasuk)],
    ];

    doc.autoTable({
      startY: 49,
      head: [['Rincian Komponen Rekapitulasi', 'Nominal (Rp)']],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3.5 },
      headStyles: { fillColor: [0, 74, 141], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'normal' },
        1: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: function (data) {
        if (data.row.index === 4) {
          data.cell.styles.textColor = [220, 38, 38]; // Red for HPP Setor
        }
        if (data.row.index === 8) {
          data.cell.styles.fillColor = [254, 243, 199]; // Amber
          data.cell.styles.textColor = [180, 83, 9];
        }
        if (data.row.index === 9) {
          data.cell.styles.fillColor = [236, 253, 245]; // Emerald
          data.cell.styles.textColor = [4, 120, 87];
        }
      }
    });

    const cleanKantor = itemKantor.replace(/\s+/g, '_');
    doc.save(`Slip_Rekap_${cleanKantor}_${item.tanggal}.pdf`);

    Swal.fire({
      icon: 'success',
      title: 'Ekspor PDF Berhasil',
      text: `File Slip_Rekap_${cleanKantor}_${item.tanggal}.pdf berhasil diunduh.`,
      timer: 2000,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' }
    });
  };

  // Dialog Pilihan Ekspor per 1 Laporan
  const handleExportSingle = (item) => {
    const itemKantor = item.nama_kantor === 'Kantor JNE 1' ? 'JNE Ngemplak' :
                       (item.nama_kantor === 'Kantor JNE 2' || item.nama_kantor?.toLowerCase() === 'nususkan') ? 'JNE Nusukan' :
                       (item.nama_kantor || 'JNE Ngemplak');

    const pendapatan = Number(item.pendapatan_toko !== undefined ? item.pendapatan_toko : item.komisi_nominal) || 0;
    const piutang = Number(item.piutang_customer) || 0;
    const diskon = Number(item.diskon_customer) || 0;
    const bayar = Number(item.bayar_customer) || 0;
    const labaBersih = item.laba_bersih !== undefined && item.laba_bersih !== null
      ? Number(item.laba_bersih)
      : (pendapatan - piutang - diskon + bayar);
    const kasMasuk = Number(item.kas_diterima) || (Number(item.nilai_ongkir) + Number(item.asuransi || 0) - piutang - diskon + bayar);

    Swal.fire({
      title: 'Ekspor Laporan Rekap',
      html: `
        <div style="text-align: left; font-size: 12px; color: #334155; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; line-height: 1.8;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: 600;">Cabang:</span>
            <span style="font-weight: 700; color: #1e293b;">${itemKantor}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: 600;">Tanggal Rekap:</span>
            <span style="font-weight: 700; color: #1e293b;">${formatTanggalIndo(item.tanggal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; margin-top: 6px; padding-top: 6px;">
            <span style="color: #64748b; font-weight: 600;">Total Kas Laci:</span>
            <span style="font-weight: 700; color: #059669;">${formatRupiah(kasMasuk)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: 600;">HPP Setor Pusat:</span>
            <span style="font-weight: 700; color: #e11d48;">${formatRupiah(item.hpp_pusat)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: 600;">Laba Bersih Toko:</span>
            <span style="font-weight: 700; color: #d97706;">${formatRupiah(labaBersih)}</span>
          </div>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 14px; text-align: center;">Pilih format dokumen untuk diekspor:</p>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: '📊 Ekspor Excel (.xlsx)',
      denyButtonText: '📄 Cetak / PDF (.pdf)',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#059669', // Emerald
      denyButtonColor: '#004a8d',    // Corporate JNE Blue
      cancelButtonColor: '#94a3b8',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl font-bold text-xs px-3.5 py-2.5 cursor-pointer',
        denyButton: 'rounded-xl font-bold text-xs px-3.5 py-2.5 cursor-pointer',
        cancelButton: 'rounded-xl font-bold text-xs px-3 py-2.5 cursor-pointer'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        exportSingleExcel(item);
      } else if (result.isDenied) {
        exportSinglePDF(item);
      }
    });
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Manajemen Rekap Harian & Setoran JNE Pusat</h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck size={11} className="text-emerald-600" />
                Neraca 100% Balance
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <UserCheck size={11} className={canSetorKePusat ? "text-emerald-600" : "text-amber-600"} />
                <span>{user?.name || user?.email || 'User'}</span>
                <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                  canSetorKePusat 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {user?.role || 'Staff'}
                </span>
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Pencatatan hasil akhir harian, kalkulasi HPP setor pusat, dan laba bersih toko
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/70 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Buka panduan rumus hitung HPP dan Laba Bersih"
          >
            <Info size={14} className="text-blue-600" />
            <span className="hidden sm:inline">{showGuide ? 'Tutup Panduan' : 'Panduan Rumus'}</span>
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
            <span>+ Catat Rekap Harian</span>
          </button>
        </div>
      </motion.div>

      {/* Main Tab Navigator */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/80">
        <button
          onClick={() => setActiveTab('rekap')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'rekap'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <Receipt size={15} className={activeTab === 'rekap' ? 'text-blue-600' : 'text-slate-400'} />
          <span>1. Rekap Harian & Setoran Pusat</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-mono font-normal">
            {filteredData.length} Data
          </span>
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
          <span>2. Neraca Keuangan (Balance Sheet)</span>
          <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
            100% Balance
          </span>
        </button>
      </div>

      {/* Explainer Box: Logika Rekap Harian, Rumus HPP & Laba Bersih */}
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
                <span>PANDUAN RUMUS REKAP AKHIR HARIAN JNE</span>
              </div>
              <button 
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs leading-relaxed">
              {/* Box 1: Rumus HPP Setor */}
              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-rose-400">
                  <Building2 size={15} />
                  <span>1. Rumus HPP Setor Pusat</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg font-mono text-[11px] text-amber-300 border border-slate-800">
                  (Hasil + Asuransi) - Pendapatan Toko
                </div>
                <p className="text-slate-300 text-[11px]">
                  Nilai kewajiban uang yang wajib disetorkan/ditransfer counter ke JNE Pusat.
                </p>
              </div>

              {/* Box 2: Rumus Laba Bersih Toko */}
              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <TrendingUp size={15} />
                  <span>2. Rumus Laba Bersih Toko</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg font-mono text-[11px] text-amber-300 border border-slate-800 leading-normal">
                  Pendapatan Toko - Piutang - Diskon + Bayar Customer
                </div>
                <p className="text-slate-300 text-[11px]">
                  Keuntungan riil counter setelah dikurangi customer belum bayar & diskon, serta ditambah pelunasan customer.
                </p>
              </div>

              {/* Box 3: Total Kas Masuk Laci & Neraca */}
              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <Scale size={15} />
                  <span>3. Kas Laci & Keseimbangan Neraca</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 border border-slate-800">
                  Kas Laci = HPP Pusat + Laba Bersih
                </div>
                <p className="text-slate-300 text-[11px]">
                  Seluruh uang fisik di laci terbagi menjadi dua: hak JNE Pusat (HPP) dan Laba Bersih counter (Selisih Rp 0).
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* TAB 1: REKAP HARIAN & SETORAN PUSAT */}
      {/* ======================================================== */}
      {activeTab === 'rekap' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* 4 Financial Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Hasil Penjualan */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Hasil Transaksi</span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200">
                  <Receipt size={14} />
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-900 tabular-nums font-mono">
                {formatRupiah(summaries.totalHasil)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                <Calendar size={12} />
                <span>Dari {summaries.countRekap} hari rekap penjualan</span>
              </div>
            </div>

            {/* Card 2: Kas Fisik Diterima */}
            <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs bg-emerald-50/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Total Kas Diterima (Laci)</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 border border-emerald-200">
                  <Banknote size={14} />
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-emerald-700 tabular-nums font-mono">
                {formatRupiah(summaries.totalKasFisik)}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 font-medium">
                HPP Setor Pusat + Laba Bersih
              </div>
            </div>

            {/* Card 3: Wajib Setor ke Pusat (HPP) */}
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
              <div className="text-[11px] text-rose-600/80 mt-1 font-medium flex items-center justify-between">
                <span>Belum Setor: {formatRupiah(summaries.hutangHppBelumSetor)}</span>
                <span className="text-emerald-700 font-bold">Lunas: {formatRupiah(summaries.hppSudahSetor)}</span>
              </div>
            </div>

            {/* Card 4: Total Laba Bersih Toko (Rumus Baru) */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Total Laba Bersih Toko</span>
                <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400 border border-amber-400/20">
                  <Wallet size={14} />
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-amber-400 tabular-nums font-mono">
                {formatRupiah(summaries.totalLabaBersih)}
              </div>
              <div className="text-[10px] text-slate-300 mt-1 font-sans flex items-center justify-between">
                <span>Pendapatan: {formatRupiah(summaries.totalPendapatanKotor)}</span>
                <span className="text-blue-300">Bayar Cust: +{formatRupiah(summaries.totalBayarCustomer)}</span>
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
                placeholder="Cari tanggal rekap, catatan closing..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              {/* Filter Kantor JNE */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Building2 size={13} className="text-blue-600 shrink-0" />
                <select
                  value={kantorFilter}
                  onChange={(e) => setKantorFilter(e.target.value)}
                  className="text-xs font-semibold bg-transparent text-slate-700 outline-none cursor-pointer"
                >
                  <option value="Semua">Semua Cabang (Ngemplak & Nusukan)</option>
                  {uniqueKantorList.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
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

          {/* Table Data Rekap Harian */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal Rekap</th>
                    <th className="py-3 px-4 text-right">Hasil (Transaksi)</th>
                    <th className="py-3 px-4 text-right">Biaya Asuransi</th>
                    <th className="py-3 px-4 text-right">Total Kas Masuk</th>
                    <th className="py-3 px-4 text-right">HPP Setor Pusat</th>
                    <th className="py-3 px-4 text-right">Pendapatan Toko</th>
                    <th className="py-3 px-4 text-right">Laba Bersih Toko</th>
                    <th className="py-3 px-4 text-center">Status Setor Pusat</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4 text-center min-w-[130px] sticky right-0 bg-slate-50/95 backdrop-blur-xs shadow-[-3px_0_4px_-1px_rgba(0,0,0,0.06)]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                        Memuat data rekap penjualan...
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <Receipt size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600 text-sm">Belum ada rekap hasil akhir harian</p>
                        <p className="text-xs text-slate-400 mt-0.5">Klik tombol "+ Catat Rekap Harian" untuk memasukkan data closing hari ini.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => {
                      const status = item.status_setor || 'Belum Setor';
                      const isSettled = status === 'Sudah Setor';
                      
                      const pendapatan = Number(item.pendapatan_toko !== undefined ? item.pendapatan_toko : item.komisi_nominal) || 0;
                      const piutang = Number(item.piutang_customer) || 0;
                      const diskon = Number(item.diskon_customer) || 0;
                      const bayar = Number(item.bayar_customer) || 0;
                      
                      const labaBersih = item.laba_bersih !== undefined && item.laba_bersih !== null
                        ? Number(item.laba_bersih)
                        : (pendapatan - piutang - diskon + bayar);

                      const kasMasuk = Number(item.kas_diterima) || (Number(item.nilai_ongkir) + Number(item.asuransi || 0) - piutang - diskon + bayar);

                      const hasCustomerAdjustments = piutang > 0 || diskon > 0 || bayar > 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Tanggal Rekap & Kantor JNE */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                                (item.nama_kantor || '').toLowerCase().includes('nusukan') || (item.nama_kantor || '').toLowerCase().includes('nususkan') || (item.nama_kantor || '').includes('2')
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                <Building2 size={10} className="shrink-0" />
                                <span>
                                  {item.nama_kantor === 'Kantor JNE 1' ? 'JNE Ngemplak' :
                                   (item.nama_kantor === 'Kantor JNE 2' || item.nama_kantor?.toLowerCase() === 'nususkan') ? 'JNE Nusukan' :
                                   (item.nama_kantor || 'JNE Ngemplak')}
                                </span>
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 font-sans">{formatTanggalIndo(item.tanggal)}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                              <Clock size={10} /> {item.tanggal}
                            </div>
                          </td>

                          {/* Hasil (Transaksi) */}
                          <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-800">
                            {formatRupiah(item.nilai_ongkir)}
                          </td>

                          {/* Biaya Asuransi */}
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            {Number(item.asuransi) > 0 ? (
                              <span className="text-blue-600 font-semibold">+{formatRupiah(item.asuransi)}</span>
                            ) : (
                              <span className="text-slate-300 font-normal">Rp 0</span>
                            )}
                          </td>

                          {/* Total Kas Masuk Laci */}
                          <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              +{formatRupiah(kasMasuk)}
                            </span>
                          </td>

                          {/* HPP Setor ke Pusat */}
                          <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                            <span className="text-rose-600">
                              {formatRupiah(item.hpp_pusat)}
                            </span>
                          </td>

                          {/* Pendapatan Toko Kotor */}
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                            {formatRupiah(pendapatan)}
                          </td>

                          {/* Laba Bersih Toko (Rumus Baru) */}
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            <div className="font-bold text-amber-600 text-xs">
                              +{formatRupiah(labaBersih)}
                            </div>
                            {hasCustomerAdjustments && (
                              <div className="text-[9px] text-slate-400 font-sans mt-0.5 space-x-1">
                                {piutang > 0 && <span className="text-rose-500">P:-{formatRupiah(piutang)}</span>}
                                {diskon > 0 && <span className="text-amber-500">D:-{formatRupiah(diskon)}</span>}
                                {bayar > 0 && <span className="text-emerald-600">B:+{formatRupiah(bayar)}</span>}
                              </div>
                            )}
                          </td>

                          {/* Status Setor ke Pusat */}
                          <td className="py-3 px-4 text-center">
                            {isSettled ? (
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                                  <CheckCircle2 size={13} className="text-emerald-600" />
                                  <span>Sudah Disetor ke Pusat</span>
                                </span>
                                {canSetorKePusat && (
                                  <button
                                    onClick={() => handleToggleStatus(item)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Batalkan status setoran (Khusus Admin & Developer)"
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              canSetorKePusat ? (
                                <button
                                  onClick={() => handleToggleStatus(item)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer"
                                  title="Konfirmasi bahwa HPP telah disetor ke JNE Pusat (Khusus Admin & Developer)"
                                >
                                  <Building2 size={13} />
                                  <span>Sudah Setor ke Pusat</span>
                                </button>
                              ) : (
                                <button
                                  onClick={handleUnauthorizedSetor}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                                  title="Hanya Admin dan Developer yang dapat mengubah status setor"
                                >
                                  <Clock size={11} />
                                  <span>Belum Setor</span>
                                  <Lock size={10} className="text-rose-400 ml-0.5" />
                                </button>
                              )
                            )}
                          </td>

                          {/* Keterangan Closing */}
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                            {item.catatan ? item.catatan : <span className="text-slate-300 italic">Rekap Harian JNE</span>}
                          </td>

                          {/* Aksi */}
                          <td className="py-3 px-4 text-center sticky right-0 bg-white/95 backdrop-blur-xs shadow-[-3px_0_4px_-1px_rgba(0,0,0,0.06)]">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Button Ekspor Per Laporan */}
                              <button
                                onClick={() => handleExportSingle(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                                title="Ekspor laporan rekap hari ini (Excel / PDF)"
                              >
                                <Download size={12} className="text-emerald-600" />
                                <span>Ekspor</span>
                              </button>

                              {canSetorKePusat ? (
                                <button
                                  onClick={() => handleDelete(item.id, item.tanggal)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus data rekap ini (Khusus Admin/Developer)"
                                >
                                  <Trash2 size={14} />
                                </button>
                              ) : null}
                            </div>
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
      {/* TAB 2: NERACA KEUANGAN (BALANCE SHEET) */}
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
                  <h2 className="text-base md:text-lg font-bold">Laporan Posisi Keuangan (Neraca Rekonsiliasi)</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    STATUS: 100% BALANCE
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  Total Kas Masuk = Total Setoran HPP Pusat + Total Laba Bersih Toko • Selisih: <span className="text-emerald-400 font-mono font-bold">Rp 0 (Sempurna)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/60 font-mono text-center">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Total Kas Masuk</div>
                <div className="text-emerald-400 font-bold text-sm md:text-base">
                  {formatRupiah(summaries.totalKasFisik)}
                </div>
              </div>
              <div className="text-slate-500 font-bold text-lg">=</div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">HPP Pusat + Laba Bersih</div>
                <div className="text-blue-400 font-bold text-sm md:text-base">
                  {formatRupiah(summaries.totalKewajibanEkuitas)}
                </div>
              </div>
            </div>
          </div>

          {/* The T-Account Balance Sheet Table (2 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SISI KIRI: ASET (KAS DITERIMA & SETORAN) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-50/80 p-3.5 px-4 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <h3 className="font-bold text-slate-900 text-sm">AKTIVA / ASET (ARUS KAS DITERIMA)</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Sisi Kiri Neraca</span>
                </div>

                <div className="p-4 space-y-3.5 text-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                    Posisi Kas & Setoran
                  </div>

                  {/* 1. Kas Fisik Sisa di Laci */}
                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Banknote size={14} className="text-emerald-600" />
                        Kas Fisik Sisa di Laci Kasir
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Uang fisik di meja kasir setelah dikurangi setoran HPP yang sudah ditransfer
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-right tabular-nums">
                      {formatRupiah(summaries.kasFisikSisaLaci)}
                    </div>
                  </div>

                  {/* 2. Setoran ke Pusat Tersalurkan */}
                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-blue-600" />
                        HPP Disetor ke Pusat (Lunas)
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Total uang setoran HPP yang sudah berhasil ditransfer ke rekening JNE Pusat
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-right tabular-nums">
                      {formatRupiah(summaries.hppSudahSetor)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Aset Footer */}
              <div className="bg-emerald-50/70 p-4 border-t border-emerald-200/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-950 text-sm">TOTAL KAS FISIK DIKELOLA</div>
                  <div className="text-[10px] text-emerald-700">Sisa Kas Laci + Setoran Pusat Lunas</div>
                </div>
                <div className="text-lg font-black font-mono text-emerald-700 tabular-nums">
                  {formatRupiah(summaries.totalAset)}
                </div>
              </div>
            </div>

            {/* SISI KANAN: PASIVA (HUTANG SETOR HPP + EKUITAS LABA BERSIH) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-50/80 p-3.5 px-4 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <h3 className="font-bold text-slate-900 text-sm">PASIVA (ALOKASI HAK KEUANGAN)</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Sisi Kanan Neraca</span>
                </div>

                <div className="p-4 space-y-3.5 text-xs">
                  {/* Bagian Kewajiban */}
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                    Kewajiban Setoran ke Pusat
                  </div>

                  {/* Hutang Belum Setor */}
                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-rose-50/40 border border-rose-200/60">
                    <div>
                      <div className="font-bold text-rose-950 flex items-center gap-1.5">
                        <Building2 size={14} className="text-rose-600" />
                        Hutang HPP Belum Disetor ke Pusat
                      </div>
                      <div className="text-[10px] text-rose-700/80 mt-0.5">
                        Uang kasir titipan JNE Pusat yang wajib ditransfer hari ini
                      </div>
                    </div>
                    <div className="font-mono font-bold text-rose-600 text-right tabular-nums">
                      {formatRupiah(summaries.totalKewajiban)}
                    </div>
                  </div>

                  {/* HPP Sudah Setor */}
                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div>
                      <div className="font-bold text-slate-800">HPP Sudah Disetor ke Pusat</div>
                      <div className="text-[10px] text-slate-500">Kewajiban setor yang telah terselesaikan</div>
                    </div>
                    <div className="font-mono font-bold text-slate-800 text-right tabular-nums">
                      {formatRupiah(summaries.hppSudahSetor)}
                    </div>
                  </div>

                  {/* Bagian Ekuitas / Modal */}
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 pt-1 border-b border-slate-100">
                    Ekuitas Pemilik (Hak Keuntungan Counter)
                  </div>

                  <div className="flex items-start justify-between p-2.5 rounded-xl bg-amber-50/40 border border-amber-200/60">
                    <div>
                      <div className="font-bold text-amber-950 flex items-center gap-1.5">
                        <Wallet size={14} className="text-amber-600" />
                        Total Laba Bersih Toko
                      </div>
                      <div className="text-[10px] text-amber-700/80">Hak keuntungan riil counter setelah penyesuaian customer</div>
                    </div>
                    <div className="font-mono font-bold text-amber-700 text-right tabular-nums">
                      +{formatRupiah(summaries.totalLabaBersih)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Pasiva Footer */}
              <div className="bg-blue-50/70 p-4 border-t border-blue-200/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-blue-950 text-sm">TOTAL PASIVA (HUTANG + LABA BERSIH)</div>
                  <div className="text-[10px] text-blue-700">HPP Pusat + Laba Bersih Toko</div>
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
              <div className="font-bold text-slate-900">Catatan Pengelolaan Kas Counter:</div>
              <p>
                Dari total uang kas yang diterima di counter ({formatRupiah(summaries.totalKasFisik)}), sebesar <b className="text-rose-600">{formatRupiah(summaries.totalHppPusat)}</b> adalah HPP yang harus disetorkan ke JNE Pusat, dan <b className="text-emerald-600">+{formatRupiah(summaries.totalLabaBersih)}</b> adalah laba bersih murni toko Anda setelah memperhitungkan piutang, diskon, dan bayar customer.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ======================================================== */}
      {/* MODAL INPUT REKAP HASIL AKHIR HARIAN */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200/90 my-auto"
            >
              {/* Header Pinned */}
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Receipt size={17} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Catat Rekap Hasil Akhir Harian JNE</h3>
                    <p className="text-[10px] text-slate-500">Kalkulasi HPP setor pusat dan laba bersih toko</p>
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
                {/* 1. Tanggal Rekap & Kantor JNE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tanggal Rekap Harian <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.tanggal}
                      onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-blue-500 outline-none bg-slate-50/50"
                      required
                    />
                  </div>

                  {/* Pilihan Kantor JNE (Ngemplak & Nusukan) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 flex items-center gap-1">
                        <Building2 size={13} className="text-blue-600" />
                        Cabang Kantor JNE <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        2 Cabang
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, nama_kantor: 'JNE Ngemplak' }))}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                          formData.nama_kantor === 'JNE Ngemplak'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Building2 size={12} />
                        <span>JNE Ngemplak</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, nama_kantor: 'JNE Nusukan' }))}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                          formData.nama_kantor === 'JNE Nusukan'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Building2 size={12} />
                        <span>JNE Nusukan</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Nama cabang / kantor..."
                      value={formData.nama_kantor}
                      onChange={(e) => setFormData(prev => ({ ...prev, nama_kantor: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:border-blue-500 outline-none bg-white text-slate-800"
                      required
                    />
                  </div>
                </div>

                {/* 2. Hasil / Nilai Transaksi & 3. Biaya Asuransi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Hasil / Nilai Transaksi (Rp) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 1500000"
                      value={formData.nilai_ongkir}
                      onChange={(e) => setFormData(prev => ({ ...prev, nilai_ongkir: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold focus:border-blue-500 outline-none"
                      required
                      autoFocus
                    />
                    <span className="text-[10px] text-slate-400">Total omset transaksi harian</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Biaya Asuransi (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="0 (Kosongkan jika tidak ada)"
                      value={formData.asuransi}
                      onChange={(e) => setFormData(prev => ({ ...prev, asuransi: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold focus:border-blue-500 outline-none"
                    />
                    <span className="text-[10px] text-slate-400">Total asuransi harian</span>
                  </div>
                </div>

                {/* 4. Pendapatan Toko Kotor */}
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <Wallet size={14} className="text-amber-600" />
                      Pendapatan Toko (Kotor) (Rp) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-amber-800 font-semibold bg-amber-100/70 px-2 py-0.5 rounded-md">
                      Nominal Manual
                    </span>
                  </div>
                  <input
                    type="number"
                    placeholder="Contoh: 225000"
                    value={formData.pendapatan_toko}
                    onChange={(e) => setFormData(prev => ({ ...prev, pendapatan_toko: e.target.value }))}
                    className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono font-bold bg-white focus:border-amber-600 outline-none"
                    required
                  />
                  <div className="text-[10px] text-slate-500">
                    Ketik nominal komisi / pendapatan kotor counter hari ini
                  </div>
                </div>

                {/* 5. PENYESUAIAN CUSTOMER (RUMUS LABA BERSIH BARU) */}
                <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-blue-600" />
                      Penyesuaian Customer (Hitung Laba Bersih)
                    </span>
                    <span className="text-[10px] text-slate-400">Piutang • Diskon • Bayar</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Piutang Customer (-) */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <label className="block text-[11px] font-semibold text-rose-700 mb-1 flex items-center gap-1">
                        <Minus size={11} className="text-rose-600" />
                        Piutang Customer (Rp)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.piutang_customer}
                        onChange={(e) => setFormData(prev => ({ ...prev, piutang_customer: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs outline-none focus:border-rose-500"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Customer belum bayar</span>
                    </div>

                    {/* Discount Customer (-) */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <label className="block text-[11px] font-semibold text-amber-700 mb-1 flex items-center gap-1">
                        <Minus size={11} className="text-amber-600" />
                        Discount Customer (Rp)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.diskon_customer}
                        onChange={(e) => setFormData(prev => ({ ...prev, diskon_customer: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs outline-none focus:border-amber-500"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Potongan diskon toko</span>
                    </div>

                    {/* Bayar Customer (+) */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <label className="block text-[11px] font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                        <Plus size={11} className="text-emerald-600" />
                        Bayar Customer (Rp)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.bayar_customer}
                        onChange={(e) => setFormData(prev => ({ ...prev, bayar_customer: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs outline-none focus:border-emerald-500"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Pelunasan hutang cust</span>
                    </div>
                  </div>
                </div>

                {/* 6. LIVE CALCULATION PREVIEW BOX (HPP PUSAT + LABA BERSIH BARU) */}
                <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-800">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Scale size={14} />
                      Simulasi HPP Pusat & Laba Bersih
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      Rekap Harian
                    </span>
                  </div>

                  {/* 1. Rumus HPP Pusat */}
                  <div className="space-y-1 text-[11px] font-mono text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-bold mb-1">
                      Kewajiban Setor ke JNE Pusat:
                    </div>
                    <div className="flex justify-between">
                      <span>Hasil (Transaksi):</span>
                      <span className="text-white font-bold">{formatRupiah(previewBreakdown.nilai_ongkir)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">+ Asuransi:</span>
                      <span className="text-blue-400 font-bold">+{formatRupiah(previewBreakdown.asuransi)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400">- Pendapatan Toko:</span>
                      <span className="text-amber-400 font-bold">-{formatRupiah(previewBreakdown.komisi_nominal)}</span>
                    </div>
                    <div className="border-t border-slate-800 pt-1 flex justify-between font-bold text-xs">
                      <span className="text-rose-400">= HPP Setor ke Pusat:</span>
                      <span className="text-rose-400 text-sm">{formatRupiah(previewBreakdown.hpp_pusat)}</span>
                    </div>
                  </div>

                  {/* 2. Rumus Laba Bersih Toko */}
                  <div className="space-y-1 text-[11px] font-mono text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-bold mb-1">
                      Perhitungan Laba Bersih Toko:
                    </div>
                    <div className="flex justify-between">
                      <span>Pendapatan Toko (Kotor):</span>
                      <span className="text-white font-bold">{formatRupiah(previewBreakdown.pendapatan_toko)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rose-400">- Piutang Customer:</span>
                      <span className="text-rose-400 font-bold">-{formatRupiah(previewBreakdown.piutang_customer)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400">- Discount Customer:</span>
                      <span className="text-amber-400 font-bold">-{formatRupiah(previewBreakdown.diskon_customer)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-400">+ Bayar Customer:</span>
                      <span className="text-emerald-400 font-bold">+{formatRupiah(previewBreakdown.bayar_customer)}</span>
                    </div>
                    <div className="border-t border-slate-800 pt-1 flex justify-between font-bold text-xs">
                      <span className="text-amber-400">= Laba Bersih Toko:</span>
                      <span className="text-amber-400 text-sm">{formatRupiah(previewBreakdown.laba_bersih)}</span>
                    </div>
                  </div>

                  {/* Total Kas Masuk Laci Kasir */}
                  <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-semibold">Total Kas Masuk Laci:</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {formatRupiah(previewBreakdown.kas_diterima)} <span className="text-[10px] text-emerald-400/80 font-normal font-sans">(HPP + Laba Bersih)</span>
                    </span>
                  </div>
                </div>

                {/* 7. Catatan Closing (Opsional) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan Closing / Keterangan (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Rekap shift malam / Customer PT ABC bayar piutang"
                    value={formData.catatan}
                    onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
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
                  Simpan Rekap Harian
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
