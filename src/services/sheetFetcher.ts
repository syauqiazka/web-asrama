import { DEMO_SHEETS } from "./mockData";

export interface ParsedSheetUrl {
  isValid: boolean;
  spreadsheetId?: string;
  gid?: string;
  errorMessage?: string;
}

export function validateGoogleSheetUrl(url: string): ParsedSheetUrl {
  const trimmed = url.trim();
  if (!trimmed) {
    return { isValid: false, errorMessage: "URL tidak boleh kosong." };
  }

  // Cek jika ini salah satu URL demo
  const matchedDemo = DEMO_SHEETS.find((d) => d.url === trimmed);
  if (matchedDemo) {
    return {
      isValid: true,
      spreadsheetId: matchedDemo.id,
      gid: "0",
    };
  }

  // Validasi pola docs.google.com/spreadsheets/d/...
  if (!trimmed.includes("docs.google.com/spreadsheets")) {
    return {
      isValid: false,
      errorMessage:
        "Bukan URL Google Spreadsheet yang valid. Format: https://docs.google.com/spreadsheets/d/.../edit#gid=...",
    };
  }

  const idMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch || !idMatch[1]) {
    return {
      isValid: false,
      errorMessage: "Gagal menemukan Spreadsheet ID dari link yang diberikan.",
    };
  }

  const spreadsheetId = idMatch[1];

  // Ekstrak gid jika ada di query atau hash
  let gid = "0";
  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
  if (gidMatch && gidMatch[1]) {
    gid = gidMatch[1];
  }

  return {
    isValid: true,
    spreadsheetId,
    gid,
  };
}

/**
 * Robust CSV parser untuk menangani koma di dalam tanda kutip ("...") dan baris baru
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  // Bersihkan carriage return
  const cleanText = csvText.replace(/\r/g, "");

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote ("")
        currentCell += '"';
        i++;
      } else {
        // Toggle quote
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if (char === "\n" && !inQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export interface TabData {
  gid: string;
  tabName: string;
  csv: string;
  rows: string[][];
}

export interface FetchSheetResult {
  ok: boolean;
  csv?: string;
  rows?: string[][];
  error?: string;
  sourceUrl: string;
  isMultiTab?: boolean;
  tabs?: TabData[];
  tabName?: string;
}

/**
 * Fetch data Google Sheet dalam bentuk CSV (dengan dukungan multi-tab otomatis)
 */
export async function fetchGoogleSheetCSV(
  url: string
): Promise<FetchSheetResult> {
  const validation = validateGoogleSheetUrl(url);
  if (!validation.isValid || !validation.spreadsheetId) {
    return {
      ok: false,
      error: validation.errorMessage || "URL tidak valid",
      sourceUrl: url,
    };
  }

  // 1. Cek jika URL adalah dataset Demo
  const demo = DEMO_SHEETS.find(
    (d) =>
      d.url === url.trim() ||
      d.id === validation.spreadsheetId ||
      url.includes(d.id)
  );
  if (demo) {
    const parsedRows = parseCSV(demo.csvContent);
    return {
      ok: true,
      csv: demo.csvContent,
      rows: parsedRows,
      sourceUrl: url,
      tabName: demo.name,
    };
  }

  // 2. Fetch lewat backend proxy internal Vite (/api/fetch-sheet) untuk bypass CORS
  try {
    const proxyRes = await fetch("/api/fetch-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        spreadsheetId: validation.spreadsheetId,
        gid: validation.gid,
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.ok) {
        if (data.isMultiTab && Array.isArray(data.tabs)) {
          const parsedTabs: TabData[] = data.tabs.map((t: any) => ({
            gid: t.gid,
            tabName: t.tabName,
            csv: t.csv,
            rows: parseCSV(t.csv),
          }));
          return {
            ok: true,
            isMultiTab: true,
            tabs: parsedTabs,
            sourceUrl: url,
          };
        }

        if (data.csv) {
          return {
            ok: true,
            csv: data.csv,
            rows: parseCSV(data.csv),
            sourceUrl: url,
            tabName: data.tabName,
          };
        }
      }
      if (data.error) {
        return { ok: false, error: data.error, sourceUrl: url };
      }
    }
  } catch {
    // Abaikan jika proxy error, coba direct client fetch
  }

  // 3. Fallback direct client fetch
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${validation.spreadsheetId}/gviz/tq?tqx=out:csv&gid=${validation.gid}`;
  const exportUrl = `https://docs.google.com/spreadsheets/d/${validation.spreadsheetId}/export?format=csv&gid=${validation.gid}`;

  try {
    const res = await fetch(exportUrl);
    const text = await res.text();
    if (text.includes("<html") || text.includes("accounts.google.com")) {
      throw new Error("Private sheet");
    }
    return {
      ok: true,
      csv: text,
      rows: parseCSV(text),
      sourceUrl: url,
    };
  } catch {
    try {
      const res2 = await fetch(gvizUrl);
      const text2 = await res2.text();
      if (text2.includes("<html") || text2.includes("accounts.google.com")) {
        return {
          ok: false,
          error:
            "Sheet tidak bisa diakses, pastikan share-nya 'Anyone with the link' (Public).",
          sourceUrl: url,
        };
      }
      return {
        ok: true,
        csv: text2,
        rows: parseCSV(text2),
        sourceUrl: url,
      };
    } catch {
      return {
        ok: false,
        error:
          "Gagal mengambil sheet. Pastikan sheet bersifat Publik ('Anyone with the link') dan URL benar.",
        sourceUrl: url,
      };
    }
  }
}
