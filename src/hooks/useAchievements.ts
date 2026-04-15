import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  criteria_type: string;
  criteria_value: number;
  points: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
}

export interface UserStreaks {
  current_login_streak: number;
  longest_login_streak: number;
  current_game_streak: number;
  longest_game_streak: number;
  last_login_date: string | null;
  last_game_date: string | null;
  total_logins: number;
  total_games_played: number;
}

const defaultStreaks: UserStreaks = {
  current_login_streak: 0,
  longest_login_streak: 0,
  current_game_streak: 0,
  longest_game_streak: 0,
  last_login_date: null,
  last_game_date: null,
  total_logins: 0,
  total_games_played: 0,
};

export const useAchievements = () => {
  const { user, isAuthenticated } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<UserAchievement[]>([]);
  const [streaks, setStreaks] = useState<UserStreaks>(defaultStreaks);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const { data: allAch } = await supabase.from("achievements").select("*");
      if (allAch) setAchievements(allAch as Achievement[]);

      if (user) {
        const { data: earned } = await supabase
          .from("user_achievements")
          .select("*")
          .eq("user_id", user.id);
        if (earned) setEarnedAchievements(earned as UserAchievement[]);

        const { data: streakData } = await supabase
          .from("user_streaks")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (streakData) setStreaks(streakData as unknown as UserStreaks);
      }
    } catch (e) {
      console.error("Error fetching achievements:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getTodayDate = () => new Date().toISOString().split("T")[0];

  const recordLogin = useCallback(async () => {
    if (!user) return;
    const today = getTodayDate();

    try {
      const { data: existing } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("user_streaks").insert({
          user_id: user.id,
          current_login_streak: 1,
          longest_login_streak: 1,
          last_login_date: today,
          total_logins: 1,
        });
        setStreaks(prev => ({ ...prev, current_login_streak: 1, longest_login_streak: 1, total_logins: 1, last_login_date: today }));
      } else if (existing.last_login_date === today) {
        // Already logged in today
        return;
      } else {
        const lastDate = existing.last_login_date ? new Date(existing.last_login_date) : null;
        const todayDate = new Date(today);
        const diffDays = lastDate ? Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000) : 999;

        const newStreak = diffDays === 1 ? existing.current_login_streak + 1 : 1;
        const newLongest = Math.max(existing.longest_login_streak, newStreak);

        await supabase
          .from("user_streaks")
          .update({
            current_login_streak: newStreak,
            longest_login_streak: newLongest,
            last_login_date: today,
            total_logins: existing.total_logins + 1,
          })
          .eq("user_id", user.id);

        setStreaks(prev => ({
          ...prev,
          current_login_streak: newStreak,
          longest_login_streak: newLongest,
          last_login_date: today,
          total_logins: existing.total_logins + 1,
        }));
      }

      // Check achievements after login
      await checkAndAwardAchievements();
    } catch (e) {
      console.error("Error recording login:", e);
    }
  }, [user]);

  const recordGamePlayed = useCallback(async () => {
    if (!user) return;
    const today = getTodayDate();

    try {
      const { data: existing } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("user_streaks").insert({
          user_id: user.id,
          current_game_streak: 1,
          longest_game_streak: 1,
          last_game_date: today,
          total_games_played: 1,
        });
      } else {
        const lastDate = existing.last_game_date ? new Date(existing.last_game_date) : null;
        const todayDate = new Date(today);
        const diffDays = lastDate ? Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000) : 999;

        let newStreak = existing.current_game_streak;
        if (existing.last_game_date !== today) {
          newStreak = diffDays === 1 ? existing.current_game_streak + 1 : 1;
        }
        const newLongest = Math.max(existing.longest_game_streak, newStreak);

        await supabase
          .from("user_streaks")
          .update({
            current_game_streak: newStreak,
            longest_game_streak: newLongest,
            last_game_date: today,
            total_games_played: existing.total_games_played + 1,
          })
          .eq("user_id", user.id);

        setStreaks(prev => ({
          ...prev,
          current_game_streak: newStreak,
          longest_game_streak: newLongest,
          last_game_date: today,
          total_games_played: existing.total_games_played + 1,
        }));
      }

      await checkAndAwardAchievements();
    } catch (e) {
      console.error("Error recording game:", e);
    }
  }, [user]);

  const checkAndAwardAchievements = useCallback(async () => {
    if (!user) return;

    try {
      // Refresh data
      const [achRes, earnedRes, streakRes, scoresRes] = await Promise.all([
        supabase.from("achievements").select("*"),
        supabase.from("user_achievements").select("*").eq("user_id", user.id),
        supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("game_scores").select("score, games_played").eq("user_id", user.id),
      ]);

      const allAch = (achRes.data || []) as Achievement[];
      const earned = (earnedRes.data || []) as UserAchievement[];
      const streak = streakRes.data as any;
      const scores = scoresRes.data || [];

      const earnedIds = new Set(earned.map(e => e.achievement_id));
      const totalScore = scores.reduce((sum: number, s: any) => sum + (s.score || 0), 0);
      const totalGames = streak?.total_games_played || 0;
      const loginStreak = streak?.current_login_streak || 0;
      const gameStreak = streak?.current_game_streak || 0;

      for (const ach of allAch) {
        if (earnedIds.has(ach.id)) continue;

        let met = false;
        switch (ach.criteria_type) {
          case "games_played":
            met = totalGames >= ach.criteria_value;
            break;
          case "total_score":
            met = totalScore >= ach.criteria_value;
            break;
          case "login_streak":
            met = loginStreak >= ach.criteria_value;
            break;
          case "game_streak":
            met = gameStreak >= ach.criteria_value;
            break;
        }

        if (met) {
          const { error } = await supabase.from("user_achievements").insert({
            user_id: user.id,
            achievement_id: ach.id,
          });

          if (!error) {
            toast({
              title: `${ach.icon} Achievement Unlocked!`,
              description: `${ach.title} — +${ach.points} XP`,
            });
            setEarnedAchievements(prev => [
              ...prev,
              { id: crypto.randomUUID(), user_id: user.id, achievement_id: ach.id, earned_at: new Date().toISOString() },
            ]);
          }
        }
      }
    } catch (e) {
      console.error("Error checking achievements:", e);
    }
  }, [user]);

  const totalXP = achievements
    .filter(a => earnedAchievements.some(e => e.achievement_id === a.id))
    .reduce((sum, a) => sum + a.points, 0);

  return {
    achievements,
    earnedAchievements,
    streaks,
    loading,
    totalXP,
    recordLogin,
    recordGamePlayed,
    refetch: fetchAll,
  };
};
