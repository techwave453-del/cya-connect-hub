import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { getAll, putAll, put, getById, addToSyncQueue } from "@/lib/offlineDb";
import { useOnlineStatus } from "./useOnlineStatus";

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
  user_id?: string;
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
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<UserAchievement[]>([]);
  const [streaks, setStreaks] = useState<UserStreaks>(defaultStreaks);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      // 1. Cache-first display
      try {
        const cachedAch = await getAll<Achievement>("achievements");
        if (cachedAch.length > 0) setAchievements(cachedAch);

        if (user) {
          const cachedEarned = (await getAll<UserAchievement>("user_achievements"))
            .filter((e) => e.user_id === user.id);
          if (cachedEarned.length > 0) setEarnedAchievements(cachedEarned);

          const cachedStreaks = await getById<UserStreaks>("user_streaks", user.id);
          if (cachedStreaks) setStreaks(cachedStreaks);
        }
      } catch { /* ignore */ }

      // 2. Network refresh
      if (isOnline) {
        const { data: allAch } = await supabase.from("achievements").select("*");
        if (allAch) {
          setAchievements(allAch as Achievement[]);
          try { await putAll("achievements", allAch as Achievement[]); } catch { /* ignore */ }
        }

        if (user) {
          const { data: earned } = await supabase
            .from("user_achievements")
            .select("*")
            .eq("user_id", user.id);
          if (earned) {
            setEarnedAchievements(earned as UserAchievement[]);
            try { await putAll("user_achievements", earned as UserAchievement[]); } catch { /* ignore */ }
          }

          const { data: streakData } = await supabase
            .from("user_streaks")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          if (streakData) {
            const fresh = streakData as unknown as UserStreaks;
            setStreaks(fresh);
            try { await put("user_streaks", { ...fresh, user_id: user.id }); } catch { /* ignore */ }
          }
        }
      }
    } catch (e) {
      console.error("Error fetching achievements:", e);
    } finally {
      setLoading(false);
    }
  }, [user, isOnline]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getTodayDate = () => new Date().toISOString().split("T")[0];

  // Compute next streak state from current cached row
  const computeNextLoginStreak = (existing: UserStreaks | undefined, today: string): UserStreaks => {
    if (!existing) {
      return {
        ...defaultStreaks,
        current_login_streak: 1,
        longest_login_streak: 1,
        last_login_date: today,
        total_logins: 1,
      };
    }
    if (existing.last_login_date === today) return existing;

    const lastDate = existing.last_login_date ? new Date(existing.last_login_date) : null;
    const todayDate = new Date(today);
    const diffDays = lastDate ? Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000) : 999;
    const newStreak = diffDays === 1 ? existing.current_login_streak + 1 : 1;
    return {
      ...existing,
      current_login_streak: newStreak,
      longest_login_streak: Math.max(existing.longest_login_streak, newStreak),
      last_login_date: today,
      total_logins: (existing.total_logins || 0) + 1,
    };
  };

  const computeNextGameStreak = (existing: UserStreaks | undefined, today: string): UserStreaks => {
    if (!existing) {
      return {
        ...defaultStreaks,
        current_game_streak: 1,
        longest_game_streak: 1,
        last_game_date: today,
        total_games_played: 1,
      };
    }
    const lastDate = existing.last_game_date ? new Date(existing.last_game_date) : null;
    const todayDate = new Date(today);
    const diffDays = lastDate ? Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000) : 999;
    let newStreak = existing.current_game_streak;
    if (existing.last_game_date !== today) {
      newStreak = diffDays === 1 ? existing.current_game_streak + 1 : 1;
    }
    return {
      ...existing,
      current_game_streak: newStreak,
      longest_game_streak: Math.max(existing.longest_game_streak, newStreak),
      last_game_date: today,
      total_games_played: (existing.total_games_played || 0) + 1,
    };
  };

  const persistStreaks = async (next: UserStreaks) => {
    if (!user) return;
    const row = { ...next, user_id: user.id };
    try { await put("user_streaks", row); } catch { /* ignore */ }
    setStreaks(row);

    if (isOnline) {
      try {
        await supabase.from("user_streaks").upsert(row, { onConflict: "user_id" });
      } catch (e) {
        console.error("[useAchievements] streak upsert failed, queueing:", e);
        await addToSyncQueue({ table: "user_streaks", action: "update", data: row });
      }
    } else {
      await addToSyncQueue({ table: "user_streaks", action: "update", data: row });
    }
  };

  const recordLogin = useCallback(async () => {
    if (!user) return;
    const today = getTodayDate();
    try {
      const existing =
        (await getById<UserStreaks>("user_streaks", user.id)) ||
        (streaks.last_login_date !== null || streaks.total_logins > 0 ? { ...streaks, user_id: user.id } : undefined);
      if (existing && existing.last_login_date === today) return; // already counted

      const next = computeNextLoginStreak(existing, today);
      await persistStreaks(next);
      await checkAndAwardAchievements(next);
    } catch (e) {
      console.error("Error recording login:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOnline]);

  const recordGamePlayed = useCallback(async () => {
    if (!user) return;
    const today = getTodayDate();
    try {
      const existing =
        (await getById<UserStreaks>("user_streaks", user.id)) ||
        (streaks.last_login_date !== null || streaks.total_logins > 0 ? { ...streaks, user_id: user.id } : undefined);
      const next = computeNextGameStreak(existing, today);
      await persistStreaks(next);
      await checkAndAwardAchievements(next);
    } catch (e) {
      console.error("Error recording game:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOnline]);

  const checkAndAwardAchievements = useCallback(
    async (latestStreaks?: UserStreaks) => {
      if (!user) return;
      try {
        // Use cache as source of truth so this works offline
        const allAch = await getAll<Achievement>("achievements");
        const earnedAll = await getAll<UserAchievement>("user_achievements");
        const earned = earnedAll.filter((e) => e.user_id === user.id);
        const streak = latestStreaks || (await getById<UserStreaks>("user_streaks", user.id)) || streaks;
        const scores = (await getAll<{ user_id: string; score: number }>("game_scores")).filter(
          (s) => s.user_id === user.id
        );

        const earnedIds = new Set(earned.map((e) => e.achievement_id));
        const totalScore = scores.reduce((sum, s) => sum + (s.score || 0), 0);
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
          if (!met) continue;

          const newRow: UserAchievement = {
            id: crypto.randomUUID(),
            user_id: user.id,
            achievement_id: ach.id,
            earned_at: new Date().toISOString(),
          };

          // Save locally first so it survives offline
          try { await put("user_achievements", newRow); } catch { /* ignore */ }
          setEarnedAchievements((prev) => [...prev, newRow]);

          if (isOnline) {
            const { error } = await supabase.from("user_achievements").insert({
              user_id: user.id,
              achievement_id: ach.id,
            });
            if (error && error.code !== "23505") {
              await addToSyncQueue({
                table: "user_achievements",
                action: "insert",
                data: { user_id: user.id, achievement_id: ach.id },
              });
            }
          } else {
            await addToSyncQueue({
              table: "user_achievements",
              action: "insert",
              data: { user_id: user.id, achievement_id: ach.id },
            });
          }

          toast({
            title: `${ach.icon} Achievement Unlocked!`,
            description: `${ach.title} — +${ach.points} XP`,
          });
        }
      } catch (e) {
        console.error("Error checking achievements:", e);
      }
    },
    [user, isOnline, streaks]
  );

  const totalXP = achievements
    .filter((a) => earnedAchievements.some((e) => e.achievement_id === a.id))
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
