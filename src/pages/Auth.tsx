import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, Loader2, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        if (username.trim().length < 2) {
          throw new Error("Benutzername muss mindestens 2 Zeichen lang sein.");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setSuccess("Bestätigungs-E-Mail gesendet! Bitte überprüfe dein Postfach.");
      }
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 scanline pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl p-8 relative"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-mono text-foreground">
            {isLogin ? "ANMELDEN" : "KONTO ERSTELLEN"}
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-1 tracking-widest">
            SENTINEL SECURITY SYSTEM
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-xs font-mono text-muted-foreground tracking-wider block mb-1.5">
                BENUTZERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                placeholder="Dein Benutzername"
                required
                minLength={2}
                maxLength={30}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-mono text-muted-foreground tracking-wider block mb-1.5">
              E-MAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              placeholder="deine@email.de"
              required
            />
          </div>

          <div>
            <label className="text-xs font-mono text-muted-foreground tracking-wider block mb-1.5">
              PASSWORT
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 pr-10"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-xs font-mono">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-primary text-xs font-mono">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-mono font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLogin ? "EINLOGGEN" : "REGISTRIEREN"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }}
            className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "Noch kein Konto? Jetzt registrieren" : "Schon ein Konto? Anmelden"}
          </button>

          <div className="border-t border-border pt-3">
            <button
              onClick={() => {
                localStorage.setItem("sentinel_guest", "true");
                navigate("/");
              }}
              className="w-full py-2.5 bg-secondary text-secondary-foreground rounded-lg font-mono text-xs hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
            >
              <UserX className="w-3.5 h-3.5" />
              ALS GAST FORTFAHREN
            </button>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
              Eingeschränkt: Kein Zugriff auf Sentinel AI Chat
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
