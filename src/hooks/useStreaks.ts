import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getById, put } from "@/lib/offlineDb";
import { useOnlineStatus } from "./useOnlineStatus";

export interface StreakData {
  user_id: string;
  current_login_streak: number;
  longest_login_streak: number;
  current_game_streak: number;
  longest_game_streak: number;
  total_logins: number;
  total_games_played: number;
  last_login_date: string | null;
  last_game_date: string | null;
}

export const useStreaks = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [streaks, setStreaks] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchStreaks = async () => {
      // Try cache first
      try {
        const cached = await getById<StreakData>("user_streaks", user.id);
        if (cached) {
          setStreaks(cached);
          setLoading(false);
        }
      } catch { /* ignore */ }

      if (isOnline) {
        try {
          const { data } = await supabase
            .from("user_streaks")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          if (data) {
            const fresh = data as unknown as StreakData;
            setStreaks(fresh);
            try { await put("user_streaks", fresh); } catch { /* ignore */ }
          }
        } catch (e) {
          console.error("[useStreaks] fetch failed:", e);
        }
      }
      setLoading(false);
    };

    fetchStreaks();
  }, [user, isOnline]);

  return { streaks, loading };
};
