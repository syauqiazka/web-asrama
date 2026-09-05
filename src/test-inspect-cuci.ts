import { parseCSV } from './services/sheetFetcher';

async function inspectCuciTong() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/102ZelQqXfmPbjh6plAQ4_rNdwCbkwPHioxgz_ovK-hs/export?format=csv&gid=2008373674');
  const csv = await res.text();
  const rows = parseCSV(csv);
  console.log('=== WORKBOOK 1: CUCI TONG SAMPAH (gid=2008373674) ===');
  console.log('Rows count:', rows.length);
  rows.slice(0, 15).forEach((r, idx) => console.log(`Row ${idx}:`, JSON.stringify(r.slice(0, 10))));

  const res3 = await fetch('https://docs.google.com/spreadsheets/d/102ZelQqXfmPbjh6plAQ4_rNdwCbkwPHioxgz_ovK-hs/export?format=csv&gid=1706655207');
  const csv3 = await res3.text();
  const rows3 = parseCSV(csv3);
  console.log('\n=== WORKBOOK 1: ABSENSI3 26/27 (gid=1706655207) ===');
  console.log('Rows count:', rows3.length);
  rows3.slice(0, 15).forEach((r, idx) => console.log(`Row ${idx}:`, JSON.stringify(r.slice(0, 10))));
}

inspectCuciTong();
