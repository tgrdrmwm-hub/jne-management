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
  Users,
  Mail,
  Send,
  BellRing,
  Zap,
  RefreshCw,
  ShieldCheck,
  History
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
import { emailReminderService } from '../../services/emailReminderService';
import { autoReminderService, calculateDiffDays } from '../../services/autoReminderService';
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

  // Email Reminder State (MailerSend)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTargetEvent, setEmailTargetEvent] = useState(null);
  const [additionalEmail, setAdditionalEmail] = useState('');
  const [forceSandbox, setForceSandbox] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Automatic H-3 Reminder State (Background Engine)
  const [isAutoReminderModalOpen, setIsAutoReminderModalOpen] = useState(false);
  const [autoSummary, setAutoSummary] = useState({
    upcomingH3Count: 0,
    sentCount: 0,
    pendingCount: 0,
    pendingH3Events: [],
    totalLogs: 0,
  });
  const [autoLogs, setAutoLogs] = useState({});
  const [isForceChecking, setIsForceChecking] = useState(false);

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
    kirimEmail: true,
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

  // Fetch Auto Reminder Summary & Logs
  const loadAutoReminderData = useCallback(async () => {
    try {
      const summary = await autoReminderService.getStatusSummary();
      setAutoSummary(summary);
      setAutoLogs(autoReminderService.getLogs());
    } catch (e) {
      console.warn('Gagal membaca status pengingat otomatis:', e);
    }
  }, []);

  // Fetch Staff for PIC dropdown & Setup Event Listeners
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
    loadAutoReminderData();

    const handleUpdate = () => {
      fetchEvents();
      loadAutoReminderData();
    };

    const handleH3Sent = (e) => {
      const { event: ev, diffDays } = e.detail || {};
      fetchEvents();
      loadAutoReminderData();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `⚡ Pengingat Otomatis H-${diffDays} Terkirim!`,
        text: `Agenda "${ev?.judul || 'JNE'}" berhasil dikirim otomatis ke PIC & Staf.`,
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      });
    };

    window.addEventListener('kalenderUpdated', handleUpdate);
    window.addEventListener('h3ReminderSent', handleH3Sent);
    return () => {
      window.removeEventListener('kalenderUpdated', handleUpdate);
      window.removeEventListener('h3ReminderSent', handleH3Sent);
    };
  }, [fetchEvents, loadAutoReminderData]);

  // Handler Paksa Periksa & Kirim Pengingat H-3 Seketika
  const handleForceCheckReminders = async () => {
    try {
      setIsForceChecking(true);
      const res = await autoReminderService.checkAndSendH3Reminders({ silent: false });
      await loadAutoReminderData();
      await fetchEvents();
      if (res.sent > 0) {
        Swal.fire({
          icon: 'success',
          title: 'Pengingat H-3 Terkirim Otomatis!',
          html: `<p style="font-size:13px;">Berhasil memeriksa <strong>${res.checked}</strong> agenda dan mengirimkan <strong>${res.sent}</strong> email pengingat H-3 otomatis ke PIC & Staf terkait.</p>`,
          confirmButtonColor: '#004a8d',
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Sistem Siaga & Terkini',
          html: `<p style="font-size:13px;">Tidak ada agenda H-3 yang tertunda. Semua pengingat H-3 telah terkirim atau agenda belum memasuki rentang 3 hari sebelum acara.</p>`,
          confirmButtonColor: '#004a8d',
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Pemeriksaan Gagal',
        text: err.message,
        confirmButtonColor: '#e31e24',
      });
    } finally {
      setIsForceChecking(false);
    }
  };

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

  // Agenda Hari Ini untuk Broadcast Pengingat
  const todayEvents = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return events.filter(e => 
      e.status !== 'Dibatalkan' && (
        e.tanggal_mulai === todayStr || 
        (e.tanggal_selesai && e.tanggal_mulai <= todayStr && e.tanggal_selesai >= todayStr)
      )
    );
  }, [events]);

  // Submit Create or Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.judul.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Judul Wajib Diisi',
        text: 'Silakan masukkan judul kegiatan terlebih dahulu.',
        customClass: { popup: 'rounded-2xl' },
      });
      return;
    }

    try {
      setIsSubmitting(true);
      let savedResult = null;

      if (isEditing && selectedEvent) {
        savedResult = await kalenderService.update(selectedEvent.id, formData, currentUser);
        Swal.fire({
          icon: 'success',
          title: 'Kegiatan Diperbarui',
          text: `Kegiatan "${formData.judul}" berhasil diupdate${formData.kirimEmail ? ' & pengingat email dikirim ke PIC/Staff' : ''}.`,
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: 'rounded-2xl' },
        });
      } else {
        savedResult = await kalenderService.create(formData, currentUser);
        Swal.fire({
          icon: 'success',
          title: 'Kegiatan Dijadwalkan',
          text: `Kegiatan "${formData.judul}" berhasil ditambahkan ke kalender${formData.kirimEmail ? ' & pengingat email dikirim ke PIC/Staff' : ''}.`,
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: 'rounded-2xl' },
        });
      }

      // Kirim email pengingat via MailerSend jika opsi diaktifkan
      if (formData.kirimEmail) {
        emailReminderService.sendEventReminder({
          event: savedResult || formData,
          staffList,
        }).then((res) => {
          if (res.successCount > 0) {
            console.log(`[Email Reminder] Terkirim ke ${res.successCount} penerima`);
          }
        }).catch((err) => {
          console.warn('[Email Reminder] Background error:', err);
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
        customClass: { popup: 'rounded-2xl' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buka Modal Pengingat Email untuk Event Tertentu
  const handleOpenEmailModal = (event) => {
    setEmailTargetEvent(event);
    setAdditionalEmail('');
    setForceSandbox(false);
    setIsEmailModalOpen(true);
  };

  // Eksekusi Kirim Email Pengingat dari Modal
  const handleSendEmailModalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!emailTargetEvent) return;

    try {
      setIsSendingEmail(true);

      const res = await emailReminderService.sendEventReminder({
        event: emailTargetEvent,
        staffList,
        customRecipientEmail: additionalEmail.trim(),
        forceSandboxEmail: forceSandbox ? 'idfxzxz@gmail.com' : null,
      });

      setIsEmailModalOpen(false);

      if (res.successCount > 0) {
        const detailsHtml = `
          <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #334155;">
            <p>Pengingat agenda <strong>${emailTargetEvent.judul}</strong> berhasil dikirim via MailerSend ke <strong>${res.successCount} penerima</strong>:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              ${res.sentList.map(s => `<li><strong>${s.name}</strong> &lt;${s.email}&gt;</li>`).join('')}
            </ul>
            ${res.sandboxRerouted ? `
              <div style="margin-top: 10px; padding: 10px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 11px; color: #1e40af;">
                ℹ️ <strong>Mode Sandbox MailerSend:</strong> Karena domain masih dalam mode trial, email dialihkan ke email pemilik akun terverifikasi (<code>idfxzxz@gmail.com</code>).
              </div>
            ` : ''}
          </div>
        `;

        Swal.fire({
          icon: 'success',
          title: 'Email Pengingat Terkirim!',
          html: detailsHtml,
          confirmButtonColor: 'var(--color-jne-blue)',
          customClass: { popup: 'rounded-2xl' },
        });
      } else {
        const errors = res.failedList.map(f => `${f.name}: ${f.error}`).join('<br>');
        Swal.fire({
          icon: 'error',
          title: 'Pengiriman Gagal',
          html: `<p style="font-size:13px;">Tidak ada email yang berhasil terkirim:<br>${errors}</p>`,
          confirmButtonColor: '#e31e24',
          customClass: { popup: 'rounded-2xl' },
        });
      }
    } catch (err) {
      console.error('Error sending reminder email:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengirim Email',
        text: err.message || 'Terjadi kesalahan pada layanan MailerSend.',
        confirmButtonColor: '#e31e24',
        customClass: { popup: 'rounded-2xl' },
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Buka Modal Broadcast Pengingat Hari Ini
  const handleOpenBroadcastModal = () => {
    if (todayEvents.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Tidak Ada Agenda Hari Ini',
        text: 'Tidak ada kegiatan atau rapat yang terjadwal untuk hari ini.',
        confirmButtonColor: 'var(--color-jne-blue)',
        customClass: { popup: 'rounded-2xl' },
      });
      return;
    }
    setIsBroadcastModalOpen(true);
  };

  // Kirim Broadcast Pengingat ke Semua Agenda Hari Ini
  const handleSendAllTodayReminders = async () => {
    try {
      setIsSendingEmail(true);
      let totalSuccess = 0;
      const sentEvents = [];

      for (const ev of todayEvents) {
        const res = await emailReminderService.sendEventReminder({
          event: ev,
          staffList,
        });
        if (res.successCount > 0) {
          totalSuccess += res.successCount;
          sentEvents.push(ev.judul);
        }
      }

      setIsBroadcastModalOpen(false);

      Swal.fire({
        icon: 'success',
        title: 'Broadcast Pengingat Selesai',
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #334155;">
            <p>Berhasil mengirim total <strong>${totalSuccess} notifikasi email</strong> untuk agenda:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              ${sentEvents.map(j => `<li>${j}</li>`).join('')}
            </ul>
          </div>
        `,
        confirmButtonColor: 'var(--color-jne-blue)',
        customClass: { popup: 'rounded-2xl' },
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengirim Broadcast',
        text: err.message || 'Terjadi kesalahan saat mengirim pengingat.',
        confirmButtonColor: '#e31e24',
        customClass: { popup: 'rounded-2xl' },
      });
    } finally {
      setIsSendingEmail(false);
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

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Indicator: Pengingat Otomatis H-3 */}
          <button
            onClick={() => setIsAutoReminderModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200 text-emerald-800 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer group"
            title="Klik untuk melihat status & riwayat pengingat otomatis H-3"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap size={15} className="text-emerald-600 fill-emerald-500" />
              <span>Otomatis H-3 Aktif</span>
            </span>
            <span className="text-[10px] bg-emerald-200/90 text-emerald-900 px-1.5 py-0.5 rounded-full font-extrabold group-hover:bg-emerald-300">
              {autoSummary.sentCount} Terkirim
            </span>
          </button>

          <button
            onClick={handleOpenBroadcastModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer"
            title="Kirim pengingat email ke PIC untuk agenda hari ini"
          >
            <BellRing size={16} className="text-blue-600" />
            <span className="hidden sm:inline">Kirim Pengingat Hari Ini</span>
            <span className="sm:hidden">Hari Ini ({todayEvents.length})</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:from-blue-800 hover:to-blue-700 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Tambah Kegiatan</span>
          </button>
        </div>
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
                        const isSent = evt.reminder_h3_sent || autoReminderService.isSent(evt.id, evt.tanggal_mulai);
                        const diffDays = calculateDiffDays(evt.tanggal_mulai);
                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetailModal(evt);
                            }}
                            title={`${evt.judul} (${evt.jam_mulai || 'Seharian'})${isSent ? ' - Pengingat H-3 Terkirim Otomatis' : diffDays === 3 ? ' - H-3 Acara' : ''}`}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border transition-all flex items-center gap-1 shadow-2xs hover:scale-[1.02] cursor-pointer ${cfg.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                            <span className="truncate flex-1">{evt.judul}</span>
                            {isSent ? (
                              <span className="text-[9px] font-extrabold text-emerald-600 shrink-0" title="Pengingat H-3 Terkirim Otomatis">
                                ✓ H-3
                              </span>
                            ) : diffDays === 3 ? (
                              <span className="text-[9px] font-extrabold text-rose-600 shrink-0 animate-pulse" title="H-3 Acara">
                                🔔 H-3
                              </span>
                            ) : null}
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
                        const isSent = evt.reminder_h3_sent || autoReminderService.isSent(evt.id, evt.tanggal_mulai);
                        const diffDays = calculateDiffDays(evt.tanggal_mulai);
                        return (
                          <div
                            key={evt.id}
                            onClick={() => handleOpenDetailModal(evt)}
                            className={`p-2.5 rounded-xl border transition-all hover:shadow-sm cursor-pointer ${cfg.bg}`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {formatTimeLabel(evt)}
                              </span>
                              <div className="flex items-center gap-1">
                                {isSent ? (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200" title="Pengingat H-3 Terkirim Otomatis">
                                    ✓ H-3
                                  </span>
                                ) : diffDays === 3 ? (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200 animate-pulse" title="H-3 Acara">
                                    🔔 H-3
                                  </span>
                                ) : null}
                                {evt.status === 'Selesai' && (
                                  <Check size={12} className="text-emerald-600" />
                                )}
                              </div>
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
                          {(() => {
                            const isSent = evt.reminder_h3_sent || autoReminderService.isSent(evt.id, evt.tanggal_mulai);
                            const diffDays = calculateDiffDays(evt.tanggal_mulai);
                            if (isSent) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check size={11} className="text-emerald-600" />
                                  <span>H-3 Terkirim Otomatis</span>
                                </span>
                              );
                            }
                            if (diffDays === 3) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                                  <BellRing size={11} className="text-rose-600" />
                                  <span>H-3 Acara</span>
                                </span>
                              );
                            }
                            return null;
                          })()}
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

                  {/* Status Pengingat Otomatis H-3 */}
                  {(() => {
                    const diffDays = calculateDiffDays(selectedEvent.tanggal_mulai);
                    const isSent = selectedEvent.reminder_h3_sent || autoReminderService.isSent(selectedEvent.id, selectedEvent.tanggal_mulai);

                    if (isSent) {
                      return (
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/90 flex items-start gap-3 shadow-2xs">
                          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                            <CheckCircle2 size={18} />
                          </div>
                          <div className="flex-1 text-xs">
                            <div className="font-bold text-emerald-900 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <span>Pengingat H-3 Terkirim Otomatis</span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                                  Terkirim
                                </span>
                              </span>
                              <span className="text-[10px] text-emerald-700 font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                                Otomatis
                              </span>
                            </div>
                            <p className="text-emerald-800 mt-1 leading-relaxed">
                              Email pengingat agenda ini telah berhasil dikirimkan secara otomatis oleh sistem ke PIC dan seluruh staf yang terlibat tanpa perlu klik manual.
                            </p>
                            {selectedEvent.reminder_h3_sent_at && (
                              <p className="text-[11px] text-emerald-700 mt-1.5 font-semibold">
                                Waktu Pengiriman: {new Date(selectedEvent.reminder_h3_sent_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} WIB
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (diffDays !== null && diffDays >= 0 && diffDays <= 3) {
                      return (
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 flex items-start gap-3 shadow-2xs">
                          <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                            <Zap size={18} className="fill-amber-500" />
                          </div>
                          <div className="flex-1 text-xs">
                            <div className="font-bold text-amber-900 flex items-center justify-between">
                              <span>Dalam Antrean Pengingat Otomatis H-3</span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                                {diffDays === 0 ? 'Hari Ini' : `H-${diffDays}`}
                              </span>
                            </div>
                            <p className="text-amber-800 mt-1 leading-relaxed">
                              Agenda ini berada dalam rentang H-3 dan sedang diproses oleh mesin otomatis untuk dikirimkan ke PIC & tim operasional.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    if (diffDays !== null && diffDays > 3) {
                      return (
                        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/90 flex items-start gap-3 shadow-2xs">
                          <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                            <Clock size={18} />
                          </div>
                          <div className="flex-1 text-xs">
                            <div className="font-bold text-blue-900 flex items-center justify-between">
                              <span>Pengingat H-3 Terjadwal Otomatis</span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                                {diffDays - 3} Hari Lagi Menuju H-3
                              </span>
                            </div>
                            <p className="text-blue-800 mt-1 leading-relaxed">
                              Sistem otomatis akan mengirimkan email notifikasi ke PIC & staf yang terlibat saat memasuki H-3 acara (3 hari sebelum kegiatan dimulai).
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })()}
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

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenEmailModal(selectedEvent)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Mail size={14} />
                    <span>Kirim Pengingat Email</span>
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(selectedEvent)}
                    className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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

                {/* Notifikasi Email Switch (MailerSend) */}
                <div className="p-3 bg-blue-50/80 border border-blue-200/90 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-600 text-white rounded-lg shadow-2xs">
                      <Mail size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Kirim Notifikasi Email Pengingat</p>
                      <p className="text-[11px] text-slate-500">Kirim email pengingat via MailerSend ke PIC & staff setelah disimpan</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.kirimEmail}
                      onChange={(e) => setFormData({ ...formData, kirimEmail: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
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
      {/* ---------------------------------------------------- */}
      {/* MODAL 4: KIRIM PENGINGAT EMAIL (MAILERSEND) */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isEmailModalOpen && emailTargetEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200/90"
            >
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-[#0a1628] via-[#0F3B73] to-[#1A5499] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-white border border-white/20">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black leading-tight">Kirim Pengingat Email</h3>
                    <p className="text-xs text-blue-200/80 mt-0.5">Notifikasi via MailerSend API</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSendEmailModalSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Event Summary Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      {emailTargetEvent.kategori || 'Operasional'}
                    </span>
                    {emailTargetEvent.prioritas === 'Mendesak' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                        Prioritas Mendesak
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">{emailTargetEvent.judul}</h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon size={13} className="text-blue-600 shrink-0" />
                      <span>{emailTargetEvent.tanggal_mulai}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-blue-600 shrink-0" />
                      <span>{formatTimeLabel(emailTargetEvent)}</span>
                    </div>
                    {emailTargetEvent.lokasi && (
                      <div className="col-span-2 flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-blue-600 shrink-0" />
                        <span className="truncate">{emailTargetEvent.lokasi}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Daftar Penerima */}
                {(() => {
                  const recipients = emailReminderService.resolveRecipients({
                    event: emailTargetEvent,
                    staffList,
                    customEmail: additionalEmail,
                  });

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Users size={14} className="text-blue-600" />
                          <span>Penerima Notifikasi ({recipients.length} Orang)</span>
                        </label>
                      </div>

                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {recipients.length === 0 ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                            Belum ada email staf terdeteksi. Sistem akan mengarahkan salinan ke email terverifikasi akun.
                          </div>
                        ) : (
                          recipients.map((rc, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-all"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  {rc.name?.charAt(0) || 'U'}
                                </div>
                                <div className="truncate">
                                  <p className="font-bold text-slate-800 truncate">{rc.name}</p>
                                  <p className="text-[11px] text-slate-500 font-mono truncate">{rc.email}</p>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                rc.isPic 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : rc.isCustom 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {rc.isPic ? 'PIC Utama' : rc.isCustom ? 'Tambahan' : 'Staff Terlibat'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Input Email Tambahan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tambah Email Penerima Lain (Opsional)
                  </label>
                  <input
                    type="email"
                    placeholder="misal: supervisor@umaratax.com atau email pribadi"
                    value={additionalEmail}
                    onChange={(e) => setAdditionalEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Kirim salinan pengingat ke alamat email spesifik di luar daftar PIC/Staff.
                  </p>
                </div>

                {/* Option Uji Coba Sandbox MailerSend */}
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="forceSandboxCheck"
                    checked={forceSandbox}
                    onChange={(e) => setForceSandbox(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="forceSandboxCheck" className="text-xs text-slate-700 cursor-pointer">
                    <span className="font-bold text-slate-800 block">Kirim langsung ke Email Akun Sandbox (idfxzxz@gmail.com)</span>
                    <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                      Gunakan ini jika akun MailerSend Anda masih dalam masa trial dan belum memverifikasi domain publik.
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEmailModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingEmail ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Mengirim Email...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Kirim Email Pengingat</span>
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
      {/* MODAL 5: BROADCAST PENGINGAT HARI INI */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isBroadcastModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200/90"
            >
              <div className="p-5 bg-gradient-to-r from-[#0a1628] via-[#0F3B73] to-[#1A5499] text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/10 text-white border border-white/20">
                    <BellRing size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black leading-tight">Pengingat Agenda Hari Ini</h3>
                    <p className="text-xs text-blue-200/80 mt-0.5">{todayEvents.length} Agenda dijadwalkan</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                <p className="text-xs text-slate-600">
                  Berikut adalah agenda yang berlangsung hari ini. Anda dapat mengirim notifikasi email pengingat langsung ke seluruh PIC:
                </p>

                <div className="space-y-2">
                  {todayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                          {ev.kategori || 'Operasional'}
                        </span>
                        <span className="font-semibold text-slate-500 flex items-center gap-1">
                          <Clock size={10} /> {formatTimeLabel(ev)}
                        </span>
                      </div>
                      <p className="font-bold text-xs text-slate-900">{ev.judul}</p>
                      <p className="text-[11px] text-slate-500">
                        PIC: <span className="font-semibold text-slate-700">{ev.pic_nama || 'Staff'}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/50 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleSendAllTodayReminders}
                  disabled={isSendingEmail}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <span>Mengirim...</span>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Kirim ke Semua PIC</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 5: STATUS & LOG PENGINGAT OTOMATIS H-3 */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isAutoReminderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200/90 flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-[#0a1628] via-[#0F3B73] to-[#1A5499] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 backdrop-blur-md text-emerald-400 border border-emerald-400/30">
                    <Zap size={22} className="fill-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black leading-tight">Pengingat Otomatis H-3 Agenda JNE</h3>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                        Otomatis Aktif
                      </span>
                    </div>
                    <p className="text-xs text-blue-200/80 mt-0.5">
                      Pengiriman email pengingat H-3 bekerja mandiri tanpa perlu tindakan manual
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAutoReminderModalOpen(false)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[11px] font-semibold text-emerald-700 block">Terkirim Otomatis</span>
                    <span className="text-xl font-black text-emerald-900 mt-1 block">
                      {autoSummary.sentCount} Agenda
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">H-3 berhasil dikirim</span>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-[11px] font-semibold text-blue-700 block">Rentang H-3</span>
                    <span className="text-xl font-black text-blue-900 mt-1 block">
                      {autoSummary.upcomingH3Count} Agenda
                    </span>
                    <span className="text-[10px] text-blue-600 font-medium">Jadwal 0 s/d 3 hari ke depan</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-700 block">Status Mesin</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                      </span>
                      <span className="text-sm font-black text-slate-800">Siaga Latar</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Cek tiap 10 menit & saat update</span>
                  </div>
                </div>

                {/* Force Trigger Card */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-blue-600" />
                      <span>Sinkronisasi Cepat Pengingat</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Sistem berjalan otomatis di latar belakang. Anda juga dapat memicu pengecekan manual sekarang.
                    </p>
                  </div>
                  <button
                    onClick={handleForceCheckReminders}
                    disabled={isForceChecking}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw size={13} className={isForceChecking ? 'animate-spin' : ''} />
                    <span>{isForceChecking ? 'Memeriksa...' : 'Cek & Kirim Sekarang'}</span>
                  </button>
                </div>

                {/* Mekanisme Penjelasan */}
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2">
                  <h4 className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles size={13} className="text-blue-600" />
                    <span>Prinsip Kerja Otomatis H-3</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-1">
                    <div className="bg-white p-2.5 rounded-lg border border-blue-200/60 shadow-2xs">
                      <div className="font-bold text-blue-900 mb-0.5">1. Hitung Selisih Hari</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Mesin menghitung tanggal kegiatan terhadap hari ini secara otomatis.
                      </p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-blue-200/60 shadow-2xs">
                      <div className="font-bold text-blue-900 mb-0.5">2. Kirim Otomatis H-3</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Saat mencapai H-3 acara, email dikirimkan langsung ke PIC & Staf via MailerSend.
                      </p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-blue-200/60 shadow-2xs">
                      <div className="font-bold text-blue-900 mb-0.5">3. Bebas Klik Manual</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Status terkirim disimpan di sistem, menghindari duplikasi dan tanpa perlu klik manual.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Riwayat Log Pengiriman Otomatis */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <History size={14} className="text-slate-500" />
                      <span>Riwayat Pengingat Otomatis Terbaru ({Object.keys(autoLogs).length})</span>
                    </h4>
                  </div>

                  {Object.keys(autoLogs).length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Zap size={24} className="mx-auto text-slate-300 mb-1" />
                      <p className="text-xs font-bold text-slate-600">Belum Ada Pengingat Otomatis yang Terkirim</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-md mx-auto">
                        Ketika agenda kalender memasuki jadwal H-3 acara, pengingat akan otomatis dikirimkan ke PIC & staf dan tercatat di sini.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {Object.entries(autoLogs)
                        .reverse()
                        .map(([key, item]) => (
                          <div
                            key={key}
                            className="p-3 bg-white border border-slate-200/80 rounded-xl hover:border-emerald-200 transition-all text-xs space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900 text-xs">
                                {item.eventTitle || 'Agenda Kegiatan'}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Check size={10} className="text-emerald-600" />
                                {item.daysLeft === 0 ? 'Hari Ini' : `H-${item.daysLeft}`} Otomatis
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                              <span>📅 Tanggal: <strong className="text-slate-700">{item.eventDate}</strong></span>
                              <span>⏰ Terkirim: <strong className="text-slate-700">{new Date(item.sentAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB</strong></span>
                              <span>✉️ <strong className="text-slate-700">{item.successCount} penerima</strong></span>
                              {item.sandboxRerouted && (
                                <span className="text-blue-600 font-semibold">[Sandbox Rerouted]</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Mesin pengingat latar belakang aktif 24/7 di aplikasi JNE</span>
                </div>
                <button
                  onClick={() => setIsAutoReminderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer"
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
