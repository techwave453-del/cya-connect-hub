/**
 * Bible Search Engine — keyword and fuzzy search across cached Bible data
 */

import { getAllBooks, BibleBook, BibleLanguage, BOOK_DISPLAY_NAMES } from './bibleData';

export interface SearchResult {
  book: string;
  chapter: string;
  verse: string;
  text: string;
  language: BibleLanguage;
  relevance: number; // 0-1
}

/**
 * Search Bible verses by keyword(s).
 * Returns top N results sorted by relevance.
 */
export const searchBible = async (
  query: string,
  options?: {
    language?: BibleLanguage;
    maxResults?: number;
    bookFilter?: string;
  }
): Promise<SearchResult[]> => {
  const { language, maxResults = 20, bookFilter } = options || {};
  const books = await getAllBooks(language);

  if (books.length === 0) return [];

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2)
    .map(w => w.replace(/[^a-z0-9]/gi, ''));

  if (keywords.length === 0) return [];

  const results: SearchResult[] = [];

  for (const book of books) {
    if (bookFilter && !book.book.toLowerCase().includes(bookFilter.toLowerCase())) continue;

    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        const textLower = verse.text.toLowerCase();
        let matchCount = 0;
        let exactMatch = false;

        // Check full query match first
        if (textLower.includes(query.toLowerCase())) {
          exactMatch = true;
          matchCount = keywords.length;
        } else {
          // Count keyword matches
          for (const kw of keywords) {
            if (textLower.includes(kw)) matchCount++;
          }
        }

        if (matchCount > 0) {
          const relevance = exactMatch
            ? 1.0
            : matchCount / keywords.length;

          results.push({
            book: book.book,
            chapter: chapter.chapter,
            verse: verse.verse,
            text: verse.text,
            language: book.language,
            relevance,
          });
        }
      }
    }
  }

  // Sort by relevance descending, then by book order
  results.sort((a, b) => b.relevance - a.relevance);
  return results.slice(0, maxResults);
};

/**
 * Find verses by Bible reference (e.g., "John 3:16")
 */
export const findByReference = async (
  reference: string,
  language: BibleLanguage = 'en'
): Promise<SearchResult[]> => {
  // Parse reference like "John 3:16" or "1 Corinthians 13:4-7"
  const match = reference.match(/^(\d?\s*\w+)\s+(\d+):?(\d+)?(?:-(\d+))?$/i);
  if (!match) return [];

  const [, bookPart, chapterStr, verseStart, verseEnd] = match;
  const chapter = parseInt(chapterStr);
  const books = await getAllBooks(language);

  const bookNameNorm = bookPart.trim().toLowerCase().replace(/\s+/g, '');

  for (const book of books) {
    const bookNorm = book.book.toLowerCase().replace(/\s+/g, '');
    if (!bookNorm.includes(bookNameNorm) && !bookNameNorm.includes(bookNorm)) continue;

    const ch = book.chapters.find(c => c.chapter === String(chapter));
    if (!ch) continue;

    if (verseStart) {
      const start = parseInt(verseStart);
      const end = verseEnd ? parseInt(verseEnd) : start;

      return ch.verses
        .filter(v => {
          const vNum = parseInt(v.verse);
          return vNum >= start && vNum <= end;
        })
        .map(v => ({
          book: book.book,
          chapter: ch.chapter,
          verse: v.verse,
          text: v.text,
          language: book.language,
          relevance: 1.0,
        }));
    }

    // Return whole chapter
    return ch.verses.map(v => ({
      book: book.book,
      chapter: ch.chapter,
      verse: v.verse,
      text: v.text,
      language: book.language,
      relevance: 1.0,
    }));
  }

  return [];
};

/**
 * Format search results into a readable response
 */
export const formatSearchResults = (
  results: SearchResult[],
  query: string
): string => {
  if (results.length === 0) {
    return `I couldn't find any verses matching "${query}" in the downloaded Bible data. Try downloading the Bible for offline access first! 📖`;
  }

  const topResults = results.slice(0, 5);
  let response = `📖 **Here's what I found about "${query}"** (offline search):\n\n`;

  for (const r of topResults) {
    response += `> *"${r.text}"*\n> — **${r.book} ${r.chapter}:${r.verse}**\n\n`;
  }

  if (results.length > 5) {
    response += `_...and ${results.length - 5} more results._\n\n`;
  }

  response += `💡 *This is from your offline Bible. Connect to the internet for AI-powered deeper insights!*`;
  return response;
};

/**
 * Get a topical response by searching common Bible themes
 */
export const getTopicalVerses = async (
  topic: string,
  language: BibleLanguage = 'en'
): Promise<SearchResult[]> => {
  // Map common topics to relevant search terms
  const topicKeywords: Record<string, string[]> = {
    love: ['love', 'loveth', 'beloved', 'charity'],
    faith: ['faith', 'believe', 'trust', 'faithful'],
    hope: ['hope', 'expectation', 'wait upon'],
    forgiveness: ['forgive', 'forgiven', 'pardon', 'mercy'],
    salvation: ['salvation', 'saved', 'saviour', 'redeem'],
    prayer: ['pray', 'prayer', 'supplication', 'intercession'],
    strength: ['strength', 'strong', 'mighty', 'power'],
    peace: ['peace', 'peaceful', 'rest', 'still'],
    wisdom: ['wisdom', 'wise', 'understanding', 'knowledge'],
    fear: ['fear not', 'afraid', 'courage', 'bold'],
    joy: ['joy', 'rejoice', 'glad', 'delight'],
    grace: ['grace', 'gracious', 'favour', 'mercy'],
    comfort: ['comfort', 'consolation', 'strengthen'],
    healing: ['heal', 'healed', 'health', 'whole'],
    anger: ['anger', 'wrath', 'slow to anger', 'patient'],
    money: ['riches', 'treasure', 'mammon', 'wealth'],
    marriage: ['husband', 'wife', 'marry', 'bride'],
    children: ['children', 'child', 'son', 'daughter'],
    death: ['death', 'die', 'eternal life', 'resurrection'],
  };

  const topicLower = topic.toLowerCase();
  const searchTerms = topicKeywords[topicLower] || [topicLower];

  const allResults: SearchResult[] = [];
  for (const term of searchTerms) {
    const results = await searchBible(term, { language, maxResults: 5 });
    allResults.push(...results);
  }

  // Deduplicate by book+chapter+verse
  const seen = new Set<string>();
  const unique = allResults.filter(r => {
    const key = `${r.book}-${r.chapter}-${r.verse}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
};

// ──────────────────────────────────────────────────────────────────────
// Fuzzy search — typo-tolerant, stem-aware, phrase-boosted
// ──────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the','a','an','of','to','in','on','for','and','or','but','is','are','was',
  'were','be','been','being','have','has','had','do','does','did','will',
  'would','should','could','can','may','might','i','you','he','she','it','we',
  'they','me','him','her','us','them','my','your','his','its','our','their',
  'this','that','these','those','what','which','who','whom','how','why','when',
  'where','tell','show','find','about','please','need','want','some','any',
  'verse','verses','bible','scripture','god','say','says','said',
]);

/** Cheap stemmer — collapses common English plurals/suffixes. */
const stem = (w: string): string => {
  if (w.length <= 3) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('sses')) return w.slice(0, -2);
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('eth') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
};

const tokenize = (s: string): string[] =>
  s.toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));

/** Damerau-Levenshtein-lite distance (capped), used for typo tolerance. */
const editDistance = (a: string, b: string, max = 2): number => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp: number[] = Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
      if (dp[j] < rowMin) rowMin = dp[j];
    }
    if (rowMin > max) return max + 1;
  }
  return dp[b.length];
};

/** True if `verseToken` matches `queryToken` exactly, by stem, prefix, or 1-2 edit typo. */
const tokenMatches = (queryToken: string, queryStem: string, verseToken: string): boolean => {
  if (verseToken === queryToken) return true;
  const vStem = stem(verseToken);
  if (vStem === queryStem) return true;
  if (queryToken.length >= 5 && verseToken.startsWith(queryToken)) return true;
  if (queryToken.length >= 5 && queryToken.startsWith(verseToken) && verseToken.length >= 4) return true;
  const maxEdits = queryToken.length >= 7 ? 2 : queryToken.length >= 5 ? 1 : 0;
  if (maxEdits === 0) return false;
  return editDistance(queryToken, verseToken, maxEdits) <= maxEdits;
};

/**
 * Fuzzy Bible search.
 * - Tolerates typos, plurals, and partial words.
 * - Boosts exact phrase matches.
 * - Scores by unique-token coverage with a small proximity bonus.
 */
export const fuzzySearchBible = async (
  query: string,
  options?: { language?: BibleLanguage; maxResults?: number }
): Promise<SearchResult[]> => {
  const { language, maxResults = 8 } = options || {};
  const books = await getAllBooks(language);
  if (books.length === 0) return [];

  const phrase = query.trim().toLowerCase();
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const qStems = qTokens.map(stem);
  const uniqueQ = qTokens.length;

  const results: SearchResult[] = [];

  for (const book of books) {
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        const textLower = verse.text.toLowerCase();
        const vTokens = tokenize(verse.text);
        if (vTokens.length === 0) continue;

        let matched = 0;
        const matchedPositions: number[] = [];

        for (let i = 0; i < qTokens.length; i++) {
          const qt = qTokens[i];
          const qs = qStems[i];
          for (let j = 0; j < vTokens.length; j++) {
            if (tokenMatches(qt, qs, vTokens[j])) {
              matched++;
              matchedPositions.push(j);
              break;
            }
          }
        }

        if (matched === 0) continue;

        let coverage = matched / uniqueQ; // 0..1

        // Exact-phrase boost
        if (phrase.length > 6 && textLower.includes(phrase)) coverage += 0.5;

        // Proximity bonus: matched tokens close together
        if (matchedPositions.length >= 2) {
          const sorted = [...matchedPositions].sort((a, b) => a - b);
          const span = sorted[sorted.length - 1] - sorted[0];
          if (span <= matched + 2) coverage += 0.15;
        }

        // Penalize very long verses slightly (less informative)
        if (vTokens.length > 40) coverage *= 0.9;

        if (coverage >= 0.34 || matched >= 2) {
          results.push({
            book: book.book,
            chapter: chapter.chapter,
            verse: verse.verse,
            text: verse.text,
            language: book.language,
            relevance: Math.min(coverage, 1.5),
          });
        }
      }
    }
  }

  // Dedupe + sort
  const seen = new Set<string>();
  return results
    .sort((a, b) => b.relevance - a.relevance)
    .filter(r => {
      const key = `${r.book}-${r.chapter}-${r.verse}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxResults);
};

/** Format a list of verse results as a citation block. */
export const formatCitations = (results: SearchResult[], header?: string): string => {
  if (results.length === 0) return '';
  const lines = results.map((r, i) => {
    const cite = `**${r.book} ${r.chapter}:${r.verse}**`;
    const score = r.relevance >= 1 ? '⭐' : r.relevance >= 0.66 ? '✨' : '·';
    return `${i + 1}. ${score} *"${r.text.trim()}"*\n   — ${cite}`;
  });
  return `${header ? header + '\n\n' : ''}${lines.join('\n\n')}`;
};
