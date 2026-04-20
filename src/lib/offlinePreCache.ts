/**
 * Smart pre-caching: fetches and caches key data when online
 * so the app loads instantly when offline.
 */
import { supabase } from "@/integrations/supabase/client";
import { putAll, setMetadata, getMetadata } from "./offlineDb";
import { precacheStoryImages } from "./imageCache";

const PRECACHE_INTERVAL = 15 * 60 * 1000; // 15 minutes
const PRECACHE_KEY = "precache:lastRun";

interface PreCacheResult {
  table: string;
  cached: number;
  error?: string;
}

export const shouldPreCache = async (): Promise<boolean> => {
  try {
    const last = await getMetadata(PRECACHE_KEY);
    if (typeof last === "number" && Date.now() - last < PRECACHE_INTERVAL) {
      return false;
    }
  } catch {
    // proceed
  }
  return true;
};

export const runPreCache = async (): Promise<PreCacheResult[]> => {
  if (!navigator.onLine) return [];

  const should = await shouldPreCache();
  if (!should) {
    console.log("[PreCache] Skipped — ran recently");
    return [];
  }

  console.log("[PreCache] Starting smart pre-cache…");
  const results: PreCacheResult[] = [];

  // Get current user for user-scoped caches
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;

  const tasks: Array<{ table: string; fetch: () => Promise<{ id: string }[]> }> = [
    {
      table: "posts",
      fetch: async () => {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return data || [];
      },
    },
    {
      table: "daily_stories",
      fetch: async () => {
        // Pre-cache last 30 days of Daily Bible Stories so users can scroll offline
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("hashtag", "#DailyBibleStory")
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(30);
        if (error) throw error;
        return data || [];
      },
    },
    {
      table: "tasks",
      fetch: async () => {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      },
    },
    {
      table: "activities",
      fetch: async () => {
        const { data, error } = await supabase
          .from("activities")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      },
    },
    {
      table: "bible_verses",
      fetch: async () => {
        const { data, error } = await supabase
          .from("bible_verses")
          .select("*")
          .order("day_of_year", { ascending: true });
        if (error) throw error;
        return data || [];
      },
    },
    {
      table: "bible_games",
      fetch: async () => {
        const { data, error } = await supabase
          .from("bible_games")
          .select("*")
          .eq("is_active", true);
        if (error) throw error;
        return data || [];
      },
    },
    {
      table: "profiles",
      fetch: async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .limit(200);
        if (error) throw error;
        return data || [];
      },
    },
    {
      table: "achievements",
      fetch: async () => {
        const { data, error } = await supabase.from("achievements").select("*");
        if (error) throw error;
        return data || [];
      },
    },
    {
      table: "app_settings",
      fetch: async () => {
        const { data, error } = await supabase.from("app_settings").select("*");
        if (error) throw error;
        return data || [];
      },
    },
    {
      table: "post_comments",
      fetch: async () => {
        const { data, error } = await supabase
          .from("post_comments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        return data || [];
      },
    },
    {
      table: "post_likes",
      fetch: async () => {
        const { data, error } = await supabase
          .from("post_likes")
          .select("*")
          .limit(1000);
        if (error) throw error;
        return data || [];
      },
    },
  ];

  // User-scoped caches
  if (userId) {
    tasks.push(
      {
        table: "user_achievements",
        fetch: async () => {
          const { data, error } = await supabase
            .from("user_achievements")
            .select("*")
            .eq("user_id", userId);
          if (error) throw error;
          return data || [];
        },
      },
      {
        table: "user_streaks",
        fetch: async () => {
          const { data, error } = await supabase
            .from("user_streaks")
            .select("*")
            .eq("user_id", userId);
          if (error) throw error;
          return data || [];
        },
      },
      {
        table: "saved_bible_chats",
        fetch: async () => {
          const { data, error } = await supabase
            .from("saved_bible_chats")
            .select("*")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(50);
          if (error) throw error;
          return data || [];
        },
      },
      {
        table: "conversations",
        fetch: async () => {
          // Get user's conversations
          const { data: parts } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("user_id", userId);
          const ids = (parts || []).map((p) => p.conversation_id);
          if (ids.length === 0) return [];
          const { data, error } = await supabase
            .from("conversations")
            .select("*")
            .in("id", ids);
          if (error) throw error;
          return data || [];
        },
      },
      {
        table: "messages",
        fetch: async () => {
          // Get user's conversations and recent messages
          const { data: parts } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("user_id", userId);
          const ids = (parts || []).map((p) => p.conversation_id);
          if (ids.length === 0) return [];
          const { data, error } = await supabase
            .from("messages")
            .select("*")
            .in("conversation_id", ids)
            .order("created_at", { ascending: false })
            .limit(500);
          if (error) throw error;
          return data || [];
        },
      },
      {
        table: "game_scores",
        fetch: async () => {
          const { data, error } = await supabase
            .from("game_scores")
            .select("*")
            .eq("user_id", userId);
          if (error) throw error;
          return data || [];
        },
      }
    );
  }

  // Run all fetches in parallel
  const settled = await Promise.allSettled(
    tasks.map(async (t) => {
      try {
        const data = await t.fetch();
        if (data.length > 0) {
          await putAll(t.table, data as { id: string }[]);
        }
        return { table: t.table, cached: data.length };
      } catch (err) {
        return { table: t.table, cached: 0, error: String(err) };
      }
    })
  );

  for (const s of settled) {
    if (s.status === "fulfilled") {
      results.push(s.value);
    }
  }

  await setMetadata(PRECACHE_KEY, Date.now());

  const total = results.reduce((sum, r) => sum + r.cached, 0);
  console.log(`[PreCache] Done — cached ${total} items across ${results.length} tables`);

  return results;
};
