import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAll, putAll, put, remove as removeFromDb, addToSyncQueue } from "@/lib/offlineDb";
import { useOnlineStatus } from "./useOnlineStatus";

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

const STORE_NAME = 'posts';
const CACHE_LIMIT = 100;

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  // Stale-while-revalidate: show cache first, then refresh from network
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Always try cache first for instant display
    try {
      const cachedPosts = await getAll<Post>(STORE_NAME);
      if (cachedPosts.length > 0) {
        setPosts(
          cachedPosts
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        );
        setLoading(false); // show cached data immediately
      }
    } catch {
      // cache read failed, continue
    }

    // 2. If online, fetch fresh data in background
    if (isOnline) {
      try {
        const { data, error: fetchError } = await supabase
          .from("posts")
          .select("*")
          .neq("hashtag", "#DailyBibleStory")
          .order("created_at", { ascending: false })
          .limit(CACHE_LIMIT);

        if (fetchError) throw fetchError;

        const serverPosts = data || [];
        setPosts(serverPosts);
        await putAll(STORE_NAME, serverPosts);
      } catch (err) {
        console.error("Error fetching posts from server:", err);
        // keep showing cached data — no error if we have cache
        if (posts.length === 0) {
          setError(err instanceof Error ? err.message : "Failed to fetch posts");
        }
      }
    }

    setLoading(false);
  }, [isOnline]);

  const deletePost = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    await removeFromDb(STORE_NAME, postId);

    if (isOnline) {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
    } else {
      await addToSyncQueue({ table: 'posts', action: 'delete', data: { id: postId } });
    }
  };

  const updatePost = async (postId: string, updates: { title?: string; description?: string; hashtag?: string }) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));

    const existingPost = posts.find(p => p.id === postId);
    if (existingPost) {
      await put(STORE_NAME, { ...existingPost, ...updates });
    }

    if (isOnline) {
      const { error } = await supabase.from("posts").update(updates).eq("id", postId);
      if (error) throw error;
    } else {
      await addToSyncQueue({ table: 'posts', action: 'update', data: { id: postId, ...updates } });
    }
  };

  const createPost = async (post: Omit<Post, 'id' | 'created_at' | 'likes_count' | 'comments_count'>) => {
    const newPost: Post = {
      ...post,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      likes_count: 0,
      comments_count: 0,
    };

    setPosts(prev => [newPost, ...prev]);
    await put(STORE_NAME, newPost);

    if (isOnline) {
      const { error } = await supabase.from("posts").insert({
        user_id: post.user_id,
        username: post.username,
        hashtag: post.hashtag,
        description: post.description,
        title: post.title,
        image_url: post.image_url,
      });
      if (error) throw error;
      await fetchPosts();
    } else {
      await addToSyncQueue({ table: 'posts', action: 'insert', data: newPost });
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Realtime subscription when online
  useEffect(() => {
    if (!isOnline) return;

    const channel = supabase
      .channel("posts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts, isOnline]);

  // Sync-complete listener
  useEffect(() => {
    const handler = () => { if (isOnline) fetchPosts(); };
    window.addEventListener('sync-complete', handler);
    return () => window.removeEventListener('sync-complete', handler);
  }, [fetchPosts, isOnline]);

  return { posts, loading, error, refetch: fetchPosts, deletePost, updatePost, createPost, isOnline };
};
