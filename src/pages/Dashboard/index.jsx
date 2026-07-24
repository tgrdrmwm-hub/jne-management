import { useState, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  UserCheck, 
  Award,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { dashboardService } from '../../services/dashboardService';
import { chartDataPengantaran } from '../../data/mockData';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
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
          <div className={`p-3 rounded-xl ${gradient} shadow-lg`}>
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

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalDiantar: 0,
    totalDiambil: 0,
    karyawanHadir: 0,
    totalPoin: 0,
    aktivitas: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-500">Memuat dashboard...</div>;
  }

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
          <p className="text-gray-500 text-sm mt-1">Ringkasan aktivitas operasional hari ini</p>
        </div>
        <div className="text-sm font-semibold text-[var(--color-jne-blue)] bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-blue-100">
          <Clock size={16} />
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Paket Diantar" 
          value={stats.totalDiantar} 
          icon={Truck} 
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          trend="up"
          trendValue="+12%"
          delay={0}
        />
        <StatCard 
          title="Paket Diambil" 
          value={stats.totalDiambil} 
          icon={Package} 
          gradient="bg-gradient-to-br from-red-500 to-rose-600"
          trend="up"
          trendValue="+8%"
          delay={0.1}
        />
        <StatCard 
          title="Karyawan Hadir" 
          value={stats.karyawanHadir} 
          icon={UserCheck} 
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
          trend="up"
          trendValue="96%"
          delay={0.2}
        />
        <StatCard 
          title="Total Poin" 
          value={stats.totalPoin} 
          icon={Award} 
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
          trend="up"
          trendValue="+24"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="!p-6">
            <CardHeader>
              <div>
                <CardTitle>Aktivitas Pengantaran & Pengambilan</CardTitle>
                <p className="text-xs text-gray-400 mt-1">Data minggu ini</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                <TrendingUp size={14} />
                Naik 15%
              </div>
            </CardHeader>
            <div className="h-80 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataPengantaran} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12, fontWeight: 500}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                  <RechartsTooltip 
                    cursor={{fill: '#F8FAFC', radius: 8}} 
                    contentStyle={{
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                      padding: '12px 16px'
                    }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{fontSize: 12, fontWeight: 600}} />
                  <Bar dataKey="diantar" name="Diantar" fill="var(--color-jne-blue)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="diambil" name="Diambil" fill="var(--color-jne-red)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="!p-6 h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50">
                  <Activity size={16} className="text-[var(--color-jne-blue)]" />
                </div>
                <CardTitle>Aktivitas Terbaru</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-5 mt-2">
              {stats.aktivitas.map((act, index) => (
                <motion.div 
                  key={act.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex gap-4 relative group"
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 ring-4 ring-blue-50 z-10 group-hover:ring-blue-100 transition-all" />
                    {index < stats.aktivitas.length - 1 && (
                      <div className="w-px flex-1 bg-gradient-to-b from-blue-200 to-transparent mt-1" />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-medium text-gray-800 leading-snug mb-1.5">{act.text}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
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
