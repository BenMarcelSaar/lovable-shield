import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, Plus, Trash2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BannedWord {
  id: string;
  word: string;
  ban_seconds: number;
  created_at: string;
}

const formatDuration = (sec: number) => {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
};

const AdminAiAndWordsPanel = () => {
  const { toast } = useToast();

  // AI toggle
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiRowId, setAiRowId] = useState<string | null>(null);

  // Words
  const [words, setWords] = useState<BannedWord[]>([]);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [newWord, setNewWord] = useState("");
  const [newDays, setNewDays] = useState(1);
  const [newHours, setNewHours] = useState(0);
  const [newMinutes, setNewMinutes] = useState(0);
  const [newSeconds, setNewSeconds] = useState(0);
  const [adding, setAdding] = useState(false);

  const loadAi = useCallback(async () => {
    const { data } = await supabase.from("ai_settings" as any).select("*").limit(1).maybeSingle();
    if (data) {
      setAiRowId((data as any).id);
      setAiEnabled((data as any).ai_enabled);
    }
    setAiLoading(false);
  }, []);

  const loadWords = useCallback(async () => {
    setWordsLoading(true);
    const { data } = await supabase
      .from("banned_words" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setWords(data as unknown as BannedWord[]);
    setWordsLoading(false);
  }, []);

  useEffect(() => {
    loadAi();
    loadWords();
  }, [loadAi, loadWords]);

  const toggleAi = async (checked: boolean) => {
    if (!aiRowId) return;
    setAiSaving(true);
    const { error } = await supabase
      .from("ai_settings" as any)
      .update({ ai_enabled: checked, updated_at: new Date().toISOString() } as any)
      .eq("id", aiRowId);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setAiEnabled(checked);
      toast({ title: checked ? "✅ KI aktiviert" : "🛑 KI deaktiviert" });
    }
    setAiSaving(false);
  };

  const addWord = async () => {
    const w = newWord.trim().toLowerCase();
    if (!w) return;
    const totalSec = newDays * 86400 + newHours * 3600 + newMinutes * 60 + newSeconds;
    if (totalSec <= 0) {
      toast({ title: "Ungültige Dauer", description: "Mindestens 1 Sekunde.", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("banned_words" as any).insert({
      word: w,
      ban_seconds: totalSec,
    } as any);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setNewWord("");
      setNewDays(1);
      setNewHours(0);
      setNewMinutes(0);
      setNewSeconds(0);
      await loadWords();
      toast({ title: "🚫 Wort hinzugefügt" });
    }
    setAdding(false);
  };

  const removeWord = async (id: string, word: string) => {
    const { error } = await supabase.from("banned_words" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setWords((prev) => prev.filter((w) => w.id !== id));
      toast({ title: "Entfernt", description: `"${word}" gelöscht.` });
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Toggle */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Sentinel AI Chatbot
          </CardTitle>
          <CardDescription>
            Schalte den KI-Chatbot global ein oder aus
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aiLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-mono">Lade...</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-toggle" className="font-mono text-sm">
                {aiEnabled ? "✅ KI ist aktiviert" : "🛑 KI ist deaktiviert"}
              </Label>
              <Switch
                id="ai-toggle"
                checked={aiEnabled}
                onCheckedChange={toggleAi}
                disabled={aiSaving}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banned Words */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Wort-Filter
          </CardTitle>
          <CardDescription>
            Verbotene Wörter im Community-Chat. Jedes Wort hat seine eigene Ban-Dauer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new */}
          <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
            <Input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Wort eingeben (z.B. spam)"
              maxLength={100}
              className="font-mono text-sm"
            />
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px] font-mono text-muted-foreground">Tage</Label>
                <Input
                  type="number"
                  min={0}
                  value={newDays}
                  onChange={(e) => setNewDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-[10px] font-mono text-muted-foreground">Std.</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={newHours}
                  onChange={(e) => setNewHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-[10px] font-mono text-muted-foreground">Min.</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={newMinutes}
                  onChange={(e) => setNewMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-[10px] font-mono text-muted-foreground">Sek.</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={newSeconds}
                  onChange={(e) => setNewSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <Button
              onClick={addWord}
              disabled={adding || !newWord.trim()}
              size="sm"
              className="w-full font-mono text-xs gap-2"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Wort hinzufügen
            </Button>
          </div>

          {/* List */}
          {wordsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-mono">Lade...</span>
            </div>
          ) : words.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono text-center py-4">
              Noch keine verbotenen Wörter
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {words.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-background"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-sm text-foreground truncate">{w.word}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                      {formatDuration(w.ban_seconds)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWord(w.id, w.word)}
                    className="h-7 w-7 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAiAndWordsPanel;
