import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAll, putAll, put, addToSyncQueue } from "@/lib/offlineDb";
import { useOnlineStatus } from "./useOnlineStatus";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    username: string;
    avatar_url: string | null;
  };
  pending?: boolean;
}

interface CachedProfile {
  id?: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export const useMessages = (conversationId: string | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const isOnline = useOnlineStatus();

  const decorateWithSenders = useCallback(async (msgs: Message[]): Promise<Message[]> => {
    try {
      const profiles = await getAll<CachedProfile>("profiles");
      const map = new Map(profiles.map((p) => [p.user_id, p]));
      return msgs.map((m) => {
        const p = map.get(m.sender_id);
        return p ? { ...m, sender: { username: p.username, avatar_url: p.avatar_url } } : m;
      });
    } catch {
      return msgs;
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    // 1. Cache-first
    try {
      const all = await getAll<Message>("messages");
      const cached = all
        .filter((m) => m.conversation_id === conversationId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (cached.length > 0) {
        const decorated = await decorateWithSenders(cached);
        setMessages(decorated);
        setLoading(false);
      }
    } catch { /* ignore */ }

    if (!isOnline) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(data?.map((m) => m.sender_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", senderIds);

      if (profilesError) throw profilesError;

      const messagesWithSenders: Message[] = (data || []).map((msg) => {
        const profile = profiles?.find((p) => p.user_id === msg.sender_id);
        return {
          ...msg,
          sender: profile
            ? { username: profile.username, avatar_url: profile.avatar_url }
            : undefined,
        };
      });

      setMessages(messagesWithSenders);

      // Cache for offline
      try {
        if (data) await putAll("messages", data as { id: string }[]);
        if (profiles) await putAll("profiles", profiles.map((p) => ({ ...p, id: p.user_id })));
      } catch { /* ignore */ }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, isOnline, decorateWithSenders]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to real-time messages (INSERT and DELETE) — online only
  useEffect(() => {
    if (!conversationId || !isOnline) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, username, avatar_url")
            .eq("user_id", newMessage.sender_id)
            .maybeSingle();

          const messageWithSender: Message = {
            ...newMessage,
            sender: profile
              ? { username: profile.username, avatar_url: profile.avatar_url }
              : undefined,
          };

          setMessages((prev) => {
            // dedupe by id
            if (prev.some((m) => m.id === messageWithSender.id)) return prev;
            return [...prev, messageWithSender];
          });
          try { await put("messages", newMessage as { id: string }); } catch { /* ignore */ }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deletedMessage = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== deletedMessage.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, isOnline]);

  const sendMessage = async (content: string, senderId: string) => {
    if (!conversationId || !content.trim()) return;

    const newMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      pending: !isOnline,
    };

    // Optimistic update + cache
    setMessages((prev) => [...prev, newMsg]);
    try { await put("messages", newMsg as unknown as { id: string }); } catch { /* ignore */ }

    if (!isOnline) {
      await addToSyncQueue({
        table: "messages",
        action: "insert",
        data: {
          id: newMsg.id,
          conversation_id: conversationId,
          sender_id: senderId,
          content: newMsg.content,
        },
      });
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      // Queue for retry
      await addToSyncQueue({
        table: "messages",
        action: "insert",
        data: {
          id: newMsg.id,
          conversation_id: conversationId,
          sender_id: senderId,
          content: newMsg.content,
        },
      });
      throw error;
    }

    // Update conversation updated_at
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Trigger push notification for other participants
    if (data) {
      supabase.functions.invoke("notify-new-message", {
        body: {
          messageId: data.id,
          conversationId: conversationId,
          senderId: senderId,
          content: content.trim(),
        },
      }).catch((err) => {
        console.error("Error triggering push notification:", err);
      });
    }
  };

  return { messages, loading, sendMessage, refetch: fetchMessages };
};
