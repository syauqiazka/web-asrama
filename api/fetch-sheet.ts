import type { VercelRequest, VercelResponse } from "@vercel/node";

// Ekstrak daftar tab, gid, dan judul spreadsheet dari HTML publik Google Spreadsheet
async function discoverSpreadsheetTabs(
  spreadsheetId: string
): Promise<{ tabs: { gid: string; name: string }[]; title: string }> {
  try {
    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AsramaAttendanceBot/1.0",
        },
      }
    );
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch
      ? titleMatch[1].replace(/ - Google (Spreadsheet|Sheets)$/i, "").trim()
      : "";

    const patterns = [
      /\[\d+,\d+,\\\"(\d+)\\\",\[\{\\\"1\\\":\[\[\d+,\d+,\\\"([^\\\"]+)\\\"/g,
      /\[\d+,\d+,"(\d+)",\[\{"1":\[\[\d+,\d+,"([^"]+)"/g,
      /\\\"([0-9]{5,12})\\\",\[\{\\\"1\\\":\[\[\d+,\d+,\\\"([^\\\"]+)\\\"/g,
    ];
    const tabs: { gid: string; name: string }[] = [];
    const seenGid = new Set<string>();

    for (const pat of patterns) {
      const matches = [...html.matchAll(pat)];
      for (const m of matches) {
        const gid = m[1];
        const name = m[2];
        if (!seenGid.has(gid)) {
          seenGid.add(gid);
          tabs.push({ gid, name });
        }
      }
      if (tabs.length > 0) break;
    }

    if (tabs.length === 0) {
      const gridIdMatch = html.match(/"gridId":([0-9]+)/);
      if (gridIdMatch) {
        tabs.push({ gid: gridIdMatch[1], name: "Sheet1" });
      }
    }

    return { tabs, title };
  } catch {
    return { tabs: [], title: "" };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { spreadsheetId, gid } = req.body || {};

    if (!spreadsheetId) {
      res.status(400).json({ error: "Spreadsheet ID diperlukan" });
      return;
    }

    // Deteksi semua tab yang ada pada spreadsheet ini
    const { tabs: allTabs, title: spreadsheetTitle } = await discoverSpreadsheetTabs(spreadsheetId);

    // Filter tab non-data (jadwal, SOP, contoh, dll)
    const isIgnoredTab = (name: string) => {
      const n = name.trim().toLowerCase();
      // Abaikan tab yang namanya persis sama
      if (/^(sop|laporan|example|contoh|oret-oret|data diri|template|petunjuk|oret oret)$/i.test(n)) return true;
      // Abaikan tab jadwal, nama siswa, rekap, dll (partial match)
      if (/\bjadwal\b/.test(n)) return true;
      if (/\bnama\b/.test(n)) return true;  // "NAMA SISWA", "NAMA", "DAFTAR NAMA"
      if (/\brekap\b/.test(n)) return true;
      if (/\brekapitulasi\b/.test(n)) return true;
      if (/\brangkuman\b/.test(n)) return true;
      if (/\bdashboard\b/.test(n)) return true;
      return false;
    };

    const requestedTab = allTabs.find((t) => t.gid === gid);
    const isNonDataTab = requestedTab && isIgnoredTab(requestedTab.name);

    // Ambil daftar tab yang valid
    const relevantTabs = allTabs.filter((t) => !isIgnoredTab(t.name));

    const multiTabsData: {
      gid: string;
      tabName: string;
      csv: string;
    }[] = [];

    const shouldFetchAllTabs =
      relevantTabs.length > 1 && (isNonDataTab || !gid || gid === "0" || !allTabs.some(t => t.gid === gid));

    if (shouldFetchAllTabs) {
      for (const t of relevantTabs) {
        try {
          const tabRes = await fetch(
            `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${t.gid}`
          );
          const csv = await tabRes.text();
          if (
            tabRes.ok &&
            !csv.includes("<html") &&
            !csv.includes("accounts.google.com")
          ) {
            multiTabsData.push({
              gid: t.gid,
              tabName: t.name,
              csv,
            });
          }
        } catch {
          // lanjut
        }
      }
    }

    if (multiTabsData.length > 0) {
      res.status(200).json({
        ok: true,
        isMultiTab: true,
        tabs: multiTabsData,
        spreadsheetId,
        spreadsheetTitle,
      });
      return;
    }

    // Fetch tab tunggal
    const sheetGid = (gid && gid !== "0") ? gid : (allTabs[0]?.gid || "0");
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${sheetGid}`;
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetGid}`;

    let csvText = "";
    let fetchSuccess = false;

    try {
      const response2 = await fetch(exportUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AsramaAttendanceBot/1.0",
        },
      });

      const text2 = await response2.text();
      if (
        response2.ok &&
        !text2.includes("<html") &&
        !text2.includes("accounts.google.com") &&
        !text2.includes("ServiceLogin")
      ) {
        csvText = text2;
        fetchSuccess = true;
      }
    } catch {
      // gagal
    }

    if (!fetchSuccess) {
      try {
        const response = await fetch(gvizUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AsramaAttendanceBot/1.0",
          },
        });

        const text = await response.text();
        if (
          response.ok &&
          !text.includes("<html") &&
          !text.includes("accounts.google.com") &&
          !text.includes("ServiceLogin")
        ) {
          csvText = text;
          fetchSuccess = true;
        }
      } catch {
        // gagal
      }
    }

    if (!fetchSuccess) {
      res.status(403).json({
        ok: false,
        error:
          "Sheet tidak bisa diakses, pastikan share-nya 'Anyone with the link' (Public).",
      });
      return;
    }

    res.status(200).json({
      ok: true,
      csv: csvText,
      spreadsheetId,
      gid: sheetGid,
      tabName: requestedTab?.name || "",
    });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      error: err?.message || "Gagal mengambil sheet dari Google Spreadsheet.",
    });
  }
}
