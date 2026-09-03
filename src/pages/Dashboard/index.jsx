import { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Truck, 
  UserCheck, 
  Award,
  Clock, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { dashboardService } from '../../services/dashboardService';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';

const StatCard = ({ title, value, icon: Icon, gradient, trend, trendValue, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Card className="!p-0 overflow-hidden group cursor-default">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${gradient} shadow-lg shadow-blue-500/10`}>
            <Icon size={22} className="text-white" />
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${
              trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
            }`}>
              {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trendValue}
            </div>
          )}
        </div>
        <h3 className="text-3xl font-extrabold text-gray-900 mb-1">{value}</h3>
        <p className="text-sm font-medium text-gray-500">{title}</p>
      </div>
      <div className={`h-1 w-full ${gradient} opacity-60`} />
    </Card>
  </motion.div>
);

// Custom Glassmorphism Tooltip
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-slate-100 p-4 text-xs space-y-2.5 min-w-[170px]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-800 text-sm">{data?.name || label}</span>
          <span className="text-slate-400 text-[11px] font-medium">{data?.displayDate}</span>
        </div>
        <div className="flex items-center justify-between text-slate-700">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Hadir
          </span>
          <span className="font-bold text-slate-900">{data?.hadir || 0} orang</span>
        </div>
        <div className="flex items-center justify-between text-slate-700">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Izin / Sakit
          </span>
          <span className="font-bold text-slate-900">{data?.izin || 0} orang</span>
        </div>
        {data?.isToday && (
          <div className="pt-1 border-t border-slate-100 text-[10px] text-blue-600 font-bold text-center">
            ● Hari Ini
          </div>
        )}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    karyawanHadir: 0,
    karyawanIzin: 0,
    totalKaryawan: 0,
    aktivitas: [],
    weeklyAttendance: []
  });
  const [chartType, setChartType] = useState('area'); // 'area' | 'bar'
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const handleRefresh = () => fetchStats();
    window.addEventListener('absensiUpdated', handleRefresh);
    window.addEventListener('aktivitasUpdated', handleRefresh);

    return () => {
      window.removeEventListener('absensiUpdated', handleRefresh);
      window.removeEventListener('aktivitasUpdated', handleRefresh);
    };
  }, [fetchStats]);

  if (loading && (!stats.weeklyAttendance || stats.weeklyAttendance.length === 0)) {
    return <div className="flex justify-center items-center h-64 text-gray-500">Memuat dashboard...</div>;
  }

  // Summary counts
  const totalHadirMingguan = stats.weeklyAttendance?.reduce((acc, curr) => acc + (curr.hadir || 0), 0) || 0;
  const totalIzinMingguan = stats.weeklyAttendance?.reduce((acc, curr) => acc + (curr.izin || 0), 0) || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Ringkasan aktivitas operasional dan kehadiran real-time</p>
        </div>
        <div className="text-sm font-semibold text-blue-600 bg-blue-50/80 px-4 py-2 rounded-xl flex items-center gap-2 border border-blue-100/60 shadow-sm">
          <Clock size={16} />
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Karyawan Hadir Hari Ini" 
          value={stats.karyawanHadir} 
          icon={UserCheck} 
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
          trend="up"
          trendValue={`${stats.totalKaryawan ? Math.round((stats.karyawanHadir / stats.totalKaryawan) * 100) : 0}%`}
          delay={0}
        />
        <StatCard 
          title="Karyawan Izin / Sakit" 
          value={stats.karyawanIzin} 
          icon={Activity} 
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
          trend={stats.karyawanIzin > 0 ? "down" : undefined}
          trendValue={stats.karyawanIzin > 0 ? `${stats.karyawanIzin} Orang` : 'Nihil'}
          delay={0.1}
        />
        <StatCard 
          title="Total Karyawan" 
          value={stats.totalKaryawan} 
          icon={UserCheck} 
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          delay={0.2}
        />
        <StatCard 
          title="Hadir Minggu Ini" 
          value={`${totalHadirMingguan} Sesi`} 
          icon={TrendingUp} 
          gradient="bg-gradient-to-br from-indigo-500 to-purple-600"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modern Chart Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="!p-6 border-slate-100 shadow-sm rounded-3xl">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-800">Tren Kehadiran Mingguan</CardTitle>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                    Real-time
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Senin – Minggu berdasarkan data absensi aktual</p>
              </div>

              {/* Chart Controls & Stats Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Stats Pills */}
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 mr-2">
                  <span className="flex items-center gap-1 bg-blue-50/70 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100/50">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Hadir: {totalHadirMingguan}
                  </span>
                  <span className="flex items-center gap-1 bg-rose-50/70 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-100/50">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Izin: {totalIzinMingguan}
                  </span>
                </div>

                {/* View Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setChartType('area')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      chartType === 'area'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <TrendingUp size={13} />
                    <span>Kurva</span>
                  </button>
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      chartType === 'bar'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <BarChart2 size={13} />
                    <span>Batang</span>
                  </button>
                </div>
              </div>
            </CardHeader>

            {/* Chart Canvas */}
            <div className="h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart 
                    data={stats.weeklyAttendance} 
                    margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradHadir" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="gradIzin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="shortDay" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }} 
                    />
                    <YAxis 
                      allowDecimals={false} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 12 }} 
                      domain={[0, (dataMax) => Math.max(dataMax + 1, 4)]}
                    />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="hadir" 
                      name="Hadir" 
                      stroke="#3B82F6" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#gradHadir)" 
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3B82F6' }}
                      activeDot={{ r: 6, strokeWidth: 2, fill: '#fff', stroke: '#3B82F6' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="izin" 
                      name="Izin / Sakit" 
                      stroke="#F43F5E" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#gradIzin)" 
                      dot={{ r: 3, strokeWidth: 2, fill: '#fff', stroke: '#F43F5E' }}
                      activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#F43F5E' }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart 
                    data={stats.weeklyAttendance} 
                    barGap={6} 
                    margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="shortDay" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }} 
                    />
                    <YAxis 
                      allowDecimals={false} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 12 }} 
                      domain={[0, (dataMax) => Math.max(dataMax + 1, 4)]}
                    />
                    <RechartsTooltip content={<CustomChartTooltip />} cursor={{ fill: '#F8FAFC', radius: 8 }} />
                    <Bar 
                      dataKey="hadir" 
                      name="Hadir" 
                      fill="#3B82F6" 
                      radius={[8, 8, 0, 0]} 
                      barSize={14} 
                    />
                    <Bar 
                      dataKey="izin" 
                      name="Izin / Sakit" 
                      fill="#F43F5E" 
                      radius={[8, 8, 0, 0]} 
                      barSize={14} 
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Empty State / Real-time note */}
            {totalHadirMingguan === 0 && totalIzinMingguan === 0 && (
              <div className="mt-3 text-center py-2 px-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400 flex items-center justify-center gap-2">
                <Sparkles size={14} className="text-amber-500" />
                <span>Belum ada karyawan absen minggu ini. Data grafik akan otomatis naik begitu ada absensi tercatat.</span>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="!p-6 h-full border-slate-100 shadow-sm rounded-3xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Activity size={18} />
                </div>
                <CardTitle className="text-base font-bold text-slate-800">Aktivitas Terbaru</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-4 mt-2">
              {stats.aktivitas.map((act, index) => (
                <motion.div 
                  key={act.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex gap-3 relative group"
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-50 z-10 group-hover:ring-blue-100 transition-all mt-1" />
                    {index < stats.aktivitas.length - 1 && (
                      <div className="w-px flex-1 bg-slate-100 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-xs font-semibold text-slate-800 leading-snug mb-1">{act.text}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      {act.time && <Clock size={11} />} {act.time}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
