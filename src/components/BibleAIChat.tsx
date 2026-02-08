import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Trash2, BookOpen, Reply, Copy, Check, Bookmark, FolderOpen, ChevronLeft } from 'lucide-react';
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
  const { messages, isLoading, error, sendMessage, clearChat, loadMessages } = useBibleChat();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
      <div 
        className={cn(
          "bg-card border border-border rounded-2xl shadow-2xl flex flex-col pointer-events-auto",
          "w-full max-w-md h-[500px] sm:h-[600px]",
          "animate-in slide-in-from-bottom-5 duration-300"
        )}
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
          <div className="flex items-center gap-1">
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
            <ScrollArea className="flex-1 px-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <Sparkles className="w-12 h-12 text-primary/50 mb-4" />
                  <h4 className="font-medium text-foreground mb-2">Ask about the Bible</h4>
                  <p className="text-sm text-muted-foreground max-w-[250px]">
                    I'm here to help you explore Scripture. Ask me anything about Bible verses, 
                    characters, or how to apply Biblical teachings to your life.
                  </p>
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">Try asking:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['What does John 3:16 mean?', 'How can I overcome fear?', 'Who was David?'].map((q) => (
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
                <div className="space-y-4 py-4">
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
                              : "bg-gradient-to-br from-muted/80 to-muted border border-border/50 px-4 py-4 rounded-2xl rounded-tl-md shadow-sm"
                          )}
                        >
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none 
                              prose-p:my-2.5 prose-p:leading-relaxed prose-p:text-foreground/90
                              prose-headings:font-semibold prose-headings:text-foreground 
                              prose-h1:text-base prose-h1:mt-5 prose-h1:mb-2 prose-h1:pb-1 prose-h1:border-b prose-h1:border-border/50
                              prose-h2:text-sm prose-h2:mt-4 prose-h2:mb-2 prose-h2:text-primary
                              prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1.5 prose-h3:font-medium
                              prose-ul:my-2.5 prose-ul:pl-4 prose-ul:space-y-1
                              prose-ol:my-2.5 prose-ol:pl-4 prose-ol:space-y-1
                              prose-li:my-0 prose-li:leading-relaxed prose-li:text-foreground/90
                              prose-blockquote:my-3 prose-blockquote:border-l-3 prose-blockquote:border-primary 
                              prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-4 
                              prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:text-foreground/80
                              prose-strong:text-primary prose-strong:font-semibold 
                              prose-em:text-foreground/70 prose-em:not-italic prose-em:font-medium
                              prose-code:text-xs prose-code:bg-background prose-code:border prose-code:border-border/50 
                              prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-primary
                              prose-a:text-primary prose-a:underline prose-a:underline-offset-2 prose-a:decoration-primary/50
                              prose-hr:my-4 prose-hr:border-border/50">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
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