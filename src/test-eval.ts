import { heuristicClassifyAndParse } from './services/aiClassifier';
import { parseCSV } from './services/sheetFetcher';

async function testAll() {
  const testSets = [
    {
      label: 'Workbook 1: ABSENSI PIKET HARI SABTU ASRAMA',
      title: 'ABSENSI PIKET HARI SABTU ASRAMA',
      id: '102ZelQqXfmPbjh6plAQ4_rNdwCbkwPHioxgz_ovK-hs',
      tabs: [
        { gid: '952620661', name: 'JADWAL' },
        { gid: '686484194', name: 'CUCI TONG  SAMPAH' },
        { gid: '1719287593', name: 'ABSENSI1 25/26' },
        { gid: '2088447317', name: 'ABSENSI2 25/26' },
        { gid: '1706655207', name: 'ABSENSI3 26/27' },
        { gid: '2008373674', name: 'CUCI TONG SAMPAH' }
      ]
    },
    {
      label: 'Workbook 2: 26/27 GANJIL ABSENSI PIKET PAGI ASRAMA',
      title: '26/27 GANJIL ABSENSI PIKET PAGI ASRAMA .xlsx',
      id: '1d_Vdx1J9GD9n4s4FuCMbm2l3dHqhWQ_I',
      tabs: [
        { gid: '1222856543', name: 'JADWAL' },
        { gid: '1758148373', name: 'AHAD' },
        { gid: '1197123368', name: 'SENIN' },
        { gid: '28623362', name: 'SELASA' },
        { gid: '1527003886', name: 'RABU' },
        { gid: '1011062409', name: 'KAMIS' },
        { gid: '934722687', name: 'JUMAT' },
        { gid: '975899889', name: 'SABTU' }
      ]
    }
  ];

  for (const set of testSets) {
    console.log(`\n========================================`);
    console.log(`EVALUATING: ${set.label}`);
    for (const tab of set.tabs) {
      const exportUrl = `https://docs.google.com/spreadsheets/d/${set.id}/export?format=csv&gid=${tab.gid}`;
      const res = await fetch(exportUrl);
      const csv = await res.text();
      const rows = parseCSV(csv);
      const fullTabTitle = `${set.title} - Tab ${tab.name}`;
      const classification = heuristicClassifyAndParse(rows, fullTabTitle);
      console.log(`Tab [${tab.name}] -> Category: ${classification.category} (${classification.sheetType})`);
    }
  }
}

testAll();
