import { parseCSV } from './services/sheetFetcher';

async function checkValidTabs() {
  const tabs = [
    { gid: '952620661', name: 'JADWAL' },
    { gid: '686484194', name: 'CUCI TONG  SAMPAH' },
    { gid: '1719287593', name: 'ABSENSI1 25/26' },
    { gid: '2088447317', name: 'ABSENSI2 25/26' },
    { gid: '1706655207', name: 'ABSENSI3 26/27' },
    { gid: '2008373674', name: 'CUCI TONG SAMPAH' }
  ];

  const id = '102ZelQqXfmPbjh6plAQ4_rNdwCbkwPHioxgz_ovK-hs';
  for (const t of tabs) {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${t.gid}`);
    const text = await res.text();
    const isError = text.includes('<!DOCTYPE html>') || text.includes('Halaman Tidak Ditemukan') || text.includes('accounts.google.com');
    console.log(`Tab [${t.name}] (gid=${t.gid}): Status=${res.status}, isValidCSV=${!isError}, length=${text.length}`);
  }
}

checkValidTabs();
