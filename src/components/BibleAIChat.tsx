import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Send, Sparkles, Trash2, BookOpen, Reply, Copy, Check, Bookmark, FolderOpen, ChevronLeft, Image } from 'lucide-react';
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

// Helper function to enrich markdown with icons and visual formatting
const enrichContentWithIcons = (content: string): string => {
  let enriched = content;
  
  // Add icons to common scripture reference patterns
  enriched = enriched.replace(
    /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|John|Jude|Revelation)\s+(\d+):(\d+)/gi,
    '📖 $1 $2:$3'
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
}

const BibleAIChat = ({ isOpen, onClose }: BibleAIChatProps) => {
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ index: number; content: string } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showSavedChats, setShowSavedChats] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isLoading, error, sendMessage, clearChat, loadMessages, generateInsight } = useBibleChat();
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
    { id: 'creation', title: 'Creation', refs: ['Genesis 1-2'], thumb: '🌅', image: `https://picsum.photos/seed/creation/600/400` },
    { id: 'fall', title: 'The Fall (Adam & Eve)', refs: ['Genesis 3'], thumb: '🍎', image: `https://picsum.photos/seed/fall/600/400` },
    { id: 'cain_abel', title: 'Cain and Abel', refs: ['Genesis 4'], thumb: '⚖️', image: `https://picsum.photos/seed/cain_abel/600/400` },
    { id: 'noah', title: 'Noah and the Flood', refs: ['Genesis 6-9'], thumb: '🌊', image: `https://picsum.photos/seed/noah/600/400` },
    { id: 'tower', title: 'Tower of Babel', refs: ['Genesis 11'], thumb: '🧱', image: `https://picsum.photos/seed/tower/600/400` },
    { id: 'abraham', title: 'Abraham and Isaac', refs: ['Genesis 12', 'Genesis 22'], thumb: '🕊️', image: `https://picsum.photos/seed/abraham/600/400` },
    { id: 'jacob_esau', title: 'Jacob and Esau', refs: ['Genesis 25-33'], thumb: '🤼', image: `https://picsum.photos/seed/jacob_esau/600/400` },
    { id: 'joseph', title: 'Joseph (sold into Egypt)', refs: ['Genesis 37, 39-45'], thumb: '🧑‍🌾', image: `https://picsum.photos/seed/joseph/600/400` },
    { id: 'moses', title: 'Moses and the Exodus', refs: ['Exodus 1-15'], thumb: '🔥', image: `https://picsum.photos/seed/moses/600/400` },
    { id: 'sinai', title: 'Ten Commandments', refs: ['Exodus 19-20'], thumb: '📜', image: `https://picsum.photos/seed/sinai/600/400` },
    { id: 'joshua', title: 'Joshua and Jericho', refs: ['Joshua 6'], thumb: '🏛️', image: `https://picsum.photos/seed/joshua/600/400` },
    { id: 'judges', title: 'Judges & Deliverers (Deborah, Gideon)', refs: ['Judges'], thumb: '🛡️', image: `https://picsum.photos/seed/judges/600/400` },
    { id: 'ruth', title: 'Ruth and Loyalty', refs: ['Ruth'], thumb: '🤝', image: `https://picsum.photos/seed/ruth/600/400` },
    { id: 'samuel', title: 'Samuel & Saul', refs: ['1 Samuel'], thumb: '📯', image: `https://picsum.photos/seed/samuel/600/400` },
    { id: 'david_goliath', title: 'David and Goliath', refs: ['1 Samuel 17'], thumb: '🪨', image: `https://picsum.photos/seed/david_goliath/600/400` },
    { id: 'david_king', title: 'King David', refs: ['2 Samuel'], thumb: '👑', image: `https://picsum.photos/seed/david_king/600/400` },
    { id: 'solomon', title: 'Solomon (wisdom & temple)', refs: ['1 Kings 3', '1 Kings 6-8'], thumb: '🏛️', image: `https://picsum.photos/seed/solomon/600/400` },
    { id: 'elijah', title: 'Elijah on Mount Carmel', refs: ['1 Kings 18'], thumb: '⚡', image: `https://picsum.photos/seed/elijah/600/400` },
    { id: 'jonah', title: 'Jonah and the Whale', refs: ['Jonah'], thumb: '🐋', image: `https://picsum.photos/seed/jonah/600/400` },
    { id: 'daniel', title: 'Daniel in the Lion\'s Den', refs: ['Daniel 6'], thumb: '🦁', image: `https://picsum.photos/seed/daniel/600/400` },
    { id: 'esther', title: 'Esther (deliverance)', refs: ['Esther'], thumb: '👸', image: `https://picsum.photos/seed/esther/600/400` },
    { id: 'job', title: 'Job (suffering & faith)', refs: ['Job'], thumb: '🌩️', image: `https://picsum.photos/seed/job/600/400` },
    { id: 'prophets', title: 'Major Prophets (Isaiah, Jeremiah)', refs: ['Isaiah', 'Jeremiah'], thumb: '📣', image: `https://picsum.photos/seed/prophets/600/400` },
    { id: 'nativity', title: 'Birth of Jesus', refs: ['Luke 2', 'Matthew 1-2'], thumb: '🌟', image: `https://picsum.photos/seed/nativity/600/400` },
    { id: 'baptism', title: 'Baptism of Jesus', refs: ['Matthew 3', 'Mark 1'], thumb: '💧', image: `https://picsum.photos/seed/baptism/600/400` },
    { id: 'temptation', title: 'Temptation of Jesus', refs: ['Matthew 4'], thumb: '🍃', image: `https://picsum.photos/seed/temptation/600/400` },
    { id: 'miracles', title: 'Jesus\' Miracles (feeding, healing)', refs: ['Matthew 14', 'Mark 5'], thumb: '✨', image: `https://picsum.photos/seed/miracles/600/400` },
    { id: 'parables', title: 'Parables (Prodigal Son, Good Samaritan)', refs: ['Luke 15', 'Luke 10'], thumb: '📖', image: `https://picsum.photos/seed/parables/600/400` },
    { id: 'last_supper', title: 'Last Supper', refs: ['Matthew 26'], thumb: '🍞', image: `https://picsum.photos/seed/last_supper/600/400` },
    { id: 'crucifixion', title: 'Crucifixion', refs: ['Matthew 27', 'Mark 15', 'Luke 23', 'John 19'], thumb: '✝️', image: `https://picsum.photos/seed/crucifixion/600/400` },
    { id: 'resurrection', title: 'Resurrection', refs: ['Matthew 28', 'Mark 16', 'Luke 24', 'John 20-21'], thumb: '🌅', image: `https://picsum.photos/seed/resurrection/600/400` },
    { id: 'pentecost', title: 'Pentecost', refs: ['Acts 2'], thumb: '🔥', image: `https://picsum.photos/seed/pentecost/600/400` },
    { id: 'paul', title: 'Paul (conversion & missions)', refs: ['Acts 9', 'Acts 13-28'], thumb: '✉️', image: `https://picsum.photos/seed/paul/600/400` },
    { id: 'revelation', title: 'Revelation (visions)', refs: ['Revelation'], thumb: '🔮', image: `https://picsum.photos/seed/revelation/600/400` },
  ];
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
    const prompt = `Provide a concise (2-3 sentence) insight about the biblical story "${story.title}" and list 1-2 key scripture references.`;
    const result = await generateInsight(prompt);
    setCurrentInsight(result);
    setLoadingInsight(false);
  };

  const handleNextStory = () => {
    setCurrentStoryIdx((p) => (p + 1) % storyOrder.length);
    setCurrentInsight(null);
    setReadMoreClicked(false);
  };

  const handlePrevStory = () => {
    setCurrentStoryIdx((p) => (p - 1 + storyOrder.length) % storyOrder.length);
    setCurrentInsight(null);
    setReadMoreClicked(false);
  };

  useEffect(() => {
    // Auto-fetch insight when current story changes
    fetchInsightForCurrent();
  }, [currentStoryIdx, storyOrder]);

  // Auto-shuffle if user does not click Read More within a short delay
  useEffect(() => {
    const AUTO_DELAY = 30000; // 30 seconds
    if (readMoreClicked) return;

    const id = window.setTimeout(() => {
      shuffleStories();
    }, AUTO_DELAY);

    return () => window.clearTimeout(id);
  }, [currentStoryIdx, storyOrder, readMoreClicked]);

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
          "w-full sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh] h-auto",
          "animate-in slide-in-from-bottom-5 duration-300"
        )}
        style={{ resize: 'vertical' as const, maxHeight: '80vh' }}
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
                {showSavedChats ? `${savedChats.length} saved` : 'Bible AI Assistant'}
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
            <ScrollArea className="flex-1 min-h-0 px-4" ref={scrollRef}>
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
                          <Button size="sm" onClick={fetchInsightForCurrent} disabled={loadingInsight}>{loadingInsight ? 'Loading...' : 'Refresh'}</Button>
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-left max-h-[40vh] md:max-h-[50vh] overflow-y-auto">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {showImages && (
                              <button
                                className="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex-shrink-0"
                                onClick={() => {
                                  const s = BIBLE_STORIES[storyOrder[currentStoryIdx]];
                                  if (s?.image) {
                                    setImageDialogUrl(s.image);
                                    setImageDialogOpen(true);
                                  }
                                }}
                              >
                                {BIBLE_STORIES[storyOrder[currentStoryIdx]]?.image ? (
                                  <img
                                    src={BIBLE_STORIES[storyOrder[currentStoryIdx]]?.image}
                                    alt={BIBLE_STORIES[storyOrder[currentStoryIdx]]?.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full text-xl text-primary">{BIBLE_STORIES[storyOrder[currentStoryIdx]]?.thumb || '📖'}</div>
                                )}
                              </button>
                            )}
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
                              const readMorePrompt = `Please recreate the biblical story "${story.title}" using scripture quotes and references where appropriate. Present a faithful retelling that cites specific verses (${story.refs.join(', ')}).`;
                              sendMessage(readMorePrompt);
                            }} className="flex-1 sm:flex-none">Read More</Button>
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-foreground/90 overflow-hidden">
                          {loadingInsight ? (
                            <div className="text-xs text-muted-foreground">Loading insight...</div>
                          ) : currentInsight ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden
                              prose-p:my-1.5 prose-p:leading-relaxed prose-p:break-words
                              prose-strong:text-primary prose-strong:font-semibold
                              prose-em:text-primary/80 prose-em:not-italic prose-em:font-semibold
                              prose-a:text-primary prose-a:font-semibold prose-a:underline prose-a:break-words">
                              <ReactMarkdown>{enrichContentWithIcons(currentInsight)}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">Click Refresh or Read More to get a story insight.</div>
                          )}
                        </div>
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
                      <div className="max-w-[85%] group">
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
                              : "bg-gradient-to-br from-muted/80 to-muted border border-border/50 px-4 py-4 rounded-2xl rounded-tl-md shadow-sm max-h-[60vh] overflow-y-auto"
                          )}
                        >
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden
                              prose-p:my-3 prose-p:leading-relaxed prose-p:text-foreground prose-p:break-words
                              prose-headings:font-bold prose-headings:text-foreground prose-headings:break-words
                              prose-h1:text-lg prose-h1:mt-6 prose-h1:mb-3 prose-h1:pb-2 prose-h1:border-b-2 prose-h1:border-primary/30 prose-h1:bg-gradient-to-r prose-h1:from-primary/10 prose-h1:to-transparent prose-h1:px-3 prose-h1:py-2 prose-h1:rounded-lg
                              prose-h2:text-base prose-h2:mt-5 prose-h2:mb-3 prose-h2:text-primary prose-h2:bg-primary/5 prose-h2:px-3 prose-h2:py-1 prose-h2:rounded-md
                              prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-primary/90 prose-h3:font-semibold
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
                              <ReactMarkdown>{enrichContentWithIcons(msg.content)}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          )}
                        </div>
                        
                        {msg.role === 'assistant' && msg.content && (
                          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </div>
    </div>
  );
};

export default BibleAIChat;