import { useState } from "react";
import { Trophy, ChevronUp, ChevronDown, Crown, Medal, Award, WifiOff, User } from "lucide-react";
import { useLeaderboard } from "@/hooks/useBibleGames";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface FloatingLeaderboardProps {
  gameType?: string;
  className?: string;
}

const FloatingLeaderboard = ({ gameType, className }: FloatingLeaderboardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { scores, loading, isOnline } = useLeaderboard(gameType);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 1:
        return <Medal className="w-4 h-4 text-gray-400" />;
      case 2:
        return <Award className="w-4 h-4 text-amber-600" />;
      default:
        return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{index + 1}</span>;
    }
  };

  return (
    <div
      className={cn(
        "fixed right-4 bottom-20 z-40 transition-all duration-300",
        isExpanded ? "w-72" : "w-auto",
        className
      )}
    >
      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Leaderboard</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-3 max-h-80 overflow-y-auto">
            {!isOnline ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <WifiOff className="w-8 h-8 mb-2" />
                <p className="text-sm text-center">
                  Leaderboard available when online
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : scores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Trophy className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm text-center">
                  No scores yet. Be the first!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {scores.map((score, index) => (
                  <div
                    key={score.user_id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors",
                      index === 0 && "bg-yellow-500/10",
                      index === 1 && "bg-gray-400/10",
                      index === 2 && "bg-amber-600/10"
                    )}
                  >
                    <div className="flex items-center justify-center w-6">
                      {getRankIcon(index)}
                    </div>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={score.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {score.profiles?.username?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {score.profiles?.username || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {score.total_games_played} games • {score.games.length} types
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{score.total_score}</p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isOnline && scores.length > 0 && (
              <p className="text-xs text-center text-muted-foreground mt-3 pt-3 border-t border-border">
                Sign in to join the leaderboard!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingLeaderboard;
