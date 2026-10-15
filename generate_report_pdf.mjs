import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();

// Primary Colors
const primaryColor = [0, 43, 102];      // JNE Blue #002B66
const secondaryColor = [227, 30, 36];   // JNE Red #E31E24
const darkText = [30, 41, 59];          // Slate 800
const lightText = [100, 116, 139];      // Slate 500
const bgColor = [248, 250, 252];        // Slate 50

// Helper Header & Footer
const addHeaderFooter = (pageNumber, totalPages) => {
  if (pageNumber === 1) return; // Skip cover page

  // Header line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 15, pageWidth - 14, 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('JNE OPERATIONS MANAGEMENT SYSTEM', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...lightText);
  doc.text('Laporan Dokumentasi Fitur & Sistem', pageWidth - 14, 12, { align: 'right' });

  // Footer line
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
  doc.setFontSize(8);
  doc.setTextColor(...lightText);
  doc.text('© 2026 JNE Express Operations — Confidential & Internal Use Only', 14, pageHeight - 10);
  doc.text(`Halaman ${pageNumber} dari ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
};

// ==========================================
// HALAMAN 1: COVER PAGE
// ==========================================
// Background accents
doc.setFillColor(0, 43, 102);
doc.rect(0, 0, pageWidth, 85, 'F');

doc.setFillColor(227, 30, 36);
doc.rect(0, 85, pageWidth, 5, 'F');

// Header Text in Cover
doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.text('PROJECT UMARATAX  •  OPERATIONAL EXCELLENCE', 20, 28);

doc.setFontSize(26);
doc.text('JNE OPERATIONS', 20, 44);
doc.text('MANAGEMENT SYSTEM', 20, 56);

doc.setFont('helvetica', 'normal');
doc.setFontSize(11);
doc.setTextColor(203, 213, 225);
doc.text('Laporan Komprehensif Arsitektur, Fitur, Basis Data & Panduan Operasional', 20, 68);

// Body on Cover
doc.setTextColor(...darkText);
doc.setFont('helvetica', 'bold');
doc.setFontSize(15);
doc.text('Ringkasan Dokumen', 20, 115);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9.5);
doc.setTextColor(...lightText);
const summaryDesc = [
  'Dokumen ini menyajikan dokumentasi teknis dan fungsional lengkap mengenai platform web',
  'JNE Operations Management. Platform ini dirancang untuk memodernisasi pengelolaan operasional',
  'lapangan, pelacakan kehadiran karyawan secara presisi, pelaporan kegiatan harian, evaluasi kinerja',
  'berbasis sistem poin kompetitif, serta monitoring performa terpadu untuk jajaran manajemen.'
];
let curY = 124;
summaryDesc.forEach(line => {
  doc.text(line, 20, curY);
  curY += 5.5;
});

// Metadata Box
doc.setFillColor(248, 250, 252);
doc.roundedRect(20, 155, pageWidth - 40, 75, 4, 4, 'F');
doc.setDrawColor(226, 232, 240);
doc.roundedRect(20, 155, pageWidth - 40, 75, 4, 4, 'S');

doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...primaryColor);
doc.text('Informasi Proyek', 28, 168);

const metaDetails = [
  ['Nama Aplikasi', ': JNE Operations Management System'],
  ['Platform', ': Web Application (Responsive Desktop & Mobile)'],
  ['Teknologi Utama', ': React 18, Vite, Redux Toolkit, Tailwind CSS, Supabase (PostgreSQL)'],
  ['Versi Rilis', ': v1.2.0 (Production Ready)'],
  ['Tanggal Laporan', ': 3 September 2026'],
  ['Target Pengguna', ': Owner, Developer, Staff & Kurir Lapangan JNE Express']
];

let metaY = 177;
metaDetails.forEach(([k, v]) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkText);
  doc.text(k, 28, metaY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(v, 70, metaY);
  metaY += 7;
});

doc.setFont('helvetica', 'italic');
doc.setFontSize(8.5);
doc.setTextColor(...lightText);
doc.text('Disusun oleh Tim Pengembang Umaratax untuk JNE Operations Management', 20, pageHeight - 25);

// ==========================================
// HALAMAN 2: LATAR BELAKANG & TECH STACK
// ==========================================
doc.addPage();

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(...primaryColor);
doc.text('1. Gambaran Umum & Arsitektur Teknologi', 14, 26);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(...darkText);
doc.text(
  'JNE Operations Management dibangun untuk mengatasi tantangan operasional harian yang membutuhkan akurasi tinggi, ' +
  'mulai dari pencatatan jam kerja, pelaporan kegiatan kurir dan gudang, hingga perhitungan insentif kinerja. ' +
  'Sistem mengintegrasikan teknologi modern berbasis cloud dengan keamanan tingkat tinggi.',
  14, 33, { maxWidth: pageWidth - 28, lineHeightFactor: 1.4 }
);

// Tech Stack Table
autoTable(doc, {
  startY: 48,
  head: [['Komponen', 'Teknologi', 'Peran & Implementasi']],
  body: [
    ['Frontend Core', 'React 18 & Vite', 'Single Page Application dengan performa build ultra cepat dan rendering dinamis.'],
    ['State Management', 'Redux Toolkit', 'Manajemen autentikasi terpusat, session pengguna, dan sinkronisasi global.'],
    ['Styling & UI', 'Tailwind CSS', 'Desain modern, glassmorphism, responsive grid, serta visual bertema resmi JNE.'],
    ['Animasi & UX', 'Framer Motion', 'Micro-interactions, transisi halaman halus, animasi modal, dan hover effects.'],
    ['Visualisasi Data', 'Recharts', 'Grafik tren mingguan kurva gradien interaktif dan diagram lingkaran (Pie Chart).'],
    ['Database & Auth', 'Supabase (PostgreSQL)', 'Penyimpanan relational data, Row Level Security (RLS), Trigger SQL, & Cascade.'],
    ['Notifikasi & Dialog', 'SweetAlert2 & Lucide', 'Dialog konfirmasi aksi kritis (hapus, sukses absen) dan icon library modern.'],
    ['Export Engine', 'jsPDF & SheetJS (XLSX)', 'Menghasilkan dokumen resmi dalam format PDF berstandar cetak dan file Excel.']
  ],
  styles: { fontSize: 8.5, cellPadding: 3 },
  headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  margin: { left: 14, right: 14 }
});

// Role-Based Access Control
doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...primaryColor);
doc.text('2. Manajemen Hak Akses Pengguna (Role-Based Access Control)', 14, doc.lastAutoTable.finalY + 12);

autoTable(doc, {
  startY: doc.lastAutoTable.finalY + 16,
  head: [['Role / Peran', 'Deskripsi Peran', 'Hak Akses & Otoritas Fitur']],
  body: [
    [
      'Owner',
      'Pimpinan / Pemilik Operasional',
      'Akses penuh: Dashboard analitik, evaluasi performa seluruh staf, monitoring dan audit laporan kegiatan harian, review poin, serta ekspor seluruh laporan data.'
    ],
    [
      'Developer',
      'Administrator & Pengembang Sistem',
      'Akses penuh: Konfigurasi teknis, manajemen akun staf, monitoring laporan seluruh tim, koreksi data absensi manual, dan manajemen basis data.'
    ],
    [
      'Staff',
      'Kurir & Petugas Operasional Gudang',
      'Akses operasional mandiri: Absensi Clock In & Clock Out, pengiriman Laporan Kegiatan Harian, pengecekan poin pribadi, dan melihat Leaderboard peringkat tim.'
    ]
  ],
  styles: { fontSize: 8.5, cellPadding: 3.5 },
  headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  margin: { left: 14, right: 14 }
});

// ==========================================
// HALAMAN 3: RINCIAN FITUR SISTEM
// ==========================================
doc.addPage();

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(...primaryColor);
doc.text('3. Rincian Modul & Fitur Aplikasi', 14, 26);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(...lightText);
doc.text('Berikut adalah spesifikasi fungsional seluruh modul yang aktif di dalam sistem:', 14, 33);

autoTable(doc, {
  startY: 38,
  head: [['Modul / Menu', 'Fungsi Utama', 'Fitur-Fitur Unggulan']],
  body: [
    [
      'Dashboard',
      'Pusat pemantauan eksekutif dan ringkasan aktivitas operasional real-time.',
      '• 4 Kartu KPI: Hadir Hari Ini, Izin/Sakit, Total Staf, Hadir Minggu Ini.\n• Grafik Kehadiran Real-time (Kurva Area Gradien & Batang Kapsul).\n• Feed Aktivitas Sistem Terkini (Clock In/Out, Laporan Masuk).\n• Sinkronisasi otomatis tanpa perlu memuat ulang halaman.'
    ],
    [
      'Absensi Karyawan',
      'Pencatatan presensi kerja harian berbasis waktu aktual.',
      '• Tombol Clock In & Clock Out otomatis dengan verifikasi waktu.\n• Penambahan poin kehadiran tepat waktu (+10 PTS) secara instan.\n• Input Absensi Manual oleh Supervisor (Hadir, Sakit, Izin, Alpha).\n• Ekspor data kehadiran ke format PDF dan Microsoft Excel (.xlsx).\n• Fitur hapus data absensi dengan auto-cascade ke poin.'
    ],
    [
      'Laporan Harian',
      'Formulir pelaporan tugas dan kegiatan lapangan untuk staf.',
      '• Input Nama Kegiatan, Deskripsi Rinci, dan Status Penyelesaian.\n• Pilihan status: Selesai, Sedang Berjalan, atau Terkendala.\n• Reward otomatis +5 PTS untuk setiap laporan berstatus Selesai.\n• Daftar riwayat laporan yang dikirimkan oleh pengguna bersangkutan.'
    ],
    [
      'Monitoring Laporan Staff',
      'Panel kontrol khusus Owner & Developer untuk mengawasi kinerja tim.',
      '• Ringkasan KPI: Total Laporan, Selesai, Berjalan, Terkendala.\n• Multi-Filter: Pencarian kata kunci, status, nama staf, & rentang waktu.\n• Mode Tampilan Ganda: Mode Kartu (Feed Card) & Mode Tabel.\n• Modal Popup Detail untuk membaca laporan lengkap secara utuh.\n• Ekspor seluruh laporan staf ke format Excel & PDF.\n• Hapus laporan invalid dengan pembatalan poin otomatis.'
    ],
    [
      'Poin Karyawan',
      'Sistem gamifikasi dan evaluasi berbasis merit/kinerja.',
      '• Kartu akumulasi total poin terkumpul (PTS).\n• Leaderboard Peringkat Karyawan dengan medali emas, perak, & perunggu.\n• Log Riwayat Poin lengkap dengan timestamp, tipe (+/-), dan alasan.'
    ],
    [
      'Manajemen Staff',
      'Pengelolaan akun dan struktur organisasi tim kerja.',
      '• Direktori seluruh staf terdaftar beserta perannya (Owner, Dev, Staff).\n• Pencarian cepat staf berdasarkan nama dan email/username.\n• Modal penambahan dan pembaruan profil staf.'
    ],
    [
      'Grafik & Analytics',
      'Analisis mendalam performa dan tren operasional jangka panjang.',
      '• Grafik tren kehadiran mingguan berbasis data riil database.\n• Diagram donat/lingkaran (Pie Chart) persentase distribusi status.'
    ]
  ],
  styles: { fontSize: 8, cellPadding: 3 },
  headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  columnStyles: {
    0: { cellWidth: 35, fontStyle: 'bold' },
    1: { cellWidth: 50 },
    2: { cellWidth: 'auto' }
  },
  margin: { left: 14, right: 14 }
});

// ==========================================
// HALAMAN 4: BASIS DATA & INTEGRITAS SISTEM
// ==========================================
doc.addPage();

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(...primaryColor);
doc.text('4. Arsitektur Basis Data & Integritas Sistem', 14, 26);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(...darkText);
doc.text(
  'Sistem menggunakan PostgreSQL (Supabase) dengan konfigurasi integritas data tingkat enterprise. ' +
  'Setiap mutasi data dilindungi dengan Row Level Security (RLS) serta trigger otomatis.',
  14, 33, { maxWidth: pageWidth - 28, lineHeightFactor: 1.4 }
);

// Database Schema Table
autoTable(doc, {
  startY: 44,
  head: [['Nama Tabel', 'Kolom Kunci', 'Fungsi & Relasi Data']],
  body: [
    ['users', 'id (UUID), username, name, role, poin', 'Tabel master data pengguna dan akumulasi total poin terkini.'],
    ['absensi', 'id, karyawan_id (FK), tanggal, jam_masuk, jam_keluar, status', 'Mencatat riwayat log absensi masuk dan keluar staf harian.'],
    ['laporan_harian', 'id, user_id (FK), kegiatan, deskripsi, status, created_at', 'Menyimpan laporan operasional yang dikirimkan oleh karyawan.'],
    ['aktivitas', 'id, user_id, absensi_id (FK), laporan_id (FK), title, type', 'Audit log aktivitas sistem real-time untuk feed notifikasi header.'],
    ['riwayat_poin', 'id, user_id (FK), absensi_id (FK), laporan_id (FK), jumlah_poin', 'Buku besar transaksi poin (+/-) dengan tautan relasi ke sumber kegiatan.']
  ],
  styles: { fontSize: 8.5, cellPadding: 3.5 },
  headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  margin: { left: 14, right: 14 }
});

// Cascade & Trigger Section
doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...primaryColor);
doc.text('Mekanisme Khusus: Cascade Integrity & Auto-Sync Trigger', 14, doc.lastAutoTable.finalY + 12);

const mechDesc = [
  '1. PostgreSQL ON DELETE CASCADE:',
  '   Ketika data absensi atau laporan harian dihapus (melalui website maupun SQL), database secara',
  '   otomatis menghapus catatan terkait di tabel riwayat_poin dan tabel aktivitas tanpa meninggalkan data yatim (orphaned records).',
  '',
  '2. Trigger sync_user_poin():',
  '   Trigger database otomatis mendengarkan setiap event INSERT, UPDATE, dan DELETE pada tabel riwayat_poin.',
  '   Total poin di tabel users akan otomatis dihitung ulang (SUM jumlah_poin) secara presisi, sehingga tidak pernah',
  '   terjadi selisih antara saldo poin tampilan dan riwayat mutasi poin.',
  '',
  '3. Real-time Event Dispatching:',
  '   Frontend menggunakan Custom Event Listeners (absensiUpdated, laporanUpdated, aktivitasUpdated)',
  '   yang memastikan seluruh grafik, badge notifikasi header, dan tabel data langsung terbarui seketika.'
];

let mechY = doc.lastAutoTable.finalY + 20;
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...darkText);
mechDesc.forEach(line => {
  if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkText);
  }
  doc.text(line, 14, mechY);
  mechY += 5;
});

// ==========================================
// HALAMAN 5: STANDAR OPERASIONAL (SOP) & KESIMPULAN
// ==========================================
doc.addPage();

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(...primaryColor);
doc.text('5. Alur Operasional (SOP) & Rekomendasi Lanjutan', 14, 26);

// SOP Steps Table
autoTable(doc, {
  startY: 34,
  head: [['Waktu / Tahap', 'Pelaku', 'Aktivitas Kerja di Sistem']],
  body: [
    [
      '08:00 WIB (Pagi) / 13:00 WIB (Siang)',
      'Seluruh Staff / Kurir',
      'Melakukan Clock In pada menu Absensi sesuai shift masing-masing. Sistem otomatis mencatat jam hadir dan reward poin.'
    ],
    [
      '08:30 - 16:30 WIB (Siang)',
      'Staff Lapangan & Gudang',
      'Menjalankan tugas distribusi, sortir barang, atau pengantaran paket sesuai rute dan jadwal jaga.'
    ],
    [
      '16:30 - 17:30 WIB (Sore)',
      'Staff / Kurir',
      'Mengisi form Laporan Harian berisi kegiatan yang telah selesai. Sistem memberikan reward +5 Poin.'
    ],
    [
      '17:30 WIB (Pulang)',
      'Seluruh Staff',
      'Melakukan Clock Out pada menu Absensi. Sistem menghitung total jam kerja efektif hari tersebut.'
    ],
    [
      'Berkala / Harian',
      'Owner & Developer',
      'Membuka menu Monitoring Laporan Staff untuk review kinerja tim, mengecek Dashboard, dan mengunduh rekap Excel/PDF.'
    ]
  ],
  styles: { fontSize: 8.5, cellPadding: 3.5 },
  headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  margin: { left: 14, right: 14 }
});

// Kesimpulan Box
doc.setFillColor(248, 250, 252);
doc.roundedRect(14, doc.lastAutoTable.finalY + 12, pageWidth - 28, 48, 3, 3, 'F');
doc.setDrawColor(226, 232, 240);
doc.roundedRect(14, doc.lastAutoTable.finalY + 12, pageWidth - 28, 48, 3, 3, 'S');

doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...primaryColor);
doc.text('Kesimpulan & Kesiapan Sistem', 22, doc.lastAutoTable.finalY + 22);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...darkText);
const conclText = [
  'Aplikasi JNE Operations Management telah berhasil diuji dan siap diimplementasikan secara penuh.',
  'Seluruh alur kerja telah terbukti andal, mulai dari kalkulasi poin otomatis, integritas penghapusan data cascade,',
  'tampilan analitik grafik real-time, hingga monitoring laporan operasional staf secara mendalam.',
  'Platform ini memberikan transparansi kinerja, efisiensi administrasi, dan motivasi kerja yang tinggi bagi seluruh staf.'
];
let conclY = doc.lastAutoTable.finalY + 29;
conclText.forEach(t => {
  doc.text(t, 22, conclY);
  conclY += 5;
});

// Tanda Tangan / Persetujuan
const signY = doc.lastAutoTable.finalY + 70;
doc.setFont('helvetica', 'bold');
doc.setFontSize(9);
doc.setTextColor(...darkText);
doc.text('Disetujui Oleh,', 25, signY);
doc.text('Disiapkan Oleh,', pageWidth - 65, signY);

doc.setFont('helvetica', 'normal');
doc.text('Owner Umaratax', 25, signY + 22);
doc.text('Developer Umaratax', pageWidth - 65, signY + 22);

doc.setFontSize(7.5);
doc.setTextColor(...lightText);
doc.text('Operational Management Lead', 25, signY + 26);
doc.text('Fullstack Software Engineer', pageWidth - 65, signY + 26);

// Apply Header & Footer to all pages
const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  addHeaderFooter(i, totalPages);
}

// Output file
const outputPath = path.join(process.cwd(), 'Laporan_Dokumentasi_Sistem_JNE.pdf');
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(outputPath, pdfBuffer);

console.log(`PDF successfully generated at: ${outputPath} (${pdfBuffer.length} bytes, ${totalPages} pages)`);
