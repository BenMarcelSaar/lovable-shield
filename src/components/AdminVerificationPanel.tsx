import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, UserCheck, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VerificationRequest {
  id: string;
  device_id: string;
  name: string;
  age: number;
  message: string | null;
  status: string;
  created_at: string;
}

const AdminVerificationPanel = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("age_verification_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setRequests(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id: string, status: "approved" | "denied") => {
    const { error } = await supabase
      .from("age_verification_requests")
      .update({ status, reviewed_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "approved" ? "Genehmigt ✓" : "Abgelehnt ✗" });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  const pending = requests.filter(r => r.status === "pending");
  const resolved = requests.filter(r => r.status !== "pending");

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Altersverifikation
            </CardTitle>
            <CardDescription>Zugangsanfragen verwalten</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchRequests}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-mono">Lade...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending */}
            {pending.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Ausstehend ({pending.length})</h3>
                {pending.map(req => (
                  <div key={req.id} className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-bold text-foreground">{req.name}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">Alter: {req.age}</span>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">Ausstehend</Badge>
                    </div>
                    {req.message && (
                      <p className="text-xs text-muted-foreground font-mono">"{req.message}"</p>
                    )}
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {new Date(req.created_at).toLocaleString("de-DE")}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAction(req.id, "approved")} className="flex-1 gap-1 font-mono text-xs">
                        <CheckCircle className="w-3 h-3" /> Genehmigen
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAction(req.id, "denied")} className="flex-1 gap-1 font-mono text-xs">
                        <XCircle className="w-3 h-3" /> Ablehnen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Resolved */}
            {resolved.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Verlauf</h3>
                {resolved.slice(0, 10).map(req => (
                  <div key={req.id} className="p-2 rounded-lg border border-border bg-secondary/30 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs text-foreground">{req.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 font-mono">Alter: {req.age}</span>
                    </div>
                    <Badge variant={req.status === "approved" ? "default" : "destructive"} className="text-[10px] font-mono">
                      {req.status === "approved" ? "Genehmigt" : "Abgelehnt"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {requests.length === 0 && (
              <p className="text-xs font-mono text-muted-foreground text-center py-4">Keine Anfragen vorhanden</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminVerificationPanel;
