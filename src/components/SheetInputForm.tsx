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

interface UploadedFileInfo { id: string; name: string; sheetCount: number; }

interface SheetInputFormProps {
  sheetInputs: SheetInputItem[];
  setSheetInputs: React.Dispatch<React.SetStateAction<SheetInputItem[]>>;
  onSubmit: () => void;
  isLoading: boolean;
  onOpenRules: () => void;
  onResetData?: () => void;
  uploadedFiles: UploadedFileInfo[];
  onFilesSelected: (files: FileList | null) => void;
  onRemoveUploadedFile: (id: string) => void;
}

export const SheetInputForm: React.FC<SheetInputFormProps> = ({
  sheetInputs,
  setSheetInputs,
  onSubmit,
  isLoading,
  onOpenRules,
  onResetData,
  uploadedFiles,
  onFilesSelected,
  onRemoveUploadedFile,
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

  const handleAddLink = (count: number = 1) => {
    if (sheetInputs.length >= 20) return;
    const canAdd = Math.min(count, 20 - sheetInputs.length);
    const newItems: SheetInputItem[] = Array.from({ length: canAdd }).map((_, idx) => ({
      id: `sheet-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      url: "",
      status: "idle",
    }));
    setSheetInputs((prev) => [...prev, ...newItems]);
  };

  const handleRemoveLink = (id: string) => {
    if (sheetInputs.length <= 1) return;
    setSheetInputs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleLoadDemoData = () => {
    const demoItems: SheetInputItem[] = DEMO_SHEETS.map(
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
    if (onResetData) {
      onResetData();
    }
  };

  // Validasi form: minimal 1 link terisi dan valid, maksimal 20 workbook
  const filledCount = sheetInputs.filter((s) => s.url.trim().length > 0).length;
  const hasErrors = sheetInputs.some(
    (s) => s.url.trim().length > 0 && s.errorMessage
  );
  const isFormValid = (filledCount >= 1 || uploadedFiles.length > 0) && !hasErrors;

  return (
    <div className="glass-card">
      <div className="card-title-row">
        <div>
          <h2 className="card-title">
            <FileSpreadsheet style={{ color: "var(--primary)" }} />
            Input Link Google Spreadsheet / Workbook (Hingga 20 Workbook)
          </h2>
          <p className="card-subtitle">
            Impor dari link Google Spreadsheet atau unggah file Excel (.xlsx/.xls). Tab absensi yang didukung akan diproses bersama.
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
            Panduan Aturan & Reward
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.775rem", padding: "6px 12px" }}
            onClick={handleLoadDemoData}
            title="Muat 5 workbook simulasi lengkap (Sholat + Piket)"
          >
            <Sparkles size={14} style={{ color: "#38bdf8" }} />
            Muat Data Demo
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.775rem", padding: "6px 12px" }}
            onClick={handleResetForm}
            title="Kosongkan form ke 4 slot awal"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      <div style={{ marginTop: "16px", marginBottom: "18px", padding: "16px", border: "1px dashed var(--border-color, rgba(148,163,184,.35))", borderRadius: "12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "8px", cursor: isLoading ? "not-allowed" : "pointer", fontWeight: 600 }}>
          <span>Unggah file Excel langsung</span>
          <input
            type="file"
            accept=".xlsx,.xls,.xlsm"
            multiple
            disabled={isLoading}
            onChange={(event) => {
              onFilesSelected(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 400 }}>
            Maksimal 20 MB per file. Tab SOP, jadwal, biodata, rekap, dan tab non-absensi akan dilewati.
          </span>
        </label>
        {uploadedFiles.length > 0 && (
          <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
            {uploadedFiles.map((file) => (
              <div key={file.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", fontSize: "0.85rem" }}>
                <span>{file.name} — {file.sheetCount} tab absensi</span>
                <button type="button" className="btn-outline-danger btn-icon" onClick={() => onRemoveUploadedFile(file.id)} disabled={isLoading} aria-label={`Hapus ${file.name}`}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: "16px" }}>
        {sheetInputs.map((sheet, index) => {
          const isError = Boolean(sheet.errorMessage);
          const canDelete = sheetInputs.length > 1;
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
                {canDelete && (
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleAddLink(1)}
            disabled={sheetInputs.length >= 20 || isLoading}
            title={
              sheetInputs.length >= 20
                ? "Maksimal 20 workbook telah tercapai"
                : "Tambah 1 baris link workbook (maksimal 20)"
            }
          >
            <Plus size={16} />
            +1 Slot ({sheetInputs.length}/20)
          </button>

          {sheetInputs.length <= 15 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleAddLink(5)}
              disabled={isLoading}
              title="Tambah 5 slot link sekaligus"
            >
              <Plus size={16} />
              +5 Slot
            </button>
          )}

          <span
            style={{
              fontSize: "0.825rem",
              color: filledCount === 0 ? "var(--text-muted)" : "var(--accent)",
              fontWeight: 500,
            }}
          >
            {filledCount === 0
              ? (uploadedFiles.length > 0 ? "File Excel siap diproses" : "Masukkan link atau unggah file Excel")
              : `✓ ${filledCount} workbook siap diproses (maksimal 20)`}
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
