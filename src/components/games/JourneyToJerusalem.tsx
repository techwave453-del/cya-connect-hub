import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader2, MapPin, RotateCcw, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useBibleGames, BibleGame } from "@/hooks/useBibleGames";
import { useQuestionGenerator } from "@/hooks/useQuestionGenerator";

const rankDifficulty = (difficulty: BibleGame["difficulty"]): number => {
  if (difficulty === "hard") return 3;
  if (difficulty === "medium") return 2;
  return 1;
};

const CITY_NAMES = ["Jericho", "Bethany", "Bethlehem", "Hebron", "Samaria", "Nazareth", "Capernaum", "Damascus", "Caesarea", "Jerusalem"];

const MapBoard = ({ step, total }: { step: number; total: number }) => {
  const cities = CITY_NAMES.slice(0, total + 1);
  return (
    <svg viewBox="0 0 400 200" className="w-full h-auto" aria-hidden>
      <defs>
        <linearGradient id="desert" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary) / 0.08)" />
          <stop offset="100%" stopColor="hsl(var(--muted) / 0.4)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="400" height="200" fill="url(#desert)" rx="16" />

      {/* Hills */}
      <ellipse cx="80" cy="180" rx="90" ry="30" fill="hsl(var(--muted) / 0.3)" />
      <ellipse cx="320" cy="175" rx="100" ry="35" fill="hsl(var(--muted) / 0.3)" />

      {/* Path through cities */}
      {cities.map((city, i) => {
        if (i === 0) return null;
        const prevX = 30 + ((i - 1) / total) * 340;
        const prevY = 160 - Math.sin(((i - 1) / total) * Math.PI) * 90 - ((i - 1) / total) * 30;
        const cx = 30 + (i / total) * 340;
        const cy = 160 - Math.sin((i / total) * Math.PI) * 90 - (i / total) * 30;
        const isPast = i <= step;
        return (
          <line
            key={`line-${i}`}
            x1={prevX} y1={prevY} x2={cx} y2={cy}
            stroke={isPast ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.2)"}
            strokeWidth={isPast ? 3 : 2}
            strokeDasharray={isPast ? "none" : "6 4"}
          />
        );
      })}

      {/* City dots */}
      {cities.map((city, i) => {
        const cx = 30 + (i / total) * 340;
        const cy = 160 - Math.sin((i / total) * Math.PI) * 90 - (i / total) * 30;
        const isActive = i === step;
        const isPast = i < step;
        const isJerusalem = i === total;
        return (
          <g key={city}>
            {/* Glow for active */}
            {isActive && (
              <circle cx={cx} cy={cy} r={14} fill="hsl(var(--primary) / 0.2)" filter="url(#glow)" className="animate-pulse" />
            )}
            {/* City marker */}
            {isJerusalem ? (
              <>
                <polygon
                  points={`${cx},${cy - 14} ${cx - 10},${cy + 4} ${cx + 10},${cy + 4}`}
                  fill={isPast || isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
                  stroke="hsl(var(--primary-foreground) / 0.5)" strokeWidth="1"
                />
                <text x={cx} y={cy - 1} textAnchor="middle" fontSize="8" fill="hsl(var(--primary-foreground))">🏛</text>
              </>
            ) : (
              <circle
                cx={cx} cy={cy}
                r={isActive ? 8 : 5}
                fill={isPast ? "hsl(var(--primary))" : isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.25)"}
                stroke={isPast || isActive ? "hsl(var(--primary-foreground) / 0.5)" : "none"}
                strokeWidth="1.5"
              />
            )}
            {isPast && !isJerusalem && (
              <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="7" fill="hsl(var(--primary-foreground))">✓</text>
            )}
            {/* Label */}
            <text
              x={cx} y={cy + (isJerusalem ? 18 : 18)}
              textAnchor="middle"
              fontSize={isActive || isJerusalem ? 9 : 7}
              fontWeight={isActive ? "bold" : "normal"}
              fill={isPast || isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.6)"}
            >
              {city}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const JourneyToJerusalem = () => {
  const { games, loading, isOnline, refetch } = useBibleGames("journey_jerusalem");
  const { generateQuestions, isGenerating, shouldGenerate } = useQuestionGenerator();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const pool = useMemo(
    () => [...games].sort((a, b) => rankDifficulty(b.difficulty) - rankDifficulty(a.difficulty)),
    [games]
  );
  const current = pool[index];

  useEffect(() => {
    if (!loading && games.length === 0 && isOnline && shouldGenerate("journey_jerusalem")) {
      void generateQuestions("journey_jerusalem", 5, { difficulty: "hard" }).then(() => refetch());
    }
  }, [games.length, generateQuestions, isOnline, loading, refetch, shouldGenerate]);

  const onSelect = (option: string) => {
    if (!current || answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === current.correct_answer;
    if (correct) {
      setScore((prev) => prev + current.points);
      toast({ title: "📍 Checkpoint cleared!", description: `+${current.points} points` });
    } else {
      toast({ title: "🚫 Wrong route!", description: `Correct: ${current.correct_answer}`, variant: "destructive" });
    }
  };

  const next = () => {
    if (index >= pool.length - 1) { setDone(true); return; }
    setIndex((prev) => prev + 1);
    setSelected(null);
    setAnswered(false);
  };

  const restart = () => { setIndex(0); setSelected(null); setAnswered(false); setScore(0); setDone(false); };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!current && !isGenerating && !done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
        <MapPin className="w-12 h-12 text-primary mx-auto opacity-50" />
        <h3 className="text-lg font-semibold">Journey to Jerusalem</h3>
        <p className="text-muted-foreground">No journey checkpoints available yet.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden animate-scale-in">
        <MapBoard step={pool.length} total={pool.length} />
        <div className="p-8 text-center space-y-4">
          <Trophy className="w-14 h-14 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">You've Reached Jerusalem! 🏛️</h2>
          <div className="inline-block bg-primary/10 rounded-xl px-6 py-3">
            <p className="text-sm text-muted-foreground">Total Score</p>
            <p className="text-3xl font-bold text-primary">{score}</p>
          </div>
          <div>
            <Button onClick={restart} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" /> Journey Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Map */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <MapBoard step={index} total={pool.length} />
        <div className="px-4 py-3 flex items-center justify-between border-t border-border">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{CITY_NAMES[index] || `Stop ${index + 1}`}</span>
          </div>
          <span className="text-sm font-bold text-primary">{score} pts</span>
        </div>
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-transparent px-5 py-4">
          <p className="text-xs text-muted-foreground mb-1">
            📜 {current.bible_reference || "Scripture checkpoint"} · {current.difficulty}
          </p>
          <h3 className="text-lg font-bold leading-snug">{current.question}</h3>
        </div>
        <div className="p-4 space-y-2.5">
          {current.options?.map((option) => {
            const correct = answered && option === current.correct_answer;
            const wrong = answered && option === selected && option !== current.correct_answer;
            return (
              <button
                key={option}
                onClick={() => onSelect(option)}
                disabled={answered}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all duration-300",
                  !answered && "border-border hover:border-primary hover:bg-primary/5",
                  correct && "border-green-500 bg-green-500/10 scale-[1.02]",
                  wrong && "border-red-500 bg-red-500/10",
                  answered && !correct && !wrong && "opacity-40"
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{option}</span>
                  {correct && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {wrong && <XCircle className="w-5 h-5 text-red-500" />}
                </span>
              </button>
            );
          })}
          {answered && (
            <Button className="w-full mt-2" onClick={next}>
              {index >= pool.length - 1 ? "🏛️ Arrive in Jerusalem" : "Continue Journey →"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JourneyToJerusalem;
