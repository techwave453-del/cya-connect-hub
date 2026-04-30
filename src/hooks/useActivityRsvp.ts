import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOnlineStatus } from "./useOnlineStatus";

export const useActivityRsvp = (activityId: string) => {
  const { user, isAuthenticated } = useAuth();
  const isOnline = useOnlineStatus();
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkRsvp = useCallback(async () => {
    if (!user || !isOnline) {
      setChecking(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("activity_rsvps")
        .select("id")
        .eq("activity_id", activityId)
        .eq("user_id", user.id)
        .maybeSingle();
      setJoined(!!data);
    } catch (err) {
      console.error("checkRsvp error:", err);
    } finally {
      setChecking(false);
    }
  }, [activityId, user, isOnline]);

  useEffect(() => { checkRsvp(); }, [checkRsvp]);

  const toggleRsvp = async () => {
    if (!isAuthenticated || !user) {
      throw new Error("AUTH_REQUIRED");
    }
    if (!isOnline) {
      throw new Error("OFFLINE");
    }
    setLoading(true);
    try {
      if (joined) {
        const { error } = await supabase
          .from("activity_rsvps")
          .delete()
          .eq("activity_id", activityId)
          .eq("user_id", user.id);
        if (error) throw error;
        setJoined(false);
      } else {
        const { error } = await supabase
          .from("activity_rsvps")
          .insert({ activity_id: activityId, user_id: user.id });
        if (error) throw error;
        setJoined(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return { joined, loading, checking, toggleRsvp };
};
