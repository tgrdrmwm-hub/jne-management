import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Clock,
  MapPin,
  User,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit3,
  X,
  Sparkles,
  CalendarDays,
  ListFilter,
  Check,
  Users
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { kalenderService } from '../../services/kalenderService';
import { staffService } from '../../services/staffService';
import { Card } from '../../components/ui/Card';

// Kategori & Skema Warna Indikator
const KATEGORI_CONFIG = {
  'Operasional': {
    bg: 'bg-blue-50 text-blue-700 border-blue-200/80',
    badge: 'bg-blue-600 text-white',
    dot: 'bg-blue-500',
    gradient: 'from-blue-600 to-indigo-600',
    light: 'bg-blue-500/10 text-blue-600',
    border: 'border-l-blue-500',
  },
  'Briefing & Rapat': {
    bg: 'bg-purple-50 text-purple-700 border-purple-200/80',
    badge: 'bg-purple-600 text-white',
    dot: 'bg-purple-500',
    gradient: 'from-purple-600 to-indigo-700',
    light: 'bg-purple-500/10 text-purple-600',
    border: 'border-l-purple-500',
  },
  'Event & Promo': {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    badge: 'bg-emerald-600 text-white',
    dot: 'bg-emerald-500',
    gradient: 'from-emerald-600 to-teal-600',
    light: 'bg-emerald-500/10 text-emerald-600',
    border: 'border-l-emerald-500',
  },
  'Maintenance': {
    bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
    badge: 'bg-amber-600 text-white',
    dot: 'bg-amber-500',
    gradient: 'from-amber-500 to-orange-600',
    light: 'bg-amber-500/10 text-amber-600',
    border: 'border-l-amber-500',
  },
  'Libur & Cuti': {
    bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
    badge: 'bg-rose-600 text-white',
    dot: 'bg-rose-500',
    gradient: 'from-rose-600 to-red-600',
    light: 'bg-rose-500/10 text-rose-600',
    border: 'border-l-rose-500',
  },
  'Pelatihan': {
    bg: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
    badge: 'bg-cyan-600 text-white',
    dot: 'bg-cyan-500',
    gradient: 'from-cyan-600 to-blue-600',
    light: 'bg-cyan-500/10 text-cyan-600',
    border: 'border-l-cyan-500',
  },
};

const DEFAULT_CONFIG = {
  bg: 'bg-slate-50 text-slate-700 border-slate-200',
  badge: 'bg-slate-600 text-white',
  dot: 'bg-slate-500',
  gradient: 'from-slate-600 to-gray-700',
  light: 'bg-slate-500/10 text-slate-600',
  border: 'border-l-slate-500',
};

const Kalender = () => {
  const { user: currentUser } = useSelector((state) => state.auth);

  // States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('bulan'); // 'bulan' | 'minggu' | 'agenda'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [staffList, setStaffList] = useState([]);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState({ date: null, events: [] });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const initialForm = {
    judul: '',
    kategori: 'Operasional',
    tanggal_mulai: format(new Date(), 'yyyy-MM-dd'),
    tanggal_selesai: format(new Date(), 'yyyy-MM-dd'),
    jam_mulai: '08:00',
    jam_selesai: '09:00',
    seharian: false,
    lokasi: '',
    pic_id: currentUser?.id || '',
    pic_nama: currentUser?.name ? `${currentUser.name} (${currentUser.role || 'Staff'})` : '',
    staff_terlibat: [],
    prioritas: 'Biasa',
    status: 'Rencana',
    deskripsi: '',
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch Events
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await kalenderService.getAll();
      setEvents(data);
    } catch (err) {
      console.error('Gagal mengambil data kegiatan kalender:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Staff for PIC dropdown
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const staff = await staffService.getStaffList();
        setStaffList(staff);
      } catch (e) {
        console.warn('Gagal load daftar staff:', e);
      }
    };
    loadStaff();
    fetchEvents();

    const handleUpdate = () => fetchEvents();
    window.addEventListener('kalenderUpdated', handleUpdate);
    return () => window.removeEventListener('kalenderUpdated', handleUpdate);
  }, [fetchEvents]);

  // Navigate Date
  const handlePrev = () => {
    if (viewMode === 'minggu') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'minggu') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchKategori = selectedKategori === 'Semua' || e.kategori === selectedKategori;
      const matchStatus = selectedStatus === 'Semua' || e.status === selectedStatus;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (e.judul && e.judul.toLowerCase().includes(q)) ||
        (e.lokasi && e.lokasi.toLowerCase().includes(q)) ||
        (e.pic_nama && e.pic_nama.toLowerCase().includes(q)) ||
        (e.deskripsi && e.deskripsi.toLowerCase().includes(q));

      return matchKategori && matchStatus && matchSearch;
    });
  }, [events, selectedKategori, selectedStatus, searchTerm]);

  // Calendar Grid Days for Month View
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Senin
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Minggu
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Week Days for Week View
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // Get Events For A Specific Day
  const getEventsForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return filteredEvents.filter((e) => {
      if (e.tanggal_mulai === dateStr) return true;
      if (e.tanggal_selesai && e.tanggal_mulai <= dateStr && e.tanggal_selesai >= dateStr) {
        return true;
      }
      return false;
    });
  };

  // Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const curMonth = currentDate.getMonth();
    const curYear = currentDate.getFullYear();
    const todayStr = format(now, 'yyyy-MM-dd');

    const inMonth = events.filter((e) => {
      if (!e.tanggal_mulai) return false;
      const d = new Date(e.tanggal_mulai);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    });

    const hariIni = events.filter(
      (e) =>
        e.tanggal_mulai === todayStr ||
        (e.tanggal_selesai && e.tanggal_mulai <= todayStr && e.tanggal_selesai >= todayStr)
    );

    const aktif = events.filter((e) => e.status === 'Berlangsung' || e.status === 'Rencana');
    const selesai = events.filter((e) => e.status === 'Selesai');

    return {
      totalBulan: inMonth.length,
      hariIni: hariIni.length,
      aktif: aktif.length,
      selesai: selesai.length,
    };
  }, [events, currentDate]);

  // Helper kelola staff yang terlibat
  const toggleStaffTerlibat = (staff) => {
    setFormData((prev) => {
      const list = prev.staff_terlibat || [];
      const exists = list.some((st) => (typeof st === 'string' ? st === staff.name : st.id === staff.id));
      if (exists) {
        return {
          ...prev,
          staff_terlibat: list.filter((st) => (typeof st === 'string' ? st !== staff.name : st.id !== staff.id)),
        };
      } else {
        return {
          ...prev,
          staff_terlibat: [
            ...list,
            {
              id: staff.id,
              name: staff.name,
              role: staff.role,
            },
          ],
        };
      }
    });
  };

  const handleSelectAllStaff = () => {
    setFormData((prev) => ({
      ...prev,
      staff_terlibat: staffList.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
      })),
    }));
  };

  const handleClearStaff = () => {
    setFormData((prev) => ({
      ...prev,
      staff_terlibat: [],
    }));
  };

  // Open Form Modal for Create
  const handleOpenCreateModal = (prefillDate = null) => {
    const targetDate = prefillDate ? format(prefillDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    const defaultPic = currentUser?.name ? `${currentUser.name} (${currentUser.role || 'Staff'})` : '';
    setFormData({
      ...initialForm,
      tanggal_mulai: targetDate,
      tanggal_selesai: targetDate,
      pic_id: currentUser?.id || '',
      pic_nama: defaultPic,
      staff_terlibat: [],
    });
    setIsEditing(false);
    setSelectedEvent(null);
    setIsFormModalOpen(true);
  };

  // Open Form Modal for Edit
  const handleOpenEditModal = (event) => {
    setFormData({
      judul: event.judul || '',
      kategori: event.kategori || 'Operasional',
      tanggal_mulai: event.tanggal_mulai || format(new Date(), 'yyyy-MM-dd'),
      tanggal_selesai: event.tanggal_selesai || event.tanggal_mulai || format(new Date(), 'yyyy-MM-dd'),
      jam_mulai: event.jam_mulai || '08:00',
      jam_selesai: event.jam_selesai || '09:00',
      seharian: !!event.seharian,
      lokasi: event.lokasi || '',
      pic_id: event.pic_id || '',
      pic_nama: event.pic_nama || '',
      staff_terlibat: Array.isArray(event.staff_terlibat) ? event.staff_terlibat : [],
      prioritas: event.prioritas || 'Biasa',
      status: event.status || 'Rencana',
      deskripsi: event.deskripsi || '',
    });
    setSelectedEvent(event);
    setIsEditing(true);
    setIsDetailModalOpen(false);
    setIsFormModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetailModal = (event) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  // Open Day Events Modal
  const handleOpenDayModal = (day) => {
    const dayEvts = getEventsForDay(day);
    setSelectedDayEvents({ date: day, events: dayEvts });
    setIsDayModalOpen(true);
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.judul.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Judul Wajib Diisi',
        text: 'Silakan masukkan judul kegiatan terlebih dahulu.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && selectedEvent) {
        await kalenderService.update(selectedEvent.id, formData, currentUser);
        Swal.fire({
          icon: 'success',
          title: 'Kegiatan Diperbarui',
          text: `Kegiatan "${formData.judul}" berhasil diupdate.`,
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        await kalenderService.create(formData, currentUser);
        Swal.fire({
          icon: 'success',
          title: 'Kegiatan Dijadwalkan',
          text: `Kegiatan "${formData.judul}" berhasil ditambahkan ke kalender.`,
          timer: 1800,
          showConfirmButton: false,
        });
      }
      setIsFormModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error('Error saving event:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan saat menyimpan data.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (event) => {
    const result = await Swal.fire({
      title: 'Hapus Kegiatan?',
      html: `Apakah Anda yakin ingin menghapus jadwal <b>"${event.judul}"</b>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#D31225',
    });

    if (result.isConfirmed) {
      try {
        await kalenderService.delete(event.id);
        setIsDetailModalOpen(false);
        setIsDayModalOpen(false);
        fetchEvents();
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Dihapus',
          text: 'Kegiatan telah dihapus dari kalender.',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menghapus',
          text: err.message,
        });
      }
    }
  };

  // Quick Status Toggle (e.g., Mark as Selesai)
  const handleToggleStatus = async (event, newStatus) => {
    try {
      await kalenderService.update(event.id, { status: newStatus }, currentUser);
      setSelectedEvent((prev) => (prev ? { ...prev, status: newStatus } : null));
      fetchEvents();
      Swal.fire({
        icon: 'success',
        title: `Status Diubah ke ${newStatus}`,
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengubah Status',
        text: err.message,
      });
    }
  };

  // Format Time Label
  const formatTimeLabel = (event) => {
    if (event.seharian) return 'Seharian';
    if (event.jam_mulai && event.jam_selesai) {
      return `${event.jam_mulai} - ${event.jam_selesai}`;
    }
    if (event.jam_mulai) return `${event.jam_mulai} WIB`;
    return 'Waktu Fleksibel';
  };

  const getPriorityBadge = (prioritas) => {
    switch (prioritas) {
      case 'Mendesak':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">Mendesak</span>;
      case 'Penting':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Penting</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">Biasa</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Selesai':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 size={12} /> Selesai</span>;
      case 'Berlangsung':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200"><Clock size={12} className="animate-spin" /> Berlangsung</span>;
      case 'Dibatalkan':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200"><X size={12} /> Dibatalkan</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200"><CalendarIcon size={12} /> Rencana</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
              <CalendarDays size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
                Kalender Kegiatan JNE
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <Sparkles size={11} /> Operasional & Event
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Kelola jadwal pengiriman, rapat, briefing, maintenance armada, serta agenda kantor JNE.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => handleOpenCreateModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:from-blue-800 hover:to-blue-700 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={18} />
          <span>Tambah Kegiatan</span>
        </button>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="!p-4 border-slate-200/80 hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Bulan Ini</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CalendarIcon size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-800">{metrics.totalBulan}</div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Kegiatan dijadwalkan</p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="!p-4 border-slate-200/80 hover:border-emerald-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Hari Ini</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-600">{metrics.hariIni}</div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Agenda aktif hari ini</p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="!p-4 border-slate-200/80 hover:border-amber-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Rencana & Berlangsung</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-amber-600">{metrics.aktif}</div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Perlu perhatian / jalan</p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="!p-4 border-slate-200/80 hover:border-purple-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Selesai</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-purple-600">{metrics.selesai}</div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Tuntas terlaksana</p>
          </Card>
        </motion.div>
      </div>

      {/* Main Calendar Navigation & Filters Card */}
      <Card className="!p-5 border-slate-200/80 shadow-sm space-y-4">
        {/* Navigation Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          {/* Month / Year & Prev/Next */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={handlePrev}
                title="Sebelumnya"
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 shadow-sm transition-all cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition-all cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                onClick={handleNext}
                title="Berikutnya"
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 shadow-sm transition-all cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight capitalize pl-2">
              {viewMode === 'minggu'
                ? `Minggu ke-${format(currentDate, 'w')} • ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM', { locale: idLocale })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: idLocale })}`
                : format(currentDate, 'MMMM yyyy', { locale: idLocale })}
            </div>
          </div>

          {/* View Mode Toggle Tabs */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="inline-flex p-1 bg-slate-100/90 rounded-xl text-xs font-bold">
              <button
                onClick={() => setViewMode('bulan')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'bulan'
                    ? 'bg-white text-blue-600 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon size={14} />
                <span>Bulan</span>
              </button>
              <button
                onClick={() => setViewMode('minggu')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'minggu'
                    ? 'bg-white text-blue-600 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays size={14} />
                <span>Minggu</span>
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'agenda'
                    ? 'bg-white text-blue-600 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter size={14} />
                <span>Agenda</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar: Category Pills & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {['Semua', ...Object.keys(KATEGORI_CONFIG)].map((kat) => {
              const isSelected = selectedKategori === kat;
              const cfg = KATEGORI_CONFIG[kat];
              return (
                <button
                  key={kat}
                  onClick={() => setSelectedKategori(kat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cfg && <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : cfg.dot}`} />}
                  <span>{kat}</span>
                </button>
              );
            })}
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kegiatan / lokasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Semua">Semua Status</option>
              <option value="Rencana">Rencana</option>
              <option value="Berlangsung">Berlangsung</option>
              <option value="Selesai">Selesai</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center py-4 text-xs text-blue-600 font-semibold gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Memuat jadwal kegiatan...</span>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 1: MONTH CALENDAR GRID */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'bulan' && (
          <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-xs">
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-600 py-2.5">
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((d, i) => (
                <div key={d} className={i >= 5 ? 'text-rose-500' : ''}>
                  <span className="hidden sm:inline">{d}</span>
                  <span className="sm:hidden">{d.slice(0, 3)}</span>
                </div>
              ))}
            </div>

            {/* Days Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100/50">
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isDayToday = isToday(day);

                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenDayModal(day)}
                    className={`min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 bg-white transition-all group flex flex-col justify-between cursor-pointer relative hover:bg-blue-50/30 ${
                      !isCurrentMonth ? 'bg-slate-50/70 text-slate-400' : ''
                    } ${isDayToday ? 'ring-2 ring-blue-500/80 ring-inset bg-blue-50/20' : ''}`}
                  >
                    {/* Top Row: Date & Add Icon */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                          isDayToday
                            ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                            : isCurrentMonth
                            ? 'text-slate-700 group-hover:text-blue-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>

                      {/* Quick Add on Cell Hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCreateModal(day);
                        }}
                        title="Tambah kegiatan di tanggal ini"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100/70 rounded-md transition-all"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* Events List in Day Cell */}
                    <div className="space-y-1 flex-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt) => {
                        const cfg = KATEGORI_CONFIG[evt.kategori] || DEFAULT_CONFIG;
                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetailModal(evt);
                            }}
                            title={`${evt.judul} (${evt.jam_mulai || 'Seharian'})`}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border transition-all flex items-center gap-1 shadow-2xs hover:scale-[1.02] cursor-pointer ${cfg.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                            <span className="truncate">{evt.judul}</span>
                          </div>
                        );
                      })}

                      {/* More items indicator */}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] font-bold text-blue-600 hover:text-blue-700 px-1 pt-0.5 truncate flex items-center gap-0.5">
                          +{dayEvents.length - 2} kegiatan lagi
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 2: WEEK CALENDAR */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'minggu' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isDayToday = isToday(day);

              return (
                <div
                  key={idx}
                  className={`border rounded-2xl p-3 flex flex-col transition-all bg-white shadow-xs ${
                    isDayToday ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
                    <div>
                      <div className="text-xs font-bold text-slate-500">
                        {format(day, 'EEEE', { locale: idLocale })}
                      </div>
                      <div
                        className={`text-lg font-black ${
                          isDayToday ? 'text-blue-600' : 'text-slate-800'
                        }`}
                      >
                        {format(day, 'd MMM')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenCreateModal(day)}
                      title="Tambah kegiatan"
                      className="p-1 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-500 transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[360px]">
                    {dayEvents.length === 0 ? (
                      <div className="h-28 flex flex-col items-center justify-center text-center text-slate-300 text-xs italic">
                        Tidak ada agenda
                      </div>
                    ) : (
                      dayEvents.map((evt) => {
                        const cfg = KATEGORI_CONFIG[evt.kategori] || DEFAULT_CONFIG;
                        return (
                          <div
                            key={evt.id}
                            onClick={() => handleOpenDetailModal(evt)}
                            className={`p-2 rounded-xl border transition-all hover:shadow-sm cursor-pointer ${cfg.bg}`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {formatTimeLabel(evt)}
                              </span>
                              {evt.status === 'Selesai' && (
                                <Check size={12} className="text-emerald-600" />
                              )}
                            </div>
                            <div className="font-bold text-xs text-slate-900 leading-tight mb-1">
                              {evt.judul}
                            </div>
                            {evt.lokasi && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                                <MapPin size={10} />
                                <span className="truncate">{evt.lokasi}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 3: AGENDA / TIMELINE LIST */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'agenda' && (
          <div className="space-y-3 pt-1">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CalendarIcon size={36} className="mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-600">Tidak Ada Kegiatan yang Sesuai</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Coba sesuaikan kata kunci pencarian atau filter kategori, atau tambahkan jadwal kegiatan baru.
                </p>
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
                >
                  + Tambah Kegiatan Sekarang
                </button>
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const cfg = KATEGORI_CONFIG[evt.kategori] || DEFAULT_CONFIG;
                return (
                  <motion.div
                    key={evt.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-blue-200 bg-white hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    {/* Left: Date badge & Title */}
                    <div className="flex items-start gap-3.5">
                      {/* Date Block */}
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/80 shrink-0 text-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {evt.tanggal_mulai ? format(new Date(evt.tanggal_mulai), 'MMM', { locale: idLocale }) : '-'}
                        </span>
                        <span className="text-lg font-black leading-none">
                          {evt.tanggal_mulai ? format(new Date(evt.tanggal_mulai), 'dd') : '-'}
                        </span>
                      </div>

                      {/* Info Details */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.bg}`}>
                            {evt.kategori}
                          </span>
                          {getPriorityBadge(evt.prioritas)}
                          {getStatusBadge(evt.status)}
                        </div>

                        <h4
                          onClick={() => handleOpenDetailModal(evt)}
                          className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {evt.judul}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-400" />
                            {formatTimeLabel(evt)}
                          </span>
                          {evt.lokasi && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-slate-400" />
                              {evt.lokasi}
                            </span>
                          )}
                          {evt.pic_nama && (
                            <span className="flex items-center gap-1">
                              <User size={12} className="text-slate-400" />
                              PIC: {evt.pic_nama}
                            </span>
                          )}
                          {evt.staff_terlibat && evt.staff_terlibat.length > 0 && (
                            <span className="flex items-center gap-1 text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-md font-bold text-[10px] border border-blue-100">
                              <Users size={11} />
                              {evt.staff_terlibat.length} Staff Terlibat
                            </span>
                          )}
                        </div>

                        {evt.deskripsi && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-1.5 max-w-2xl">
                            {evt.deskripsi}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Quick Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {evt.status !== 'Selesai' && (
                        <button
                          onClick={() => handleToggleStatus(evt, 'Selesai')}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Tandai Selesai"
                        >
                          <CheckCircle2 size={13} />
                          <span className="hidden sm:inline">Selesai</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenDetailModal(evt)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(evt)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(evt)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </Card>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: DETAIL KEGIATAN */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isDetailModalOpen && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200/90"
            >
              {/* Header Gradient */}
              {(() => {
                const cfg = KATEGORI_CONFIG[selectedEvent.kategori] || DEFAULT_CONFIG;
                return (
                  <div className={`p-6 bg-gradient-to-r ${cfg.gradient} text-white relative`}>
                    <button
                      onClick={() => setIsDetailModalOpen(false)}
                      className="absolute right-4 top-4 p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-white/20 backdrop-blur-md uppercase tracking-wider">
                        {selectedEvent.kategori}
                      </span>
                      {selectedEvent.prioritas === 'Mendesak' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white">
                          Mendesak
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-black leading-snug">{selectedEvent.judul}</h2>
                  </div>
                );
              })()}

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Status bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Status Kegiatan</span>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedEvent.status)}
                    {selectedEvent.status !== 'Selesai' && (
                      <button
                        onClick={() => handleToggleStatus(selectedEvent, 'Selesai')}
                        className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                      >
                        Tandai Selesai
                      </button>
                    )}
                  </div>
                </div>

                {/* Details List */}
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <CalendarIcon size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-800">Tanggal</div>
                      <div className="text-slate-600">
                        {selectedEvent.tanggal_mulai
                          ? format(new Date(selectedEvent.tanggal_mulai), 'EEEE, dd MMMM yyyy', {
                              locale: idLocale,
                            })
                          : '-'}
                        {selectedEvent.tanggal_selesai &&
                          selectedEvent.tanggal_selesai !== selectedEvent.tanggal_mulai && (
                            <span>
                              {' '}
                              s/d{' '}
                              {format(new Date(selectedEvent.tanggal_selesai), 'dd MMMM yyyy', {
                                locale: idLocale,
                              })}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-800">Waktu Pelaksanaan</div>
                      <div className="text-slate-600">{formatTimeLabel(selectedEvent)}</div>
                    </div>
                  </div>

                  {selectedEvent.lokasi && (
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-800">Lokasi / Tempat</div>
                        <div className="text-slate-600">{selectedEvent.lokasi}</div>
                      </div>
                    </div>
                  )}

                  {selectedEvent.pic_nama && (
                    <div className="flex items-start gap-3">
                      <User size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-800">Penanggung Jawab (PIC Utama)</div>
                        <div className="text-slate-600">{selectedEvent.pic_nama}</div>
                      </div>
                    </div>
                  )}

                  {selectedEvent.staff_terlibat && selectedEvent.staff_terlibat.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Users size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold text-slate-800 flex items-center justify-between">
                          <span>PIC / Staff yang Terlibat</span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {selectedEvent.staff_terlibat.length} Orang
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {selectedEvent.staff_terlibat.map((st, idx) => {
                            const name = typeof st === 'string' ? st : st.name;
                            const role = typeof st === 'object' ? st.role : null;
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span>{name}</span>
                                {role && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-200/70 text-blue-800 font-bold">
                                    {role}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedEvent.deskripsi && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="font-bold text-slate-800 mb-1">Deskripsi / Catatan</div>
                      <p className="text-slate-600 text-xs sm:text-sm whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                        {selectedEvent.deskripsi}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleDeleteEvent(selectedEvent)}
                  className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Hapus</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(selectedEvent)}
                    className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={14} />
                    <span>Edit Jadwal</span>
                  </button>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-900 text-xs font-bold transition-all cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: FORM TAMBAH / EDIT KEGIATAN */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-200/90 my-8"
            >
              {/* Form Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-600 text-white">
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">
                      {isEditing ? 'Edit Jadwal Kegiatan' : 'Tambah Kegiatan Baru'}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Atur detail kegiatan operasional dan agenda JNE
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFormModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Judul Kegiatan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Judul Kegiatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Morning Briefing Kurir & Staff Hub"
                    value={formData.judul}
                    onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                  />
                </div>

                {/* Kategori & Prioritas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kategori Kegiatan
                    </label>
                    <select
                      value={formData.kategori}
                      onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {Object.keys(KATEGORI_CONFIG).map((kat) => (
                        <option key={kat} value={kat}>
                          {kat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tingkat Prioritas
                    </label>
                    <select
                      value={formData.prioritas}
                      onChange={(e) => setFormData({ ...formData, prioritas: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Biasa">Biasa</option>
                      <option value="Penting">Penting</option>
                      <option value="Mendesak">Mendesak</option>
                    </select>
                  </div>
                </div>

                {/* Tanggal Mulai & Tanggal Selesai */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Mulai <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.tanggal_mulai}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tanggal_mulai: e.target.value,
                          tanggal_selesai:
                            formData.tanggal_selesai < e.target.value
                              ? e.target.value
                              : formData.tanggal_selesai,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={formData.tanggal_selesai}
                      min={formData.tanggal_mulai}
                      onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Acara Seharian Checkbox */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="seharian"
                    checked={formData.seharian}
                    onChange={(e) => setFormData({ ...formData, seharian: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="seharian" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Acara Seharian (All Day Event)
                  </label>
                </div>

                {/* Jam Mulai & Jam Selesai */}
                {!formData.seharian && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Jam Mulai</label>
                      <input
                        type="time"
                        value={formData.jam_mulai}
                        onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Jam Selesai</label>
                      <input
                        type="time"
                        value={formData.jam_selesai}
                        onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Lokasi & PIC */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lokasi / Tempat
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Gudang Sortir Utama / Zoom"
                      value={formData.lokasi}
                      onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Penanggung Jawab (PIC Utama)
                    </label>
                    <select
                      value={formData.pic_nama}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matched = staffList.find(s => `${s.name} (${s.role})` === val || s.name === val);
                        setFormData({
                          ...formData,
                          pic_nama: val,
                          pic_id: matched ? matched.id : null,
                        });
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">-- Pilih PIC Utama dari Data Staff --</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={`${s.name} (${s.role})`}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                      {formData.pic_nama && !staffList.some(s => `${s.name} (${s.role})` === formData.pic_nama || s.name === formData.pic_nama) && (
                        <option value={formData.pic_nama}>{formData.pic_nama}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* PIC & Tim / Staff yang Terlibat */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users size={16} className="text-blue-600" />
                      <label className="text-xs font-bold text-slate-800">
                        PIC & Staff yang Terlibat
                      </label>
                      {formData.staff_terlibat?.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                          {formData.staff_terlibat.length} Orang Terpilih
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAllStaff}
                        className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={handleClearStaff}
                        className="text-slate-400 hover:text-slate-600 font-medium hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pilih satu atau beberapa staf dari database yang bertugas / terlibat dalam kegiatan ini:
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                    {staffList.length === 0 ? (
                      <div className="text-xs text-slate-400 py-1">Memuat data staff...</div>
                    ) : (
                      staffList.map((s) => {
                        const isSelected = (formData.staff_terlibat || []).some(
                          (st) => (typeof st === 'string' ? st === s.name : st.id === s.id)
                        );
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleStaffTerlibat(s)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 ring-2 ring-blue-500/20'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                                isSelected ? 'bg-white text-blue-600' : 'border border-slate-300 bg-slate-50'
                              }`}
                            >
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span>{s.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                isSelected
                                  ? 'bg-blue-700 text-blue-100'
                                  : 'bg-slate-100 text-slate-500 font-bold'
                              }`}
                            >
                              {s.role}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Kegiatan</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Rencana">Rencana</option>
                    <option value="Berlangsung">Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Dibatalkan">Dibatalkan</option>
                  </select>
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deskripsi / Catatan Tambahan
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan agenda pembahasan, persiapan khusus, atau catatan logistik..."
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                {/* Submit Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Menyimpan...</span>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>{isEditing ? 'Simpan Perubahan' : 'Jadwalkan Kegiatan'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: AGENDA HARIAN (KLIK CELL TANGGAL) */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isDayModalOpen && selectedDayEvents.date && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200/90"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    Agenda Harian
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    {format(selectedDayEvents.date, 'EEEE, dd MMMM yyyy', { locale: idLocale })}
                  </h3>
                </div>
                <button
                  onClick={() => setIsDayModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-2.5 max-h-[380px] overflow-y-auto">
                {selectedDayEvents.events.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Belum ada kegiatan dijadwalkan pada hari ini.
                  </div>
                ) : (
                  selectedDayEvents.events.map((evt) => {
                    const cfg = KATEGORI_CONFIG[evt.kategori] || DEFAULT_CONFIG;
                    return (
                      <div
                        key={evt.id}
                        onClick={() => {
                          setIsDayModalOpen(false);
                          handleOpenDetailModal(evt);
                        }}
                        className={`p-3 rounded-2xl border transition-all hover:scale-[1.01] cursor-pointer ${cfg.bg}`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {formatTimeLabel(evt)}
                          </span>
                          {getStatusBadge(evt.status)}
                        </div>
                        <div className="font-bold text-sm text-slate-900 leading-snug">
                          {evt.judul}
                        </div>
                        {evt.lokasi && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin size={11} /> {evt.lokasi}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setIsDayModalOpen(false);
                    handleOpenCreateModal(selectedDayEvents.date);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Tambah Kegiatan</span>
                </button>
                <button
                  onClick={() => setIsDayModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-all cursor-pointer"
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

export default Kalender;
