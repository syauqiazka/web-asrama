import { parseCSV } from './services/sheetFetcher';
import { heuristicClassifyAndParse, normalizeSheetData } from './services/aiClassifier';
import { aggregateStudentSummaries, calculateSanctionHours } from './services/rulesEngine';

async function simulateApp() {
  const inputs = [
    { url: 'https://docs.google.com/spreadsheets/d/102ZelQqXfmPbjh6plAQ4_rNdwCbkwPHioxgz_ovK-hs/' }, // Sabtu Roan
    { url: 'https://docs.google.com/spreadsheets/d/1d_Vdx1J9GD9n4s4FuCMbm2l3dHqhWQ_I/' } // Piket Pagi (has tab SABTU)
  ];

  const accumulatedRecords: any[] = [];

  for (const item of inputs) {
    console.log('\nProcessing item:', item.url);
    const id = item.url.match(/\/d\/([a-zA-Z0-9-_]+)/)![1];
    const proxyRes = await fetch('http://localhost:5173/api/fetch-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: item.url, spreadsheetId: id, gid: '0' })
    });
    const fetchRes = await proxyRes.json();
    console.log('fetchRes: isMultiTab =', fetchRes.isMultiTab, 'title =', fetchRes.spreadsheetTitle, 'tabs count =', fetchRes.tabs?.length);

    if (fetchRes.isMultiTab && fetchRes.tabs) {
      for (const tab of fetchRes.tabs) {
        const fullTabTitle = fetchRes.spreadsheetTitle
          ? `${fetchRes.spreadsheetTitle} - Tab ${tab.tabName}`
          : tab.tabName;

        const rows = parseCSV(tab.csv);
        const tabClassification = heuristicClassifyAndParse(rows, fullTabTitle);
        console.log(`- Tab [${tab.tabName}] -> Category: ${tabClassification.category} (${tabClassification.sheetType}), confidence: ${tabClassification.confidence}`);

        if (tabClassification.sheetType !== 'unknown') {
          const tabRecords = normalizeSheetData(rows, tabClassification, item.url);
          for (const rec of tabRecords) {
            rec.sanctionHours = calculateSanctionHours(rec.category, rec.rawStatus);
          }
          accumulatedRecords.push(...tabRecords);
          console.log(`  Records count: ${tabRecords.length}`);
        }
      }
    }
  }

  const summaries = aggregateStudentSummaries(accumulatedRecords);
  console.log('\nTotal summaries:', summaries.length);
  for (const s of summaries.slice(0, 5)) {
    console.log(`Santri: ${s.studentName}, Total: ${s.totalSanctionHours}j`);
    s.breakdown.forEach(b => {
      console.log(`   ${b.categoryLabel} (${b.category}): ${b.hours}j (${b.violationCount}x)`);
    });
  }
}

simulateApp();
