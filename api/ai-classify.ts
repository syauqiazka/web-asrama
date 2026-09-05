import type { VercelRequest, VercelResponse } from "@vercel/node";

const GEMINI_KEY = process.env.VITE_GCP_API_KEY || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { prompt, apiKey, endpoint, model } = req.body || {};

    const activeKey =
      apiKey && apiKey.trim().length > 0 ? apiKey.trim() : GEMINI_KEY;

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
      res.status(200).json({
        choices: [{ message: { content: text } }],
      });
      return;
    }

    // Endpoint 9Router / OpenAI
    const targetUrl = endpoint || "https://9router.com/v1/chat/completions";
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
    res.status(aiRes.status).json(aiData);
  } catch (err: any) {
    res.status(500).json({
      error: err?.message || "Gagal menghubungi layanan AI",
    });
  }
}
