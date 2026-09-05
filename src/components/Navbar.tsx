import React from "react";
import {
  Building2,
  Sparkles,
  HelpCircle,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  Bot,
} from "lucide-react";

interface NavbarProps {
  activeTab: "input" | "dashboard";
  onTabChange: (tab: "input" | "dashboard") => void;
  onOpenSettings: () => void;
  onOpenRules: () => void;
  onOpenExport: () => void;
  onOpenChat: () => void;
  hasData: boolean;
  bannedCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenSettings,
  onOpenRules,
  onOpenExport,
  onOpenChat,
  hasData,
  bannedCount = 0,
}) => {
  return (
    <header className="app-header" style={{ flexWrap: "wrap", gap: "16px" }}>
      <div className="brand-section">
        <div className="brand-logo">
          <Building2 size={24} />
        </div>
        <div className="brand-text">
          <h1>
            SIM-Asrama
            <span className="brand-badge">Multi-Sheet AI</span>
          </h1>
          <p className="brand-desc">
            Dashboard Rekap Pelanggaran Absensi & Reward Device Santri
          </p>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(15, 23, 42, 0.8)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "4px",
          gap: "4px",
        }}
      >
        <button
          type="button"
          onClick={() => onTabChange("input")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.85rem",
            fontWeight: activeTab === "input" ? 700 : 500,
            background:
              activeTab === "input"
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "transparent",
            color: activeTab === "input" ? "#fff" : "var(--text-secondary)",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow:
              activeTab === "input" ? "0 2px 8px rgba(16, 185, 129, 0.3)" : "none",
          }}
        >
          <FileSpreadsheet size={16} />
          <span>Tab 1: Input Sheet</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("dashboard")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.85rem",
            fontWeight: activeTab === "dashboard" ? 700 : 500,
            background:
              activeTab === "dashboard"
                ? "linear-gradient(135deg, #f43f5e, #e11d48)"
                : "transparent",
            color: activeTab === "dashboard" ? "#fff" : "var(--text-secondary)",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow:
              activeTab === "dashboard"
                ? "0 2px 8px rgba(244, 63, 94, 0.3)"
                : "none",
          }}
        >
          <LayoutDashboard size={16} />
          <span>Tab 2: Dashboard Pelanggaran</span>
          {bannedCount > 0 && (
            <span
              style={{
                fontSize: "0.7rem",
                padding: "1px 6px",
                borderRadius: "999px",
                background: activeTab === "dashboard" ? "#fff" : "#f43f5e",
                color: activeTab === "dashboard" ? "#e11d48" : "#fff",
                fontWeight: 800,
              }}
            >
              {bannedCount}
            </span>
          )}
        </button>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onOpenChat}
          title="Buka Chatbot AI Asrama"
          style={{
            background: "rgba(16, 185, 129, 0.12)",
            borderColor: "rgba(16, 185, 129, 0.3)",
            color: "#34d399",
          }}
        >
          <Bot size={15} />
          Tanya AI
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onOpenRules}
          title="Tinjau aturan jam sanksi sholat, piket, dan reward baju koko"
        >
          <HelpCircle size={15} />
          Aturan & Reward
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onOpenSettings}
          title="Pengaturan API 9Router / OpenAI"
        >
          <Sparkles size={15} style={{ color: "#38bdf8" }} />
          Pengaturan AI
        </button>

        {hasData && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenExport}
            title="Ekspor rekap atau cetak laporan"
          >
            <Download size={15} />
            Ekspor Laporan
          </button>
        )}
      </div>
    </header>
  );
};
