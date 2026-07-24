import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td, TableHeader } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { gudangService } from '../../services/gudangService';
import { Plus, Download, FileText, Edit, Trash2, Truck, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';

const StatusBadge = ({ status }) => {
  const styles = {
    'Selesai': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Proses': 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {status}
    </span>
  );
};

const Gudang = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [formData, setFormData] = useState({ id: null, resi: '', kurir: '', gudang: '', jumlah: '', status: 'Proses', catatan: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await gudangService.getAll();
      setData(result);
    } catch (error) {
      console.error('Error fetching gudang:', error);
      Swal.fire({ title: 'Error', text: 'Gagal mengambil data', icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(item => 
    item.resi?.toLowerCase().includes(search.toLowerCase()) || 
    item.kurir?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Pengantaran Paket ke Gudang", 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);
    doc.autoTable({
      head: [['Resi', 'Kurir', 'Gudang', 'Jumlah', 'Tanggal', 'Jam', 'Status']],
      body: filteredData.map(item => [item.resi, item.kurir, item.gudang, item.jumlah, item.tanggal, item.jam, item.status]),
      startY: 28,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 74, 141] },
    });
    doc.save("Laporan_Gudang.pdf");
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gudang");
    XLSX.writeFile(workbook, "Laporan_Gudang.xlsx");
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus data?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e31e24',
      confirmButtonText: 'Ya, hapus!',
      customClass: { popup: 'rounded-2xl' }
    });

    if (result.isConfirmed) {
      try {
        await gudangService.delete(id);
        setData(data.filter(d => d.id !== id));
        Swal.fire({ title: 'Terhapus!', text: 'Data berhasil dihapus.', icon: 'success', customClass: { popup: 'rounded-2xl' } });
      } catch (error) {
        Swal.fire({ title: 'Error', text: 'Gagal menghapus data', icon: 'error' });
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        const updated = await gudangService.update(formData.id, formData);
        setData(data.map(d => d.id === formData.id ? updated : d));
        Swal.fire({ title: 'Berhasil', text: 'Data berhasil diubah', icon: 'success', customClass: { popup: 'rounded-2xl' } });
      } else {
        const added = await gudangService.create(formData);
        setData([added, ...data]);
        Swal.fire({ title: 'Berhasil', text: 'Data berhasil ditambahkan', icon: 'success', customClass: { popup: 'rounded-2xl' } });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      Swal.fire({ title: 'Error', text: 'Gagal menyimpan data', icon: 'error' });
    }
  };

  const openModal = (item = null) => {
    if (item) setFormData(item);
    else setFormData({ id: null, resi: '', kurir: '', gudang: '', jumlah: '', status: 'Proses', catatan: '' });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
              <Truck size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Pengantaran Gudang</h1>
          </div>
          <p className="text-gray-500 text-sm ml-12">Kelola data paket yang masuk ke gudang</p>
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
                <Th>No. Resi</Th>
                <Th>Kurir</Th>
                <Th>Gudang Tujuan</Th>
                <Th>Waktu</Th>
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
                    <Truck size={40} className="text-gray-300" />
                    <p className="font-semibold">Tidak ada data ditemukan</p>
                  </div>
                </Td></Tr>
              ) : (
                filteredData.map((item) => (
                  <Tr key={item.id}>
                    <Td className="font-mono font-bold text-[var(--color-jne-blue)]">{item.resi}</Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">{item.kurir?.charAt(0) || '-'}</div>
                        <div>
                          <div className="font-semibold text-gray-900">{item.kurir || '-'}</div>
                          <div className="text-xs text-gray-400">{item.jumlah} Paket</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-gray-600">{item.gudang}</Td>
                    <Td>
                      <div className="font-medium text-gray-800">{item.tanggal}</div>
                      <div className="text-xs text-gray-400">{item.jam} WIB</div>
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
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Detail Pengantaran">
        {detailModal && (
          <div className="space-y-4">
            {[
              ['No. Resi', detailModal.resi],
              ['Kurir', detailModal.kurir],
              ['Gudang Tujuan', detailModal.gudang],
              ['Jumlah Paket', detailModal.jumlah],
              ['Tanggal', detailModal.tanggal],
              ['Jam', detailModal.jam],
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
        title={formData.id ? "Edit Data Pengantaran" : "Tambah Data Pengantaran"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nomor Resi" value={formData.resi} onChange={e => setFormData({...formData, resi: e.target.value})} required />
          <Input label="Nama Kurir" value={formData.kurir} onChange={e => setFormData({...formData, kurir: e.target.value})} required />
          <Input label="Gudang Tujuan" value={formData.gudang} onChange={e => setFormData({...formData, gudang: e.target.value})} required />
          <Input type="number" label="Jumlah Paket" value={formData.jumlah} onChange={e => setFormData({...formData, jumlah: e.target.value})} required />
          <Select label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={['Proses', 'Selesai']} required />
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

export default Gudang;
