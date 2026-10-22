import type {
  AttendanceCategory,
  AttendanceRecord,
  RawStatus,
} from "../types/attendance";
import { calculateSanctionHours } from "./rulesEngine";

export interface AIClassificationResponse {
  sheetType: "piket" | "sholat" | "unknown";
  category: AttendanceCategory;
  confidence: number;
  reasoning: string;
  nameColumnIndex: number;
  dateColumns: { colIndex: number; rawDate: string; isoDate: string }[];
}

export interface AISettings {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  provider?: "9router" | "gemini" | "openai" | "groq";
}

const MONTH_MAP: Record<string, string> = {
  januari: "01",
  january: "01",
  jan: "01",
  februari: "02",
  february: "02",
  feb: "02",
  maret: "03",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  mei: "05",
  may: "05",
  juni: "06",
  june: "06",
  jun: "06",
  juli: "07",
  july: "07",
  jul: "07",
  agustus: "08",
  august: "08",
  agust: "08",
  ags: "08",
  aug: "08",
  september: "09",
  sept: "09",
  sep: "09",
  oktober: "10",
  october: "10",
  okt: "10",
  oct: "10",
  november: "11",
  nopember: "11",
  nov: "11",
  nop: "11",
  desember: "12",
  december: "12",
  des: "12",
  dec: "12",
};

function buildValidatedISODate(year: string | number, month: string | number, day: string | number): string {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return "";
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Format tanggal ke ISO YYYY-MM-DD; tanggal tidak valid dikembalikan sebagai string kosong.
 */
export function normalizeDateToISO(
  rawDate: string,
  defaultMonth: string = "09",
  defaultYear: string = "2026"
): string {
  const trimmed = rawDate.trim().replace(/^tgl\.?\s*/i, "").replace(/\.0$/, "");

  // Format standar ISO YYYY-MM-DD
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return buildValidatedISODate(iso[1], iso[2], iso[3]);

  // Format YYYY/MM/DD
  const ymd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) {
    return buildValidatedISODate(ymd[1], ymd[2], ymd[3]);
  }

  // Format DD-Mon atau DD Mon atau DD MMMM (misal: 5-Jan, 12 Feb, 28 Oktober)
  const dMon = trimmed.match(/^(\d{1,2})[\s-]+([a-zA-Z]{3,12})$/i);
  if (dMon) {
    const day = dMon[1].padStart(2, "0");
    const mon = MONTH_MAP[dMon[2].toLowerCase()] || defaultMonth;
    return buildValidatedISODate(defaultYear, mon, day);
  }

  // Format Mon DD (misal: Sep 05, September 5)
  const monD = trimmed.match(/^([a-zA-Z]{3,12})[\s-]+(\d{1,2})$/i);
  if (monD) {
    const mon = MONTH_MAP[monD[1].toLowerCase()] || defaultMonth;
    const day = monD[2].padStart(2, "0");
    return buildValidatedISODate(defaultYear, mon, day);
  }

  // Format DD/MM/YYYY atau DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3];
    return buildValidatedISODate(year, month, day);
  }

  // Format DD/MM atau DD-MM
  const dm = trimmed.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (dm) {
    const day = dm[1].padStart(2, "0");
    const month = dm[2].padStart(2, "0");
    return buildValidatedISODate(defaultYear, month, day);
  }

  // Angka tanggal saja (1 sampai 31)
  const dayOnly = trimmed.match(/^(\d{1,2})$/);
  if (dayOnly) {
    const d = parseInt(dayOnly[1]);
    if (d >= 1 && d <= 31) {
      return buildValidatedISODate(defaultYear, defaultMonth, dayOnly[1]);
    }
  }

  // Coba parse dengan Date bawaan jika valid
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return "";
}

/**
 * Bersihkan nama santri dari imbuhan seperti ", km", "(km)", atau spasi berlebih
 */
export function cleanStudentName(rawName: string): string {
  let name = rawName.trim();
  // Hilangkan suffix kamar mandi ", km" atau ",km"
  name = name.replace(/,\s*km$/i, "");
  name = name.replace(/\(\s*km\s*\)$/i, "");
  name = name.replace(/,\s*kamar\s*mandi$/i, "");
  // Rapikan spasi ganda
  name = name.replace(/\s+/g, " ").trim();
  return name;
}

/**
 * Cerdas & Deterministik: Heuristic Classifier & Parser Fallback
 */
export function heuristicClassifyAndParse(
  rows: string[][],
  sheetTitle: string = ""
): AIClassificationResponse {
  if (rows.length < 2) {
    return {
      sheetType: "unknown",
      category: "sholat_subuh",
      confidence: 0,
      reasoning: "Data sheet terlalu sedikit / kosong.",
      nameColumnIndex: -1,
      dateColumns: [],
    };
  }

  const header = rows[0].map((h) => h.toLowerCase());
  const contextText = (sheetTitle + " " + header.join(" ")).toLowerCase();

  // Ekstrak bagian nama tab (setelah "- Tab ") untuk prioritas yang lebih tinggi
  const tabNameMatch = sheetTitle.match(/- Tab (.+)$/i);
  const tabNameOnly = (tabNameMatch ? tabNameMatch[1] : sheetTitle).toLowerCase();

  // Tahun dan bulan dari nama workbook/tab diprioritaskan daripada label template
  // di sel pertama (contoh: workbook September 2026 dengan label sel "Apr").
  let detectedYear = sheetTitle.match(/20\d{2}/)?.[0] ?? "2026";
  const titleMonth = Object.entries(MONTH_MAP).find(([key]) =>
    new RegExp(`(?:^|[^a-z])${key}(?:$|[^a-z])`, "i").test(sheetTitle)
  );
  let detectedMonth = titleMonth?.[1] ?? String(new Date().getMonth() + 1).padStart(2, "0");
  if (!titleMonth) {
    const headerMonth = Object.entries(MONTH_MAP).find(([key]) =>
      new RegExp(`(?:^|[^a-z])${key}(?:$|[^a-z])`, "i").test(header.join(" "))
    );
    if (headerMonth) detectedMonth = headerMonth[1];
  }

  // Jika belum terdeteksi dari kata, cek apakah ada format tanggal eksplisit seperti 2026-09-01 atau 01/09/2026 di header
  for (const h of (titleMonth ? [] : header)) {
    const isoM = h.match(/\d{4}-(\d{2})-\d{2}/);
    if (isoM) {
      detectedMonth = isoM[1];
      break;
    }
    const dmyM = h.match(/\d{1,2}[/-](\d{1,2})[/-]\d{2,4}/);
    if (dmyM) {
      detectedMonth = dmyM[1].padStart(2, "0");
      break;
    }
  }

  // 1. Tentukan kolom nama santri
  let nameColIdx = -1;

  // Cek jika header baris 0 memiliki kolom nama
  nameColIdx = header.findIndex(
    (h) =>
      h.includes("nama") ||
      h.includes("santri") ||
      h.includes("petugas") ||
      h.includes("siswa") ||
      h.includes("penanggung")
  );

  // Jika tidak ditemukan di header, cek sampel kolom 0 dan 1 pada baris 1-6
  if (nameColIdx === -1) {
    // Pada tabel piket, kolom 0 sering kali berisi nama santri (misal: Lutfan, fayyadh, km)
    let col0Names = 0;
    let col1Names = 0;

    for (let r = 1; r < Math.min(rows.length, 8); r++) {
      const val0 = rows[r]?.[0]?.trim() || "";
      const val1 = rows[r]?.[1]?.trim() || "";

      if (
        val0.length > 2 &&
        !val0.startsWith("LANTAI") &&
        !val0.startsWith("KAMAR") &&
        !/^\d+$/.test(val0) &&
        !/^[✓vVxX❌✖️✔️01HhSsIiAa]$/.test(val0)
      ) {
        col0Names++;
      }

      if (
        val1.length > 2 &&
        !val1.startsWith("LANTAI") &&
        !val1.startsWith("KAMAR") &&
        !val1.toLowerCase().includes("tangga") &&
        !val1.toLowerCase().includes("mandi") &&
        !/^\d+$/.test(val1) &&
        !/^[✓vVxX❌✖️✔️01HhSsIiAa]$/.test(val1)
      ) {
        col1Names++;
      }
    }

    if (col0Names >= col1Names && col0Names > 0) {
      nameColIdx = 0;
    } else if (col1Names > 0) {
      nameColIdx = 1;
    } else {
      nameColIdx = 0;
    }
  }

  // 2. Deteksi kolom tanggal
  const dateColumns: { colIndex: number; rawDate: string; isoDate: string }[] = [];

  // Detect month rollover in day-only headers (e.g. 30, 31, 1, 2 in a September workbook).
  const headerDays = rows[0].map((value, index) => ({ index, text: String(value ?? "").trim().replace(/\.0$/, "") }))
    .filter(({ index, text }) => index !== nameColIdx && /^\d{1,2}$/.test(text) && Number(text) >= 1 && Number(text) <= 31);
  const hasRollover = headerDays.some((day, index) => index > 0 && Number(day.text) < Number(headerDays[index - 1].text));
  let dateMonth = Number(detectedMonth);
  let dateYear = Number(detectedYear);
  if (hasRollover && headerDays.length && Number(headerDays[0].text) >= 28) {
    dateMonth -= 1;
    if (dateMonth < 1) { dateMonth = 12; dateYear -= 1; }
  }
  let previousDay: number | undefined;

  for (let c = 0; c < rows[0].length; c++) {
    if (c === nameColIdx) continue;
    const colHeader = String(rows[0][c] ?? "").trim();
    const normalizedHeader = colHeader.replace(/\.0$/, "");

    if (/^(hadir|%\s*h?|sakit|izin|alpa|alpha|total|jumlah|ket|keterangan|area|kamar|kelas|nis|no\.?|persentase)$/i.test(normalizedHeader) ||
        /area|tanggal|nama|santri|siswa/i.test(normalizedHeader)) continue;

    const explicitDate = /^\d{4}-\d{2}-\d{2}(?:[ t].*)?$/.test(colHeader) ||
      /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(colHeader) ||
      /^\d{1,2}-[a-zA-Z]{3,12}$/i.test(colHeader) ||
      /^[a-zA-Z]{3,12}[ -]\d{1,2}$/i.test(colHeader);
    const dayOnly = /^\d{1,2}$/.test(normalizedHeader) && Number(normalizedHeader) >= 1 && Number(normalizedHeader) <= 31;
    if (!explicitDate && !dayOnly) continue;

    let isoDate = "";
    if (dayOnly) {
      const day = Number(normalizedHeader);
      if (previousDay !== undefined && day < previousDay) {
        dateMonth += 1;
        if (dateMonth > 12) { dateMonth = 1; dateYear += 1; }
      }
      previousDay = day;
      const candidate = new Date(Date.UTC(dateYear, dateMonth - 1, day));
      if (candidate.getUTCFullYear() === dateYear && candidate.getUTCMonth() === dateMonth - 1 && candidate.getUTCDate() === day) {
        isoDate = `${dateYear}-${String(dateMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    } else {
      isoDate = normalizeDateToISO(colHeader, detectedMonth, detectedYear);
    }
    if (isoDate) dateColumns.push({ colIndex: c, rawDate: colHeader, isoDate });
  }

  // 3. Deteksi tipe: Sholat vs Piket
  let isPiket =
    contextText.includes("piket") ||
    contextText.includes("roan") ||
    contextText.includes("senin") ||
    contextText.includes("selasa") ||
    contextText.includes("rabu") ||
    contextText.includes("kamis") ||
    contextText.includes("jumat") ||
    contextText.includes("sabtu") ||
    contextText.includes("ahad") ||
    contextText.includes("kebersihan");

  let checkOrXCount = 0;
  let hsiaCount = 0;

  for (let r = 1; r < Math.min(rows.length, 10); r++) {
    for (const dCol of dateColumns) {
      const val = rows[r]?.[dCol.colIndex]?.trim() || "";
      if (
        val.includes("✔️") ||
        val.includes("✔") ||
        val.includes("✓") ||
        val.includes("✖️") ||
        val.includes("✖") ||
        val.includes("❌") ||
        val.toLowerCase() === "x"
      ) {
        checkOrXCount++;
      }
      if (["H", "h", "S", "s", "I", "i", "A", "a"].includes(val)) {
        hsiaCount++;
      }
    }
  }

  if (checkOrXCount > hsiaCount) {
    isPiket = true;
  } else if (hsiaCount > checkOrXCount) {
    isPiket = false;
  }

  // 4. Deteksi Kategori Spesifik
  let category: AttendanceCategory = "sholat_subuh";
  let reasoning = "";

  // Prioritaskan sheet baju koko / reward device
  if (
    contextText.includes("koko") ||
    contextText.includes("device") ||
    contextText.includes("tambahan jam") ||
    contextText.includes("pakaian rapih")
  ) {
    category = "baju_koko";
    reasoning =
      "Terdeteksi sebagai Pencatatan Baju Koko Lengkap / Reward Device (+1 Jam per centang ✓, 0 Jam per X).";
  } else if (isPiket) {
    // Cek nama tab secara spesifik terlebih dahulu (prioritas lebih tinggi dari judul workbook)
    const tabHasRoan =
      tabNameOnly.includes("roan") ||
      tabNameOnly.includes("kerja bakti") ||
      tabNameOnly.includes("cuci tong");
    const tabHasHarianKeyword =
      tabNameOnly.includes("pagi") ||
      tabNameOnly.includes("harian") ||
      /\b(ahad|senin|selasa|rabu|kamis|jumat|sabtu)\b/.test(tabNameOnly);

    if (
      tabHasRoan ||
      (!tabHasHarianKeyword &&
        (contextText.includes("roan") ||
          contextText.includes("kerja bakti") ||
          contextText.includes("cuci tong")))
    ) {
      category = "piket_sabtu";
      reasoning = "Terdeteksi sebagai Piket Roan (Kerja Bakti / Cuci Tong Sampah).";
    } else if (contextText.includes("sore")) {
      category = "piket_sore";
      reasoning = "Terdeteksi sebagai Piket Sore.";
    } else if (
      contextText.includes("pagi") ||
      contextText.includes("harian") ||
      tabNameOnly.includes("ahad") ||
      tabNameOnly.includes("senin") ||
      tabNameOnly.includes("selasa") ||
      tabNameOnly.includes("rabu") ||
      tabNameOnly.includes("kamis") ||
      tabNameOnly.includes("jumat") ||
      tabNameOnly.includes("sabtu") ||
      contextText.includes("ahad")
    ) {
      // Hari-hari piket harian (termasuk Sabtu biasa sebagai bagian jadwal harian)
      category = "piket_pagi";
      reasoning = "Terdeteksi sebagai Piket Pagi / Harian.";
    } else if (contextText.includes("sabtu") && !contextText.includes("pagi")) {
      category = "piket_sabtu";
      reasoning = "Terdeteksi sebagai Piket Sabtu / Roan.";
    } else {
      category = "piket_pagi";
      reasoning = "Terdeteksi sebagai Piket Pagi / Harian.";
    }
  } else {
    if (contextText.includes("magrib") || contextText.includes("maghrib")) {
      category = "sholat_maghrib";
      reasoning = "Terdeteksi sebagai Absensi Sholat Maghrib.";
    } else if (contextText.includes("isya")) {
      category = "sholat_isya";
      reasoning = "Terdeteksi sebagai Absensi Sholat Isya.";
    } else if (
      contextText.includes("dzuhur") ||
      contextText.includes("dhuhur")
    ) {
      category = "sholat_dhuhur";
      reasoning = "Terdeteksi sebagai Absensi Sholat Dhuhur.";
    } else if (contextText.includes("ashar") || contextText.includes("asar")) {
      category = "sholat_ashar";
      reasoning = "Terdeteksi sebagai Absensi Sholat Ashar.";
    } else {
      category = "sholat_subuh";
      reasoning = "Terdeteksi sebagai Absensi Sholat Subuh.";
    }
  }

  return {
    sheetType: isPiket ? "piket" : "sholat",
    category,
    confidence: 0.95,
    reasoning,
    nameColumnIndex: nameColIdx,
    dateColumns,
  };
}

/**
 * Panggil AI untuk mengklasifikasi sheet
 */
export async function classifySheetWithAI(
  rows: string[][],
  sheetTitle: string = "",
  aiSettings?: AISettings
): Promise<AIClassificationResponse> {
  const sampleRows = rows.slice(0, 6);
  const sampleCsv = sampleRows.map((r) => r.join(",")).join("\n");

  if (aiSettings?.apiKey && aiSettings.apiKey.trim().length > 0) {
    try {
      const endpoint =
        aiSettings.endpoint || "https://9router.com/v1/chat/completions";
      const model = aiSettings.model || "gpt-4o-mini";

      const prompt = `Anda adalah asisten AI sistem absensi asrama. Klasifikasikan cuplikan CSV berikut:
Judul: "${sheetTitle}"
CSV:
\`\`\`csv
${sampleCsv}
\`\`\`
ATURAN KLASIFIKASI:
1. Jika jadwal piket adalah piket harian / piket pagi (Ahad, Senin, Selasa, Rabu, Kamis, Jumat, Sabtu), pilih category "piket_pagi", JANGAN pilih "piket_sabtu".
2. Category "piket_sabtu" HANYA untuk Piket Roan / Kerja Bakti Akbar (misal Cuci Tong Sampah atau Roan Sabtu).
3. Category "baju_koko" HANYA untuk lembar penilaian pemakaian baju koko / pakaian rapih sholat lengkap, JANGAN pilih baju_koko untuk absensi sholat biasa.

Balas HANYA JSON:
{
  "sheetType": "piket" | "sholat" | "unknown",
  "category": "sholat_subuh" | "sholat_maghrib" | "sholat_isya" | "sholat_dhuhur" | "sholat_ashar" | "piket_pagi" | "piket_sabtu" | "piket_sore" | "baju_koko",
  "confidence": number,
  "reasoning": string,
  "nameColumnIndex": number,
  "dateColumns": [ { "colIndex": number, "rawDate": string, "isoDate": "YYYY-MM-DD" } ]
}`;

      const res = await fetch("/api/ai-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          apiKey: aiSettings.apiKey.trim(),
          endpoint,
          model,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const contentStr = json.choices?.[0]?.message?.content;
        if (contentStr) {
          const parsed = JSON.parse(contentStr);
          if (
            parsed.sheetType &&
            parsed.category &&
            typeof parsed.nameColumnIndex === "number" &&
            Array.isArray(parsed.dateColumns)
          ) {
            // AI assists classification; column and date structure remains deterministic.
            const deterministic = heuristicClassifyAndParse(rows, sheetTitle);
            return {
              ...parsed,
              nameColumnIndex: deterministic.nameColumnIndex,
              dateColumns: deterministic.dateColumns,
              sheetType: deterministic.sheetType === "unknown" ? parsed.sheetType : deterministic.sheetType,
              category: deterministic.sheetType === "unknown" ? parsed.category : deterministic.category,
            };
          }
        }
      }
    } catch {
      // fallback
    }
  }

  return heuristicClassifyAndParse(rows, sheetTitle);
}

/**
 * Normalisasi data baris mentah menjadi array AttendanceRecord[]
 */
export function normalizeSheetData(
  rows: string[][],
  classification: AIClassificationResponse,
  sourceSheetUrl: string
): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const { category, sheetType, nameColumnIndex, dateColumns } = classification;

  if (nameColumnIndex < 0 || dateColumns.length === 0) {
    return records;
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawCell = row[nameColumnIndex]?.trim() || "";
    // Ignore floor and room labels even when the spreadsheet has leading spaces.
    const normalizedNameCell = rawCell.trim().toLocaleUpperCase("id-ID");
    if (
      !normalizedNameCell ||
      normalizedNameCell.startsWith("LANTAI") ||
      normalizedNameCell.startsWith("KAMAR") ||
      /^(total|jumlah|keterangan|no\\.?|nama|sop|area)$/i.test(normalizedNameCell)
    ) {
      continue;
    }

    const studentName = cleanStudentName(rawCell);
    if (!studentName || studentName.length < 2) continue;

    let areaInfo = "";
    if (sheetType === "piket") {
      // Jika kolom nama adalah 0, kolom 1 sering berisi area
      if (nameColumnIndex === 0 && row[1]) {
        areaInfo = row[1].trim();
      } else if (nameColumnIndex > 0 && row[nameColumnIndex - 1]) {
        areaInfo = row[nameColumnIndex - 1].trim();
      }
    }

    for (const dateCol of dateColumns) {
      const cellValue = row[dateCol.colIndex]?.trim() || "";
      if (!cellValue) continue;

      let rawStatus: RawStatus = "H";

      if (sheetType === "piket" || category === "baju_koko") {
        if (
          cellValue.includes("✔️") ||
          cellValue.includes("✔") ||
          cellValue.includes("✓") ||
          ["v", "V", "check", "1", "hadir", "lengkap", "koko"].includes(cellValue.toLowerCase())
        ) {
          rawStatus = "check";
        } else if (
          cellValue.includes("✖️") ||
          cellValue.includes("✖") ||
          cellValue.includes("❌") ||
          cellValue.includes("✕") ||
          ["x", "0", "alpha", "tidak"].includes(cellValue.toLowerCase())
        ) {
          rawStatus = "X";
        } else if (["i", "s"].includes(cellValue.toLowerCase())) {
          rawStatus = "I"; // izin / sakit piket = 0 jam sanksi
        } else {
          continue;
        }
      } else {
        // Sholat
        const upper = cellValue.toUpperCase();
        if (upper === "H") rawStatus = "H";
        else if (upper === "S") rawStatus = "S";
        else if (upper === "I") rawStatus = "I";
        else if (upper === "A") rawStatus = "A";
        else continue;
      }

      const sanctionHours = calculateSanctionHours(category, rawStatus);

      records.push({
        studentName,
        date: dateCol.isoDate,
        category,
        rawStatus,
        sanctionHours,
        sourceSheetUrl,
        originalAreaOrNotes: areaInfo,
        hasBajuKoko: category === "baju_koko" ? rawStatus === "check" : undefined,
      });
    }
  }

  return records;
}
