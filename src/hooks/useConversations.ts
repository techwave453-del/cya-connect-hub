import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAll, putAll, getById } from "@/lib/offlineDb";
import { useOnlineStatus } from "./useOnlineStatus";

interface Participant {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  lastMessage?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
}

interface CachedConversation {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: Participant[];
}

interface CachedMessage {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender_id: string;
}

interface CachedProfile {
  id?: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export const useConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const isOnline = useOnlineStatus();

  const buildFromCache = useCallback(async (uid: string): Promise<Conversation[]> => {
    try {
      const allConvs = await getAll<CachedConversation>("conversations");
      const allMsgs = await getAll<CachedMessage>("messages");
      const allProfiles = await getAll<CachedProfile>("profiles");
      const profileMap = new Map(allProfiles.map((p) => [p.user_id, p]));

      // Filter to conversations the user participates in (best effort: those with cached participants or messages from/to user)
      const userConvs = allConvs.filter((c) => {
        if (c.participants?.some((p) => p.user_id === uid)) return true;
        // fallback: any conversation that has messages
        return allMsgs.some((m) => m.conversation_id === c.id);
      });

      return userConvs
        .map((c) => {
          const msgs = allMsgs
            .filter((m) => m.conversation_id === c.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const last = msgs[0];
          const participants = (c.participants || []).map((p) => {
            const prof = profileMap.get(p.user_id);
            return {
              user_id: p.user_id,
              username: prof?.username || p.username || "Unknown",
              avatar_url: prof?.avatar_url ?? p.avatar_url ?? null,
            };
          });
          return {
            id: c.id,
            name: c.name,
            is_group: c.is_group,
            created_by: c.created_by,
            created_at: c.created_at,
            updated_at: c.updated_at,
            participants,
            lastMessage: last
              ? { content: last.content, created_at: last.created_at, sender_id: last.sender_id }
              : undefined,
          } as Conversation;
        })
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } catch {
      return [];
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // 1. Cache-first
    const cached = await buildFromCache(userId);
    if (cached.length > 0) {
      setConversations(cached);
      setLoading(false);
    }

    if (!isOnline) {
      setLoading(false);
      return;
    }

    try {
      // Get all conversation IDs where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      if (participantError) throw participantError;

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participantData.map((p) => p.conversation_id);

      // Get conversations
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (convError) throw convError;

      // Get all participants for these conversations
      const { data: allParticipants, error: allPartError } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds);

      if (allPartError) throw allPartError;

      // Get profiles for all participants
      const participantUserIds = [...new Set(allParticipants?.map((p) => p.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", participantUserIds);

      if (profilesError) throw profilesError;

      // Get last message for each conversation
      const { data: lastMessages, error: messagesError } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at, sender_id, id")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      // Build conversation objects
      const conversationsWithDetails: Conversation[] = (convData || []).map((conv) => {
        const convParticipants =
          allParticipants
            ?.filter((p) => p.conversation_id === conv.id)
            .map((p) => {
              const profile = profiles?.find((pr) => pr.user_id === p.user_id);
              return {
                user_id: p.user_id,
                username: profile?.username || "Unknown",
                avatar_url: profile?.avatar_url || null,
              };
            }) || [];

        const lastMessage = lastMessages?.find((m) => m.conversation_id === conv.id);

        return {
          ...conv,
          participants: convParticipants,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                created_at: lastMessage.created_at,
                sender_id: lastMessage.sender_id,
              }
            : undefined,
        };
      });

      setConversations(conversationsWithDetails);

      // Cache for offline use
      try {
        const toCache: CachedConversation[] = conversationsWithDetails.map((c) => ({
          id: c.id,
          name: c.name,
          is_group: c.is_group,
          created_by: c.created_by,
          created_at: c.created_at,
          updated_at: c.updated_at,
          participants: c.participants,
        }));
        await putAll("conversations", toCache);
        if (lastMessages) await putAll("messages", lastMessages as { id: string }[]);
        if (profiles) await putAll("profiles", profiles.map((p) => ({ ...p, id: p.user_id })));
      } catch { /* ignore */ }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, isOnline, buildFromCache]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to message updates to refresh conversations (online only)
  useEffect(() => {
    if (!userId || !isOnline) return;

    const channel = supabase
      .channel("conversations-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isOnline, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
};
