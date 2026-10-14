import { supabase } from '../lib/supabase';
import { aktivitasService } from './aktivitasService';

const STORAGE_KEY = 'jne_kalender_kegiatan';

// Judul dummy terdahulu yang harus dibersihkan jika masih tersisa di browser
const LEGACY_DUMMY_TITLES = [
  'Briefing Pagi & Evaluasi Pengiriman',
  'Sortir Gelombang I & Dispatch Armada Truk',
  'Maintenance Rutin Armada Motor Kurir',
  'Workshop SOP Penanganan Paket Fragile & Dangerous Goods',
  'Kampanye Promo JNE Cashback & Diskon Ongkir',
  'Audit Stok Perlengkapan Gudang & Barcode Scanner',
  'Rapat Koordinasi Kinerja & Target Bulanan',
  'Libur Operasional Terbatas / Cuti Bersama'
];

// Kosong secara default tanpa data dummy
const getDefaultEvents = () => [];

const getLocalEvents = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter keluar data dummy yang mungkin pernah tersimpan di browser
    const clean = parsed.filter(e => !LEGACY_DUMMY_TITLES.includes(e?.judul));
    if (clean.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    }
    return clean;
  } catch (e) {
    console.error('Error reading local events:', e);
    return [];
  }
};

const saveLocalEvents = (events) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Error saving local events:', e);
  }
};

export const kalenderService = {
  // Ambil semua kegiatan kalender
  async getAll(filters = {}) {
    try {
      let query = supabase
        .from('kalender_kegiatan')
        .select('*')
        .order('tanggal_mulai', { ascending: true })
        .order('jam_mulai', { ascending: true });

      if (filters.kategori && filters.kategori !== 'Semua') {
        query = query.eq('kategori', filters.kategori);
      }
      if (filters.status && filters.status !== 'Semua') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) {
        // Jika tabel belum ada di Supabase, fallback ke localStorage
        throw error;
      }
      return data || [];
    } catch (err) {
      // Fallback ke localStorage
      let events = getLocalEvents();

      if (filters.kategori && filters.kategori !== 'Semua') {
        events = events.filter(e => e.kategori === filters.kategori);
      }
      if (filters.status && filters.status !== 'Semua') {
        events = events.filter(e => e.status === filters.status);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        events = events.filter(e => 
          (e.judul && e.judul.toLowerCase().includes(q)) ||
          (e.lokasi && e.lokasi.toLowerCase().includes(q)) ||
          (e.pic_nama && e.pic_nama.toLowerCase().includes(q)) ||
          (e.deskripsi && e.deskripsi.toLowerCase().includes(q))
        );
      }

      // Sort by date then time
      return events.sort((a, b) => {
        const da = new Date(`${a.tanggal_mulai}T${a.jam_mulai || '00:00'}`);
        const db = new Date(`${b.tanggal_mulai}T${b.jam_mulai || '00:00'}`);
        return da - db;
      });
    }
  },

  // Ambil kegiatan yang mendatang (Upcoming) untuk Dashboard / Widget
  async getUpcoming(limit = 4) {
    const today = new Date().toISOString().split('T')[0];
    try {
      const { data, error } = await supabase
        .from('kalender_kegiatan')
        .select('*')
        .gte('tanggal_mulai', today)
        .neq('status', 'Dibatalkan')
        .order('tanggal_mulai', { ascending: true })
        .order('jam_mulai', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      const events = getLocalEvents();
      return events
        .filter(e => (e.tanggal_mulai >= today || (e.tanggal_selesai && e.tanggal_selesai >= today)) && e.status !== 'Dibatalkan')
        .sort((a, b) => {
          const da = new Date(`${a.tanggal_mulai}T${a.jam_mulai || '00:00'}`);
          const db = new Date(`${b.tanggal_mulai}T${b.jam_mulai || '00:00'}`);
          return da - db;
        })
        .slice(0, limit);
    }
  },

  // Tambah kegiatan baru
  async create(eventData, currentUser) {
    const payload = {
      judul: eventData.judul,
      kategori: eventData.kategori || 'Operasional',
      tanggal_mulai: eventData.tanggal_mulai,
      tanggal_selesai: eventData.tanggal_selesai || eventData.tanggal_mulai,
      jam_mulai: eventData.jam_mulai || null,
      jam_selesai: eventData.jam_selesai || null,
      seharian: !!eventData.seharian,
      lokasi: eventData.lokasi || '',
      pic_id: eventData.pic_id || null,
      pic_nama: eventData.pic_nama || currentUser?.name || 'Staff',
      staff_terlibat: eventData.staff_terlibat || [],
      prioritas: eventData.prioritas || 'Biasa',
      status: eventData.status || 'Rencana',
      deskripsi: eventData.deskripsi || '',
      created_by: currentUser?.id || null,
      created_at: new Date().toISOString()
    };

    let result = null;
    try {
      let { data, error } = await supabase
        .from('kalender_kegiatan')
        .insert(payload)
        .select()
        .single();

      if (error && (error.message?.includes('schema cache') || error.message?.includes('staff_terlibat'))) {
        // Fallback jika kolom staff_terlibat belum dibuat di Supabase
        const { staff_terlibat, ...fallbackPayload } = payload;
        const res = await supabase
          .from('kalender_kegiatan')
          .insert(fallbackPayload)
          .select()
          .single();
        if (res.error) throw res.error;
        data = { ...res.data, staff_terlibat: payload.staff_terlibat };
        error = null;
      }

      if (error) throw error;
      result = data;
    } catch (err) {
      // LocalStorage fallback
      const events = getLocalEvents();
      result = {
        ...payload,
        id: Date.now()
      };
      events.push(result);
      saveLocalEvents(events);
    }

    // Catat log aktivitas sistem
    try {
      await aktivitasService.logActivity({
        user_id: currentUser?.id || null,
        title: 'Kegiatan Baru Dijadwalkan',
        description: `${currentUser?.name || 'Pengguna'} menjadwalkan "${eventData.judul}" (${eventData.kategori}) pada ${eventData.tanggal_mulai}`,
        type: 'system'
      });
    } catch (e) {
      console.warn('Gagal mencatat log aktivitas kalender:', e);
    }

    window.dispatchEvent(new Event('kalenderUpdated'));
    window.dispatchEvent(new Event('aktivitasUpdated'));
    return result;
  },

  // Update kegiatan
  async update(id, updates, currentUser) {
    let result = null;
    try {
      const { data, error } = await supabase
        .from('kalender_kegiatan')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } catch (err) {
      // LocalStorage fallback
      const events = getLocalEvents();
      const index = events.findIndex(e => String(e.id) === String(id));
      if (index !== -1) {
        events[index] = { ...events[index], ...updates };
        saveLocalEvents(events);
        result = events[index];
      }
    }

    // Dispatch update events
    window.dispatchEvent(new Event('kalenderUpdated'));
    return result;
  },

  // Hapus kegiatan
  async delete(id) {
    try {
      const { error } = await supabase
        .from('kalender_kegiatan')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      // LocalStorage fallback
      const events = getLocalEvents();
      const filtered = events.filter(e => String(e.id) !== String(id));
      saveLocalEvents(filtered);
    }

    window.dispatchEvent(new Event('kalenderUpdated'));
    return true;
  },

  // Ambil ringkasan statistik kegiatan
  async getStats(targetMonth, targetYear) {
    const all = await this.getAll();
    const todayStr = new Date().toISOString().split('T')[0];

    const inMonth = all.filter(e => {
      if (!e.tanggal_mulai) return false;
      const d = new Date(e.tanggal_mulai);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const todayEvents = all.filter(e => 
      e.tanggal_mulai === todayStr || 
      (e.tanggal_selesai && e.tanggal_mulai <= todayStr && e.tanggal_selesai >= todayStr)
    );

    const upcomingEvents = all.filter(e => 
      e.tanggal_mulai >= todayStr && e.status !== 'Selesai' && e.status !== 'Dibatalkan'
    );

    const selesaiEvents = inMonth.filter(e => e.status === 'Selesai');

    return {
      totalBulanIni: inMonth.length,
      hariIni: todayEvents.length,
      mendatang: upcomingEvents.length,
      selesai: selesaiEvents.length,
    };
  }
};
