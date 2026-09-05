import { parseCSV } from './services/sheetFetcher';
import { classifySheetWithAI } from './services/aiClassifier';
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
const apiKeyMatch = envFile.match(/VITE_GCP_API_KEY=(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';
async function testAI() {
  console.log('API key length:', apiKey.length);
  const aiSettings = {
    apiKey,
    provider: 'gemini' as const,
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-flash-latest'
  };

  // 1. Test Sabtu Roan tab
  const res1 = await fetch('https://docs.google.com/spreadsheets/d/102ZelQqXfmPbjh6plAQ4_rNdwCbkwPHioxgz_ovK-hs/export?format=csv&gid=1706655207');
  const csv1 = await res1.text();
  const rows1 = parseCSV(csv1);
  const title1 = "ABSENSI PIKET HARI SABTU ASRAMA - Tab ABSENSI3 26/27";
  
  // Note: in local node, /api/ai-classify is not running on localhost:node, but let's test direct or local proxy
  console.log('Testing Title 1:', title1);
  // Let's test what prompt was sent
  const sampleCsv = rows1.slice(0, 6).map(r => r.join(',')).join('\n');
  const prompt = `Anda adalah asisten AI sistem absensi asrama. Klasifikasikan cuplikan CSV berikut:
Judul: "${title1}"
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

  const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const json = await resp.json();
  console.log('Gemini raw response:\n', JSON.stringify(json, null, 2));
}

testAI();
