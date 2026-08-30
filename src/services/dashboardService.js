import { supabase } from '../lib/supabase';

export const dashboardService = {
  // Get statistik dashboard
  async getStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Karyawan Hadir Hari Ini
      const { count: karyawanHadir } = await supabase
        .from('absensi')
        .select('*', { count: 'exact', head: true })
        .eq('tanggal', today)
        .in('status', ['Hadir', 'Terlambat']);

      // Karyawan Izin/Sakit
      const { count: karyawanIzin } = await supabase
        .from('absensi')
        .select('*', { count: 'exact', head: true })
        .eq('tanggal', today)
        .in('status', ['Izin', 'Sakit', 'Cuti']);

      // Total Karyawan
      const { count: totalKaryawan } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Aktivitas (Absensi)
      const { data: aktAbsensi } = await supabase
        .from('absensi')
        .select('tanggal, jam_masuk, status, users!absensi_user_id_fkey(name)')
        .order('tanggal', { ascending: false })
        .order('jam_masuk', { ascending: false })
        .limit(5);

      // Proses aktivitas
      let aktivitas = [];
      
      if (aktAbsensi) {
        aktivitas = aktAbsensi.map((a, index) => {
          let timeMs = Date.now();
          if (a.jam_masuk) {
             const [hours, minutes] = a.jam_masuk.split(':');
             const d = new Date(a.tanggal);
             d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
             timeMs = d.getTime();
          } else {
             timeMs = new Date(a.tanggal).getTime();
          }
          
          const diffMs = Date.now() - timeMs;
          const diffMins = Math.floor(diffMs / 60000);
          
          let timeLabel = '';
          if (diffMins < 1) timeLabel = 'Baru saja';
          else if (diffMins < 60) timeLabel = `${diffMins} menit yang lalu`;
          else if (diffMins < 1440) timeLabel = `${Math.floor(diffMins / 60)} jam yang lalu`;
          else timeLabel = `${Math.floor(diffMins / 1440)} hari yang lalu`;

          return {
            id: index + 1,
            text: `${a.users?.name || 'Karyawan'} melakukan absensi (${a.status})`,
            time: timeLabel,
            timestamp: timeMs
          };
        });
      }

      return {
        karyawanHadir: karyawanHadir || 0,
        karyawanIzin: karyawanIzin || 0,
        totalKaryawan: totalKaryawan || 0,
        aktivitas: aktivitas.length > 0 ? aktivitas : [{ id: 1, text: 'Belum ada aktivitas', time: '' }]
      };
    } catch (error) {
      console.error('Error in getStats:', error);
      // Fallback
      return {
        karyawanHadir: 0,
        karyawanIzin: 0,
        totalKaryawan: 0,
        aktivitas: [{ id: 1, text: 'Belum ada aktivitas', time: '' }]
      };
    }
  }
};
