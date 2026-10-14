// Layanan Otomatis Pengingat Kalender H-3 JNE
// Memeriksa dan mengirimkan email pengingat secara otomatis tanpa tindakan manual
import { kalenderService } from './kalenderService.js';
import { staffService } from './staffService.js';
import { emailReminderService } from './emailReminderService.js';

const STORAGE_LOG_KEY = 'jne_auto_reminder_h3_log';

/**
 * Menghitung selisih hari antara hari ini dan tanggal kegiatan (berdasarkan waktu lokal 00:00)
 */
export const calculateDiffDays = (dateStr) => {
  if (!dateStr) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const parts = dateStr.split('-');
  if (parts.length < 3) return null;
  const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

let isRunningCheck = false;

export const autoReminderService = {
  /**
   * Ambil seluruh riwayat log pengingat otomatis dari localStorage
   */
  getLogs() {
    try {
      const raw = localStorage.getItem(STORAGE_LOG_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('[AutoReminder] Gagal membaca log riwayat pengingat:', e);
      return {};
    }
  },

  /**
   * Simpan riwayat log pengingat ke localStorage
   */
  saveLogs(logs) {
    try {
      localStorage.setItem(STORAGE_LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('[AutoReminder] Gagal menyimpan log riwayat pengingat:', e);
    }
  },

  /**
   * Cek apakah pengingat untuk event & tanggal tertentu sudah pernah terkirim
   */
  isSent(eventId, eventDate) {
    if (!eventId || !eventDate) return false;
    const logs = this.getLogs();
    const key = `${eventId}_${eventDate}`;
    return !!(logs[key] && logs[key].status === 'success');
  },

  /**
   * Tandai pengingat berhasil dikirim dan sinkronkan dengan database/localStorage
   */
  async markSent(event, result, daysLeft) {
    const logs = this.getLogs();
    const key = `${event.id}_${event.tanggal_mulai}`;
    const nowIso = new Date().toISOString();

    logs[key] = {
      eventId: event.id,
      eventTitle: event.judul,
      eventKategori: event.kategori,
      eventDate: event.tanggal_mulai,
      daysLeft,
      sentAt: nowIso,
      status: 'success',
      recipients: result.sentList || [],
      successCount: result.successCount || 0,
      sandboxRerouted: !!result.sandboxRerouted,
    };

    this.saveLogs(logs);

    // Update status di entitas kegiatan kalender
    try {
      await kalenderService.update(event.id, {
        reminder_h3_sent: true,
        reminder_h3_sent_at: nowIso,
        reminder_h3_days_left: daysLeft,
      });
    } catch (err) {
      console.warn('[AutoReminder] Gagal memperbarui status reminder_h3_sent pada event:', err);
    }
  },

  /**
   * Inti Mesin Otomatis: Periksa seluruh agenda dan kirim pengingat H-3 jika belum terkirim
   */
  async checkAndSendH3Reminders({ silent = true } = {}) {
    if (isRunningCheck) {
      if (!silent) console.log('[AutoReminder] Pemeriksaan sedang berlangsung, lewati...');
      return { status: 'in_progress', checked: 0, sent: 0 };
    }

    isRunningCheck = true;

    try {
      const allEvents = await kalenderService.getAll();
      let staffList = [];
      try {
        staffList = await staffService.getStaffList();
      } catch (err) {
        console.warn('[AutoReminder] Fallback staffList:', err.message);
      }

      const sentEvents = [];
      let sentCount = 0;

      for (const event of allEvents) {
        if (!event.tanggal_mulai) continue;
        if (event.status === 'Dibatalkan' || event.status === 'Selesai') continue;

        const diffDays = calculateDiffDays(event.tanggal_mulai);
        if (diffDays === null) continue;

        // Kriteria H-3 Otomatis:
        // Berlaku untuk agenda H-3 (3 hari lagi), serta agenda dalam rentang H-3 (0 s/d 3 hari)
        // yang belum pernah terkirim sebelumnya (misal baru dibuat atau sistem baru dibuka)
        const qualifiesForH3 = diffDays >= 0 && diffDays <= 3;

        if (qualifiesForH3) {
          const alreadySent = this.isSent(event.id, event.tanggal_mulai) || event.reminder_h3_sent;

          if (!alreadySent) {
            console.log(
              `[AutoReminder] 🚀 Mengirim pengingat otomatis H-${diffDays} untuk: "${event.judul}" (${event.tanggal_mulai})`
            );

            try {
              const res = await emailReminderService.sendH3Reminder({
                event,
                staffList,
                daysLeft: diffDays,
              });

              if (res.successCount > 0) {
                sentCount++;
                await this.markSent(event, res, diffDays);

                sentEvents.push({
                  event,
                  diffDays,
                  result: res,
                });

                // Dispatch event global agar UI langsung merespon tanpa reload
                window.dispatchEvent(
                  new CustomEvent('h3ReminderSent', {
                    detail: {
                      event,
                      diffDays,
                      result: res,
                    },
                  })
                );
              }
            } catch (err) {
              console.error(`[AutoReminder] Gagal mengirim email untuk "${event.judul}":`, err);
            }
          }
        }
      }

      if (sentCount > 0) {
        console.log(`[AutoReminder] ✅ Selesai: ${sentCount} pengingat otomatis H-3 berhasil dikirim.`);
      }

      return {
        status: 'completed',
        checked: allEvents.length,
        sent: sentCount,
        events: sentEvents,
      };
    } finally {
      isRunningCheck = false;
    }
  },

  /**
   * Jalankan penjadwal otomatis di latar belakang:
   * - 2 detik setelah startup
   * - Setiap 10 menit saat aplikasi aktif
   * - Seketika saat agenda baru dibuat/diupdate ('kalenderUpdated')
   * - Saat jendela/tab kembali aktif ('focus')
   */
  startAutoScheduler() {
    console.log('[AutoReminder] ⚡ Mesin Pengingat Otomatis H-3 diaktifkan.');

    // 1. Initial run segera setelah aplikasi dibuka
    const initialTimer = setTimeout(() => {
      this.checkAndSendH3Reminders({ silent: true });
    }, 2000);

    // 2. Interval berkala setiap 10 menit
    const intervalId = setInterval(() => {
      this.checkAndSendH3Reminders({ silent: true });
    }, 10 * 60 * 1000);

    // 3. Listener jika ada penambahan / edit kegiatan baru di kalender
    let debounceTimer = null;
    const onKalenderUpdated = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.checkAndSendH3Reminders({ silent: true });
      }, 1200);
    };
    window.addEventListener('kalenderUpdated', onKalenderUpdated);

    // 4. Listener saat tab window kembali fokus
    const onWindowFocus = () => {
      this.checkAndSendH3Reminders({ silent: true });
    };
    window.addEventListener('focus', onWindowFocus);

    // Kembalikan teardown callback
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
      clearTimeout(debounceTimer);
      window.removeEventListener('kalenderUpdated', onKalenderUpdated);
      window.removeEventListener('focus', onWindowFocus);
    };
  },

  /**
   * Ambil ringkasan status pengingat otomatis H-3 untuk dashboard / UI kalender
   */
  async getStatusSummary() {
    const allEvents = await kalenderService.getAll();
    const logs = this.getLogs();

    let upcomingH3Count = 0;
    let sentCount = 0;
    let pendingH3Events = [];

    allEvents.forEach((ev) => {
      if (!ev.tanggal_mulai || ev.status === 'Dibatalkan' || ev.status === 'Selesai') return;
      const diff = calculateDiffDays(ev.tanggal_mulai);
      if (diff !== null && diff >= 0 && diff <= 3) {
        upcomingH3Count++;
        const sent = this.isSent(ev.id, ev.tanggal_mulai) || ev.reminder_h3_sent;
        if (sent) {
          sentCount++;
        } else {
          pendingH3Events.push({ ...ev, diffDays: diff });
        }
      }
    });

    return {
      upcomingH3Count,
      sentCount,
      pendingCount: pendingH3Events.length,
      pendingH3Events,
      totalLogs: Object.keys(logs).length,
    };
  },
};
