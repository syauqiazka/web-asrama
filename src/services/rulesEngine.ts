import type {
  AttendanceCategory,
  AttendanceRecord,
  CategoryBreakdown,
  RawStatus,
  StudentSummary,
} from "../types/attendance";

/**
 * ATURAN BISNIS PELANGGARAN ABSENSI ASRAMA
 *
 * Catatan Arsitektur:
 * - Kode pelanggaran sholat dipusatkan di sini (SHOLAT_VIOLATION_CODES)
 *   sehingga mudah disesuaikan jika kebijakan asrama berubah (misal 'S' atau 'I' ingin dikenakan sanksi).
 * - Waktu sholat yang dikenai sanksi hanya Subuh, Maghrib, Isya (2 jam per Alpha).
 * - Dhuhur dan Ashar TIDAK dikenakan sanksi (0 jam).
 * - Piket (semua jenis: pagi, sabtu/roan, sore) dikenai sanksi 1 jam untuk status 'X', 0 jam untuk '✓'.
 */

export const SHOLAT_VIOLATION_CODES: RawStatus[] = ["A"];

export const SHOLAT_SANCTIONED_CATEGORIES: AttendanceCategory[] = [
  "sholat_subuh",
  "sholat_maghrib",
  "sholat_isya",
];

export const SHOLAT_IGNORED_SANCTION_CATEGORIES: AttendanceCategory[] = [
  "sholat_dhuhur",
  "sholat_ashar",
];

export const PIKET_CATEGORIES: AttendanceCategory[] = [
  "piket_pagi",
  "piket_sabtu",
  "piket_sore",
];

export const CATEGORY_LABELS: Record<AttendanceCategory, string> = {
  sholat_subuh: "Sholat Subuh",
  sholat_maghrib: "Sholat Maghrib",
  sholat_isya: "Sholat Isya",
  sholat_dhuhur: "Sholat Dhuhur",
  sholat_ashar: "Sholat Ashar",
  piket_pagi: "Piket Pagi/Harian",
  piket_sabtu: "Piket Sabtu/Roan",
  piket_sore: "Piket Sore",
  baju_koko: "Baju Koko (Reward Device)",
  pakaian_rapih: "Pakaian Rapih Sholat (Reward Device)",
};

/**
 * Menghitung jam sanksi untuk satu record absensi
 */
export function calculateSanctionHours(
  category: AttendanceCategory,
  rawStatus: RawStatus
): number {
  // 0. Kategori Baju Koko & Pakaian Rapih - Bukan pelanggaran, jam sanksi selalu 0
  if (category === "baju_koko" || category === "pakaian_rapih") {
    return 0;
  }

  // 1. Kategori Sholat
  if (
    category.startsWith("sholat_") ||
    SHOLAT_SANCTIONED_CATEGORIES.includes(category) ||
    SHOLAT_IGNORED_SANCTION_CATEGORIES.includes(category)
  ) {
    // Dhuhur dan Ashar TIDAK dihitung sanksi
    if (SHOLAT_IGNORED_SANCTION_CATEGORIES.includes(category)) {
      return 0;
    }

    // Hanya Subuh, Maghrib, Isya
    if (SHOLAT_SANCTIONED_CATEGORIES.includes(category)) {
      if (SHOLAT_VIOLATION_CODES.includes(rawStatus)) {
        return 2; // 2 jam per kejadian Alpha
      }
      return 0; // H, S, I tidak kena sanksi
    }
  }

  // 2. Kategori Piket
  if (PIKET_CATEGORIES.includes(category)) {
    if (rawStatus === "X") {
      return 1; // 1 jam per kejadian tidak piket
    }
    if (rawStatus === "check") {
      return 0; // Piket terlaksana
    }
    return 0;
  }

  return 0;
}

/**
 * Agregasi seluruh record absensi per nama santri
 */
export function aggregateStudentSummaries(
  records: AttendanceRecord[]
): StudentSummary[] {
  const map = new Map<
    string,
    {
      studentName: string;
      records: AttendanceRecord[];
      categoryMap: Map<
        AttendanceCategory,
        { violationCount: number; hours: number }
      >;
    }
  >();

  for (const rec of records) {
    const cleanName = rec.studentName.trim();
    if (!cleanName) continue;

    if (!map.has(cleanName)) {
      map.set(cleanName, {
        studentName: cleanName,
        records: [],
        categoryMap: new Map(),
      });
    }

    const entry = map.get(cleanName)!;
    entry.records.push(rec);

    const catStats = entry.categoryMap.get(rec.category) || {
      violationCount: 0,
      hours: 0,
    };
    if (rec.sanctionHours > 0) {
      catStats.violationCount += 1;
      catStats.hours += rec.sanctionHours;
    }
    entry.categoryMap.set(rec.category, catStats);
  }

  const summaries: StudentSummary[] = [];

  for (const [, entry] of map) {
    let totalHours = 0;
    let totalViolations = 0;
    const breakdown: CategoryBreakdown[] = [];

    // Urutan kategori yang rapi
    const allCategories: AttendanceCategory[] = [
      "sholat_subuh",
      "sholat_maghrib",
      "sholat_isya",
      "piket_pagi",
      "piket_sabtu",
      "piket_sore",
      "sholat_dhuhur",
      "sholat_ashar",
    ];

    for (const cat of allCategories) {
      const stats = entry.categoryMap.get(cat);
      if (stats && (stats.violationCount > 0 || stats.hours > 0)) {
        totalHours += stats.hours;
        totalViolations += stats.violationCount;
        breakdown.push({
          category: cat,
          categoryLabel: CATEGORY_LABELS[cat] || cat,
          violationCount: stats.violationCount,
          hours: stats.hours,
        });
      }
    }

    // Perhitungan Reward Device: Baju Koko / Pakaian Rapih Sholat Wajib
    // - baju_koko (format lama ✓/X per hari): centang (✓) = +1 jam device per hari
    // - pakaian_rapih (format baru multi-kolom Kopiah/Koko/Sarung/Jubah):
    //   Rapih = (Jubah+Kopiah) ATAU (Koko+Sarung+Kopiah) → +1 jam device per hari
    // Maksimal 7 hari (7 jam reward device)
    const rewardRecords = entry.records.filter(
      (r) => r.category === "baju_koko" || r.category === "pakaian_rapih"
    );
    let eligibleBajuKokoDays = 0;

    if (rewardRecords.length > 0) {
      // Hitung hari unik yang punya setidaknya 1 record "check" (rapih)
      const checkDates = new Set<string>();
      for (const b of rewardRecords) {
        if (b.rawStatus === "check") {
          checkDates.add(b.date);
        }
      }
      eligibleBajuKokoDays = checkDates.size;
    } else {
      // Jika tidak ada sheet baju koko / pakaian rapih yang diinput, reward device tetap 0
      eligibleBajuKokoDays = 0;
    }

    // Maksimal 7 hari (7 jam reward device)
    const rewardHours = Math.min(7, eligibleBajuKokoDays);
    const netSanction = Math.max(0, totalHours - rewardHours);

    // Urutkan records santri secara kronologis (tanggal terbaru dulu)
    entry.records.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    summaries.push({
      studentName: entry.studentName,
      totalSanctionHours: totalHours,
      violationCount: totalViolations,
      breakdown,
      records: entry.records,
      rewardDeviceHours: rewardHours,
      bajuKokoEligibleDays: eligibleBajuKokoDays,
      netSanctionHours: netSanction,
    });
  }

  // Urutkan dari jam sanksi terbanyak, lalu nama alfabetis
  summaries.sort((a, b) => {
    if (b.totalSanctionHours !== a.totalSanctionHours) {
      return b.totalSanctionHours - a.totalSanctionHours;
    }
    return a.studentName.localeCompare(b.studentName);
  });

  return summaries;
}
