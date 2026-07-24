import { supabase } from '../lib/supabase';

export const absensiService = {
  // Get absensi hari ini (atau semua)
  async getAll() {
    const { data, error } = await supabase
      .from('absensi')
      .select(`
        id, tanggal, jam_masuk, jam_keluar, total_jam, status,
        users!absensi_karyawan_id_fkey ( name )
      `)
      .order('id', { ascending: false });

    if (error) throw error;

    return data.map(row => ({
      id: row.id,
      nama: row.users?.name || '-',
      tanggal: row.tanggal,
      jamMasuk: row.jam_masuk?.substring(0, 5) || '-',
      jamKeluar: row.jam_keluar ? row.jam_keluar.substring(0, 5) : '-',
      totalJam: row.total_jam || 0,
      status: row.status,
    }));
  },

  // Clock In
  async clockIn(userId) {
    const now = new Date();
    const tanggal = now.toISOString().split('T')[0];
    const jamMasuk = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Cek sudah clock in
    const { data: existing } = await supabase
      .from('absensi')
      .select('id')
      .eq('karyawan_id', userId)
      .eq('tanggal', tanggal)
      .maybeSingle();

    if (existing) throw new Error('Anda sudah clock in hari ini.');

    // Status: Terlambat jika > 08:15
    const batasJam = new Date();
    batasJam.setHours(8, 15, 0, 0);
    const status = now > batasJam ? 'Terlambat' : 'Hadir';

    const { data, error } = await supabase
      .from('absensi')
      .insert({
        karyawan_id: userId,
        tanggal,
        jam_masuk: jamMasuk,
        status,
      })
      .select(`
        id, tanggal, jam_masuk, jam_keluar, total_jam, status,
        users!absensi_karyawan_id_fkey ( name )
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      nama: data.users?.name || '-',
      tanggal: data.tanggal,
      jamMasuk: data.jam_masuk?.substring(0, 5),
      jamKeluar: '-',
      totalJam: 0,
      status: data.status,
    };
  },

  // Clock Out
  async clockOut(userId) {
    const now = new Date();
    const tanggal = now.toISOString().split('T')[0];
    const jamKeluar = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Cari data clock in hari ini
    const { data: existing, error: errCek } = await supabase
      .from('absensi')
      .select('id, jam_masuk')
      .eq('karyawan_id', userId)
      .eq('tanggal', tanggal)
      .is('jam_keluar', null)
      .maybeSingle();

    if (errCek || !existing) throw new Error('Anda belum clock in atau sudah clock out.');

    // Hitung jam (simplifikasi jam utuh)
    const masukParts = existing.jam_masuk.split(':');
    const keluarParts = jamKeluar.split(':');
    const totalJam = Math.max(0, parseInt(keluarParts[0]) - parseInt(masukParts[0]));

    const { error } = await supabase
      .from('absensi')
      .update({
        jam_keluar: jamKeluar,
        total_jam: totalJam,
      })
      .eq('id', existing.id);

    if (error) throw error;

    return { jamKeluar, totalJam };
  },
};
