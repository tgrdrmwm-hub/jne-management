import { supabase } from '../lib/supabase';

export const gudangService = {
  // Get semua data pengantaran gudang (JOIN kurir name)
  async getAll() {
    const { data, error } = await supabase
      .from('pengantaran_gudang')
      .select(`
        id, resi, gudang, jumlah, tanggal, jam, status, catatan,
        users!pengantaran_gudang_kurir_id_fkey ( name )
      `)
      .order('id', { ascending: false });

    if (error) throw error;

    // Flatten: users.name → kurir
    return data.map(row => ({
      ...row,
      kurir: row.users?.name || '-',
      users: undefined,
    }));
  },

  // Tambah data pengantaran
  async create({ resi, kurir, gudang, jumlah, status, catatan }) {
    // Cari kurir_id dari nama
    let kurirId = null;
    if (kurir) {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('name', kurir)
        .single();
      if (users) kurirId = users.id;
    }

    const now = new Date();
    const tanggal = now.toISOString().split('T')[0];
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });

    const { data, error } = await supabase
      .from('pengantaran_gudang')
      .insert({
        resi,
        kurir_id: kurirId,
        gudang,
        jumlah: parseInt(jumlah),
        tanggal,
        jam,
        status: status || 'Proses',
        catatan: catatan || '-',
      })
      .select(`
        id, resi, gudang, jumlah, tanggal, jam, status, catatan,
        users!pengantaran_gudang_kurir_id_fkey ( name )
      `)
      .single();

    if (error) throw error;

    return { ...data, kurir: data.users?.name || '-', users: undefined };
  },

  // Update data pengantaran
  async update(id, { resi, kurir, gudang, jumlah, status, catatan }) {
    let kurirId = null;
    if (kurir) {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('name', kurir)
        .single();
      if (users) kurirId = users.id;
    }

    const updateData = { resi, gudang, jumlah: parseInt(jumlah), status, catatan };
    if (kurirId) updateData.kurir_id = kurirId;

    const { data, error } = await supabase
      .from('pengantaran_gudang')
      .update(updateData)
      .eq('id', id)
      .select(`
        id, resi, gudang, jumlah, tanggal, jam, status, catatan,
        users!pengantaran_gudang_kurir_id_fkey ( name )
      `)
      .single();

    if (error) throw error;

    return { ...data, kurir: data.users?.name || '-', users: undefined };
  },

  // Hapus data pengantaran
  async delete(id) {
    const { error } = await supabase
      .from('pengantaran_gudang')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
