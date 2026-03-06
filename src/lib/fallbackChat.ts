/**
 * Fallback Chat Orchestrator
 * When the cloud AI is unavailable, uses:
 * 1. Transformers.js local model (if loaded)
 * 2. Bible keyword search (always available if Bible is downloaded)
 */

import { searchBible, formatSearchResults, findByReference, getTopicalVerses } from './bibleSearch';
import { generateLocalResponse, getModelStatus } from './localAI';
import { getBibleDownloadStatus } from './bibleData';

export interface FallbackResult {
  content: string;
  source: 'local-ai' | 'bible-search' | 'offline-message';
}

/**
 * Detect if the question is a Bible reference lookup
 */
const extractReference = (input: string): string | null => {
  const refMatch = input.match(
    /\b(\d?\s*(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation))\s+(\d+):?(\d+)?(?:-(\d+))?/i
  );
  return refMatch ? refMatch[0] : null;
};

/**
 * Extract topic keywords from a question
 */
const extractTopic = (input: string): string | null => {
  const topics = [
    'love', 'faith', 'hope', 'forgiveness', 'salvation', 'prayer',
    'strength', 'peace', 'wisdom', 'fear', 'joy', 'grace', 'comfort',
    'healing', 'anger', 'money', 'marriage', 'children', 'death',
  ];
  const lower = input.toLowerCase();
  return topics.find(t => lower.includes(t)) || null;
};

/**
 * Generate a fallback response when the cloud AI is unavailable.
 */
export const generateFallbackResponse = async (
  userMessage: string
): Promise<FallbackResult> => {
  const status = await getBibleDownloadStatus();
  const hasData = status.kjvCount > 0 || status.swCount > 0;
  const modelStatus = getModelStatus();

  // ── Step 1: Try Bible reference lookup ─────────────
  const ref = extractReference(userMessage);
  if (ref && hasData) {
    const refResults = await findByReference(ref);
    if (refResults.length > 0) {
      let content = `📖 **${ref}**\n\n`;
      for (const r of refResults) {
        content += `> *"${r.text}"*\n> — ${r.book} ${r.chapter}:${r.verse}\n\n`;
      }

      // If local AI is available, add an interpretation
      if (modelStatus.isLoaded) {
        const verseTexts = refResults.map(r => r.text).join(' ');
        const aiResponse = await generateLocalResponse(
          `What does this verse mean? ${ref}`,
          verseTexts
        );
        if (aiResponse) {
          content += `\n💡 **Quick Insight (offline AI):**\n${aiResponse}\n`;
        }
      }

      content += `\n_📴 You're offline. Connect for deeper AI-powered insights!_`;
      return { content, source: modelStatus.isLoaded ? 'local-ai' : 'bible-search' };
    }
  }

  // ── Step 2: Try topical search ─────────────────────
  const topic = extractTopic(userMessage);
  if (topic && hasData) {
    const topicResults = await getTopicalVerses(topic);
    if (topicResults.length > 0) {
      let content = formatSearchResults(topicResults, topic);

      // Enhance with local AI if available
      if (modelStatus.isLoaded) {
        const context = topicResults.slice(0, 3).map(r => r.text).join(' ');
        const aiResponse = await generateLocalResponse(userMessage, context);
        if (aiResponse) {
          content = `💡 **Scripture Guide (offline):**\n\n${aiResponse}\n\n---\n\n${content}`;
        }
      }

      return { content, source: modelStatus.isLoaded ? 'local-ai' : 'bible-search' };
    }
  }

  // ── Step 3: General keyword search ─────────────────
  if (hasData) {
    const searchResults = await searchBible(userMessage);
    if (searchResults.length > 0) {
      let content = formatSearchResults(searchResults, userMessage);

      // Enhance with local AI
      if (modelStatus.isLoaded) {
        const context = searchResults.slice(0, 3).map(r => r.text).join(' ');
        const aiResponse = await generateLocalResponse(userMessage, context);
        if (aiResponse) {
          content = `💡 **Scripture Guide (offline):**\n\n${aiResponse}\n\n---\n\n${content}`;
        }
      }

      return { content, source: modelStatus.isLoaded ? 'local-ai' : 'bible-search' };
    }
  }

  // ── Step 4: Local AI only (no search results) ──────
  if (modelStatus.isLoaded) {
    const aiResponse = await generateLocalResponse(userMessage);
    if (aiResponse) {
      return {
        content: `💡 **Scripture Guide (offline AI):**\n\n${aiResponse}\n\n_📴 You're offline. Answers may be limited. Connect for full AI-powered insights!_`,
        source: 'local-ai',
      };
    }
  }

  // ── Step 5: No data, no model — show helpful message ──
  return {
    content: `📴 **You're currently offline**\n\nI can't reach the cloud AI right now. To use Scripture Guide offline:\n\n` +
      `1. **Download the Bible** — Go to Settings and download KJV/Swahili Bible for offline search\n` +
      `2. **Download AI Model** — Enable the Qwen2.5 offline AI model (~400MB) for smarter responses\n\n` +
      `Once downloaded, I can search verses and answer questions even without internet! 🙏`,
    source: 'offline-message',
  };
};
