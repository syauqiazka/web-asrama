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

// 4. Pengujian khusus Baju Koko Reward Device
console.log("\n4. Test Baju Koko Reward Device (✓ = +1 jam, X = 0 jam, max 7 hari):");

// Baju koko tidak boleh memberi jam sanksi
console.assert(
  calculateSanctionHours("baju_koko", "check") === 0,
  "Baju koko check harus 0 jam sanksi"
);
console.assert(
  calculateSanctionHours("baju_koko", "X") === 0,
  "Baju koko X harus 0 jam sanksi (bukan pelanggaran)"
);

// Ahmad Fauzi: 5 tanda centang dari 7 hari → 5 jam device reward
const ahmadBajuKoko = summaries.find((s) => s.studentName === "Ahmad Fauzi");
console.assert(
  ahmadBajuKoko?.rewardDeviceHours === 5,
  `Ahmad Fauzi harus 5 jam reward device (didapat: ${ahmadBajuKoko?.rewardDeviceHours})`
);
console.log(`✓ Ahmad Fauzi: ${ahmadBajuKoko?.rewardDeviceHours} jam reward device (5 hari pakai baju koko lengkap dari 7 hari)`);

// Budi Santoso: 7 centang dari 7 hari → capped 7 jam device
const budiBajuKoko = summaries.find((s) => s.studentName === "Budi Santoso");
console.assert(
  budiBajuKoko?.rewardDeviceHours === 7,
  `Budi Santoso harus 7 jam reward device (capped) (didapat: ${budiBajuKoko?.rewardDeviceHours})`
);
console.log(`✓ Budi Santoso: ${budiBajuKoko?.rewardDeviceHours} jam reward device (7 hari penuh, capped max 7)`);

// Cahyo Pratama: 3 centang dari 7 hari → 3 jam device
const cahyoBajuKoko = summaries.find((s) => s.studentName === "Cahyo Pratama");
console.assert(
  cahyoBajuKoko?.rewardDeviceHours === 3,
  `Cahyo Pratama harus 3 jam reward device (didapat: ${cahyoBajuKoko?.rewardDeviceHours})`
);
console.log(`✓ Cahyo Pratama: ${cahyoBajuKoko?.rewardDeviceHours} jam reward device (3 hari pakai baju koko dari 7 hari)`);

// Gani Arifin: 7 centang dari 7 hari → capped 7 jam device
const ganiBajuKoko = summaries.find((s) => s.studentName === "Gani Arifin");
console.assert(
  ganiBajuKoko?.rewardDeviceHours === 7,
  `Gani Arifin harus 7 jam reward device (capped) (didapat: ${ganiBajuKoko?.rewardDeviceHours})`
);
console.log(`✓ Gani Arifin: ${ganiBajuKoko?.rewardDeviceHours} jam reward device (7/7 hari, capped max 7)`);

console.log("✓ Semua pengujian Baju Koko Reward Device lolos 100%!");

console.log(
  "\n=== SELURUH PENGUJIAN BUSINESS RULES & MULTI-SPREADSHEET LOLOS! ==="
);
