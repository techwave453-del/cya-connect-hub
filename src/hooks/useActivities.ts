import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export const useActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching activities:", error);
    } else {
      setActivities(data as Activity[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const createActivity = async (activity: Omit<Activity, "id" | "created_at" | "updated_at">) => {
    const { error } = await supabase.from("activities").insert(activity);
    if (error) throw error;
    await fetchActivities();
  };

  const updateActivity = async (id: string, updates: Partial<Activity>) => {
    const { error } = await supabase
      .from("activities")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
    await fetchActivities();
  };

  const deleteActivity = async (id: string) => {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) throw error;
    await fetchActivities();
  };

  return { activities, loading, fetchActivities, createActivity, updateActivity, deleteActivity };
};
