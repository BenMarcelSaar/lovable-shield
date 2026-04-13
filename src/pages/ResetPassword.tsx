import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, Loader2, Lock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState<boolean | null>(null);
  const [mfaVerified, setMfaVerified] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        // Check if user has MFA
        const { data } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = data?.totp?.filter((f: any) => f.status === "verified") || [];
        if (verifiedFactors.length > 0) {
          setMfaRequired(true);
          setMfaFactorId(verifiedFactors[0].id);
        } else {
          setMfaRequired(false);
          setMfaVerified(true);
        }
        setCheckingSession(false);
      }
    });

    // Also check current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = data?.totp?.filter((f: any) => f.status === "verified") || [];
        if (verifiedFactors.length > 0) {
          setMfaRequired(true);
          setMfaFactorId(verifiedFactors[0].id);
        } else {
          setMfaRequired(false);
          setMfaVerified(true);
        }
        setCheckingSession(false);
      } else {
        // Wait a bit for the PASSWORD_RECOVERY event
        setTimeout(() => setCheckingSession(false), 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleMfaVerify = async () => {
    setMfaError("");
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

      setMfaVerified(true);
    } catch (err: any) {
      setMfaError(err.message || "Ungültiger Code.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate("/"), 3000);
    } catch (err: any) {
      setError(err.message || "Fehler beim Zurücksetzen.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (mfaRequired === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center"
        >
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold font-mono text-foreground mb-2">UNGÜLTIGER LINK</h1>
          <p className="text-sm text-muted-foreground font-mono mb-6">
            Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="text-sm font-mono text-primary hover:underline"
          >
            Zurück zur Anmeldung
          </button>
        </motion.div>
      </div>
    );
  }

  // MFA verification screen
  if (mfaRequired && !mfaVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 scanline pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl p-8"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-foreground">2FA VERIFIZIERUNG</h1>
            <p className="text-xs font-mono text-muted-foreground mt-1 tracking-widest">
              Bestätige deine Identität bevor du dein Passwort änderst
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

            {mfaError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-xs font-mono">
                {mfaError}
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
              onClick={() => navigate("/auth")}
              className="w-full text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Zurück zur Anmeldung
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center"
        >
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-mono text-foreground mb-2">PASSWORT GEÄNDERT</h1>
          <p className="text-sm text-muted-foreground font-mono">
            Du wirst gleich weitergeleitet...
          </p>
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
        className="w-full max-w-md bg-card border border-border rounded-2xl p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-mono text-foreground">NEUES PASSWORT</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1 tracking-widest">
            Gib dein neues Passwort ein
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-muted-foreground tracking-wider block mb-1.5">
              NEUES PASSWORT
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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

          <div>
            <label className="text-xs font-mono text-muted-foreground tracking-wider block mb-1.5">
              PASSWORT BESTÄTIGEN
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-xs font-mono">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-mono font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            PASSWORT ÄNDERN
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
