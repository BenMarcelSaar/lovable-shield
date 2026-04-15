import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Send, Shield, Loader2, CheckCircle, XCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const VERIFIED_KEY = "sentinel_age_verified";
const DEVICE_ID_KEY = "sentinel_device_id";

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

type Method = "choose" | "photo" | "request";
type RequestStatus = "idle" | "sending" | "sent" | "approved" | "denied";

const AgeVerification = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [method, setMethod] = useState<Method>("choose");

  // Photo method
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoResult, setPhotoResult] = useState<{ allowed: boolean; age: number; confidence: string } | null>(null);
  const [photoError, setPhotoError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Request method
  const [reqName, setReqName] = useState("");
  const [reqAge, setReqAge] = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const [reqStatus, setReqStatus] = useState<RequestStatus>("idle");
  const [requestId, setRequestId] = useState<string | null>(null);

  // Check if already verified
  useEffect(() => {
    if (localStorage.getItem(VERIFIED_KEY) === "true") {
      navigate("/auth", { replace: true });
    }
  }, [navigate]);

  // Poll for request status
  useEffect(() => {
    if (reqStatus !== "sent" || !requestId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("age_verification_requests")
        .select("status")
        .eq("id", requestId)
        .single();
      if (data) {
        const d = data as any;
        if (d.status === "approved") {
          setReqStatus("approved");
          localStorage.setItem(VERIFIED_KEY, "true");
          setTimeout(() => navigate("/auth", { replace: true }), 1500);
        } else if (d.status === "denied") {
          setReqStatus("denied");
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [reqStatus, requestId, navigate]);

  // Auto-start camera when photo method is selected
  useEffect(() => {
    if (method === "photo" && !cameraActive && !capturedImage) {
      startCamera();
    }
    return () => {
      if (method !== "photo") stopCamera();
    };
  }, [method]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setPhotoError("");
    } catch {
      setPhotoError("Kamera-Zugriff wurde verweigert.");
    }
  }, [cameraActive, capturedImage]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;
    if (!vw || !vh) {
      setPhotoError("Kamera noch nicht bereit. Bitte warte einen Moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Mirror the capture to match the mirrored preview
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0);
    }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    if (!dataUrl || dataUrl === "data:,") {
      setPhotoError("Foto konnte nicht aufgenommen werden. Versuche es erneut.");
      return;
    }
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const analyzePhoto = useCallback(async () => {
    if (!capturedImage) return;
    setAnalyzing(true);
    setPhotoError("");
    setPhotoResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("verify-age", {
        body: { image: capturedImage },
      });

      if (error || data?.error) {
        setPhotoError(data?.error || "Analyse fehlgeschlagen. Versuche es erneut.");
        return;
      }

      if (data.allowed) {
        setPhotoResult({ allowed: true, age: data.estimated_age, confidence: data.confidence });
        localStorage.setItem(VERIFIED_KEY, "true");
        setTimeout(() => navigate("/auth", { replace: true }), 2000);
      } else {
        setPhotoResult({ allowed: false, age: data.estimated_age, confidence: data.confidence });
      }
    } catch {
      setPhotoError("Analyse fehlgeschlagen.");
    } finally {
      setAnalyzing(false);
    }
  }, [capturedImage, navigate]);

  const sendRequest = useCallback(async () => {
    if (!reqName.trim() || !reqAge.trim()) {
      toast({ title: "Bitte fülle alle Felder aus", variant: "destructive" });
      return;
    }
    const ageNum = parseInt(reqAge);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      toast({ title: "Ungültiges Alter", variant: "destructive" });
      return;
    }

    setReqStatus("sending");
    const deviceId = getDeviceId();

    const { data, error } = await supabase
      .from("age_verification_requests")
      .insert({
        device_id: deviceId,
        name: reqName.trim().slice(0, 100),
        age: ageNum,
        message: reqMessage.trim().slice(0, 500) || null,
      } as any)
      .select("id")
      .single();

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      setReqStatus("idle");
      return;
    }

    setRequestId((data as any).id);
    setReqStatus("sent");
  }, [reqName, reqAge, reqMessage, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Grid bg */}
      <div className="fixed inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(hsl(150 100% 45%) 1px, transparent 1px), linear-gradient(90deg, hsl(150 100% 45%) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full mx-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-foreground">ALTERSVERIFIKATION</h1>
            <p className="text-muted-foreground text-xs font-mono mt-2">Du musst mindestens 11 Jahre alt sein um Sentinel zu nutzen.</p>
          </div>

          <AnimatePresence mode="wait">
            {/* Choose method */}
            {method === "choose" && (
              <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <Button onClick={() => setMethod("photo")} className="w-full h-14 gap-3 font-mono" variant="outline">
                  <Camera className="w-5 h-5" />
                  Foto-Verifikation (KI)
                </Button>
                <Button onClick={() => setMethod("request")} className="w-full h-14 gap-3 font-mono" variant="outline">
                  <Send className="w-5 h-5" />
                  Zugang beim Owner anfragen
                </Button>
                <p className="text-[10px] text-muted-foreground font-mono text-center mt-4">
                  Wähle eine Methode zur Altersverifikation
                </p>
              </motion.div>
            )}

            {/* Photo method */}
            {method === "photo" && (
              <motion.div key="photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => { stopCamera(); setCapturedImage(null); setPhotoResult(null); setPhotoError(""); setMethod("choose"); }} className="text-xs font-mono text-muted-foreground">
                  ← Zurück
                </Button>

                {/* Camera / Captured */}
                <div className="aspect-[4/3] bg-secondary rounded-lg overflow-hidden relative">
                  {cameraActive && (
                    <video ref={videoRef} autoPlay playsInline muted onPlaying={() => setCameraReady(true)} className="w-full h-full object-cover scale-x-[-1]" />
                  )}
                  {capturedImage && !cameraActive && (
                    <img src={capturedImage} alt="Selfie" className="w-full h-full object-cover" />
                  )}
                  {!cameraActive && !capturedImage && (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {photoError && (
                  <p className="text-destructive text-xs font-mono text-center">{photoError}</p>
                )}

                {photoResult && (
                  <div className={`p-3 rounded-lg border text-center font-mono text-sm ${photoResult.allowed ? "bg-primary/10 border-primary/30 text-primary" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
                    {photoResult.allowed ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Verifiziert! Geschätztes Alter: ~{photoResult.age}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Zugang verweigert. Geschätztes Alter: ~{photoResult.age}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {!cameraActive && !capturedImage && (
                    <Button onClick={startCamera} className="flex-1 font-mono gap-2">
                      <Camera className="w-4 h-4" /> Kamera starten
                    </Button>
                  )}
                  {cameraActive && (
                    <Button onClick={capturePhoto} className="flex-1 font-mono gap-2">
                      <Camera className="w-4 h-4" /> Foto aufnehmen
                    </Button>
                  )}
                  {capturedImage && !analyzing && !photoResult?.allowed && (
                    <>
                      <Button onClick={() => { setCapturedImage(null); setPhotoResult(null); setPhotoError(""); startCamera(); }} variant="outline" className="flex-1 font-mono">
                        Nochmal
                      </Button>
                      <Button onClick={analyzePhoto} className="flex-1 font-mono gap-2">
                        Prüfen
                      </Button>
                    </>
                  )}
                  {analyzing && (
                    <Button disabled className="flex-1 font-mono gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Wird geprüft...
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Request method */}
            {method === "request" && (
              <motion.div key="request" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => { setReqStatus("idle"); setMethod("choose"); }} className="text-xs font-mono text-muted-foreground">
                  ← Zurück
                </Button>

                {reqStatus === "idle" || reqStatus === "sending" ? (
                  <>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-mono text-muted-foreground mb-1 block">Dein Name</label>
                        <Input value={reqName} onChange={e => setReqName(e.target.value)} placeholder="Name eingeben" maxLength={100} className="font-mono" />
                      </div>
                      <div>
                        <label className="text-xs font-mono text-muted-foreground mb-1 block">Dein Alter</label>
                        <Input value={reqAge} onChange={e => setReqAge(e.target.value.replace(/\D/g, ""))} placeholder="Alter eingeben" maxLength={3} className="font-mono" />
                      </div>
                      <div>
                        <label className="text-xs font-mono text-muted-foreground mb-1 block">Nachricht (optional)</label>
                        <Textarea value={reqMessage} onChange={e => setReqMessage(e.target.value)} placeholder="Warum möchtest du Sentinel nutzen?" maxLength={500} className="font-mono text-sm" rows={3} />
                      </div>
                    </div>
                    <Button onClick={sendRequest} disabled={reqStatus === "sending"} className="w-full font-mono gap-2">
                      {reqStatus === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Anfrage senden
                    </Button>
                  </>
                ) : reqStatus === "sent" ? (
                  <div className="text-center py-6 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="font-mono text-sm text-foreground">Anfrage gesendet!</p>
                    <p className="font-mono text-xs text-muted-foreground">Warte auf Freigabe vom Owner...</p>
                  </div>
                ) : reqStatus === "approved" ? (
                  <div className="text-center py-6 space-y-3">
                    <CheckCircle className="w-10 h-10 text-primary mx-auto" />
                    <p className="font-mono text-sm text-primary">Zugang genehmigt!</p>
                    <p className="font-mono text-xs text-muted-foreground">Du wirst weitergeleitet...</p>
                  </div>
                ) : reqStatus === "denied" ? (
                  <div className="text-center py-6 space-y-3">
                    <XCircle className="w-10 h-10 text-destructive mx-auto" />
                    <p className="font-mono text-sm text-destructive">Anfrage abgelehnt.</p>
                    <p className="font-mono text-xs text-muted-foreground">Du kannst es mit der Foto-Verifikation versuchen.</p>
                    <Button onClick={() => { setReqStatus("idle"); setMethod("photo"); }} variant="outline" className="font-mono gap-2 mt-2">
                      <Camera className="w-4 h-4" /> Foto-Verifikation
                    </Button>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default AgeVerification;
