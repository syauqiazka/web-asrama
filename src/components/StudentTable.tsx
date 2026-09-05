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
              <th>Total Jam Kena Ban</th>
              <th>Pelanggaran Sholat (Subuh/Maghrib/Isya)</th>
              <th>Pelanggaran Piket (Pagi/Sabtu/Sore)</th>
              <th>Reward Device (Baju Koko)</th>
              <th style={{ textAlign: "right", paddingRight: "24px" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => {
              const isExpanded = expandedStudent === student.studentName;
              const hasViolations = student.totalSanctionHours > 0;

              // Sholat Violations Breakdown (Subuh, Maghrib, Isya)
              const sholatBreakdown = student.breakdown.filter(
                (b) =>
                  b.category === "sholat_subuh" ||
                  b.category === "sholat_maghrib" ||
                  b.category === "sholat_isya"
              );
              const sholatCount = sholatBreakdown.reduce(
                (acc, c) => acc + c.violationCount,
                0
              );
              const sholatHours = sholatBreakdown.reduce(
                (acc, c) => acc + c.hours,
                0
              );

              // Piket Violations Breakdown (Pagi, Sabtu/Roan, Sore)
              const piketBreakdown = student.breakdown.filter((b) =>
                b.category.startsWith("piket_")
              );
              const piketCount = piketBreakdown.reduce(
                (acc, c) => acc + c.violationCount,
                0
              );
              const piketHours = piketBreakdown.reduce(
                (acc, c) => acc + c.hours,
                0
              );

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
                  <span className="badge badge-danger" style={{ fontSize: "0.85rem", padding: "4px 10px" }}>
                    {student.totalSanctionHours} Jam Ban
                  </span>
                );
              } else if (student.totalSanctionHours > 0) {
                hoursBadge = (
                  <span className="badge badge-warning" style={{ fontSize: "0.85rem", padding: "4px 10px" }}>
                    {student.totalSanctionHours} Jam Ban
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
                      {sholatCount > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ color: "#fb7185", fontWeight: 700, fontSize: "0.85rem" }}>
                            {sholatCount}x Alpha (+{sholatHours} Jam)
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {sholatBreakdown.map((b) => (
                              <span
                                key={b.category}
                                className="chip"
                                style={{
                                  fontSize: "0.725rem",
                                  padding: "2px 6px",
                                  background: "rgba(244, 63, 94, 0.15)",
                                  borderColor: "rgba(244, 63, 94, 0.3)",
                                  color: "#fb7185",
                                }}
                              >
                                <strong>{b.categoryLabel.replace("Sholat ", "")}:</strong> {b.violationCount}x A ({b.hours}j)
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "#34d399", fontSize: "0.8rem" }}>
                          ✓ Sholat Tertib (0x Alpha)
                        </span>
                      )}
                    </td>
                    <td>
                      {piketCount > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: "0.85rem" }}>
                            {piketCount}x Mangkir (+{piketHours} Jam)
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {piketBreakdown.map((b) => (
                              <span
                                key={b.category}
                                className="chip"
                                style={{
                                  fontSize: "0.725rem",
                                  padding: "2px 6px",
                                  background: "rgba(245, 158, 11, 0.15)",
                                  borderColor: "rgba(245, 158, 11, 0.3)",
                                  color: "#fbbf24",
                                }}
                              >
                                <strong>{b.categoryLabel.replace("Piket ", "")}:</strong> {b.violationCount}x X ({b.hours}j)
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "#34d399", fontSize: "0.8rem" }}>
                          ✓ Piket Tertib (0x X)
                        </span>
                      )}
                    </td>
                    <td>
                      {student.rewardDeviceHours > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span
                            className="badge badge-success"
                            style={{
                              fontSize: "0.8rem",
                              padding: "3px 8px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            +{student.rewardDeviceHours} Jam Device
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#34d399" }}>
                            {student.bajuKokoEligibleDays} Hari Koko Lengkap
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                          0 Jam
                        </span>
                      )}
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
                      <td colSpan={7} style={{ padding: "0" }}>
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
