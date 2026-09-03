import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Mail, Shield, User, Loader2, Search, Plus, Trash2, Edit2, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { staffService } from '../../services/staffService';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

const Staff = () => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const isDeveloper = currentUser?.role === 'Developer' || currentUser?.role === 'Owner';

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    role: 'Staff',
    password: ''
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await staffService.getStaffList();
      setStaff(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'developer':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return <Shield size={16} />;
      case 'developer':
        return <User size={16} />;
      default:
        return <Users size={16} />;
    }
  };

  const handleOpenModal = (mode, staffData = null) => {
    setModalMode(mode);
    if (staffData) {
      setSelectedStaff(staffData);
      setFormData({
        username: staffData.username,
        name: staffData.name,
        role: staffData.role,
        password: '' // Password can be left blank on edit unless they want to change it (requires more logic, but we keep it simple)
      });
    } else {
      setSelectedStaff(null);
      setFormData({ username: '', name: '', role: 'Staff', password: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ username: '', name: '', role: 'Staff', password: '' });
    setSelectedStaff(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (modalMode === 'add') {
        await staffService.createStaff(formData);
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Staff berhasil ditambahkan', customClass: { popup: 'rounded-2xl' } });
      } else {
        // Exclude password from update if it's empty
        const updates = { name: formData.name, username: formData.username, role: formData.role };
        await staffService.updateStaff(selectedStaff.id, updates);
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data staff berhasil diperbarui', customClass: { popup: 'rounded-2xl' } });
      }
      handleCloseModal();
      fetchStaff();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message, customClass: { popup: 'rounded-2xl' } });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Hapus Staff?',
      text: "Data staff yang dihapus tidak dapat dikembalikan!",
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
          await staffService.deleteStaff(id);
          Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Data staff berhasil dihapus.', customClass: { popup: 'rounded-2xl' } });
          fetchStaff();
        } catch (err) {
          Swal.fire({ icon: 'error', title: 'Gagal', text: err.message, customClass: { popup: 'rounded-2xl' } });
        }
      }
    });
  };

  const filteredStaff = staff.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-[var(--color-jne-blue)]/10 text-[var(--color-jne-blue)] rounded-xl">
              <Users size={24} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Data Staff</h1>
          </div>
          <p className="text-slate-500 font-medium">Lihat dan kelola daftar pengguna di sistem.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="w-full sm:w-72">
            <Input 
              icon={Search}
              placeholder="Cari nama atau role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="!bg-white !shadow-sm"
            />
          </div>
          {isDeveloper && (
            <button 
              onClick={() => handleOpenModal('add')}
              className="w-full sm:w-auto px-5 py-2.5 bg-[var(--color-jne-blue)] hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={18} />
              <span>Tambah User</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 size={32} className="animate-spin text-[var(--color-jne-blue)]" />
          <p className="font-medium">Memuat data staff...</p>
        </div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center text-red-500 bg-red-50 rounded-2xl border border-red-100">
          <p className="font-semibold">{error}</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-sm font-semibold">
                  <th className="py-4 px-6 font-semibold">Profil Staff</th>
                  <th className="py-4 px-6 font-semibold">Role</th>
                  <th className="py-4 px-6 font-semibold">Email / Kontak</th>
                  {isDeveloper && <th className="py-4 px-6 font-semibold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 group-hover:from-[var(--color-jne-blue)]/10 group-hover:to-[var(--color-jne-blue)]/5 group-hover:text-[var(--color-jne-blue)] transition-colors">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-[var(--color-jne-blue)] transition-colors">{u.name}</p>
                          <p className="text-xs text-slate-500">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getRoleColor(u.role)}`}>
                        {getRoleIcon(u.role)}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail size={14} className="text-slate-400" />
                        <span>{u.username}@umaratax.com</span>
                      </div>
                    </td>
                    {isDeveloper && (
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal('edit', u)}
                            className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          {/* Mencegah admin menghapus dirinya sendiri */}
                          {currentUser?.id !== u.id && (
                            <button 
                              onClick={() => handleDelete(u.id)}
                              className="p-2 text-slate-400 hover:text-[var(--color-jne-red)] hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={isDeveloper ? "4" : "3"} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <Users size={32} className="mb-3 opacity-50" />
                        <p>Tidak ada staff yang ditemukan.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Modal Tambah/Edit Staff */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleCloseModal}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">
                  {modalMode === 'add' ? 'Tambah User Baru' : 'Edit Data User'}
                </h2>
                <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[var(--color-jne-blue)]/20 focus:border-[var(--color-jne-blue)] outline-none transition-all"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
                  <div className="flex rounded-xl overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-[var(--color-jne-blue)]/20 focus-within:border-[var(--color-jne-blue)] transition-all">
                    <input 
                      type="text" 
                      required 
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase()})}
                      className="w-full px-4 py-2.5 outline-none"
                      placeholder="Contoh: ryan"
                    />
                    <div className="bg-slate-50 px-4 flex items-center border-l border-slate-200 text-slate-500 text-sm font-medium">
                      @umaratax.com
                    </div>
                  </div>
                </div>
                {modalMode === 'add' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 flex items-start gap-2">
                    <svg className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p>Password default untuk user baru adalah <strong>123456</strong>. User dapat menggantinya nanti.</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Role / Peran</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[var(--color-jne-blue)]/20 focus:border-[var(--color-jne-blue)] outline-none transition-all bg-white"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Developer">Developer</option>
                    <option value="Owner">Owner</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-jne-blue)] text-white font-semibold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Staff;
