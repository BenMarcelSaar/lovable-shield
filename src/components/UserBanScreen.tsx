import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

interface UserBanScreenProps {
  unblockTime: number;
}

const UserBanScreen = ({ unblockTime }: UserBanScreenProps) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const left = Math.max(0, Math.ceil((unblockTime - Date.now()) / 1000));
      setRemaining(left);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [unblockTime]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/98 backdrop-blur-md"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-destructive/20 blur-[100px]"
        />
      </div>

      <div className="fixed inset-0 scanline pointer-events-none" />

      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="relative text-center max-w-md mx-4 bg-card border-2 border-destructive/60 rounded-xl p-8"
      >
        <motion.div
          animate={{ rotate: [0, -5, 5, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        >
          <div className="w-20 h-20 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center mx-auto">
            <ShieldAlert className="w-10 h-10 text-destructive" />
          </div>
        </motion.div>

        <h2 className="text-2xl font-bold font-mono text-destructive mt-6">
          ZUGANG GESPERRT
        </h2>
        <p className="text-xs font-mono text-muted-foreground tracking-widest mt-1">
          VERSTOSS GEGEN VERHALTENSREGELN
        </p>

        <div className="mt-6 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <p className="text-muted-foreground text-sm font-mono mb-2">
            Du wurdest wegen unangemessener Nachrichten vorübergehend gesperrt.
          </p>
          <div className="text-4xl font-mono font-bold text-destructive">
            {mins}:{secs.toString().padStart(2, "0")}
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-1 tracking-widest">
            VERBLEIBENDE SPERRZEIT
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserBanScreen;
