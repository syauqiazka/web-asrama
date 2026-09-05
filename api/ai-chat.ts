import type { VercelRequest, VercelResponse } from "@vercel/node";

const GEMINI_KEY = process.env.VITE_GCP_API_KEY || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { message, history, contextData, apiKey } = req.body || {};

    const activeKey =
      apiKey && apiKey.trim().length > 0 ? apiKey.trim() : GEMINI_KEY;

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
      res.status(500).json({
        ok: false,
        error: "Gagal mendapatkan respon dari AI Gemini.",
      });
      return;
    }

    res.status(200).json({ ok: true, reply: replyText });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      error: err?.message || "Internal server error pada AI Chat.",
    });
  }
}
