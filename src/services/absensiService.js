import { supabase } from '../lib/supabase';
import { aktivitasService } from './aktivitasService';

// Local storage key untuk caching shift absensi jika kolom belum ada di database Supabase
const SHIFT_CACHE_KEY = 'jne_absensi_shift_map';
const getShiftMap = () => {
  try {
    const raw = localStorage.getItem(SHIFT_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const saveShiftMap = (map) => {
  try {
    localStorage.setItem(SHIFT_CACHE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Gagal menyimpan cache shift absensi:', e);
  }
};

/**
 * Konfigurasi 2 Shift Operasional JNE:
 * 1. Shift Pagi : 08.00 - 17.00 WIB (Batas masuk maksimal 08:00 WIB, lewat = Terlambat)
 * 2. Shift Siang: 13.00 - 22.00 WIB (Batas masuk maksimal 13:00 WIB, lewat = Terlambat)
 */
export const SHIFT_CONFIG = {
  Pagi: {
    key: 'Pagi',
    name: 'Shift Pagi',
    label: 'Shift Pagi (08:00 - 17:00)',
    jamMasuk: '08:00',
    jamKeluar: '17:00',
    batasMasukJam: 8,
    batasMasukMenit: 0,
    range: '08:00 - 17:00',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dotClass: 'bg-amber-500',
    iconName: 'Sun'
  },
  Siang: {
    key: 'Siang',
    name: 'Shift Siang',
    label: 'Shift Siang (13:00 - 22:00)',
    jamMasuk: '13:00',
    jamKeluar: '22:00',
    batasMasukJam: 13,
    batasMasukMenit: 0,
    range: '13:00 - 22:00',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
    dotClass: 'bg-blue-600',
    iconName: 'Sunset'
  }
};

/**
 * Deteksi shift secara cerdas berdasarkan waktu sekarang atau jam tertentu:
 * Sebelum pukul 12:00 -> Shift Pagi (08:00 - 17:00)
 * Pukul 12:00 ke atas -> Shift Siang (13:00 - 22:00)
 */
export const determineShiftFromTime = (timeStrOrDate = new Date()) => {
  let hours = 0;
  let minutes = 0;
  if (typeof timeStrOrDate === 'string' && timeStrOrDate.includes(':')) {
    const parts = timeStrOrDate.split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
  } else if (timeStrOrDate instanceof Date) {
    hours = timeStrOrDate.getHours();
    minutes = timeStrOrDate.getMinutes();
  }
  const totalMins = hours * 60 + minutes;
  return totalMins < 12 * 60 ? 'Shift Pagi (08:00 - 17:00)' : 'Shift Siang (13:00 - 22:00)';
};

// Set lock in-flight operation untuk memblokir klik ganda atau race condition
const inFlightClockIn = new Set();
const inFlightClockOut = new Set();
const inFlightManual = new Set();

export const absensiService = {
  // Get absensi hari ini (atau semua)
  async getAll() {
    let rawData = [];
    try {
      const { data, error } = await supabase
        .from('absensi')
        .select(`
          id, tanggal, jam_masuk, jam_keluar, total_jam, status, shift,
          users!absensi_karyawan_id_fkey ( name )
        `)
        .order('id', { ascending: false });

      if (error) {
        // Jika kolom shift belum ada di Supabase, fallback query tanpa shift
        if (error.message?.includes('shift')) {
          const { data: fallbackData, error: errFallback } = await supabase
            .from('absensi')
            .select(`
              id, tanggal, jam_masuk, jam_keluar, total_jam, status,
              users!absensi_karyawan_id_fkey ( name )
            `)
            .order('id', { ascending: false });

          if (errFallback) throw errFallback;
          rawData = fallbackData || [];
        } else {
          throw error;
        }
      } else {
        rawData = data || [];
      }
    } catch (err) {
      // Query cadangan murni
      const { data: fallbackData, error: errFallback } = await supabase
        .from('absensi')
        .select(`
          id, tanggal, jam_masuk, jam_keluar, total_jam, status,
          users!absensi_karyawan_id_fkey ( name )
        `)
        .order('id', { ascending: false });

      if (errFallback) throw errFallback;
      rawData = fallbackData || [];
    }

    const shiftMap = getShiftMap();

    return rawData.map(row => {
      let resolvedShift = row.shift || shiftMap[row.id];
      if (!resolvedShift) {
        resolvedShift = determineShiftFromTime(row.jam_masuk || new Date());
      }
      const isSiang = resolvedShift.toLowerCase().includes('siang');
      const normalizedShift = isSiang ? 'Shift Siang (13:00 - 22:00)' : 'Shift Pagi (08:00 - 17:00)';
      const shiftKey = isSiang ? 'Siang' : 'Pagi';

      return {
        id: row.id,
        nama: row.users?.name || '-',
        tanggal: row.tanggal,
        shift: normalizedShift,
        shiftKey,
        jamMasuk: row.jam_masuk?.substring(0, 5) || '-',
        jamKeluar: row.jam_keluar ? row.jam_keluar.substring(0, 5) : '-',
        totalJam: row.total_jam || 0,
        status: row.status,
      };
    });
  },

  // Clock In dengan opsi shift spesifik (Pagi / Siang)
  async clockIn(userId, customShift = null) {
    if (!userId) throw new Error('User ID tidak valid.');

    // Cegah eksekusi ganda jika tombol ditekan berkali-kali secara bersamaan
    if (inFlightClockIn.has(userId)) {
      throw new Error('Proses Clock In sedang berlangsung, mohon tidak menekan tombol berulang kali.');
    }
    inFlightClockIn.add(userId);

    try {
      const now = new Date();
      const tanggal = now.toISOString().split('T')[0];
      const jamMasuk = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Cek sudah clock in hari ini
      const { data: existing } = await supabase
        .from('absensi')
        .select('id')
        .eq('karyawan_id', userId)
        .eq('tanggal', tanggal)
        .maybeSingle();

      if (existing) throw new Error('Anda sudah clock in hari ini.');

      // Tentukan shift (prioritas: customShift -> auto-detect dari jam saat ini)
      const rawShift = customShift || determineShiftFromTime(now);
      const isSiang = rawShift.toLowerCase().includes('siang');
      const shiftLabel = isSiang ? 'Shift Siang (13:00 - 22:00)' : 'Shift Pagi (08:00 - 17:00)';
      const shiftKey = isSiang ? 'Siang' : 'Pagi';

      // Evaluasi keterlambatan secara ketat tanpa toleransi:
      // Shift Pagi  : Masuk <= 08:00 = Hadir; Masuk > 08:00 = Terlambat
      // Shift Siang : Masuk <= 13:00 = Hadir; Masuk > 13:00 = Terlambat
      const batasStr = isSiang ? '13:00' : '08:00';
      const status = jamMasuk > batasStr ? 'Terlambat' : 'Hadir';

      let data = null;
      const payloadWithShift = {
        karyawan_id: userId,
        tanggal,
        jam_masuk: jamMasuk,
        status,
        shift: shiftLabel,
      };

      const res = await supabase
        .from('absensi')
        .insert(payloadWithShift)
        .select(`
          id, tanggal, jam_masuk, jam_keluar, total_jam, status,
          users!absensi_karyawan_id_fkey ( name )
        `)
        .single();

      if (res.error && res.error.message?.includes('shift')) {
        // Fallback tanpa kolom shift di tabel absensi Supabase
        const { shift: _unusedShift, ...payloadNoShift } = payloadWithShift;
        const fallbackRes = await supabase
          .from('absensi')
          .insert(payloadNoShift)
          .select(`
            id, tanggal, jam_masuk, jam_keluar, total_jam, status,
            users!absensi_karyawan_id_fkey ( name )
          `)
          .single();

        if (fallbackRes.error) throw fallbackRes.error;
        data = fallbackRes.data;
      } else if (res.error) {
        // Jika terdapat unique constraint violation di database
        if (res.error.code === '23505' || res.error.message?.includes('unique') || res.error.message?.includes('duplicate')) {
          throw new Error('Anda sudah memiliki catatan presensi hari ini.');
        }
        throw res.error;
      } else {
        data = res.data;
      }

      // Simpan ke local cache map agar persisten di browser
      if (data?.id) {
        const shiftMap = getShiftMap();
        shiftMap[data.id] = shiftLabel;
        saveShiftMap(shiftMap);
      }

      // Log ke tabel aktivitas
      await aktivitasService.logActivity({
        user_id: userId,
        absensi_id: data.id,
        title: 'Clock In Berhasil',
        description: `${data.users?.name || 'Karyawan'} presensi masuk [${shiftLabel}] pada ${jamMasuk} (Status: ${status})`,
        type: 'absen'
      });

      // Dispatch event agar Header (Notifikasi) otomatis update
      window.dispatchEvent(new Event('absensiUpdated'));

      return {
        id: data.id,
        nama: data.users?.name || '-',
        tanggal: data.tanggal,
        shift: shiftLabel,
        shiftKey,
        jamMasuk: data.jam_masuk?.substring(0, 5),
        jamKeluar: '-',
        totalJam: 0,
        status: data.status,
      };
    } finally {
      inFlightClockIn.delete(userId);
    }
  },

  // Clock Out
  async clockOut(userId) {
    if (!userId) throw new Error('User ID tidak valid.');

    if (inFlightClockOut.has(userId)) {
      throw new Error('Proses Clock Out sedang berlangsung, mohon tidak menekan tombol berulang kali.');
    }
    inFlightClockOut.add(userId);

    try {
      const now = new Date();
      const tanggal = now.toISOString().split('T')[0];
      const jamKeluar = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Cari data clock in hari ini
      const { data: existing, error: errCek } = await supabase
        .from('absensi')
        .select('id, jam_masuk')
        .eq('karyawan_id', userId)
        .eq('tanggal', tanggal)
        .is('jam_keluar', null)
        .maybeSingle();

      if (errCek || !existing) throw new Error('Anda belum clock in atau sudah clock out.');

      // Hitung total jam presensi secara presisi (termasuk lintas pergantian hari)
      const masukParts = existing.jam_masuk.split(':');
      const keluarParts = jamKeluar.split(':');
      const masukMins = parseInt(masukParts[0], 10) * 60 + parseInt(masukParts[1], 10);
      const keluarMins = parseInt(keluarParts[0], 10) * 60 + parseInt(keluarParts[1], 10);
      let diffMins = keluarMins - masukMins;
      if (diffMins < 0) diffMins += 24 * 60;
      const totalJam = Math.max(0, Math.round(diffMins / 60));

      const { error } = await supabase
        .from('absensi')
        .update({
          jam_keluar: jamKeluar,
          total_jam: totalJam,
        })
        .eq('id', existing.id);

      if (error) throw error;

      // Ambil nama user untuk log
      const { data: userData } = await supabase.from('users').select('name').eq('id', userId).single();

      // Log ke tabel aktivitas
      await aktivitasService.logActivity({
        user_id: userId,
        title: 'Clock Out Berhasil',
        description: `${userData?.name || 'Karyawan'} presensi keluar pada ${jamKeluar} (Total: ${totalJam} Jam)`,
        type: 'absen'
      });

      // Dispatch event agar Header (Notifikasi) otomatis update
      window.dispatchEvent(new Event('absensiUpdated'));

      return { jamKeluar, totalJam };
    } finally {
      inFlightClockOut.delete(userId);
    }
  },

  // Tambah Absensi Manual
  async addManual(data) {
    const lockKey = `${data.karyawan_id}_${data.tanggal}`;
    if (inFlightManual.has(lockKey)) {
      throw new Error('Penyimpanan data presensi manual sedang berlangsung.');
    }
    inFlightManual.add(lockKey);

    try {
      let total_jam = 0;
      if (data.jam_masuk && data.jam_keluar) {
        const masukParts = data.jam_masuk.split(':');
        const keluarParts = data.jam_keluar.split(':');
        const masukMins = parseInt(masukParts[0], 10) * 60 + parseInt(masukParts[1], 10);
        const keluarMins = parseInt(keluarParts[0], 10) * 60 + parseInt(keluarParts[1], 10);
        let diffMins = keluarMins - masukMins;
        if (diffMins < 0) diffMins += 24 * 60;
        total_jam = Math.max(0, Math.round(diffMins / 60));
      }

      const rawShift = data.shift || determineShiftFromTime(data.jam_masuk || '08:00');
      const isSiang = rawShift.toLowerCase().includes('siang');
      const shiftLabel = isSiang ? 'Shift Siang (13:00 - 22:00)' : 'Shift Pagi (08:00 - 17:00)';

      // Penegakan status tanpa toleransi:
      // Pagi: jam_masuk > 08:00 = Terlambat; Siang: jam_masuk > 13:00 = Terlambat
      let statusEvaluated = data.status;
      if (['Hadir', 'Terlambat'].includes(statusEvaluated) && data.jam_masuk) {
        const batasStr = isSiang ? '13:00' : '08:00';
        statusEvaluated = data.jam_masuk > batasStr ? 'Terlambat' : 'Hadir';
      }

      let insertedData = null;
      const payload = {
        karyawan_id: data.karyawan_id,
        tanggal: data.tanggal,
        jam_masuk: data.jam_masuk || null,
        jam_keluar: data.jam_keluar || null,
        total_jam,
        status: statusEvaluated,
        shift: shiftLabel,
      };

      const res = await supabase
        .from('absensi')
        .insert(payload)
        .select()
        .single();

      if (res.error && res.error.message?.includes('shift')) {
        const { shift: _unusedShift, ...payloadNoShift } = payload;
        const fallbackRes = await supabase
          .from('absensi')
          .insert(payloadNoShift)
          .select()
          .single();
        if (fallbackRes.error) throw fallbackRes.error;
        insertedData = fallbackRes.data;
      } else if (res.error) {
        throw res.error;
      } else {
        insertedData = res.data;
      }

      if (insertedData?.id) {
        const shiftMap = getShiftMap();
        shiftMap[insertedData.id] = shiftLabel;
        saveShiftMap(shiftMap);
      }

      // Ambil nama user untuk log
      const { data: userData } = await supabase.from('users').select('name').eq('id', data.karyawan_id).single();

      // Log ke tabel aktivitas
      await aktivitasService.logActivity({
        user_id: data.karyawan_id,
        absensi_id: insertedData?.id,
        title: 'Presensi Manual',
        description: `Data presensi manual ditambahkan untuk ${userData?.name || 'Karyawan'} [${shiftLabel}] (Tanggal: ${data.tanggal})`,
        type: 'system'
      });
      
      // Dispatch event agar Header (Notifikasi) otomatis update
      window.dispatchEvent(new Event('absensiUpdated'));
      
      return { ...insertedData, shift: shiftLabel };
    } finally {
      inFlightManual.delete(lockKey);
    }
  },

  // Hapus Data Absensi (Khusus Admin/Developer)
  async deleteAbsensi(id) {
    const { error } = await supabase
      .from('absensi')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Bersihkan dari local shift map jika ada
    const shiftMap = getShiftMap();
    if (shiftMap[id]) {
      delete shiftMap[id];
      saveShiftMap(shiftMap);
    }
    
    // Log ke tabel aktivitas
    await aktivitasService.logActivity({
      user_id: null,
      title: 'Data Presensi Dihapus',
      description: `Sistem menghapus log presensi ID: ${id}`,
      type: 'system'
    });
    
    // Trigger refresh
    window.dispatchEvent(new Event('absensiUpdated'));
    
    return true;
  }
};
