import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Mail, Shield, User, Loader2, Search } from 'lucide-react';
import { staffService } from '../../services/staffService';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const data = await staffService.getStaffList();
        setStaff(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

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
          <p className="text-slate-500 font-medium">Lihat dan pantau daftar pengguna di sistem.</p>
        </div>

        <div className="w-full md:w-72">
          <Input 
            icon={Search}
            placeholder="Cari nama atau role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="!bg-white !shadow-sm"
          />
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredStaff.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
            >
              <Card className="h-full overflow-hidden border border-slate-100 hover:shadow-xl hover:shadow-[var(--color-jne-blue)]/5 transition-all duration-300 group p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar Placeholder */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xl font-bold text-slate-400 shadow-inner group-hover:from-[var(--color-jne-blue)]/10 group-hover:to-[var(--color-jne-blue)]/5 group-hover:text-[var(--color-jne-blue)] transition-colors">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          {user.role}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 truncate mb-1">
                        {user.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 truncate">
                        <Mail size={14} className="shrink-0" />
                        <span className="truncate">{user.username}@umaratax.com</span>
                      </div>
                    </div>
                  </div>
              </Card>
            </motion.div>
          ))}
          
          {filteredStaff.length === 0 && (
            <div className="col-span-full h-40 flex flex-col items-center justify-center text-slate-400">
              <Users size={32} className="mb-2 opacity-50" />
              <p>Tidak ada staff yang ditemukan.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Staff;
