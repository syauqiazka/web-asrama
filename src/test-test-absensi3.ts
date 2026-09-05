import { parseCSV } from './services/sheetFetcher';
import { heuristicClassifyAndParse } from './services/aiClassifier';

async function testAbsensi3() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/102ZelQqXfmPbjh6plAQ4_rNdwCbkwPHioxgz_ovK-hs/export?format=csv&gid=1706655207');
  const csv = await res.text();
  const rows = parseCSV(csv);
  const title = "ABSENSI PIKET HARI SABTU ASRAMA - Tab ABSENSI3 26/27";
  const result = heuristicClassifyAndParse(rows, title);
  console.log('Result for ABSENSI3 26/27:');
  console.log('sheetType:', result.sheetType);
  console.log('category:', result.category);
  console.log('nameColumnIndex:', result.nameColumnIndex);
  console.log('dateColumns count:', result.dateColumns.length);
  console.log('dateColumns:', result.dateColumns.slice(0, 5));
}

testAbsensi3();
