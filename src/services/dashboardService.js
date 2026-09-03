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
        .select('tanggal, jam_masuk, status, users!absensi_karyawan_id_fkey(name)')
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

      // Ambil data statistik mingguan nyata
      const weeklyAttendance = await this.getWeeklyAttendance();

      return {
        karyawanHadir: karyawanHadir || 0,
        karyawanIzin: karyawanIzin || 0,
        totalKaryawan: totalKaryawan || 0,
        aktivitas: aktivitas.length > 0 ? aktivitas : [{ id: 1, text: 'Belum ada aktivitas', time: '' }],
        weeklyAttendance
      };
    } catch (error) {
      console.error('Error in getStats:', error);
      const fallbackWeekly = await this.getWeeklyAttendance();
      return {
        karyawanHadir: 0,
        karyawanIzin: 0,
        totalKaryawan: 0,
        aktivitas: [{ id: 1, text: 'Belum ada aktivitas', time: '' }],
        weeklyAttendance: fallbackWeekly
      };
    }
  },

  // Hitung kehadiran mingguan (Senin - Minggu) berdasarkan data real di database
  async getWeeklyAttendance() {
    try {
      const now = new Date();
      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      const shortDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

      // Ambil hari Senin dari minggu berjalan
      const dayOfWeek = now.getDay();
      const distanceToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - distanceToMonday);
      monday.setHours(0, 0, 0, 0);

      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        weekDays.push({
          dateStr,
          dayName: days[i],
          shortDay: shortDays[i],
          displayDate: `${d.getDate()} ${d.toLocaleDateString('id-ID', { month: 'short' })}`,
          isToday: dateStr === now.toISOString().split('T')[0]
        });
      }

      const startDate = weekDays[0].dateStr;
      const endDate = weekDays[6].dateStr;

      // Ambil absensi dalam rentang minggu ini
      const { data: absensiList, error } = await supabase
        .from('absensi')
        .select('tanggal, status')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);

      if (error) throw error;

      return weekDays.map(item => {
        const matches = (absensiList || []).filter(a => a.tanggal === item.dateStr);
        const hadir = matches.filter(a => a.status === 'Hadir' || a.status === 'Terlambat').length;
        const izin = matches.filter(a => ['Izin', 'Sakit', 'Cuti'].includes(a.status)).length;
        const alpha = matches.filter(a => a.status === 'Alpha').length;

        return {
          name: item.dayName,
          shortDay: item.shortDay,
          displayDate: item.displayDate,
          date: item.dateStr,
          hadir,
          izin,
          alpha,
          total: hadir + izin + alpha,
          isToday: item.isToday
        };
      });
    } catch (error) {
      console.error('Error in getWeeklyAttendance:', error);
      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      return days.map(name => ({ name, hadir: 0, izin: 0, alpha: 0, total: 0 }));
    }
  }
};
