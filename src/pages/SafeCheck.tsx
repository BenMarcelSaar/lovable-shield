import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ShieldAlert, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type CheckState = "scanning" | "safe" | "danger";

const SafeCheck = () => {
  const [searchParams] = useSearchParams();
  const rawUrl = searchParams.get("url") || "";
  const url = rawUrl && !/^https?:\/\//i.test(rawUrl) ? "https://" + rawUrl : rawUrl;
  const [state, setState] = useState<CheckState>("scanning");
  const [progress, setProgress] = useState(0);
  const [threatCount, setThreatCount] = useState(0);

  useEffect(() => {
    if (!url) {
      window.location.href = "/";
      return;
    }

    // Animate progress bar
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 300);

    const scan = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("scan", {
          body: { type: "url", url },
        });

        clearInterval(interval);
        setProgress(100);

        if (error || data?.error) {
          // On error, redirect to safety (Google)
          setTimeout(() => {
            window.location.href = "https://www.google.com";
          }, 1500);
          return;
        }

        if (data.status === "threat") {
          setThreatCount(data.malicious + data.suspicious);
          setState("danger");
          // Redirect to Google after 3 seconds
          setTimeout(() => {
            window.location.href = "https://www.google.com";
          }, 3000);
        } else {
          setState("safe");
          // Redirect to the actual site after 1.5 seconds
          setTimeout(() => {
            window.location.href = url;
          }, 1500);
        }
      } catch {
        clearInterval(interval);
        window.location.href = "https://www.google.com";
      }
    };

    scan();
    return () => clearInterval(interval);
  }, [url]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Scanline */}
      <div className="fixed inset-0 scanline pointer-events-none z-10" />

      {/* Grid */}
      <div className="fixed inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(hsl(150 100% 45%) 1px, transparent 1px), linear-gradient(90deg, hsl(150 100% 45%) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Glow based on state */}
      <motion.div
        animate={{
          backgroundColor: state === "danger"
            ? "hsl(0 80% 55% / 0.15)"
            : state === "safe"
            ? "hsl(150 100% 45% / 0.1)"
            : "hsl(150 100% 45% / 0.05)",
        }}
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[120px] pointer-events-none"
      />

      <div className="relative z-20 max-w-md w-full mx-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-xl p-8 text-center"
        >
          {/* Icon */}
          <div className="mb-6">
            {state === "scanning" && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <div className="w-20 h-20 rounded-full border-2 border-primary/30 border-t-primary flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
              </motion.div>
            )}
            {state === "safe" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10 }}
              >
                <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
              </motion.div>
            )}
            {state === "danger" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
              >
                <div className="w-20 h-20 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-10 h-10 text-destructive" />
                </div>
              </motion.div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold font-mono text-foreground mb-2">
            {state === "scanning" && "WIRD GEPRÜFT..."}
            {state === "safe" && "SEITE IST SICHER ✓"}
            {state === "danger" && "GEFAHR ERKANNT ⚠"}
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground text-xs font-mono mb-6">
            {state === "scanning" && "Sentinel prüft diese URL auf Bedrohungen"}
            {state === "safe" && "Du wirst gleich weitergeleitet..."}
            {state === "danger" && `${threatCount} Bedrohung(en) erkannt – Weiterleitung zu Google...`}
          </p>

          {/* URL display */}
          <div className="bg-secondary rounded-lg p-3 mb-6">
            <p className="text-[10px] font-mono text-muted-foreground mb-1">URL</p>
            <p className="text-foreground font-mono text-sm truncate">{url}</p>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
              className={`h-full rounded-full ${
                state === "danger" ? "bg-destructive" : "bg-primary"
              }`}
            />
          </div>

          <p className="text-[10px] font-mono text-muted-foreground mt-3 tracking-widest">
            {state === "scanning" && "SENTINEL SAFE BROWSING"}
            {state === "safe" && "KEINE BEDROHUNGEN GEFUNDEN"}
            {state === "danger" && "ZUGRIFF BLOCKIERT"}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SafeCheck;
