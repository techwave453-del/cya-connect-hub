import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader2, RotateCcw, ShieldCheck, Trophy, XCircle, Swords, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useBibleGames, BibleGame } from "@/hooks/useBibleGames";
import { useQuestionGenerator } from "@/hooks/useQuestionGenerator";
import { getMissionArt, buildMissionScene } from "@/lib/missionArt";

const rankDifficulty = (difficulty: BibleGame["difficulty"]): number => {
  if (difficulty === "hard") return 3;
  if (difficulty === "medium") return 2;
  return 1;
};

const MISSION_ICONS = ["⚔️", "🛡️", "🏹", "👑", "🔥", "⚡", "🗡️", "🌟", "💎", "🏰"];

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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

const SpeechBubble = ({
  children,
  tone = "character",
  visible,
}: {
  children: React.ReactNode;
  tone?: "narration" | "character" | "question";
  visible: boolean;
}) => (
  <div
    className={cn(
      "flex transition-all duration-300",
      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none h-0 overflow-hidden"
    )}
  >
    <div
      className={cn(
        "relative max-w-[92%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed border",
        tone === "narration" && "bg-muted/60 border-border text-muted-foreground italic",
        tone === "character" && "bg-muted border-border text-foreground",
        tone === "question" && "bg-primary/10 border-primary/40 text-foreground font-semibold"
      )}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          "absolute -left-1.5 bottom-2 w-3 h-3 rotate-45 border-l border-b",
          tone === "narration" && "bg-muted/60 border-border",
          tone === "character" && "bg-muted border-border",
          tone === "question" && "bg-primary/10 border-primary/40"
        )}
      />
    </div>
  </div>
);

/** Single-question comic missions generated from the question bank. */
const QuickfireMissions = () => {
  const { games, loading, isOnline, refetch } = useBibleGames("character_missions");
  const { generateQuestions, isGenerating, shouldGenerate } = useQuestionGenerator();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [xp, setXp] = useState(0);
  const [finished, setFinished] = useState(false);
  const [step, setStep] = useState(0);

  const missions = useMemo(
    () => [...games].sort((a, b) => rankDifficulty(b.difficulty) - rankDifficulty(a.difficulty)),
    [games]
  );
  const current = missions[index];

  const scene = useMemo(() => (current ? buildMissionScene(current.question) : null), [current]);
  const art = useMemo(
    () => (current ? getMissionArt(current.question, current.bible_reference, current.difficulty) : null),
    [current]
  );

  useEffect(() => {
    if (!loading && games.length === 0 && isOnline && shouldGenerate("character_missions")) {
      void generateQuestions("character_missions", 5, { difficulty: "hard" }).then(() => refetch());
    }
  }, [games.length, generateQuestions, isOnline, loading, refetch, shouldGenerate]);

  useEffect(() => {
    if (!scene) return;
    if (prefersReducedMotion()) {
      setStep(3);
      return;
    }
    setStep(0);
    const timers = [500, 1200, 1900].map((delay, i) => setTimeout(() => setStep(i + 1), delay));
    return () => timers.forEach(clearTimeout);
  }, [index, scene]);

  const skipAhead = () => setStep(3);

  const selectAnswer = (option: string) => {
    if (!current || answered) return;
    setSelected(option);
    setAnswered(true);
    if (option === current.correct_answer) {
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
        <h3 className="text-lg font-semibold">Quickfire missions</h3>
        <p className="text-muted-foreground">No quickfire missions available yet.</p>
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
          <Button onClick={restart} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" /> Replay Missions
          </Button>
        </div>
      </div>
    );
  }

  if (!current || !scene || !art) return null;

  const dialogueDone = step >= 3;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-2xl border border-border bg-card p-4">
        <XpBar xp={xp} missionsDone={index} total={missions.length} />
      </div>

      <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
        <div className="relative">
          <img
            key={art.src}
            src={art.src}
            alt={art.alt}
            loading="lazy"
            width={768}
            height={768}
            className="w-full h-52 sm:h-64 object-cover animate-fade-in"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="rounded-full bg-background/85 backdrop-blur px-3 py-1 text-xs font-semibold">
              {MISSION_ICONS[index % MISSION_ICONS.length]} Mission {index + 1}
            </span>
            <span className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide",
              current.difficulty === "easy" && "bg-green-500/20 text-green-500",
              current.difficulty === "medium" && "bg-yellow-500/20 text-yellow-500",
              current.difficulty === "hard" && "bg-red-500/20 text-red-500"
            )}>
              {current.difficulty.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="px-4 pt-3 pb-4 space-y-2.5" onClick={dialogueDone ? undefined : skipAhead}>
          <p className="text-xs text-muted-foreground">📖 {current.bible_reference || "Mission scripture"}</p>

          {scene.narration && (
            <SpeechBubble tone="narration" visible={step >= 1}>{scene.narration}</SpeechBubble>
          )}
          {scene.situation && (
            <SpeechBubble tone="character" visible={step >= (scene.narration ? 2 : 1)}>
              {scene.situation}
            </SpeechBubble>
          )}
          <SpeechBubble tone="question" visible={dialogueDone}>{scene.question}</SpeechBubble>

          {!dialogueDone && (
            <button type="button" onClick={skipAhead} className="text-xs text-muted-foreground underline underline-offset-2">
              Skip scene
            </button>
          )}
        </div>

        {dialogueDone && (
          <div className="px-4 pb-4 space-y-2.5 animate-fade-in">
            {current.options?.map((option) => {
              const correct = answered && option === current.correct_answer;
              const wrong = answered && option === selected && option !== current.correct_answer;
              return (
                <div key={option} className="flex justify-end">
                  <button
                    onClick={() => selectAnswer(option)}
                    disabled={answered}
                    className={cn(
                      "relative max-w-[92%] rounded-2xl rounded-br-sm border-2 px-4 py-3 text-left text-sm transition-all duration-300",
                      !answered && "border-border bg-background hover:border-primary hover:bg-primary/5",
                      answered && !correct && !wrong && "border-border opacity-40",
                      correct && "border-green-500 bg-green-500/10 scale-[1.02]",
                      wrong && "border-red-500 bg-red-500/10"
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{option}</span>
                      {correct && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                      {wrong && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                    </span>
                  </button>
                </div>
              );
            })}

            {answered && (
              <div className="space-y-3 mt-2">
                <SpeechBubble tone="character" visible>
                  {selected === current.correct_answer
                    ? "⚔️ Well done — that is exactly it!"
                    : `Not quite. The right answer is: ${current.correct_answer}`}
                </SpeechBubble>
                {current.hint && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground/80">💡 {current.hint}</div>
                )}
                <Button className="w-full" onClick={nextMission}>
                  {index >= missions.length - 1 ? "⚔️ Complete All Missions" : "Next Mission →"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickfireMissions;
