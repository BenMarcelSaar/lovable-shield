import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Clock } from "lucide-react";

interface ShutdownScreenProps {
  shutdownUntil: string | null;
}

const ShutdownScreen = ({ shutdownUntil }: ShutdownScreenProps) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!shutdownUntil) return;

    const update = () => {
      const diff = new Date(shutdownUntil).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Gleich wieder da...");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const parts: string[] = [];
      if (d > 0) parts.push(`${d}T`);
      if (h > 0) parts.push(`${h}Std`);
      if (m > 0) parts.push(`${m}Min`);
      parts.push(`${s}Sek`);
      setTimeLeft(parts.join(" "));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [shutdownUntil]);

  const hasTimer = !!shutdownUntil;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background"
    >
      {/* Pulsing glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-destructive/20 blur-[120px]"
        />
      </div>

      <div className="relative text-center max-w-lg mx-4 space-y-6">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-24 h-24 rounded-full bg-destructive/10 border-2 border-destructive/40 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-12 h-12 text-destructive" />
          </div>
        </motion.div>

        <div>
          <h1 className="text-6xl font-mono font-bold text-destructive mb-2">
            {hasTimer ? "Error 400" : "Error 404"}
          </h1>

          {hasTimer ? (
            <div className="space-y-4">
              <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                Wir sind gerade etwas am machen oder wir haben Probleme.
                <br />
                Bitte komme in dieser Zeit wieder:
              </p>
              <div className="inline-flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-6 py-3">
                <Clock className="w-5 h-5 text-destructive" />
                <span className="text-xl font-mono font-bold text-foreground">{timeLeft}</span>
              </div>
              <p className="text-muted-foreground font-mono text-xs">
                Danke — Das Sentinel Team
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                Wir haben zur Zeit Probleme.
                <br />
                Bitte komm bald wieder.
              </p>
              <p className="text-muted-foreground font-mono text-xs">
                Danke — Das Sentinel Team
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ShutdownScreen;
