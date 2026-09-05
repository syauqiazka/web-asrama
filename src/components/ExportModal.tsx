import React from "react";
import { Download, Printer, FileText } from "lucide-react";
import type { StudentSummary } from "../types/attendance";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentSummary[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  students,
}) => {
  if (!isOpen) return null;

  const exportToCSV = () => {
    const headers = [
      "No",
      "Nama Santri",
      "Total Jam Sanksi",
      "Jumlah Pelanggaran",
      "Rincian Pelanggaran",
    ];

    const rows = students.map((s, idx) => {
      const breakdownStr = s.breakdown
        .map((b) => `${b.categoryLabel}: ${b.hours}j (${b.violationCount}x)`)
        .join("; ");
      return [
        idx + 1,
        `"${s.studentName.replace(/"/g, '""')}"`,
        s.totalSanctionHours,
        s.violationCount,
        `"${breakdownStr.replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvString = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Rekap_Pelanggaran_Asrama_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  const handlePrint = () => {
    window.print();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText style={{ color: "var(--primary)" }} />
            <h3 className="modal-title">Ekspor & Cetak Laporan Rekapitulasi</h3>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Pilih format rekapitulasi data santri ({students.length} santri):
          </p>

          <button
            className="btn btn-primary"
            style={{ padding: "12px", justifyContent: "flex-start" }}
            onClick={exportToCSV}
          >
            <Download size={18} />
            <div style={{ textAlign: "left" }}>
              <div>Unduh Spreadsheet (CSV)</div>
              <small style={{ opacity: 0.8, fontWeight: 400 }}>
                Format tabular untuk dibuka di Excel atau Google Sheets
              </small>
            </div>
          </button>

          <button
            className="btn btn-secondary"
            style={{ padding: "12px", justifyContent: "flex-start" }}
            onClick={handlePrint}
          >
            <Printer size={18} />
            <div style={{ textAlign: "left" }}>
              <div>Cetak Laporan Resmi (PDF / Print)</div>
              <small style={{ opacity: 0.8, fontWeight: 400 }}>
                Tampilan format dokumen bersih siap serah terima ke pengurus
              </small>
            </div>
          </button>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
