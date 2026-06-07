/**
 * Scripture Bot — lightweight, purpose-built offline Bible assistant.
 *
 * Replaces the previous Transformers.js Qwen2.5 LLM (~400MB) which crashed
 * many devices once loaded. This bot is rule-based: it leans on the
 * already-downloaded Bible data + curated templates for common spiritual
 * questions. Zero download, near-zero memory, instant responses.
 *
 * The exported API is intentionally identical to the old localAI module so
 * callers (fallbackChat, BibleDownloadManager, InlineBibleDownload) work
 * unchanged.
 */

import { searchBible, getTopicalVerses, findByReference, fuzzySearchBible, formatCitations, SearchResult } from './bibleSearch';
import { getBibleDownloadStatus } from './bibleData';

const STORAGE_KEY = 'scripture-bot-enabled';

let isEnabled = false;
let isLoadingModel = false;
let loadError: string | null = null;
let loadProgress = 0;

// Restore enabled state across reloads
try {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1') {
    isEnabled = true;
  }
} catch {
  /* ignore */
}

export const getModelStatus = () => ({
  isLoaded: isEnabled,
  isLoading: isLoadingModel,
  error: loadError,
  progress: loadProgress,
});

/**
 * Scripture Bot is lightweight — every device can run it safely.
 */
export const checkDeviceCapability = (): { safe: boolean; memoryGB?: number; warning?: string } => {
  const memGB = (navigator as any).deviceMemory;
  return { safe: true, memoryGB: typeof memGB === 'number' ? memGB : undefined };
};

/**
 * "Enable" the offline bot. No download, instant.
 */
export const loadModel = async (
  onProgress?: (progress: number, message: string) => void
): Promise<boolean> => {
  if (isEnabled) return true;
  isLoadingModel = true;
  loadError = null;
  try {
    onProgress?.(20, 'Preparing Scripture Bot...');
    await new Promise(r => setTimeout(r, 100));
    onProgress?.(70, 'Indexing Bible references...');
    await new Promise(r => setTimeout(r, 100));
    isEnabled = true;
    loadProgress = 100;
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    onProgress?.(100, 'Scripture Bot ready!');
    return true;
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to enable Scripture Bot';
    onProgress?.(0, `Error: ${loadError}`);
    return false;
  } finally {
    isLoadingModel = false;
  }
};

export const isModelCached = (): boolean => isEnabled;

export const unloadModel = () => {
  isEnabled = false;
  loadProgress = 0;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
};

// ──────────────────────────────────────────────────────────────────────
// Scripture Bot intelligence
// ──────────────────────────────────────────────────────────────────────

interface Intent {
  topic?: string;
  reference?: string;
  isGreeting?: boolean;
  isThanks?: boolean;
  isPrayerRequest?: boolean;
  isWhoIs?: string;
  isMeaning?: boolean;
  isHelp?: boolean;
}

const TOPIC_MAP: Record<string, string[]> = {
  love: ['love', 'upendo', 'mapenzi', 'penda'],
  faith: ['faith', 'believe', 'imani', 'amini'],
  hope: ['hope', 'tumaini'],
  forgiveness: ['forgive', 'forgiveness', 'samehe', 'msamaha'],
  salvation: ['salvation', 'saved', 'wokovu', 'okoka'],
  prayer: ['pray', 'prayer', 'omba', 'maombi', 'sala'],
  strength: ['strength', 'strong', 'nguvu', 'imara'],
  peace: ['peace', 'amani', 'utulivu'],
  wisdom: ['wisdom', 'wise', 'hekima', 'busara'],
  fear: ['fear', 'afraid', 'scared', 'hofu', 'woga'],
  joy: ['joy', 'happy', 'rejoice', 'furaha'],
  grace: ['grace', 'neema'],
  comfort: ['comfort', 'sad', 'depressed', 'lonely', 'faraja', 'huzuni'],
  healing: ['heal', 'healing', 'sick', 'ponya', 'mgonjwa', 'afya'],
  anger: ['anger', 'angry', 'hasira'],
  money: ['money', 'riches', 'wealth', 'pesa', 'utajiri'],
  marriage: ['marriage', 'husband', 'wife', 'ndoa', 'mume', 'mke'],
  children: ['children', 'parenting', 'watoto', 'mtoto'],
  death: ['death', 'die', 'grief', 'kifo', 'mauti'],
};

const TOPIC_INTROS: Record<string, string> = {
  love: "God's love is the heart of the Bible. Here are some verses to encourage you:",
  faith: "Faith is trusting God even when we can't see the full picture. Reflect on these:",
  hope: "Hope in God is an anchor for the soul. Hold on to these promises:",
  forgiveness: "Forgiveness — both receiving and giving — sets the heart free. Consider these:",
  salvation: "Salvation is God's free gift through Jesus. Read these carefully:",
  prayer: "Prayer is simply talking with God. Let these verses guide you:",
  strength: "When you feel weak, God's strength meets you. Lean on these:",
  peace: "God's peace guards the heart. Breathe and reflect on these:",
  wisdom: "Wisdom begins with reverence for God. Soak in these:",
  fear: "God repeatedly tells us, \"Do not be afraid.\" Take courage from these:",
  joy: "Joy in the Lord is your strength. Smile through these verses:",
  grace: "Grace is unearned favor — and you have it. Rest in these:",
  comfort: "God draws near to the broken-hearted. May these verses comfort you:",
  healing: "God is the great Healer of body, mind, and spirit. Pray through these:",
  anger: "Scripture invites us to be slow to anger. Reflect on these:",
  money: "The Bible says a lot about money and the heart. Consider these:",
  marriage: "God designed marriage with love and honor at the center. Read these:",
  children: "Children are a gift and a calling. Reflect on these:",
  death: "In Christ, death is not the end. Find hope in these:",
};

const GREETING_RESPONSES = [
  "Hey there! 👋 I'm Scripture Guide — ready to explore the Bible with you. Ask me about a topic, a verse, or anything on your heart.",
  "Hi! 🙏 What part of scripture can I walk through with you today?",
  "Hello, friend. Ask me about any verse, story, or topic — I'm here.",
];

const detectIntent = (input: string): Intent => {
  const lower = input.toLowerCase().trim();
  const intent: Intent = {};

  if (/^(hi|hey|hello|niaje|sasa|mambo|habari|vipi)\b/.test(lower)) intent.isGreeting = true;
  if (/(thank|thanks|asante|shukrani)/.test(lower)) intent.isThanks = true;
  if (/(pray for me|niombee|please pray|naomba uniombee)/.test(lower)) intent.isPrayerRequest = true;
  if (/^(help|msaada|what can you do|nisaidie)/.test(lower)) intent.isHelp = true;
  if (/(what does .* mean|meaning of|maana ya|inamaanisha nini)/.test(lower)) intent.isMeaning = true;

  const whoMatch = lower.match(/who (?:is|was) ([a-z\s]+?)(?:\?|$|in the bible)/);
  if (whoMatch) intent.isWhoIs = whoMatch[1].trim();

  const refMatch = input.match(
    /\b(\d?\s*(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation))\s+(\d+):?(\d+)?(?:-(\d+))?/i
  );
  if (refMatch) intent.reference = refMatch[0];

  for (const [topic, words] of Object.entries(TOPIC_MAP)) {
    if (words.some(w => lower.includes(w))) {
      intent.topic = topic;
      break;
    }
  }

  return intent;
};

const formatVerses = (results: SearchResult[], limit = 3): string =>
  results
    .slice(0, limit)
    .map(r => `> *"${r.text.trim()}"*\n> — **${r.book} ${r.chapter}:${r.verse}**`)
    .join('\n\n');

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Generate a Scripture Guide response using rules + the offline Bible.
 * Maintains the same signature as the old LLM-based generator.
 */
export const generateLocalResponse = async (
  prompt: string,
  context?: string
): Promise<string | null> => {
  if (!isEnabled) return null;

  try {
    const intent = detectIntent(prompt);
    const status = await getBibleDownloadStatus();
    const hasBible = status.kjvCount > 0 || status.swCount > 0;

    if (intent.isGreeting) return pick(GREETING_RESPONSES);

    if (intent.isThanks) {
      return "You're so welcome! 🙏 May God bless your study of His Word. Ask me anything else whenever you're ready.";
    }

    if (intent.isHelp) {
      return [
        "Here's how I can help you offline:",
        "",
        "• **Look up a verse** — try `John 3:16` or `Psalm 23`",
        "• **Explore a topic** — ask about *love, faith, peace, fear, healing, prayer*…",
        "• **Bible characters** — ask `who is David?` or `who was Esther?`",
        "• **Search any phrase** — I'll find matching verses",
        "",
        "I work without internet as long as you've downloaded the Bible. 📖",
      ].join('\n');
    }

    if (intent.isPrayerRequest) {
      return [
        "I'd love to pray with you. 🙏",
        "",
        "*Father, thank You for hearing every cry of Your child. Meet them right where they are — bring peace where there's worry, hope where there's fear, and clarity where there's confusion. Wrap them in Your love today. In Jesus' name, amen.*",
        "",
        "> *\"Cast all your anxiety on him because he cares for you.\"* — **1 Peter 5:7**",
      ].join('\n');
    }

    // Bible reference lookup
    if (intent.reference && hasBible) {
      const verses = await findByReference(intent.reference);
      if (verses.length) {
        const intro = intent.isMeaning
          ? `📖 Here's **${intent.reference}**. As you read, notice who is speaking, who they're speaking to, and what God is revealing about Himself:`
          : `📖 **${intent.reference}**`;
        return `${intro}\n\n${formatVerses(verses, 8)}\n\n💡 *Reflect: what is this passage inviting you to believe, to do, or to pray?*`;
      }
    }

    // "Who is..." characters
    if (intent.isWhoIs && hasBible) {
      const name = intent.isWhoIs.replace(/\bin the bible\b/g, '').trim();
      if (name.length > 1) {
        const verses = await searchBible(name, { maxResults: 4 });
        if (verses.length) {
          return `📖 Here are passages that mention **${name}**:\n\n${formatVerses(verses, 4)}\n\n💡 *Read the surrounding chapters for the full story.*`;
        }
      }
    }

    // Topical
    if (intent.topic && hasBible) {
      const verses = await getTopicalVerses(intent.topic);
      if (verses.length) {
        const intro = TOPIC_INTROS[intent.topic] || `Here are verses about **${intent.topic}**:`;
        return `${intro}\n\n${formatVerses(verses, 4)}\n\n💡 *Pick one verse and sit with it for a few minutes today.*`;
      }
    }

    // Free-text: fuzzy search with citations (typo-tolerant, stem-aware)
    if (hasBible) {
      let verses = await fuzzySearchBible(prompt, { maxResults: 5 });
      // If fuzzy returns nothing, fall back to plain keyword search
      if (verses.length === 0) {
        verses = await searchBible(prompt, { maxResults: 5 });
      }
      if (verses.length) {
        const header = `📖 **Top matches for "${prompt.trim()}"**`;
        const body = formatCitations(verses, header);
        return `${body}\n\n💡 *Tap any reference in your Bible app to read the surrounding passage. Refine your search with a topic, character name, or full reference for more results.*`;
      }
    }

    // Nothing matched
    if (context) {
      return `📖 Reflect on this scripture:\n\n> *${context.slice(0, 400).trim()}*\n\n💡 *Read it slowly. What stands out to you?*`;
    }

    return [
      "I want to help, but I couldn't find a clear match in the offline Bible.",
      "",
      "Try:",
      "• A reference like `Romans 8:28`",
      "• A topic like `peace`, `forgiveness`, or `hope`",
      "• `who is Moses?`",
      "",
      "Connect to the internet for deeper AI-powered answers. 🌐",
    ].join('\n');
  } catch (err) {
    console.error('[ScriptureBot] generation error:', err);
    return null;
  }
};
