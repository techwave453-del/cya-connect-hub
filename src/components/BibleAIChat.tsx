import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Send, Sparkles, Trash2, BookOpen, Reply, Copy, Check, Bookmark, FolderOpen, ChevronLeft, Image, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useBibleChat } from '@/hooks/useBibleChat';
import { useSavedChats, SavedChat } from '@/hooks/useSavedChats';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BiblePassageDialog } from '@/components/BiblePassageDialog';
import InlineBibleDownload from '@/components/InlineBibleDownload';

// Helper function to enrich markdown with icons and visual formatting
  const enrichContentWithIcons = (content: string): string => {
  let enriched = content;
  
  // Add icons to common scripture reference patterns
  // Replace scripture refs with a clickable markdown link that uses a bible:// scheme
  enriched = enriched.replace(
    /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|John|Jude|Revelation)\s+(\d+):(\d+)/gi,
    (m, book, chap, verse) => {
      const label = `📖 ${book} ${chap}:${verse}`;
      const href = `bible://${encodeURIComponent(`${book} ${chap}:${verse}`)}`;
      return `[${label}](${href})`;
    }
  );

  // Add icons to key concepts and patterns
  enriched = enriched.replace(/\b(Jesus|Christ|God|Holy Spirit|salvation|grace|faith|love|forgiveness|redemption|covenant|kingdom|eternal|resurrection)\b/gi,
    (match) => `${match}`
  );

  // Add icon to emphasis on important points (lines with strong emphasis)
  enriched = enriched.replace(/^\*\*([^*]+)\*\*$/gm, '💡 **$1**');

  // Add icons to key themes
  enriched = enriched.replace(/^\s*(Key Point|Key Teaching|Main Idea|Important|Remember|Note):/gmi, '⭐ **$1:**');
  enriched = enriched.replace(/^\s*(Application|How to|Practice):/gmi, '✨ **$1:**');
  enriched = enriched.replace(/^\s*(Question|Question:|Reflect):/gmi, '🤔 **$1:**');
  enriched = enriched.replace(/^\s*(Warning|Caution):/gmi, '⚠️ **$1:**');
  enriched = enriched.replace(/^\s*(Lesson|Teaching|Truth):/gmi, '📚 **$1:**');

  // Add checkmark to action items or conclusions
  enriched = enriched.replace(/^\s*(-\s+)([^*][^-\n]+(?:do|apply|practice|remember|believe|trust))/gmi, '- ✅ $2');

  return enriched;
};

// Helper function to generate story-specific sample questions
const generateStoryQuestions = (storyTitle: string, refs: string[]): string[] => {
  const mainRef = refs[0] || 'Scripture';
  return [
    `What can I learn from the story of ${storyTitle}?`,
    `How does ${mainRef} apply to my life today?`,
    `What is the deeper spiritual meaning of ${storyTitle}?`,
  ];
};

interface BibleAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
  autoSend?: boolean;
}

const BibleAIChat = ({ isOpen, onClose, initialMessage, autoSend = false }: BibleAIChatProps) => {
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ index: number; content: string } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showSavedChats, setShowSavedChats] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [passageRef, setPassageRef] = useState<string | null>(null);
  const [passageOpen, setPassageOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isLoading, error, isOfflineMode, sendMessage, clearChat, loadMessages, generateInsight } = useBibleChat();
  const { user } = useAuth();
  const { savedChats, loading: loadingSaved, saveChat, deleteChat } = useSavedChats(user);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current && !showSavedChats) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, showSavedChats]);

  // Prefill input when opened with an initial message and optionally auto-send
  useEffect(() => {
    if (isOpen && initialMessage) {
      setInput(initialMessage);
      if (autoSend) {
        setTimeout(() => {
          handleSend();
        }, 250);
      }
    }
    // only run when isOpen or initialMessage changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMessage, autoSend]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    
    let messageToSend = input.trim();
    if (replyTo) {
      const excerpt = replyTo.content.slice(0, 150) + (replyTo.content.length > 150 ? '...' : '');
      messageToSend = `Regarding your previous response: "${excerpt}"\n\nMy follow-up: ${messageToSend}`;
    }
    
    sendMessage(messageToSend);
    setInput('');
    setReplyTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && replyTo) {
      setReplyTo(null);
    }
  };

  const handleReply = useCallback((index: number, content: string) => {
    setReplyTo({ index, content });
    inputRef.current?.focus();
  }, []);

  const handleCopy = useCallback((index: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  const openBibleRef = (ref: string) => {
    setPassageRef(ref);
    setPassageOpen(true);
  };

  // Detect if a message is about a biblical story and offer full story
  const detectStoryQuestion = (content: string): boolean => {
    const storyKeywords = ['story', 'tell me', 'what happened', 'explain', 'describe', 'narrative', 'account'];
    const lowerContent = content.toLowerCase();
    return storyKeywords.some(kw => lowerContent.includes(kw));
  };

  // Find which story is being discussed - search by message content
  const findStoryFromMessage = (messageContent: string): { title: string; id: string; refs: string[] } | null => {
    if (!messageContent || !BIBLE_STORIES) return null;
    
    const msgLower = messageContent.toLowerCase();
    const exactMatch = BIBLE_STORIES.find(story => 
      msgLower.includes(story.title.toLowerCase())
    );
    if (exactMatch) return exactMatch;
    
    const wordMatch = BIBLE_STORIES.find(story => 
      story.title.toLowerCase().split(' ').some(word => 
        word.length > 3 && msgLower.includes(word)
      )
    );
    return wordMatch || null;
  };

  const handleGetFullStory = (userMessageContent?: string) => {
    const messageToSearch = userMessageContent || (messages.length > 0 ? messages[messages.length - 1]?.content : '');
    const story = findStoryFromMessage(messageToSearch || '');
    
    if (!story) {
      toast({ title: 'Could not identify the story. Please be more specific.', variant: 'destructive' });
      return;
    }
    
    const imgUrl = storyImages[story.id];
    const imageMarkdown = imgUrl ? `\n\n![${story.title}](${imgUrl})` : '';
    const imageCaption = imgUrl ? `\n\n_Image: ${story.title}_` : '';
    
    const fullStoryPrompt = `Please tell me the complete, detailed story of ${story.title}. Narrate it like you're explaining it to a friend — include all the events, characters, dialogue, emotional moments, and spiritual significance. Make it engaging and personal, like a good storyteller would.${imageMarkdown}${imageCaption}`;
    sendMessage(fullStoryPrompt, { suppressUser: true });
  };

  const handleSaveChat = async () => {
    if (!saveTitle.trim()) {
      toast({ title: "Please enter a title", variant: "destructive" });
      return;
    }
    
    const result = await saveChat(saveTitle.trim(), messages);
    if (result) {
      setSaveDialogOpen(false);
      setSaveTitle('');
    }
  };

  const handleLoadChat = (chat: SavedChat) => {
    loadMessages(chat.messages);
    setShowSavedChats(false);
    toast({ title: `Loaded: ${chat.title}` });
  };

  const generateTitle = () => {
    if (messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      if (firstUserMsg) {
        return firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
      }
    }
    return '';
  };

  // Typewriter effect for the default description when there are no messages
  const defaultDescription = "I'm here to help you explore Scripture. Ask me anything about Bible verses, characters, or how to apply Biblical teachings to your life.";
  const [typedDescription, setTypedDescription] = useState('');
  // Story explorer state — expanded canonical stories with optional thumbnails
  const BIBLE_STORIES = [
    { id: 'creation', title: 'Creation', refs: ['Genesis 1-2'], thumb: '🌅' },
    { id: 'fall', title: 'The Fall (Adam & Eve)', refs: ['Genesis 3'], thumb: '🍎' },
    { id: 'cain_abel', title: 'Cain and Abel', refs: ['Genesis 4'], thumb: '⚖️' },
    { id: 'enoch', title: 'Enoch walks with God', refs: ['Genesis 5:21-24'], thumb: '🚶' },
    { id: 'noah', title: 'Noah and the Flood', refs: ['Genesis 6-9'], thumb: '🌊' },
    { id: 'tower', title: 'Tower of Babel', refs: ['Genesis 11'], thumb: '🧱' },
    { id: 'abraham', title: 'Abraham and Isaac', refs: ['Genesis 12', 'Genesis 22'], thumb: '🕊️' },
    { id: 'abraham_covenant', title: 'Abraham\'s Covenant', refs: ['Genesis 15', 'Genesis 17'], thumb: '📋' },
    { id: 'sodom_gomorrah', title: 'Sodom and Gomorrah', refs: ['Genesis 19'], thumb: '🔥' },
    { id: 'lot_escape', title: 'Lot\'s Escape', refs: ['Genesis 19:15-29'], thumb: '🏃' },
    { id: 'ishmael', title: 'Ishmael (casting out)', refs: ['Genesis 16', 'Genesis 21'], thumb: '🏜️' },
    { id: 'hagar', title: 'Hagar in the wilderness', refs: ['Genesis 16:1-14', 'Genesis 21:9-21'], thumb: '💧' },
    { id: 'jacob_ladder', title: 'Jacob\'s Ladder', refs: ['Genesis 28:10-22'], thumb: '🪜' },
    { id: 'jacob_wrestle', title: 'Jacob Wrestles with God', refs: ['Genesis 32:22-32'], thumb: '🤸' },
    { id: 'jacob_esau', title: 'Jacob and Esau', refs: ['Genesis 25-33'], thumb: '🤼' },
    { id: 'joseph', title: 'Joseph (sold into Egypt)', refs: ['Genesis 37, 39-45'], thumb: '🧑‍🌾' },
    { id: 'joseph_brothers', title: 'Joseph and His Brothers', refs: ['Genesis 45:1-15', 'Genesis 50:15-21'], thumb: '👨‍👨‍👦' },
    { id: 'moses', title: 'Moses and the Exodus', refs: ['Exodus 1-15'], thumb: '🔥' },
    { id: 'moses_birth', title: 'Baby Moses in the Basket', refs: ['Exodus 2:1-10'], thumb: '👶' },
    { id: 'burning_bush', title: 'Moses and the Burning Bush', refs: ['Exodus 3'], thumb: '🔥' },
    { id: 'plagues', title: 'Ten Plagues of Egypt', refs: ['Exodus 7-12'], thumb: '🐸' },
    { id: 'passover', title: 'Passover', refs: ['Exodus 12'], thumb: '🐑' },
    { id: 'red_sea', title: 'Crossing the Red Sea', refs: ['Exodus 14'], thumb: '🌊' },
    { id: 'golden_calf', title: 'The Golden Calf', refs: ['Exodus 32'], thumb: '🐂' },
    { id: 'sinai', title: 'Ten Commandments', refs: ['Exodus 19-20'], thumb: '📜' },
    { id: 'manna_quail', title: 'Manna and Quail', refs: ['Exodus 16'], thumb: '🥔' },
    { id: 'bronze_serpent', title: 'Bronze Serpent', refs: ['Numbers 21:4-9'], thumb: '🐍' },
    { id: 'balaam', title: 'Balaam and His Donkey', refs: ['Numbers 22:21-35'], thumb: '🐴' },
    { id: 'joshua', title: 'Joshua and Jericho', refs: ['Joshua 6'], thumb: '🏛️' },
    { id: 'rahab', title: 'Rahab the Prostitute', refs: ['Joshua 2', 'Joshua 6:22-25'], thumb: '🪟' },
    { id: 'achan', title: 'Achan\'s Sin', refs: ['Joshua 7'], thumb: '⚰️' },
    { id: 'gibeonites', title: 'Gibeonites Deception', refs: ['Joshua 9'], thumb: '🤥' },
    { id: 'caleb', title: 'Caleb Takes His Inheritance', refs: ['Joshua 14:6-15'], thumb: '⛰️' },
    { id: 'judges', title: 'Judges & Deliverers (Deborah, Gideon)', refs: ['Judges'], thumb: '🛡️' },
    { id: 'deborah_barak', title: 'Deborah and Barak', refs: ['Judges 4-5'], thumb: '⚔️' },
    { id: 'gideon', title: 'Gideon\'s Victory', refs: ['Judges 6-7'], thumb: '🔔' },
    { id: 'jephthah', title: 'Jephthah\'s Daughter', refs: ['Judges 11'], thumb: '😔' },
    { id: 'samson', title: 'Samson and Delilah', refs: ['Judges 13-16'], thumb: '💪' },
    { id: 'ruth', title: 'Ruth and Loyalty', refs: ['Ruth'], thumb: '🤝' },
    { id: 'boaz_ruth', title: 'Boaz and Ruth\'s Marriage', refs: ['Ruth 3-4'], thumb: '💍' },
    { id: 'hannah', title: 'Hannah and Samuel', refs: ['1 Samuel 1-3'], thumb: '👶' },
    { id: 'eli', title: 'Eli and His Sons', refs: ['1 Samuel 2-4'], thumb: '⚡' },
    { id: 'samuel', title: 'Samuel & Saul', refs: ['1 Samuel'], thumb: '📯' },
    { id: 'david_goliath', title: 'David and Goliath', refs: ['1 Samuel 17'], thumb: '🪨' },
    { id: 'david_saul', title: 'David and Saul', refs: ['1 Samuel 18-26'], thumb: '🎵' },
    { id: 'david_king', title: 'King David', refs: ['2 Samuel'], thumb: '👑' },
    { id: 'david_bathsheba', title: 'David and Bathsheba', refs: ['2 Samuel 11-12'], thumb: '🔴' },
    { id: 'absalom', title: 'Absalom\'s Rebellion', refs: ['2 Samuel 13-18'], thumb: '👨' },
    { id: 'solomon', title: 'Solomon (wisdom & temple)', refs: ['1 Kings 3', '1 Kings 6-8'], thumb: '💎' },
    { id: 'sheba_queen', title: 'Queen of Sheba', refs: ['1 Kings 10', '2 Chronicles 9'], thumb: '👑' },
    { id: 'elijah', title: 'Elijah on Mount Carmel', refs: ['1 Kings 18'], thumb: '⚡' },
    { id: 'elijah_fed', title: 'Elijah Fed by Ravens', refs: ['1 Kings 17:1-6'], thumb: '🦅' },
    { id: 'elijah_ascension', title: 'Elijah\'s Ascension', refs: ['2 Kings 2:1-12'], thumb: '☁️' },
    { id: 'elisha', title: 'Elisha and the Prophets', refs: ['2 Kings 2-13'], thumb: '🌪️' },
    { id: 'naaman', title: 'Naaman the Syrian', refs: ['2 Kings 5'], thumb: '♻️' },
    { id: 'jonah', title: 'Jonah and the Whale', refs: ['Jonah'], thumb: '🐋' },
    { id: 'nehemiah', title: 'Nehemiah and the Wall', refs: ['Nehemiah'], thumb: '🧱' },
    { id: 'daniel', title: 'Daniel in the Lion\'s Den', refs: ['Daniel 6'], thumb: '🦁' },
    { id: 'daniel_furnace', title: 'Shadrach, Meshach & Abednego', refs: ['Daniel 3'], thumb: '🔥' },
    { id: 'belshazzar', title: 'Belshazzar\'s Feast', refs: ['Daniel 5'], thumb: '🖐️' },
    { id: 'esther', title: 'Esther (deliverance)', refs: ['Esther'], thumb: '👸' },
    { id: 'haman', title: 'Mordecai and Haman', refs: ['Esther 3-7'], thumb: '🎪' },
    { id: 'job', title: 'Job (suffering & faith)', refs: ['Job'], thumb: '🌩️' },
    { id: 'john_baptist', title: 'John the Baptist', refs: ['Matthew 3', 'Luke 1'], thumb: '🕯️' },
    { id: 'nativity', title: 'Birth of Jesus', refs: ['Luke 2', 'Matthew 1-2'], thumb: '🌟' },
    { id: 'wise_men', title: 'Wise Men Visit Jesus', refs: ['Matthew 2:1-12'], thumb: '🎁' },
    { id: 'escape_egypt', title: 'Escape to Egypt', refs: ['Matthew 2:13-23'], thumb: '🏜️' },
    { id: 'baptism', title: 'Baptism of Jesus', refs: ['Matthew 3', 'Mark 1'], thumb: '💧' },
    { id: 'temptation', title: 'Temptation of Jesus', refs: ['Matthew 4'], thumb: '🍃' },
    { id: 'sermon_mount', title: 'Sermon on the Mount', refs: ['Matthew 5-7'], thumb: '⛰️' },
    { id: 'water_walk', title: 'Jesus Walks on Water', refs: ['Matthew 14:22-33', 'Mark 6:45-52'], thumb: '🌊' },
    { id: 'transfiguration', title: 'Transfiguration of Jesus', refs: ['Matthew 17', 'Mark 9'], thumb: '✨' },
    { id: 'canaanite_woman', title: 'Canaanite Woman\'s Faith', refs: ['Matthew 15:21-28'], thumb: '🙏' },
    { id: 'possessed_man', title: 'Demon-Possessed Man', refs: ['Mark 5:1-20'], thumb: '😈' },
    { id: 'miracles', title: 'Jesus\' Miracles (feeding, healing)', refs: ['Matthew 14', 'Mark 5'], thumb: '💫' },
    { id: 'blind_bartimaeus', title: 'Blind Bartimaeus', refs: ['Mark 10:46-52'], thumb: '👁️' },
    { id: 'zacchaeus', title: 'Zacchaeus the Tax Collector', refs: ['Luke 19:1-10'], thumb: '🌳' },
    { id: 'woman_well', title: 'Woman at the Well', refs: ['John 4:1-42'], thumb: '💦' },
    { id: 'woman_adultery', title: 'Woman Caught in Adultery', refs: ['John 7:53-8:11'], thumb: '🪨' },
    { id: 'mary_martha', title: 'Mary and Martha', refs: ['Luke 10:38-42'], thumb: '👭' },
    { id: 'lazarus', title: 'Lazarus Raised from Dead', refs: ['John 11'], thumb: '⚰️' },
    { id: 'centurion', title: 'Centurion\'s Faith', refs: ['Matthew 8:5-13', 'Luke 7:1-10'], thumb: '⚔️' },
    { id: 'wasting_son', title: 'Prodigal Son', refs: ['Luke 15:11-32'], thumb: '🐷' },
    { id: 'wedding_cana', title: 'Wedding at Cana', refs: ['John 2:1-11'], thumb: '🍷' },
    { id: 'rich_young_ruler', title: 'Rich Young Ruler', refs: ['Matthew 19:16-26'], thumb: '💰' },
    { id: 'parables', title: 'Parables (Good Samaritan & more)', refs: ['Luke 10', 'Matthew 13'], thumb: '📖' },
    { id: 'last_supper', title: 'Last Supper', refs: ['Matthew 26'], thumb: '🍞' },
    { id: 'gethsemane', title: 'Jesus in Gethsemane', refs: ['Matthew 26:36-46'], thumb: '🙏' },
    { id: 'peter_denial', title: 'Peter\'s Denial', refs: ['Matthew 26:69-75'], thumb: '🔔' },
    { id: 'crucifixion', title: 'Crucifixion', refs: ['Matthew 27', 'Mark 15', 'Luke 23', 'John 19'], thumb: '✝️' },
    { id: 'resurrection', title: 'Resurrection', refs: ['Matthew 28', 'Mark 16', 'Luke 24', 'John 20-21'], thumb: '🌅' },
    { id: 'thomas_doubt', title: 'Thomas Doubts', refs: ['John 20:24-29'], thumb: '🤔' },
    { id: 'jesus_appears', title: 'Jesus Appears to Disciples', refs: ['John 20:19-23', 'Luke 24:36-49'], thumb: '👻' },
    { id: 'ascension', title: 'Ascension of Jesus', refs: ['Acts 1:1-11'], thumb: '☁️' },
    { id: 'pentecost', title: 'Pentecost', refs: ['Acts 2'], thumb: '🔥' },
    { id: 'peter_healing', title: 'Peter\'s Shadow Healing', refs: ['Acts 5:12-16'], thumb: '⚕️' },
    { id: 'ananias_sapphira', title: 'Ananias and Sapphira', refs: ['Acts 5:1-11'], thumb: '💔' },
    { id: 'stephen', title: 'Stephen (first martyr)', refs: ['Acts 6-7'], thumb: '🪨' },
    { id: 'philip_ethiopian', title: 'Philip Meets the Ethiopian', refs: ['Acts 8:26-40'], thumb: '🚗' },
    { id: 'paul_conversion', title: 'Paul\'s Conversion', refs: ['Acts 9:1-31'], thumb: '💡' },
    { id: 'tabitha', title: 'Peter and Tabitha', refs: ['Acts 9:36-43'], thumb: '👧' },
    { id: 'cornelius', title: 'Cornelius\'s Vision', refs: ['Acts 10'], thumb: '👼' },
    { id: 'samaritans_spirit', title: 'Samaritans Receive Spirit', refs: ['Acts 8:14-25'], thumb: '🔥' },
    { id: 'peter_prison', title: 'Peter\'s Escape from Prison', refs: ['Acts 12:1-19'], thumb: '🔓' },
    { id: 'james_martyrdom', title: 'James\'s Martyrdom', refs: ['Acts 12:1-2'], thumb: '⚔️' },
    { id: 'paul', title: 'Paul (conversion & missions)', refs: ['Acts 9', 'Acts 13-28'], thumb: '✉️' },
    { id: 'lydia', title: 'Lydia (first European convert)', refs: ['Acts 16:11-15'], thumb: '💜' },
    { id: 'philippian_jailer', title: 'Philippian Jailer', refs: ['Acts 16:25-34'], thumb: '🔐' },
    { id: 'herod_plague', title: 'Herod\'s Plague', refs: ['Acts 12:20-23'], thumb: '🦠' },
    { id: 'agabus', title: 'Agabus\'s Prophecy', refs: ['Acts 21:10-11'], thumb: '🔮' },
    { id: 'philemon', title: 'Philemon and Onesimus', refs: ['Philemon'], thumb: '💌' },
    { id: 'timothy', title: 'Timothy - Paul\'s Protégé', refs: ['1 Timothy', '2 Timothy'], thumb: '👨‍🎓' },
    { id: 'priscilla_aquila', title: 'Priscilla and Aquila', refs: ['Acts 18:2-3', 'Romans 16:3'], thumb: '👫' },
    { id: 'revelation', title: 'Revelation (visions)', refs: ['Revelation'], thumb: '🔮' },
  ];

  // AI-generated image cache for stories
  const [storyImages, setStoryImages] = useState<Record<string, string>>(() => {
    try {
      const cached = localStorage.getItem('scripture_story_images');
      return cached ? JSON.parse(cached) : {};
    } catch { return {}; }
  });
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);

  // Track failed story IDs to prevent retry loops
  const [failedStoryImages, setFailedStoryImages] = useState<Set<string>>(new Set());

  const generateStoryImage = useCallback(async (storyId: string, storyTitle: string) => {
    if (storyImages[storyId] || generatingImageFor || failedStoryImages.has(storyId)) return;
    setGeneratingImageFor(storyId);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-story-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ storyTitle, storyId }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.imageUrl) {
          setStoryImages(prev => {
            const updated = { ...prev, [storyId]: data.imageUrl };
            try { localStorage.setItem('scripture_story_images', JSON.stringify(updated)); } catch {}
            return updated;
          });
        }
      } else {
        // Mark as failed to prevent infinite retry loop
        console.warn(`Story image generation failed (${resp.status}) for ${storyId}`);
        setFailedStoryImages(prev => new Set(prev).add(storyId));
        if (resp.status === 402) {
          toast({ title: "AI Credits", description: "Image generation is temporarily unavailable. Story will display without an image.", variant: "default" });
        }
      }
    } catch (e) {
      console.error('Failed to generate story image:', e);
      setFailedStoryImages(prev => new Set(prev).add(storyId));
    } finally {
      setGeneratingImageFor(null);
    }
  }, [storyImages, generatingImageFor, failedStoryImages]);



  const [storyOrder, setStoryOrder] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('scripture_story_order');
      if (raw) {
        const parsed = JSON.parse(raw) as number[];
        if (Array.isArray(parsed) && parsed.length === BIBLE_STORIES.length) return parsed;
      }
    } catch {}
    return BIBLE_STORIES.map((_, i) => i);
  });
  const [currentStoryIdx, setCurrentStoryIdx] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('scripture_story_index');
      if (raw) {
        const n = parseInt(raw);
        if (!Number.isNaN(n)) return n;
      }
    } catch {}
    return 0;
  });
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogUrl, setImageDialogUrl] = useState<string | null>(null);
  const [showImages, setShowImages] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('scripture_show_images');
      if (raw === '0' || raw === 'false') return false;
      if (raw === '1' || raw === 'true') return true;
    } catch {}
    return true;
  });
  const [currentInsight, setCurrentInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [readMoreClicked, setReadMoreClicked] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [modalMessageContent, setModalMessageContent] = useState<string | null>(null);
  useEffect(() => {
    let timeout: number | undefined;
    let idx = 0;

    // Only animate when chat is empty and saved chats are not shown
    if (messages.length === 0 && !showSavedChats) {
      setTypedDescription('');
      const tick = () => {
        if (idx <= defaultDescription.length) {
          setTypedDescription(defaultDescription.slice(0, idx));
          idx += 1;
          timeout = window.setTimeout(tick, 24);
        }
      };
      tick();
    } else {
      // Ensure full text when messages exist
      setTypedDescription(defaultDescription);
    }

    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [messages.length, showSavedChats]);

  // Story explorer handlers
  const shuffleStories = () => {
    const arr = [...storyOrder];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setStoryOrder(arr);
    setCurrentStoryIdx(0);
    setCurrentInsight(null);
    setReadMoreClicked(false);
  };

  const fetchInsightForCurrent = async () => {
    const story = BIBLE_STORIES[storyOrder[currentStoryIdx]];
    if (!story) return;
    setLoadingInsight(true);
    const prompt = `Please recreate the biblical story "${story.title}" using scripture quotes and references where appropriate. Present a faithful retelling that cites specific verses (${story.refs.join(', ')}).`;
    const result = await generateInsight(prompt);
    setCurrentInsight(result);
    setLoadingInsight(false);
  };

  const handleNextStory = () => {
    setCurrentStoryIdx((p) => (p + 1) % storyOrder.length);
    setCurrentInsight(null);
    setShowInsight(false);
    setReadMoreClicked(false);
  };

  const handlePrevStory = () => {
    setCurrentStoryIdx((p) => (p - 1 + storyOrder.length) % storyOrder.length);
    setCurrentInsight(null);
    setShowInsight(false);
    setReadMoreClicked(false);
  };

  useEffect(() => {
    // Reset insight visibility when story changes
    setShowInsight(false);
  }, [currentStoryIdx, storyOrder]);

  // Auto-shuffle if user does not click Read More within a short delay
  useEffect(() => {
    const AUTO_DELAY = 30000; // 30 seconds
    // Pause auto-shuffle when user has clicked Read More
    // or when an insight is being loaded or displayed
    if (readMoreClicked) return;
    if (loadingInsight) return;
    if (showInsight) return;

    const id = window.setTimeout(() => {
      shuffleStories();
    }, AUTO_DELAY);

    return () => window.clearTimeout(id);
  }, [currentStoryIdx, storyOrder, readMoreClicked, loadingInsight, showInsight]);

  // Persist story order and index
  useEffect(() => {
    try {
      localStorage.setItem('scripture_story_order', JSON.stringify(storyOrder));
    } catch {}
  }, [storyOrder]);

  useEffect(() => {
    try {
      localStorage.setItem('scripture_show_images', showImages ? '1' : '0');
    } catch {}
  }, [showImages]);

  useEffect(() => {
    try {
      localStorage.setItem('scripture_story_index', String(currentStoryIdx));
    } catch {}
  }, [currentStoryIdx]);

  // Auto-generate image for current story when images are enabled
  // Only trigger on story index change — NOT on storyImages/generateStoryImage to prevent loops
  useEffect(() => {
    if (!showImages) return;
    const story = BIBLE_STORIES[storyOrder[currentStoryIdx]];
    if (story && !storyImages[story.id] && !failedStoryImages.has(story.id) && !generatingImageFor) {
      generateStoryImage(story.id, story.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoryIdx, showImages]);

  const bibleLink = (ref: string) => {
    const q = encodeURIComponent(ref);
    return `https://www.biblegateway.com/passage/?search=${q}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
      <div 
        className={cn(
          "bg-card border border-border rounded-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden",
          "w-full sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[95vh] h-auto",
          "animate-in slide-in-from-bottom-5 duration-300"
        )}
        style={{ resize: 'vertical' as const, maxHeight: '95vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {showSavedChats ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSavedChats(false)}
                className="h-10 w-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-foreground">
                {showSavedChats ? 'Saved Conversations' : 'Scripture Guide'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {showSavedChats ? `${savedChats.length} saved` : isOfflineMode ? '📴 Offline Mode' : 'Bible AI Assistant'}
              </p>
            </div>
          </div>
          {/* Image Viewer Dialog */}
          <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
            <DialogContent className="max-w-3xl p-0 bg-transparent shadow-none">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                {imageDialogUrl && (
                  <img src={imageDialogUrl} alt="Story image" className="w-full h-auto max-h-[70vh] object-cover" />
                )}
                <div className="p-3 flex justify-end">
                  <Button variant="outline" onClick={() => setImageDialogOpen(false)}>Close</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex items-center gap-1">
            {!showSavedChats && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowImages((s) => !s)}
                title={showImages ? 'Hide images' : 'Show images'}
                className={cn(showImages ? 'text-primary' : 'text-muted-foreground')}
              >
                <Image className="w-4 h-4" />
              </Button>
            )}
            {!showSavedChats && user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSavedChats(true)}
                className="text-muted-foreground hover:text-foreground"
                title="View saved conversations"
              >
                <FolderOpen className="w-4 h-4" />
              </Button>
            )}
            {!showSavedChats && messages.length > 0 && user && (
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary"
                    title="Save conversation"
                    onClick={() => setSaveTitle(generateTitle())}
                  >
                    <Bookmark className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Save Conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Input
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      placeholder="Enter a title for this conversation"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveChat()}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveChat}>
                        <Bookmark className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {!showSavedChats && messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {showSavedChats ? (
          <ScrollArea className="flex-1 px-4">
            {loadingSaved ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : savedChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Bookmark className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">No saved conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">Save a chat to reference it later</p>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                {savedChats.map((chat) => (
                  <div
                    key={chat.id}
                    className="group bg-muted/50 hover:bg-muted border border-border/50 rounded-xl p-3 cursor-pointer transition-colors"
                    onClick={() => handleLoadChat(chat)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{chat.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {chat.messages.length} messages • {new Date(chat.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <>
            {/* Messages */}
            <ScrollArea
              className="min-h-0 px-4 overflow-auto"
              ref={scrollRef}
              style={{ maxHeight: 'calc(95vh - 160px)' }}
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <Sparkles className="w-12 h-12 text-primary/50 mb-4" />
                  <h4 className="font-medium text-foreground mb-2">Ask about the Bible</h4>
                    <p className="text-sm text-muted-foreground max-w-[250px]">{typedDescription}<span className="ml-0.5 text-primary">{messages.length === 0 ? '|' : ''}</span></p>
                    <div className="mt-4 w-full">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium">Story Explorer</h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={shuffleStories}>Shuffle</Button>
                          <Button size="sm" onClick={() => { setShowInsight(!showInsight); if (!showInsight && !currentInsight) fetchInsightForCurrent(); }} disabled={loadingInsight}>{loadingInsight ? 'Loading...' : (showInsight ? 'Hide' : 'Show')} Insight</Button>
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-left max-h-[40vh] md:max-h-[50vh] overflow-y-auto">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {showImages && (() => {
                              const s = BIBLE_STORIES[storyOrder[currentStoryIdx]];
                              const imgUrl = s ? storyImages[s.id] : null;
                              const isGenerating = s ? generatingImageFor === s.id : false;
                              return (
                                <button
                                  className="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex-shrink-0 relative"
                                  onClick={() => {
                                    if (imgUrl) {
                                      setImageDialogUrl(imgUrl);
                                      setImageDialogOpen(true);
                                    }
                                  }}
                                >
                                  {isGenerating ? (
                                    <div className="flex items-center justify-center h-full">
                                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                    </div>
                                  ) : imgUrl ? (
                                    <img
                                      src={imgUrl}
                                      alt={s?.title}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center h-full text-xl text-primary">{s?.thumb || '📖'}</div>
                                  )}
                                </button>
                              );
                            })()}
                            {!showImages && (
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center text-xl text-primary flex-shrink-0">
                                {BIBLE_STORIES[storyOrder[currentStoryIdx]]?.thumb || '📖'}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold truncate">{BIBLE_STORIES[storyOrder[currentStoryIdx]]?.title}</div>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {BIBLE_STORIES[storyOrder[currentStoryIdx]]?.refs.map((r: string) => (
                                  <a
                                    key={r}
                                    href={bibleLink(r)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-primary hover:underline break-words"
                                  >
                                    {r}
                                  </a>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end sm:justify-start">
                            <Button size="sm" variant="ghost" onClick={handlePrevStory} className="flex-1 sm:flex-none">Prev</Button>
                            <Button size="sm" variant="ghost" onClick={handleNextStory} className="flex-1 sm:flex-none">Next</Button>
                            <Button size="sm" onClick={async () => {
                              const story = BIBLE_STORIES[storyOrder[currentStoryIdx]];
                              if (!story) return;
                              setReadMoreClicked(true);
                              const imgUrl = storyImages[story.id];
                              const imageMarkdown = imgUrl ? `\n\n![${story.title}](${imgUrl})` : '';
                              const imageCaption = imgUrl ? `\n\n_Image: ${story.title}_` : '';
                              const readMorePrompt = `Please tell me the complete, detailed story of ${story.title}. Narrate it like you're explaining it to a friend — include all the events, characters, dialogue, emotional moments, and spiritual significance. Make it engaging and personal, like a good storyteller would.${imageMarkdown}${imageCaption}`;
                              sendMessage(readMorePrompt, { suppressUser: true });
                            }} className="flex-1 sm:flex-none">Read More</Button>
                          </div>
                        </div>
                        {showInsight && (
                          <div className="mt-3 text-sm text-foreground/90 overflow-hidden">
                            {loadingInsight ? (
                              <div className="text-xs text-muted-foreground">Loading insight...</div>
                            ) : currentInsight ? (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-xs text-muted-foreground">Insight</div>
                                  <div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setModalMessageContent(currentInsight);
                                        setMessageModalOpen(true);
                                      }}
                                    >
                                      Read Full
                                    </Button>
                                  </div>
                                </div>
                                <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden
                                  prose-p:my-1.5 prose-p:leading-relaxed prose-p:break-words
                                  prose-strong:text-primary prose-strong:font-semibold
                                  prose-em:text-primary/80 prose-em:not-italic prose-em:font-semibold
                                  prose-a:text-primary prose-a:font-semibold prose-a:underline prose-a:break-words">
                                  <ReactMarkdown
                                    components={{
                                      a: ({ href, children, ...props }) => {
                                        const h = String(href || '');
                                        if (h.startsWith('bible://')) {
                                          const ref = decodeURIComponent(h.replace('bible://', ''));
                                          return (
                                            <a
                                              href="#"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                openBibleRef(ref);
                                              }}
                                              {...props}
                                            >
                                              {children}
                                            </a>
                                          );
                                        }
                                        return <a href={href} {...props}>{children}</a>;
                                      },
                                    }}
                                  >
                                    {enrichContentWithIcons(currentInsight)}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">Loading insight...</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">Try asking:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {generateStoryQuestions(
                        BIBLE_STORIES[storyOrder[currentStoryIdx]]?.title || 'this story',
                        BIBLE_STORIES[storyOrder[currentStoryIdx]]?.refs || []
                      ).map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            setInput(q);
                            inputRef.current?.focus();
                          }}
                          className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-muted/80 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4 w-full">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className="max-w-[95%] sm:max-w-[85%] group">
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                              <BookOpen className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">Scripture Guide</span>
                          </div>
                        )}
                        <div
                          className={cn(
                            "text-sm leading-relaxed",
                            msg.role === 'user'
                              ? "bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-br-md"
                              : "bg-gradient-to-br from-muted/80 to-muted border border-border/50 px-4 py-4 rounded-2xl rounded-tl-md shadow-sm"
                          )}
                          onClick={() => {
                            if (msg.role === 'assistant' && msg.content) {
                              setModalMessageContent(msg.content);
                              setMessageModalOpen(true);
                            }
                          }}
                          role={msg.role === 'assistant' ? 'button' : undefined}
                          tabIndex={msg.role === 'assistant' ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (msg.role === 'assistant' && (e.key === 'Enter' || e.key === ' ')) {
                              setModalMessageContent(msg.content);
                              setMessageModalOpen(true);
                            }
                          }}
                          title={msg.role === 'assistant' ? 'Tap to open full response' : undefined}
                        >
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden
                              prose-p:my-3 prose-p:leading-relaxed prose-p:text-foreground prose-p:break-words
                              prose-headings:font-bold prose-headings:text-foreground prose-headings:break-words
                              prose-h1:text-lg prose-h1:mt-6 prose-h1:mb-3 prose-h1:pb-2 prose-h1:border-b-2 prose-h1:border-primary/30 prose-h1:bg-gradient-to-r prose-h1:from-primary/10 prose-h1:to-transparent prose-h1:px-3 prose-h1:py-2 prose-h1:rounded-lg
                              prose-h2:text-base prose-h2:mt-5 prose-h2:mb-3 prose-h2:text-primary prose-h2:bg-primary/5 prose-h2:px-3 prose-h2:py-1 prose-h2:rounded-md
                              prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-primary/90 prose-h3:font-semibold
                              prose-img:my-4 prose-img:rounded-lg prose-img:shadow-md prose-img:max-w-full prose-img:h-auto prose-img:object-contain prose-img:border prose-img:border-primary/20
                              prose-ul:my-3 prose-ul:pl-5 prose-ul:space-y-2 prose-ul:marker:text-primary prose-ul:marker:font-bold
                              prose-ol:my-3 prose-ol:pl-5 prose-ol:space-y-2 prose-ol:marker:text-primary prose-ol:marker:font-semibold
                              prose-li:my-1 prose-li:leading-relaxed prose-li:text-foreground prose-li:break-words
                              prose-li:marker:mr-2
                              prose-blockquote:my-4 prose-blockquote:border-l-4 prose-blockquote:border-primary 
                              prose-blockquote:bg-gradient-to-r prose-blockquote:from-primary/10 prose-blockquote:to-primary/5 
                              prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:rounded-r-lg 
                              prose-blockquote:italic prose-blockquote:text-foreground prose-blockquote:shadow-sm prose-blockquote:break-words
                              prose-strong:text-primary prose-strong:font-bold 
                              prose-em:text-primary/80 prose-em:not-italic prose-em:font-semibold prose-em:px-1 prose-em:py-0.5 prose-em:bg-primary/10 prose-em:rounded
                              prose-code:text-xs prose-code:bg-background/80 prose-code:border prose-code:border-primary/30 
                              prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:text-primary prose-code:font-semibold prose-code:break-words
                              prose-pre:bg-background/60 prose-pre:border prose-pre:border-primary/20 prose-pre:rounded-lg prose-pre:shadow-md prose-pre:overflow-x-auto
                              prose-a:text-primary prose-a:font-semibold prose-a:underline prose-a:underline-offset-2 prose-a:decoration-primary/40 hover:prose-a:decoration-primary prose-a:break-words
                              prose-hr:my-5 prose-hr:border-primary/20 prose-hr:border-t-2
                              prose-table:my-4 prose-table:border-collapse prose-table:w-full prose-table:table-auto
                              prose-th:bg-primary/15 prose-th:text-foreground prose-th:font-bold prose-th:border prose-th:border-primary/20 prose-th:px-3 prose-th:py-2 prose-th:break-words
                              prose-td:border prose-td:border-primary/10 prose-td:px-3 prose-td:py-2 prose-td:text-foreground prose-td:break-words">
                              <ReactMarkdown
                                components={{
                                  a: ({ href, children, ...props }) => {
                                    const h = String(href || '');
                                    if (h.startsWith('bible://')) {
                                      const ref = decodeURIComponent(h.replace('bible://', ''));
                                      return (
                                        <a
                                          href="#"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            openBibleRef(ref);
                                          }}
                                          {...props}
                                        >
                                          {children}
                                        </a>
                                      );
                                    }
                                    return <a href={href} {...props}>{children}</a>;
                                  },
                                }}
                              >
                                {enrichContentWithIcons(msg.content)}
                              </ReactMarkdown>
                              {msg.content.includes("You're currently offline") && (
                                <InlineBibleDownload />
                              )}
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          )}
                        </div>
                        
                        {msg.role === 'assistant' && msg.content && (
                          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
                            {index > 0 && messages[index - 1]?.role === 'user' && detectStoryQuestion(messages[index - 1]?.content || '') && (
                              <Button
                                variant="default"
                                size="sm"
                                className="h-7 px-2.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                                onClick={() => handleGetFullStory(messages[index - 1]?.content)}
                              >
                                📖 Get Full Story
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
                              onClick={() => handleReply(index, msg.content)}
                            >
                              <Reply className="w-3.5 h-3.5 mr-1.5" />
                              Reply
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
                              onClick={() => handleCopy(index, msg.content)}
                            >
                              {copiedIndex === index ? (
                                <Check className="w-3.5 h-3.5 mr-1.5 text-primary" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              {copiedIndex === index ? 'Copied!' : 'Copy'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
                              onClick={() => {
                                setModalMessageContent(msg.content);
                                setMessageModalOpen(true);
                              }}
                            >
                              Read Full
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <BookOpen className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">Scripture Guide</span>
                        </div>
                        <div className="bg-gradient-to-br from-muted/80 to-muted border border-border/50 px-4 py-4 rounded-2xl rounded-tl-md shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            <span className="w-2 h-2 bg-primary/70 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                            <span className="text-xs text-muted-foreground ml-1">Searching scriptures...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Error display */}
            {error && (
              <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm text-center">
                {error}
              </div>
            )}

            {/* Reply indicator */}
            {replyTo && (
              <div className="px-4 py-2 bg-muted/50 border-t border-border flex items-center gap-2">
                <Reply className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground truncate flex-1">
                  Replying: {replyTo.content.slice(0, 60)}...
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setReplyTo(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={replyTo ? "Type your follow-up..." : "Ask about the Bible..."}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button 
                  size="icon" 
                  onClick={handleSend} 
                  disabled={!input.trim() || isLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
        {/* Message modal for long responses */}
        <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
          <DialogContent className="w-full max-w-3xl">
            <div className="bg-card border border-border rounded-lg overflow-hidden max-h-[85vh]">
              <div className="p-4 border-b border-border flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Full Response</h3>
                  <p className="text-xs text-muted-foreground">Tap copy to save or close when done.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (modalMessageContent) {
                      navigator.clipboard.writeText(modalMessageContent);
                      toast({ title: 'Copied to clipboard' });
                    }
                  }}>
                    <Copy className="w-4 h-4 mr-2" />Copy
                  </Button>
                  <Button variant="outline" onClick={() => setMessageModalOpen(false)}>Close</Button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto max-h-[72vh] prose prose-sm dark:prose-invert max-w-none">
                {modalMessageContent && (
                  <ReactMarkdown
                    components={{
                      a: ({ href, children, ...props }) => {
                        const h = String(href || '');
                        if (h.startsWith('bible://')) {
                          const ref = decodeURIComponent(h.replace('bible://', ''));
                          return (
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                openBibleRef(ref);
                              }}
                              {...props}
                            >
                              {children}
                            </a>
                          );
                        }
                        return <a href={href} {...props}>{children}</a>;
                      },
                    }}
                  >
                    {enrichContentWithIcons(modalMessageContent)}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* Bible passage dialog */}
      <BiblePassageDialog reference={passageRef} open={passageOpen} onOpenChange={setPassageOpen} />
    </div>
  );
};

export default BibleAIChat;
