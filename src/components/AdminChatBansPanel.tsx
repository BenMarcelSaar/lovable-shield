import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ban, Loader2, RefreshCw, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatBan {
  id: string;
  user_id: string;
  banned_until: string;
  reason: string | null;
  banned_by: string | null;
  created_at: string;
  username?: string;
}

const AdminChatBansPanel = () => {
  const { toast } = useToast();
  const [bans, setBans] = useState<ChatBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const fetchBans = useCallback(async () => {
    setLoading(true);
    const nowIso = new Date().toISOString();
    const { data: banRows } = await supabase
      .from("chat_bans" as any)
      .select("*")
      .gt("banned_until", nowIso)
      .order("banned_until", { ascending: true });

    const list = (banRows as any as ChatBan[]) ?? [];
    if (list.length > 0) {
      const ids = Array.from(new Set(list.map((b) => b.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.username]));
      list.forEach((b) => (b.username = map.get(b.user_id) || b.user_id.slice(0, 8)));
    }
    setBans(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBans();
  }, [fetchBans]);

  const unban = async (id: string, name: string) => {
    const { error } = await supabase.from("chat_bans" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ Aufgehoben", description: `${name} wurde entsperrt.` });
      setBans((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const formatRemaining = (until: string) => {
    const ms = Math.max(0, new Date(until).getTime() - now);
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Aktive Chat-Sperren
            </CardTitle>
            <CardDescription>Übersicht aller aktiven Bans im Community-Chat</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchBans} disabled={loading} className="font-mono gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-mono">Lade Sperren...</span>
          </div>
        ) : bans.length === 0 ? (
          <p className="text-sm text-muted-foreground font-mono py-4 text-center">
            Keine aktiven Sperren ✓
          </p>
        ) : (
          <div className="space-y-2">
            {bans.map((ban) => (
              <div
                key={ban.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-foreground">{ban.username}</span>
                    <Badge variant="destructive" className="font-mono text-xs">
                      {formatRemaining(ban.banned_until)}
                    </Badge>
                  </div>
                  {ban.reason && (
                    <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                      Grund: {ban.reason}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unban(ban.id, ban.username || "User")}
                  className="font-mono gap-1.5 shrink-0"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Aufheben
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminChatBansPanel;
