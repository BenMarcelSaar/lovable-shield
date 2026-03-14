import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Shield, AlertTriangle, CheckCircle, FileText, X, Loader2,
  Link, BarChart3, ShieldCheck, ShieldAlert, Globe, Activity, Hash, BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BlockScreen from "./BlockScreen";

interface ScanResult {
  name: string;
  size: string;
  type: "file" | "url";
  status: "clean" | "threat" | "unknown";
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  threats: string[];
  totalEngines: number;
  message?: string;
  scannedAt: string;
}

const FileScanner = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanTarget, setScanTarget] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [blockedResult, setBlockedResult] = useState<ScanResult | null>(null);
  const [safeBrowsing, setSafeBrowsing] = useState(true);

  const stats = useMemo(() => {
    const total = results.length;
    const clean = results.filter(r => r.status === "clean").length;
    const threats = results.filter(r => r.status === "threat").length;
    const unknown = results.filter(r => r.status === "unknown").length;
    return { total, clean, threats, unknown };
  }, [results]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const computeSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const scanFile = useCallback(async (file: File) => {
    setScanning(true);
    setScanTarget(file.name);
    setError(null);

    try {
      const hash = await computeSHA256(file);
      const { data, error: fnError } = await supabase.functions.invoke("scan", {
        body: {
          type: "file",
          fileHash: hash,
          fileName: file.name,
          fileSize: formatFileSize(file.size),
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setResults(prev => [{ ...data, scannedAt: new Date().toLocaleTimeString() }, ...prev]);
    } catch (err: any) {
      setError(err.message || "Scan failed");
    } finally {
      setScanning(false);
      setScanTarget("");
    }
  }, []);

  const normalizeUrl = (input: string) => {
    let u = input.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    return u;
  };

  const scanUrl = useCallback(() => {
    if (!urlInput.trim()) return;
    const targetUrl = normalizeUrl(urlInput);

    if (!safeBrowsing) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      setUrlInput("");
      return;
    }

    // Redirect to the safe-check loading page
    const checkUrl = `/check?url=${encodeURIComponent(targetUrl)}`;
    window.location.href = checkUrl;
  }, [urlInput, safeBrowsing]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) scanFile(file);
  }, [scanFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) scanFile(file);
  }, [scanFile]);

  const clearResults = () => setResults([]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Scanline overlay */}
      <div className="fixed inset-0 scanline z-10 pointer-events-none" />

      {/* Animated grid background */}
      <div className="fixed inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(hsl(150 100% 45%) 1px, transparent 1px), linear-gradient(90deg, hsl(150 100% 45%) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Radial glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-20 max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block mb-3"
          >
            <Shield className="w-14 h-14 text-primary drop-shadow-[0_0_15px_hsl(150_100%_45%/0.5)]" />
          </motion.div>
          <h1 className="text-5xl font-bold text-foreground text-glow font-mono tracking-tighter">
            SENTINEL
          </h1>
          <p className="text-muted-foreground text-xs font-mono tracking-[0.3em] mt-2">
            REAL-TIME THREAT ANALYSIS • POWERED BY VIRUSTOTAL
          </p>

          {/* Tutorial link */}
          <button
            onClick={() => navigate("/tutorial")}
            className="mt-3 inline-flex items-center gap-2 text-primary/70 hover:text-primary transition-colors font-mono text-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            HANDBUCH & TUTORIALS
          </button>
          </p>

          {/* Safe Browsing Toggle */}
          <div className="mt-4 inline-flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2">
            <Shield className={`w-4 h-4 ${safeBrowsing ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-xs font-mono text-foreground">SAFE BROWSING</span>
            <button
              onClick={() => setSafeBrowsing(!safeBrowsing)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                safeBrowsing ? "bg-primary" : "bg-secondary"
              }`}
            >
              <motion.div
                animate={{ x: safeBrowsing ? 20 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-0.5 w-4 h-4 rounded-full bg-primary-foreground"
              />
            </button>
            <span className={`text-[10px] font-mono tracking-wider ${safeBrowsing ? "text-primary" : "text-muted-foreground"}`}>
              {safeBrowsing ? "AN" : "AUS"}
            </span>
          </div>
        </motion.div>

        {/* Stats Bar */}
        {stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-4 gap-3 mb-8"
          >
            {[
              { label: "SCANNED", value: stats.total, icon: Activity, color: "text-foreground" },
              { label: "CLEAN", value: stats.clean, icon: ShieldCheck, color: "text-primary" },
              { label: "THREATS", value: stats.threats, icon: ShieldAlert, color: "text-destructive" },
              { label: "UNKNOWN", value: stats.unknown, icon: BarChart3, color: "text-muted-foreground" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-card border border-border rounded-lg p-3 text-center">
                <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                <p className={`text-2xl font-mono font-bold ${color}`}>{value}</p>
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider">{label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex gap-1 mb-4 bg-card border border-border rounded-lg p-1 w-fit">
            {[
              { id: "file" as const, label: "FILE SCAN", icon: Upload },
              { id: "url" as const, label: "URL SCAN", icon: Globe },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono transition-all ${
                  activeTab === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* File upload zone */}
          {activeTab === "file" && (
            <label
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`
                block cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-all duration-300
                ${isDragging ? "border-primary bg-primary/5 glow-primary" : "border-border hover:border-primary/40 bg-card"}
                ${scanning ? "pointer-events-none opacity-60" : ""}
              `}
            >
              <input type="file" onChange={handleFileInput} className="hidden" disabled={scanning} />
              {scanning ? (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
                  <p className="text-foreground font-mono text-sm">ANALYZING: {scanTarget}</p>
                  <div className="flex items-center gap-2 justify-center">
                    <Hash className="w-3 h-3 text-muted-foreground" />
                    <p className="text-muted-foreground text-xs font-mono">Computing SHA-256 hash & querying VirusTotal...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-foreground font-medium mb-1">Drop a file or click to scan</p>
                  <p className="text-muted-foreground text-xs font-mono">SHA-256 hash lookup • No file uploaded to server</p>
                </>
              )}
            </label>
          )}

          {/* URL input */}
          {activeTab === "url" && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !scanning && scanUrl()}
                    placeholder="URL eingeben zum sicheren Öffnen..."
                    disabled={scanning}
                    className="w-full bg-secondary border border-border rounded-md pl-10 pr-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={scanUrl}
                  disabled={scanning || !urlInput.trim()}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-mono text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  SICHER ÖFFNEN
                </button>
              </div>
              {scanning && (
                <p className="text-muted-foreground text-xs font-mono mt-3">
                  Prüfe die URL... wenn sicher, wird sie automatisch geöffnet.
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-destructive text-xs font-mono flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-destructive hover:text-destructive/80">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-mono text-muted-foreground tracking-wider">
                SCAN RESULTS ({results.length})
              </h2>
              <button onClick={clearResults} className="text-muted-foreground hover:text-destructive transition-colors text-xs font-mono flex items-center gap-1">
                <X className="w-3 h-3" /> CLEAR
              </button>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {results.map((result) => (
                  <motion.div
                    key={result.name + result.scannedAt}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`rounded-lg border p-4 bg-card ${
                      result.status === "threat" ? "border-destructive/50 glow-danger" :
                      result.status === "clean" ? "border-primary/20" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {result.status === "clean" ? (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        ) : result.status === "threat" ? (
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                        ) : (
                          <BarChart3 className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {result.type === "url" ? (
                            <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="text-foreground font-mono text-sm truncate">
                            {result.name}
                          </span>
                          {result.size !== "-" && (
                            <span className="text-muted-foreground text-xs font-mono">
                              ({result.size})
                            </span>
                          )}
                        </div>

                        {/* Engine stats bar */}
                        {result.totalEngines > 0 && (
                          <div className="mb-2">
                            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-secondary">
                              {result.malicious > 0 && (
                                <div className="bg-destructive h-full" style={{ width: `${(result.malicious / result.totalEngines) * 100}%` }} />
                              )}
                              {result.suspicious > 0 && (
                                <div className="bg-yellow-500 h-full" style={{ width: `${(result.suspicious / result.totalEngines) * 100}%` }} />
                              )}
                              {result.harmless > 0 && (
                                <div className="bg-primary h-full" style={{ width: `${(result.harmless / result.totalEngines) * 100}%` }} />
                              )}
                              {result.undetected > 0 && (
                                <div className="bg-muted-foreground/30 h-full" style={{ width: `${(result.undetected / result.totalEngines) * 100}%` }} />
                              )}
                            </div>
                            <div className="flex gap-3 mt-1 text-[10px] font-mono">
                              <span className="text-destructive">{result.malicious} malicious</span>
                              <span className="text-primary">{result.harmless} clean</span>
                              <span className="text-muted-foreground">{result.undetected} undetected</span>
                              <span className="text-muted-foreground ml-auto">{result.totalEngines} engines</span>
                            </div>
                          </div>
                        )}

                        {result.status === "clean" && (
                          <p className="text-primary text-xs font-mono">✓ NO THREATS DETECTED</p>
                        )}
                        {result.status === "unknown" && (
                          <p className="text-muted-foreground text-xs font-mono">? {result.message}</p>
                        )}
                        {result.status === "threat" && (
                          <div className="space-y-0.5">
                            <p className="text-destructive text-xs font-mono">⚠ {result.threats.length} DETECTION(S)</p>
                            {result.threats.map((t) => (
                              <p key={t} className="text-muted-foreground text-xs font-mono pl-3">→ {t}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs font-mono whitespace-nowrap">{result.scannedAt}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-muted-foreground text-[10px] font-mono mt-12 tracking-widest"
        >
          POWERED BY VIRUSTOTAL API • FILE HASHES NEVER LEAVE YOUR BROWSER
        </motion.p>
      </div>

      {/* Block Screen Overlay */}
      <AnimatePresence>
        {blockedResult && (
          <BlockScreen
            url={blockedResult.name}
            threats={blockedResult.threats}
            malicious={blockedResult.malicious + blockedResult.suspicious}
            totalEngines={blockedResult.totalEngines}
            onClose={() => setBlockedResult(null)}
            onProceedAnyway={() => {
              setBlockedResult(null);
              window.open(blockedResult.name, "_blank");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileScanner;
