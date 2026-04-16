import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSentinelPlus } from "@/hooks/useSentinelPlus";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageCircle, ArrowLeft, Crown, Trash2, Smile, Megaphone, X, Plus } from "lucide-react";
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

interface CommunityEvent {
  id: string;
  title: string;
  content: string;
  author_name: string;
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

  // Events
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventContent, setEventContent] = useState("");
  const [eventSending, setEventSending] = useState(false);

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

  // Load messages + events
  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from("community_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMessages(data as unknown as Message[]);
    };
    const loadEvents = async () => {
      const { data } = await supabase
        .from("community_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setEvents(data as unknown as CommunityEvent[]);
    };
    loadMessages();
    loadEvents();
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

  const createEvent = async () => {
    if (!eventTitle.trim() || !eventContent.trim()) return;
    setEventSending(true);
    const { data, error } = await supabase.from("community_events").insert({
      title: eventTitle.trim(),
      content: eventContent.trim(),
      author_id: user!.id,
      author_name: username || "Owner",
    } as any).select().single();
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setEvents((prev) => [data as unknown as CommunityEvent, ...prev]);
      setEventTitle("");
      setEventContent("");
      setShowEventForm(false);
      toast({ title: "Event erstellt! 📢" });
    }
    setEventSending(false);
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("community_events").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
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
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">
              {messages.length} Nachrichten
            </span>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowEventForm(!showEventForm)} className="font-mono text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Event
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Event creation form */}
      {showEventForm && isAdmin && (
        <div className="relative z-10 border-b border-border bg-card/90 backdrop-blur-sm px-4 py-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" />
                Neues Event / Update
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowEventForm(false)} className="h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Titel (z.B. Neues Update v2.0)"
              maxLength={100}
              className="font-mono text-sm"
            />
            <Textarea
              value={eventContent}
              onChange={(e) => setEventContent(e.target.value)}
              placeholder="Beschreibung..."
              maxLength={1000}
              rows={3}
              className="font-mono text-sm"
            />
            <Button onClick={createEvent} disabled={eventSending || !eventTitle.trim() || !eventContent.trim()} className="font-mono text-xs gap-2">
              <Megaphone className="w-3.5 h-3.5" />
              Event veröffentlichen
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">

          {/* Pinned events */}
          {events.length > 0 && (
            <div className="space-y-2 mb-4">
              {events.map((ev) => (
                <div key={ev.id} className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Megaphone className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-bold font-mono text-primary">{ev.title}</span>
                    </div>
                    {isAdmin && (
                      <button onClick={() => deleteEvent(ev.id)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity shrink-0 mt-0.5">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-mono text-foreground/80 whitespace-pre-wrap ml-6">{ev.content}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-2 ml-6">
                    von {ev.author_name} · {formatTime(ev.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}

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
                } ${msg.is_admin ? "ring-1 ring-primary/30" : ""}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-xs font-bold font-mono ${
                      msg.is_admin
                        ? "text-primary"
                        : msg.is_plus
                        ? "text-amber-500"
                        : isOwn
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    }`}>
                      {msg.username}
                    </span>
                    {msg.is_admin && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <img src={ownerBadge} alt="Owner" className="w-3.5 h-3.5 cursor-pointer inline-block" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="font-mono text-xs bg-card border border-border">
                          Owner
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {msg.is_plus && !msg.is_admin && <Crown className="w-3 h-3 text-amber-500" />}
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
