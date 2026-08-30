export const mockUsers = [
  { id: 1, email: 'owner@umaratax.com', password: '123456', name: 'Owner Umaratax', role: 'Owner' },
  { id: 2, email: 'developer@umaratax.com', password: '123456', name: 'Developer Umaratax', role: 'Developer' }
];

export const mockDashboardData = {
  karyawanHadir: 42,
  karyawanIzin: 3,
  totalKaryawan: 45,
  aktivitas: [
    { id: 1, text: 'Agus Pratama melakukan absensi (Hadir)', time: '10 menit yang lalu' },
    { id: 2, text: 'Siti Aminah memvalidasi absensi', time: '1 jam yang lalu' },
    { id: 3, text: 'Dodi Setiawan melakukan absensi (Terlambat)', time: '2 jam yang lalu' },
  ]
};

export const mockGudangData = [
  { id: 1, resi: 'JNE123456789', kurir: 'Agus Pratama', gudang: 'Gudang Pusat (Jakarta)', jumlah: 24, tanggal: '2026-07-24', jam: '08:30', status: 'Selesai', catatan: 'Lengkap' },
  { id: 2, resi: 'JNE987654321', kurir: 'Dodi Setiawan', gudang: 'Gudang Cabang (Bandung)', jumlah: 15, tanggal: '2026-07-24', jam: '10:15', status: 'Proses', catatan: 'Menunggu validasi' },
];

export const mockPaketData = [
  { id: 1, resi: 'PKG00123', pengambil: 'Agus Pratama', jumlah: 10, lokasi: 'Gudang A', tanggal: '2026-07-24', jam: '09:00', status: 'Diambil', catatan: '-' },
  { id: 2, resi: 'PKG00124', pengambil: 'Dodi Setiawan', jumlah: 5, lokasi: 'Gudang B', tanggal: '2026-07-24', jam: '11:00', status: 'Pending', catatan: 'Kurir belum datang' },
];

export const mockJadwalData = [
  { id: 1, nama: 'Agus Pratama', shift: 'Pagi', hari: 'Senin', jamMasuk: '08:00', jamPulang: '16:00', status: 'Aktif', catatan: '-' },
  { id: 2, nama: 'Dodi Setiawan', shift: 'Siang', hari: 'Senin', jamMasuk: '16:00', jamPulang: '00:00', status: 'Aktif', catatan: '-' },
];

export const mockAbsensiData = [
  { id: 1, nama: 'Agus Pratama', tanggal: '2026-07-24', jamMasuk: '07:50', jamKeluar: '16:05', totalJam: 8, status: 'Hadir' },
  { id: 2, nama: 'Dodi Setiawan', tanggal: '2026-07-24', jamMasuk: '16:15', jamKeluar: '-', totalJam: 0, status: 'Terlambat' },
  { id: 3, nama: 'Budi Santoso', tanggal: '2026-07-24', jamMasuk: '-', jamKeluar: '-', totalJam: 0, status: 'Sakit' },
];

export const mockPoinData = [
  { id: 1, nama: 'Agus Pratama', totalPoin: 125, rank: 1, riwayat: [{ tgl: '2026-07-24', aktivitas: 'Mengantar Paket', poin: 10 }] },
  { id: 2, nama: 'Dodi Setiawan', totalPoin: 85, rank: 2, riwayat: [{ tgl: '2026-07-24', aktivitas: 'Hadir Tepat Waktu', poin: 5 }] },
];

// Data for Charts
export const chartDataKehadiran = [
  { name: 'Senin', hadir: 42, izin: 3 },
  { name: 'Selasa', hadir: 44, izin: 1 },
  { name: 'Rabu', hadir: 40, izin: 5 },
  { name: 'Kamis', hadir: 43, izin: 2 },
  { name: 'Jumat', hadir: 45, izin: 0 },
  { name: 'Sabtu', hadir: 41, izin: 4 },
  { name: 'Minggu', hadir: 10, izin: 2 },
];
