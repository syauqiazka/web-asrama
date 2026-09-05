import React from "react";
import {
  Plus,
  Trash2,
  Sparkles,
  Play,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { validateGoogleSheetUrl } from "../services/sheetFetcher";
import { DEMO_SHEETS } from "../services/mockData";
import type { SheetInputItem } from "../types/attendance";

interface SheetInputFormProps {
  sheetInputs: SheetInputItem[];
  setSheetInputs: React.Dispatch<React.SetStateAction<SheetInputItem[]>>;
  onSubmit: () => void;
  isLoading: boolean;
  onOpenRules: () => void;
}

export const SheetInputForm: React.FC<SheetInputFormProps> = ({
  sheetInputs,
  setSheetInputs,
  onSubmit,
  isLoading,
  onOpenRules,
}) => {
  const handleUrlChange = (id: string, newUrl: string) => {
    setSheetInputs((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const validation = validateGoogleSheetUrl(newUrl);
          return {
            ...item,
            url: newUrl,
            status: "idle",
            errorMessage:
              newUrl.trim() && !validation.isValid
                ? validation.errorMessage
                : undefined,
          };
        }
        return item;
      })
    );
  };

  const handleAddLink = () => {
    if (sheetInputs.length >= 6) return;
    const newId = `sheet-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setSheetInputs((prev) => [
      ...prev,
      {
        id: newId,
        url: "",
        status: "idle",
      },
    ]);
  };

  const handleRemoveLink = (id: string) => {
    if (sheetInputs.length <= 1) return;
    setSheetInputs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleLoadDemoData = () => {
    const demoItems: SheetInputItem[] = DEMO_SHEETS.slice(0, 5).map(
      (demo, idx) => ({
        id: `demo-${idx + 1}-${Date.now()}`,
        url: demo.url,
        sheetTitle: demo.name,
        status: "idle",
      })
    );
    setSheetInputs(demoItems);
  };

  const handleResetForm = () => {
    const emptyItems: SheetInputItem[] = Array.from({ length: 4 }).map(
      (_, idx) => ({
        id: `empty-${idx + 1}-${Date.now()}`,
        url: "",
        status: "idle",
      })
    );
    setSheetInputs(emptyItems);
  };

  // Validasi form: cukup minimal 1 link yang terisi dan valid
  const filledCount = sheetInputs.filter((s) => s.url.trim().length > 0).length;
  const hasErrors = sheetInputs.some(
    (s) => s.url.trim().length > 0 && s.errorMessage
  );
  const isFormValid = filledCount >= 1 && !hasErrors;

  return (
    <div className="glass-card">
      <div className="card-title-row">
        <div>
          <h2 className="card-title">
            <FileSpreadsheet style={{ color: "var(--primary)" }} />
            Input Link Google Spreadsheet (1 – 6 Link)
          </h2>
          <p className="card-subtitle">
            Paste link Google Spreadsheet absensi dan piket. Sistem otomatis mengenali semua sub-tab sholat (Subuh, Maghrib, Isya) & piket.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.775rem", padding: "6px 12px" }}
            onClick={onOpenRules}
          >
            <HelpCircle size={14} />
            Panduan Aturan Sanksi
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.775rem", padding: "6px 12px" }}
            onClick={handleLoadDemoData}
            title="Muat 5 sheet simulasi lengkap"
          >
            <Sparkles size={14} style={{ color: "#38bdf8" }} />
            Muat Data Demo
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.775rem", padding: "6px 12px" }}
            onClick={handleResetForm}
            title="Kosongkan form"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      <div style={{ marginTop: "16px" }}>
        {sheetInputs.map((sheet, index) => {
          const isError = Boolean(sheet.errorMessage);
          return (
            <div key={sheet.id} style={{ marginBottom: "12px" }}>
              <div className="sheet-input-row">
                <span className="sheet-number-badge">#{index + 1}</span>
                <input
                  type="url"
                  className={`sheet-input-field ${isError ? "invalid" : ""}`}
                  placeholder={`https://docs.google.com/spreadsheets/d/.../edit#gid=...`}
                  value={sheet.url}
                  onChange={(e) => handleUrlChange(sheet.id, e.target.value)}
                  disabled={isLoading}
                />
                {sheetInputs.length > 1 && (
                  <button
                    type="button"
                    className="btn-outline-danger btn-icon"
                    onClick={() => handleRemoveLink(sheet.id)}
                    title="Hapus baris link ini"
                    disabled={isLoading}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {isError && (
                <div className="form-error-msg">
                  <AlertCircle
                    size={13}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: "4px",
                    }}
                  />
                  {sheet.errorMessage}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="form-actions-row">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddLink}
            disabled={sheetInputs.length >= 6 || isLoading}
            title={
              sheetInputs.length >= 6
                ? "Maksimal 6 link"
                : "Tambah baris link Google Spreadsheet"
            }
          >
            <Plus size={16} />
            Tambah Link ({sheetInputs.length}/6)
          </button>

          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {filledCount === 0
              ? "Masukkan minimal 1 link spreadsheet"
              : `${filledCount} spreadsheet siap diproses`}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: "11px 24px", fontSize: "0.95rem" }}
          onClick={onSubmit}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? (
            <>
              <div
                className="animate-spin"
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid #fff",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                }}
              />
              Menganalisis & Merekap Data...
            </>
          ) : (
            <>
              <Play size={18} />
              Proses & Rekapitulasi Data
            </>
          )}
        </button>
      </div>
    </div>
  );
};
