import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  UserCheck, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart2,
  CalendarDays,
  Sparkles,
  MapPin,
  ChevronRight,
  Sun,
  Sunset
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { dashboardService } from '../../services/dashboardService';
import { kalenderService } from '../../services/kalenderService';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer 
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
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const [data, events] = await Promise.all([
        dashboardService.getStats(),
        kalenderService.getUpcoming(3)
      ]);
      setStats(data);
      setUpcomingEvents(events);
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
    window.addEventListener('kalenderUpdated', handleRefresh);

    return () => {
      window.removeEventListener('absensiUpdated', handleRefresh);
      window.removeEventListener('aktivitasUpdated', handleRefresh);
      window.removeEventListener('kalenderUpdated', handleRefresh);
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
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Operasional</h1>
          <p className="text-slate-500 text-xs mt-0.5">Monitoring aktivitas JNE, perputaran 2 shift kerja, dan kehadiran real-time</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Operational Shift Indicator */}
          {new Date().getHours() >= 13 && new Date().getHours() < 22 ? (
            <div className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-blue-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <Sunset size={13} className="text-blue-600" />
              <span>Shift Siang Berjalan</span>
              <span className="font-mono text-[11px] text-blue-600 font-medium">(13:00 - 22:00)</span>
            </div>
          ) : new Date().getHours() >= 8 && new Date().getHours() < 17 ? (
            <div className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-amber-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <Sun size={13} className="text-amber-600" />
              <span>Shift Pagi Berjalan</span>
              <span className="font-mono text-[11px] text-amber-600 font-medium">(08:00 - 17:00)</span>
            </div>
          ) : (
            <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-slate-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Di Luar Jam Operasional</span>
              <span className="font-mono text-[11px] text-slate-500 font-medium">(2 Shift: 08-17 & 13-22)</span>
            </div>
          )}

          <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl flex items-center gap-2 border border-slate-200/90 shadow-xs">
            <Clock size={13} className="text-blue-600" />
            <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
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
          <Card className="!p-6 border-slate-200/90 shadow-xs rounded-2xl">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-800">Tren Kehadiran Mingguan</CardTitle>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                    Real-time
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Senin – Minggu berdasarkan data presensi aktual</p>
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
                <span>Belum ada karyawan presensi minggu ini. Data grafik akan otomatis naik begitu ada presensi tercatat.</span>
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
          <Card className="!p-6 h-full border-slate-200/90 shadow-xs rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Activity size={18} />
                </div>
                <CardTitle className="text-base font-bold text-slate-800">Aktivitas Terbaru</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-4 mt-2">
              {stats.aktivitas.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  Belum ada aktivitas terbaru tercatat
                </div>
              ) : (
                stats.aktivitas.map((act, index) => (
                  <motion.div 
                    key={act.id || index} 
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
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Upcoming Events / Kalender Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="!p-6 border-slate-200/90 shadow-xs rounded-2xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays size={20} />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-800">
                  Agenda & Kegiatan Mendatang
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Jadwal operasional, briefing kurir, dan agenda kantor terdekat
                </p>
              </div>
            </div>

            <Link
              to="/kalender"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 px-3.5 py-2 rounded-xl transition-all"
            >
              <span>Buka Kalender Lengkap</span>
              <ChevronRight size={14} />
            </Link>
          </CardHeader>

          {upcomingEvents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Belum ada kegiatan mendatang yang dijadwalkan.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-4 rounded-2xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-white transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-2">
                      <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {event.kategori}
                      </span>
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={11} />
                        {event.jam_mulai ? `${event.jam_mulai} WIB` : 'Seharian'}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">
                      {event.judul}
                    </h4>
                    {event.deskripsi && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {event.deskripsi}
                      </p>
                    )}
                    {event.pic_nama && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <span className="truncate">PIC: {event.pic_nama}</span>
                        {event.staff_terlibat && event.staff_terlibat.length > 0 && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold text-[10px] border border-blue-100">
                            +{event.staff_terlibat.length} tim
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-600">
                      {event.tanggal_mulai}
                    </span>
                    {event.lokasi && (
                      <span className="flex items-center gap-1 truncate max-w-[140px]">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{event.lokasi}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;
