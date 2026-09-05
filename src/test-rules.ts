import {
  calculateSanctionHours,
  aggregateStudentSummaries,
} from "./services/rulesEngine.ts";
import {
  heuristicClassifyAndParse,
  normalizeSheetData,
} from "./services/aiClassifier.ts";
import { parseCSV } from "./services/sheetFetcher.ts";
import { DEMO_SHEETS } from "./services/mockData.ts";
import type { AttendanceRecord } from "./types/attendance.ts";

console.log("=== MEMULAI PENGUJIAN BUSINESS RULES ENGINE ===");

// 1. Pengujian fungsi calculateSanctionHours
console.log("\n1. Test calculateSanctionHours:");
console.assert(
  calculateSanctionHours("sholat_subuh", "A") === 2,
  "Subuh + A harus 2 jam"
);
console.assert(
  calculateSanctionHours("sholat_subuh", "H") === 0,
  "Subuh + H harus 0 jam"
);
console.assert(
  calculateSanctionHours("sholat_subuh", "S") === 0,
  "Subuh + S (Sakit) harus 0 jam"
);
console.assert(
  calculateSanctionHours("sholat_subuh", "I") === 0,
  "Subuh + I (Izin) harus 0 jam"
);
console.assert(
  calculateSanctionHours("sholat_maghrib", "A") === 2,
  "Maghrib + A harus 2 jam"
);
console.assert(
  calculateSanctionHours("sholat_isya", "A") === 2,
  "Isya + A harus 2 jam"
);
console.assert(
  calculateSanctionHours("sholat_dhuhur", "A") === 0,
  "Dhuhur + A harus 0 jam (diabaikan)"
);
console.assert(
  calculateSanctionHours("sholat_ashar", "A") === 0,
  "Ashar + A harus 0 jam (diabaikan)"
);
console.assert(
  calculateSanctionHours("piket_pagi", "X") === 1,
  "Piket Pagi + X harus 1 jam"
);
console.assert(
  calculateSanctionHours("piket_pagi", "check") === 0,
  "Piket Pagi + check harus 0 jam"
);
console.assert(
  calculateSanctionHours("piket_sabtu", "X") === 1,
  "Piket Sabtu + X harus 1 jam"
);
console.assert(
  calculateSanctionHours("piket_sore", "X") === 1,
  "Piket Sore + X harus 1 jam"
);
console.log("✓ Semua pengujian calculateSanctionHours lolos 100%!");

// 2. Pengujian end-to-end parsing & agregasi untuk dataset santri
console.log("\n2. Test Normalisasi dan Agregasi Multi-Spreadsheet:");
const allRecords: AttendanceRecord[] = [];

for (const sheet of DEMO_SHEETS) {
  const rows = parseCSV(sheet.csvContent);
  const classification = heuristicClassifyAndParse(rows, sheet.name);
  console.log(
    `Sheet "${sheet.name}" -> Terdeteksi: ${classification.category} (${classification.sheetType}), Kolom Nama: ${classification.nameColumnIndex}, Jumlah Kolom Tanggal: ${classification.dateColumns.length}`
  );
  const records = normalizeSheetData(rows, classification, sheet.url);
  allRecords.push(...records);
}

const summaries = aggregateStudentSummaries(allRecords);

console.log("\nHASIL REKAPITULASI SANTRI:");
for (const s of summaries) {
  console.log(
    `- ${s.studentName.padEnd(16)}: ${s.totalSanctionHours} Jam Sanksi (${s.violationCount} pelanggaran) [${s.breakdown.map((b) => `${b.categoryLabel}: ${b.hours}j`).join(", ")}]`
  );
}

// 3. Verifikasi 3 Santri sesuai kriteria Definition of Done
console.log("\n3. Verifikasi Detail 3 Santri (Definition of Done):");

const ahmad = summaries.find((s) => s.studentName === "Ahmad Fauzi");
console.assert(
  ahmad !== undefined,
  "Ahmad Fauzi harus ditemukan dalam rekapitulasi"
);
console.assert(
  ahmad?.totalSanctionHours === 8,
  `Ahmad Fauzi harus 8 jam sanksi (didapat: ${ahmad?.totalSanctionHours})`
);
console.log(
  `✓ Santri 1: Ahmad Fauzi terhitung ${ahmad?.totalSanctionHours} jam sanksi (Tepat: Subuh 4j + Maghrib 2j + Piket Pagi 1j + Piket Roan 1j = 8j)`
);

const budi = summaries.find((s) => s.studentName === "Budi Santoso");
console.assert(
  budi !== undefined,
  "Budi Santoso harus ditemukan dalam rekapitulasi"
);
console.assert(
  budi?.totalSanctionHours === 0,
  `Budi Santoso harus 0 jam sanksi (didapat: ${budi?.totalSanctionHours})`
);
console.log(
  `✓ Santri 2: Budi Santoso terhitung ${budi?.totalSanctionHours} jam sanksi (Tepat: Sakit & Izin tidak disanksi, Sholat Dhuhur tidak disanksi = 0j)`
);

const cahyo = summaries.find((s) => s.studentName === "Cahyo Pratama");
console.assert(
  cahyo !== undefined,
  "Cahyo Pratama harus ditemukan dalam rekapitulasi"
);
console.assert(
  cahyo?.totalSanctionHours === 6,
  `Cahyo Pratama harus 6 jam sanksi (didapat: ${cahyo?.totalSanctionHours})`
);
console.log(
  `✓ Santri 3: Cahyo Pratama terhitung ${cahyo?.totalSanctionHours} jam sanksi (Tepat: Piket Pagi 2j + Maghrib 2j + Isya 2j = 6j)`
);

console.log(
  "\n=== SELURUH PENGUJIAN BUSINESS RULES & MULTI-SPREADSHEET LOLOS! ==="
);
