import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td, TableHeader } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { absensiService } from '../../services/absensiService';
import { staffService } from '../../services/staffService';
import { poinService } from '../../services/poinService';
import { Download, FileText, Clock, LogIn, LogOut, Search, UserCheck, PlusCircle, Trash2 } from 'lucide-react';
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
  };
  return (
    <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {status}
    </span>
  );
};

const Absensi = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update jam real-time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await absensiService.getAll();
      setData(result);
    } catch (error) {
      console.error('Error fetching absensi:', error);
      Swal.fire({ title: 'Error', text: 'Gagal mengambil data absensi', icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(item => 
    item.nama?.toLowerCase().includes(search.toLowerCase()) || 
    item.status?.toLowerCase().includes(search.toLowerCase())
  );

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handleClockIn = async () => {
    try {
      const clockInData = await absensiService.clockIn(currentUser.id);
      
      // Tambah poin absen (tertaut absensiId untuk cascade)
      await poinService.addPoin(
        currentUser.id, 
        10, 
        'Absen Tepat Waktu (Clock In)',
        { absensiId: clockInData?.id }
      );

      Swal.fire({
        icon: 'success',
        title: 'Clock In Berhasil',
        html: `Selamat bekerja, ${currentUser.name}!<br/><br/><span style="color:#f59e0b;font-weight:bold;">+10 Poin</span> (Hadir)`,
        timer: 2000,
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
    }
  };

  const handleClockOut = async () => {
    try {
      await absensiService.clockOut(currentUser.id);
      Swal.fire({
        icon: 'success',
        title: 'Clock Out Berhasil',
        text: `Terima kasih atas kerja keras Anda hari ini!`,
        timer: 1500,
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
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Absensi Karyawan", 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);
    doc.autoTable({
      head: [['Nama Karyawan', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Total Jam', 'Status']],
      body: filteredData.map(item => [item.nama, item.tanggal, item.jamMasuk, item.jamKeluar, item.totalJam, item.status]),
      startY: 28,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 74, 141] },
    });
    doc.save("Laporan_Absensi.pdf");
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi");
    XLSX.writeFile(workbook, "Laporan_Absensi.xlsx");
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

      const optionsHtml = staffList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      const today = new Date().toISOString().split('T')[0];

      const { value: formValues } = await Swal.fire({
        title: 'Absensi Manual',
        html: `
          <div class="space-y-4 text-left font-['Inter',system-ui,sans-serif]">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Karyawan</label>
              <select id="swal-karyawan" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Pilih Karyawan</option>
                ${optionsHtml}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
              <input type="date" id="swal-tanggal" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" value="${today}">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Jam Masuk</label>
                <input type="time" id="swal-masuk" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Jam Keluar</label>
                <input type="time" id="swal-keluar" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select id="swal-status" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
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
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#10b981',
        customClass: { popup: 'rounded-2xl' },
        preConfirm: () => {
          const karyawan_id = document.getElementById('swal-karyawan').value;
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
          return { karyawan_id, tanggal, jam_masuk, jam_keluar, status };
        }
      });

      if (formValues) {
        Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const savedAbsensi = await absensiService.addManual(formValues);
        
        let poinText = '';
        if (formValues.status === 'Hadir') {
          poinText = '<br/><br/><span style="color:#f59e0b;font-weight:bold;">+10 Poin</span> (Hadir)';
          await poinService.addPoin(
            formValues.karyawan_id, 
            10, 
            'Absensi Manual (Hadir)',
            { absensiId: savedAbsensi?.id }
          );
        }
        else if (formValues.status === 'Terlambat') {
          poinText = '<br/><br/><span style="color:#ef4444;font-weight:bold;">-5 Poin</span> (Terlambat)';
          await poinService.addPoin(
            formValues.karyawan_id, 
            -5, 
            'Absensi Manual (Terlambat)',
            { absensiId: savedAbsensi?.id }
          );
        }

        Swal.fire({ icon: 'success', title: 'Berhasil', html: `Absensi manual berhasil disimpan${poinText}`, timer: 2000, showConfirmButton: false, customClass: { popup: 'rounded-2xl' } });
        fetchData();
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, customClass: { popup: 'rounded-2xl' } });
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Hapus Data Absensi?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
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
          await absensiService.deleteAbsensi(id);
          Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Data absensi berhasil dihapus.', customClass: { popup: 'rounded-2xl' } });
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
      <div className="flex flex-col lg:flex-row gap-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <UserCheck size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Absensi Karyawan</h1>
          </div>
          <p className="text-gray-500 text-sm ml-12">Catat kehadiran dan pantau jam kerja</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="!p-0 overflow-hidden border-2 border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="px-6 py-4 flex items-center justify-between gap-8">
              <div>
                <p className="text-sm font-semibold text-emerald-800 mb-1">
                  {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className="text-3xl font-black text-emerald-900 tracking-tight font-mono">
                  {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleClockIn} 
                  className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 text-white"
                  icon={LogIn}
                >
                  Clock In
                </Button>
                <Button 
                  onClick={handleClockOut} 
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  icon={LogOut}
                >
                  Clock Out
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Table Data */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="!p-0 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Cari nama atau status..."
                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button size="sm" icon={PlusCircle} onClick={handleManualAbsensi} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white border-transparent">Absensi Manual</Button>
              {['Owner', 'Developer'].includes(currentUser.role) && (
                <>
                  <Button variant="outline" size="sm" icon={FileText} onClick={handleExportPDF} className="w-full sm:w-auto">Export PDF</Button>
                  <Button variant="outline" size="sm" icon={Download} onClick={handleExportExcel} className="w-full sm:w-auto">Export Excel</Button>
                </>
              )}
            </div>
          </div>
          
          <Table>
            <Thead>
              <Tr>
                <Th>Nama Karyawan</Th>
                <Th>Tanggal</Th>
                <Th>Jam Masuk</Th>
                <Th>Jam Keluar</Th>
                <Th>Total Jam</Th>
                <Th>Status</Th>
                {['Owner', 'Developer'].includes(currentUser.role) && <Th className="text-right">Aksi</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={6} className="text-center py-12 text-gray-400">Memuat data absensi...</Td></Tr>
              ) : filteredData.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center py-12 text-gray-400 text-base">
                  <div className="flex flex-col items-center gap-2">
                    <UserCheck size={40} className="text-gray-300" />
                    <p className="font-semibold">Tidak ada data absensi</p>
                  </div>
                </Td></Tr>
              ) : (
                filteredData.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs">{item.nama?.charAt(0) || '-'}</div>
                        <div className="font-semibold text-gray-900">{item.nama || '-'}</div>
                      </div>
                    </Td>
                    <Td className="text-gray-600 font-medium">{item.tanggal}</Td>
                    <Td>
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <LogIn size={14} className="text-emerald-500" />
                        <span className="font-mono">{item.jamMasuk}</span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <LogOut size={14} className="text-red-400" />
                        <span className="font-mono">{item.jamKeluar}</span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5 text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded w-fit">
                        <Clock size={14} className="text-gray-400" />
                        {item.totalJam} Jam
                      </div>
                    </Td>
                    <Td><StatusBadge status={item.status} /></Td>
                    {['Owner', 'Developer'].includes(currentUser.role) && (
                      <Td className="text-right">
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-slate-400 hover:text-[var(--color-jne-red)] hover:bg-red-50 rounded-lg transition-colors inline-flex"
                          title="Hapus Absensi"
                        >
                          <Trash2 size={16} />
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
