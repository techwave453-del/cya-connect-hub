import { useState } from "react";
import { Achievement, UserAchievement } from "@/hooks/useAchievements";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle2 } from "lucide-react";

interface AchievementsBadgesProps {
  achievements: Achievement[];
  earnedAchievements: UserAchievement[];
  streaks: {
    current_login_streak: number;
    current_game_streak: number;
    total_games_played: number;
  };
  totalScore?: number;
}

const categories = ["All", "games", "streaks", "milestones"];

const AchievementsBadges = ({
  achievements,
  earnedAchievements,
  streaks,
  totalScore = 0,
}: AchievementsBadgesProps) => {
  const [activeCategory, setActiveCategory] = useState("All");

  const earnedIds = new Set(earnedAchievements.map(e => e.achievement_id));

  const filtered =
    activeCategory === "All"
      ? achievements
      : achievements.filter(a => a.category === activeCategory);

  const getProgress = (ach: Achievement): number => {
    let current = 0;
    switch (ach.criteria_type) {
      case "games_played":
        current = streaks.total_games_played;
        break;
      case "total_score":
        current = totalScore;
        break;
      case "login_streak":
        current = streaks.current_login_streak;
        break;
      case "game_streak":
        current = streaks.current_game_streak;
        break;
    }
    return Math.min((current / ach.criteria_value) * 100, 100);
  };

  const getProgressText = (ach: Achievement): string => {
    let current = 0;
    switch (ach.criteria_type) {
      case "games_played":
        current = streaks.total_games_played;
        break;
      case "total_score":
        current = totalScore;
        break;
      case "login_streak":
        current = streaks.current_login_streak;
        break;
      case "game_streak":
        current = streaks.current_game_streak;
        break;
    }
    return `${Math.min(current, ach.criteria_value)}/${ach.criteria_value}`;
  };

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat === "All" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Achievements grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map(ach => {
          const isEarned = earnedIds.has(ach.id);
          const progress = getProgress(ach);

          return (
            <div
              key={ach.id}
              className={`relative p-3 rounded-xl border transition-all ${
                isEarned
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card border-border opacity-70"
              }`}
            >
              {/* Icon */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{ach.icon}</span>
                {isEarned ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Title */}
              <h4 className="text-sm font-semibold text-foreground leading-tight">
                {ach.title}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {ach.description}
              </p>

              {/* Progress */}
              {!isEarned && (
                <div className="mt-2 space-y-1">
                  <Progress value={progress} className="h-1.5" />
                  <span className="text-[10px] text-muted-foreground">
                    {getProgressText(ach)}
                  </span>
                </div>
              )}

              {/* XP badge */}
              <Badge
                variant={isEarned ? "default" : "secondary"}
                className="mt-2 text-[10px]"
              >
                +{ach.points} XP
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsBadges;
