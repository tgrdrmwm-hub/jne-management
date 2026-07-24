import { supabase } from '../lib/supabase';

export const paketService = {
  // Get semua data pengambilan paket
  async getAll() {
    const { data, error } = await supabase
      .from('pengambilan_paket')
      .select(`
        id, resi, jumlah, lokasi, tanggal, jam, status, catatan,
        users!pengambilan_paket_pengambil_id_fkey ( name )
      `)
      .order('id', { ascending: false });

    if (error) throw error;

    return data.map(row => ({
      ...row,
      pengambil: row.users?.name || '-',
      users: undefined,
    }));
  },

  // Tambah data pengambilan
  async create({ resi, pengambil, lokasi, jumlah, status, catatan }) {
    let pengambilId = null;
    if (pengambil) {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('name', pengambil)
        .single();
      if (users) pengambilId = users.id;
    }

    const now = new Date();
    const tanggal = now.toISOString().split('T')[0];
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });

    const { data, error } = await supabase
      .from('pengambilan_paket')
      .insert({
        resi,
        pengambil_id: pengambilId,
        jumlah: parseInt(jumlah),
        lokasi,
        tanggal,
        jam,
        status: status || 'Pending',
        catatan: catatan || '-',
      })
      .select(`
        id, resi, jumlah, lokasi, tanggal, jam, status, catatan,
        users!pengambilan_paket_pengambil_id_fkey ( name )
      `)
      .single();

    if (error) throw error;

    return { ...data, pengambil: data.users?.name || '-', users: undefined };
  },

  // Update data pengambilan
  async update(id, { resi, pengambil, lokasi, jumlah, status, catatan }) {
    let pengambilId = null;
    if (pengambil) {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('name', pengambil)
        .single();
      if (users) pengambilId = users.id;
    }

    const updateData = { resi, jumlah: parseInt(jumlah), lokasi, status, catatan };
    if (pengambilId) updateData.pengambil_id = pengambilId;

    const { data, error } = await supabase
      .from('pengambilan_paket')
      .update(updateData)
      .eq('id', id)
      .select(`
        id, resi, jumlah, lokasi, tanggal, jam, status, catatan,
        users!pengambilan_paket_pengambil_id_fkey ( name )
      `)
      .single();

    if (error) throw error;

    return { ...data, pengambil: data.users?.name || '-', users: undefined };
  },

  // Hapus data pengambilan
  async delete(id) {
    const { error } = await supabase
      .from('pengambilan_paket')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
