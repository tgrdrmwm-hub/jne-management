import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { poinService } from '../../services/poinService';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Star,
  History,
  TrendingUp,
  Award,
  Medal,
  Clock,
  Sparkles,
  CheckCircle2
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
          tanggal: new Date(h.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
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
    return (
      <div className="p-12 text-center text-slate-500 font-medium flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        <span>Memuat data poin & leaderboard...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Banner - Anti-Slop (No blur blobs, crisp 1px border, high contrast) */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 md:p-7 shadow-xs border border-slate-200/90 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center"
      >
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center border border-slate-800 shadow-xs shrink-0">
            <Trophy size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sistem Poin & Apresiasi Karyawan</h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <Clock size={11} className="text-slate-500" />
                Poin Dinolkan Sementara
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Seluruh saldo poin karyawan saat ini dinolkan (0 PTS) sementara skema perhitungan sedang dalam perumusan ulang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status Akun</div>
            <div className="text-xs font-bold text-slate-800">{user?.name} ({user?.role || 'Staff'})</div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Total Poin & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Total Poin Card - Deep Navy Corporate JNE Palette with hairline border */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-800 relative overflow-hidden"
          >
            {/* Subtle architectural grid pattern instead of generic AI blur orbs */}
            <div 
              className="absolute inset-0 opacity-5 pointer-events-none" 
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  <span>Total Saldo Poin Saya</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">ID: {user?.id?.slice(0, 8)}</span>
              </div>

              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-5xl md:text-6xl font-black text-white tracking-tight tabular-nums font-mono">
                  {totalPoin}
                </span>
                <span className="text-xl md:text-2xl font-bold text-amber-400">PTS</span>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed max-w-lg mb-6">
                Poin Anda bertambah secara otomatis saat melakukan Presensi Tepat Waktu (+10 PTS) dan menyelesaikan Laporan Harian (+5 PTS).
              </p>

              {/* Point Rules Summary Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
                <div className="flex items-center gap-2.5 bg-slate-800/60 px-3.5 py-2.5 rounded-xl border border-slate-700/60">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-white tabular-nums">+10 PTS</span>
                    <span className="text-slate-400 ml-1.5">Clock In Tepat Waktu</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-800/60 px-3.5 py-2.5 rounded-xl border border-slate-700/60">
                  <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-white tabular-nums">+5 PTS</span>
                    <span className="text-slate-400 ml-1.5">Laporan Tugas Selesai</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* History Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <History size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Riwayat Mutasi Poin</h2>
                  <p className="text-[11px] text-slate-500 font-medium">Log perolehan dan penyesuaian poin</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 tabular-nums">
                {history.length} Catatan
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-medium">
                  Belum ada riwayat transaksi poin tercatat.
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id} 
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        item.type === 'plus' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <TrendingUp size={15} className={item.type === 'plus' ? '' : 'transform rotate-180'} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-800 text-xs truncate">{item.keterangan}</h4>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                          <Clock size={11} /> {item.tanggal}
                        </p>
                      </div>
                    </div>
                    <div className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md border shrink-0 tabular-nums ${
                      item.type === 'plus' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {item.jumlah} PTS
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
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden h-full flex flex-col"
          >
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Award size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Klasemen Karyawan</h2>
                  <p className="text-[11px] text-slate-500 font-medium">Peringkat kinerja tertinggi</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-2 flex-1">
              {leaderboard.length === 0 ? (
                <div className="text-center text-slate-400 text-xs font-medium py-10">
                  Belum ada data klasemen.
                </div>
              ) : (
                leaderboard.map((u, index) => {
                  const isCurrent = user?.id === u.id;
                  return (
                    <div 
                      key={u.id} 
                      className={`p-3 rounded-xl flex items-center gap-3 transition-colors border ${
                        index === 0 
                          ? 'bg-amber-50/60 border-amber-200/90' :
                        index === 1 
                          ? 'bg-slate-50/90 border-slate-200' :
                        index === 2 
                          ? 'bg-orange-50/50 border-orange-200/80' :
                        isCurrent
                          ? 'bg-blue-50/50 border-blue-200'
                          : 'bg-white border-slate-100 hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Rank Indicator */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                        index === 0 
                          ? 'bg-amber-400 text-slate-950 border-amber-500 font-black' :
                        index === 1 
                          ? 'bg-slate-200 text-slate-800 border-slate-300' :
                        index === 2 
                          ? 'bg-orange-300 text-slate-900 border-orange-400' :
                          'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {index === 0 ? <Trophy size={13} /> : index === 1 ? <Medal size={13} /> : index === 2 ? <Medal size={13} /> : index + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-slate-800 truncate">
                            {u.name}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-600 text-white rounded">
                              Anda
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 capitalize mt-0.5">{u.role || 'Staff'}</p>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs text-slate-900 tabular-nums">
                          {u.poin}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">PTS</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Poin;
