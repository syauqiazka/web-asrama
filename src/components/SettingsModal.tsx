import React, { useState } from "react";
import { X, Sparkles, Key, Check, Info, ChevronDown, ChevronUp } from "lucide-react";
import type { AISettings } from "../services/aiClassifier";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (settings: AISettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [apiKey, setApiKey] = useState(settings.apiKey || "");
  const [provider, setProvider] = useState<"9router" | "gemini" | "openai" | "groq">(
    settings.provider || "9router"
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [endpoint, setEndpoint] = useState(
    settings.endpoint || "https://9router.com/v1/chat/completions"
  );
  const [model, setModel] = useState(settings.model || "gpt-4o-mini");
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleProviderChange = (p: "9router" | "gemini" | "openai" | "groq") => {
    setProvider(p);
    if (p === "9router") {
      setEndpoint("https://9router.com/v1/chat/completions");
      setModel("gpt-4o-mini");
    } else if (p === "openai") {
      setEndpoint("https://api.openai.com/v1/chat/completions");
      setModel("gpt-4o-mini");
    } else if (p === "gemini") {
      setEndpoint("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
      setModel("gemini-1.5-flash");
    } else if (p === "groq") {
      setEndpoint("https://api.groq.com/openai/v1/chat/completions");
      setModel("llama-3.3-70b-versatile");
    }
  };

  const handleSave = () => {
    onSave({
      apiKey: apiKey.trim(),
      provider,
      endpoint: endpoint.trim(),
      model: model.trim(),
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Sparkles style={{ color: "var(--accent)" }} />
            <h3 className="modal-title">Pengaturan API Key AI</h3>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              fontSize: "0.825rem",
              color: "var(--text-secondary)",
              display: "flex",
              gap: "10px",
            }}
          >
            <Info size={18} style={{ color: "#34d399", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>Tinggal Tempel API Key:</strong> Cukup paste API Key dari penyedia AI Anda di bawah ini.
              Sistem akan otomatis menggunakan model AI tersebut untuk membaca struktur sheet yang tidak standar.
            </div>
          </div>

          {/* Pilihan Provider Sederhana */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.825rem",
                fontWeight: 600,
                marginBottom: "8px",
                color: "var(--text-secondary)",
              }}
            >
              Pilih Penyedia AI:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { id: "9router", label: "9Router / Router AI" },
                { id: "openai", label: "OpenAI (ChatGPT)" },
                { id: "gemini", label: "Google Gemini" },
                { id: "groq", label: "Groq (Super Cepat)" },
              ].map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => handleProviderChange(prov.id as any)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: provider === prov.id ? "1.5px solid var(--primary)" : "1px solid var(--border-subtle)",
                    background: provider === prov.id ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.04)",
                    color: provider === prov.id ? "#fff" : "var(--text-secondary)",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    textAlign: "center",
                  }}
                >
                  {prov.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input API Key Utama */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "6px",
                color: "#fff",
              }}
            >
              API Key AI
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                placeholder="Tempel / Paste API Key Anda di sini..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ width: "100%", paddingLeft: "36px", fontSize: "0.9rem" }}
                autoFocus
              />
              <Key
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
              Kunci API disimpan dengan aman di sesi browser Anda.
            </span>
          </div>

          {/* Opsi Lanjutan (Dapat dibuka jika ingin kustomisasi) */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "10px" }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.775rem",
                color: "var(--text-muted)",
              }}
            >
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Opsi Lanjutan (Kustom Endpoint & Model)
            </button>

            {showAdvanced && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Custom Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: "0.8rem", padding: "6px 10px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    style={{ width: "100%", fontSize: "0.8rem", padding: "6px 10px" }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              {saved ? <Check size={16} /> : <Sparkles size={16} />}
              {saved ? "Tersimpan!" : "Simpan API Key"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
