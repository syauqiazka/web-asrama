import React from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Layers,
} from "lucide-react";
import { CATEGORY_LABELS } from "../services/rulesEngine";
import type { SheetInputItem } from "../types/attendance";

interface ProcessingStatusCardProps {
  sheetInputs: SheetInputItem[];
  isProcessing: boolean;
}

export const ProcessingStatusCard: React.FC<ProcessingStatusCardProps> = ({
  sheetInputs,
  isProcessing,
}) => {
  // Hanya tampilkan jika sedang memproses atau ada sheet yang sudah berstatus bukan idle
  const hasActivity = sheetInputs.some((s) => s.status !== "idle");
  if (!hasActivity && !isProcessing) return null;

  return (
    <div className="glass-card" style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={18} style={{ color: "var(--accent)" }} />
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
            Status Pemrosesan Tiap Spreadsheet
          </h3>
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          {
            sheetInputs.filter(
              (s) => s.status === "success" || s.status === "error"
            ).length
          }{" "}
          dari {sheetInputs.length} sheet selesai
        </div>
      </div>

      <div className="status-grid">
        {sheetInputs.map((sheet, index) => {
          let statusBadge = (
            <span className="badge badge-muted">
              <Clock size={12} /> Menunggu
            </span>
          );

          if (sheet.status === "fetching") {
            statusBadge = (
              <span className="badge badge-warning">
                <div
                  className="animate-spin"
                  style={{
                    width: "10px",
                    height: "10px",
                    border: "2px solid #fbbf24",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                  }}
                />
                Mengambil CSV...
              </span>
            );
          } else if (sheet.status === "classifying") {
            statusBadge = (
              <span className="badge badge-info">
                <Sparkles size={12} className="animate-pulse" /> Klasifikasi AI...
              </span>
            );
          } else if (sheet.status === "success") {
            statusBadge = (
              <span className="badge badge-success">
                <CheckCircle2 size={12} /> Berhasil
              </span>
            );
          } else if (sheet.status === "error") {
            statusBadge = (
              <span className="badge badge-danger">
                <XCircle size={12} /> Gagal
              </span>
            );
          }

          return (
            <div
              key={sheet.id}
              className={`status-sheet-card ${
                sheet.status === "success"
                  ? "success"
                  : sheet.status === "error"
                  ? "error"
                  : sheet.status !== "idle"
                  ? "processing"
                  : ""
              }`}
            >
              <div className="status-header">
                <span className="status-title" title={sheet.sheetTitle || sheet.url}>
                  Sheet #{index + 1}: {sheet.sheetTitle || "Google Spreadsheet"}
                </span>
                {statusBadge}
              </div>

              {sheet.status === "success" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "0.775rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Kategori:</span>
                    <strong style={{ color: "#34d399" }}>
                      {sheet.detectedCategory
                        ? CATEGORY_LABELS[sheet.detectedCategory]
                        : "Absensi"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Data Valid:</span>
                    <span>{sheet.recordCount ?? 0} record absensi</span>
                  </div>
                </div>
              )}

              {sheet.status === "error" && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#fb7185",
                    background: "rgba(244, 63, 94, 0.08)",
                    padding: "6px 8px",
                    borderRadius: "4px",
                    lineHeight: 1.3,
                  }}
                >
                  {sheet.errorMessage || "Gagal memproses sheet ini."}
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.7rem",
                      marginTop: "3px",
                    }}
                  >
                    (Sheet lain tetap diproses)
                  </div>
                </div>
              )}

              {sheet.url && (
                <a
                  href={sheet.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.725rem",
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    marginTop: "auto",
                  }}
                >
                  <ExternalLink size={11} /> Buka Spreadsheet
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
