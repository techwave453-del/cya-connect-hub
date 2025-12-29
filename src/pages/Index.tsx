import { useState } from "react";
import Header from "@/components/Header";
import TabNavigation from "@/components/TabNavigation";
import IdeasSection from "@/components/IdeasSection";
import PostCard from "@/components/PostCard";
import TaskCard from "@/components/TaskCard";
import ActivityCard from "@/components/ActivityCard";
import FloatingActionButton from "@/components/FloatingActionButton";
import CreatePostDialog from "@/components/CreatePostDialog";
import DailyBibleVerse from "@/components/DailyBibleVerse";
import { useAuth } from "@/hooks/useAuth";
import { usePosts } from "@/hooks/usePosts";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

import bashEventImage from "@/assets/bash-event.jpg";

const Index = () => {
  const [activeTab, setActiveTab] = useState("posts");
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const { isAuthenticated, user, profile, loading: authLoading } = useAuth();
  const { posts, loading: postsLoading, refetch, deletePost, updatePost } = usePosts();
  const navigate = useNavigate();

  const handleShareIdea = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to share your ideas.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setCreatePostOpen(true);
  };

  const handleFABClick = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to create a post.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setCreatePostOpen(true);
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the post. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleEditPost = async (
    postId: string,
    updates: { title?: string; description?: string; hashtag?: string }
  ) => {
    try {
      await updatePost(postId, updates);
      toast({
        title: "Post updated",
        description: "Your post has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update the post. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const tasks = [
    {
      id: 1,
      title: "Prepare Sunday worship set",
      description: "Select songs and practice with the team",
      dueDate: "Dec 21, 2025",
      completed: false,
      priority: "high" as const,
    },
    {
      id: 2,
      title: "Community outreach planning",
      description: "Coordinate with local churches",
      dueDate: "Dec 22, 2025",
      completed: true,
      priority: "medium" as const,
    },
    {
      id: 3,
      title: "Youth camp registration",
      description: "Open registration for January camp",
      dueDate: "Dec 25, 2025",
      completed: false,
      priority: "medium" as const,
    },
  ];

  const activities = [
    {
      id: 1,
      title: "CYA Bash Event",
      date: "December 21, 2025",
      location: "Nairobi Community Center",
      attendees: 156,
      image: bashEventImage,
    },
    {
      id: 2,
      title: "Weekly Bible Study",
      date: "Every Wednesday, 6 PM",
      location: "Online & In-Person",
      attendees: 45,
    },
    {
      id: 3,
      title: "Community Service Day",
      date: "December 28, 2025",
      location: "Kibera Area",
      attendees: 78,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Stars Background */}
      <div className="relative h-12 bg-gradient-to-b from-background via-navy-light to-card overflow-hidden">
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-foreground/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
      
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="pb-24">
        {activeTab === "posts" && (
          <>
            <div className="px-4 pt-4">
              <DailyBibleVerse />
            </div>
            <IdeasSection onShareIdea={handleShareIdea} />
            
            <div className="px-4 py-4 space-y-4">
              {postsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No posts yet. Be the first to share an idea!</p>
                </div>
              ) : (
                posts.map((post, index) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id}
                    currentUsername={profile?.username}
                    onDelete={handleDeletePost}
                    onEdit={handleEditPost}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  />
                ))
              )}
            </div>
          </>
        )}
        
        {activeTab === "tasks" && (
          <div className="px-4 py-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📋</span>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Your Tasks
              </h2>
            </div>
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                title={task.title}
                description={task.description}
                dueDate={task.dueDate}
                completed={task.completed}
                priority={task.priority}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              />
            ))}
          </div>
        )}
        
        {activeTab === "activities" && (
          <div className="px-4 py-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🎯</span>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Upcoming Activities
              </h2>
            </div>
            {activities.map((activity, index) => (
              <ActivityCard
                key={activity.id}
                title={activity.title}
                date={activity.date}
                location={activity.location}
                attendees={activity.attendees}
                image={activity.image}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              />
            ))}
          </div>
        )}
      </main>
      
      <FloatingActionButton onClick={handleFABClick} />

      {/* Create Post Dialog */}
      {user && profile && (
        <CreatePostDialog
          open={createPostOpen}
          onOpenChange={setCreatePostOpen}
          userId={user.id}
          username={profile.username}
          onPostCreated={refetch}
        />
      )}
    </div>
  );
};

export default Index;
