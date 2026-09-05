import { parseCSV } from './services/sheetFetcher';

async function inspectRows() {
  // Workbook 1: ABSENSI1 25/26 (gid=1719287593)
  const res1 = await fetch('https://docs.google.com/spreadsheets/d/102ZelQqXfmPbjh6plAQ4_rNdwCbkwPHioxgz_ovK-hs/export?format=csv&gid=1719287593');
  const csv1 = await res1.text();
  const rows1 = parseCSV(csv1);
  console.log('=== WORKBOOK 1: ABSENSI1 25/26 ===');
  console.log('Rows count:', rows1.length);
  rows1.slice(0, 8).forEach((r, idx) => console.log(`Row ${idx}:`, JSON.stringify(r.slice(0, 12))));

  // Workbook 2: SABTU (gid=975899889)
  const res2 = await fetch('https://docs.google.com/spreadsheets/d/1d_Vdx1J9GD9n4s4FuCMbm2l3dHqhWQ_I/export?format=csv&gid=975899889');
  const csv2 = await res2.text();
  const rows2 = parseCSV(csv2);
  console.log('\n=== WORKBOOK 2: SABTU ===');
  console.log('Rows count:', rows2.length);
  rows2.slice(0, 8).forEach((r, idx) => console.log(`Row ${idx}:`, JSON.stringify(r.slice(0, 12))));
}

inspectRows();
