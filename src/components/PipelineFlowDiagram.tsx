import React, { useState } from "react";
import {
  FileSpreadsheet,
  Database,
  Cpu,
  Workflow,
  Scale,
  LayoutDashboard,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

interface PipelineStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  details: string[];
}

export const PipelineFlowDiagram: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const steps: PipelineStep[] = [
    {
      id: "step-1",
      title: "1. Input Spreadsheet",
      subtitle: "4 – 6 Link Manual",
      icon: <FileSpreadsheet size={20} />,
      color: "#38bdf8",
      bgColor: "rgba(56, 189, 248, 0.12)",
      details: [
        "User paste minimal 4 dan maksimal 6 link Google Spreadsheet.",
        "Form fleksibel dapat ditambah / dikurangi dalam batas tersebut.",
        "Validasi format regex link Google Sheets secara instan.",
      ],
    },
    {
      id: "step-2",
      title: "2. Fetch & Ekstraksi",
      subtitle: "CSV Publik / Multi-Tab",
      icon: <Database size={20} />,
      color: "#818cf8",
      bgColor: "rgba(129, 140, 248, 0.12)",
      details: [
        "Ekstraksi spreadsheetId dan gid dari URL.",
        "Akses endpoint CSV publik (/gviz/tq atau /export?format=csv).",
        "Deteksi otomatis multi-subtab (Subuh, Maghrib, Isya, Roan, dll).",
        "Error handling per sheet: jika satu link private/gagal, sheet lain tetap diproses.",
      ],
    },
    {
      id: "step-3",
      title: "3. Klasifikasi AI",
      subtitle: "9Router / Gemini / Heuristic",
      icon: <Cpu size={20} />,
      color: "#c084fc",
      bgColor: "rgba(192, 132, 252, 0.12)",
      details: [
        "Menganalisis sampel header dan data baris.",
        "Membedakan format: Sheet Piket (centang/X) vs Sheet Sholat (H/S/I/A).",
        "Deteksi cerdas kolom nama santri dan deretan kolom tanggal.",
      ],
    },
    {
      id: "step-4",
      title: "4. Normalisasi",
      subtitle: "AttendanceRecord[]",
      icon: <Workflow size={20} />,
      color: "#34d399",
      bgColor: "rgba(52, 211, 153, 0.12)",
      details: [
        "Transformasi baris-kolom mentah ke skema data terpadu tunggal.",
        "Pembersihan nama santri (menghilangkan suffix kamar/area).",
        "Standarisasi tanggal ke format ISO YYYY-MM-DD.",
      ],
    },
    {
      id: "step-5",
      title: "5. Rules Engine",
      subtitle: "Hitung Jam Sanksi",
      icon: <Scale size={20} />,
      color: "#fbbf24",
      bgColor: "rgba(251, 191, 36, 0.12)",
      details: [
        "Sholat Subuh, Maghrib, Isya: Alpha (A) = +2 Jam Sanksi.",
        "Sholat Dhuhur & Ashar: 0 Jam Sanksi (disimpan, tidak disanksi).",
        "Hadir (H), Sakit (S), Izin (I): 0 Jam (ada keterangan).",
        "Piket Asrama: Tanda X = +1 Jam Sanksi. Tanda ✓ = 0 Jam.",
      ],
    },
    {
      id: "step-6",
      title: "6. Dashboard & AI",
      subtitle: "Auto-Switch & Chatbot",
      icon: <LayoutDashboard size={20} />,
      color: "#f43f5e",
      bgColor: "rgba(244, 63, 94, 0.12)",
      details: [
        "Otomatis berpindah ke Tab 2 begitu pemrosesan selesai.",
        "Rangkuman santri ter-ban (>0 jam) diurutkan dari jam terbanyak.",
        "Filter pencarian nama santri dan rentang tanggal.",
        "Asisten AI siap menjawab pertanyaan dan membuat draft WhatsApp teguran.",
      ],
    },
  ];

  return (
    <div className="glass-card" style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-sm)",
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <Workflow size={20} />
          </div>
          <div>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Diagram Alur Sistem Rekapitulasi Pelanggaran
              <Sparkles size={14} style={{ color: "#38bdf8" }} />
            </h3>
            <p style={{ fontSize: "0.775rem", color: "var(--text-secondary)" }}>
              Alur otomatis dari input multi-spreadsheet, klasifikasi AI, rules engine, hingga dashboard pelanggaran.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: "0.775rem", padding: "6px 12px" }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} /> Sembunyikan Rincian Diagram
            </>
          ) : (
            <>
              <ChevronDown size={14} /> Buka Rincian Logika Diagram
            </>
          )}
        </button>
      </div>

      {/* Visual Pipeline Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "10px",
          position: "relative",
        }}
      >
        {steps.map((step, idx) => {
          const isSelected = activeStep === step.id;
          return (
            <div
              key={step.id}
              onClick={() => setActiveStep(isSelected ? null : step.id)}
              style={{
                background: isSelected ? step.bgColor : "rgba(30, 41, 59, 0.5)",
                border: `1px solid ${isSelected ? step.color : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: "var(--radius-md)",
                padding: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    color: step.color,
                    background: step.bgColor,
                    padding: "6px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {step.icon}
                </div>
                {idx < steps.length - 1 && (
                  <ArrowRight
                    size={12}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "14px",
                      color: "var(--text-muted)",
                      opacity: 0.5,
                    }}
                  />
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.825rem", color: "#fff" }}>
                {step.title}
              </div>
              <div
                style={{
                  fontSize: "0.725rem",
                  color: step.color,
                  fontWeight: 500,
                  marginTop: "2px",
                }}
              >
                {step.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Details or Selected Step Detail */}
      {(isExpanded || activeStep) && (
        <div
          style={{
            marginTop: "16px",
            padding: "14px 18px",
            background: "rgba(15, 23, 42, 0.8)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {activeStep ? (
            <div>
              {(() => {
                const s = steps.find((item) => item.id === activeStep);
                if (!s) return null;
                return (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ color: s.color }}>{s.icon}</span>
                      <strong style={{ color: "#fff", fontSize: "0.95rem" }}>
                        {s.title}: {s.subtitle}
                      </strong>
                    </div>
                    <ul
                      style={{
                        paddingLeft: "20px",
                        fontSize: "0.825rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                      }}
                    >
                      {s.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {steps.map((s) => (
                <div key={s.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "4px",
                      color: s.color,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                    }}
                  >
                    {s.icon}
                    <span>{s.title}</span>
                  </div>
                  <ul
                    style={{
                      paddingLeft: "18px",
                      fontSize: "0.775rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {s.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Quick Rules Summary Pill */}
          <div
            style={{
              marginTop: "14px",
              paddingTop: "12px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
            }}
          >
            <span>
              💡 <strong>Rumus Sanksi:</strong> Subuh/Maghrib/Isya Alpha = <strong>+2 Jam</strong> | Piket Silang (X) = <strong>+1 Jam</strong> | Dhuhur/Ashar = <strong>0 Jam</strong> | Hadir/Sakit/Izin = <strong>0 Jam</strong>
            </span>
            <span style={{ color: "#34d399", fontWeight: 600 }}>
              ✓ All-or-Nothing Isolated (Sheet gagal tidak menghentikan sheet lain)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
