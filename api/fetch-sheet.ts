import type { VercelRequest, VercelResponse } from "@vercel/node";

// Ekstrak daftar tab dan gid dari HTML publik Google Spreadsheet
async function discoverSpreadsheetTabs(
  spreadsheetId: string
): Promise<{ gid: string; name: string }[]> {
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
    const matches = [
      ...html.matchAll(/\\"([0-9]{5,12})\\",\[\{\\"1\\":\[\[0,0,\\"([^\\"]+)\\"\]/g),
    ];
    const tabs: { gid: string; name: string }[] = [];
    const seenGid = new Set<string>();

    for (const m of matches) {
      const gid = m[1];
      const name = m[2];
      if (!seenGid.has(gid)) {
        seenGid.add(gid);
        tabs.push({ gid, name });
      }
    }
    return tabs;
  } catch {
    return [];
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
    const allTabs = await discoverSpreadsheetTabs(spreadsheetId);

    // Cek apakah gid yang diminta adalah tab non-data (seperti SOP atau Laporan)
    const requestedTab = allTabs.find((t) => t.gid === gid);
    const isNonDataTab =
      requestedTab &&
      /^(sop|laporan|example|oret-oret|data diri)$/i.test(
        requestedTab.name.trim()
      );

    // Ambil daftar sub-tab absensi atau piket yang relevan
    const relevantTabs = allTabs.filter((t) =>
      /^(shubuh|subuh|magrib|maghrib|isya|dzuhur|dhuhur|ashar|senin|selasa|rabu|kamis|jumat|sabtu|ahad|piket|roan)$/i.test(
        t.name.trim()
      )
    );

    const multiTabsData: {
      gid: string;
      tabName: string;
      csv: string;
    }[] = [];

    if (relevantTabs.length > 0 && (isNonDataTab || !gid || gid === "0")) {
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
      });
      return;
    }

    // Fetch tab tunggal
    const sheetGid = gid || "0";
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
