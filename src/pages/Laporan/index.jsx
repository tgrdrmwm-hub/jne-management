import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { laporanService } from '../../services/laporanService';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';

const Laporan = () => {
  const [filter, setFilter] = useState('minggu');
  const [data, setData] = useState({
    absensiData: [],
    pieData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await laporanService.getChartData();
        setData(result);
      } catch (error) {
        console.error('Error fetching laporan data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filter]);

  const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'];

  const customTooltipStyle = {
    borderRadius: '12px', 
    border: 'none', 
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    padding: '12px 16px',
    backgroundColor: '#fff',
    fontWeight: 500
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/20">
              <BarChart3 size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Grafik & Analytics</h1>
          </div>
          <p className="text-gray-500 text-sm ml-12">Laporan komprehensif performa operasional</p>
        </div>
        <div className="w-full sm:w-48">
          <Select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: 'hari', label: 'Hari Ini' },
              { value: 'minggu', label: 'Minggu Ini' },
              { value: 'bulan', label: 'Bulan Ini' },
              { value: 'tahun', label: 'Tahun Ini' }
            ]}
          />
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">Memuat data grafik...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="!p-6">
              <CardHeader>
                <CardTitle>Tren Kehadiran Mingguan</CardTitle>
              </CardHeader>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.absensiData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12, fontWeight: 500}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                    <RechartsTooltip contentStyle={customTooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: 12, fontWeight: 600}} />
                    <Line type="monotone" dataKey="hadir" name="Hadir" stroke="#10B981" strokeWidth={4} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6}} />
                    <Line type="monotone" dataKey="terlambat" name="Terlambat" stroke="#F59E0B" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="!p-6">
              <CardHeader>
                <CardTitle>Persentase Status Kehadiran</CardTitle>
              </CardHeader>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={85}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={customTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>


        </div>
      )}
    </div>
  );
};

export default Laporan;
