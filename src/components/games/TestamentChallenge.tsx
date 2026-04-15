import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader2, RotateCcw, Trophy, XCircle, Flame, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBibleGames, BibleGame } from "@/hooks/useBibleGames";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAchievements } from "@/hooks/useAchievements";

interface TestamentChallengeProps {
  testament: "old" | "new";
  scoreKey: "old_testament" | "new_testament";
  title: string;
  emptyMessage: string;
  onGameEnd?: (score: number, streak: number) => void;
}

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const ScrollSVG = ({ testament, step, total, streak }: { testament: "old" | "new"; step: number; total: number; streak: number }) => {
  const isOld = testament === "old";
  return (
    <svg viewBox="0 0 400 140" className="w-full h-auto" aria-hidden>
      <defs>
        <linearGradient id={`scroll-bg-${testament}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isOld ? "hsl(35 60% 50% / 0.15)" : "hsl(var(--primary) / 0.15)"} />
          <stop offset="100%" stopColor="hsl(var(--background))" />
        </linearGradient>
        <filter id="flame-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="140" fill={`url(#scroll-bg-${testament})`} rx="16" />

      {/* Scroll body */}
      <rect x="40" y="20" width="320" height="100" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Scroll ends */}
      <rect x="30" y="15" width="16" height="110" rx="8" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
      <rect x="354" y="15" width="16" height="110" rx="8" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />

      {/* Progress dots on scroll */}
      {Array.from({ length: total }).map((_, i) => {
        const x = 70 + (i / Math.max(total - 1, 1)) * 260;
        const isPast = i < step;
        const isActive = i === step;
        return (
          <g key={i}>
            <circle
              cx={x} cy={70}
              r={isActive ? 7 : 4}
              fill={isPast ? "hsl(var(--primary))" : isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.2)"}
              className={isActive ? "animate-pulse" : ""}
            />
            {isPast && <text x={x} y={73} textAnchor="middle" fontSize="6" fill="hsl(var(--primary-foreground))">✓</text>}
          </g>
        );
      })}

      {/* Streak fire */}
      {streak > 0 && (
        <g filter="url(#flame-glow)">
          {[...Array(Math.min(streak, 5))].map((_, i) => (
            <circle
              key={i}
              cx={200 + (i - Math.min(streak, 5) / 2) * 12}
              cy={108}
              r={4 + i * 0.5}
              fill={isOld ? "hsl(25 90% 55% / 0.7)" : "hsl(var(--primary) / 0.7)"}
              className="animate-pulse"
            />
          ))}
          <text x="200" y="112" textAnchor="middle" fontSize="8" fill="hsl(var(--primary))">
            🔥 {streak}
          </text>
        </g>
      )}

      {/* Testament icon */}
      {isOld ? (
        <text x="200" y="45" textAnchor="middle" fontSize="18">📜</text>
      ) : (
        <text x="200" y="45" textAnchor="middle" fontSize="18">✝️</text>
      )}
    </svg>
  );
};

const TestamentChallenge = ({
  testament,
  scoreKey,
  title,
  emptyMessage,
  onGameEnd,
}: TestamentChallengeProps) => {
  const { games, loading, isOnline, syncScore, getLocalProgress, saveLocalProgress } = useBibleGames();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);

  const filteredGames = useMemo(() => {
    const valid = games.filter(
      (game) =>
        game.testament === testament &&
        Array.isArray(game.options) &&
        game.options.length > 1
    );
    return shuffle(valid);
  }, [games, testament]);

  useEffect(() => {
    void (async () => {
      const progress = await getLocalProgress(scoreKey);
      if (progress) {
        setHighestStreak(progress.highest_streak);
      }
    })();
  }, [getLocalProgress, scoreKey]);

  const currentGame: BibleGame | undefined = filteredGames[currentIndex];
  const progress = filteredGames.length > 0 ? ((currentIndex + 1) / filteredGames.length) * 100 : 0;

  const handleSelectAnswer = (answer: string) => {
    if (!currentGame || isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);
    const isCorrect = answer === currentGame.correct_answer;

    if (isCorrect) {
      setScore((prev) => prev + currentGame.points);
      setStreak((prev) => {
        const next = prev + 1;
        if (next > highestStreak) setHighestStreak(next);
        return next;
      });
      toast({ title: "🔥 Correct!", description: `+${currentGame.points} points${streak >= 2 ? ` · ${streak + 1}x streak!` : ""}` });
    } else {
      setStreak(0);
      toast({
        title: "❌ Incorrect",
        description: `Correct answer: ${currentGame.correct_answer}`,
        variant: "destructive",
      });
    }
  };

  const handleNext = async () => {
    if (!currentGame) return;
    if (currentIndex >= filteredGames.length - 1) {
      setGameEnded(true);
      await saveLocalProgress({
        id: scoreKey,
        game_type: scoreKey,
        score,
        games_played: 1,
        highest_streak: highestStreak,
        current_streak: streak,
      });
      await syncScore(scoreKey, score, highestStreak);
      onGameEnd?.(score, highestStreak);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setIsAnswered(false);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setStreak(0);
    setGameEnded(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (filteredGames.length === 0 || !currentGame) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
        <BookOpen className="w-12 h-12 text-primary mx-auto opacity-50" />
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  if (gameEnded) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden animate-scale-in">
        <ScrollSVG testament={testament} step={filteredGames.length} total={filteredGames.length} streak={highestStreak} />
        <div className="p-8 text-center space-y-4">
          <Trophy className="w-14 h-14 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">{title} Complete!</h2>
          <div className="flex gap-4 justify-center">
            <div className="bg-primary/10 rounded-xl px-5 py-3">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-2xl font-bold text-primary">{score}</p>
            </div>
            <div className="bg-primary/10 rounded-xl px-5 py-3">
              <p className="text-xs text-muted-foreground">Best Streak</p>
              <p className="text-2xl font-bold text-primary">🔥 {highestStreak}</p>
            </div>
          </div>
          <Button onClick={handleRestart} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" /> Play Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Visual scroll header */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <ScrollSVG testament={testament} step={currentIndex} total={filteredGames.length} streak={streak} />
        <div className="px-4 py-3 flex items-center justify-between border-t border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{title}: {currentIndex + 1}/{filteredGames.length}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {streak > 0 && (
              <span className="flex items-center gap-1 text-orange-500 font-semibold">
                <Flame className="w-4 h-4" /> {streak}
              </span>
            )}
            <span className="font-bold text-primary">{score} pts</span>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-primary/10 to-transparent">
          <span className={cn(
            "px-3 py-0.5 rounded-full text-xs font-semibold",
            currentGame.difficulty === "easy" && "bg-green-500/20 text-green-500",
            currentGame.difficulty === "medium" && "bg-yellow-500/20 text-yellow-500",
            currentGame.difficulty === "hard" && "bg-red-500/20 text-red-500"
          )}>
            {currentGame.difficulty}
          </span>
          <span className="text-xs text-muted-foreground">+{currentGame.points} pts</span>
        </div>

        <div className="px-5 py-4">
          <h3 className="text-lg font-bold leading-relaxed">{currentGame.question}</h3>
          {currentGame.bible_reference && (
            <p className="text-xs text-muted-foreground mt-1">📖 {currentGame.bible_reference}</p>
          )}
        </div>

        <div className="px-4 pb-4 space-y-2.5">
          {currentGame.options?.map((option, i) => {
            const correct = isAnswered && option === currentGame.correct_answer;
            const wrong = isAnswered && option === selectedAnswer && option !== currentGame.correct_answer;
            return (
              <button
                key={i}
                onClick={() => handleSelectAnswer(option)}
                disabled={isAnswered}
                className={cn(
                  "w-full p-4 rounded-xl text-left transition-all duration-300 border-2",
                  !isAnswered && "hover:border-primary hover:bg-primary/5 border-border",
                  correct && "border-green-500 bg-green-500/10 scale-[1.02]",
                  wrong && "border-red-500 bg-red-500/10",
                  isAnswered && !correct && !wrong && "border-border opacity-40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option}</span>
                  {correct && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {wrong && <XCircle className="w-5 h-5 text-red-500" />}
                </div>
              </button>
            );
          })}

          {isAnswered && (
            <Button onClick={handleNext} className="w-full mt-2">
              {currentIndex >= filteredGames.length - 1 ? "📜 See Results" : "Next Question →"}
            </Button>
          )}
        </div>
      </div>

      {!isOnline && (
        <p className="text-xs text-center text-muted-foreground">
          Offline mode — scores sync when online
        </p>
      )}
    </div>
  );
};

export default TestamentChallenge;
