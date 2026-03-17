import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const SCAN_LIMITS_KEY = "sentinel_scan_limits";

const VALID_CODES = ["BEN26", "SENTINEL+"];

interface ScanLimits {
  date: string;
  urlScans: number;
  fileScans: number;
}

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getLimits = (): ScanLimits => {
  try {
    const stored = JSON.parse(localStorage.getItem(SCAN_LIMITS_KEY) || "{}");
    if (stored.date === getTodayKey()) return stored;
  } catch {}
  return { date: getTodayKey(), urlScans: 0, fileScans: 0 };
};

const saveLimits = (limits: ScanLimits) => {
  localStorage.setItem(SCAN_LIMITS_KEY, JSON.stringify(limits));
};

export const useSentinelPlus = () => {
  const { user } = useAuth();
  const [isPlus, setIsPlus] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [plusUntil, setPlusUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanLimits, setScanLimits] = useState<ScanLimits>(getLimits());

  useEffect(() => {
    if (!user) {
      setIsPlus(false);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    supabase
      .from("profiles")
      .select("sentinel_plus_until, is_admin")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const admin = data.is_admin === true;
          const plusActive = admin || (data.sentinel_plus_until && new Date(data.sentinel_plus_until) > new Date());
          setIsAdmin(admin);
          setIsPlus(!!plusActive);
          setPlusUntil(data.sentinel_plus_until);
        }
        setLoading(false);
      });
  }, [user]);

  const canScanUrl = () => {
    if (isPlus) return true;
    const limits = getLimits();
    return limits.urlScans < 20;
  };

  const canScanFile = () => {
    if (isPlus) return true;
    const limits = getLimits();
    return limits.fileScans < 10;
  };

  const recordUrlScan = () => {
    if (isPlus) return;
    const limits = getLimits();
    limits.urlScans += 1;
    saveLimits(limits);
    setScanLimits({ ...limits });
  };

  const recordFileScan = () => {
    if (isPlus) return;
    const limits = getLimits();
    limits.fileScans += 1;
    saveLimits(limits);
    setScanLimits({ ...limits });
  };

  const getRemainingScans = () => {
    if (isPlus) return { urlRemaining: Infinity, fileRemaining: Infinity };
    const limits = getLimits();
    return {
      urlRemaining: Math.max(0, 20 - limits.urlScans),
      fileRemaining: Math.max(0, 10 - limits.fileScans),
    };
  };

  const activateWithCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedCode = code.trim().toUpperCase();
    if (!VALID_CODES.includes(normalizedCode)) {
      return { success: false, error: "Ungültiger Code." };
    }
    if (!user) return { success: false, error: "Du musst angemeldet sein." };

    // Check if this code was already used by this user
    const { data: usedCodes } = await supabase
      .from("used_plus_codes")
      .select("id")
      .eq("user_id", user.id)
      .eq("code", normalizedCode);

    if (usedCodes && usedCodes.length > 0) {
      return { success: false, error: "Dieser Code wurde bereits eingelöst." };
    }

    const until = new Date();
    until.setDate(until.getDate() + 7);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ sentinel_plus_until: until.toISOString() } as any)
      .eq("id", user.id);

    if (updateError) return { success: false, error: "Aktivierung fehlgeschlagen." };

    // Record the used code
    await supabase
      .from("used_plus_codes")
      .insert({ user_id: user.id, code: normalizedCode } as any);

    setIsPlus(true);
    setPlusUntil(until.toISOString());
    return { success: true };
  };

  return {
    isPlus,
    isAdmin,
    plusUntil,
    loading,
    canScanUrl,
    canScanFile,
    recordUrlScan,
    recordFileScan,
    getRemainingScans,
    activateWithCode,
  };
};
