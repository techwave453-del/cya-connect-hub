 import { useState, useRef, useEffect, useCallback } from 'react';
 import { X, Send, Sparkles, Trash2, BookOpen, Reply, Copy, Check } from 'lucide-react';
 import ReactMarkdown from 'react-markdown';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { cn } from '@/lib/utils';
 import { useBibleChat } from '@/hooks/useBibleChat';
 import { toast } from '@/hooks/use-toast';
 
 interface BibleAIChatProps {
   isOpen: boolean;
   onClose: () => void;
 }
 
 const BibleAIChat = ({ isOpen, onClose }: BibleAIChatProps) => {
   const [input, setInput] = useState('');
   const [replyTo, setReplyTo] = useState<{ index: number; content: string } | null>(null);
   const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
   const scrollRef = useRef<HTMLDivElement>(null);
   const inputRef = useRef<HTMLInputElement>(null);
   const { messages, isLoading, error, sendMessage, clearChat } = useBibleChat();
 
   useEffect(() => {
     if (scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
     }
   }, [messages]);
 
   useEffect(() => {
     if (isOpen && inputRef.current) {
       setTimeout(() => inputRef.current?.focus(), 100);
     }
   }, [isOpen]);
 
   const handleSend = () => {
     if (!input.trim() || isLoading) return;
     
     // If replying, prepend context
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
             <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
               <BookOpen className="w-5 h-5 text-primary" />
             </div>
             <div>
               <h3 className="font-semibold text-foreground">Scripture Guide</h3>
               <p className="text-xs text-muted-foreground">Bible AI Assistant</p>
             </div>
           </div>
           <div className="flex items-center gap-1">
             {messages.length > 0 && (
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
                    <div
                      className={cn(
                        "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed prose-headings:font-semibold prose-headings:text-foreground prose-h1:text-lg prose-h1:mt-6 prose-h1:mb-3 prose-h2:text-base prose-h2:mt-5 prose-h2:mb-3 prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2 prose-ul:my-3 prose-ul:pl-5 prose-ol:my-3 prose-ol:pl-5 prose-li:my-1.5 prose-li:leading-relaxed prose-blockquote:my-4 prose-blockquote:border-l-4 prose-blockquote:border-primary/60 prose-blockquote:bg-primary/10 prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:rounded-r-xl prose-blockquote:font-medium prose-strong:text-primary prose-strong:font-semibold prose-em:text-primary/80 prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-a:text-primary prose-a:underline prose-a:underline-offset-2">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                       ) : (
                         <div className="whitespace-pre-wrap">{msg.content}</div>
                       )}
                     </div>
                     
                     {/* Action buttons for AI messages */}
                     {msg.role === 'assistant' && msg.content && (
                       <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button
                           variant="ghost"
                           size="sm"
                           className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                           onClick={() => handleReply(index, msg.content)}
                         >
                           <Reply className="w-3 h-3 mr-1" />
                           Reply
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                           onClick={() => handleCopy(index, msg.content)}
                         >
                           {copiedIndex === index ? (
                            <Check className="w-3 h-3 mr-1 text-primary" />
                           ) : (
                             <Copy className="w-3 h-3 mr-1" />
                           )}
                           {copiedIndex === index ? 'Copied' : 'Copy'}
                         </Button>
                       </div>
                     )}
                   </div>
                 </div>
               ))}
               {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                 <div className="flex justify-start">
                   <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                     <div className="flex items-center gap-1">
                       <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                       <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                       <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
       </div>
     </div>
   );
 };
 
 export default BibleAIChat;