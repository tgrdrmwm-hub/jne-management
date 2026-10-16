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
  // Hitung otomatis komponen keuangan rekap hasil akhir harian
  // Rumus 1 (HPP Pusat): (Hasil + Asuransi) - Pendapatan Toko = HPP Setor ke Pusat
  // Rumus 2 (Laba Bersih): Pendapatan Toko - Piutang Customer - Diskon Customer + Bayar Customer
  // Kas Diterima Kasir: Total Transaksi - Piutang Customer - Diskon + Bayar = HPP Pusat + Laba Bersih
  calculateBreakdown({ 
    nilai_ongkir, 
    asuransi = 0, 
    pendapatan_toko = 0,
    piutang_customer = 0,
    diskon_customer = 0,
    bayar_customer = 0
  }) {
    const hasil = Number(nilai_ongkir) || 0;
    const biayaAsuransi = Number(asuransi) || 0;
    const pendapatanNominal = Number(pendapatan_toko) || 0;
    const piutang = Number(piutang_customer) || 0;
    const diskon = Number(diskon_customer) || 0;
    const bayar = Number(bayar_customer) || 0;

    const totalTransaksi = hasil + biayaAsuransi;
    
    // HPP yang disetor ke pusat
    const hppPusat = Math.max(0, totalTransaksi - pendapatanNominal);

    // Laba Bersih Toko (Rumus Baru: Pendapatan - Piutang - Diskon + Bayar)
    const labaBersih = pendapatanNominal - piutang - diskon + bayar;

    // Kas fisik riil masuk ke laci kasir
    const kasDiterima = totalTransaksi - piutang - diskon + bayar;

    return {
      nilai_ongkir: hasil,
      asuransi: biayaAsuransi,
      total_transaksi: totalTransaksi,
      pendapatan_toko: pendapatanNominal,
      komisi_nominal: pendapatanNominal,
      piutang_customer: piutang,
      diskon_customer: diskon,
      bayar_customer: bayar,
      laba_bersih: labaBersih,
      komisi_persen: 0,
      hpp_pusat: hppPusat,
      kas_diterima: kasDiterima,
    };
  },

  // Ambil semua data penjualan / rekap harian
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

  // Tambah rekap harian baru
  async create(payload) {
    const breakdown = this.calculateBreakdown({
      nilai_ongkir: payload.nilai_ongkir,
      asuransi: payload.asuransi,
      pendapatan_toko: payload.pendapatan_toko,
      piutang_customer: payload.piutang_customer,
      diskon_customer: payload.diskon_customer,
      bayar_customer: payload.bayar_customer
    });

    const todayDate = new Date().toISOString().split('T')[0];
    const record = {
      tanggal: payload.tanggal || todayDate,
      waktu: payload.waktu || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
      no_resi: payload.no_resi?.trim() || `REKAP-${(payload.tanggal || todayDate).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
      pelanggan: payload.pelanggan?.trim() || 'Rekap Harian Counter',
      layanan: payload.layanan || 'Rekap Harian',
      tipe_transaksi: 'Cash', // Standard di database check constraint
      marketplace: 'None',
      nilai_ongkir: breakdown.nilai_ongkir,
      asuransi: breakdown.asuransi,
      komisi_persen: 0,
      komisi_nominal: breakdown.komisi_nominal,
      pendapatan_toko: breakdown.pendapatan_toko,
      piutang_customer: breakdown.piutang_customer,
      diskon_customer: breakdown.diskon_customer,
      bayar_customer: breakdown.bayar_customer,
      laba_bersih: breakdown.laba_bersih,
      hpp_pusat: breakdown.hpp_pusat,
      kas_diterima: breakdown.kas_diterima,
      status_setor: payload.status_setor || 'Belum Setor',
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
