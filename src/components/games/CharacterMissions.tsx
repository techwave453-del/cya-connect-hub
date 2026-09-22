import { useState } from "react";
import { ArrowLeft, Sword, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { MISSION_IMAGES } from "@/lib/missionArt";
import { MISSION_CAMPAIGNS, getCampaign } from "@/data/missionStories";
import MissionSequence from "./MissionSequence";
import QuickfireMissions from "./QuickfireMissions";

const STORAGE_KEY = "character_missions_completed";

const loadCompleted = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const CharacterMissions = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [quickfire, setQuickfire] = useState(false);
  const [completed, setCompleted] = useState<Record<string, number>>(loadCompleted);

  const campaign = selected ? getCampaign(selected) : undefined;

  const handleComplete = (id: string, xp: number) => {
    setCompleted((prev) => {
      const next = { ...prev, [id]: Math.max(prev[id] ?? 0, xp) };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  if (campaign) {
    return (
      <MissionSequence
        campaign={campaign}
        onExit={() => setSelected(null)}
        onComplete={(xp) => handleComplete(campaign.id, xp)}
      />
    );
  }

  if (quickfire) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setQuickfire(false)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Missions
        </button>
        <QuickfireMissions />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold flex items-center gap-2">
          <Sword className="w-4 h-4 text-primary" /> Character Missions
        </h3>
        <p className="text-sm text-muted-foreground">
          Step into a Bible hero's story. Your choices decide how the mission unfolds.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MISSION_CAMPAIGNS.map((c) => {
          const best = completed[c.id];
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className="group text-left rounded-2xl border-2 border-border bg-card overflow-hidden transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="relative h-32">
                <img
                  src={MISSION_IMAGES[c.art]}
                  alt={`Cartoon illustration of ${c.character}`}
                  loading="lazy"
                  width={768}
                  height={768}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card to-transparent" />
                <span className={cn(
                  "absolute top-2 right-2 rounded-full px-2.5 py-1 text-[10px] font-bold",
                  c.difficulty === "easy" && "bg-green-500/20 text-green-500",
                  c.difficulty === "medium" && "bg-yellow-500/20 text-yellow-500",
                  c.difficulty === "hard" && "bg-red-500/20 text-red-500"
                )}>
                  {c.difficulty.toUpperCase()}
                </span>
                {best !== undefined && (
                  <span className="absolute top-2 left-2 rounded-full bg-primary/90 text-primary-foreground px-2.5 py-1 text-[10px] font-bold">
                    Best {best} XP
                  </span>
                )}
              </div>
              <div className="p-4 space-y-1">
                <p className="font-bold leading-tight">{c.character}: {c.title}</p>
                <p className="text-sm text-muted-foreground">{c.blurb}</p>
                <p className="text-xs text-muted-foreground">📖 {c.reference}</p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setQuickfire(true)}
        className="w-full rounded-2xl border border-dashed border-border bg-card p-4 text-left hover:border-primary transition-colors"
      >
        <p className="font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Quickfire missions
        </p>
        <p className="text-sm text-muted-foreground">One-question missions from the question bank.</p>
      </button>
    </div>
  );
};

export default CharacterMissions;
