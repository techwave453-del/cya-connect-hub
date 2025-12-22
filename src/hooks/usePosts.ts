import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Post {
  id: string;
  user_id: string;
  username: string;
  hashtag: string;
  description: string | null;
  image_url: string | null;
  title: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setPosts(data || []);
    }

    setLoading(false);
  }, []);

  const deletePost = async (postId: string) => {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (error) {
      throw error;
    }
  };

  const updatePost = async (
    postId: string,
    updates: { title?: string; description?: string; hashtag?: string }
  ) => {
    const { error } = await supabase
      .from("posts")
      .update(updates)
      .eq("id", postId);

    if (error) {
      throw error;
    }
  };

  useEffect(() => {
    fetchPosts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  return { posts, loading, error, refetch: fetchPosts, deletePost, updatePost };
};
