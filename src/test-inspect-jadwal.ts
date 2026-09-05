import { parseCSV } from './services/sheetFetcher';

async function inspectJadwal() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/102ZelQqXfmPbjh6plAQ4_rNdwCbkwPHioxgz_ovK-hs/export?format=csv&gid=952620661');
  const csv = await res.text();
  const rows = parseCSV(csv);
  console.log('=== WORKBOOK 1: JADWAL (gid=952620661) ===');
  console.log('Rows count:', rows.length);
  rows.slice(0, 15).forEach((r, idx) => console.log(`Row ${idx}:`, JSON.stringify(r.slice(0, 10))));
}

inspectJadwal();
