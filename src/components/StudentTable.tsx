import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Printer,
  ShieldAlert,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { CATEGORY_LABELS } from "../services/rulesEngine";
import type { StudentSummary, AttendanceRecord } from "../types/attendance";

interface StudentTableProps {
  students: StudentSummary[];
  onSelectStudent: (student: StudentSummary) => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onSelectStudent,
}) => {
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const toggleExpand = (studentName: string) => {
    setExpandedStudent((prev) => (prev === studentName ? null : studentName));
  };

  if (students.length === 0) {
    return (
      <div
        className="glass-card"
        style={{
          textAlign: "center",
          padding: "48px 20px",
          color: "var(--text-secondary)",
        }}
      >
        <ShieldAlert size={42} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
        <h4 style={{ color: "#fff", fontSize: "1.1rem", marginBottom: "6px" }}>
          Tidak Ada Data Santri Sesuai Filter
        </h4>
        <p style={{ fontSize: "0.875rem" }}>
          Coba sesuaikan kata kunci pencarian, rentang tanggal, atau filter kategori di atas.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "60px", textAlign: "center" }}>Rank</th>
              <th>Nama Santri</th>
              <th>Total Sanksi</th>
              <th>Jumlah Pelanggaran</th>
              <th>Rincian Kategori Pelanggaran</th>
              <th style={{ textAlign: "right", paddingRight: "24px" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => {
              const isExpanded = expandedStudent === student.studentName;
              const hasViolations = student.totalSanctionHours > 0;

              // Rank styling
              let rankBadge = <span className="rank-badge rank-normal">{index + 1}</span>;
              if (index === 0 && hasViolations) {
                rankBadge = <span className="rank-badge rank-1">#1</span>;
              } else if (index === 1 && hasViolations) {
                rankBadge = <span className="rank-badge rank-2">#2</span>;
              } else if (index === 2 && hasViolations) {
                rankBadge = <span className="rank-badge rank-3">#3</span>;
              }

              // Severity badge
              let hoursBadge = (
                <span className="badge badge-success">
                  <CheckCircle2 size={12} /> 0 Jam (Bersih)
                </span>
              );
              if (student.totalSanctionHours >= 5) {
                hoursBadge = (
                  <span className="badge badge-danger">
                    {student.totalSanctionHours} Jam Sanksi
                  </span>
                );
              } else if (student.totalSanctionHours > 0) {
                hoursBadge = (
                  <span className="badge badge-warning">
                    {student.totalSanctionHours} Jam Sanksi
                  </span>
                );
              }

              return (
                <React.Fragment key={student.studentName}>
                  <tr
                    onClick={() => toggleExpand(student.studentName)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ textAlign: "center" }}>{rankBadge}</td>
                    <td>
                      <strong style={{ fontSize: "0.95rem", color: "#fff" }}>
                        {student.studentName}
                      </strong>
                    </td>
                    <td>{hoursBadge}</td>
                    <td>
                      <span style={{ color: hasViolations ? "#fbbf24" : "var(--text-muted)" }}>
                        {student.violationCount} kali kejadian
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {student.breakdown.length === 0 ? (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            Tidak ada pelanggaran
                          </span>
                        ) : (
                          student.breakdown.map((b) => (
                            <span
                              key={b.category}
                              className="chip"
                              style={{
                                fontSize: "0.75rem",
                                padding: "2px 8px",
                                background: b.category.startsWith("sholat")
                                  ? "rgba(244, 63, 94, 0.12)"
                                  : "rgba(245, 158, 11, 0.12)",
                                borderColor: b.category.startsWith("sholat")
                                  ? "rgba(244, 63, 94, 0.25)"
                                  : "rgba(245, 158, 11, 0.25)",
                              }}
                            >
                              <span>{b.categoryLabel}:</span>
                              <strong>{b.hours}j</strong>
                              <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                                ({b.violationCount}x)
                              </span>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: "20px" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStudent(student);
                          }}
                          title="Lihat Detail & Cetak Surat Sanksi"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          title={isExpanded ? "Tutup Rincian" : "Buka Rincian"}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row Content */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} style={{ padding: "0" }}>
                        <div className="expanded-row-content">
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "12px",
                            }}
                          >
                            <h4 style={{ fontSize: "0.925rem", color: "#fff" }}>
                              Log Pelanggaran & Riwayat Absensi: {student.studentName}
                            </h4>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: "0.775rem", padding: "5px 10px" }}
                              onClick={() => onSelectStudent(student)}
                            >
                              <Printer size={13} />
                              Format Surat Sanksi
                            </button>
                          </div>

                          {/* Detail records table */}
                          <div style={{ overflowX: "auto" }}>
                            <table className="mini-log-table">
                              <thead>
                                <tr>
                                  <th>Tanggal</th>
                                  <th>Kategori</th>
                                  <th>Status / Tanda</th>
                                  <th>Jam Sanksi</th>
                                  <th>Lokasi / Keterangan</th>
                                  <th>Sumber Spreadsheet</th>
                                </tr>
                              </thead>
                              <tbody>
                                {student.records.map((rec: AttendanceRecord, rIdx: number) => {
                                  const isViolation = rec.sanctionHours > 0;
                                  return (
                                    <tr
                                      key={`${rec.date}-${rec.category}-${rIdx}`}
                                      style={{
                                        backgroundColor: isViolation
                                          ? "rgba(244, 63, 94, 0.05)"
                                          : "transparent",
                                      }}
                                    >
                                      <td style={{ fontFamily: "var(--font-mono)" }}>
                                        <Calendar
                                          size={12}
                                          style={{
                                            display: "inline",
                                            verticalAlign: "middle",
                                            marginRight: "4px",
                                            color: "var(--text-muted)",
                                          }}
                                        />
                                        {rec.date}
                                      </td>
                                      <td>
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            color: rec.category.startsWith("sholat")
                                              ? "#38bdf8"
                                              : "#fbbf24",
                                          }}
                                        >
                                          {CATEGORY_LABELS[rec.category] || rec.category}
                                        </span>
                                      </td>
                                      <td>
                                        <span
                                          style={{
                                            padding: "2px 8px",
                                            borderRadius: "4px",
                                            fontFamily: "var(--font-mono)",
                                            fontWeight: 700,
                                            background:
                                              rec.rawStatus === "A" || rec.rawStatus === "X"
                                                ? "rgba(244, 63, 94, 0.2)"
                                                : "rgba(16, 185, 129, 0.2)",
                                            color:
                                              rec.rawStatus === "A" || rec.rawStatus === "X"
                                                ? "#fb7185"
                                                : "#34d399",
                                          }}
                                        >
                                          {rec.rawStatus === "check" ? "✓ Piket" : rec.rawStatus}
                                        </span>
                                      </td>
                                      <td>
                                        {isViolation ? (
                                          <strong style={{ color: "#fb7185" }}>
                                            +{rec.sanctionHours} Jam
                                          </strong>
                                        ) : (
                                          <span style={{ color: "#34d399" }}>0 Jam</span>
                                        )}
                                      </td>
                                      <td style={{ color: "var(--text-secondary)" }}>
                                        {rec.originalAreaOrNotes || "-"}
                                      </td>
                                      <td>
                                        <a
                                          href={rec.sourceSheetUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{
                                            color: "var(--accent)",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "3px",
                                            fontSize: "0.75rem",
                                            textDecoration: "none",
                                          }}
                                        >
                                          <ExternalLink size={11} /> Link Sheet
                                        </a>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
