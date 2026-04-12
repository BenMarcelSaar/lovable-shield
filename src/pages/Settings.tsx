import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSentinelPlus } from "@/hooks/useSentinelPlus";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, User, Mail, Shield, Smartphone, Loader2, Check, X, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AccountMenu from "@/components/AccountMenu";
import AdminCodesPanel from "@/components/AdminCodesPanel";
import AdminShutdownPanel from "@/components/AdminShutdownPanel";

const Settings = () => {
  const { user } = useAuth();
  const { isPlus, isAdmin } = useSentinelPlus();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username);
      });

    // Check MFA status
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp || [];
      const verified = totp.find((f: any) => f.status === "verified");
      setMfaEnabled(!!verified);
      setMfaLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Fehler", description: "Profil konnte nicht gespeichert werden.", variant: "destructive" });
    } else {
      toast({ title: "Gespeichert", description: "Dein Profil wurde aktualisiert." });
    }
    setLoading(false);
  };

  const startMfaEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Sentinel TOTP" });
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      setEnrolling(false);
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
  };

  const verifyMfa = async () => {
    if (verifyCode.length !== 6) return;
    setVerifyLoading(true);
    
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      toast({ title: "Fehler", description: challengeError.message, variant: "destructive" });
      setVerifyLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: verifyCode,
    });

    if (verifyError) {
      toast({ title: "Fehler", description: "Ungültiger Code. Versuche es erneut.", variant: "destructive" });
    } else {
      toast({ title: "Erfolgreich", description: "Zwei-Faktor-Authentifizierung aktiviert!" });
      setMfaEnabled(true);
      setEnrolling(false);
      setQrCode("");
      setSecret("");
      setVerifyCode("");
    }
    setVerifyLoading(false);
  };

  const disableMfa = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp || [];
    const verified = totp.find((f: any) => f.status === "verified");
    if (verified) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
      if (error) {
        toast({ title: "Fehler", description: error.message, variant: "destructive" });
      } else {
        setMfaEnabled(false);
        toast({ title: "Deaktiviert", description: "2FA wurde deaktiviert." });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AccountMenu />

      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>

        <h1 className="text-3xl font-bold mb-8 font-mono flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Einstellungen
        </h1>

        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Profil
              </CardTitle>
              <CardDescription>Verwalte deine Profilinformationen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Dein Benutzername"
                  className="bg-input border-border"
                />
              </div>
              <Button onClick={handleSave} disabled={loading} className="gap-2">
                <Save className="h-4 w-4" />
                {loading ? "Speichern…" : "Speichern"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Konto
              </CardTitle>
              <CardDescription>Deine Kontoinformationen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>E-Mail</Label>
                <p className="text-sm text-muted-foreground bg-input border border-border rounded-md px-3 py-2">
                  {user?.email}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Admin Panels */}
          {isAdmin && <AdminShutdownPanel />}
          {isAdmin && <AdminCodesPanel />}

          {/* 2FA Card */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Zwei-Faktor-Authentifizierung
              </CardTitle>
              <CardDescription>
                Schütze dein Konto mit einer Authenticator-App
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mfaLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-mono">Lade...</span>
                </div>
              ) : mfaEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-mono font-bold">2FA AKTIVIERT</span>
                  </div>
                  <Button variant="destructive" size="sm" onClick={disableMfa}>
                    <X className="w-4 h-4 mr-2" />
                    2FA Deaktivieren
                  </Button>
                </div>
              ) : enrolling ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Scanne den QR-Code mit deiner Authenticator-App (z.B. Google Authenticator):
                  </p>
                  {qrCode && (
                    <div className="flex justify-center bg-foreground rounded-lg p-4 w-fit mx-auto">
                      <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                  )}
                  {secret && (
                    <div className="space-y-1">
                      <Label className="text-xs">Oder gib diesen Code manuell ein:</Label>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-secondary border border-border rounded px-2 py-1 font-mono text-foreground break-all">
                          {secret}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(secret);
                            toast({ title: "Kopiert!" });
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Bestätigungscode eingeben:</Label>
                    <div className="flex gap-2">
                      <Input
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        className="bg-input border-border font-mono tracking-widest max-w-[200px]"
                        maxLength={6}
                      />
                      <Button onClick={verifyMfa} disabled={verifyLoading || verifyCode.length !== 6}>
                        {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Bestätigen"}
                      </Button>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setEnrolling(false); setQrCode(""); setSecret(""); }}>
                    Abbrechen
                  </Button>
                </div>
              ) : (
                <Button onClick={startMfaEnroll} className="gap-2">
                  <Smartphone className="w-4 h-4" />
                  2FA Aktivieren
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
