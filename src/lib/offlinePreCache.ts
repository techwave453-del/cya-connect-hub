/**
 * Smart pre-caching: fetches and caches key data when online
 * so the app loads instantly when offline.
 */
import { supabase } from "@/integrations/supabase/client";
import { putAll, setMetadata, getMetadata } from "./offlineDb";

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

  const tasks = [
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
  ];

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
