import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface StreakData {
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
  const [streaks, setStreaks] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setStreaks(data as unknown as StreakData);
      setLoading(false);
    };

    fetch();
  }, [user]);

  return { streaks, loading };
};
