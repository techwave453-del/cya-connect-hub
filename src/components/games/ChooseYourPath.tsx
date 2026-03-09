import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader2, RotateCcw, Shield, XCircle, TreePine, Footprints } from "lucide-react";
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

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const PathScene = ({ step, total, correct }: { step: number; total: number; correct: boolean | null }) => (
  <svg viewBox="0 0 400 120" className="w-full h-auto" aria-hidden>
    {/* Sky gradient */}
    <defs>
      <linearGradient id="sky-path" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--primary) / 0.15)" />
        <stop offset="100%" stopColor="hsl(var(--background))" />
      </linearGradient>
      <linearGradient id="trail" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="hsl(var(--muted-foreground) / 0.3)" />
        <stop offset="100%" stopColor="hsl(var(--primary))" />
      </linearGradient>
    </defs>
    <rect width="400" height="120" fill="url(#sky-path)" rx="12" />

    {/* Ground */}
    <ellipse cx="200" cy="115" rx="210" ry="18" fill="hsl(var(--muted) / 0.5)" />

    {/* Trees */}
    {[40, 110, 290, 360].map((x, i) => (
      <g key={i}>
        <polygon points={`${x},35 ${x - 12},75 ${x + 12},75`} fill="hsl(var(--primary) / 0.25)" />
        <rect x={x - 2} y={75} width={4} height={12} fill="hsl(var(--muted-foreground) / 0.3)" rx={1} />
      </g>
    ))}

    {/* Winding path */}
    <path
      d="M 30 100 Q 100 60, 200 80 Q 300 100, 370 50"
      stroke="url(#trail)"
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
      strokeDasharray="8 4"
    />

    {/* Checkpoints */}
    {Array.from({ length: total }).map((_, i) => {
      const t = (i + 1) / (total + 1);
      const cx = 30 + t * 340;
      const cy = 100 - Math.sin(t * Math.PI) * 40;
      const isActive = i === step;
      const isPast = i < step;
      return (
        <g key={i}>
          <circle
            cx={cx}
            cy={cy}
            r={isActive ? 8 : 5}
            fill={isPast ? "hsl(var(--primary))" : isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
            className={isActive ? "animate-pulse" : ""}
          />
          {isPast && (
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8" fill="hsl(var(--primary-foreground))">✓</text>
          )}
        </g>
      );
    })}

    {/* Traveler */}
    {(() => {
      const t = (step + 0.5) / (total + 1);
      const cx = 30 + t * 340;
      const cy = 100 - Math.sin(t * Math.PI) * 40 - 14;
      return (
        <g className="animate-[bounce_2s_ease-in-out_infinite]">
          <circle cx={cx} cy={cy} r={6} fill="hsl(var(--primary))" stroke="hsl(var(--primary-foreground))" strokeWidth="2" />
          <circle cx={cx} cy={cy - 1} r={3} fill="hsl(var(--primary-foreground))" />
        </g>
      );
    })()}
  </svg>
);

const ChooseYourPath = () => {
  const { games, loading, isOnline, refetch } = useBibleGames("choose_path");
  const { generateQuestions, isGenerating, shouldGenerate } = useQuestionGenerator();
  const [pool, setPool] = useState<BibleGame[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [wisdomScore, setWisdomScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    const hardFirst = [...games].sort((a, b) => rankDifficulty(b.difficulty) - rankDifficulty(a.difficulty));
    setPool(shuffle(hardFirst));
  }, [games]);

  useEffect(() => {
    if (!loading && games.length === 0 && isOnline && shouldGenerate("choose_path")) {
      void generateQuestions("choose_path", 5, { difficulty: "hard" }).then(() => refetch());
    }
  }, [games.length, generateQuestions, isOnline, loading, refetch, shouldGenerate]);

  const current = useMemo(() => pool[index], [pool, index]);
  const progress = pool.length > 0 ? ((index + (finished ? 1 : 0)) / pool.length) * 100 : 0;

  const onSelect = (option: string) => {
    if (!current || answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === current.correct_answer;
    setLastCorrect(correct);
    if (correct) {
      setWisdomScore((prev) => prev + current.points);
      toast({ title: "🌟 Wise choice!", description: `+${current.points} wisdom` });
    } else {
      toast({ title: "🌧️ Not the best path", description: `Correct: ${current.correct_answer}`, variant: "destructive" });
    }
  };

  const onNext = () => {
    if (index >= pool.length - 1) {
      setFinished(true);
      return;
    }
    setIndex((prev) => prev + 1);
    setSelected(null);
    setAnswered(false);
    setLastCorrect(null);
  };

  const onRestart = () => {
    setPool((prev) => shuffle(prev));
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setWisdomScore(0);
    setFinished(false);
    setLastCorrect(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if ((games.length === 0 && !isGenerating) || (!current && !finished)) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
        <TreePine className="w-12 h-12 text-primary mx-auto opacity-50" />
        <h3 className="text-lg font-semibold">Choose Your Path</h3>
        <p className="text-muted-foreground">No path challenges available yet.</p>
        {isGenerating && <p className="text-xs text-primary animate-pulse">Generating challenges...</p>}
      </div>
    );
  }

  if (finished) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 text-center space-y-4">
          <div className="relative inline-block">
            <Shield className="w-16 h-16 text-primary mx-auto" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs text-primary-foreground font-bold">✓</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold">Journey Complete</h2>
          <div className="inline-block bg-primary/10 rounded-xl px-6 py-3">
            <p className="text-sm text-muted-foreground">Wisdom Earned</p>
            <p className="text-3xl font-bold text-primary">{wisdomScore}</p>
          </div>
          <Button onClick={onRestart} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Walk Again
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Scene */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <PathScene step={index} total={pool.length} correct={lastCorrect} />
        <div className="px-4 py-3 flex items-center justify-between border-t border-border">
          <div className="flex items-center gap-2">
            <Footprints className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Step {index + 1} of {pool.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">{wisdomScore}</span>
          </div>
        </div>
      </div>

      {/* Decision Card */}
      <div className={cn(
        "rounded-2xl border-2 bg-card overflow-hidden transition-all duration-500",
        lastCorrect === true && "border-green-500/50",
        lastCorrect === false && "border-red-500/50",
        lastCorrect === null && "border-primary/30"
      )}>
        <div className="bg-gradient-to-r from-primary/10 to-transparent px-5 py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            ⚔️ Decision Point · {current.difficulty}
          </p>
          <h3 className="text-lg font-bold leading-snug">{current.question}</h3>
        </div>

        <div className="p-4 space-y-2.5">
          {current.options?.map((option, i) => {
            const correct = answered && option === current.correct_answer;
            const wrong = answered && option === selected && option !== current.correct_answer;
            const pathLabels = ["🛤️ Path A", "🌊 Path B", "🏔️ Path C", "🌾 Path D"];
            return (
              <button
                key={option}
                onClick={() => onSelect(option)}
                disabled={answered}
                className={cn(
                  "w-full p-4 rounded-xl text-left transition-all duration-300 border-2 group",
                  !answered && "border-border hover:border-primary hover:bg-primary/5 hover:translate-x-1",
                  correct && "border-green-500 bg-green-500/10 scale-[1.02]",
                  wrong && "border-red-500 bg-red-500/10",
                  answered && !correct && !wrong && "opacity-40 scale-[0.98]"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{pathLabels[i] || `Path ${i + 1}`}</p>
                    <span className="font-medium">{option}</span>
                  </div>
                  {correct && <CheckCircle className="w-5 h-5 text-green-500 animate-scale-in" />}
                  {wrong && <XCircle className="w-5 h-5 text-red-500 animate-scale-in" />}
                </div>
              </button>
            );
          })}
          {answered && (
            <Button className="w-full mt-2" onClick={onNext}>
              {index >= pool.length - 1 ? "🏁 Complete Journey" : "Continue Walking →"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChooseYourPath;
