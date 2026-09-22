import noah from "@/assets/missions/noah.jpg";
import gideon from "@/assets/missions/gideon.jpg";
import elijah from "@/assets/missions/elijah.jpg";
import esther from "@/assets/missions/esther.jpg";
import jeremiah from "@/assets/missions/jeremiah.jpg";
import ananias from "@/assets/missions/ananias.jpg";
import eliezer from "@/assets/missions/eliezer.jpg";
import advisor from "@/assets/missions/advisor.jpg";
import prophet from "@/assets/missions/prophet.jpg";
import king from "@/assets/missions/king.jpg";
import warrior from "@/assets/missions/warrior.jpg";
import woman from "@/assets/missions/woman.jpg";
import disciple from "@/assets/missions/disciple.jpg";
import shepherd from "@/assets/missions/shepherd.jpg";

/** Reusable cartoon illustration set, keyed by scene name. */
export const MISSION_IMAGES = {
  noah,
  gideon,
  elijah,
  esther,
  jeremiah,
  ananias,
  eliezer,
  advisor,
  prophet,
  king,
  warrior,
  woman,
  disciple,
  shepherd,
} as const;

export type MissionImageKey = keyof typeof MISSION_IMAGES;

export interface MissionArt {
  src: string;
  alt: string;
}

/** Keyword -> reusable illustration. First match wins, so keep specific names first. */
const KEYWORD_ART: { keywords: string[]; art: MissionArt }[] = [
  { keywords: ["noah", "ark"], art: { src: noah, alt: "Cartoon drawing of Noah building the ark" } },
  { keywords: ["gideon", "midian"], art: { src: gideon, alt: "Cartoon drawing of Gideon with a torch by the stream" } },
  { keywords: ["elijah", "carmel", "baal"], art: { src: elijah, alt: "Cartoon drawing of Elijah on the mountain" } },
  { keywords: ["esther", "ahasuerus", "haman", "mordecai"], art: { src: esther, alt: "Cartoon drawing of Queen Esther" } },
  { keywords: ["jeremiah", "anathoth"], art: { src: jeremiah, alt: "Cartoon drawing of Jeremiah with a clay jar and deed" } },
  { keywords: ["ananias", "damascus", "saul", "tarsus"], art: { src: ananias, alt: "Cartoon drawing of Ananias of Damascus" } },
  { keywords: ["eliezer", "rebekah", "camel", "well"], art: { src: eliezer, alt: "Cartoon drawing of Abraham's servant at the well" } },
  { keywords: ["hushai", "ahithophel", "counsel", "advisor"], art: { src: advisor, alt: "Cartoon drawing of a royal advisor beside a throne" } },
  { keywords: ["david", "shepherd", "sheep", "lamb", "psalm"], art: { src: shepherd, alt: "Cartoon drawing of a shepherd boy" } },
  { keywords: ["ruth", "mary", "martha", "hannah", "deborah", "sarah", "queen", "woman", "she "], art: { src: woman, alt: "Cartoon drawing of a woman of faith" } },
  { keywords: ["peter", "paul", "john", "disciple", "apostle", "church", "acts"], art: { src: disciple, alt: "Cartoon drawing of a young disciple on the road" } },
  { keywords: ["joshua", "jericho", "soldier", "army", "battle", "samson", "sword"], art: { src: warrior, alt: "Cartoon drawing of a biblical soldier before city walls" } },
  { keywords: ["king", "solomon", "saul ", "throne", "palace", "hezekiah", "josiah"], art: { src: king, alt: "Cartoon drawing of a biblical king on his throne" } },
  { keywords: ["prophet", "isaiah", "ezekiel", "daniel", "moses", "samuel", "vision", "lord said"], art: { src: prophet, alt: "Cartoon drawing of a prophet holding a scroll" } },
];

const FALLBACK: Record<string, MissionArt> = {
  easy: { src: shepherd, alt: "Cartoon drawing of a shepherd boy" },
  medium: { src: disciple, alt: "Cartoon drawing of a young disciple on the road" },
  hard: { src: prophet, alt: "Cartoon drawing of a prophet holding a scroll" },
};

export const getMissionArt = (
  text: string,
  reference?: string | null,
  difficulty: string = "medium"
): MissionArt => {
  const haystack = `${text} ${reference ?? ""}`.toLowerCase();
  for (const entry of KEYWORD_ART) {
    if (entry.keywords.some((k) => haystack.includes(k))) return entry.art;
  }
  return FALLBACK[difficulty] ?? FALLBACK.medium;
};

export interface MissionScene {
  /** Short scene-setting narration, e.g. "You are Noah." */
  narration: string | null;
  /** What the character says about the situation. */
  situation: string | null;
  /** The actual question posed to the player. */
  question: string;
}

/**
 * Splits a mission prompt like
 * "MISSION: You are Noah. The Lord has commanded ... What materials must you use?"
 * into narration / situation / question bubbles. Falls back to a single
 * question bubble for prompts that don't follow that shape.
 */
export const buildMissionScene = (raw: string): MissionScene => {
  const text = raw.replace(/^\s*mission\s*:\s*/i, "").trim();

  // Split into sentences, keeping their punctuation.
  const sentences = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];

  if (sentences.length === 1) {
    return { narration: null, situation: null, question: sentences[0] };
  }

  // The question is the trailing sentence(s) that end with "?" — usually the last one.
  const question = sentences[sentences.length - 1];
  const rest = sentences.slice(0, -1);

  let narration: string | null = null;
  let situation: string | null = null;

  if (/^you are\b/i.test(rest[0])) {
    narration = rest[0];
    situation = rest.slice(1).join(" ") || null;
  } else {
    situation = rest.join(" ");
  }

  return { narration, situation, question };
};
