import { supabase } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'penjualan_jne_local_data';

// Helper load local
const getLocalData = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Helper save local
const setLocalData = (data) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed saving to localStorage', e);
  }
};

export const omsetService = {
  // Hitung otomatis komponen keuangan transaksi
  calculateBreakdown({ tipe_transaksi, nilai_ongkir, komisi_persen = 15 }) {
    const ongkir = Number(nilai_ongkir) || 0;
    const persen = Number(komisi_persen) || 0;
    const komisi = Math.round(ongkir * (persen / 100));

    if (tipe_transaksi === 'Cash') {
      return {
        nilai_ongkir: ongkir,
        komisi_persen: persen,
        komisi_nominal: komisi,
        hpp_pusat: Math.max(0, ongkir - komisi),
        kas_diterima: ongkir, // Uang fisik masuk laci
      };
    } else {
      // Cashless (Marketplace / Booking Online)
      // Customer TIDAK bayar tunai di counter
      // Kasir TIDAK boleh setor HPP dari kas laci
      // Komisi adalah piutang fee sharing yang ditransfer JNE Pusat
      return {
        nilai_ongkir: ongkir,
        komisi_persen: persen,
        komisi_nominal: komisi,
        hpp_pusat: 0, // Rp 0 ke pusat (karena uang tidak diterima)
        kas_diterima: 0, // Rp 0 uang tunai di laci
      };
    }
  },

  // Ambil semua data penjualan
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('penjualan_jne')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Jika database Supabase aktif & ada data, simpan sync ke local
      if (data && data.length > 0) {
        setLocalData(data);
        return data;
      }
      return getLocalData();
    } catch (err) {
      console.warn('Supabase penjualan_jne fallback to local:', err.message);
      return getLocalData();
    }
  },

  // Tambah transaksi baru
  async create(payload) {
    const breakdown = this.calculateBreakdown({
      tipe_transaksi: payload.tipe_transaksi,
      nilai_ongkir: payload.nilai_ongkir,
      komisi_persen: payload.komisi_persen
    });

    const record = {
      tanggal: payload.tanggal || new Date().toISOString().split('T')[0],
      waktu: payload.waktu || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
      no_resi: payload.no_resi?.trim() || `JNE-${Date.now().toString().slice(-8)}`,
      pelanggan: payload.pelanggan?.trim() || 'Pelanggan Counter',
      layanan: payload.layanan || 'REG',
      tipe_transaksi: payload.tipe_transaksi || 'Cash',
      marketplace: payload.marketplace || (payload.tipe_transaksi === 'Cashless' ? 'Shopee' : 'None'),
      nilai_ongkir: breakdown.nilai_ongkir,
      komisi_persen: breakdown.komisi_persen,
      komisi_nominal: breakdown.komisi_nominal,
      hpp_pusat: breakdown.hpp_pusat,
      kas_diterima: breakdown.kas_diterima,
      status_setor: payload.status_setor || (payload.tipe_transaksi === 'Cash' ? 'Belum Setor' : 'Belum Cair'),
      catatan: payload.catatan?.trim() || '',
      created_by: payload.created_by || null,
      created_at: new Date().toISOString(),
    };

    // 1. Simpan ke Supabase jika tabel siap
    try {
      const { data, error } = await supabase
        .from('penjualan_jne')
        .insert([record])
        .select()
        .single();

      if (!error && data) {
        const local = getLocalData();
        setLocalData([data, ...local.filter(x => x.id !== data.id)]);
        return data;
      }
    } catch (err) {
      console.warn('Supabase insert failed, storing locally:', err.message);
    }

    // 2. Fallback local record
    const localId = Date.now();
    const localRecord = { id: localId, ...record };
    const local = getLocalData();
    setLocalData([localRecord, ...local]);
    return localRecord;
  },

  // Update status setor / pencairan komisi
  async updateStatus(id, newStatus) {
    try {
      await supabase
        .from('penjualan_jne')
        .update({ status_setor: newStatus })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase updateStatus failed:', err.message);
    }
    const local = getLocalData();
    const updated = local.map(item => String(item.id) === String(id) ? { ...item, status_setor: newStatus } : item);
    setLocalData(updated);
    return true;
  },

  // Hapus transaksi
  async delete(id) {
    try {
      await supabase.from('penjualan_jne').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete failed:', err.message);
    }
    const local = getLocalData();
    setLocalData(local.filter(item => String(item.id) !== String(id)));
    return true;
  },

  // Batch insert untuk import Excel/CSV
  async batchCreate(rows) {
    const formatted = rows.map((r, index) => {
      const breakdown = this.calculateBreakdown({
        tipe_transaksi: r.tipe_transaksi,
        nilai_ongkir: r.nilai_ongkir,
        komisi_persen: r.komisi_persen || 15
      });

      return {
        tanggal: r.tanggal || new Date().toISOString().split('T')[0],
        waktu: r.waktu || '12:00',
        no_resi: r.no_resi || `IMP-${Date.now()}-${index}`,
        pelanggan: r.pelanggan || 'Pelanggan',
        layanan: r.layanan || 'REG',
        tipe_transaksi: r.tipe_transaksi || 'Cash',
        marketplace: r.marketplace || 'None',
        nilai_ongkir: breakdown.nilai_ongkir,
        komisi_persen: breakdown.komisi_persen,
        komisi_nominal: breakdown.komisi_nominal,
        hpp_pusat: breakdown.hpp_pusat,
        kas_diterima: breakdown.kas_diterima,
        status_setor: r.tipe_transaksi === 'Cash' ? (r.status_setor || 'Belum Setor') : (r.status_setor || 'Belum Cair'),
        catatan: r.catatan || '',
        created_at: new Date().toISOString()
      };
    });

    try {
      const { data, error } = await supabase
        .from('penjualan_jne')
        .insert(formatted)
        .select();

      if (!error && data) {
        const local = getLocalData();
        setLocalData([...data, ...local]);
        return data;
      }
    } catch (err) {
      console.warn('Supabase batch insert failed:', err.message);
    }

    const local = getLocalData();
    const withIds = formatted.map((f, i) => ({ id: Date.now() + i, ...f }));
    setLocalData([...withIds, ...local]);
    return withIds;
  }
};
