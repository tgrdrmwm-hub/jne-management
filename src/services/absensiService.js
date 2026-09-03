import { supabase } from '../lib/supabase';
import { aktivitasService } from './aktivitasService';

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
    const jamMasuk = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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

    // Log ke tabel aktivitas
    await aktivitasService.logActivity({
      user_id: userId,
      absensi_id: data.id,
      title: 'Clock In Berhasil',
      description: `${data.users?.name || 'Karyawan'} absen masuk pada ${jamMasuk} (Status: ${status})`,
      type: 'absen'
    });

    // Dispatch event agar Header (Notifikasi) otomatis update
    window.dispatchEvent(new Event('absensiUpdated'));

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
    const jamKeluar = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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

    // Ambil nama user untuk log
    const { data: userData } = await supabase.from('users').select('name').eq('id', userId).single();

    // Log ke tabel aktivitas
    await aktivitasService.logActivity({
      user_id: userId,
      title: 'Clock Out Berhasil',
      description: `${userData?.name || 'Karyawan'} absen keluar pada ${jamKeluar} (Total: ${totalJam} Jam)`,
      type: 'absen'
    });

    // Dispatch event agar Header (Notifikasi) otomatis update
    window.dispatchEvent(new Event('absensiUpdated'));

    return { jamKeluar, totalJam };
  },

  // Tambah Absensi Manual
  async addManual(data) {
    let total_jam = 0;
    if (data.jam_masuk && data.jam_keluar) {
      const masukParts = data.jam_masuk.split(':');
      const keluarParts = data.jam_keluar.split(':');
      total_jam = Math.max(0, parseInt(keluarParts[0]) - parseInt(masukParts[0]));
    }

    const { data: insertedData, error } = await supabase
      .from('absensi')
      .insert({
        karyawan_id: data.karyawan_id,
        tanggal: data.tanggal,
        jam_masuk: data.jam_masuk || null,
        jam_keluar: data.jam_keluar || null,
        total_jam,
        status: data.status,
      })
      .select()
      .single();

    if (error) throw error;

    // Ambil nama user untuk log
    const { data: userData } = await supabase.from('users').select('name').eq('id', data.karyawan_id).single();

    // Log ke tabel aktivitas
    await aktivitasService.logActivity({
      user_id: data.karyawan_id,
      absensi_id: insertedData?.id,
      title: 'Absensi Manual',
      description: `Data absensi ditambahkan manual untuk ${userData?.name || 'Karyawan'} (Tanggal: ${data.tanggal})`,
      type: 'system'
    });
    
    // Dispatch event agar Header (Notifikasi) otomatis update
    window.dispatchEvent(new Event('absensiUpdated'));
    
    return insertedData;
  },

  // Hapus Data Absensi (Khusus Admin/Developer)
  async deleteAbsensi(id) {
    const { error } = await supabase
      .from('absensi')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Log ke tabel aktivitas
    await aktivitasService.logActivity({
      user_id: null,
      title: 'Data Absensi Dihapus',
      description: `Sistem menghapus log absensi ID: ${id}`,
      type: 'system'
    });
    
    // Trigger refresh
    window.dispatchEvent(new Event('absensiUpdated'));
    
    return true;
  }
};
