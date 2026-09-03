import { supabase } from '../lib/supabase';

export const poinService = {
  // Fetch user's current points
  async getTotalPoin(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('poin')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.poin || 0;
  },

  // Fetch user's point history
  async getRiwayatPoin(userId) {
    const { data, error } = await supabase
      .from('riwayat_poin')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  },

  // Fetch leaderboard
  async getLeaderboard() {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, poin')
      .order('poin', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data;
  },

  // Add points to user
  async addPoin(userId, jumlahPoin, keterangan, options = {}) {
    try {
      // 1. Catat ke riwayat
      const insertPayload = {
        user_id: userId,
        jumlah_poin: jumlahPoin,
        keterangan: keterangan
      };
      if (options?.absensiId) insertPayload.absensi_id = options.absensiId;
      if (options?.laporanId) insertPayload.laporan_id = options.laporanId;

      let { error: historyError } = await supabase
        .from('riwayat_poin')
        .insert(insertPayload);

      // Fallback jika kolom absensi_id / laporan_id belum dijalankan di SQL Editor Supabase
      if (historyError && (historyError.message?.includes('schema cache') || historyError.code === 'PGRST204')) {
        console.warn('Kolom relasi belum ada di database, menyimpan poin dasar:', historyError.message);
        const { error: fallbackError } = await supabase
          .from('riwayat_poin')
          .insert({
            user_id: userId,
            jumlah_poin: jumlahPoin,
            keterangan: keterangan
          });
        if (fallbackError) throw fallbackError;
      } else if (historyError) {
        throw historyError;
      }

      // 2. Ambil poin saat ini (sudah otomatis dihitung/disinkronkan oleh trigger DB, atau fallback update)
      const currentPoin = await this.getTotalPoin(userId);
      return currentPoin;
    } catch (error) {
      console.error('Error adding poin:', error);
      throw error;
    }
  }
};
