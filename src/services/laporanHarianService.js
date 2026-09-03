import { supabase } from '../lib/supabase';
import { aktivitasService } from './aktivitasService';
import { poinService } from './poinService';

export const laporanHarianService = {
  // Ambil semua laporan harian (untuk Admin/Owner/Developer atau List Umum)
  async getAll() {
    const { data, error } = await supabase
      .from('laporan_harian')
      .select(`
        id, kegiatan, deskripsi, status, created_at, user_id,
        users!laporan_harian_user_id_fkey ( name, role )
      `)
      .order('id', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Ambil laporan berdasarkan user
  async getByUser(userId) {
    const { data, error } = await supabase
      .from('laporan_harian')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Kirim laporan baru
  async createReport({ userId, userName, kegiatan, deskripsi, status }) {
    const { data, error } = await supabase
      .from('laporan_harian')
      .insert({
        user_id: userId,
        kegiatan,
        deskripsi,
        status: status || 'Selesai',
      })
      .select()
      .single();

    if (error) throw error;

    // 1. Catat log aktivitas tertaut laporan_id
    await aktivitasService.logActivity({
      user_id: userId,
      laporan_id: data.id,
      title: 'Laporan Harian Dikirim',
      description: `${userName || 'Karyawan'} mengirim laporan: ${kegiatan} (${status})`,
      type: 'laporan',
    });

    // 2. Tambah poin jika status 'Selesai' tertaut laporanId
    if (status === 'Selesai') {
      try {
        await poinService.addPoin(
          userId, 
          5, 
          `Laporan Harian Selesai: ${kegiatan}`,
          { laporanId: data.id }
        );
      } catch (errPoin) {
        console.error('Gagal menambahkan poin laporan:', errPoin);
      }
    }

    window.dispatchEvent(new Event('laporanUpdated'));
    return data;
  },

  // Hapus laporan harian
  async deleteReport(id) {
    const { error } = await supabase
      .from('laporan_harian')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Dispatch event untuk update UI & Header
    window.dispatchEvent(new Event('laporanUpdated'));
    window.dispatchEvent(new Event('aktivitasUpdated'));

    return true;
  }
};
