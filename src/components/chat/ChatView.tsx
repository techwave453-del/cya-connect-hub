import { useState, useRef, useEffect } from "react";
import { Send, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessages, Message } from "@/hooks/useMessages";
import { Conversation } from "@/hooks/useConversations";
import { formatDistanceToNow } from "date-fns";

interface ChatViewProps {
  conversation: Conversation;
  currentUserId: string;
}

const ChatView = ({ conversation, currentUserId }: ChatViewProps) => {
  const { messages, loading, sendMessage } = useMessages(conversation.id);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(newMessage, currentUserId);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getDisplayName = () => {
    if (conversation.is_group && conversation.name) {
      return conversation.name;
    }
    
    const otherParticipant = conversation.participants.find(
      (p) => p.user_id !== currentUserId
    );
    return otherParticipant?.username || "Unknown";
  };

  const getAvatarUrl = () => {
    if (conversation.is_group) return null;
    
    const otherParticipant = conversation.participants.find(
      (p) => p.user_id !== currentUserId
    );
    return otherParticipant?.avatar_url;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Avatar className="h-10 w-10">
          <AvatarImage src={getAvatarUrl() || undefined} />
          <AvatarFallback className="bg-secondary">
            {conversation.is_group ? (
              <Users className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-foreground">{getDisplayName()}</h3>
          {conversation.is_group && (
            <p className="text-xs text-muted-foreground">
              {conversation.participants.length} members
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-center">No messages yet. Say hello!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === currentUserId}
                showSender={conversation.is_group}
              />
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-muted border-border"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
}

const MessageBubble = ({ message, isOwn, showSender }: MessageBubbleProps) => {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`flex gap-2 max-w-[75%] ${isOwn ? "flex-row-reverse" : ""}`}>
        {!isOwn && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={message.sender?.avatar_url || undefined} />
            <AvatarFallback className="bg-secondary text-xs">
              {message.sender?.username?.charAt(0).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div>
          {showSender && !isOwn && message.sender && (
            <p className="text-xs text-muted-foreground mb-1">
              {message.sender.username}
            </p>
          )}
          
          <div
            className={`rounded-2xl px-4 py-2 ${
              isOwn
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          
          <p className={`text-xs text-muted-foreground mt-1 ${isOwn ? "text-right" : ""}`}>
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
