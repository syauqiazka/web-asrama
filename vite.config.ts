import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

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

    // Google Sheets meng-embed metadata tab di HTML dalam format JSON string
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

    // Jika tidak ada tab terdeteksi tapi ada gridId default di bootstrapData
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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const GEMINI_KEY = env.VITE_GCP_API_KEY || "";

  return {
  plugins: [
    react(),
    {
      name: "asrama-sheet-proxy",
      configureServer(server) {
        // 1. Endpoint proxy fetch Google Sheet CSV & multi-tab discovery
        server.middlewares.use(
          "/api/fetch-sheet",
          async (req: IncomingMessage, res: ServerResponse) => {
            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            try {
              const body = await parseJsonBody(req);
              const { spreadsheetId, gid } = body;

              if (!spreadsheetId) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Spreadsheet ID diperlukan" }));
                return;
              }

              // Deteksi semua tab yang ada pada spreadsheet ini
              const { tabs: allTabs, title: spreadsheetTitle } = await discoverSpreadsheetTabs(spreadsheetId);

              // Filter tab non-data (seperti SOP, oret-oret, example, template)
              const isIgnoredTab = (name: string) =>
                /^(sop|laporan|example|contoh|oret-oret|data diri|template|petunjuk)$/i.test(
                  name.trim()
                );

              const requestedTab = allTabs.find((t) => t.gid === gid);
              const isNonDataTab = requestedTab && isIgnoredTab(requestedTab.name);

              // Ambil daftar tab yang valid (bukan tab SOP/oret-oret)
              const relevantTabs = allTabs.filter((t) => !isIgnoredTab(t.name));

              // Jika ada lebih dari 1 tab relevan dan user mengirim link workbook tanpa gid khusus (atau tab non-data),
              // otomatis ambil semua sub-tab!
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
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    ok: true,
                    isMultiTab: true,
                    tabs: multiTabsData,
                    spreadsheetId,
                    spreadsheetTitle,
                  })
                );
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
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    ok: false,
                    error:
                      "Sheet tidak bisa diakses, pastikan share-nya 'Anyone with the link' (Public).",
                  })
                );
                return;
              }

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  ok: true,
                  csv: csvText,
                  spreadsheetId,
                  gid: sheetGid,
                  tabName: requestedTab?.name || "",
                })
              );
            } catch (err: any) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  ok: false,
                  error:
                    err?.message ||
                    "Gagal mengambil sheet dari Google Spreadsheet.",
                })
              );
            }
          }
        );

        // 2. Endpoint proxy AI Chat Bot (Google Gemini API)
        server.middlewares.use(
          "/api/ai-chat",
          async (req: IncomingMessage, res: ServerResponse) => {
            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            try {
              const body = await parseJsonBody(req);
              const { message, history, contextData, apiKey } = body;

              const activeKey =
                apiKey && apiKey.trim().length > 0
                  ? apiKey.trim()
                  : GEMINI_KEY;

              const systemInstructionText = `Anda adalah Asisten AI Cerdas SIM Asrama / Pesantren. Anda ramah, sopan, berwibawa islami, dan selalu memberikan jawaban yang akurat, terstruktur, dan solutif bagi Pengurus/Ustaz Asrama.

ATURAN BISNIS ASRAMA:
1. Sholat Berjamaah: Hanya Subuh, Maghrib, Isya yang disanksi (Alpha = 2 jam sanksi). Hadir, Sakit, Izin = 0 jam. Waktu Dhuhur & Ashar tidak disanksi (0 jam).
2. Piket Asrama: Tanda centang (✓/✔️) = 0 jam, Tanda silang (X/✖️) = 1 jam sanksi.

RINGKASAN DATA AKTIF ASRAMA SAAT INI:
${JSON.stringify(contextData || {}, null, 2)}

Instruksi Tambahan:
- Jawab pertanyaan seputar nama santri, jam sanksi, rincian pelanggaran, perbandingan, atau rekomendasi tindakan secara tepat berdasarkan data di atas.
- Jika diminta membuat draft pesan WhatsApp atau surat teguran, buat dengan bahasa yang santun, islami, dan jelas.
- Format teks dengan Markdown yang rapi (gunakan bold, bullet points, dan emoji secukupnya).`;

              // Susun riwayat percakapan untuk Gemini
              const contents: any[] = [];
              if (Array.isArray(history)) {
                for (const h of history) {
                  contents.push({
                    role: h.role === "user" ? "user" : "model",
                    parts: [{ text: h.text || h.parts?.[0]?.text || "" }],
                  });
                }
              }
              contents.push({
                role: "user",
                parts: [{ text: message }],
              });

              // Coba gemini-flash-latest, jika gagal coba gemini-3.6-flash
              let replyText = "";
              let success = false;

              const modelsToTry = ["gemini-flash-latest", "gemini-3.6-flash"];

              for (const modelName of modelsToTry) {
                try {
                  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`;
                  const geminiRes = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      systemInstruction: {
                        parts: [{ text: systemInstructionText }],
                      },
                      contents,
                      generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                      },
                    }),
                  });

                  const data = (await geminiRes.json()) as any;
                  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    replyText = data.candidates[0].content.parts[0].text;
                    success = true;
                    break;
                  }
                } catch {
                  // lanjut model berikutnya
                }
              }

              if (!success) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: "Gagal mendapatkan respon dari AI Gemini.",
                  })
                );
                return;
              }

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: true, reply: replyText }));
            } catch (err: any) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  ok: false,
                  error: err?.message || "Internal server error pada AI Chat.",
                })
              );
            }
          }
        );

        // 3. Endpoint proxy AI Classify (dukungan Gemini & 9Router)
        server.middlewares.use(
          "/api/ai-classify",
          async (req: IncomingMessage, res: ServerResponse) => {
            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            try {
              const body = await parseJsonBody(req);
              const { prompt, apiKey, endpoint, model } = body;

              const activeKey =
                apiKey && apiKey.trim().length > 0
                  ? apiKey.trim()
                  : GEMINI_KEY;

              // Jika apiKey berupa Gemini (AQ...) atau target Gemini
              if (activeKey.startsWith("AQ.") || activeKey.startsWith("AIza")) {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${activeKey}`;
                const geminiRes = await fetch(geminiUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                      responseMimeType: "application/json",
                      temperature: 0.1,
                    },
                  }),
                });

                const data = (await geminiRes.json()) as any;
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    choices: [{ message: { content: text } }],
                  })
                );
                return;
              }

              // Endpoint 9Router / OpenAI
              const targetUrl =
                endpoint || "https://9router.com/v1/chat/completions";
              const targetModel = model || "gpt-4o-mini";

              const aiRes = await fetch(targetUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${activeKey}`,
                },
                body: JSON.stringify({
                  model: targetModel,
                  messages: [{ role: "user", content: prompt }],
                  temperature: 0.1,
                  response_format: { type: "json_object" },
                }),
              });

              const aiData = await aiRes.json();
              res.writeHead(aiRes.status, {
                "Content-Type": "application/json",
              });
              res.end(JSON.stringify(aiData));
            } catch (err: any) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: err?.message || "Gagal menghubungi layanan AI",
                })
              );
            }
          }
        );
      },
    },
  ],
  };
});
