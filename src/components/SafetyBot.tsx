import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/safety-chat`;
const BAN_KEY = "sentinel_ban_until";

const RobotFace = ({ size = 28, className = "" }: { size?: number; className?: string }) => {
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      setEyeOffset({ x: dx * 2.5, y: dy * 2 });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const s = size;
  const eyeR = s * 0.09;
  const pupilR = s * 0.05;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
      <rect x={s*0.15} y={s*0.2} width={s*0.7} height={s*0.65} rx={s*0.12} fill="currentColor" opacity={0.85} />
      <line x1={s*0.5} y1={s*0.2} x2={s*0.5} y2={s*0.08} stroke="currentColor" strokeWidth={s*0.04} strokeLinecap="round" />
      <circle cx={s*0.5} cy={s*0.06} r={s*0.04} fill="currentColor" />
      <rect x={s*0.06} y={s*0.38} width={s*0.1} height={s*0.2} rx={s*0.04} fill="currentColor" opacity={0.7} />
      <rect x={s*0.84} y={s*0.38} width={s*0.1} height={s*0.2} rx={s*0.04} fill="currentColor" opacity={0.7} />
      <ellipse cx={s*0.36} cy={s*0.46} rx={eyeR} ry={eyeR} fill="hsl(var(--background))" />
      <ellipse cx={s*0.64} cy={s*0.46} rx={eyeR} ry={eyeR} fill="hsl(var(--background))" />
      <circle cx={s*0.36 + eyeOffset.x} cy={s*0.46 + eyeOffset.y} r={pupilR} fill="hsl(var(--primary))">
        <animate attributeName="r" values={`${pupilR};${pupilR*1.2};${pupilR}`} dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx={s*0.64 + eyeOffset.x} cy={s*0.46 + eyeOffset.y} r={pupilR} fill="hsl(var(--primary))">
        <animate attributeName="r" values={`${pupilR};${pupilR*1.2};${pupilR}`} dur="3s" repeatCount="indefinite" />
      </circle>
      <rect x={s*0.35} y={s*0.62} width={s*0.3} height={s*0.06} rx={s*0.03} fill="hsl(var(--background))" opacity={0.8} />
      <line x1={s*0.42} y1={s*0.62} x2={s*0.42} y2={s*0.68} stroke="currentColor" strokeWidth={s*0.015} opacity={0.3} />
      <line x1={s*0.5} y1={s*0.62} x2={s*0.5} y2={s*0.68} stroke="currentColor" strokeWidth={s*0.015} opacity={0.3} />
      <line x1={s*0.58} y1={s*0.62} x2={s*0.58} y2={s*0.68} stroke="currentColor" strokeWidth={s*0.015} opacity={0.3} />
    </svg>
  );
};

const SafetyBot = ({ onBan }: { onBan?: (until: number) => void }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // Check if currently banned
    const banUntil = Number(localStorage.getItem(BAN_KEY) || 0);
    if (banUntil > Date.now()) {
      onBan?.(banUntil);
      return;
    }

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      // Check for block response (JSON, not stream)
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await resp.json();
        if (data.blocked) {
          const until = Date.now() + 5 * 60 * 1000;
          localStorage.setItem(BAN_KEY, String(until));
          setOpen(false);
          onBan?.(until);
          // Remove the offensive message
          setMessages((prev) => prev.slice(0, -1));
          return;
        }
        if (data.error) {
          upsertAssistant(`❌ ${data.error}`);
          return;
        }
      }

      if (!resp.ok || !resp.body) {
        throw new Error("Fehler bei der KI-Anfrage");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      upsertAssistant("❌ Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        whileTap={{ scale: 0.9 }}
        animate={open ? { rotate: 0 } : { rotate: [0, 10, -10, 0] }}
        transition={open ? {} : { duration: 2, repeat: Infinity, repeatDelay: 3 }}
      >
        {open ? <X className="w-6 h-6" /> : <RobotFace size={30} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="bg-primary/10 border-b border-border px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                <RobotFace size={22} />
              </div>
              <div>
                <h3 className="font-bold font-mono text-foreground text-sm">SENTINEL AI</h3>
                <p className="text-[10px] font-mono text-muted-foreground">Dein Internet-Sicherheitsberater</p>
              </div>
              <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center pt-8">
                  <div className="text-primary/30 mx-auto mb-3 w-12 h-12 flex items-center justify-center">
                    <RobotFace size={48} />
                  </div>
                  <p className="text-muted-foreground text-sm font-mono">
                    Hallo! 👋 Ich bin Sentinel AI.
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Frag mich alles über Datenschutz & Internet-Sicherheit!
                  </p>
                  <div className="mt-4 space-y-2">
                    {[
                      "Wie erstelle ich sichere Passwörter?",
                      "Was ist Phishing?",
                      "Brauche ich ein VPN?",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="block w-full text-left text-xs font-mono text-primary/80 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 hover:bg-primary/10 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-xl px-3 py-2 rounded-bl-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Frage stellen..."
                  disabled={isLoading}
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 disabled:opacity-50"
                />
                <button
                  onClick={send}
                  disabled={isLoading || !input.trim()}
                  className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SafetyBot;
