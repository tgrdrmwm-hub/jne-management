// Layanan Pengiriman Email Pengingat Kalender / Agenda via MailerSend
// Mendukung pengiriman ke PIC utama dan seluruh staff yang terlibat

const env = typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env : {};

const MAILERSEND_API_KEY = 
  env.VITE_MAILERSEND_API_KEY || 
  'mlsn.9fe71225b8fb01854a798150a2483d92987c90dc1b2c990ebfc79c64fedf16d5';

const MAILERSEND_FROM_EMAIL = 
  env.VITE_MAILERSEND_FROM_EMAIL || 
  'MS_noreply@test-p7kx4xw0ny7g9yjr.mlsender.net';

const MAILERSEND_FROM_NAME = 
  env.VITE_MAILERSEND_FROM_NAME || 
  'JNE Operasional Reminder';

const SANDBOX_VERIFIED_EMAIL = 
  env.VITE_MAILERSEND_SANDBOX_EMAIL || 
  'idfxzxz@gmail.com';

/**
 * Format tanggal Indonesia ramah pengguna
 */
const formatDateIndo = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

/**
 * Template HTML Email Notifikasi Pengingat Agenda JNE
 */
const generateEmailHtml = ({ event, recipient, isSandboxNotice = false, daysLeft = null }) => {
  const staffListNames = (event.staff_terlibat || [])
    .map(st => typeof st === 'string' ? st : `${st.name}${st.role ? ` (${st.role})` : ''}`)
    .join(', ') || 'Semua Tim Operasional';

  const waktu = event.seharian
    ? 'Sepanjang Hari'
    : `${event.jam_mulai || '08:00'} - ${event.jam_selesai || 'Selesai'} WIB`;

  const isH3 = daysLeft !== null && daysLeft !== undefined;
  const daysText = daysLeft === 0 ? 'Hari Ini' : `H-${daysLeft}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pengingat Agenda JNE</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Container Card -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0a1628 0%, #0F3B73 60%, #1A5499 100%); padding: 30px 32px; color: #ffffff;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: #ffffff; padding: 4px 12px; border-radius: 8px; font-weight: 900; font-size: 16px; color: #D31225; letter-spacing: 1px;">
                      JNE
                    </div>
                    <span style="font-size: 12px; color: #93c5fd; font-weight: 600; margin-left: 10px; text-transform: uppercase; letter-spacing: 1.5px;">
                      Sistem Operasional
                    </span>
                  </td>
                  <td align="right">
                    <span style="background-color: ${isH3 ? '#D31225' : 'rgba(255,255,255,0.15)'}; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${isH3 ? `🔔 ${daysText}` : (event.kategori || 'Operasional')}
                    </span>
                  </td>
                </tr>
              </table>

              <h1 style="margin: 20px 0 6px 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: #ffffff;">
                ${event.judul}
              </h1>
              <p style="margin: 0; font-size: 13px; color: #bfdbfe; font-weight: 400;">
                ${isH3 ? `Pengingat Otomatis ${daysText} - Pastikan Kesiapan Agenda` : 'Pemberitahuan Pengingat Jadwal & Agenda'}
              </p>
            </td>
          </tr>

          ${isH3 ? `
          <!-- Banner Pengingat H-3 / Countdown -->
          <tr>
            <td style="padding: 14px 32px; background-color: ${daysLeft === 0 ? '#fee2e2' : '#fef3c7'}; border-bottom: 2px solid ${daysLeft === 0 ? '#ef4444' : '#f59e0b'};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 28px; font-size: 20px; vertical-align: middle;">
                    ${daysLeft === 0 ? '🚨' : '⏰'}
                  </td>
                  <td style="font-size: 12px; font-weight: 700; color: ${daysLeft === 0 ? '#991b1b' : '#92400e'}; line-height: 1.5;">
                    ${daysLeft === 0 
                      ? 'PENGINGAT HARI-H: Agenda kegiatan ini dijadwalkan berlangsung HARI INI!' 
                      : daysLeft === 3
                        ? 'PENGINGAT H-3 ACARA: Agenda ini akan dilaksanakan dalam 3 HARI LAGI. Mohon koordinasikan seluruh persiapan tim operasional!'
                        : `PENGINGAT ${daysText} ACARA: Agenda ini akan dilaksanakan dalam ${daysLeft} hari lagi.`
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          ${isSandboxNotice ? `
          <!-- Sandbox Notice -->
          <tr>
            <td style="padding: 12px 32px; background-color: #eff6ff; border-bottom: 1px solid #dbeafe; font-size: 11px; color: #1e40af;">
              ℹ️ <strong>Mode Sandbox MailerSend:</strong> Email ini dialihkan ke email akun terverifikasi untuk tujuan preview. Penerima yang dituju dalam sistem: <strong>${recipient.name}</strong> (${recipient.email}).
            </td>
          </tr>
          ` : ''}

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.5; color: #334155;">
                Halo <strong>${recipient.name || 'Rekan Tim JNE'}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                ${isH3 
                  ? `Sistem operasional otomatis mengirimkan pengingat bahwa Anda terdaftar sebagai <strong>PIC / Staff yang terlibat</strong> dalam kegiatan yang akan berlangsung <strong>${daysLeft === 0 ? 'hari ini' : `${daysLeft} hari lagi (${daysText})`}</strong>. Mohon pastikan kehadiran dan persiapan Anda tepat waktu:`
                  : `Anda terdaftar sebagai <strong>PIC / Staff yang terlibat</strong> dalam agenda kegiatan berikut ini. Mohon pastikan kehadiran dan persiapan Anda tepat waktu:`
                }
              </p>

              <!-- Agenda Info Box -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; width: 140px;">
                    📅 Tanggal
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700;">
                    ${formatDateIndo(event.tanggal_mulai)}
                    ${event.tanggal_selesai && event.tanggal_selesai !== event.tanggal_mulai ? ` s/d ${formatDateIndo(event.tanggal_selesai)}` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                    ⏰ Waktu
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700;">
                    ${waktu}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                    📍 Lokasi / Tempat
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700;">
                    ${event.lokasi || 'Kantor / Gudang Operasional JNE'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                    👤 Penanggung Jawab
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700;">
                    ${event.pic_nama || '-'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; vertical-align: top;">
                    👥 Tim Terlibat
                  </td>
                  <td style="padding: 6px 0; font-size: 12px; color: #334155;">
                    ${staffListNames}
                  </td>
                </tr>
                ${event.prioritas === 'Mendesak' ? `
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                    ⚡ Prioritas
                  </td>
                  <td style="padding: 6px 0; font-size: 12px; color: #D31225; font-weight: 800;">
                    Mendesak (Prioritas Tinggi)
                  </td>
                </tr>
                ` : ''}
              </table>

              ${event.deskripsi ? `
              <!-- Deskripsi Tambahan -->
              <div style="margin-bottom: 24px; padding: 14px 16px; background-color: #ffffff; border-left: 4px solid #0F3B73; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <div style="font-size: 11px; font-weight: 800; color: #0F3B73; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">
                  Catatan & Arahan Agenda:
                </div>
                <div style="font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-line;">
                  ${event.deskripsi}
                </div>
              </div>
              ` : ''}

              <!-- Catatan Penutup -->
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.6;">
                Silakan lakukan koordinasi dengan PIC terkait jika berhalangan hadir atau membutuhkan persiapan teknis khusus sebelum agenda dimulai.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #94a3b8; font-weight: 600;">
                JNE Express Operations & Logistics Portal
              </p>
              <p style="margin: 0; font-size: 10px; color: #cbd5e1;">
                Email ini dibuat otomatis oleh sistem notifikasi kalender agenda operasional.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

export const emailReminderService = {
  /**
   * Mengirim satu email via MailerSend (mencoba Vite proxy lalu direct)
   */
  async sendSingleEmail({ toEmail, toName, subject, htmlContent, textContent }) {
    const payload = {
      from: {
        email: MAILERSEND_FROM_EMAIL,
        name: MAILERSEND_FROM_NAME,
      },
      to: [
        {
          email: toEmail,
          name: toName || 'Rekan JNE',
        },
      ],
      subject,
      html: htmlContent,
      text: textContent || subject,
    };

    // Urutan endpoint: 1. Vite proxy (/api/mailersend/v1/email) 2. Direct API
    const endpoints = [
      '/api/mailersend/v1/email',
      'https://api.mailersend.com/v1/email',
    ];

    let lastError = null;

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.status === 202 || response.status === 200) {
          return { ok: true, status: response.status };
        }

        const data = await response.json().catch(() => ({}));
        const errorMsg = data?.message || `MailerSend responded with status ${response.status}`;
        lastError = new Error(errorMsg);

        // Jika error kode sandbox limit (#MS42225)
        if (response.status === 422 && (errorMsg.includes('MS42225') || errorMsg.includes('sandbox account'))) {
          lastError.isSandboxError = true;
          return { ok: false, isSandboxError: true, error: lastError };
        }
      } catch (err) {
        lastError = err;
      }
    }

    return { ok: false, error: lastError || new Error('Gagal mengirim email.') };
  },

  /**
   * Ekstrak daftar seluruh penerima (PIC Utama + Staff Terlibat + Custom Email)
   */
  resolveRecipients({ event, staffList = [], customEmail = '' }) {
    const recipientsMap = new Map();

    // 1. PIC Utama
    let picEmail = null;
    let picName = event.pic_nama || 'PIC Kegiatan';

    // Cari dari staffList jika ada pic_id atau kecocokan nama
    const foundPic = staffList.find(s => 
      (event.pic_id && s.id === event.pic_id) || 
      (s.name && event.pic_nama && event.pic_nama.includes(s.name))
    );

    if (foundPic) {
      picEmail = foundPic.email_pribadi || foundPic.email || `${foundPic.cleanUsername || foundPic.username}@umaratax.com`;
      picName = foundPic.name;
    } else if (event.pic_nama && event.pic_nama.includes('@')) {
      picEmail = event.pic_nama;
    }

    if (picEmail) {
      recipientsMap.set(picEmail.toLowerCase(), {
        name: picName,
        email: picEmail,
        isPic: true,
      });
    }

    // 2. Staff yang Terlibat
    (event.staff_terlibat || []).forEach(st => {
      const staffId = typeof st === 'object' ? st.id : null;
      const staffName = typeof st === 'object' ? st.name : st;

      const foundStaff = staffList.find(s => 
        (staffId && s.id === staffId) || 
        (s.name && staffName && s.name.toLowerCase() === staffName.toLowerCase())
      );

      let staffEmail = null;
      if (foundStaff) {
        staffEmail = foundStaff.email_pribadi || foundStaff.email || `${foundStaff.cleanUsername || foundStaff.username}@umaratax.com`;
      } else if (staffName && staffName.includes('@')) {
        staffEmail = staffName;
      }

      if (staffEmail && !recipientsMap.has(staffEmail.toLowerCase())) {
        recipientsMap.set(staffEmail.toLowerCase(), {
          name: staffName,
          email: staffEmail,
          isPic: false,
        });
      }
    });

    // 3. Custom Email Tambahan (misal akun testing / supervisor / email pemilik)
    if (customEmail && customEmail.includes('@')) {
      const cleanCustom = customEmail.trim().toLowerCase();
      if (!recipientsMap.has(cleanCustom)) {
        recipientsMap.set(cleanCustom, {
          name: 'Penerima Tambahan',
          email: cleanCustom,
          isCustom: true,
        });
      }
    }

    return Array.from(recipientsMap.values());
  },

  /**
   * Kirim Email Pengingat Agenda ke PIC dan Seluruh Staff Terlibat
   */
  async sendEventReminder({ event, staffList = [], customRecipientEmail = '', forceSandboxEmail = null }) {
    if (!event || !event.judul) {
      throw new Error('Data kegiatan tidak valid.');
    }

    let recipients = this.resolveRecipients({ event, staffList, customEmail: customRecipientEmail });

    // Jika tidak ada email staf yang ditemukan, atau user ingin preview langsung ke email terverifikasi
    if (recipients.length === 0 && !forceSandboxEmail) {
      recipients = [
        {
          name: event.pic_nama || 'PIC Kegiatan',
          email: SANDBOX_VERIFIED_EMAIL,
          isFallback: true,
        }
      ];
    }

    const results = {
      total: recipients.length,
      successCount: 0,
      sentList: [],
      failedList: [],
      sandboxRerouted: false,
    };

    const subject = `[PENGINGAT JNE] ${event.kategori || 'Agenda'}: ${event.judul} - ${event.tanggal_mulai}`;

    for (const recipient of recipients) {
      const targetEmail = forceSandboxEmail || recipient.email;
      const html = generateEmailHtml({
        event,
        recipient,
        isSandboxNotice: !!forceSandboxEmail || targetEmail === SANDBOX_VERIFIED_EMAIL,
      });

      const res = await this.sendSingleEmail({
        toEmail: targetEmail,
        toName: recipient.name,
        subject,
        htmlContent: html,
        textContent: `Pengingat Agenda JNE: ${event.judul} pada ${event.tanggal_mulai}. PIC: ${event.pic_nama || '-'}. Lokasi: ${event.lokasi || '-'}`,
      });

      if (res.ok) {
        results.successCount++;
        results.sentList.push({
          name: recipient.name,
          email: targetEmail,
          originalEmail: recipient.email,
        });
      } else if (res.isSandboxError && !forceSandboxEmail) {
        // Jika akun MailerSend dibatasi oleh trial/sandbox (hanya boleh kirim ke email pemilik akun),
        // otomatis lakukan pengiriman salinan preview ke SANDBOX_VERIFIED_EMAIL
        const retryRes = await this.sendSingleEmail({
          toEmail: SANDBOX_VERIFIED_EMAIL,
          toName: `${recipient.name} (Preview Sandbox)`,
          subject: `[SANDBOX JNE - ${recipient.name}] ${event.judul}`,
          htmlContent: generateEmailHtml({ event, recipient, isSandboxNotice: true }),
          textContent: `[Mode Sandbox] Pengingat Agenda untuk ${recipient.name} (${recipient.email}): ${event.judul}`,
        });

        if (retryRes.ok) {
          results.successCount++;
          results.sandboxRerouted = true;
          results.sentList.push({
            name: recipient.name,
            email: SANDBOX_VERIFIED_EMAIL,
            intendedFor: recipient.email,
            isSandbox: true,
          });
        } else {
          results.failedList.push({
            name: recipient.name,
            email: recipient.email,
            error: retryRes.error?.message || 'Sandbox retry failed',
          });
        }
      } else {
        results.failedList.push({
          name: recipient.name,
          email: targetEmail,
          error: res.error?.message || 'Gagal mengirim email',
        });
      }
    }

    return results;
  },

  /**
   * Mengirim email pengingat otomatis H-3 acara ke PIC dan seluruh staf yang terlibat
   */
  async sendH3Reminder({ event, staffList = [], daysLeft = 3, forceSandboxEmail = null }) {
    if (!event || !event.judul) {
      throw new Error('Data kegiatan tidak valid untuk pengingat H-3.');
    }

    let recipients = this.resolveRecipients({ event, staffList });

    // Jika tidak ada email staf yang terdaftar, arahkan ke fallback sandbox
    if (recipients.length === 0 && !forceSandboxEmail) {
      recipients = [
        {
          name: event.pic_nama || 'PIC Kegiatan',
          email: SANDBOX_VERIFIED_EMAIL,
          isFallback: true,
        }
      ];
    }

    const results = {
      total: recipients.length,
      successCount: 0,
      sentList: [],
      failedList: [],
      sandboxRerouted: false,
    };

    const daysText = daysLeft === 0 ? 'HARI INI' : `H-${daysLeft}`;
    const subject = `[PENGINGAT ${daysText} JNE] ${event.kategori || 'Agenda'}: ${event.judul} - ${formatDateIndo(event.tanggal_mulai)}`;

    for (const recipient of recipients) {
      const targetEmail = forceSandboxEmail || recipient.email;
      const html = generateEmailHtml({
        event,
        recipient,
        isSandboxNotice: !!forceSandboxEmail || targetEmail === SANDBOX_VERIFIED_EMAIL,
        daysLeft,
      });

      const res = await this.sendSingleEmail({
        toEmail: targetEmail,
        toName: recipient.name,
        subject,
        htmlContent: html,
        textContent: `Pengingat ${daysText} Agenda JNE: ${event.judul} pada ${event.tanggal_mulai} (${daysLeft} hari lagi). PIC: ${event.pic_nama || '-'}. Lokasi: ${event.lokasi || '-'}`,
      });

      if (res.ok) {
        results.successCount++;
        results.sentList.push({
          name: recipient.name,
          email: targetEmail,
          originalEmail: recipient.email,
        });
      } else if (res.isSandboxError && !forceSandboxEmail) {
        // MailerSend Sandbox Trial reroute
        const retryRes = await this.sendSingleEmail({
          toEmail: SANDBOX_VERIFIED_EMAIL,
          toName: `${recipient.name} (Preview Sandbox)`,
          subject: `[SANDBOX ${daysText} JNE - ${recipient.name}] ${event.judul}`,
          htmlContent: generateEmailHtml({ event, recipient, isSandboxNotice: true, daysLeft }),
          textContent: `[Mode Sandbox - Pengingat ${daysText}] Agenda untuk ${recipient.name} (${recipient.email}): ${event.judul}`,
        });

        if (retryRes.ok) {
          results.successCount++;
          results.sandboxRerouted = true;
          results.sentList.push({
            name: recipient.name,
            email: SANDBOX_VERIFIED_EMAIL,
            intendedFor: recipient.email,
            isSandbox: true,
          });
        } else {
          results.failedList.push({
            name: recipient.name,
            email: recipient.email,
            error: retryRes.error?.message || 'Sandbox retry failed',
          });
        }
      } else {
        results.failedList.push({
          name: recipient.name,
          email: targetEmail,
          error: res.error?.message || 'Gagal mengirim email',
        });
      }
    }

    return results;
  },

  /**
   * Mengirim email verifikasi dan kredensial akun baru ke email pribadi staf
   */
  async sendNewAccountCredentials({ name, username, emailPribadi, defaultPassword = '123456' }) {
    if (!emailPribadi || !emailPribadi.includes('@')) {
      throw new Error('Alamat email pribadi tidak valid.');
    }

    const cleanUsername = (username || '').replace(/@umaratax\.com$/i, '').trim();
    const systemEmail = `${cleanUsername}@umaratax.com`;
    const subject = `[JNE Operasional] Informasi Kredensial Akun & Verifikasi - ${name}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kredensial Akun Baru JNE</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #0a1628 0%, #0F3B73 60%, #1A5499 100%); padding: 30px 32px; color: #ffffff;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: #ffffff; padding: 4px 12px; border-radius: 8px; font-weight: 900; font-size: 16px; color: #D31225; letter-spacing: 1px;">
                      JNE
                    </div>
                    <span style="font-size: 12px; color: #93c5fd; font-weight: 600; margin-left: 10px; text-transform: uppercase; letter-spacing: 1.5px;">
                      Sistem Operasional
                    </span>
                  </td>
                  <td align="right">
                    <span style="background-color: rgba(255,255,255,0.15); color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase;">
                      Akun Baru
                    </span>
                  </td>
                </tr>
              </table>

              <h1 style="margin: 20px 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff;">
                Selamat Datang di Sistem JNE
              </h1>
              <p style="margin: 0; font-size: 13px; color: #bfdbfe;">
                Akun Staf & Operasional Anda Telah Siap Digunakan
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px 32px 24px 32px;">
              <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.5; color: #334155;">
                Halo <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                Pendaftaran akun Anda telah berhasil. Silakan gunakan kredensial berikut untuk masuk ke portal operasional JNE:
              </p>

              <!-- Kredensial Box -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; width: 140px;">
                    👤 Nama Lengkap
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700;">
                    ${name}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                    🔑 Username Login
                  </td>
                  <td style="padding: 6px 0; font-size: 13px; color: #0F3B73; font-weight: 800; font-family: monospace;">
                    ${cleanUsername}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                    ✉️ Email Sistem
                  </td>
                  <td style="padding: 6px 0; font-size: 12px; color: #0f172a; font-family: monospace;">
                    ${systemEmail}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                    🔒 Password Default
                  </td>
                  <td style="padding: 6px 0; font-size: 15px; color: #D31225; font-weight: 900; font-family: monospace; letter-spacing: 2px;">
                    ${defaultPassword}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                    🏷️ Role / Posisi
                  </td>
                  <td style="padding: 6px 0; font-size: 12px; color: #0f172a; font-weight: 700;">
                    Staff (Kurir / Kasir / Operasional)
                  </td>
                </tr>
              </table>

              <!-- Notice Wajib Ganti Password -->
              <div style="margin-bottom: 24px; padding: 14px 16px; background-color: #eff6ff; border-left: 4px solid #0F3B73; border-radius: 6px;">
                <div style="font-size: 12px; font-weight: 800; color: #1e40af; margin-bottom: 4px;">
                  ⚠️ Wajib Ganti Password Saat Login Pertama
                </div>
                <div style="font-size: 12px; color: #1e3a8a; line-height: 1.5;">
                  Untuk keamanan akun Anda, sistem akan secara otomatis meminta Anda membuat password baru begitu Anda berhasil login menggunakan password default <strong>${defaultPassword}</strong>.
                </div>
              </div>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 10px auto;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #0F3B73;">
                    <a href="http://localhost:5173/login" target="_blank" style="font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; display: inline-block;">
                      Masuk ke Sistem JNE &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                JNE Express Operations Portal &copy; 2026. Jangan bagikan kredensial ini kepada pihak yang tidak berkepentingan.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    let sendRes = await this.sendSingleEmail({
      toEmail: emailPribadi.trim(),
      toName: name,
      subject,
      htmlContent: html,
      textContent: `Kredensial Akun JNE Anda: Username: ${cleanUsername}, Password Default: ${defaultPassword}. Silakan login dan ganti password Anda saat pertama kali masuk.`,
    });

    if (!sendRes.ok && sendRes.isSandboxError) {
      console.warn(`[MailerSend Sandbox] Mengalihkan kredensial akun ${name} ke ${SANDBOX_VERIFIED_EMAIL}`);
      sendRes = await this.sendSingleEmail({
        toEmail: SANDBOX_VERIFIED_EMAIL,
        toName: `${name} (Sandbox Copy)`,
        subject: `[SANDBOX JNE] Kredensial Akun untuk ${name} (${emailPribadi})`,
        htmlContent: html,
        textContent: `[Mode Sandbox] Kredensial untuk ${name} (${emailPribadi}): Username: ${cleanUsername}, Password: ${defaultPassword}`,
      });
      sendRes.sandboxRerouted = true;
    }

    return sendRes;
  },
};
