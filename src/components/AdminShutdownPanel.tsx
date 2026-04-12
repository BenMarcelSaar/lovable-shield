import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Power, PowerOff, Loader2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminShutdownPanel = () => {
  const { toast } = useToast();
  const [active, setActive] = useState(false);
  const [shutdownUntil, setShutdownUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Timer inputs
  const [days, setDays] = useState("0");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");

  const fetchStatus = async () => {
    const { data } = await supabase
      .from("site_shutdown")
      .select("*")
      .limit(1)
      .single();
    if (data) {
      setActive((data as any).active);
      setShutdownUntil((data as any).shutdown_until);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const activateShutdown = async (withTimer: boolean) => {
    setSaving(true);
    let until: string | null = null;

    if (withTimer) {
      const totalMs =
        (parseInt(days) || 0) * 86400000 +
        (parseInt(hours) || 0) * 3600000 +
        (parseInt(minutes) || 0) * 60000;
      if (totalMs <= 0) {
        toast({ title: "Fehler", description: "Bitte gib eine gültige Zeit ein.", variant: "destructive" });
        setSaving(false);
        return;
      }
      until = new Date(Date.now() + totalMs).toISOString();
    }

    const { error } = await supabase
      .from("site_shutdown")
      .update({ active: true, shutdown_until: until, updated_at: new Date().toISOString() } as any)
      .not("id", "is", null);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setActive(true);
      setShutdownUntil(until);
      toast({
        title: "Shutdown aktiviert",
        description: until
          ? `Seite bis ${new Date(until).toLocaleString("de-DE")} deaktiviert.`
          : "Seite bis auf Weiteres deaktiviert.",
      });
    }
    setSaving(false);
  };

  const deactivateShutdown = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_shutdown")
      .update({ active: false, shutdown_until: null, updated_at: new Date().toISOString() } as any)
      .not("id", "is", null);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setActive(false);
      setShutdownUntil(null);
      toast({ title: "Shutdown deaktiviert", description: "Seite ist wieder online." });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card className="border-destructive/30 bg-card">
        <CardContent className="py-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-mono">Lade...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Power className="h-5 w-5 text-destructive" />
          Seiten-Shutdown
        </CardTitle>
        <CardDescription>Deaktiviere die Seite für alle Nutzer (außer Admins)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {active ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <PowerOff className="w-5 h-5" />
              <span className="text-sm font-mono font-bold">SHUTDOWN AKTIV</span>
            </div>
            {shutdownUntil && (
              <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Bis: {new Date(shutdownUntil).toLocaleString("de-DE")}
              </p>
            )}
            {!shutdownUntil && (
              <p className="text-xs text-muted-foreground font-mono">Bis du es wieder aktivierst.</p>
            )}
            <Button variant="default" size="sm" onClick={deactivateShutdown} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              Wieder aktivieren
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Timer inputs */}
            <div className="p-4 bg-secondary/50 rounded-lg border border-border space-y-3">
              <Label className="text-xs font-mono tracking-wider text-muted-foreground">MIT TIMER DEAKTIVIEREN</Label>
              <div className="flex gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Tage</Label>
                  <Input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="bg-input border-border w-16 text-center font-mono"
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Stunden</Label>
                  <Input
                    type="number"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="bg-input border-border w-16 text-center font-mono"
                    min={0}
                    max={23}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Minuten</Label>
                  <Input
                    type="number"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="bg-input border-border w-16 text-center font-mono"
                    min={0}
                    max={59}
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => activateShutdown(true)}
                  disabled={saving}
                  className="gap-1"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                  Mit Timer
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] text-muted-foreground font-mono">ODER</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="destructive"
              onClick={() => activateShutdown(false)}
              disabled={saving}
              className="gap-2 w-full"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4" />}
              Bis auf Weiteres deaktivieren
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminShutdownPanel;
