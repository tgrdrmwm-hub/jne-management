import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td, TableHeader } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { jadwalService } from '../../services/jadwalService';
import { Plus, Download, FileText, Edit, Trash2, Calendar, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';

const StatusBadge = ({ status }) => {
  const styles = {
    'Aktif': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Nonaktif': 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {status}
    </span>
  );
};

const ShiftBadge = ({ shift }) => {
  const styles = {
    'Pagi': 'bg-blue-50 text-blue-700 border-blue-200',
    'Siang': 'bg-amber-50 text-amber-700 border-amber-200',
    'Malam': 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${styles[shift] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {shift}
    </span>
  );
};

const Jaga = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [formData, setFormData] = useState({ id: null, nama: '', shift: 'Pagi', hari: 'Senin', jamMasuk: '', jamPulang: '', status: 'Aktif', catatan: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await jadwalService.getAll();
      setData(result);
    } catch (error) {
      console.error('Error fetching jadwal:', error);
      Swal.fire({ title: 'Error', text: 'Gagal mengambil data', icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(item => 
    item.nama?.toLowerCase().includes(search.toLowerCase()) || 
    item.shift?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Jadwal Jaga Karyawan", 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);
    doc.autoTable({
      head: [['Nama', 'Shift', 'Hari', 'Jam Masuk', 'Jam Pulang', 'Status']],
      body: filteredData.map(item => [item.nama, item.shift, item.hari, item.jamMasuk, item.jamPulang, item.status]),
      startY: 28,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 74, 141] },
    });
    doc.save("Jadwal_Jaga.pdf");
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jadwal Jaga");
    XLSX.writeFile(workbook, "Jadwal_Jaga.xlsx");
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Hapus jadwal?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31e24',
      confirmButtonText: 'Ya, hapus!',
      customClass: { popup: 'rounded-2xl' }
    }).then((result) => {
      if (result.isConfirmed) {
        // Implementasi delete service nanti
        setData(data.filter(d => d.id !== id));
        Swal.fire({ title: 'Terhapus!', text: 'Jadwal berhasil dihapus.', icon: 'success', customClass: { popup: 'rounded-2xl' } });
      }
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    // Implementasi save service nanti
    if (formData.id) {
      setData(data.map(d => d.id === formData.id ? { ...d, ...formData } : d));
      Swal.fire({ title: 'Berhasil', text: 'Jadwal berhasil diubah', icon: 'success', customClass: { popup: 'rounded-2xl' } });
    } else {
      const newData = {
        ...formData,
        id: Date.now(),
        catatan: formData.catatan || '-'
      };
      setData([newData, ...data]);
      Swal.fire({ title: 'Berhasil', text: 'Jadwal berhasil ditambahkan', icon: 'success', customClass: { popup: 'rounded-2xl' } });
    }
    setIsModalOpen(false);
  };

  const openModal = (item = null) => {
    if (item) setFormData(item);
    else setFormData({ id: null, nama: '', shift: 'Pagi', hari: 'Senin', jamMasuk: '', jamPulang: '', status: 'Aktif', catatan: '' });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
              <Calendar size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Jadwal Jaga</h1>
          </div>
          <p className="text-gray-500 text-sm ml-12">Atur dan pantau jadwal shift karyawan</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="!p-0 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <TableHeader 
              onSearch={setSearch}
              rightContent={
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" icon={FileText} onClick={handleExportPDF} className="hidden sm:flex">PDF</Button>
                  <Button variant="outline" size="sm" icon={Download} onClick={handleExportExcel} className="hidden sm:flex">Excel</Button>
                  <Button size="sm" icon={Plus} onClick={() => openModal()}>Tambah</Button>
                </div>
              }
            />
          </div>
          
          <Table>
            <Thead>
              <Tr>
                <Th>Nama Karyawan</Th>
                <Th>Shift</Th>
                <Th>Hari</Th>
                <Th>Jam Kerja</Th>
                <Th>Status</Th>
                <Th className="text-right">Aksi</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={6} className="text-center py-12 text-gray-400">Memuat data...</Td></Tr>
              ) : filteredData.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center py-12 text-gray-400 text-base">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar size={40} className="text-gray-300" />
                    <p className="font-semibold">Tidak ada data ditemukan</p>
                  </div>
                </Td></Tr>
              ) : (
                filteredData.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">{item.nama?.charAt(0) || '-'}</div>
                        <div className="font-semibold text-gray-900">{item.nama || '-'}</div>
                      </div>
                    </Td>
                    <Td><ShiftBadge shift={item.shift} /></Td>
                    <Td className="font-medium text-gray-700">{item.hari}</Td>
                    <Td>
                      <div className="font-medium text-gray-800">{item.jamMasuk} - {item.jamPulang}</div>
                    </Td>
                    <Td><StatusBadge status={item.status} /></Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailModal(item)}><Eye size={16} className="text-gray-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openModal(item)}><Edit size={16} className="text-blue-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 size={16} className="text-red-400" /></Button>
                      </div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Card>
      </motion.div>

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Detail Jadwal">
        {detailModal && (
          <div className="space-y-4">
            {[
              ['Nama Karyawan', detailModal.nama],
              ['Shift', detailModal.shift],
              ['Hari', detailModal.hari],
              ['Jam Masuk', detailModal.jamMasuk],
              ['Jam Pulang', detailModal.jamPulang],
              ['Status', detailModal.status],
              ['Catatan', detailModal.catatan],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500 font-medium">{label}</span>
                <span className="text-sm font-semibold text-gray-900">{value || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={formData.id ? "Edit Jadwal" : "Tambah Jadwal"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nama Karyawan" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} required />
          <Select label="Shift" value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})} options={['Pagi', 'Siang', 'Malam']} required />
          <Select label="Hari" value={formData.hari} onChange={e => setFormData({...formData, hari: e.target.value})} options={['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']} required />
          
          <div className="grid grid-cols-2 gap-4">
            <Input type="time" label="Jam Masuk" value={formData.jamMasuk} onChange={e => setFormData({...formData, jamMasuk: e.target.value})} required />
            <Input type="time" label="Jam Pulang" value={formData.jamPulang} onChange={e => setFormData({...formData, jamPulang: e.target.value})} required />
          </div>

          <Select label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={['Aktif', 'Nonaktif']} required />
          <Input label="Catatan" value={formData.catatan} onChange={e => setFormData({...formData, catatan: e.target.value})} />
          <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Jaga;
