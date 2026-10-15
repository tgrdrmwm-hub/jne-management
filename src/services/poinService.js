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

  // Status apakah sistem poin otomatis aktif (sementara dinolkan/ditangguhkan)
  isPoinEnabled() {
    return false; // Skema dinolkan sementara karena masih dalam perumusan ulang
  },

  // Reset semua poin user ke 0 dan bersihkan riwayat
  async resetAllPoin() {
    try {
      await supabase.from('riwayat_poin').delete().neq('id', 0);
      await supabase.from('users').update({ poin: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      return true;
    } catch (e) {
      console.error('Error resetting poin:', e);
      throw e;
    }
  },

  // Add points to user
  async addPoin(userId, jumlahPoin, keterangan, options = {}) {
    // Jika skema poin dinonaktifkan sementara, langsung kembalikan 0 agar poin tetap 0
    if (!this.isPoinEnabled()) {
      return 0;
    }

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
