import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td, TableHeader } from '../../components/ui/Table';
import { poinService } from '../../services/poinService';
import { Award, Trophy, Medal, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

const Poin = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await poinService.getAll();
      setData(result);
    } catch (error) {
      console.error('Error fetching poin:', error);
      Swal.fire({ title: 'Error', text: 'Gagal mengambil data poin', icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(item => 
    item.nama?.toLowerCase().includes(search.toLowerCase())
  );

  const getRankIcon = (rank) => {
    switch(rank) {
      case 1: return <div className="p-2 rounded-full bg-yellow-100 shadow-sm"><Trophy className="text-yellow-500" size={24} /></div>;
      case 2: return <div className="p-2 rounded-full bg-gray-100 shadow-sm"><Medal className="text-gray-400" size={24} /></div>;
      case 3: return <div className="p-2 rounded-full bg-amber-50 shadow-sm"><Medal className="text-amber-600" size={24} /></div>;
      default: return <span className="font-bold text-gray-400 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50">{rank}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/20">
              <Award size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Poin & Reward</h1>
          </div>
          <p className="text-gray-500 text-sm ml-12">Leaderboard dan riwayat poin karyawan</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-500 text-white p-6 relative overflow-hidden border-none shadow-lg shadow-orange-500/20 h-full">
            {/* Decorative BG */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <p className="text-yellow-100/90 font-semibold mb-2 text-sm uppercase tracking-wider">Top Performer Bulan Ini</p>
                <h3 className="text-3xl font-extrabold mb-1 drop-shadow-md">{data.length > 0 ? data[0].nama : '-'}</h3>
              </div>
              
              <div className="flex items-end justify-between mt-6">
                <div>
                  <p className="text-4xl font-black tabular-nums drop-shadow-md">{data.length > 0 ? data[0].totalPoin : '0'}</p>
                  <p className="text-sm text-yellow-100/90 font-medium">Total Poin</p>
                </div>
                <Trophy size={64} className="text-yellow-100 opacity-90 drop-shadow-lg" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6 h-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg font-semibold text-sm">
                <TrendingUp size={16} /> Cara Mendapatkan
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><Award size={20} /></div>
            </div>
            <ul className="text-sm space-y-3 mt-auto font-medium text-gray-600">
              <li className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"/> Mengantar Paket</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">+10</span>
              </li>
              <li className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"/> Mengambil Paket</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">+8</span>
              </li>
              <li className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"/> Hadir Tepat Waktu</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">+5</span>
              </li>
            </ul>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-6 h-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg font-semibold text-sm">
                <TrendingDown size={16} /> Pengurangan Poin
              </div>
              <div className="p-2 bg-red-50 rounded-lg text-red-500"><Award size={20} /></div>
            </div>
            <ul className="text-sm space-y-3 mt-auto font-medium text-gray-600">
              <li className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"/> Terlambat</span>
                <span className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">-3</span>
              </li>
              <li className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"/> Alpha (Tanpa Ket.)</span>
                <span className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">-10</span>
              </li>
            </ul>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="!p-0 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <TableHeader onSearch={setSearch} title="Leaderboard Karyawan" />
          </div>

          <Table>
            <Thead>
              <Tr>
                <Th className="w-24 text-center">Rank</Th>
                <Th>Karyawan</Th>
                <Th>Total Poin</Th>
                <Th>Aktivitas Terakhir</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={4} className="text-center py-12 text-gray-400">Memuat data poin...</Td></Tr>
              ) : filteredData.length === 0 ? (
                <Tr><Td colSpan={4} className="text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <Star size={40} className="text-gray-300" />
                    <p className="font-semibold">Tidak ada data</p>
                  </div>
                </Td></Tr>
              ) : (
                filteredData.map((item) => (
                  <Tr key={item.id}>
                    <Td className="flex justify-center items-center py-4">
                      {getRankIcon(item.rank)}
                    </Td>

                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-sm shadow-sm">{item.nama?.charAt(0) || '-'}</div>
                        <span className="font-semibold text-gray-900 text-base">{item.nama}</span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-baseline gap-1">
                        <span className="font-extrabold text-[var(--color-jne-blue)] text-xl tabular-nums">{item.totalPoin}</span>
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">pts</span>
                      </div>
                    </Td>
                    <Td>
                      {item.riwayat && item.riwayat.length > 0 ? (
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{item.riwayat[0].aktivitas}</div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 font-medium">
                            {item.riwayat[0].tgl}
                            <span className="text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">(+{item.riwayat[0].poin})</span>
                          </div>
                        </div>
                      ) : '-'}
                    </Td>
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

export default Poin;
