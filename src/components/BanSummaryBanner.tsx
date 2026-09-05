import React from "react";
import {
  ShieldAlert,
  Clock,
  Flame,
  CheckCircle,
  ArrowUpRight,
} from "lucide-react";
import type { StudentSummary } from "../types/attendance";

interface BanSummaryBannerProps {
  students: StudentSummary[];
  onSelectStudentName?: (name: string) => void;
}

export const BanSummaryBanner: React.FC<BanSummaryBannerProps> = ({
  students,
  onSelectStudentName,
}) => {
  const bannedStudents = students.filter((s) => s.totalSanctionHours > 0);
  const totalBanHours = bannedStudents.reduce(
    (acc, curr) => acc + curr.totalSanctionHours,
    0
  );
  const totalViolationsCount = bannedStudents.reduce(
    (acc, curr) => acc + curr.violationCount,
    0
  );

  if (bannedStudents.length === 0) {
    return (
      <div
        className="glass-card"
        style={{
          padding: "20px 24px",
          background:
            "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1))",
          borderColor: "rgba(16, 185, 129, 0.3)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.25)",
            color: "#34d399",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CheckCircle size={28} />
        </div>
        <div>
          <h3 style={{ color: "#34d399", fontSize: "1.05rem", fontWeight: 700 }}>
            Alhamdulillah! Tidak Ada Santri Kena Ban / Sanksi
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>
            Seluruh {students.length} santri tercatat tertib (Hadir/Sakit/Izin atau piket terlaksana 100%).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-card"
      style={{
        padding: "20px 24px",
        background:
          "linear-gradient(135deg, rgba(244, 63, 94, 0.12), rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.7))",
        borderColor: "rgba(244, 63, 94, 0.35)",
        marginBottom: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Accent Glow */}
      <div
        style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "180px",
          height: "180px",
          background: "radial-gradient(circle, rgba(244, 63, 94, 0.25), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top Banner Header & Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius-sm)",
              background: "linear-gradient(135deg, #f43f5e, #e11d48)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 4px 14px rgba(244, 63, 94, 0.4)",
            }}
          >
            <ShieldAlert size={26} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700 }}>
                Rekapitulasi Santri Terkena Sanksi (Ban Absensi)
              </h3>
              <span
                style={{
                  background: "rgba(244, 63, 94, 0.2)",
                  border: "1px solid rgba(244, 63, 94, 0.4)",
                  color: "#fb7185",
                  fontSize: "0.725rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                }}
              >
                {bannedStudents.length} Santri Ter-ban
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.825rem", marginTop: "2px" }}>
              Daftar santri yang terakumulasi sanksi dari Alpha Sholat Subuh/Maghrib/Isya (+2j) atau mangkir Piket (+1j).
            </p>
          </div>
        </div>

        {/* Total Ban Counter Badges */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div
            style={{
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Clock size={20} style={{ color: "#fb7185" }} />
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Total Jam Ban
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fb7185" }}>
                {totalBanHours} Jam
              </div>
            </div>
          </div>

          <div
            style={{
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Flame size={20} style={{ color: "#fbbf24" }} />
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Total Pelanggaran
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fbbf24" }}>
                {totalViolationsCount} Kali
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Banned Students Cards Scroll / Grid */}
      <div style={{ marginTop: "12px" }}>
        <div
          style={{
            fontSize: "0.775rem",
            color: "var(--text-secondary)",
            fontWeight: 600,
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Daftar Siapa Saja yang Kena Ban & Jamnya (Klik untuk filter):</span>
          <span>Diurutkan sanksi terbanyak</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "6px",
          }}
        >
          {bannedStudents.map((student, idx) => {
            const isTop1 = idx === 0;
            const isTop2 = idx === 1;
            const isTop3 = idx === 2;

            return (
              <div
                key={student.studentName}
                onClick={() => onSelectStudentName?.(student.studentName)}
                style={{
                  minWidth: "190px",
                  background: isTop1
                    ? "linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(30, 41, 59, 0.8))"
                    : "rgba(30, 41, 59, 0.75)",
                  border: isTop1
                    ? "1px solid rgba(244, 63, 94, 0.6)"
                    : isTop2
                    ? "1px solid rgba(245, 158, 11, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = isTop1
                    ? "rgba(244, 63, 94, 0.6)"
                    : isTop2
                    ? "rgba(245, 158, 11, 0.5)"
                    : "rgba(255, 255, 255, 0.1)";
                }}
                title={`Klik untuk memfilter tabel ke ${student.studentName}`}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: "4px",
                      background: isTop1
                        ? "#f43f5e"
                        : isTop2
                        ? "#f59e0b"
                        : isTop3
                        ? "#eab308"
                        : "rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      color: "#fb7185",
                    }}
                  >
                    {student.totalSanctionHours} Jam
                  </span>
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: "#fff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {student.studentName}
                </div>

                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    marginTop: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{student.violationCount}x pelanggaran</span>
                  <ArrowUpRight size={12} style={{ color: "var(--accent)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
