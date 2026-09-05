import React from "react";
import {
  Building2,
  Sparkles,
  HelpCircle,
  Download,
} from "lucide-react";

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenRules: () => void;
  onOpenExport: () => void;
  hasData: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSettings,
  onOpenRules,
  onOpenExport,
  hasData,
}) => {
  return (
    <header className="app-header">
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
            Dashboard Rekap Pelanggaran Absensi Sholat & Piket Santri
          </p>
        </div>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onOpenRules}
          title="Tinjau aturan jam sanksi sholat & piket"
        >
          <HelpCircle size={15} />
          Aturan Sanksi
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
