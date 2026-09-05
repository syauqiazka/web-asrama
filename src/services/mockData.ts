export interface DemoSheetDef {
  id: string;
  name: string;
  categoryHint: string;
  url: string;
  csvContent: string;
}

export const DEMO_SHEETS: DemoSheetDef[] = [
  {
    id: "demo-piket-pagi",
    name: "Piket Pagi - Harian Asrama",
    categoryHint: "piket_pagi",
    url: "https://docs.google.com/spreadsheets/d/1DemoAsramaPiketPagi2026/edit#gid=0",
    csvContent: `No,Lokasi Piket,Petugas Santri,2026-09-01,2026-09-02,2026-09-03,2026-09-04,2026-09-05
1,Masjid Lt 1,Ahmad Fauzi,✓,✓,X,✓,✓
2,Asrama Kamar 1,Budi Santoso,✓,✓,✓,✓,✓
3,Dapur & Ruang Makan,Cahyo Pratama,X,✓,X,✓,✓
4,Halaman Depan,Doni Setiawan,✓,✓,✓,✓,✓
5,Kamar Mandi Utama,Eko Prasetyo,✓,X,✓,✓,X
6,Gedung Kelas,Fajar Nugroho,✓,✓,✓,✓,✓
7,Area Parkir,Gani Arifin,✓,✓,✓,✓,✓`,
  },
  {
    id: "demo-piket-sabtu",
    name: "Piket Sabtu / Roan (Kerja Bakti)",
    categoryHint: "piket_sabtu",
    url: "https://docs.google.com/spreadsheets/d/1DemoAsramaPiketSabtuRoan2026/edit#gid=1001",
    csvContent: `No,Area Roan,Nama Santri,2026-08-30,2026-09-06
1,Taman Barat & Lapangan,Ahmad Fauzi,X,✓
2,Selokan & Drainase Barat,Budi Santoso,✓,✓
3,Selokan & Drainase Timur,Cahyo Pratama,✓,✓
4,Gudang & Perpustakaan,Fajar Nugroho,X,X
5,Kolam & Tempat Wudhu,Gani Arifin,✓,✓
6,Atap & Talang Air,Doni Setiawan,✓,✓
7,Kantin Santri,Eko Prasetyo,✓,✓`,
  },
  {
    id: "demo-sholat-subuh",
    name: "Absensi Sholat Subuh Berjamaah",
    categoryHint: "sholat_subuh",
    url: "https://docs.google.com/spreadsheets/d/1DemoAsramaSholatSubuh2026/edit#gid=2001",
    csvContent: `No,Nama Santri,Kamar,2026-09-01,2026-09-02,2026-09-03,2026-09-04,2026-09-05
1,Ahmad Fauzi,A-101,H,A,H,H,A
2,Budi Santoso,A-101,H,H,S,H,I
3,Cahyo Pratama,A-102,H,H,H,H,H
4,Doni Setiawan,A-102,A,H,H,H,H
5,Eko Prasetyo,B-201,H,H,H,A,H
6,Fajar Nugroho,B-201,A,A,H,H,H
7,Gani Arifin,B-202,H,H,H,H,H`,
  },
  {
    id: "demo-sholat-maghrib",
    name: "Absensi Sholat Maghrib Berjamaah",
    categoryHint: "sholat_maghrib",
    url: "https://docs.google.com/spreadsheets/d/1DemoAsramaSholatMaghrib2026/edit#gid=3001",
    csvContent: `No,Nama Santri,2026-09-01,2026-09-02,2026-09-03,2026-09-04,2026-09-05
1,Ahmad Fauzi,H,H,H,H,A
2,Budi Santoso,H,H,H,H,H
3,Cahyo Pratama,H,A,H,H,H
4,Doni Setiawan,H,H,H,H,H
5,Eko Prasetyo,H,H,H,H,H
6,Fajar Nugroho,H,H,A,H,H
7,Gani Arifin,H,H,H,H,H`,
  },
  {
    id: "demo-sholat-isya",
    name: "Absensi Sholat Isya Berjamaah",
    categoryHint: "sholat_isya",
    url: "https://docs.google.com/spreadsheets/d/1DemoAsramaSholatIsya2026/edit#gid=4001",
    csvContent: `No,Nama Santri,2026-09-01,2026-09-02,2026-09-03,2026-09-04,2026-09-05
1,Ahmad Fauzi,H,H,H,H,H
2,Budi Santoso,H,H,H,H,H
3,Cahyo Pratama,H,H,H,A,H
4,Doni Setiawan,H,H,H,H,H
5,Eko Prasetyo,H,H,H,H,A
6,Fajar Nugroho,H,H,H,H,H
7,Gani Arifin,H,H,H,H,H`,
  },
  {
    id: "demo-sholat-dhuhur",
    name: "Absensi Sholat Dhuhur (Uji Coba Non-Sanksi)",
    categoryHint: "sholat_dhuhur",
    url: "https://docs.google.com/spreadsheets/d/1DemoAsramaSholatDhuhur2026/edit#gid=5001",
    csvContent: `No,Nama Santri,2026-09-01,2026-09-02,2026-09-03,2026-09-04,2026-09-05
1,Budi Santoso,A,A,A,A,A
2,Doni Setiawan,A,A,H,H,H`,
  },
];
