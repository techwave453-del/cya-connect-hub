import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAll, putAll, put, remove as removeFromDb, addToSyncQueue } from "@/lib/offlineDb";
import { useOnlineStatus } from "./useOnlineStatus";

export interface Activity {
  id: string;
  title: string;
  date: string;
  location: string | null;
  attendees: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

const STORE_NAME = 'activities';

export const useActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const isOnline = useOnlineStatus();

  const fetchActivities = useCallback(async () => {
    setLoading(true);

    // Stale-while-revalidate: show cache instantly
    try {
      const cached = await getAll<Activity>(STORE_NAME);
      if (cached.length > 0) {
        setActivities(cached.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
        setLoading(false);
      }
    } catch { /* continue */ }

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from("activities")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        const serverData = (data || []) as Activity[];
        setActivities(serverData);
        await putAll(STORE_NAME, serverData);
      } catch (err) {
        console.error("Error fetching activities:", err);
      }
    }
    setLoading(false);
  }, [isOnline]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  useEffect(() => {
    const handler = () => { if (isOnline) fetchActivities(); };
    window.addEventListener('sync-complete', handler);
    return () => window.removeEventListener('sync-complete', handler);
  }, [isOnline, fetchActivities]);

  const createActivity = async (activity: Omit<Activity, "id" | "created_at" | "updated_at">) => {
    const newActivity: Activity = {
      ...activity,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setActivities(prev => [newActivity, ...prev]);
    await put(STORE_NAME, newActivity);

    if (isOnline) {
      const { error } = await supabase.from("activities").insert(activity);
      if (error) throw error;
      await fetchActivities();
    } else {
      await addToSyncQueue({ table: 'activities', action: 'insert', data: newActivity });
    }
  };

  const updateActivity = async (id: string, updates: Partial<Activity>) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a));
    const existing = activities.find(a => a.id === id);
    if (existing) {
      await put(STORE_NAME, { ...existing, ...updates, updated_at: new Date().toISOString() });
    }

    if (isOnline) {
      const { error } = await supabase.from("activities").update(updates).eq("id", id);
      if (error) throw error;
      await fetchActivities();
    } else {
      await addToSyncQueue({ table: 'activities', action: 'update', data: { id, ...updates } });
    }
  };

  const deleteActivity = async (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
    await removeFromDb(STORE_NAME, id);

    if (isOnline) {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
    } else {
      await addToSyncQueue({ table: 'activities', action: 'delete', data: { id } });
    }
  };

  return { activities, loading, fetchActivities, createActivity, updateActivity, deleteActivity };
};
