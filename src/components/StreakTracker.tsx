import { Flame, Gamepad2, Trophy } from "lucide-react";

interface StreakTrackerProps {
  loginStreak: number;
  gameStreak: number;
  totalXP: number;
}

const StreakTracker = ({ loginStreak, gameStreak, totalXP }: StreakTrackerProps) => {
  // Generate last 7 days activity dots
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date().getDay(); // 0=Sun
  const activeDays = Math.min(loginStreak, 7);

  return (
    <div className="mx-4 mt-3 p-3 rounded-xl bg-card border border-border">
      <div className="flex items-center justify-between">
        {/* Login Streak */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-foreground">{loginStreak}</span>
          </div>
          <span className="text-xs text-muted-foreground">day streak</span>
        </div>

        {/* Game Streak */}
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{gameStreak}</span>
          <span className="text-xs text-muted-foreground">games</span>
        </div>

        {/* XP */}
        <div className="flex items-center gap-1">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-bold text-foreground">{totalXP}</span>
          <span className="text-xs text-muted-foreground">XP</span>
        </div>
      </div>

      {/* Weekly dots */}
      <div className="flex justify-between mt-2 px-1">
        {days.map((day, i) => {
          // Map i (0=Mon) to whether it's within streak
          const dayIndex = (today - 6 + i + 7) % 7; // which day of week
          const isActive = i >= 7 - activeDays;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div
                className={`w-3 h-3 rounded-full transition-colors ${
                  isActive
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
              <span className="text-[10px] text-muted-foreground">{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StreakTracker;
