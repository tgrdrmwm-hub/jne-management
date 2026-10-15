import { supabase } from '../lib/supabase';
import { aktivitasService } from './aktivitasService';
import { poinService } from './poinService';

export const laporanHarianService = {
  // Ambil semua laporan harian (untuk Admin/Owner/Developer atau List Umum)
  async getAll() {
    let { data, error } = await supabase
      .from('laporan_harian')
      .select(`
        id, kegiatan, deskripsi, status, created_at, user_id, bukti_foto, nama_penerima,
        users!laporan_harian_user_id_fkey ( name, role )
      `)
      .order('id', { ascending: false });

    // Fallback jika tabel laporan_harian belum dibuat sama sekali di Supabase
    if (error && (error.code === '42P01' || error.message?.includes('42P01') || (error.message?.includes('relation') && error.message?.includes('does not exist')))) {
      console.warn('Tabel laporan_harian belum dibuat di Supabase. Menampilkan list kosong.');
      return [];
    }

    // Fallback otomatis jika kolom bukti_foto / nama_penerima belum ditambahkan di database Supabase
    if (error && (error.code === '42703' || error.message?.includes('bukti_foto') || error.message?.includes('nama_penerima') || error.message?.includes('column'))) {
      console.warn('Kolom bukti_foto/nama_penerima belum ada di database Supabase, menggunakan fallback query dasar.');
      const fallback = await supabase
        .from('laporan_harian')
        .select(`
          id, kegiatan, deskripsi, status, created_at, user_id,
          users!laporan_harian_user_id_fkey ( name, role )
        `)
        .order('id', { ascending: false });

      if (fallback.error) {
        if (fallback.error.code === '42P01' || fallback.error.message?.includes('42P01')) return [];
        throw fallback.error;
      }
      return fallback.data || [];
    }

    if (error) throw error;
    return data || [];
  },

  // Ambil laporan berdasarkan user
  async getByUser(userId) {
    let { data, error } = await supabase
      .from('laporan_harian')
      .select('id, kegiatan, deskripsi, status, created_at, user_id, bukti_foto, nama_penerima')
      .eq('user_id', userId)
      .order('id', { ascending: false });

    // Fallback jika tabel laporan_harian belum dibuat sama sekali di Supabase
    if (error && (error.code === '42P01' || error.message?.includes('42P01') || (error.message?.includes('relation') && error.message?.includes('does not exist')))) {
      console.warn('Tabel laporan_harian belum dibuat di Supabase. Menampilkan list kosong.');
      return [];
    }

    // Fallback otomatis jika kolom bukti_foto / nama_penerima belum ada di database Supabase
    if (error && (error.code === '42703' || error.message?.includes('bukti_foto') || error.message?.includes('nama_penerima') || error.message?.includes('column'))) {
      console.warn('Kolom bukti_foto/nama_penerima belum ada di database Supabase, menggunakan fallback getByUser dasar.');
      const fallback = await supabase
        .from('laporan_harian')
        .select('id, kegiatan, deskripsi, status, created_at, user_id')
        .eq('user_id', userId)
        .order('id', { ascending: false });

      if (fallback.error) {
        if (fallback.error.code === '42P01' || fallback.error.message?.includes('42P01')) return [];
        throw fallback.error;
      }
      return fallback.data || [];
    }

    if (error) throw error;
    return data || [];
  },

  // Kirim laporan baru
  async createReport({ userId, userName, kegiatan, deskripsi, status, buktiFoto, namaPenerima }) {
    const nowIso = new Date().toISOString();
    const payload = {
      user_id: userId,
      kegiatan,
      deskripsi,
      status: status || 'Selesai',
      created_at: nowIso,
    };
    if (buktiFoto) payload.bukti_foto = buktiFoto;
    if (namaPenerima) payload.nama_penerima = namaPenerima;

    let { data, error } = await supabase
      .from('laporan_harian')
      .insert(payload)
      .select()
      .single();

    // Fallback jika database Supabase belum memiliki kolom bukti_foto / nama_penerima
    if (error && (error.code === '42703' || error.message?.includes('bukti_foto') || error.message?.includes('nama_penerima') || error.message?.includes('column'))) {
      console.warn('Gagal insert kolom bukti_foto/nama_penerima ke Supabase. Mencoba fallback dengan kolom standar.');
      const basePayload = {
        user_id: userId,
        kegiatan,
        deskripsi,
        status: status || 'Selesai',
        created_at: nowIso,
      };
      const fallback = await supabase
        .from('laporan_harian')
        .insert(basePayload)
        .select()
        .single();

      if (fallback.error) throw fallback.error;
      data = fallback.data;
      error = null;
    }

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
  },

  // Import Batch Laporan Harian (Excel / CSV)
  async createBatchReports(items, currentUser) {
    if (!items || items.length === 0) return [];

    const payloads = items.map((item) => ({
      user_id: item.user_id || currentUser?.id,
      kegiatan: item.kegiatan,
      deskripsi: item.deskripsi || '',
      status: item.status || 'Selesai',
      created_at: item.created_at || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('laporan_harian')
      .insert(payloads)
      .select();

    if (error) throw error;

    // Catat log aktivitas sistem
    try {
      await aktivitasService.logActivity({
        user_id: currentUser?.id || null,
        title: 'Import Laporan Harian Berhasil',
        description: `${currentUser?.name || 'User'} mengimpor ${payloads.length} data laporan harian ke sistem via file.`,
        type: 'laporan',
      });
    } catch (e) {
      console.warn('Gagal mencatat log aktivitas import laporan:', e);
    }

    window.dispatchEvent(new Event('laporanUpdated'));
    window.dispatchEvent(new Event('aktivitasUpdated'));
    return data || [];
  }
};
