import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Shield, ArrowLeft, Globe, FileText, ToggleRight,
  CheckCircle, ShieldAlert, Play, BookOpen, Zap
} from "lucide-react";

const steps = [
  {
    icon: Globe,
    title: "URL eingeben",
    description: "Gib eine beliebige URL in das Eingabefeld ein – z.B. youtube.com, google.com oder jede andere Webseite.",
    tip: "Du musst kein https:// eingeben – Sentinel fügt es automatisch hinzu.",
  },
  {
    icon: Shield,
    title: "Safe Browsing aktivieren",
    description: "Stelle sicher, dass der Safe-Browsing-Schalter auf AN steht. So wird jede URL vor dem Öffnen geprüft.",
    tip: "Wenn du den Schalter auf AUS stellst, werden URLs ohne Prüfung geöffnet.",
  },
  {
    icon: Zap,
    title: "Scan starten",
    description: 'Klicke auf "SICHER ÖFFNEN" oder drücke Enter. Du wirst zur Prüfseite weitergeleitet, wo Sentinel die URL analysiert.',
    tip: "Der Scan dauert nur wenige Sekunden.",
  },
  {
    icon: CheckCircle,
    title: "Sichere Seite → Weiterleitung",
    description: "Wenn die URL sicher ist, wirst du automatisch zur Webseite weitergeleitet. Kein manuelles Klicken nötig!",
    tip: "Ein grünes Shield-Symbol bestätigt die Sicherheit.",
  },
  {
    icon: ShieldAlert,
    title: "Gefährliche Seite → Blockiert",
    description: "Wenn Bedrohungen erkannt werden, blockiert Sentinel den Zugriff und leitet dich sicher zu Google weiter.",
    tip: "Du siehst die Anzahl der erkannten Bedrohungen bevor die Umleitung erfolgt.",
  },
  {
    icon: FileText,
    title: "Dateien scannen",
    description: "Wechsle zum Datei-Tab und ziehe eine Datei in den Upload-Bereich oder klicke zum Auswählen. Der SHA-256 Hash wird lokal berechnet.",
    tip: "Deine Dateien werden NICHT hochgeladen – nur der Hash wird geprüft.",
  },
];

const videos = [
  {
    title: "Was ist Safe Browsing?",
    description: "Erfahre, wie Sentinel dich vor gefährlichen Webseiten schützt.",
    embedUrl: "https://www.youtube.com/embed/nN3fyhJVeHA",
  },
  {
    title: "Wie funktioniert VirusTotal?",
    description: "Verstehe die Technologie hinter der URL- und Dateiprüfung.",
    embedUrl: "https://www.youtube.com/embed/PtftNWJ2MBY",
  },
  {
    title: "Online-Sicherheit Grundlagen",
    description: "Tipps und Tricks für sicheres Surfen im Internet.",
    embedUrl: "https://www.youtube.com/embed/inWWhr5tnEA",
  },
];

const Tutorial = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Scanline */}
      <div className="fixed inset-0 scanline pointer-events-none z-10" />

      {/* Grid */}
      <div className="fixed inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(hsl(150 100% 45%) 1px, transparent 1px), linear-gradient(90deg, hsl(150 100% 45%) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-20 max-w-4xl mx-auto px-4 py-10">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 font-mono text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          ZURÜCK ZUM SCANNER
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold font-mono text-foreground tracking-tight">
              HANDBUCH
            </h1>
          </div>
          <p className="text-muted-foreground font-mono text-sm max-w-lg mx-auto">
            Lerne wie du Sentinel nutzt, um sicher im Internet zu surfen
          </p>
        </motion.div>

        {/* Steps */}
        <div className="mb-16">
          <h2 className="text-xl font-bold font-mono text-foreground mb-6 flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            SCHRITT FÜR SCHRITT
          </h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-5 flex gap-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      SCHRITT {i + 1}
                    </span>
                    <h3 className="font-bold font-mono text-foreground text-sm">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-2">{step.description}</p>
                  <p className="text-[11px] font-mono text-primary/80 flex items-center gap-1">
                    💡 {step.tip}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Videos */}
        <div className="mb-16">
          <h2 className="text-xl font-bold font-mono text-foreground mb-6 flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            VIDEO-TUTORIALS
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.15 }}
                className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors"
              >
                <div className="aspect-video">
                  <iframe
                    src={video.embedUrl}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold font-mono text-foreground text-sm mb-1">{video.title}</h3>
                  <p className="text-muted-foreground text-xs">{video.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center border-t border-border pt-8"
        >
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest">
            SENTINEL SAFE BROWSING — DEIN SCHUTZSCHILD IM INTERNET
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Tutorial;
