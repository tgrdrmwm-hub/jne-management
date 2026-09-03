import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { poinService } from '../../services/poinService';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Coins, 
  Star,
  History,
  TrendingUp,
  Award,
  Medal
} from 'lucide-react';

const Poin = () => {
  const { user } = useSelector((state) => state.auth);
  const [totalPoin, setTotalPoin] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoinData = async () => {
      try {
        if (!user) return;
        setLoading(true);
        
        const [poin, leader, hist] = await Promise.all([
          poinService.getTotalPoin(user.id),
          poinService.getLeaderboard(),
          poinService.getRiwayatPoin(user.id)
        ]);

        setTotalPoin(poin);
        setLeaderboard(leader);
        setHistory(hist.map(h => ({
          ...h,
          tanggal: new Date(h.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          type: h.jumlah_poin > 0 ? 'plus' : 'minus',
          jumlah: h.jumlah_poin > 0 ? `+${h.jumlah_poin}` : h.jumlah_poin
        })));
      } catch (error) {
        console.error('Error fetching poin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPoinData();
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat data poin...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="flex gap-5 items-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 text-white">
            <Trophy size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Sistem Poin Karyawan</h1>
            <p className="text-slate-500 mt-1">Kumpulkan poin dari kehadiran dan kinerja Anda</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Total Poin & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Total Poin Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 md:p-8 shadow-lg shadow-amber-500/20 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 right-10 opacity-20 transform rotate-12">
              <Coins size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-amber-100 font-medium mb-2">
                <Star size={20} />
                <span>Poin Terkumpul</span>
              </div>
              <div className="text-5xl font-black mb-1">{totalPoin} <span className="text-2xl font-semibold text-amber-200">PTS</span></div>
              <p className="text-amber-100/80 text-sm mt-4 max-w-sm">
                Terus tingkatkan performa Anda untuk mendapatkan lebih banyak poin dan menukarkannya dengan reward menarik!
              </p>
            </div>
          </motion.div>

          {/* History Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <History size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Riwayat Poin</h2>
              </div>
            </div>
            <div className="p-0">
              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Belum ada riwayat poin.</div>
              ) : (
                history.map((item, index) => (
                  <div key={item.id} className={`p-4 md:px-6 flex items-center justify-between border-b border-slate-50 hover:bg-slate-50 transition-colors ${index === history.length - 1 ? 'border-none' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'plus' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                        {item.type === 'plus' ? <TrendingUp size={18} /> : <TrendingUp size={18} className="transform rotate-180" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm">{item.keterangan}</h4>
                        <p className="text-xs text-slate-500">{item.tanggal}</p>
                      </div>
                    </div>
                    <div className={`font-bold ${item.type === 'plus' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {item.jumlah}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden h-full"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <Award size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Leaderboard</h2>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {leaderboard.length === 0 ? (
                <div className="text-center text-slate-400 py-4">Belum ada data.</div>
              ) : (
                leaderboard.map((u, index) => (
                  <div 
                    key={u.id} 
                    className={`relative p-4 rounded-2xl flex items-center gap-4 transition-all ${
                      index === 0 ? 'bg-gradient-to-r from-amber-50 to-white border border-amber-100' :
                      index === 1 ? 'bg-gradient-to-r from-slate-50 to-white border border-slate-100' :
                      index === 2 ? 'bg-gradient-to-r from-orange-50 to-white border border-orange-100' :
                      'bg-white border border-slate-50'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      index === 0 ? 'bg-amber-400 text-white shadow-md shadow-amber-400/30' :
                      index === 1 ? 'bg-slate-300 text-white shadow-md shadow-slate-300/30' :
                      index === 2 ? 'bg-orange-400 text-white shadow-md shadow-orange-400/30' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {index === 0 ? <Trophy size={14} /> : index === 1 ? <Medal size={14} /> : index === 2 ? <Medal size={14} /> : index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-sm truncate ${index < 3 ? 'text-slate-800' : 'text-slate-700'}`}>
                        {u.name} {user?.id === u.id ? '(Anda)' : ''}
                      </h4>
                      <p className="text-xs text-slate-500">{u.role}</p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="font-black text-amber-500">{u.poin}</div>
                      <div className="text-[10px] text-slate-400 font-medium">PTS</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Poin;
