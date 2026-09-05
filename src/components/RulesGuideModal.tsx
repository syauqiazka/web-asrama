import React from "react";
import { X, Scale, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

interface RulesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesGuideModal: React.FC<RulesGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Scale style={{ color: "var(--primary)" }} />
            <h3 className="modal-title">Aturan Bisnis & Perhitungan Jam Sanksi</h3>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "0.875rem" }}>
          <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "#34d399", marginBottom: "6px" }}>
              <ShieldAlert size={18} />
              1. Kategori Sholat Berjamaah
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "8px" }}>
              Hanya <strong>3 waktu sholat</strong> yang dikenai sanksi pelanggaran: <strong>Subuh, Maghrib, Isya</strong>.
              (Waktu Dhuhur dan Ashar disimpan namun <strong>TIDAK</strong> dihitung sanksi).
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "rgba(0,0,0,0.2)", borderRadius: "6px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Kode</th>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Arti</th>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Jam Sanksi</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: "#34d399" }}>H</td>
                  <td style={{ padding: "6px 10px" }}>Hadir Berjamaah</td>
                  <td style={{ padding: "6px 10px", color: "#34d399" }}>0 Jam (Bebas)</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: "#38bdf8" }}>S</td>
                  <td style={{ padding: "6px 10px" }}>Sakit (Ada Keterangan)</td>
                  <td style={{ padding: "6px 10px", color: "#34d399" }}>0 Jam (Bebas)</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: "#fbbf24" }}>I</td>
                  <td style={{ padding: "6px 10px" }}>Izin (Ada Keterangan)</td>
                  <td style={{ padding: "6px 10px", color: "#34d399" }}>0 Jam (Bebas)</td>
                </tr>
                <tr style={{ background: "rgba(244, 63, 94, 0.1)" }}>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: "#fb7185" }}>A</td>
                  <td style={{ padding: "6px 10px", color: "#fb7185" }}>Alpha (Tanpa Keterangan)</td>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: "#fb7185" }}>+2 Jam per kejadian</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ background: "rgba(245, 158, 11, 0.08)", padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "#fbbf24", marginBottom: "6px" }}>
              <AlertTriangle size={18} />
              2. Kategori Piket Asrama (Pagi, Sabtu/Roan, Sore)
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "8px" }}>
              Semua jenis piket diberlakukan aturan yang sama:
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "rgba(0,0,0,0.2)", borderRadius: "6px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Tanda</th>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Arti</th>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Jam Sanksi</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: "#34d399" }}>✓ (Centang)</td>
                  <td style={{ padding: "6px 10px" }}>Piket Dilaksanakan</td>
                  <td style={{ padding: "6px 10px", color: "#34d399" }}>0 Jam (Bebas)</td>
                </tr>
                <tr style={{ background: "rgba(244, 63, 94, 0.1)" }}>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: "#fb7185" }}>X (Merah)</td>
                  <td style={{ padding: "6px 10px", color: "#fb7185" }}>Tidak Piket / Mangkir</td>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: "#fb7185" }}>+1 Jam per kejadian</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={onClose}>
              <CheckCircle2 size={16} />
              Saya Mengerti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
