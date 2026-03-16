import { motion } from "framer-motion";
import { Crown, Shield } from "lucide-react";

const PlusLoadingScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[200] bg-background flex items-center justify-center"
    >
      {/* Gold grid background */}
      <div className="fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(hsl(45 100% 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(45 100% 50%) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Gold radial glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsla(45, 100%, 50%, 0.15), transparent 70%)" }}
      />

      <div className="text-center relative z-10">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-20 h-20 mx-auto mb-6 relative"
        >
          <div className="absolute inset-0 rounded-full border-2 border-yellow-500/30" />
          <div className="absolute inset-0 rounded-full border-t-2 border-yellow-400"
            style={{ animation: "spin 1.5s linear infinite" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Crown className="w-8 h-8 text-yellow-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-yellow-400" />
            <h1 className="text-3xl font-bold font-mono text-yellow-400" style={{
              textShadow: "0 0 20px hsla(45, 100%, 50%, 0.5)"
            }}>
              SENTINEL PLUS
            </h1>
          </div>
          <p className="text-xs font-mono text-yellow-400/60 tracking-[0.4em]">
            PREMIUM SECURITY LOADING
          </p>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="mt-8 h-1 w-48 mx-auto rounded-full overflow-hidden bg-yellow-500/20"
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-1/2 bg-gradient-to-r from-transparent via-yellow-400 to-transparent"
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PlusLoadingScreen;
