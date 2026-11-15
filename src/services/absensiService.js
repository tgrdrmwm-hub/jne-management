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
          id, karyawan_id, tanggal, jam_masuk, jam_keluar, total_jam, status, shift,
          users!absensi_karyawan_id_fkey ( name )
        `)
        .order('tanggal', { ascending: false })
        .order('jam_masuk', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false });

      if (error) {
        // Jika kolom shift belum ada di Supabase, fallback query tanpa shift
        if (error.message?.includes('shift')) {
          const { data: fallbackData, error: errFallback } = await supabase
            .from('absensi')
            .select(`
              id, karyawan_id, tanggal, jam_masuk, jam_keluar, total_jam, status,
              users!absensi_karyawan_id_fkey ( name )
            `)
            .order('tanggal', { ascending: false })
            .order('jam_masuk', { ascending: false, nullsFirst: false })
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
          id, karyawan_id, tanggal, jam_masuk, jam_keluar, total_jam, status,
          users!absensi_karyawan_id_fkey ( name )
        `)
        .order('tanggal', { ascending: false })
        .order('jam_masuk', { ascending: false, nullsFirst: false })
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
        karyawan_id: row.karyawan_id,
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

  // Tambah Absensi Manual Batch (Seminggu / Rentang Tanggal)
  async addManualBatch({
    karyawan_id,
    shift,
    tanggal_mulai,
    tanggal_selesai,
    hari_dipilih = [1, 2, 3, 4, 5, 6], // Default Sen-Sab (0=Min, 1=Sen, ..., 6=Sab)
    jam_masuk,
    jam_keluar,
    status = 'Hadir',
    overwrite_existing = false
  }) {
    if (!karyawan_id) throw new Error('Karyawan harus dipilih.');
    if (!tanggal_mulai || !tanggal_selesai) throw new Error('Tanggal mulai dan tanggal selesai harus diisi.');
    if (tanggal_mulai > tanggal_selesai) throw new Error('Tanggal mulai tidak boleh melebihi tanggal selesai.');

    const lockKey = `batch_${karyawan_id}_${tanggal_mulai}_${tanggal_selesai}`;
    if (inFlightManual.has(lockKey)) {
      throw new Error('Penyimpanan data presensi mingguan sedang berlangsung.');
    }
    inFlightManual.add(lockKey);

    try {
      // 1. Generate tanggal target berdasarkan rentang dan hari yang dicentang
      const targetDates = [];
      const startParts = tanggal_mulai.split('-').map(Number);
      const endParts = tanggal_selesai.split('-').map(Number);
      const curr = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
      const end = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));

      const diffDays = Math.round((end - curr) / (1000 * 60 * 60 * 24));
      if (diffDays > 31) {
        throw new Error('Rentang tanggal maksimal 31 hari per proses input.');
      }

      while (curr <= end) {
        const dayOfWeek = curr.getUTCDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
        if (hari_dipilih.includes(dayOfWeek)) {
          const y = curr.getUTCFullYear();
          const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
          const d = String(curr.getUTCDate()).padStart(2, '0');
          targetDates.push(`${y}-${m}-${d}`);
        }
        curr.setUTCDate(curr.getUTCDate() + 1);
      }

      if (targetDates.length === 0) {
        throw new Error('Tidak ada tanggal yang cocok dengan hari kerja yang dipilih dalam rentang ini.');
      }

      // 2. Ambil data presensi yang sudah ada untuk karyawan ini pada rentang tersebut
      const { data: existingRecords, error: errExist } = await supabase
        .from('absensi')
        .select('id, tanggal')
        .eq('karyawan_id', karyawan_id)
        .gte('tanggal', tanggal_mulai)
        .lte('tanggal', tanggal_selesai);

      if (errExist) throw errExist;

      const existingMap = new Map((existingRecords || []).map(r => [r.tanggal, r.id]));

      // 3. Evaluasi jam, total_jam, dan shift
      let total_jam = 0;
      if (jam_masuk && jam_keluar) {
        const masukParts = jam_masuk.split(':');
        const keluarParts = jam_keluar.split(':');
        const masukMins = parseInt(masukParts[0], 10) * 60 + parseInt(masukParts[1], 10);
        const keluarMins = parseInt(keluarParts[0], 10) * 60 + parseInt(keluarParts[1], 10);
        let diffMins = keluarMins - masukMins;
        if (diffMins < 0) diffMins += 24 * 60;
        total_jam = Math.max(0, Math.round(diffMins / 60));
      }

      const rawShift = shift || determineShiftFromTime(jam_masuk || '08:00');
      const isSiang = rawShift.toLowerCase().includes('siang');
      const shiftLabel = isSiang ? 'Shift Siang (13:00 - 22:00)' : 'Shift Pagi (08:00 - 17:00)';

      let statusEvaluated = status;
      if (['Hadir', 'Terlambat'].includes(statusEvaluated) && jam_masuk) {
        const batasStr = isSiang ? '13:00' : '08:00';
        statusEvaluated = jam_masuk > batasStr ? 'Terlambat' : 'Hadir';
      }

      // 4. Pisahkan tanggal insert vs update vs skip
      const datesToInsert = [];
      const datesToUpdate = [];
      const datesSkipped = [];

      for (const d of targetDates) {
        if (existingMap.has(d)) {
          if (overwrite_existing) {
            datesToUpdate.push({ id: existingMap.get(d), tanggal: d });
          } else {
            datesSkipped.push(d);
          }
        } else {
          datesToInsert.push(d);
        }
      }

      if (datesToInsert.length === 0 && datesToUpdate.length === 0) {
        return {
          totalTarget: targetDates.length,
          insertedCount: 0,
          updatedCount: 0,
          skippedCount: datesSkipped.length,
          skippedDates: datesSkipped,
          insertedRows: [],
          updatedRows: [],
          statusEvaluated,
          shiftLabel,
          allSkipped: true,
          message: 'Semua tanggal yang dipilih sudah memiliki data presensi sebelumnya.'
        };
      }

      const insertedRows = [];
      const shiftMap = getShiftMap();

      // Eksekusi insert untuk tanggal-tanggal baru
      if (datesToInsert.length > 0) {
        const payloads = datesToInsert.map(tgl => ({
          karyawan_id,
          tanggal: tgl,
          jam_masuk: jam_masuk || null,
          jam_keluar: jam_keluar || null,
          total_jam,
          status: statusEvaluated,
          shift: shiftLabel
        }));

        let res = await supabase.from('absensi').insert(payloads).select();
        if (res.error && res.error.message?.includes('shift')) {
          const payloadsNoShift = payloads.map(({ shift: _s, ...rest }) => rest);
          const fallbackRes = await supabase.from('absensi').insert(payloadsNoShift).select();
          if (fallbackRes.error) throw fallbackRes.error;
          res = fallbackRes;
        } else if (res.error) {
          throw res.error;
        }

        if (res.data) {
          insertedRows.push(...res.data);
          res.data.forEach(item => {
            shiftMap[item.id] = shiftLabel;
          });
        }
      }

      // Eksekusi update jika overwrite_existing diaktifkan
      const updatedRows = [];
      if (datesToUpdate.length > 0) {
        for (const item of datesToUpdate) {
          const updatePayload = {
            jam_masuk: jam_masuk || null,
            jam_keluar: jam_keluar || null,
            total_jam,
            status: statusEvaluated,
            shift: shiftLabel
          };
          let upRes = await supabase.from('absensi').update(updatePayload).eq('id', item.id).select();
          if (upRes.error && upRes.error.message?.includes('shift')) {
            const { shift: _s, ...payloadNoShift } = updatePayload;
            upRes = await supabase.from('absensi').update(payloadNoShift).eq('id', item.id).select();
          }
          if (upRes.error) throw upRes.error;
          if (upRes.data && upRes.data[0]) {
            updatedRows.push(upRes.data[0]);
            shiftMap[item.id] = shiftLabel;
          }
        }
      }

      saveShiftMap(shiftMap);

      // Ambil nama user untuk log aktivitas
      const { data: userData } = await supabase.from('users').select('name').eq('id', karyawan_id).single();
      const userName = userData?.name || 'Karyawan';

      const totalProcessed = insertedRows.length + updatedRows.length;

      // Log ke tabel aktivitas
      await aktivitasService.logActivity({
        user_id: karyawan_id,
        absensi_id: insertedRows[0]?.id || updatedRows[0]?.id || null,
        title: 'Presensi Manual Mingguan / Rentang',
        description: `Presensi manual batch (${totalProcessed} hari) disimpan untuk ${userName} [${shiftLabel}] (${tanggal_mulai} s/d ${tanggal_selesai})`,
        type: 'system'
      });

      // Dispatch event agar notifikasi & dashboard otomatis update
      window.dispatchEvent(new Event('absensiUpdated'));

      return {
        totalTarget: targetDates.length,
        insertedCount: insertedRows.length,
        updatedCount: updatedRows.length,
        skippedCount: datesSkipped.length,
        skippedDates: datesSkipped,
        insertedRows,
        updatedRows,
        statusEvaluated,
        shiftLabel,
        userName,
        allSkipped: false
      };
    } finally {
      inFlightManual.delete(lockKey);
    }
  },

  // Update Data Presensi
  async updateAbsensi(id, data) {
    if (!id) throw new Error('ID Presensi tidak valid.');

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

    let statusEvaluated = data.status;
    if (['Hadir', 'Terlambat'].includes(statusEvaluated) && data.jam_masuk) {
      const batasStr = isSiang ? '13:00' : '08:00';
      statusEvaluated = data.jam_masuk > batasStr ? 'Terlambat' : 'Hadir';
    }

    const payload = {
      tanggal: data.tanggal,
      jam_masuk: data.jam_masuk || null,
      jam_keluar: data.jam_keluar || null,
      total_jam,
      status: statusEvaluated,
      shift: shiftLabel,
    };

    if (data.karyawan_id) {
      payload.karyawan_id = data.karyawan_id;
    }

    let updatedData = null;
    const res = await supabase
      .from('absensi')
      .update(payload)
      .eq('id', id)
      .select(`
        id, karyawan_id, tanggal, jam_masuk, jam_keluar, total_jam, status, shift,
        users!absensi_karyawan_id_fkey ( name )
      `)
      .single();

    if (res.error && res.error.message?.includes('shift')) {
      const { shift: _unusedShift, ...payloadNoShift } = payload;
      const fallbackRes = await supabase
        .from('absensi')
        .update(payloadNoShift)
        .eq('id', id)
        .select(`
          id, karyawan_id, tanggal, jam_masuk, jam_keluar, total_jam, status,
          users!absensi_karyawan_id_fkey ( name )
        `)
        .single();
      if (fallbackRes.error) throw fallbackRes.error;
      updatedData = fallbackRes.data;
    } else if (res.error) {
      throw res.error;
    } else {
      updatedData = res.data;
    }

    // Perbarui cache shift
    const shiftMap = getShiftMap();
    shiftMap[id] = shiftLabel;
    saveShiftMap(shiftMap);

    // Sinkronisasi riwayat poin
    const targetUserId = updatedData?.karyawan_id || data.karyawan_id;
    if (targetUserId) {
      try {
        const { data: existingPoin } = await supabase
          .from('riwayat_poin')
          .select('id')
          .eq('absensi_id', id);

        const pointsAmount = statusEvaluated === 'Hadir' ? 10 : (statusEvaluated === 'Terlambat' ? -5 : 0);
        const poinDesc = statusEvaluated === 'Hadir'
          ? `Presensi [${shiftLabel}] (Hadir - ${data.tanggal})`
          : (statusEvaluated === 'Terlambat' ? `Presensi [${shiftLabel}] (Terlambat - ${data.tanggal})` : null);

        if (existingPoin && existingPoin.length > 0) {
          if (pointsAmount !== 0) {
            await supabase
              .from('riwayat_poin')
              .update({
                jumlah_poin: pointsAmount,
                keterangan: poinDesc,
                user_id: targetUserId
              })
              .eq('absensi_id', id);
          } else {
            await supabase
              .from('riwayat_poin')
              .delete()
              .eq('absensi_id', id);
          }
        } else if (pointsAmount !== 0) {
          await supabase
            .from('riwayat_poin')
            .insert({
              user_id: targetUserId,
              absensi_id: id,
              jumlah_poin: pointsAmount,
              keterangan: poinDesc
            });
        }
      } catch (errPoin) {
        console.warn('Gagal sinkronisasi poin saat update absensi:', errPoin);
      }
    }

    const employeeName = updatedData?.users?.name || 'Karyawan';

    // Log ke tabel aktivitas
    await aktivitasService.logActivity({
      user_id: targetUserId,
      absensi_id: id,
      title: 'Presensi Diperbarui',
      description: `Data presensi ID #${id} (${data.tanggal}) diperbarui untuk ${employeeName} [${shiftLabel}] (Status: ${statusEvaluated})`,
      type: 'system'
    });

    // Dispatch event agar Header & Dashboard otomatis update
    window.dispatchEvent(new Event('absensiUpdated'));

    return { ...updatedData, shift: shiftLabel };
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
