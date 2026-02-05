 import { useState, useRef, useEffect } from 'react';
 import { X, Send, Sparkles, Trash2, BookOpen } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { cn } from '@/lib/utils';
 import { useBibleChat } from '@/hooks/useBibleChat';
 
 interface BibleAIChatProps {
   isOpen: boolean;
   onClose: () => void;
 }
 
 const BibleAIChat = ({ isOpen, onClose }: BibleAIChatProps) => {
   const [input, setInput] = useState('');
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
     sendMessage(input.trim());
     setInput('');
   };
 
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       handleSend();
     }
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
                   <div
                     className={cn(
                       "max-w-[85%] px-4 py-3 rounded-2xl text-sm",
                       msg.role === 'user'
                         ? "bg-primary text-primary-foreground rounded-br-md"
                         : "bg-muted rounded-bl-md"
                     )}
                   >
                     <div className="whitespace-pre-wrap">{msg.content}</div>
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
 
         {/* Input */}
         <div className="p-4 border-t border-border">
           <div className="flex gap-2">
             <Input
               ref={inputRef}
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Ask about the Bible..."
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