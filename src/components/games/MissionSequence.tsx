import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RotateCcw, Star, Trophy, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MISSION_IMAGES } from "@/lib/missionArt";
import { Choice, MissionCampaign, StoryNode } from "@/data/missionStories";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const SpeechBubble = ({
  panel,
  visible,
}: {
  panel: { speaker: "narrator" | "character" | "voice"; name?: string; text: string };
  visible: boolean;
}) => (
  <div
    className={cn(
      "transition-all duration-300",
      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 h-0 overflow-hidden pointer-events-none"
    )}
  >
    {panel.name && (
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 ml-1">
        {panel.name}
      </p>
    )}
    <div
      className={cn(
        "relative max-w-[94%] rounded-2xl rounded-bl-sm border px-4 py-3 text-sm leading-relaxed",
        panel.speaker === "narrator" && "bg-muted/50 border-border text-muted-foreground italic",
        panel.speaker === "character" && "bg-muted border-border text-foreground",
        panel.speaker === "voice" && "bg-primary/10 border-primary/40 text-foreground"
      )}
    >
      {panel.text}
      <span
        aria-hidden
        className={cn(
          "absolute -left-1.5 bottom-2 w-3 h-3 rotate-45 border-l border-b",
          panel.speaker === "narrator" && "bg-muted/50 border-border",
          panel.speaker === "character" && "bg-muted border-border",
          panel.speaker === "voice" && "bg-primary/10 border-primary/40"
        )}
      />
    </div>
  </div>
);

interface Props {
  campaign: MissionCampaign;
  onExit: () => void;
  onComplete?: (xp: number) => void;
}

const MissionSequence = ({ campaign, onExit, onComplete }: Props) => {
  const [nodeId, setNodeId] = useState(campaign.startNode);
  const [visiblePanels, setVisiblePanels] = useState(0);
  const [xp, setXp] = useState(0);
  const [picked, setPicked] = useState<Choice | null>(null);
  const [path, setPath] = useState<string[]>([campaign.startNode]);

  const node: StoryNode | undefined = useMemo(
    () => campaign.nodes.find((n) => n.id === nodeId),
    [campaign, nodeId]
  );

  const art = (node?.art && MISSION_IMAGES[node.art]) || MISSION_IMAGES[campaign.art];

  // Reveal the panels of each scene one at a time.
  useEffect(() => {
    if (!node) return;
    const total = node.panels.length;
    if (prefersReducedMotion()) {
      setVisiblePanels(total);
      return;
    }
    setVisiblePanels(0);
    const timers = node.panels.map((_, i) => setTimeout(() => setVisiblePanels(i + 1), 450 + i * 750));
    return () => timers.forEach(clearTimeout);
  }, [node]);

  useEffect(() => {
    if (node?.ending === "victory") onComplete?.(xp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]);

  if (!node) return null;

  const allShown = visiblePanels >= node.panels.length;

  const choose = (choice: Choice) => {
    if (picked) return;
    setPicked(choice);
    setXp((prev) => prev + (choice.xp ?? 0));
  };

  const advance = () => {
    if (!picked) return;
    setNodeId(picked.next);
    setPath((prev) => [...prev, picked.next]);
    setPicked(null);
  };

  const restart = () => {
    setNodeId(campaign.startNode);
    setPath([campaign.startNode]);
    setXp(0);
    setPicked(null);
  };

  const sceneNumber = path.length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button onClick={onExit} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Missions
          </button>
          <div className="flex items-center gap-1.5 text-sm">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="font-bold">{xp} XP</span>
          </div>
        </div>
        <div>
          <h3 className="font-bold leading-tight">{campaign.character}: {campaign.title}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Scene {sceneNumber} · {node.reference || campaign.reference}
          </p>
        </div>
      </div>

      {/* Comic panel */}
      <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
        <div className="relative">
          <img
            key={art}
            src={art}
            alt={`Cartoon scene from the story of ${campaign.character}`}
            loading="lazy"
            width={768}
            height={768}
            className="w-full h-52 sm:h-64 object-cover animate-fade-in"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
        </div>

        <div className="px-4 pt-3 pb-4 space-y-3">
          {node.panels.map((panel, i) => (
            <SpeechBubble key={`${node.id}-${i}`} panel={panel} visible={i < visiblePanels} />
          ))}

          {!allShown && (
            <button
              type="button"
              onClick={() => setVisiblePanels(node.panels.length)}
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              Skip scene
            </button>
          )}

          {/* Choices */}
          {allShown && node.choices && (
            <div className="space-y-2.5 pt-1 animate-fade-in">
              {node.prompt && (
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{node.prompt}</p>
              )}
              {node.choices.map((choice) => {
                const isPicked = picked?.text === choice.text;
                return (
                  <div key={choice.text} className="flex justify-end">
                    <button
                      onClick={() => choose(choice)}
                      disabled={!!picked}
                      className={cn(
                        "max-w-[94%] rounded-2xl rounded-br-sm border-2 px-4 py-3 text-left text-sm transition-all duration-300",
                        !picked && "border-border bg-background hover:border-primary hover:bg-primary/5",
                        picked && !isPicked && "border-border opacity-40",
                        isPicked && choice.outcome === "bad" && "border-red-500 bg-red-500/10",
                        isPicked && choice.outcome !== "bad" && "border-green-500 bg-green-500/10"
                      )}
                    >
                      <span className="font-medium">{choice.text}</span>
                      {isPicked && (choice.xp ?? 0) > 0 && (
                        <span className="ml-2 text-xs font-bold text-primary">+{choice.xp} XP</span>
                      )}
                    </button>
                  </div>
                );
              })}

              {picked && (
                <Button className="w-full mt-2" onClick={advance}>
                  {picked.outcome === "bad" ? "See what happens →" : "Continue the story →"}
                </Button>
              )}
            </div>
          )}

          {/* Ending */}
          {allShown && node.ending && (
            <div className="pt-2 space-y-3 animate-scale-in">
              <div className="rounded-xl bg-primary/10 p-4 text-center space-y-1">
                <Trophy className="w-8 h-8 text-primary mx-auto" />
                <p className="font-bold">Mission complete</p>
                <p className="text-sm text-muted-foreground">
                  {campaign.character} · {xp} XP earned across {sceneNumber} scenes
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={restart}>
                  <RotateCcw className="w-4 h-4" /> Replay
                </Button>
                <Button className="flex-1" onClick={onExit}>Choose another hero</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MissionSequence;
