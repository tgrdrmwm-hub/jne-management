import { supabase } from '../lib/supabase';
import { dashboardService } from './dashboardService';

export const laporanService = {
  // Get data chart laporan dari database nyata
  async getChartData() {
    // 1. Ambil absensi (untuk persentase pie)
    const { data: absensiData } = await supabase.from('absensi').select('status');
    
    let pieData = [];

    if (absensiData && absensiData.length > 0) {
      let hadir = 0, terlambat = 0, sakitIzin = 0, alpha = 0;
      absensiData.forEach(a => {
        if (a.status === 'Hadir') hadir++;
        else if (a.status === 'Terlambat') terlambat++;
        else if (['Sakit', 'Izin', 'Cuti'].includes(a.status)) sakitIzin++;
        else if (a.status === 'Alpha') alpha++;
      });
      pieData = [
        { name: 'Hadir', value: hadir },
        { name: 'Terlambat', value: terlambat },
        { name: 'Sakit/Izin', value: sakitIzin },
        { name: 'Alpha', value: alpha },
      ].filter(p => p.value > 0);
    }

    if (pieData.length === 0) {
      pieData = [{ name: 'Belum ada data', value: 1 }];
    }

    // 2. Ambil data mingguan real-time
    const weeklyData = await dashboardService.getWeeklyAttendance();
    const absensiWeekly = weeklyData.map(w => ({
      name: w.name,
      hadir: w.hadir,
      izin: w.izin,
      alpha: w.alpha || 0
    }));

    return {
      absensiData: absensiWeekly,
      pieData,
    };
  },
};
