import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAll, put } from "@/lib/offlineDb";

export interface DailyStory {
  id: string;
  user_id: string;
  username: string;
  hashtag: string;
  title?: string;
  description?: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

const STORE_NAME = 'daily_story';

export const useDailyStory = () => {
  const [story, setStory] = useState<DailyStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStoryFromCache = useCallback(async (): Promise<DailyStory | null> => {
    try {
      const cachedStories = await getAll<DailyStory>(STORE_NAME);
      if (cachedStories.length > 0) {
        return cachedStories[cachedStories.length - 1];
      }
    } catch (e) {
      console.log("Cache read failed:", e);
    }
    return null;
  }, []);

  const fetchStory = useCallback(async () => {
    setLoading(true);
    try {
      if (isOnline) {
        // First check if admin has selected a specific story
        const { data: settingData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'selected_daily_story')
          .maybeSingle();

        const selectedId = (settingData?.value as { storyId?: string })?.storyId;

        let dailyStory: DailyStory | null = null;

        if (selectedId) {
          // Fetch the admin-selected story
          const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', selectedId)
            .eq('hashtag', '#DailyBibleStory')
            .single();

          if (!error && data) {
            dailyStory = data as DailyStory;
          }
        }

        if (!dailyStory) {
          // Fallback: get today's latest story
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

          const { data: stories, error } = await supabase
            .from('posts')
            .select('*')
            .eq('hashtag', '#DailyBibleStory')
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

          if (!error && stories && stories.length > 0) {
            dailyStory = stories[0] as DailyStory;
          }
        }

        if (!dailyStory) {
          // Final fallback: get the most recent story ever
          const { data: latest, error } = await supabase
            .from('posts')
            .select('*')
            .eq('hashtag', '#DailyBibleStory')
            .order('created_at', { ascending: false })
            .limit(1);

          if (!error && latest && latest.length > 0) {
            dailyStory = latest[0] as DailyStory;
          }
        }

        if (dailyStory) {
          try { await put(STORE_NAME, dailyStory); } catch {}
          setStory(dailyStory);
          setLoading(false);
          return;
        }
      }

      // Offline fallback
      const cachedStory = await getStoryFromCache();
      setStory(cachedStory);
    } catch (err) {
      console.error("Error fetching story:", err);
      const cachedStory = await getStoryFromCache();
      setStory(cachedStory);
    } finally {
      setLoading(false);
    }
  }, [isOnline, getStoryFromCache]);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  // Auto-refresh at midnight
  useEffect(() => {
    const setupMidnightRefresh = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();

      const timeoutId = setTimeout(() => {
        fetchStory();
        setupMidnightRefresh();
      }, timeUntilMidnight);

      return () => clearTimeout(timeoutId);
    };
    return setupMidnightRefresh();
  }, [fetchStory]);

  return { story, loading, isOnline };
};
