import { supabase } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'laporan_keuangan_local_data';

// Helper load local
const getLocalData = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Migrasi otomatis data lokal lama jika ada
    const legacy = localStorage.getItem('penjualan_jne_local_data');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
    return [];
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

  // Ambil semua data rekap harian dari tabel laporan_keuangan
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('laporan_keuangan')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (Array.isArray(data)) {
        // Ambil data lokal yang belum tersimpan di Supabase
        const local = getLocalData();
        const pendingLocal = local.filter(x => typeof x.id === 'number' && x.id > 1000000000000);

        // Normalisasi data agar kompatibel 100% dengan form web
        const normalized = data.map(item => {
          const kantor = item.nama_kantor || 'JNE Ngemplak';
          const hasil = Number(item.hasil_transaksi !== undefined && item.hasil_transaksi !== null ? item.hasil_transaksi : item.nilai_ongkir) || 0;
          const pendapatan = Number(item.pendapatan_toko) || 0;
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
      console.warn('Supabase laporan_keuangan fallback to local:', err.message);
      return getLocalData();
    }
  },

  // Tambah rekap harian baru ke tabel laporan_keuangan (Sesuai 100% dengan Form Input Web)
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

    // Simpan ke Supabase tabel laporan_keuangan
    try {
      const { data, error } = await supabase
        .from('laporan_keuangan')
        .insert([record])
        .select()
        .single();

      if (!error && data) {
        const savedData = {
          ...data,
          nama_kantor: data.nama_kantor || namaKantor,
          hasil_transaksi: breakdown.hasil_transaksi,
          nilai_ongkir: breakdown.hasil_transaksi
        };
        const local = getLocalData();
        setLocalData([savedData, ...local.filter(x => x.id !== savedData.id)]);
        return savedData;
      }

      if (error) throw error;
    } catch (err) {
      console.error('Supabase laporan_keuangan insert failed:', err);
      // Fallback local record jika offline
      const localId = Date.now();
      const localRecord = { id: localId, ...record, nilai_ongkir: breakdown.hasil_transaksi };
      const local = getLocalData();
      setLocalData([localRecord, ...local]);
      return localRecord;
    }
  },

  // Update rekap harian yang sudah ada (hanya jika belum setor ke pusat)
  async update(id, payload) {
    const rawHasil = payload.hasil_transaksi !== undefined ? payload.hasil_transaksi : payload.nilai_ongkir;
    const breakdown = this.calculateBreakdown({
      nilai_ongkir: rawHasil,
      asuransi: payload.asuransi,
      pendapatan_toko: payload.pendapatan_toko,
      piutang_customer: payload.piutang_customer,
      diskon_customer: payload.diskon_customer,
      bayar_customer: payload.bayar_customer
    });

    const namaKantor = payload.nama_kantor?.trim() || 'JNE Ngemplak';

    const updateRecord = {
      tanggal: payload.tanggal,
      nama_kantor: namaKantor,
      hasil_transaksi: breakdown.hasil_transaksi,
      asuransi: breakdown.asuransi,
      pendapatan_toko: breakdown.pendapatan_toko,
      piutang_customer: breakdown.piutang_customer,
      diskon_customer: breakdown.diskon_customer,
      bayar_customer: breakdown.bayar_customer,
      laba_bersih: breakdown.laba_bersih,
      hpp_pusat: breakdown.hpp_pusat,
      kas_diterima: breakdown.kas_diterima,
      catatan: payload.catatan?.trim() || ''
    };

    try {
      const { data, error } = await supabase
        .from('laporan_keuangan')
        .update(updateRecord)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const savedData = {
          ...data,
          nama_kantor: data.nama_kantor || namaKantor,
          hasil_transaksi: breakdown.hasil_transaksi,
          nilai_ongkir: breakdown.hasil_transaksi
        };
        const local = getLocalData();
        setLocalData(local.map(item => String(item.id) === String(id) ? { ...item, ...savedData } : item));
        return savedData;
      }
      if (error) throw error;
    } catch (err) {
      console.error('Supabase laporan_keuangan update failed:', err);
      const local = getLocalData();
      const updated = local.map(item => String(item.id) === String(id) ? { ...item, ...updateRecord, nilai_ongkir: breakdown.hasil_transaksi } : item);
      setLocalData(updated);
      return updated.find(x => String(x.id) === String(id));
    }
  },

  // Update status setor HPP ke JNE Pusat
  async updateStatus(id, newStatus) {
    try {
      await supabase
        .from('laporan_keuangan')
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
      await supabase.from('laporan_keuangan').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete failed:', err.message);
    }
    const local = getLocalData();
    setLocalData(local.filter(item => String(item.id) !== String(id)));
    return true;
  },

  // Batch insert untuk import Excel/CSV
  async batchCreate(rows) {
    const formatted = rows.map((r) => {
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
      const { data, error } = await supabase
        .from('laporan_keuangan')
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
    const withIds = formatted.map((f, i) => ({ id: Date.now() + i, ...f, nilai_ongkir: f.hasil_transaksi }));
    setLocalData([...withIds, ...local]);
    return withIds;
  }
};
