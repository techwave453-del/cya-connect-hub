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

  // Track online/offline status
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

  // Helper to check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  // Helper to get cached story
  const getStoryFromCache = useCallback(async (): Promise<DailyStory | null> => {
    try {
      const cachedStories = await getAll<DailyStory>(STORE_NAME);
      if (cachedStories.length > 0) {
        // Get the most recent story (should be today's)
        const story = cachedStories[cachedStories.length - 1];
        if (isToday(new Date(story.created_at))) {
          return story;
        }
      }
    } catch (e) {
      console.log("Cache read failed:", e);
    }
    return null;
  }, []);

  // Fetch story from database
  const fetchStory = useCallback(async () => {
    setLoading(true);
    try {
      if (isOnline) {
        // Query for today's story
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: stories, error } = await supabase
          .from('posts')
          .select('*')
          .eq('hashtag', '#DailyBibleStory')
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && stories && stories.length > 0) {
          const dailyStory = stories[0] as DailyStory;
          // Cache it
          try {
            await put(STORE_NAME, dailyStory);
          } catch (cacheError) {
            console.log("Cache write failed:", cacheError);
          }
          setStory(dailyStory);
          setLoading(false);
          return;
        }
      }

      // Try cache if offline or no story found
      const cachedStory = await getStoryFromCache();
      if (cachedStory) {
        setStory(cachedStory);
        setLoading(false);
        return;
      }

      // No story found
      setStory(null);
    } catch (err) {
      console.error("Error fetching story:", err);
      // Try cache as fallback
      const cachedStory = await getStoryFromCache();
      setStory(cachedStory);
    } finally {
      setLoading(false);
    }
  }, [isOnline, getStoryFromCache]);

  // Fetch story on mount and when online status changes
  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  // Set up auto-refresh at midnight
  useEffect(() => {
    const setupMidnightRefresh = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const timeUntilMidnight = tomorrow.getTime() - now.getTime();

      const timeoutId = setTimeout(() => {
        fetchStory();
        // Recursively set up the next midnight refresh
        setupMidnightRefresh();
      }, timeUntilMidnight);

      return () => clearTimeout(timeoutId);
    };

    return setupMidnightRefresh();
  }, [fetchStory]);

  return { story, loading, isOnline };
};
