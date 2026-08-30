import { supabase } from '../lib/supabase';
import { mockDashboardData } from '../data/mockData';

export const laporanService = {
  // Get data chart laporan
  // (Karena grouping & aggregate agak kompleks di Supabase JS client, 
  // kita fetch data row dan map, atau gunakan mock sementara jika data kosong)
  async getChartData() {
    // Di aplikasi nyata kita buat RPC/View di Supabase untuk agregasi per hari.
    // Di sini kita kombinasikan data statis dan sebagian data dinamis untuk demo.

    // 1. Ambil absensi (untuk persentase pie)
    const { data: absensiData } = await supabase.from('absensi').select('status');
    
    let pieData = [
      { name: 'Hadir', value: 85 },
      { name: 'Terlambat', value: 10 },
      { name: 'Sakit/Izin', value: 3 },
      { name: 'Alpha', value: 2 },
    ];

    if (absensiData && absensiData.length > 0) {
      let hadir = 0, terlambat = 0, sakitIzin = 0, alpha = 0;
      absensiData.forEach(a => {
        if (a.status === 'Hadir') hadir++;
        else if (a.status === 'Terlambat') terlambat++;
        else if (['Sakit', 'Izin'].includes(a.status)) sakitIzin++;
        else if (a.status === 'Alpha') alpha++;
      });
      pieData = [
        { name: 'Hadir', value: hadir },
        { name: 'Terlambat', value: terlambat },
        { name: 'Sakit/Izin', value: sakitIzin },
        { name: 'Alpha', value: alpha },
      ];
    }

    return {
      absensiData: [
        { name: 'Senin', hadir: 45, terlambat: 5, alpha: 0 },
        { name: 'Selasa', hadir: 42, terlambat: 7, alpha: 1 },
        { name: 'Rabu', hadir: 48, terlambat: 2, alpha: 0 },
        { name: 'Kamis', hadir: 40, terlambat: 8, alpha: 2 },
        { name: 'Jumat', hadir: 46, terlambat: 3, alpha: 1 },
      ],
      pieData,
    };
  },
};
