# Spreadsheet import regression cases

These cases are based on the two real workbook examples supplied for the web-asrama import fix. The workbooks themselves are not copied into the repository because they contain student attendance and identity data.

## Case A — `26_27 GANJIL ABSENSI PIKET PAGI ASRAMA .xlsx`

- Import attendance tabs `AHAD`, `SENIN`, `SELASA`, `RABU`, `KAMIS`, `JUMAT`, and `SABTU`.
- The first row contains a weekday, an area label, then real Excel dates (for example `2026-01-04`); preserve those dates exactly.
- Do not import procedural/schedule/reference tabs: `SOP`, `JADWAL`, `ORET-ORET`, `NAMA SISWA`, or the duplicate `example` tab.
- Rows labelled `LANTAI 3`, `KAMAR J`, etc. are group/room labels, not student names.
- Preserve attendance marks `✔️` / `✖️`; normalize names such as `Faray, km` to `Faray`.

## Case B — `cp LAPORAN ABSENSI SEPTEMBER 2026.xlsx`

- Import supported prayer tabs `Shubuh`, `Dzuhur`, `Ashar`, `Magrib`, and `Isya`; do not treat `Dhuha`, `Puasa`, biodata, report, or summary tabs as one of the supported categories.
- The attendance header is row 1, with `Nama/tanggal` in column B and day numbers from column C onward. Summary columns `Hadir`, `Sakit`, `Izin`, and `Alpa` must not become dates.
- The workbook title establishes September 2026 even if a template label in cell A1 says `Apr`.
- For headers `30, 31, 1, 2, ...`, the first two dates are August 30 and 31, then September 1 onward. Invalid dates must not be fabricated.
- Only status cells `H`, `S`, `I`, and `A` become attendance records.

## Acceptance checks

1. Uploaded Excel workbooks and Google Sheets go through the same row preparation, classification, and normalization path.
2. A workbook with no supported attendance tabs shows a clear error instead of silently creating zero records.
3. Month/day inference never falls back to the first day of a month for an unrecognized header.
4. Summary columns and room/floor labels never produce attendance records.
5. Removing an uploaded workbook removes it from the next processing run; reset clears uploads and cached records.
