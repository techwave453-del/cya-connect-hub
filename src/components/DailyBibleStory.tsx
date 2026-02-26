import { useDailyStory } from "@/hooks/useDailyStory";
import { BookOpen, ChevronDown, ChevronUp, Wifi, WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const DailyBibleStory = () => {
  const { story, loading, isOnline } = useDailyStory();
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-50 via-card to-amber-50/50 dark:from-amber-950/20 dark:via-card dark:to-amber-950/10 border border-border rounded-xl overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-4" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!story) {
    return null;
  }

  const isLongStory = story.description && story.description.length > 300;
  const displayedText = expanded
    ? story.description
    : story.description?.substring(0, 300) + (isLongStory ? "..." : "");

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-card to-amber-50/50 dark:from-amber-950/20 dark:via-card dark:to-amber-950/10 border border-border rounded-xl mb-6 card-shadow animate-slide-up">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/10 dark:bg-amber-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-200/10 dark:bg-amber-600/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <BookOpen className="h-5 w-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Daily Bible Story</h3>
                {story.title && (
                  <p className="text-lg font-semibold text-amber-900 dark:text-amber-300 line-clamp-2">
                    {story.title}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {isOnline ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
            </div>
          </div>

          {/* Image */}
          {story.image_url && (
            <div className="relative rounded-lg overflow-hidden mb-4">
              <img
                src={story.image_url}
                alt={story.title || "Daily Bible Story"}
                className="w-full h-56 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
          )}

          {/* Story Text */}
          <div className="text-foreground/90 leading-relaxed text-sm mb-4">
            {displayedText}
          </div>

          {/* Expand/Collapse Button */}
          {isLongStory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 px-0"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Read More
                </>
              )}
            </Button>
          )}
        </div>

        {/* Footer metadata */}
        <div className="px-6 py-3 border-t border-border/30 flex items-center justify-between bg-background/40">
          <div className="text-xs text-muted-foreground">
            Posted {new Date(story.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          {story.hashtag && (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              #{story.hashtag.replace("#", "")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyBibleStory;
