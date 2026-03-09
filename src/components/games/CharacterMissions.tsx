import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader2, RotateCcw, ShieldCheck, Trophy, XCircle, Swords, Star } from "lucide-react";
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

const MISSION_ICONS = ["⚔️", "🛡️", "🏹", "👑", "🔥", "⚡", "🗡️", "🌟", "💎", "🏰"];

const CharacterSilhouette = ({ missionIndex, difficulty }: { missionIndex: number; difficulty: string }) => {
  const colors = {
    easy: { primary: "hsl(var(--primary) / 0.6)", bg: "hsl(var(--primary) / 0.08)" },
    medium: { primary: "hsl(var(--primary) / 0.8)", bg: "hsl(var(--primary) / 0.12)" },
    hard: { primary: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.18)" },
  };
  const c = colors[difficulty as keyof typeof colors] || colors.easy;

  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24 mx-auto" aria-hidden>
      <defs>
        <radialGradient id={`char-glow-${missionIndex}`}>
          <stop offset="0%" stopColor={c.primary} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {/* Glow background */}
      <circle cx="60" cy="60" r="55" fill={c.bg} />
      <circle cx="60" cy="60" r="40" fill={`url(#char-glow-${missionIndex})`} opacity="0.4" className="animate-pulse" />
      {/* Shield body */}
      <path
        d="M60 20 L85 35 L85 65 Q85 90 60 105 Q35 90 35 65 L35 35 Z"
        fill={c.bg}
        stroke={c.primary}
        strokeWidth="2"
      />
      {/* Star center */}
      <polygon
        points="60,40 63,52 76,52 66,60 70,72 60,64 50,72 54,60 44,52 57,52"
        fill={c.primary}
      />
    </svg>
  );
};

const XpBar = ({ xp, missionsDone, total }: { xp: number; missionsDone: number; total: number }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Swords className="w-4 h-4 text-primary" />
        <span className="font-medium">Mission {missionsDone + 1} of {total}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Star className="w-4 h-4 text-primary fill-primary" />
        <span className="font-bold">{xp} XP</span>
      </div>
    </div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
        style={{ width: `${total > 0 ? ((missionsDone + 1) / total) * 100 : 0}%` }}
      />
    </div>
  </div>
);

const CharacterMissions = () => {
  const { games, loading, isOnline, refetch } = useBibleGames("character_missions");
  const { generateQuestions, isGenerating, shouldGenerate } = useQuestionGenerator();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [xp, setXp] = useState(0);
  const [finished, setFinished] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const missions = useMemo(
    () => [...games].sort((a, b) => rankDifficulty(b.difficulty) - rankDifficulty(a.difficulty)),
    [games]
  );
  const current = missions[index];

  useEffect(() => {
    if (!loading && games.length === 0 && isOnline && shouldGenerate("character_missions")) {
      void generateQuestions("character_missions", 5, { difficulty: "hard" }).then(() => refetch());
    }
  }, [games.length, generateQuestions, isOnline, loading, refetch, shouldGenerate]);

  // Flip card on new mission
  useEffect(() => {
    setFlipped(false);
    const t = setTimeout(() => setFlipped(true), 400);
    return () => clearTimeout(t);
  }, [index]);

  const selectAnswer = (option: string) => {
    if (!current || answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === current.correct_answer;
    if (correct) {
      setXp((prev) => prev + current.points);
      toast({ title: "⚔️ Mission success!", description: `+${current.points} XP` });
    } else {
      toast({ title: "💀 Mission failed", description: `Correct: ${current.correct_answer}`, variant: "destructive" });
    }
  };

  const nextMission = () => {
    if (index >= missions.length - 1) { setFinished(true); return; }
    setIndex((prev) => prev + 1);
    setSelected(null);
    setAnswered(false);
  };

  const restart = () => { setIndex(0); setSelected(null); setAnswered(false); setXp(0); setFinished(false); };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!current && !isGenerating && !finished) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
        <ShieldCheck className="w-12 h-12 text-primary mx-auto opacity-50" />
        <h3 className="text-lg font-semibold">Character Missions</h3>
        <p className="text-muted-foreground">No missions available yet.</p>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 text-center space-y-4">
          <Trophy className="w-16 h-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">All Missions Complete! ⚔️</h2>
          <div className="inline-block bg-primary/10 rounded-xl px-6 py-3">
            <p className="text-sm text-muted-foreground">Total XP Earned</p>
            <p className="text-3xl font-bold text-primary">{xp}</p>
          </div>
          <div className="flex gap-1 justify-center">
            {missions.map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-primary" />
            ))}
          </div>
          <Button onClick={restart} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" /> Replay Missions
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* XP Bar */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <XpBar xp={xp} missionsDone={index} total={missions.length} />
      </div>

      {/* Mission Card with flip effect */}
      <div className={cn(
        "rounded-2xl border-2 bg-card overflow-hidden transition-all duration-500",
        flipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        {/* Mission Header */}
        <div className="bg-gradient-to-br from-primary/15 via-transparent to-primary/5 p-6 text-center border-b border-border">
          <CharacterSilhouette missionIndex={index} difficulty={current.difficulty} />
          <div className="mt-3 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              {MISSION_ICONS[index % MISSION_ICONS.length]} Mission {index + 1}
            </p>
            <span className={cn(
              "inline-block px-3 py-0.5 rounded-full text-xs font-semibold",
              current.difficulty === "easy" && "bg-green-500/20 text-green-500",
              current.difficulty === "medium" && "bg-yellow-500/20 text-yellow-500",
              current.difficulty === "hard" && "bg-red-500/20 text-red-500"
            )}>
              {current.difficulty.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Mission Briefing */}
        <div className="px-5 py-4">
          <p className="text-xs text-muted-foreground mb-1">
            📖 {current.bible_reference || "Mission scripture"}
          </p>
          <h3 className="text-lg font-bold leading-snug">{current.question}</h3>
        </div>

        {/* Options */}
        <div className="px-4 pb-4 space-y-2.5">
          {current.options?.map((option) => {
            const correct = answered && option === current.correct_answer;
            const wrong = answered && option === selected && option !== current.correct_answer;
            return (
              <button
                key={option}
                onClick={() => selectAnswer(option)}
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
            <div className="space-y-3 mt-2">
              {current.hint && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground/80">
                  💡 {current.hint}
                </div>
              )}
              <Button className="w-full" onClick={nextMission}>
                {index >= missions.length - 1 ? "⚔️ Complete All Missions" : "Next Mission →"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterMissions;
