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
