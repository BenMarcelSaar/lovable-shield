import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import FileScanner from "@/components/FileScanner";
import SafetyBot from "@/components/SafetyBot";
import UserBanScreen from "@/components/UserBanScreen";
import AccountMenu from "@/components/AccountMenu";
import SentinelPlusBadge from "@/components/SentinelPlusBadge";
import PlusLoadingScreen from "@/components/PlusLoadingScreen";
import ShutdownScreen from "@/components/ShutdownScreen";
import { useSentinelPlus } from "@/hooks/useSentinelPlus";
import { supabase } from "@/integrations/supabase/client";

const BAN_KEY = "sentinel_ban_until";

const Index = () => {
  const [banUntil, setBanUntil] = useState(0);
  const { isPlus, isAdmin, loading: plusLoading } = useSentinelPlus();
  const [shutdown, setShutdown] = useState<{ active: boolean; shutdown_until: string | null } | null>(null);
  const [showPlusLoading, setShowPlusLoading] = useState(false);

  useEffect(() => {
    const stored = Number(localStorage.getItem(BAN_KEY) || 0);
    if (stored > Date.now()) setBanUntil(stored);
  }, []);

  useEffect(() => {
    if (banUntil <= Date.now()) return;
    const timeout = setTimeout(() => setBanUntil(0), banUntil - Date.now());
    return () => clearTimeout(timeout);
  }, [banUntil]);

  // Show plus loading screen for Plus users on first load
  useEffect(() => {
    if (!plusLoading && isPlus) {
      const shown = sessionStorage.getItem("sentinel_plus_loaded");
      if (!shown) {
        setShowPlusLoading(true);
        sessionStorage.setItem("sentinel_plus_loaded", "true");
        setTimeout(() => setShowPlusLoading(false), 2500);
      }
    }
  }, [isPlus, plusLoading]);

  return (
    <>
      <AnimatePresence>
        {showPlusLoading && <PlusLoadingScreen />}
        {banUntil > Date.now() && <UserBanScreen unblockTime={banUntil} />}
      </AnimatePresence>
      <SentinelPlusBadge />
      <AccountMenu />
      <FileScanner />
      <SafetyBot onBan={(until) => setBanUntil(until)} />
    </>
  );
};

export default Index;
