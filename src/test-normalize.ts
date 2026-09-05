import { parseCSV } from './services/sheetFetcher';
import { heuristicClassifyAndParse } from './services/aiClassifier';
import { normalizeSheetData } from './services/aiClassifier';
import { aggregateStudentSummaries } from './services/rulesEngine';

async function testNormalize() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/102ZelQqXfmPbjh6plAQ4_rNdwCbkwPHioxgz_ovK-hs/export?format=csv&gid=1706655207');
  const csv = await res.text();
  const rows = parseCSV(csv);
  const title = "ABSENSI PIKET HARI SABTU ASRAMA - Tab ABSENSI3 26/27";
  const classification = heuristicClassifyAndParse(rows, title);
  console.log('Classification category:', classification.category);
  const records = normalizeSheetData(rows, classification, 'https://docs.google.com/spreadsheets/d/102ZelQqXfmPbjh6plAQ4_rNdwCbkwPHioxgz_ovK-hs/');
  console.log('Normalized records count:', records.length);
  console.log('Sample record 0:', records[0]);
  console.log('Sample record 1:', records[1]);

  const summaries = aggregateStudentSummaries(records);
  console.log('Summaries count:', summaries.length);
  summaries.slice(0, 5).forEach(s => {
    console.log(`- ${s.studentName}: total=${s.totalSanctionHours}j, breakdown:`, s.breakdown.map(b => `${b.categoryLabel}: ${b.hours}j (${b.violationCount}x)`));
  });
}

testNormalize();
