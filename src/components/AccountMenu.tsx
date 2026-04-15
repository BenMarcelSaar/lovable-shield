import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSentinelPlus } from "@/hooks/useSentinelPlus";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, LogOut, LogIn, MessageCircle, Crown } from "lucide-react";

const AccountMenu = () => {
  const { user, signOut } = useAuth();
  const { isPlus } = useSentinelPlus();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const isGuest = !user;

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

  const initials = isGuest
    ? "G"
    : username
      ? username.slice(0, 2).toUpperCase()
      : (user.email?.slice(0, 2).toUpperCase() ?? "??");

  const displayName = isGuest ? "Gast" : (username || user.email);

  return (
    <div className="fixed top-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
            isPlus
              ? "border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20"
              : "border-border bg-card/80 hover:bg-card"
          }`}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className={`text-xs font-bold ${
                isGuest
                  ? "bg-muted text-muted-foreground"
                  : isPlus
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-primary text-primary-foreground"
              }`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            {isPlus && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
            <span className={`text-sm font-medium hidden sm:inline ${
              isPlus ? "text-yellow-400 font-bold" : "text-foreground"
            }`}>
              {displayName}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <div className="flex items-center gap-1.5">
              {isPlus && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
              <span className={`text-sm font-medium ${isPlus ? "text-yellow-400" : ""}`}>
                {isGuest ? "Gast" : (username || "Benutzer")}
              </span>
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {isGuest ? "Eingeschränkter Zugriff" : user.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isGuest ? (
            <DropdownMenuItem
              onClick={() => {
                localStorage.removeItem("sentinel_guest");
                navigate("/auth");
              }}
              className="cursor-pointer"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Anmelden / Registrieren
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={() => navigate("/community")} className="cursor-pointer">
                <MessageCircle className="mr-2 h-4 w-4" />
                Community
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Einstellungen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AccountMenu;
