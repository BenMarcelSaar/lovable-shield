import { motion } from "framer-motion";
import { ShieldAlert, X, AlertTriangle, ExternalLink } from "lucide-react";

interface BlockScreenProps {
  url: string;
  threats: string[];
  malicious: number;
  totalEngines: number;
  onClose: () => void;
  onProceedAnyway: () => void;
}

const BlockScreen = ({ url, threats, malicious, totalEngines, onClose, onProceedAnyway }: BlockScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md"
    >
      {/* Pulsing danger glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-destructive/20 blur-[100px]"
        />
      </div>

      {/* Scanline */}
      <div className="fixed inset-0 scanline pointer-events-none" />

      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20 }}
        className="relative max-w-lg w-full mx-4 bg-card border-2 border-destructive/60 rounded-xl p-8 glow-danger"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning icon */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
            className="inline-block"
          >
            <div className="w-20 h-20 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center mx-auto">
              <ShieldAlert className="w-10 h-10 text-destructive" />
            </div>
          </motion.div>

          <h2 className="text-3xl font-bold font-mono text-destructive mt-4 tracking-tight">
            ZUGRIFF BLOCKIERT
          </h2>
          <p className="text-destructive/80 text-xs font-mono tracking-[0.3em] mt-1">
            BEDROHUNG ERKANNT • SEITE UNSICHER
          </p>
        </div>

        {/* URL display */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
          <p className="text-[10px] font-mono text-muted-foreground mb-1">BLOCKIERTE URL</p>
          <p className="text-foreground font-mono text-sm truncate">{url}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-secondary rounded-lg p-3 text-center">
            <p className="text-2xl font-mono font-bold text-destructive">{malicious}</p>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider">ERKENNUNGEN</p>
          </div>
          <div className="bg-secondary rounded-lg p-3 text-center">
            <p className="text-2xl font-mono font-bold text-foreground">{totalEngines}</p>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider">ENGINES</p>
          </div>
        </div>

        {/* Threat list */}
        {threats.length > 0 && (
          <div className="bg-secondary rounded-lg p-3 mb-6 max-h-32 overflow-y-auto">
            <p className="text-[10px] font-mono text-muted-foreground mb-2 tracking-wider">GEFUNDENE BEDROHUNGEN</p>
            {threats.map((t) => (
              <div key={t} className="flex items-center gap-2 py-0.5">
                <AlertTriangle className="w-3 h-3 text-destructive flex-shrink-0" />
                <p className="text-xs font-mono text-foreground truncate">{t}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-mono text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            ← ZURÜCK ZUR SICHERHEIT
          </button>
          <button
            onClick={onProceedAnyway}
            className="px-4 py-3 border border-destructive/30 text-destructive rounded-lg font-mono text-xs hover:bg-destructive/10 transition-all flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            TROTZDEM
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BlockScreen;
