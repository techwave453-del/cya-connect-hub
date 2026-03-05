/**
 * Bible Data Loader — fetches KJV and Swahili Bible JSON from GitHub,
 * caches in IndexedDB for offline use.
 */

// ── Types ──────────────────────────────────────────────
export interface BibleVerse {
  verse: string;
  text: string;
}

export interface BibleChapter {
  chapter: string;
  verses: BibleVerse[];
}

export interface BibleBook {
  id: string; // e.g. "genesis"
  book: string; // display name
  chapters: BibleChapter[];
  language: 'en' | 'sw';
}

export type BibleLanguage = 'en' | 'sw';

// ── Book lists ─────────────────────────────────────────
export const KJV_BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy',
  'Joshua','Judges','Ruth','1Samuel','2Samuel',
  '1Kings','2Kings','1Chronicles','2Chronicles',
  'Ezra','Nehemiah','Esther','Job','Psalms','Proverbs',
  'Ecclesiastes','SongofSolomon','Isaiah','Jeremiah','Lamentations',
  'Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk',
  'Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts',
  'Romans','1Corinthians','2Corinthians','Galatians','Ephesians',
  'Philippians','Colossians','1Thessalonians','2Thessalonians',
  '1Timothy','2Timothy','Titus','Philemon','Hebrews',
  'James','1Peter','2Peter','1John','2John','3John','Jude','Revelation',
];

// Human-readable display names
export const BOOK_DISPLAY_NAMES: Record<string, string> = {
  'Genesis':'Genesis','Exodus':'Exodus','Leviticus':'Leviticus','Numbers':'Numbers',
  'Deuteronomy':'Deuteronomy','Joshua':'Joshua','Judges':'Judges','Ruth':'Ruth',
  '1Samuel':'1 Samuel','2Samuel':'2 Samuel','1Kings':'1 Kings','2Kings':'2 Kings',
  '1Chronicles':'1 Chronicles','2Chronicles':'2 Chronicles','Ezra':'Ezra',
  'Nehemiah':'Nehemiah','Esther':'Esther','Job':'Job','Psalms':'Psalms',
  'Proverbs':'Proverbs','Ecclesiastes':'Ecclesiastes','SongofSolomon':'Song of Solomon',
  'Isaiah':'Isaiah','Jeremiah':'Jeremiah','Lamentations':'Lamentations',
  'Ezekiel':'Ezekiel','Daniel':'Daniel','Hosea':'Hosea','Joel':'Joel','Amos':'Amos',
  'Obadiah':'Obadiah','Jonah':'Jonah','Micah':'Micah','Nahum':'Nahum',
  'Habakkuk':'Habakkuk','Zephaniah':'Zephaniah','Haggai':'Haggai',
  'Zechariah':'Zechariah','Malachi':'Malachi','Matthew':'Matthew','Mark':'Mark',
  'Luke':'Luke','John':'John','Acts':'Acts','Romans':'Romans',
  '1Corinthians':'1 Corinthians','2Corinthians':'2 Corinthians',
  'Galatians':'Galatians','Ephesians':'Ephesians','Philippians':'Philippians',
  'Colossians':'Colossians','1Thessalonians':'1 Thessalonians',
  '2Thessalonians':'2 Thessalonians','1Timothy':'1 Timothy','2Timothy':'2 Timothy',
  'Titus':'Titus','Philemon':'Philemon','Hebrews':'Hebrews','James':'James',
  '1Peter':'1 Peter','2Peter':'2 Peter','1John':'1 John','2John':'2 John',
  '3John':'3 John','Jude':'Jude','Revelation':'Revelation',
};

// ── IndexedDB helpers (separate from offlineDb to avoid version conflicts) ──
const BIBLE_DB_NAME = 'cya-bible-db';
const BIBLE_DB_VERSION = 1;
const STORE_NAME = 'bible_books';

let bibleDb: IDBDatabase | null = null;

const openBibleDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (bibleDb) { resolve(bibleDb); return; }
    const req = indexedDB.open(BIBLE_DB_NAME, BIBLE_DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { bibleDb = req.result; resolve(bibleDb); };
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('language', 'language', { unique: false });
        store.createIndex('book', 'book', { unique: false });
      }
    };
  });

const putBook = async (book: BibleBook): Promise<void> => {
  const db = await openBibleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(book);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getBook = async (id: string): Promise<BibleBook | undefined> => {
  const db = await openBibleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as BibleBook | undefined);
    req.onerror = () => reject(req.error);
  });
};

export const getAllBooks = async (language?: BibleLanguage): Promise<BibleBook[]> => {
  const db = await openBibleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    if (language) {
      const idx = store.index('language');
      const req = idx.getAll(language);
      req.onsuccess = () => resolve(req.result as BibleBook[]);
      req.onerror = () => reject(req.error);
    } else {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as BibleBook[]);
      req.onerror = () => reject(req.error);
    }
  });
};

export const getDownloadedBookCount = async (language: BibleLanguage): Promise<number> => {
  const books = await getAllBooks(language);
  return books.length;
};

// ── Fetch from GitHub ──────────────────────────────────

const KJV_BASE = 'https://raw.githubusercontent.com/aruljohn/Bible-kjv/master';

interface KJVRawBook {
  book: string;
  chapters: Array<{ chapter: string; verses: Array<{ verse: string; text: string }> }>;
}

export const fetchKJVBook = async (
  bookName: string,
  onProgress?: (msg: string) => void
): Promise<BibleBook | null> => {
  const id = `kjv_${bookName.toLowerCase()}`;

  // Check cache first
  const cached = await getBook(id);
  if (cached) return cached;

  onProgress?.(`Downloading ${BOOK_DISPLAY_NAMES[bookName] || bookName}...`);

  try {
    const resp = await fetch(`${KJV_BASE}/${bookName}.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw: KJVRawBook = await resp.json();

    const book: BibleBook = {
      id,
      book: raw.book,
      chapters: raw.chapters,
      language: 'en',
    };

    await putBook(book);
    console.log(`[bibleData] Cached KJV book: ${book.book}`);
    return book;
  } catch (err) {
    console.error(`[bibleData] Failed to fetch KJV ${bookName}:`, err);
    return null;
  }
};

const SW_BASE = 'https://raw.githubusercontent.com/shemmjunior/swahili-bible-edition/main/json/full_version';

interface SwahiliBibleRaw {
  [bookName: string]: {
    [chapter: string]: {
      [verse: string]: string;
    };
  };
}

export const fetchSwahiliBible = async (
  onProgress?: (msg: string, pct: number) => void
): Promise<number> => {
  onProgress?.('Downloading Swahili Bible...', 0);

  try {
    const resp = await fetch(`${SW_BASE}/swahili-bible-edition.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw: SwahiliBibleRaw = await resp.json();

    const bookNames = Object.keys(raw);
    let saved = 0;

    for (let i = 0; i < bookNames.length; i++) {
      const bName = bookNames[i];
      const id = `sw_${bName.toLowerCase().replace(/\s+/g, '_')}`;

      // Check if already cached
      const existing = await getBook(id);
      if (existing) { saved++; continue; }

      const chaptersRaw = raw[bName];
      const chapters: BibleChapter[] = Object.entries(chaptersRaw).map(
        ([chNum, verses]) => ({
          chapter: chNum,
          verses: Object.entries(verses).map(([vNum, text]) => ({
            verse: vNum,
            text: text as string,
          })),
        })
      );

      const book: BibleBook = { id, book: bName, chapters, language: 'sw' };
      await putBook(book);
      saved++;
      onProgress?.(`Swahili: ${bName}`, Math.round((saved / bookNames.length) * 100));
    }

    console.log(`[bibleData] Cached ${saved} Swahili books`);
    return saved;
  } catch (err) {
    console.error('[bibleData] Failed to fetch Swahili Bible:', err);
    return 0;
  }
};

// ── Batch download all KJV books ───────────────────────
export const downloadAllKJV = async (
  onProgress?: (msg: string, pct: number) => void
): Promise<number> => {
  let downloaded = 0;
  for (let i = 0; i < KJV_BOOKS.length; i++) {
    const name = KJV_BOOKS[i];
    const result = await fetchKJVBook(name, (msg) =>
      onProgress?.(msg, Math.round(((i + 1) / KJV_BOOKS.length) * 100))
    );
    if (result) downloaded++;
    // Small delay to avoid GitHub rate limits
    if (i % 5 === 4) await new Promise(r => setTimeout(r, 300));
  }
  console.log(`[bibleData] Downloaded ${downloaded}/${KJV_BOOKS.length} KJV books`);
  return downloaded;
};

// ── Quick lookup: get a specific verse or chapter ──────
export const lookupVerse = async (
  bookName: string,
  chapter: number,
  verse?: number,
  language: BibleLanguage = 'en'
): Promise<string | null> => {
  const prefix = language === 'en' ? 'kjv' : 'sw';
  // Try to find the book by various ID formats
  const possibleIds = [
    `${prefix}_${bookName.toLowerCase().replace(/\s+/g, '')}`,
    `${prefix}_${bookName.toLowerCase().replace(/\s+/g, '_')}`,
    `${prefix}_${bookName.toLowerCase()}`,
  ];

  for (const id of possibleIds) {
    const book = await getBook(id);
    if (!book) continue;

    const ch = book.chapters.find(c => c.chapter === String(chapter));
    if (!ch) continue;

    if (verse !== undefined) {
      const v = ch.verses.find(v => v.verse === String(verse));
      return v ? `${book.book} ${chapter}:${verse} — "${v.text}"` : null;
    }

    // Return whole chapter
    return ch.verses.map(v => `${v.verse}. ${v.text}`).join('\n');
  }

  return null;
};

// ── Check download status ──────────────────────────────
export const getBibleDownloadStatus = async (): Promise<{
  kjvCount: number;
  kjvTotal: number;
  swCount: number;
  isFullyDownloaded: boolean;
}> => {
  const kjvCount = await getDownloadedBookCount('en');
  const swCount = await getDownloadedBookCount('sw');
  return {
    kjvCount,
    kjvTotal: KJV_BOOKS.length,
    swCount,
    isFullyDownloaded: kjvCount >= KJV_BOOKS.length && swCount > 0,
  };
};
