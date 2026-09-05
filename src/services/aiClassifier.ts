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
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  mei: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  ags: "08",
  sep: "09",
  oct: "10",
  okt: "10",
  nov: "11",
  dec: "12",
  des: "12",
};

/**
 * Format tanggal ke ISO YYYY-MM-DD
 */
export function normalizeDateToISO(rawDate: string, defaultMonth: string = "07"): string {
  const trimmed = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Format DD-Mon (misal: 5-Jan, 12-Feb, 28-Oct)
  const dMon = trimmed.match(/^(\d{1,2})-([a-zA-Z]{3,4})$/i);
  if (dMon) {
    const day = dMon[1].padStart(2, "0");
    const mon = MONTH_MAP[dMon[2].toLowerCase()] || defaultMonth;
    return `2026-${mon}-${day}`;
  }

  // Format DD/MM/YYYY atau DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // Format DD/MM
  const dm = trimmed.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (dm) {
    const day = dm[1].padStart(2, "0");
    const month = dm[2].padStart(2, "0");
    return `2026-${month}-${day}`;
  }

  // Angka tanggal saja (1 sampai 31)
  const dayOnly = trimmed.match(/^(\d{1,2})$/);
  if (dayOnly) {
    const d = parseInt(dayOnly[1]);
    if (d >= 1 && d <= 31) {
      return `2026-${defaultMonth}-${dayOnly[1].padStart(2, "0")}`;
    }
  }

  // Coba parse dengan Date bawaan jika valid
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return "2026-07-01";
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

  // Deteksi bulan jika tercantum di judul atau sel pertama
  let detectedMonth = "07";
  for (const [monKey, monNum] of Object.entries(MONTH_MAP)) {
    if (contextText.includes(monKey)) {
      detectedMonth = monNum;
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

  for (let c = 0; c < rows[0].length; c++) {
    if (c === nameColIdx) continue;
    const colHeader = rows[0][c]?.trim() || "";

    // Abaikan kolom summary atau non-tanggal seperti "Hadir", "% H", "Sakit", "Izin", "Alpa", "Area", "Kamar"
    if (
      /^(hadir|%|sakit|izin|alpa|alpha|total|jumlah|ket|keterangan|area|kamar|kelas|nis|no\.?)$/i.test(
        colHeader
      ) ||
      colHeader.includes("AREA") ||
      colHeader.includes("TANGGAL")
    ) {
      continue;
    }

    // Cek format tanggal: 5-Jan, 12-Feb, YYYY-MM-DD, atau angka 1-31
    const isDatePattern =
      /^\d{1,2}-[a-zA-Z]{3,4}$/i.test(colHeader) ||
      /^\d{4}-\d{2}-\d{2}$/.test(colHeader) ||
      /^\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?$/.test(colHeader);

    const isDayNumber = /^\d{1,2}$/.test(colHeader) && parseInt(colHeader) <= 31 && parseInt(colHeader) >= 1;

    if (isDatePattern || isDayNumber) {
      dateColumns.push({
        colIndex: c,
        rawDate: colHeader,
        isoDate: normalizeDateToISO(colHeader, detectedMonth),
      });
    }
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

  if (isPiket) {
    if (contextText.includes("sabtu") || contextText.includes("roan")) {
      category = "piket_sabtu";
      reasoning = "Terdeteksi sebagai Piket Sabtu / Roan (Kerja Bakti).";
    } else if (contextText.includes("sore")) {
      category = "piket_sore";
      reasoning = "Terdeteksi sebagai Piket Sore.";
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
Balas HANYA JSON:
{
  "sheetType": "piket" | "sholat" | "unknown",
  "category": "sholat_subuh" | "sholat_maghrib" | "sholat_isya" | "sholat_dhuhur" | "sholat_ashar" | "piket_pagi" | "piket_sabtu" | "piket_sore",
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
            return parsed;
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
    // Skip baris header / lantai / kamar / kosong
    if (
      !rawCell ||
      rawCell.startsWith("LANTAI") ||
      rawCell.startsWith("KAMAR") ||
      /^(total|jumlah|keterangan|no\.?|nama|sop|area)$/i.test(rawCell)
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

      if (sheetType === "piket") {
        if (
          cellValue.includes("✔️") ||
          cellValue.includes("✔") ||
          cellValue.includes("✓") ||
          ["v", "V", "check", "1", "hadir"].includes(cellValue.toLowerCase())
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
      });
    }
  }

  return records;
}
