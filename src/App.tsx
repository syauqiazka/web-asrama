import { useState, useMemo, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { SheetInputForm } from "./components/SheetInputForm";
import { ProcessingStatusCard } from "./components/ProcessingStatusCard";
import { PipelineFlowDiagram } from "./components/PipelineFlowDiagram";
import { BanSummaryBanner } from "./components/BanSummaryBanner";
import { StatsOverview } from "./components/StatsOverview";
import { FilterBar } from "./components/FilterBar";
import { StudentTable } from "./components/StudentTable";
import { RulesGuideModal } from "./components/RulesGuideModal";
import { SettingsModal } from "./components/SettingsModal";
import { StudentDetailModal } from "./components/StudentDetailModal";
import { ExportModal } from "./components/ExportModal";
import { AIChatBot } from "./components/AIChatBot";

import { fetchGoogleSheetCSV } from "./services/sheetFetcher";
import { classifySheetWithAI, normalizeSheetData } from "./services/aiClassifier";
import type { AISettings } from "./services/aiClassifier";
import {
  aggregateStudentSummaries,
  calculateSanctionHours,
} from "./services/rulesEngine";
import type {
  AttendanceCategory,
  AttendanceRecord,
  FilterOptions,
  SheetInputItem,
  StudentSummary,
} from "./types/attendance";
import { FileSpreadsheet, ArrowRight } from "lucide-react";

export function App() {
  // Tab Navigation: Tab 1 "input" vs Tab 2 "dashboard"
  const [activeTab, setActiveTab] = useState<"input" | "dashboard">("input");
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Form State: Tersimpan di localStorage agar tidak hilang saat halaman di-refresh
  const [sheetInputs, setSheetInputs] = useState<SheetInputItem[]>(() => {
    const saved = localStorage.getItem("asrama_sheet_inputs");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [
      { id: "sheet-1", url: "", status: "idle" },
      { id: "sheet-2", url: "", status: "idle" },
      { id: "sheet-3", url: "", status: "idle" },
      { id: "sheet-4", url: "", status: "idle" },
    ];
  });

  // Data Records & Satus Pemrosesan: Tersimpan di localStorage agar rekap tidak hilang saat refresh
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem("asrama_cached_records");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(() => {
    return localStorage.getItem("asrama_has_processed") === "true";
  });
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Simpan sheetInputs otomatis ke localStorage setiap kali ada perubahan
  useEffect(() => {
    try {
      localStorage.setItem("asrama_sheet_inputs", JSON.stringify(sheetInputs));
    } catch {}
  }, [sheetInputs]);

  // Modals state
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);

  // AI settings: otomatis terkonfigurasi dengan Google Gemini key pengguna
  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem("asrama_ai_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey) return parsed;
      } catch {
        // fallback
      }
    }
    return {
      apiKey: import.meta.env.VITE_GCP_API_KEY ?? "",
      provider: "gemini",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      model: "gemini-flash-latest",
    };
  });

  const handleSaveSettings = (newSettings: AISettings) => {
    setAiSettings(newSettings);
    localStorage.setItem("asrama_ai_settings", JSON.stringify(newSettings));
  };

  // Handler Reset Form & Data: Kosongkan form dan hapus cache localStorage
  const handleResetData = () => {
    setAllRecords([]);
    setHasProcessed(false);
    try {
      localStorage.removeItem("asrama_cached_records");
      localStorage.removeItem("asrama_has_processed");
    } catch {}
  };

  // Filter state: Default hanya menampilkan santri yang kena ban (>0 jam)
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: "",
    startDate: "",
    endDate: "",
    categoryFilter: "all",
    violationFilter: "violation_only",
    sortBy: "sanctionHours_desc",
  });

  // Alur Pemrosesan End-to-End Multi-Spreadsheet (hingga 20 Workbook + Multi-Tab)
  const handleProcessAllSheets = async (isInitialLoad: boolean = false) => {
    const validInputs = sheetInputs.filter((s) => s.url.trim().length > 0);
    if (validInputs.length === 0) {
      alert("Harap masukkan minimal 1 link Google Spreadsheet / Workbook.");
      return;
    }

    setIsProcessing(true);
    setHasProcessed(true);
    setNotificationMsg(null);
    const accumulatedRecords: AttendanceRecord[] = [];

    for (const item of sheetInputs) {
      if (!item.url.trim()) continue;

      setSheetInputs((prev) =>
        prev.map((s) =>
          s.id === item.id ? { ...s, status: "fetching", errorMessage: undefined } : s
        )
      );

      try {
        const fetchRes = await fetchGoogleSheetCSV(item.url);

        if (!fetchRes.ok) {
          setSheetInputs((prev) =>
            prev.map((s) =>
              s.id === item.id
                ? {
                    ...s,
                    status: "error",
                    errorMessage:
                      fetchRes.error ||
                      "Sheet tidak bisa diakses, pastikan share-nya 'Anyone with the link'.",
                  }
                : s
            )
          );
          continue;
        }

        setSheetInputs((prev) =>
          prev.map((s) =>
            s.id === item.id ? { ...s, status: "classifying" } : s
          )
        );

        // Kasus A: Multi-SubTab (seperti Subuh, Maghrib, Isya, Senin, Sabtu)
        if (fetchRes.isMultiTab && fetchRes.tabs && fetchRes.tabs.length > 0) {
          let sheetTotalRecords = 0;
          const detectedCategories: string[] = [];

          for (const tab of fetchRes.tabs) {
            // Sertakan judul spreadsheet induk (misal "ABSENSI PIKET PAGI") ke nama tab agar AI & heuristik mengenali konteks hari vs roan
            const fullTabTitle = fetchRes.spreadsheetTitle
              ? `${fetchRes.spreadsheetTitle} - Tab ${tab.tabName}`
              : tab.tabName;

            const tabClassification = await classifySheetWithAI(
              tab.rows,
              fullTabTitle,
              aiSettings
            );

            if (tabClassification.sheetType !== "unknown") {
              const tabRecords = normalizeSheetData(
                tab.rows,
                tabClassification,
                item.url
              );

              for (const rec of tabRecords) {
                rec.sanctionHours = calculateSanctionHours(rec.category, rec.rawStatus);
              }

              accumulatedRecords.push(...tabRecords);
              sheetTotalRecords += tabRecords.length;
              detectedCategories.push(tab.tabName);
            }
          }

          setSheetInputs((prev) =>
            prev.map((s) =>
              s.id === item.id
                ? {
                    ...s,
                    status: "success",
                    detectedType: "sholat",
                    recordCount: sheetTotalRecords,
                    sheetTitle: `Multi-Tab (${detectedCategories.join(", ")})`,
                  }
                : s
            )
          );
          continue;
        }

        // Kasus B: Single Tab
        if (fetchRes.rows && fetchRes.rows.length > 0) {
          const fullTitle = fetchRes.spreadsheetTitle
            ? `${fetchRes.spreadsheetTitle} - ${item.sheetTitle || fetchRes.tabName || ""}`
            : (item.sheetTitle || fetchRes.tabName || "");

          const classification = await classifySheetWithAI(
            fetchRes.rows,
            fullTitle,
            aiSettings
          );

          if (classification.sheetType === "unknown") {
            setSheetInputs((prev) =>
              prev.map((s) =>
                s.id === item.id
                  ? {
                      ...s,
                      status: "error",
                      errorMessage:
                        "AI tidak mengenali kolom absensi pada tab ini. Pastikan memilih tab yang memuat data sholat atau piket.",
                    }
                  : s
              )
            );
            continue;
          }

          const sheetRecords = normalizeSheetData(
            fetchRes.rows,
            classification,
            item.url
          );

          for (const rec of sheetRecords) {
            rec.sanctionHours = calculateSanctionHours(rec.category, rec.rawStatus);
          }

          accumulatedRecords.push(...sheetRecords);

          setSheetInputs((prev) =>
            prev.map((s) =>
              s.id === item.id
                ? {
                    ...s,
                    status: "success",
                    detectedType: classification.sheetType,
                    detectedCategory: classification.category,
                    recordCount: sheetRecords.length,
                    sheetTitle: fetchRes.tabName || item.sheetTitle,
                  }
                : s
            )
          );
        }
      } catch (err: any) {
        setSheetInputs((prev) =>
          prev.map((s) =>
            s.id === item.id
              ? {
                  ...s,
                  status: "error",
                  errorMessage: err?.message || "Terjadi kesalahan saat memproses sheet.",
                }
              : s
          )
        );
      }
    }

    setAllRecords(accumulatedRecords);
    setIsProcessing(false);

    // Simpan hasil rekap ke localStorage agar saat refresh halaman tidak hilang
    try {
      localStorage.setItem("asrama_cached_records", JSON.stringify(accumulatedRecords));
      localStorage.setItem("asrama_has_processed", "true");
    } catch {}

    // AUTO-SWITCH KE TAB 2 (DASHBOARD PELANGGARAN) BEGITU PROSES SELESAI
    if (!isInitialLoad) {
      setActiveTab("dashboard");
    }

    if (accumulatedRecords.length > 0) {
      setNotificationMsg(
        `Berhasil merekapitulasi ${accumulatedRecords.length} catatan absensi dari seluruh spreadsheet!`
      );
      setTimeout(() => setNotificationMsg(null), 7000);
    }
  };

  // Kategori yang tersedia di data
  const availableCategories = useMemo(() => {
    const set = new Set<AttendanceCategory>();
    for (const r of allRecords) {
      set.add(r.category);
    }
    return Array.from(set);
  }, [allRecords]);

  // Agregasi seluruh data periode aktif (sebelum filter pelanggaran)
  const allPeriodSummaries = useMemo(() => {
    let periodRecords = allRecords;
    if (filters.startDate) {
      periodRecords = periodRecords.filter((r) => r.date >= filters.startDate);
    }
    if (filters.endDate) {
      periodRecords = periodRecords.filter((r) => r.date <= filters.endDate);
    }
    return aggregateStudentSummaries(periodRecords);
  }, [allRecords, filters.startDate, filters.endDate]);

  const totalViolatorsCount = useMemo(() => {
    return allPeriodSummaries.filter((s) => s.totalSanctionHours > 0).length;
  }, [allPeriodSummaries]);

  // Filter santri sesuai kriteria pencarian, kategori, dan toggle status pelanggaran
  const filteredSummaries = useMemo(() => {
    let summaries = allPeriodSummaries;

    if (filters.categoryFilter !== "all") {
      // Jika memfilter kategori spesifik, hanya santri yang memiliki pelanggaran pada kategori tersebut
      summaries = summaries.filter((s) =>
        s.breakdown.some((b) => b.category === filters.categoryFilter)
      );
    }

    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      summaries = summaries.filter((s) => s.studentName.toLowerCase().includes(q));
    }

    if (filters.violationFilter === "violation_only") {
      summaries = summaries.filter((s) => s.totalSanctionHours > 0);
    } else if (filters.violationFilter === "clean_only") {
      summaries = summaries.filter((s) => s.totalSanctionHours === 0);
    }

    return summaries;
  }, [allPeriodSummaries, filters.categoryFilter, filters.searchQuery, filters.violationFilter]);

  return (
    <div className="app-container">
      {/* Navbar dengan Tab Switcher & Branding */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenRules={() => setIsRulesModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        hasData={allRecords.length > 0}
        bannedCount={totalViolatorsCount}
      />

      {/* Toast Notification */}
      {notificationMsg && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#34d399",
            padding: "12px 18px",
            borderRadius: "var(--radius-md)",
            marginBottom: "20px",
            fontSize: "0.875rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{notificationMsg}</span>
          <button
            onClick={() => setNotificationMsg(null)}
            style={{ color: "#34d399", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: INPUT SHEET (Form Input hingga 20 Workbook, Status Per Sheet, & Diagram Flow) */}
      {activeTab === "input" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Form Input 1 - 20 Google Spreadsheet */}
          <SheetInputForm
            sheetInputs={sheetInputs}
            setSheetInputs={setSheetInputs}
            onSubmit={() => handleProcessAllSheets(false)}
            isLoading={isProcessing}
            onOpenRules={() => setIsRulesModalOpen(true)}
            onResetData={handleResetData}
          />

          {/* Status Pemrosesan Tiap Sheet / Workbook */}
          <ProcessingStatusCard
            sheetInputs={sheetInputs}
            isProcessing={isProcessing}
          />

          {/* Diagram Flow Visual Interaktif */}
          <PipelineFlowDiagram />
        </div>
      )}

      {/* TAB 2: DASHBOARD PELANGGARAN (Otomatis Tampil Saat Selesai Proses) */}
      {activeTab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {!hasProcessed || allRecords.length === 0 ? (
            <div
              className="glass-card"
              style={{
                textAlign: "center",
                padding: "48px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <FileSpreadsheet size={48} style={{ color: "var(--text-muted)" }} />
              <h3 style={{ color: "#fff", fontSize: "1.2rem" }}>
                Belum Ada Data yang Direkapitulasi
              </h3>
              <p style={{ color: "var(--text-secondary)", maxWidth: "480px", fontSize: "0.875rem" }}>
                Silakan beralih ke <strong>Tab 1: Input Sheet</strong>, masukkan link Google Spreadsheet / Workbook, lalu klik tombol "Proses & Rekapitulasi Data".
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveTab("input")}
                style={{ marginTop: "8px" }}
              >
                Ke Tab 1: Input Sheet <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <>
              {/* Rangkuman Otomatis Siapa Saja yang Terkena Ban & Total Jamnya */}
              <BanSummaryBanner
                students={allPeriodSummaries}
                onSelectStudentName={(name) =>
                  setFilters((prev) => ({ ...prev, searchQuery: name, violationFilter: "all" }))
                }
              />

              {/* Ringkasan Statistik Global */}
              <StatsOverview summaries={allPeriodSummaries} />

              {/* Filter Bar: Pencarian Nama, Rentang Tanggal, & Switch Kena Ban vs Semua Santri */}
              <FilterBar
                filters={filters}
                setFilters={setFilters}
                availableCategories={availableCategories}
                totalViolators={totalViolatorsCount}
                totalStudents={allPeriodSummaries.length}
              />

              {/* Tabel Santri Pelanggar & Reward Device */}
              <StudentTable
                students={filteredSummaries}
                onSelectStudent={(student) => setSelectedStudent(student)}
              />
            </>
          )}
        </div>
      )}

      {/* AI Chatbot Asrama Floating Assistant & Navbar Trigger */}
      <AIChatBot
        students={allPeriodSummaries}
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
      />

      {/* Modals */}
      <RulesGuideModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={aiSettings}
        onSave={handleSaveSettings}
      />

      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={filteredSummaries}
      />
    </div>
  );
}

export default App;
