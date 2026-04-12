import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, Loader2, UserX, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Check if MFA is required
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = factorsData?.totp?.filter((f: any) => f.status === "verified") || [];

        if (verifiedFactors.length > 0) {
          // MFA is enrolled - need verification
          setMfaFactorId(verifiedFactors[0].id);
          setMfaRequired(true);
          setLoading(false);
          return;
        }

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

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error instanceof Error ? result.error.message : "Google-Anmeldung fehlgeschlagen.");
      }
      if (result.redirected) return;
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Google-Anmeldung fehlgeschlagen.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    setError("");
    setMfaLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });
      if (verifyError) throw verifyError;

      navigate("/");
    } catch (err: any) {
      setError(err.message || "Ungültiger Code.");
    } finally {
      setMfaLoading(false);
    }
  };

  if (mfaRequired) {
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
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-foreground">2FA VERIFIZIERUNG</h1>
            <p className="text-xs font-mono text-muted-foreground mt-1 tracking-widest">
              Gib den Code aus deiner Authenticator-App ein
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-3 text-center text-lg text-foreground font-mono tracking-[0.5em] placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && mfaCode.length === 6 && handleMfaVerify()}
            />

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-xs font-mono">
                {error}
              </div>
            )}

            <button
              onClick={handleMfaVerify}
              disabled={mfaLoading || mfaCode.length !== 6}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-mono font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mfaLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              VERIFIZIEREN
            </button>

            <button
              onClick={() => {
                setMfaRequired(false);
                setMfaCode("");
                setError("");
                supabase.auth.signOut();
              }}
              className="w-full text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Zurück zur Anmeldung
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

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

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground font-mono">ODER</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-3 bg-secondary text-foreground border border-border rounded-lg font-mono text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            MIT GOOGLE ANMELDEN
          </button>
        </div>

        <div className="mt-4 text-center space-y-3">
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
