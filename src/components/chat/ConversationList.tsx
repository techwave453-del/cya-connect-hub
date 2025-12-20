import { formatDistanceToNow } from "date-fns";
import { Users, User, MessageCircle } from "lucide-react";
import { Conversation } from "@/hooks/useConversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | undefined;
  onSelect: (conversation: Conversation) => void;
  currentUserId: string;
}

const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
  currentUserId,
}: ConversationListProps) => {
  const getDisplayName = (conversation: Conversation) => {
    if (conversation.is_group && conversation.name) {
      return conversation.name;
    }
    
    // For DMs, show the other person's name
    const otherParticipant = conversation.participants.find(
      (p) => p.user_id !== currentUserId
    );
    return otherParticipant?.username || "Unknown";
  };

  const getAvatarUrl = (conversation: Conversation) => {
    if (conversation.is_group) return null;
    
    const otherParticipant = conversation.participants.find(
      (p) => p.user_id !== currentUserId
    );
    return otherParticipant?.avatar_url;
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm text-center">No conversations yet</p>
        <p className="text-xs text-center mt-1">Start a new chat!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
              selectedId === conversation.id
                ? "bg-primary/10 border border-primary/30"
                : "hover:bg-muted"
            }`}
          >
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={getAvatarUrl(conversation) || undefined} />
              <AvatarFallback className="bg-secondary">
                {conversation.is_group ? (
                  <Users className="h-5 w-5" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground truncate">
                  {getDisplayName(conversation)}
                </span>
                {conversation.lastMessage && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
                      addSuffix: false,
                    })}
                  </span>
                )}
              </div>
              
              {conversation.lastMessage && (
                <p className="text-sm text-muted-foreground truncate">
                  {conversation.lastMessage.content}
                </p>
              )}
              
              {conversation.is_group && (
                <p className="text-xs text-muted-foreground">
                  {conversation.participants.length} members
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ConversationList;
