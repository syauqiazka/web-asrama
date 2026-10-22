import * as XLSX from "xlsx";

export interface ImportedWorksheet {
  name: string;
  rows: string[][];
}

export interface ImportedWorkbook {
  id: string;
  name: string;
  sheets: ImportedWorksheet[];
}

const ATTENDANCE_SHEET_NAME = /^(ahad|minggu|senin|selasa|rabu|kamis|jumat|jum'at|jumat|sabtu|subuh|shubuh|dzuhur|dhuhur|zuhur|ashar|asar|magrib|maghrib|isya|piket.*|.*piket.*|.*roan.*|.*koko.*|.*pakaian rapih.*)$/i;
const IGNORED_SHEETS = /^(sop|jadwal|nama siswa|data diri|laporan|rekapan.*|rekap.*|sheet\d+|example|oret-oret|dhuha|puasa)$/i;

function looksLikeAttendance(rows: string[][]): boolean {
  if (rows.length < 2) return false;
  const header = rows[0] ?? [];
  const headerText = header.join(" ").toLowerCase();
  const hasNameOrArea = /nama|santri|siswa|area|tanggal|petugas/.test(headerText);
  const dateCount = header.filter((value) => {
    const text = String(value ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}/.test(text) || /^\d{1,2}(?:\.0)?$/.test(text) || /^\d{1,2}[/-]\d{1,2}/.test(text);
  }).length;
  const sample = rows.slice(1, 9).flat().map((v) => String(v ?? "").trim().toLowerCase());
  const statusCount = sample.filter((v) => ["h", "s", "i", "a", "x", "✓", "✔", "✔️", "✖️", "❌", "v", "0", "1"].includes(v)).length;
  return hasNameOrArea && dateCount >= 2 && statusCount >= 2;
}

/**
 * Move a real attendance header to row zero when a workbook has title rows above it.
 * This function is also used for Google Sheets CSV data, so both import paths share
 * the same deterministic preprocessing.
 */
export function prepareAttendanceRows(input: string[][]): string[][] {
  const rows = input
    .map((row) => row.map((cell) => String(cell ?? "").replace(/\u00a0/g, " ").trimEnd()))
    .filter((row) => row.some((cell) => cell.trim() !== ""));
  if (rows.length < 2) return rows;

  const limit = Math.min(rows.length, 25);
  let bestIndex = -1;
  let bestScore = -1;

  for (let index = 0; index < limit; index++) {
    const row = rows[index];
    const text = row.join(" ").toLowerCase();
    const dateCount = row.filter((value) =>
      /^\d{4}-\d{2}-\d{2}(?:[ t].*)?$/.test(value.trim()) ||
      /^\d{1,2}(?:\.0)?$/.test(value.trim()) ||
      /^\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?$/.test(value.trim()) ||
      /^\d{1,2}-[a-z]{3,12}$/i.test(value.trim())
    ).length;
    const hasHeaderCue = /nama|santri|siswa|petugas|area\s*[/\\-]?\s*tanggal|area|tanggal/.test(text);
    const score = dateCount * 3 + (hasHeaderCue ? 5 : 0);
    if (dateCount >= 2 && hasHeaderCue && score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  if (bestIndex > 0) return rows.slice(bestIndex);
  return rows;
}

export async function parseWorkbookFile(file: File): Promise<ImportedWorkbook> {
  const extension = file.name.toLowerCase().split(".").pop();
  if (!["xlsx", "xls", "xlsm"].includes(extension ?? "")) {
    throw new Error("Format file tidak didukung. Pilih file .xlsx, .xls, atau .xlsm.");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Ukuran file maksimal 20 MB.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, dense: false });
  const sheets: ImportedWorksheet[] = [];

  for (const name of workbook.SheetNames) {
    if (IGNORED_SHEETS.test(name.trim())) continue;
    if (!ATTENDANCE_SHEET_NAME.test(name.trim())) continue;
    const worksheet = workbook.Sheets[name];
    if (!worksheet) continue;

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
      dateNF: "yyyy-mm-dd",
    });
    const rows = prepareAttendanceRows(
      rawRows.map((row) => row.map((cell) => String(cell ?? "").trim()))
    );
    if (looksLikeAttendance(rows)) sheets.push({ name, rows });
  }

  if (sheets.length === 0) {
    throw new Error(
      "Tidak ditemukan tab absensi yang didukung. Pastikan workbook memiliki tab tanggal dan status absensi, seperti AHAD/SENIN atau Shubuh/Dzuhur/Ashar/Magrib/Isya."
    );
  }

  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    sheets,
  };
}
