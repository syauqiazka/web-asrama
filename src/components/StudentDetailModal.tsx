import React from "react";
import { X, Printer, User, Clock, AlertTriangle, Calendar, CheckCircle2 } from "lucide-react";
import { CATEGORY_LABELS } from "../services/rulesEngine";
import type { StudentSummary, AttendanceRecord } from "../types/attendance";

interface StudentDetailModalProps {
  student: StudentSummary | null;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
}) => {
  if (!student) return null;

  const handlePrint = () => {
    window.print();
  };

  const violationsOnly = student.records.filter((r) => r.sanctionHours > 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: "720px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <User style={{ color: "var(--primary)" }} />
            <div>
              <h3 className="modal-title">{student.studentName}</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Lembar Rekapitulasi Pelanggaran & Sanksi Santri
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-secondary" onClick={handlePrint}>
              <Printer size={15} /> Cetak Surat Sanksi
            </button>
            <button className="btn-icon" onClick={onClose} aria-label="Tutup">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Summary Box */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
            }}
          >
            <div
              style={{
                background: "rgba(244, 63, 94, 0.08)",
                border: "1px solid rgba(244, 63, 94, 0.2)",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#fb7185",
                  fontSize: "0.775rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                <Clock size={14} /> Total Jam Ban / Sanksi
              </div>
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "#fff",
                  marginTop: "4px",
                }}
              >
                {student.totalSanctionHours} Jam
              </div>
            </div>

            <div
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#fbbf24",
                  fontSize: "0.775rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                <AlertTriangle size={14} /> Pelanggaran
              </div>
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "#fff",
                  marginTop: "4px",
                }}
              >
                {student.violationCount}x
              </div>
            </div>

            <div
              style={{
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#38bdf8",
                  fontSize: "0.775rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                <CheckCircle2 size={14} /> Reward Device Koko
              </div>
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "#38bdf8",
                  marginTop: "4px",
                }}
              >
                +{student.rewardDeviceHours || 0} Jam
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {student.bajuKokoEligibleDays || 0} Hari Koko Lengkap
              </div>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div>
            <h5
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Rincian Per Kategori:
            </h5>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {student.breakdown.length === 0 ? (
                <span style={{ color: "#34d399", fontSize: "0.85rem" }}>
                  Alhamdulillah, santri ini tidak memiliki catatan pelanggaran.
                </span>
              ) : (
                student.breakdown.map((b) => (
                  <div
                    key={b.category}
                    className="chip"
                    style={{ padding: "6px 12px" }}
                  >
                    <span>{b.categoryLabel}:</span>
                    <strong style={{ color: "#fb7185" }}>{b.hours} Jam</strong>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      ({b.violationCount}x kejadian)
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Table of Violations */}
          <div>
            <h5
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Daftar Kejadian Pelanggaran:
            </h5>
            {violationsOnly.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Nol pelanggaran pada periode ini.
              </p>
            ) : (
              <table className="mini-log-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Waktu / Pos</th>
                    <th>Status</th>
                    <th>Jam Sanksi</th>
                    <th>Lokasi/Kamar</th>
                  </tr>
                </thead>
                <tbody>
                  {violationsOnly.map((rec: AttendanceRecord, i: number) => (
                    <tr key={i}>
                      <td style={{ fontFamily: "var(--font-mono)" }}>
                        <Calendar
                          size={12}
                          style={{
                            display: "inline",
                            verticalAlign: "middle",
                            marginRight: "4px",
                          }}
                        />
                        {rec.date}
                      </td>
                      <td>{CATEGORY_LABELS[rec.category] || rec.category}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: "#fb7185",
                          }}
                        >
                          {rec.rawStatus === "A"
                            ? "Alpha (Tidak Sholat)"
                            : "Tidak Piket (X)"}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: "#fb7185" }}>
                        +{rec.sanctionHours} Jam
                      </td>
                      <td>{rec.originalAreaOrNotes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Format Surat Berita Acara untuk dicetak */}
          <div
            style={{
              background: "rgba(0,0,0,0.25)",
              border: "1px dashed var(--border-medium)",
              padding: "14px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.825rem",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
            }}
          >
            <strong style={{ color: "#fff", display: "block", marginBottom: "4px" }}>
              Rekomendasi Tindakan Asrama / Pengasuh:
            </strong>
            Santri atas nama <strong>{student.studentName}</strong> diwajibkan
            menyelesaikan sanksi takzir pembinaan berupa kerja sosial/kebersihan asrama
            sebanyak <strong>{student.totalSanctionHours} jam</strong> di bawah
            pengawasan Bagian Keamanan & Ketertiban Santri.
          </div>
        </div>
      </div>
    </div>
  );
};
