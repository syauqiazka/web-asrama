import { useState, useMemo, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { SheetInputForm } from "./components/SheetInputForm";
import { ProcessingStatusCard } from "./components/ProcessingStatusCard";
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
import { DEMO_SHEETS } from "./services/mockData";

export function App() {
  // Initial State: Form dengan 4 slot link default
  const [sheetInputs, setSheetInputs] = useState<SheetInputItem[]>(() => {
    return DEMO_SHEETS.slice(0, 5).map((d, i) => ({
      id: `initial-sheet-${i + 1}`,
      url: d.url,
      sheetTitle: d.name,
      status: "idle",
    }));
  });

  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

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

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: "",
    startDate: "",
    endDate: "",
    categoryFilter: "all",
    violationFilter: "all",
    sortBy: "sanctionHours_desc",
  });

  // Load awal data demo
  useEffect(() => {
    handleProcessAllSheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Alur Pemrosesan End-to-End Multi-Spreadsheet (dengan dukungan Multi-SubTab Otomatis)
  const handleProcessAllSheets = async () => {
    const validInputs = sheetInputs.filter((s) => s.url.trim().length > 0);
    if (validInputs.length === 0) {
      alert("Harap masukkan minimal 1 link Google Spreadsheet.");
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

        // Kasus A: Multi-SubTab (seperti Shubuh, Magrib, Isya, Senin, Sabtu)
        if (fetchRes.isMultiTab && fetchRes.tabs && fetchRes.tabs.length > 0) {
          let sheetTotalRecords = 0;
          const detectedCategories: string[] = [];

          for (const tab of fetchRes.tabs) {
            const tabClassification = await classifySheetWithAI(
              tab.rows,
              tab.tabName,
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
          const classification = await classifySheetWithAI(
            fetchRes.rows,
            item.sheetTitle || fetchRes.tabName || "",
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

    if (accumulatedRecords.length > 0) {
      setNotificationMsg(
        `Berhasil merekapitulasi ${accumulatedRecords.length} catatan absensi dari spreadsheet yang dimasukkan!`
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

  // Filter & Agregasi santri berdasarkan kriteria
  const filteredSummaries = useMemo(() => {
    let filteredRecords = allRecords;

    if (filters.startDate) {
      filteredRecords = filteredRecords.filter((r) => r.date >= filters.startDate);
    }
    if (filters.endDate) {
      filteredRecords = filteredRecords.filter((r) => r.date <= filters.endDate);
    }
    if (filters.categoryFilter !== "all") {
      filteredRecords = filteredRecords.filter(
        (r) => r.category === filters.categoryFilter
      );
    }

    let summaries = aggregateStudentSummaries(filteredRecords);

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
  }, [allRecords, filters]);

  return (
    <div className="app-container">
      {/* Navbar & Branding */}
      <Navbar
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenRules={() => setIsRulesModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        hasData={filteredSummaries.length > 0}
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
            style={{ color: "#34d399", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Form Input 1 - 6 Google Spreadsheet */}
      <SheetInputForm
        sheetInputs={sheetInputs}
        setSheetInputs={setSheetInputs}
        onSubmit={handleProcessAllSheets}
        isLoading={isProcessing}
        onOpenRules={() => setIsRulesModalOpen(true)}
      />

      {/* Status Pemrosesan Per Sheet */}
      <ProcessingStatusCard
        sheetInputs={sheetInputs}
        isProcessing={isProcessing}
      />

      {/* Ringkasan & Dashboard Utama */}
      {hasProcessed && (
        <>
          <StatsOverview summaries={filteredSummaries} />

          <FilterBar
            filters={filters}
            setFilters={setFilters}
            availableCategories={availableCategories}
          />

          <StudentTable
            students={filteredSummaries}
            onSelectStudent={(student) => setSelectedStudent(student)}
          />
        </>
      )}

      {/* AI Chatbot Asrama Floating Assistant */}
      <AIChatBot students={filteredSummaries} />

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
