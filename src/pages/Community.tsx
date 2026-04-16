import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSentinelPlus } from "@/hooks/useSentinelPlus";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, ArrowLeft, Crown, Trash2, Smile } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AccountMenu from "@/components/AccountMenu";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ownerBadge from "@/assets/owner-badge.png";

interface Message {
  id: string;
  user_id: string;
  username: string;
  content: string;
  is_plus: boolean;
  is_admin: boolean;
  created_at: string;
}

const EMOJI_LIST = ["😀", "😂", "🔥", "❤️", "👍", "👎", "🛡️", "⚡", "🎉", "💀", "😎", "🤔", "👀", "✅", "❌", "🚀"];

const Community = () => {
  const { user } = useAuth();
  const { isPlus, isAdmin } = useSentinelPlus();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [username, setUsername] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load username
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

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from("community_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMessages(data as unknown as Message[]);
    };
    loadMessages();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("community-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_messages" },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    const { error } = await supabase.from("community_messages").insert({
      user_id: user.id,
      username: username || user.email?.split("@")[0] || "Anonym",
      content: input.trim().slice(0, 500),
      is_plus: isPlus,
      is_admin: isAdmin,
    } as any);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setInput("");
      setShowEmojis(false);
    }
    setSending(false);
  }, [input, user, username, isPlus, isAdmin, sending, toast]);

  const deleteMessage = async (id: string) => {
    await supabase.from("community_messages").delete().eq("id", id);
  };

  const addEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
  };

  const isGuest = !user;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return time;
    return `${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} ${time}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Grid bg */}
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none" style={{
        backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <AccountMenu />

      {/* Header */}
      <div className="relative z-10 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold font-mono text-foreground">COMMUNITY</h1>
          </div>
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            {messages.length} Nachrichten
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <MessageCircle className="w-12 h-12 text-muted-foreground/20 mx-auto" />
              <p className="text-muted-foreground font-mono text-sm">
                Noch keine Nachrichten. Sei der Erste! 🚀
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isOwn = user?.id === msg.user_id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
                  isOwn
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border rounded-bl-md"
                } ${msg.is_admin ? "ring-1 ring-primary/40" : ""}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {msg.is_admin && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <img src={ownerBadge} alt="Owner" className="w-4 h-4 cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="font-mono text-xs">
                          Owner
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {msg.is_plus && !msg.is_admin && <Crown className="w-3 h-3 text-yellow-400" />}
                    <span className={`text-xs font-bold font-mono ${
                      msg.is_admin
                        ? "text-primary"
                        : msg.is_plus
                        ? "text-yellow-400"
                        : isOwn
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    }`}>
                      {msg.username}
                    </span>
                    {msg.is_admin && (
                      <span className="text-[9px] font-mono font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                        OWNER
                      </span>
                    )}
                    {(isOwn || isAdmin) && (
                      <button onClick={() => deleteMessage(msg.id)} className="ml-auto opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className={`text-sm font-mono break-words leading-relaxed ${isOwn ? "text-primary-foreground" : "text-foreground"}`}>
                    {msg.content}
                  </p>
                  <p className={`text-[10px] mt-1 font-mono ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Emoji picker */}
      {showEmojis && (
        <div className="relative z-20 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-1">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addEmoji(emoji)}
                className="w-9 h-9 flex items-center justify-center text-lg hover:bg-secondary rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="relative z-10 border-t border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {isGuest ? (
            <p className="text-center text-muted-foreground font-mono text-sm">
              Du musst angemeldet sein um zu schreiben. 🔒
            </p>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEmojis(!showEmojis)}
                className={`shrink-0 ${showEmojis ? "text-primary" : ""}`}
              >
                <Smile className="w-5 h-5" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Nachricht schreiben... 💬"
                maxLength={500}
                className="font-mono"
                disabled={sending}
              />
              <Button onClick={sendMessage} disabled={sending || !input.trim()} size="icon" className="shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;
