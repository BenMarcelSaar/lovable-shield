import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminShutdownPanel from "./AdminShutdownPanel";
import AdminCodesPanel from "./AdminCodesPanel";
import AdminVerificationPanel from "./AdminVerificationPanel";
import AdminChatBansPanel from "./AdminChatBansPanel";
import AdminAiAndWordsPanel from "./AdminAiAndWordsPanel";

const AdminSettingsSection = () => {
  const { toast } = useToast();
  const [guestEnabled, setGuestEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("site_shutdown")
      .select("guest_login_enabled")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setGuestEnabled((data as any).guest_login_enabled ?? true);
        setLoading(false);
      });
  }, []);

  const toggleGuest = async (checked: boolean) => {
    setSaving(true);
    const { error } = await supabase
      .from("site_shutdown")
      .update({ guest_login_enabled: checked } as any)
      .eq("id", (await supabase.from("site_shutdown").select("id").limit(1).single()).data?.id || "");

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setGuestEnabled(checked);
      toast({ title: checked ? "Gast-Login aktiviert" : "Gast-Login deaktiviert" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-center">
          <Shield className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-mono text-foreground">Admin-Bereich</h2>
          <p className="text-xs text-muted-foreground font-mono">Nur für Administratoren sichtbar</p>
        </div>
      </div>

      {/* Guest Login Toggle */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Gast-Zugang
          </CardTitle>
          <CardDescription>Erlaube Nutzern sich ohne Konto als Gast anzumelden</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-mono">Lade...</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Label htmlFor="guest-toggle" className="font-mono text-sm">
                {guestEnabled ? "Gast-Login ist aktiviert" : "Gast-Login ist deaktiviert"}
              </Label>
              <Switch
                id="guest-toggle"
                checked={guestEnabled}
                onCheckedChange={toggleGuest}
                disabled={saving}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <AdminShutdownPanel />
      <AdminCodesPanel />
      <AdminVerificationPanel />
      <AdminChatBansPanel />
      <AdminAiAndWordsPanel />
    </div>
  );
};

export default AdminSettingsSection;
