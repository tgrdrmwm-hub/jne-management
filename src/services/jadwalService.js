import { supabase } from '../lib/supabase';

export const jadwalService = {
  // Get semua jadwal shift
  async getAll() {
    const { data, error } = await supabase
      .from('jadwal_shift')
      .select(`
        id, shift, hari, jam_masuk, jam_pulang, status, catatan,
        users!jadwal_shift_karyawan_id_fkey ( name )
      `)
      .order('id', { ascending: true });

    if (error) throw error;

    return data.map(row => ({
      id: row.id,
      nama: row.users?.name || '-',
      shift: row.shift,
      hari: row.hari,
      jamMasuk: row.jam_masuk?.substring(0, 5) || '-',
      jamPulang: row.jam_pulang?.substring(0, 5) || '-',
      status: row.status,
      catatan: row.catatan,
    }));
  },
};
