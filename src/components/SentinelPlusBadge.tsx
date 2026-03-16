import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, X, Sparkles, Check } from "lucide-react";
import { useSentinelPlus } from "@/hooks/useSentinelPlus";
import { useAuth } from "@/hooks/useAuth";

const SentinelPlusBadge = () => {
  const { user } = useAuth();
  const { isPlus, plusUntil, activateWithCode } = useSentinelPlus();
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setError("");
    setLoading(true);
    const ok = await activateWithCode(code);
    setLoading(false);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setCode("");
      }, 2000);
    } else {
      setError("Ungültiger Code. Versuche es erneut.");
    }
  };

  const daysLeft = plusUntil
    ? Math.max(0, Math.ceil((new Date(plusUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
          isPlus
            ? "bg-gradient-to-r from-yellow-600/90 to-amber-500/90 text-yellow-100 border border-yellow-400/50 shadow-[0_0_15px_hsl(45_100%_50%/0.3)]"
            : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
        }`}
      >
        <Crown className={`w-4 h-4 ${isPlus ? "text-yellow-200" : ""}`} />
        <span>SENTINEL {isPlus ? "PLUS" : "+"}</span>
        {isPlus && !({ isAdmin: false } as any).isAdmin && (
          <span className="text-[9px] opacity-75">{daysLeft}d</span>
        )}
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="relative bg-gradient-to-br from-yellow-600/20 to-amber-500/10 border-b border-yellow-500/20 px-6 py-5">
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-mono text-foreground">SENTINEL PLUS</h2>
                    <p className="text-xs text-muted-foreground font-mono">Premium Sicherheitspaket</p>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="px-6 py-4 space-y-3">
                {[
                  "Unbegrenzte URL & Datei-Scans",
                  "Goldener Name-Tag",
                  "Intelligenterer KI-Berater",
                  "Exklusiver Loading Screen",
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
                    <span className="text-foreground font-mono text-xs">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Status / Activation */}
              <div className="px-6 pb-6 pt-2">
                {isPlus ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                    <Check className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                    <p className="text-sm font-mono text-yellow-300 font-bold">SENTINEL PLUS AKTIV</p>
                    {daysLeft > 0 && (
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        Noch {daysLeft} Tage verbleibend
                      </p>
                    )}
                  </div>
                ) : !user ? (
                  <div className="bg-secondary rounded-lg p-4 text-center">
                    <p className="text-xs font-mono text-muted-foreground">
                      Melde dich an, um Sentinel Plus zu aktivieren.
                    </p>
                  </div>
                ) : success ? (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                    <Check className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-sm font-mono text-primary font-bold">AKTIVIERT!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                      placeholder="Aktivierungscode eingeben..."
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-yellow-500/50"
                    />
                    {error && (
                      <p className="text-destructive text-xs font-mono">{error}</p>
                    )}
                    <button
                      onClick={handleActivate}
                      disabled={loading || !code.trim()}
                      className="w-full py-2.5 bg-gradient-to-r from-yellow-600 to-amber-500 text-yellow-100 rounded-lg font-mono text-sm font-bold hover:from-yellow-500 hover:to-amber-400 disabled:opacity-50 transition-all"
                    >
                      {loading ? "PRÜFE..." : "AKTIVIEREN"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SentinelPlusBadge;
