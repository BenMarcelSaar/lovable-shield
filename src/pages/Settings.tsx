import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, User, Mail, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AccountMenu from "@/components/AccountMenu";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

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
        </div>
      </div>
    </div>
  );
};

export default Settings;
