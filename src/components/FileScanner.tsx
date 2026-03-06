import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Shield, AlertTriangle, CheckCircle, FileText, X, Loader2 } from "lucide-react";

interface ScanResult {
  fileName: string;
  fileSize: string;
  status: "clean" | "threat" | "unknown";
  threats: string[];
  scannedAt: string;
}

const FileScanner = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const simulateScan = useCallback((file: File) => {
    setScanning(true);
    setProgress(0);
    setCurrentFile(file.name);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          const isThreat = Math.random() < 0.2;
          const result: ScanResult = {
            fileName: file.name,
            fileSize: formatFileSize(file.size),
            status: isThreat ? "threat" : "clean",
            threats: isThreat
              ? ["Trojan.GenericKD.46542", "Heuristic.HEUR/Malware"]
              : [],
            scannedAt: new Date().toLocaleTimeString(),
          };
          setResults((prev) => [result, ...prev]);
          setScanning(false);
          setCurrentFile(null);
          return 0;
        }
        return prev + Math.random() * 8 + 2;
      });
    }, 100);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) simulateScan(file);
    },
    [simulateScan]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) simulateScan(file);
    },
    [simulateScan]
  );

  const clearResults = () => setResults([]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Scanline overlay */}
      <div className="fixed inset-0 scanline z-10 pointer-events-none" />

      {/* Grid background */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(150 100% 45%) 1px, transparent 1px), linear-gradient(90deg, hsl(150 100% 45%) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-20 max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground text-glow font-mono">
              SENTINEL
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-mono tracking-wider">
            FILE THREAT ANALYSIS SYSTEM v2.1
          </p>
        </motion.div>

        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              block cursor-pointer rounded-lg border-2 border-dashed p-12 text-center
              transition-all duration-300
              ${
                isDragging
                  ? "border-primary bg-primary/5 glow-primary"
                  : "border-border hover:border-primary/50 bg-card"
              }
              ${scanning ? "pointer-events-none opacity-60" : ""}
            `}
          >
            <input
              type="file"
              onChange={handleFileInput}
              className="hidden"
              disabled={scanning}
            />
            {scanning ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                <p className="text-foreground font-mono text-sm">
                  SCANNING: {currentFile}
                </p>
                <div className="max-w-xs mx-auto">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs mt-2 font-mono">
                    {Math.min(Math.round(progress), 100)}% — Analyzing signatures...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-1">
                  Drop a file here or click to upload
                </p>
                <p className="text-muted-foreground text-sm font-mono">
                  Any file type • Max 100MB
                </p>
              </>
            )}
          </label>
        </motion.div>

        {/* Results */}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-mono text-muted-foreground tracking-wider">
                SCAN RESULTS ({results.length})
              </h2>
              <button
                onClick={clearResults}
                className="text-muted-foreground hover:text-destructive transition-colors text-xs font-mono flex items-center gap-1"
              >
                <X className="w-3 h-3" /> CLEAR
              </button>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {results.map((result, i) => (
                  <motion.div
                    key={result.fileName + result.scannedAt}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.05 }}
                    className={`
                      rounded-lg border p-4 bg-card
                      ${
                        result.status === "threat"
                          ? "border-destructive/50 glow-danger"
                          : "border-border"
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {result.status === "clean" ? (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground font-mono text-sm truncate">
                            {result.fileName}
                          </span>
                          <span className="text-muted-foreground text-xs font-mono">
                            ({result.fileSize})
                          </span>
                        </div>
                        {result.status === "clean" ? (
                          <p className="text-primary text-xs font-mono">
                            ✓ NO THREATS DETECTED
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-destructive text-xs font-mono">
                              ⚠ {result.threats.length} THREAT(S) FOUND
                            </p>
                            {result.threats.map((t) => (
                              <p
                                key={t}
                                className="text-muted-foreground text-xs font-mono pl-3"
                              >
                                → {t}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs font-mono whitespace-nowrap">
                        {result.scannedAt}
                      </span>
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
          className="text-center text-muted-foreground text-xs font-mono mt-12 tracking-wider"
        >
          DEMO MODE — Connect to VirusTotal API for real scanning
        </motion.p>
      </div>
    </div>
  );
};

export default FileScanner;
