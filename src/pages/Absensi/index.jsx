import { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { absensiService } from '../../services/absensiService';
import { staffService } from '../../services/staffService';
import { poinService } from '../../services/poinService';
import { Download, FileText, Clock, LogIn, LogOut, Search, UserCheck, PlusCircle, Trash2, Sun, Sunset } from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

const StatusBadge = ({ status }) => {
  const styles = {
    'Hadir': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Terlambat': 'bg-amber-50 text-amber-700 border-amber-200',
    'Sakit': 'bg-blue-50 text-blue-700 border-blue-200',
    'Izin': 'bg-purple-50 text-purple-700 border-purple-200',
    'Alpha': 'bg-red-50 text-red-700 border-red-200',
    'Cuti': 'bg-teal-50 text-teal-700 border-teal-200',
  };
  return (
    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {status}
    </span>
  );
};

const ShiftBadge = ({ shift }) => {
  const isSiang = (shift || '').toLowerCase().includes('siang');
  if (isSiang) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border bg-blue-50 text-blue-800 border-blue-200">
        <Sunset size={13} className="text-blue-600 shrink-0" />
        <span>Shift Siang</span>
        <span className="text-[10px] text-blue-600 font-mono font-medium">(13:00 - 22:00)</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border bg-amber-50 text-amber-800 border-amber-200">
      <Sun size={13} className="text-amber-600 shrink-0" />
      <span>Shift Pagi</span>
      <span className="text-[10px] text-amber-600 font-mono font-medium">(08:00 - 17:00)</span>
    </span>
  );
};

const Absensi = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('Semua'); // 'Semua' | 'Pagi' | 'Siang'
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Loading states pencegah double-click
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);

  // State shift aktif untuk Clock In (default dideteksi dari jam sekarang)
  const [selectedShiftForClockIn, setSelectedShiftForClockIn] = useState(() => {
    return new Date().getHours() >= 12 ? 'Siang' : 'Pagi';
  });
  
  // Update jam real-time
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await absensiService.getAll();
      setData(result);
    } catch (error) {
      console.error('Error fetching presensi:', error);
      Swal.fire({ title: 'Error', text: 'Gagal mengambil data presensi', icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = 
      item.nama?.toLowerCase().includes(q) || 
      item.status?.toLowerCase().includes(q) ||
      item.shift?.toLowerCase().includes(q);

    const matchShift = 
      shiftFilter === 'Semua' || 
      (shiftFilter === 'Pagi' && item.shift?.toLowerCase().includes('pagi')) ||
      (shiftFilter === 'Siang' && item.shift?.toLowerCase().includes('siang'));

    return matchSearch && matchShift;
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Hak akses hapus presensi & export: Owner, Developer, dan Admin (termasuk asri@umaratax.com)
  const canManageAbsensi = useMemo(() => {
    if (!currentUser) return false;
    const cleanUname = (currentUser.username || '').replace(/@umaratax\.com$/i, '').toLowerCase();
    return (
      ['Owner', 'Developer', 'Admin'].includes(currentUser.role) ||
      cleanUname === 'asri' ||
      currentUser.email === 'asri@umaratax.com'
    );
  }, [currentUser]);

  const handleClockIn = async () => {
    // Kunci langsung eksekusi jika sedang berjalan
    if (isClockingIn) return;
    setIsClockingIn(true);

    try {
      const chosenShiftLabel = selectedShiftForClockIn === 'Siang' 
        ? 'Shift Siang (13:00 - 22:00)' 
        : 'Shift Pagi (08:00 - 17:00)';

      const clockInData = await absensiService.clockIn(currentUser.id, chosenShiftLabel);
      
      const isLate = clockInData.status === 'Terlambat';
      const isPoinActive = poinService.isPoinEnabled();
      if (isPoinActive) {
        const poinAmount = isLate ? -5 : 10;
        const poinDesc = isLate 
          ? `Presensi Terlambat [${chosenShiftLabel}] (Clock In)` 
          : `Presensi Tepat Waktu [${chosenShiftLabel}] (Clock In)`;

        // Catat perolehan poin jika skema aktif
        await poinService.addPoin(
          currentUser.id, 
          poinAmount, 
          poinDesc,
          { absensiId: clockInData?.id }
        );
      }

      Swal.fire({
        icon: 'success',
        title: 'Clock In Berhasil',
        html: `
          <div class="text-slate-700 text-sm space-y-2">
            <p>Selamat bekerja, <b>${currentUser.name}</b>!</p>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <p><b>Shift Terpilih:</b> ${chosenShiftLabel}</p>
              <p><b>Jam Masuk:</b> ${clockInData.jamMasuk} WIB</p>
              <p><b>Status Kehadiran:</b> <span class="${isLate ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}">${clockInData.status}</span></p>
            </div>
            ${isPoinActive ? `
              <div>
                ${isLate 
                  ? '<span style="color:#ef4444;font-weight:bold;">-5 Poin</span> (Terlambat)' 
                  : '<span style="color:#f59e0b;font-weight:bold;">+10 Poin</span> (Tepat Waktu)'}
              </div>
            ` : ''}
          </div>
        `,
        timer: 3000,
        showConfirmButton: false,
        customClass: { popup: 'rounded-2xl' }
      });
      fetchData(); // Refresh data
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Clock In Gagal',
        text: error.message,
        customClass: { popup: 'rounded-2xl' }
      });
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    // Kunci langsung eksekusi jika sedang berjalan
    if (isClockingOut) return;
    setIsClockingOut(true);

    try {
      const result = await absensiService.clockOut(currentUser.id);
      Swal.fire({
        icon: 'success',
        title: 'Clock Out Berhasil',
        html: `
          <div class="text-slate-700 text-sm space-y-1">
            <p>Terima kasih atas kerja keras Anda hari ini!</p>
            <p class="text-xs text-slate-500 font-mono">Presensi Keluar: ${result.jamKeluar} WIB • Total: ${result.totalJam} Jam</p>
          </div>
        `,
        timer: 2000,
        showConfirmButton: false,
        customClass: { popup: 'rounded-2xl' }
      });
      fetchData(); // Refresh data
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Clock Out Gagal',
        text: error.message,
        customClass: { popup: 'rounded-2xl' }
      });
    } finally {
      setIsClockingOut(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Presensi Karyawan JNE", 14, 15);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} | Shift Filter: ${shiftFilter}`, 14, 22);
    doc.autoTable({
      head: [['Nama Karyawan', 'Tanggal', 'Shift Kerja', 'Jam Masuk', 'Jam Keluar', 'Total Jam', 'Status']],
      body: filteredData.map(item => [
        item.nama, 
        item.tanggal, 
        item.shift || '-', 
        item.jamMasuk, 
        item.jamKeluar, 
        `${item.totalJam} Jam`, 
        item.status
      ]),
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 74, 141] },
    });
    doc.save("Laporan_Presensi_JNE.pdf");
  };

  const handleExportExcel = () => {
    const exportRows = filteredData.map(item => ({
      'Nama Karyawan': item.nama,
      'Tanggal': item.tanggal,
      'Shift Kerja': item.shift || '-',
      'Jam Masuk': item.jamMasuk,
      'Jam Keluar': item.jamKeluar,
      'Total Jam': `${item.totalJam} Jam`,
      'Status': item.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Presensi");
    XLSX.writeFile(workbook, "Laporan_Presensi_JNE.xlsx");
  };

  const handleManualAbsensi = async () => {
    try {
      Swal.fire({
        title: 'Memuat data...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      const staffList = await staffService.getStaffList();
      Swal.close();

      const optionsHtml = staffList.map(s => `<option value="${s.id}">${s.name} (${s.role || 'Staff'})</option>`).join('');
      const today = new Date().toISOString().split('T')[0];

      const { value: formValues } = await Swal.fire({
        title: 'Presensi Manual',
        html: `
          <div class="space-y-4 text-left font-['Inter',system-ui,sans-serif] text-xs">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Pilih Karyawan</label>
              <select id="swal-karyawan" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-xs">
                <option value="">-- Pilih Karyawan --</option>
                ${optionsHtml}
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Shift Kerja</label>
              <select id="swal-shift" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold">
                <option value="Shift Pagi (08:00 - 17:00)">🌅 Shift Pagi (08:00 - 17:00 WIB)</option>
                <option value="Shift Siang (13:00 - 22:00)">🌇 Shift Siang (13:00 - 22:00 WIB)</option>
              </select>
              <p id="swal-shift-rule" class="text-[10px] text-slate-500 mt-1 font-medium">
                Batas masuk tepat waktu: <b class="text-slate-800">Maksimal 08:00 WIB</b> <span class="text-rose-600 font-bold">(Tanpa Toleransi)</span>
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Tanggal</label>
              <input type="date" id="swal-tanggal" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-xs" value="${today}">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Jam Masuk</label>
                <input type="time" id="swal-masuk" value="08:00" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-xs">
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Jam Keluar</label>
                <input type="time" id="swal-keluar" value="17:00" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-xs">
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Status Kehadiran</label>
              <select id="swal-status" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-xs">
                <option value="Hadir">Hadir</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Sakit">Sakit</option>
                <option value="Izin">Izin</option>
                <option value="Alpha">Alpha</option>
                <option value="Cuti">Cuti</option>
              </select>
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan Presensi',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#004a8d',
        showLoaderOnConfirm: true,
        customClass: { popup: 'rounded-2xl' },
        didOpen: () => {
          // Event otomatis untuk mengisi jam masuk/keluar & update status keterlambatan
          const shiftSelect = document.getElementById('swal-shift');
          const masukInput = document.getElementById('swal-masuk');
          const keluarInput = document.getElementById('swal-keluar');
          const statusSelect = document.getElementById('swal-status');
          const ruleInfo = document.getElementById('swal-shift-rule');

          const updateStatusFromTime = () => {
            if (!statusSelect || !masukInput || !shiftSelect) return;
            const currentStatus = statusSelect.value;
            if (['Hadir', 'Terlambat'].includes(currentStatus)) {
              const isSiang = shiftSelect.value.includes('Siang');
              const cutOff = isSiang ? '13:00' : '08:00';
              if (masukInput.value > cutOff) {
                statusSelect.value = 'Terlambat';
              } else {
                statusSelect.value = 'Hadir';
              }
            }
          };

          if (shiftSelect && masukInput && keluarInput) {
            shiftSelect.addEventListener('change', (e) => {
              const isSiang = e.target.value.includes('Siang');
              if (isSiang) {
                masukInput.value = '13:00';
                keluarInput.value = '22:00';
                if (ruleInfo) ruleInfo.innerHTML = 'Batas masuk tepat waktu: <b class="text-slate-800">Maksimal 13:00 WIB</b> <span class="text-rose-600 font-bold">(Tanpa Toleransi)</span>';
              } else {
                masukInput.value = '08:00';
                keluarInput.value = '17:00';
                if (ruleInfo) ruleInfo.innerHTML = 'Batas masuk tepat waktu: <b class="text-slate-800">Maksimal 08:00 WIB</b> <span class="text-rose-600 font-bold">(Tanpa Toleransi)</span>';
              }
              updateStatusFromTime();
            });

            masukInput.addEventListener('input', updateStatusFromTime);
            masukInput.addEventListener('change', updateStatusFromTime);
          }
        },
        preConfirm: () => {
          const karyawan_id = document.getElementById('swal-karyawan').value;
          const shift = document.getElementById('swal-shift').value;
          const tanggal = document.getElementById('swal-tanggal').value;
          const jam_masuk = document.getElementById('swal-masuk').value;
          const jam_keluar = document.getElementById('swal-keluar').value;
          const status = document.getElementById('swal-status').value;
          
          if (!karyawan_id) {
            Swal.showValidationMessage('Karyawan harus dipilih');
            return false;
          }
          if (!tanggal) {
            Swal.showValidationMessage('Tanggal harus diisi');
            return false;
          }
          if (['Hadir', 'Terlambat'].includes(status) && !jam_masuk) {
            Swal.showValidationMessage('Jam masuk harus diisi untuk status Hadir/Terlambat');
            return false;
          }

          // Validasi ketat tanpa toleransi: > 08:00 (Pagi) atau > 13:00 (Siang) otomatis Terlambat
          let finalStatus = status;
          if (['Hadir', 'Terlambat'].includes(finalStatus) && jam_masuk) {
            const isSiang = shift.includes('Siang');
            const cutOff = isSiang ? '13:00' : '08:00';
            finalStatus = jam_masuk > cutOff ? 'Terlambat' : 'Hadir';
          }

          return { karyawan_id, shift, tanggal, jam_masuk, jam_keluar, status: finalStatus };
        }
      });

      if (formValues) {
        Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const savedAbsensi = await absensiService.addManual(formValues);
        
        let poinText = '';
        if (poinService.isPoinEnabled()) {
          if (formValues.status === 'Hadir') {
            poinText = '<br/><br/><span style="color:#f59e0b;font-weight:bold;">+10 Poin</span> (Hadir)';
            await poinService.addPoin(
              formValues.karyawan_id, 
              10, 
              `Presensi Manual [${formValues.shift}] (Hadir)`,
              { absensiId: savedAbsensi?.id }
            );
          }
          else if (formValues.status === 'Terlambat') {
            poinText = '<br/><br/><span style="color:#ef4444;font-weight:bold;">-5 Poin</span> (Terlambat)';
            await poinService.addPoin(
              formValues.karyawan_id, 
              -5, 
              `Presensi Manual [${formValues.shift}] (Terlambat)`,
              { absensiId: savedAbsensi?.id }
            );
          }
        }

        Swal.fire({ 
          icon: 'success', 
          title: 'Berhasil', 
          html: `Presensi manual berhasil disimpan untuk <b>${formValues.shift}</b>${poinText}`, 
          timer: 2000, 
          showConfirmButton: false, 
          customClass: { popup: 'rounded-2xl' } 
        });
        fetchData();
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, customClass: { popup: 'rounded-2xl' } });
    }
  };

  const handleDelete = (id) => {
    if (!canManageAbsensi) {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: 'Hanya Admin, Owner, dan Developer yang berhak menghapus data presensi.',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    Swal.fire({
      title: 'Hapus Data Presensi?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31e24',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      showLoaderOnConfirm: true,
      customClass: { popup: 'rounded-2xl' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await absensiService.deleteAbsensi(id, currentUser?.name || currentUser?.username || 'Admin');
          Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Data presensi berhasil dihapus.', customClass: { popup: 'rounded-2xl' } });
          fetchData(); // Refresh table
        } catch (error) {
          Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, customClass: { popup: 'rounded-2xl' } });
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Clock Banner */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-500/20 text-white">
              <UserCheck size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Presensi & Jam Kerja</h1>
              <p className="text-slate-500 text-xs">Pencatatan kehadiran 2 shift kerja: Shift Pagi (08:00 - 17:00) & Shift Siang (13:00 - 22:00)</p>
            </div>
          </div>
        </motion.div>

        {/* Tactical Clock & Shift Selector Widget */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }} className="w-full lg:w-auto">
          <Card className="!p-0 overflow-hidden border border-slate-200/90 bg-white shadow-xs">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
              {/* Jam Digital Real-time */}
              <div className="text-center sm:text-left">
                <p className="text-[11px] font-bold tracking-wider uppercase text-slate-500 mb-0.5">
                  {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
                  {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                  <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">WIB</span>
                </div>
              </div>

              {/* Shift Selector Pill */}
              <div className="flex flex-col items-center sm:items-end gap-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setSelectedShiftForClockIn('Pagi')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedShiftForClockIn === 'Pagi'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sun size={13} />
                    <span>Shift Pagi</span>
                    <span className="text-[10px] opacity-80 font-mono">08:00</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedShiftForClockIn('Siang')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedShiftForClockIn === 'Siang'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sunset size={13} />
                    <span>Shift Siang</span>
                    <span className="text-[10px] opacity-80 font-mono">13:00</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>Batas Masuk:</span>
                  <span className="font-bold text-slate-900">
                    {selectedShiftForClockIn === 'Pagi' ? '08:00 WIB' : '13:00 WIB'}
                  </span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60">Tanpa Toleransi</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  onClick={handleClockIn} 
                  disabled={isClockingIn || isClockingOut}
                  loading={isClockingIn}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer flex-1 sm:flex-initial disabled:opacity-60 disabled:cursor-not-allowed"
                  icon={LogIn}
                >
                  {isClockingIn ? 'Menyimpan...' : 'Clock In'}
                </Button>
                <Button 
                  onClick={handleClockOut} 
                  disabled={isClockingIn || isClockingOut}
                  loading={isClockingOut}
                  variant="outline"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 font-bold cursor-pointer flex-1 sm:flex-initial disabled:opacity-60 disabled:cursor-not-allowed"
                  icon={LogOut}
                >
                  {isClockingOut ? 'Menyimpan...' : 'Clock Out'}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Table Data */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="!p-0 overflow-hidden border border-slate-200/90 shadow-xs">
          {/* Action Toolbar & Filters */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            {/* Search Input & Shift Filter Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={15} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari karyawan atau status..."
                  className="pl-9 pr-3 py-1.5 w-full border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-slate-50/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Segmented Shift Filter */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => setShiftFilter('Semua')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    shiftFilter === 'Semua' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua Shift
                </button>
                <button
                  type="button"
                  onClick={() => setShiftFilter('Pagi')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    shiftFilter === 'Pagi' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sun size={12} />
                  <span>Shift Pagi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShiftFilter('Siang')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    shiftFilter === 'Siang' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sunset size={12} />
                  <span>Shift Siang</span>
                </button>
              </div>
            </div>

            {/* Quick Actions (Presensi Manual & Export) */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button size="sm" icon={PlusCircle} onClick={handleManualAbsensi} className="bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer">
                Presensi Manual
              </Button>
              {canManageAbsensi && (
                <>
                  <Button variant="outline" size="sm" icon={FileText} onClick={handleExportPDF} className="text-slate-700 font-medium cursor-pointer">
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm" icon={Download} onClick={handleExportExcel} className="text-slate-700 font-medium cursor-pointer">
                    Export Excel
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <Table>
            <Thead>
              <Tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <Th className="py-3 px-4">Nama Karyawan</Th>
                <Th className="py-3 px-4">Tanggal</Th>
                <Th className="py-3 px-4">Shift Kerja</Th>
                <Th className="py-3 px-4">Jam Masuk</Th>
                <Th className="py-3 px-4">Jam Keluar</Th>
                <Th className="py-3 px-4">Total Jam</Th>
                <Th className="py-3 px-4">Status</Th>
                {canManageAbsensi && <Th className="py-3 px-4 text-right">Aksi</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={8} className="text-center py-12 text-slate-400 text-xs">Memuat data presensi...</Td></Tr>
              ) : filteredData.length === 0 ? (
                <Tr><Td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                  <div className="flex flex-col items-center gap-2">
                    <UserCheck size={36} className="text-slate-300" />
                    <p className="font-bold text-slate-600">Tidak ada data presensi yang sesuai</p>
                    <p className="text-[11px] text-slate-400">Silakan ubah filter shift atau kata kunci pencarian.</p>
                  </div>
                </Td></Tr>
              ) : (
                filteredData.map((item) => (
                  <Tr key={item.id} className="hover:bg-slate-50/60 transition-colors text-xs">
                    <Td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 font-extrabold text-xs shrink-0 border border-blue-200/70">
                          {item.nama?.charAt(0) || '-'}
                        </div>
                        <div className="font-bold text-slate-900">{item.nama || '-'}</div>
                      </div>
                    </Td>
                    <Td className="py-3 px-4 text-slate-600 font-medium tabular-nums">{item.tanggal}</Td>
                    <Td className="py-3 px-4">
                      <ShiftBadge shift={item.shift} />
                    </Td>
                    <Td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <LogIn size={13} className="text-emerald-500" />
                        <span className="font-mono tabular-nums">{item.jamMasuk}</span>
                      </div>
                    </Td>
                    <Td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <LogOut size={13} className="text-rose-400" />
                        <span className="font-mono tabular-nums">{item.jamKeluar}</span>
                      </div>
                    </Td>
                    <Td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-md w-fit text-[11px]">
                        <Clock size={12} className="text-slate-400" />
                        <span>{item.totalJam} Jam</span>
                      </div>
                    </Td>
                    <Td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </Td>
                    {canManageAbsensi && (
                      <Td className="py-3 px-4 text-right">
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex cursor-pointer"
                          title="Hapus Presensi"
                        >
                          <Trash2 size={15} />
                        </button>
                      </Td>
                    )}
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Card>
      </motion.div>
    </div>
  );
};

export default Absensi;
