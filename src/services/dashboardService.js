import { supabase } from '../lib/supabase';

export const dashboardService = {
  // Get statistik dashboard
  async getStats() {
    // Total Pengantaran
    const { count: totalDiantar } = await supabase
      .from('pengantaran_gudang')
      .select('*', { count: 'exact', head: true });

    // Total Pengambilan
    const { count: totalDiambil } = await supabase
      .from('pengambilan_paket')
      .select('*', { count: 'exact', head: true });

    // Karyawan Hadir Hari Ini
    const today = new Date().toISOString().split('T')[0];
    const { count: karyawanHadir } = await supabase
      .from('absensi')
      .select('*', { count: 'exact', head: true })
      .eq('tanggal', today)
      .in('status', ['Hadir', 'Terlambat']);

    // Total Poin
    const { data: poinData } = await supabase
      .from('poin_karyawan')
      .select('total_poin');
    const totalPoin = poinData?.reduce((acc, curr) => acc + (curr.total_poin || 0), 0) || 0;

    // Aktivitas (Pengantaran Gudang)
    const { data: aktGudang } = await supabase
      .from('pengantaran_gudang')
      .select('tanggal, jam, gudang, users!pengantaran_gudang_kurir_id_fkey(name)')
      .order('tanggal', { ascending: false })
      .order('jam', { ascending: false })
      .limit(3);

    // Aktivitas (Pengambilan)
    const { data: aktPaket } = await supabase
      .from('pengambilan_paket')
      .select('tanggal, jam, lokasi, users!pengambilan_paket_pengambil_id_fkey(name)')
      .order('tanggal', { ascending: false })
      .order('jam', { ascending: false })
      .limit(3);

    // Proses dan merge aktivitas
    const parseTime = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}`);
    
    let aktivitas = [];
    
    if (aktGudang) {
      aktivitas.push(...aktGudang.map(g => ({
        text: `${g.users?.name || 'Kurir'} mengantar paket ke ${g.gudang}`,
        timestamp: parseTime(g.tanggal, g.jam).getTime(),
      })));
    }
    
    if (aktPaket) {
      aktivitas.push(...aktPaket.map(p => ({
        text: `${p.users?.name || 'Kurir'} mengambil paket dari ${p.lokasi}`,
        timestamp: parseTime(p.tanggal, p.jam).getTime(),
      })));
    }

    // Sort by terbaru, ambil 3-5 teratas
    aktivitas.sort((a, b) => b.timestamp - a.timestamp);
    aktivitas = aktivitas.slice(0, 5).map((act, index) => {
      const diffMs = Date.now() - act.timestamp;
      const diffMins = Math.floor(diffMs / 60000);
      
      let timeLabel = '';
      if (diffMins < 1) timeLabel = 'Baru saja';
      else if (diffMins < 60) timeLabel = `${diffMins} menit yang lalu`;
      else if (diffMins < 1440) timeLabel = `${Math.floor(diffMins / 60)} jam yang lalu`;
      else timeLabel = `${Math.floor(diffMins / 1440)} hari yang lalu`;

      return {
        id: index + 1,
        text: act.text,
        time: timeLabel,
      };
    });

    return {
      totalDiantar: totalDiantar || 0,
      totalDiambil: totalDiambil || 0,
      karyawanHadir: karyawanHadir || 0,
      totalPoin,
      aktivitas: aktivitas.length > 0 ? aktivitas : [{ id: 1, text: 'Belum ada aktivitas', time: '' }]
    };
  }
};
