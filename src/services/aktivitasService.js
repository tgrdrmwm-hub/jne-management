import { supabase } from '../lib/supabase';

export const aktivitasService = {
  // Ambil aktivitas terbaru
  async getActivities(limit = 10) {
    const { data, error } = await supabase
      .from('aktivitas')
      .select(`
        id, title, description, type, created_at,
        users!aktivitas_user_id_fkey ( name )
      `)
      .order('id', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(item => {
      // Format tanggal ke waktu relatif (misal: "12:30", atau "Kemarin")
      const date = new Date(item.created_at);
      const timeString = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
      
      return {
        id: item.id,
        title: item.title,
        desc: item.description,
        type: item.type,
        time: timeString,
        timestamp: new Date(item.created_at).getTime(),
        user_name: item.users?.name || 'Sistem'
      };
    });
  },

  // Tambah log aktivitas
  async logActivity({ user_id, absensi_id, laporan_id, title, description, type }) {
    const payload = {
      user_id: user_id || null,
      title,
      description,
      type,
    };
    if (absensi_id) payload.absensi_id = absensi_id;
    if (laporan_id) payload.laporan_id = laporan_id;

    let { error } = await supabase
      .from('aktivitas')
      .insert(payload);

    if (error && (error.message?.includes('schema cache') || error.code === 'PGRST204')) {
      console.warn('Kolom relasi aktivitas belum ada, fallback tanpa relasi:', error.message);
      await supabase.from('aktivitas').insert({
        user_id: user_id || null,
        title,
        description,
        type,
      });
      error = null;
    }

    if (error) {
      console.error('Gagal mencatat aktivitas:', error);
      return false;
    }

    // Beritahu Header untuk refresh notifikasi
    window.dispatchEvent(new Event('aktivitasUpdated'));
    return true;
  },
};
