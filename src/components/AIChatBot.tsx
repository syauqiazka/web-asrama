import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Minimize2,
  Maximize2,
} from "lucide-react";
import type { StudentSummary } from "../types/attendance";


interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

interface AIChatBotProps {
  students: StudentSummary[];
  apiKey?: string;
}

export const AIChatBot: React.FC<AIChatBotProps> = ({
  students,
  apiKey = import.meta.env.VITE_GCP_API_KEY,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      sender: "ai",
      text: "Assalamu'alaikum Warahmatullahi Wabarakatuh, Ustaz/Pengurus Asrama! 🌙\n\nSaya **Asisten AI SIM-Asrama** (ditenagai Google Gemini AI). Saya siap membantu Anda menganalisis pelanggaran santri, merekap jam sanksi, mengecek siapa yang paling sering alpha sholat atau mangkir piket, hingga membuatkan draf pesan teguran WhatsApp untuk wali santri.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Siapkan konteks data ringkasan untuk diumpankan ke AI
  const prepareContextData = () => {
    const totalStudents = students.length;
    const violators = students.filter((s) => s.totalSanctionHours > 0);
    const clean = students.filter((s) => s.totalSanctionHours === 0);
    const totalHours = students.reduce(
      (acc, curr) => acc + curr.totalSanctionHours,
      0
    );

    const top10 = students.slice(0, 15).map((s, idx) => ({
      rank: idx + 1,
      name: s.studentName,
      totalHours: s.totalSanctionHours,
      violationsCount: s.violationCount,
      breakdown: s.breakdown.map(
        (b) => `${b.categoryLabel}: ${b.hours}j (${b.violationCount}x)`
      ),
    }));

    return {
      totalSantriTerdata: totalStudents,
      totalSantriMelanggar: violators.length,
      totalSantriBebasSanksi: clean.length,
      totalAkumulasiJamSanksi: totalHours,
      daftarPeringkatSanksiSantri: top10,
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setIsLoading(true);

    const activeKey = apiKey?.trim() || "";
    const contextData = prepareContextData();

    const systemInstructionText = `Anda adalah Asisten AI Cerdas SIM Asrama / Pesantren. Anda ramah, sopan, berwibawa islami, dan selalu memberikan jawaban yang akurat, terstruktur, dan solutif bagi Pengurus/Ustaz Asrama.

ATURAN BISNIS ASRAMA:
1. Sholat Berjamaah: Hanya Subuh, Maghrib, Isya yang disanksi (Alpha = 2 jam sanksi). Hadir, Sakit, Izin = 0 jam. Waktu Dhuhur & Ashar tidak disanksi (0 jam).
2. Piket Asrama: Tanda centang (✓/✔️) = 0 jam, Tanda silang (X/✖️) = 1 jam sanksi.

RINGKASAN DATA AKTIF ASRAMA SAAT INI:
${JSON.stringify(contextData, null, 2)}

Instruksi Tambahan:
- Jawab pertanyaan seputar nama santri, jam sanksi, rincian pelanggaran, perbandingan, atau rekomendasi tindakan secara tepat berdasarkan data di atas.
- Jika diminta membuat draft pesan WhatsApp atau surat teguran, buat dengan bahasa yang santun, islami, dan jelas.
- Format teks dengan Markdown yang rapi (gunakan bold, bullet points, dan emoji secukupnya).`;

    // Riwayat percakapan untuk Gemini
    const contents: any[] = [];
    for (const m of messages) {
      if (m.id === "welcome-msg" || m.id === "welcome-msg-reset") continue;
      contents.push({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: query }],
    });

    let replyText = "";
    let success = false;

    // Panggil langsung Google Gemini API
    const modelsToTry = ["gemini-flash-latest", "gemini-3.6-flash"];

    for (const modelName of modelsToTry) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstructionText }],
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        });

        const data = await res.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          replyText = data.candidates[0].content.parts[0].text;
          success = true;
          break;
        }
      } catch {
        // lanjut model berikutnya
      }
    }

    // Jika direct fetch gagal, fallback ke internal proxy
    if (!success) {
      try {
        const proxyRes = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query,
            history: contents.slice(0, -1),
            contextData,
            apiKey: activeKey,
          }),
        });
        const proxyData = await proxyRes.json();
        if (proxyData.ok && proxyData.reply) {
          replyText = proxyData.reply;
          success = true;
        }
      } catch {
        // fallback failed
      }
    }

    if (success && replyText) {
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } else {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "ai",
        text: "Afwan, terjadi kendala saat menghubungkan ke asisten AI. Silakan coba kembali sesaat lagi.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setIsLoading(false);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome-msg-reset",
        sender: "ai",
        text: "Riwayat percakapan telah dibersihkan. Silakan tanyakan informasi rekapitulasi santri yang Anda butuhkan.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  const quickPrompts = [
    {
      label: "🏆 Santri Pelanggar Terbanyak",
      query: "Siapa 3 santri dengan pelanggaran dan jam sanksi terbanyak saat ini?",
    },
    {
      label: "📊 Ringkasan Statistik",
      query:
        "Buatkan ringkasan singkat statistik pelanggaran sholat dan piket santri saat ini.",
    },
    {
      label: "✉️ Draft WA Teguran",
      query:
        "Buatkan draf pesan WhatsApp yang santun dan tegas untuk santri yang memiliki sanksi lebih dari 4 jam.",
    },
    {
      label: "📜 Aturan Jam Sanksi",
      query:
        "Jelaskan aturan sanksi untuk Sholat Subuh, Maghrib, Isya, dan Piket di asrama ini.",
    },
  ];

  // Helper render formatted markdown text
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      // Bold
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Bullet point
      if (formattedLine.startsWith("* ") || formattedLine.startsWith("- ")) {
        formattedLine = "• " + formattedLine.substring(2);
      }
      return (
        <span
          key={idx}
          style={{
            display: "block",
            minHeight: line.trim() === "" ? "8px" : "auto",
          }}
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            height: "56px",
            padding: "0 22px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, #10b981, #06b6d4)",
            color: "#fff",
            boxShadow:
              "0 8px 24px rgba(16, 185, 129, 0.45), 0 0 16px rgba(6, 182, 212, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 900,
            cursor: "pointer",
            border: "2px solid rgba(255, 255, 255, 0.25)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          title="Buka Chatbot AI Asrama"
        >
          <Bot size={24} />
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
            Tanya AI Asrama
          </span>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#34d399",
              boxShadow: "0 0 8px #34d399",
            }}
          />
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: isExpanded ? "640px" : "400px",
            maxWidth: "calc(100vw - 32px)",
            height: isExpanded ? "680px" : "560px",
            maxHeight: "calc(100vh - 48px)",
            background: "rgba(15, 23, 42, 0.96)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-lg)",
            boxShadow:
              "0 12px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(16, 185, 129, 0.25)",
            display: "flex",
            flexDirection: "column",
            zIndex: 999,
            overflow: "hidden",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.18))",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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
                <Bot size={22} />
              </div>
              <div>
                <h4
                  style={{
                    fontSize: "0.95rem",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  Asisten AI Asrama
                  <Sparkles size={14} style={{ color: "#38bdf8" }} />
                </h4>
                <div
                  style={{
                    fontSize: "0.725rem",
                    color: "#34d399",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#34d399",
                    }}
                  />
                  Google Gemini 3.6 / Flash Aktif
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                className="btn-icon"
                onClick={handleClearHistory}
                title="Bersihkan percakapan"
                style={{ padding: "6px" }}
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Perkecil" : "Perbesar"}
                style={{ padding: "6px" }}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsOpen(false)}
                title="Tutup"
                style={{ padding: "6px" }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Prompts */}
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(0, 0, 0, 0.3)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(p.query)}
                disabled={isLoading}
                style={{
                  fontSize: "0.725rem",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "rgba(16, 185, 129, 0.15)";
                  e.currentTarget.style.color = "#34d399";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.06)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: isExpanded ? "82%" : "88%",
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "rgba(16, 185, 129, 0.2)",
                        color: "#34d399",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      <Bot size={16} />
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: isUser
                          ? "14px 14px 2px 14px"
                          : "14px 14px 14px 2px",
                        background: isUser
                          ? "linear-gradient(135deg, #10b981, #059669)"
                          : "rgba(30, 41, 59, 0.85)",
                        color: "#fff",
                        fontSize: "0.85rem",
                        lineHeight: 1.5,
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                        position: "relative",
                      }}
                    >
                      {renderFormattedText(m.text)}

                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(m.id, m.text)}
                          style={{
                            marginTop: "8px",
                            padding: "2px 6px",
                            fontSize: "0.7rem",
                            borderRadius: "4px",
                            background: "rgba(255, 255, 255, 0.08)",
                            color:
                              copiedId === m.id
                                ? "#34d399"
                                : "var(--text-muted)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="Salin pesan"
                        >
                          {copiedId === m.id ? (
                            <Check size={11} />
                          ) : (
                            <Copy size={11} />
                          )}
                          {copiedId === m.id ? "Tersalin" : "Salin"}
                        </button>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--text-muted)",
                        marginTop: "3px",
                        alignSelf: isUser ? "flex-end" : "flex-start",
                      }}
                    >
                      {m.timestamp}
                    </span>
                  </div>

                  {isUser && (
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.12)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      <User size={16} />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  alignSelf: "flex-start",
                  color: "var(--text-secondary)",
                  fontSize: "0.825rem",
                  background: "rgba(30, 41, 59, 0.6)",
                  padding: "8px 12px",
                  borderRadius: "12px",
                }}
              >
                <div
                  className="animate-spin"
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid #34d399",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                  }}
                />
                Asisten AI Gemini sedang menganalisis data...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div
            style={{
              padding: "12px 14px",
              borderTop: "1px solid var(--border-subtle)",
              background: "rgba(11, 15, 25, 0.95)",
              display: "flex",
              gap: "8px",
            }}
          >
            <input
              type="text"
              placeholder="Tanyakan analisis atau minta draf teguran..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: "0.85rem",
                borderRadius: "var(--radius-md)",
              }}
              disabled={isLoading}
            />

            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "8px 14px" }}
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              title="Kirim pesan"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
