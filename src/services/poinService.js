import { supabase } from '../lib/supabase';

export const poinService = {
  // Get data poin dan riwayat per karyawan
  async getAll() {
    // 1. Get poin karyawan
    const { data: poinData, error: poinError } = await supabase
      .from('poin_karyawan')
      .select(`
        id, total_poin, peringkat,
        users!poin_karyawan_karyawan_id_fkey ( name )
      `)
      .order('total_poin', { ascending: false });

    if (poinError) throw poinError;

    // 2. Get riwayat poin untuk semua
    const { data: riwayatData, error: riwayatError } = await supabase
      .from('riwayat_poin')
      .select(`
        tanggal, aktivitas, poin,
        users!riwayat_poin_karyawan_id_fkey ( name )
      `)
      .order('tanggal', { ascending: false });

    if (riwayatError) throw riwayatError;

    // 3. Map riwayat ke poin karyawan
    return poinData.map((p, index) => {
      const nama = p.users?.name || '-';
      const riwayatKaryawan = riwayatData
        .filter(r => r.users?.name === nama)
        .slice(0, 5) // max 5 riwayat terakhir
        .map(r => ({
          tgl: r.tanggal,
          aktivitas: r.aktivitas,
          poin: r.poin,
        }));

      return {
        id: p.id,
        nama,
        totalPoin: p.total_poin,
        rank: p.peringkat || index + 1,
        riwayat: riwayatKaryawan,
      };
    });
  },
};
