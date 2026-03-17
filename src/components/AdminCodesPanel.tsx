import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Plus, Copy, Trash2, Loader2, Check, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlusCode {
  id: string;
  code: string;
  days: number;
  created_at: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
}

const AdminCodesPanel = () => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<PlusCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newDays, setNewDays] = useState("7");
  const [creating, setCreating] = useState(false);

  const fetchCodes = async () => {
    const { data } = await supabase
      .from("plus_codes")
      .select("*")
      .order("created_at", { ascending: false });
    setCodes((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const createCode = async () => {
    if (!newCode.trim()) return;
    setCreating(true);
    const { error } = await supabase
      .from("plus_codes")
      .insert({ code: newCode.trim().toUpperCase(), days: parseInt(newDays) || 7 } as any);

    if (error) {
      toast({ title: "Fehler", description: error.message.includes("duplicate") ? "Code existiert bereits." : error.message, variant: "destructive" });
    } else {
      toast({ title: "Erstellt", description: `Code "${newCode.trim().toUpperCase()}" erstellt.` });
      setNewCode("");
      setNewDays("7");
      fetchCodes();
    }
    setCreating(false);
  };

  const deleteCode = async (id: string) => {
    const { error } = await supabase.from("plus_codes").delete().eq("id", id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setCodes(codes.filter((c) => c.id !== id));
      toast({ title: "Gelöscht" });
    }
  };

  return (
    <Card className="border-yellow-500/30 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-400" />
          Sentinel Plus Codes
        </CardTitle>
        <CardDescription>Erstelle und verwalte Aktivierungscodes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create new code */}
        <div className="space-y-3 p-4 bg-secondary/50 rounded-lg border border-border">
          <Label className="text-xs font-mono tracking-wider text-muted-foreground">NEUEN CODE ERSTELLEN</Label>
          <div className="flex gap-2">
            <Input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Code eingeben..."
              className="bg-input border-border font-mono uppercase"
            />
            <div className="flex items-center gap-1 shrink-0">
              <Input
                type="number"
                value={newDays}
                onChange={(e) => setNewDays(e.target.value)}
                className="bg-input border-border w-16 text-center font-mono"
                min={1}
                max={365}
              />
              <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">Tage</span>
            </div>
          </div>
          <Button
            onClick={createCode}
            disabled={creating || !newCode.trim()}
            size="sm"
            className="gap-2"
          >
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Erstellen
          </Button>
        </div>

        {/* Code list */}
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-mono">Lade Codes...</span>
          </div>
        ) : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground font-mono text-center py-4">Keine Codes vorhanden.</p>
        ) : (
          <div className="space-y-2">
            {codes.map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  c.redeemed_by
                    ? "border-muted bg-muted/30"
                    : "border-yellow-500/20 bg-yellow-500/5"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${c.redeemed_by ? "bg-muted-foreground" : "bg-yellow-400"}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-bold text-foreground">{c.code}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(c.code);
                          toast({ title: "Kopiert!" });
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {c.days} Tage
                      </span>
                      {c.redeemed_by ? (
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Eingelöst {c.redeemed_at ? new Date(c.redeemed_at).toLocaleDateString("de-DE") : ""}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-yellow-400">Verfügbar</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCode(c.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8 p-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminCodesPanel;
