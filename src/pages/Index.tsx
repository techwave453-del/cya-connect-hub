import { useState } from "react";
import Header from "@/components/Header";
import TabNavigation from "@/components/TabNavigation";
import IdeasSection from "@/components/IdeasSection";
import PostCard from "@/components/PostCard";
import TaskCard from "@/components/TaskCard";
import ActivityCard from "@/components/ActivityCard";
import FloatingActionButton from "@/components/FloatingActionButton";
import { toast } from "@/hooks/use-toast";

import bashEventImage from "@/assets/bash-event.jpg";

const Index = () => {
  const [activeTab, setActiveTab] = useState("posts");

  const handleShareIdea = () => {
    toast({
      title: "Coming Soon!",
      description: "Share your ideas with the CYA community.",
    });
  };

  const handleFABClick = () => {
    toast({
      title: "Quick Action",
      description: "Create a new post or activity.",
    });
  };

  const posts = [
    {
      id: 1,
      username: "dennie",
      date: "12/19/2025",
      hashtag: "Bash",
      image: bashEventImage,
      title: "Bash",
      likes: 24,
      comments: 8,
    },
    {
      id: 2,
      username: "sarah_k",
      date: "12/18/2025",
      hashtag: "Worship",
      likes: 42,
      comments: 15,
    },
    {
      id: 3,
      username: "mike_cya",
      date: "12/17/2025",
      hashtag: "YouthEmpowerment",
      likes: 31,
      comments: 6,
    },
  ];

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
            <IdeasSection onShareIdea={handleShareIdea} />
            
            <div className="px-4 py-4 space-y-4">
              {posts.map((post, index) => (
                <PostCard
                  key={post.id}
                  username={post.username}
                  date={post.date}
                  hashtag={post.hashtag}
                  image={post.image}
                  title={post.title}
                  likes={post.likes}
                  comments={post.comments}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` } as React.CSSProperties}
                />
              ))}
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
                style={{ animationDelay: `${index * 0.1}s` } as React.CSSProperties}
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
                style={{ animationDelay: `${index * 0.1}s` } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </main>
      
      <FloatingActionButton onClick={handleFABClick} />
    </div>
  );
};

export default Index;
