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

const isValidUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Deteksi dinamis: Cek apakah tabel laporan_keuangan sudah dibuat di Supabase, jika belum gunakan penjualan_jne
let activeTableCache = null;

async function detectActiveTable() {
  if (activeTableCache) return activeTableCache;
  try {
    const res = await supabase.from('laporan_keuangan').select('id').limit(1);
    if (!res.error || res.error.code !== 'PGRST205') {
      activeTableCache = 'laporan_keuangan';
      return activeTableCache;
    }
  } catch {}
  activeTableCache = 'penjualan_jne';
  return activeTableCache;
}

// Resilient insert: jika kolom tidak ditemukan pada skema Supabase (PGRST204), otomatis hilangkan kolom tsb dan coba lagi
async function resilientInsert(table, payload) {
  let currentPayload = { ...payload };
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase.from(table).insert([currentPayload]).select().single();
    if (!error && data) return { data, error: null };

    if (error && error.code === 'PGRST204' && error.message) {
      const match = error.message.match(/Could not find the '([^']+)' column/);
      if (match && match[1]) {
        delete currentPayload[match[1]];
        continue;
      }
    }
    return { data: null, error };
  }
  return { data: null, error: new Error('Exceeded max retry attempts') };
}

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

    // Laba Bersih Toko (Rumus: Pendapatan - Piutang - Diskon + Bayar)
    const labaBersih = pendapatanNominal - piutang - diskon + bayar;

    // Kas fisik riil masuk ke laci kasir
    const kasDiterima = totalTransaksi - piutang - diskon + bayar;

    return {
      hasil_transaksi: hasil,
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
      const table = await detectActiveTable();
      let { data, error } = await supabase
        .from(table)
        .select('*')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

      // Fallback jika tabel laporan_keuangan belum ada
      if (error && table === 'laporan_keuangan') {
        activeTableCache = 'penjualan_jne';
        const fallbackRes = await supabase
          .from('penjualan_jne')
          .select('*')
          .order('tanggal', { ascending: false })
          .order('created_at', { ascending: false });
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) throw error;
      
      if (Array.isArray(data)) {
        // Ambil data lokal yang belum tersimpan di Supabase
        const local = getLocalData();
        const pendingLocal = local.filter(x => typeof x.id === 'number' && x.id > 1000000000000);

        // Normalisasi data agar kompatibel 100% dengan form web
        const normalized = data.map(item => {
          let kantor = item.nama_kantor;
          if (!kantor) {
            if ((item.pelanggan || '').toLowerCase().includes('nusukan') || (item.catatan || '').toLowerCase().includes('nusukan')) {
              kantor = 'JNE Nusukan';
            } else {
              kantor = 'JNE Ngemplak';
            }
          }
          const hasil = Number(item.hasil_transaksi !== undefined && item.hasil_transaksi !== null ? item.hasil_transaksi : item.nilai_ongkir) || 0;
          const pendapatan = Number(item.pendapatan_toko !== undefined ? item.pendapatan_toko : item.komisi_nominal) || 0;
          const piutang = Number(item.piutang_customer) || 0;
          const diskon = Number(item.diskon_customer) || 0;
          const bayar = Number(item.bayar_customer) || 0;
          const laba = Number(item.laba_bersih !== undefined && item.laba_bersih !== null ? item.laba_bersih : (pendapatan - piutang - diskon + bayar)) || 0;

          return { 
            ...item, 
            nama_kantor: kantor,
            hasil_transaksi: hasil,
            nilai_ongkir: hasil,
            pendapatan_toko: pendapatan,
            komisi_nominal: pendapatan,
            laba_bersih: laba
          };
        });

        const combined = [...pendingLocal, ...normalized];
        setLocalData(combined);
        return combined;
      }
      return [];
    } catch (err) {
      console.warn('Supabase omset fallback to local:', err.message);
      return getLocalData();
    }
  },

  // Tambah rekap harian baru (Sesuai 100% dengan Form Input Web)
  async create(payload) {
    const rawHasil = payload.hasil_transaksi !== undefined ? payload.hasil_transaksi : payload.nilai_ongkir;
    const breakdown = this.calculateBreakdown({
      nilai_ongkir: rawHasil,
      asuransi: payload.asuransi,
      pendapatan_toko: payload.pendapatan_toko,
      piutang_customer: payload.piutang_customer,
      diskon_customer: payload.diskon_customer,
      bayar_customer: payload.bayar_customer
    });

    const todayDate = new Date().toISOString().split('T')[0];
    const namaKantor = payload.nama_kantor?.trim() || 'JNE Ngemplak';

    // Struktur Kolom Bersih Sesuai Form Web
    const record = {
      tanggal: payload.tanggal || todayDate,
      nama_kantor: namaKantor,
      hasil_transaksi: breakdown.hasil_transaksi,
      nilai_ongkir: breakdown.hasil_transaksi, // Kompatibilitas jika kolom lama masih ada
      asuransi: breakdown.asuransi,
      pendapatan_toko: breakdown.pendapatan_toko,
      piutang_customer: breakdown.piutang_customer,
      diskon_customer: breakdown.diskon_customer,
      bayar_customer: breakdown.bayar_customer,
      laba_bersih: breakdown.laba_bersih,
      hpp_pusat: breakdown.hpp_pusat,
      kas_diterima: breakdown.kas_diterima,
      status_setor: payload.status_setor || 'Belum Setor',
      catatan: payload.catatan?.trim() || '',
      created_by: isValidUUID(payload.created_by) ? payload.created_by : null,
      created_at: new Date().toISOString(),
    };

    // Simpan ke Supabase
    try {
      const table = await detectActiveTable();
      let insertRes = await resilientInsert(table, record);

      // Jika gagal di laporan_keuangan karena belum ada, coba ke penjualan_jne
      if (insertRes.error && table === 'laporan_keuangan') {
        activeTableCache = 'penjualan_jne';
        insertRes = await resilientInsert('penjualan_jne', record);
      }

      if (!insertRes.error && insertRes.data) {
        const savedData = {
          ...insertRes.data,
          nama_kantor: insertRes.data.nama_kantor || namaKantor,
          hasil_transaksi: breakdown.hasil_transaksi,
          nilai_ongkir: breakdown.hasil_transaksi
        };
        const local = getLocalData();
        setLocalData([savedData, ...local.filter(x => x.id !== savedData.id)]);
        return savedData;
      }

      if (insertRes.error) throw insertRes.error;
    } catch (err) {
      console.error('Supabase insert failed:', err);
      // Fallback local record jika offline
      const localId = Date.now();
      const localRecord = { id: localId, ...record };
      const local = getLocalData();
      setLocalData([localRecord, ...local]);
      return localRecord;
    }
  },

  // Update status setor HPP ke JNE Pusat
  async updateStatus(id, newStatus) {
    try {
      const table = await detectActiveTable();
      await supabase
        .from(table)
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

  // Hapus transaksi rekap
  async delete(id) {
    try {
      const table = await detectActiveTable();
      await supabase.from(table).delete().eq('id', id);
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
        nilai_ongkir: r.hasil_transaksi || r.nilai_ongkir,
        asuransi: r.asuransi,
        pendapatan_toko: r.pendapatan_toko,
        piutang_customer: r.piutang_customer,
        diskon_customer: r.diskon_customer,
        bayar_customer: r.bayar_customer
      });

      return {
        tanggal: r.tanggal || new Date().toISOString().split('T')[0],
        nama_kantor: r.nama_kantor || 'JNE Ngemplak',
        hasil_transaksi: breakdown.hasil_transaksi,
        nilai_ongkir: breakdown.hasil_transaksi,
        asuransi: breakdown.asuransi,
        pendapatan_toko: breakdown.pendapatan_toko,
        piutang_customer: breakdown.piutang_customer,
        diskon_customer: breakdown.diskon_customer,
        bayar_customer: breakdown.bayar_customer,
        laba_bersih: breakdown.laba_bersih,
        hpp_pusat: breakdown.hpp_pusat,
        kas_diterima: breakdown.kas_diterima,
        status_setor: r.status_setor || 'Belum Setor',
        catatan: r.catatan || '',
        created_at: new Date().toISOString()
      };
    });

    try {
      const table = await detectActiveTable();
      const { data, error } = await supabase
        .from(table)
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
