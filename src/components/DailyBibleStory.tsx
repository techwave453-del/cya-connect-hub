import { useDailyStory } from "@/hooks/useDailyStory";
import { BookOpen, ChevronDown, ChevronUp, Wifi, WifiOff, Copy, Share2, MessageCircle, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import BibleAIChat from "@/components/BibleAIChat";

const DailyBibleStory = () => {
  const { story, loading, isOnline } = useDailyStory();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);

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

  // Format story text into paragraphs
  const formatStoryText = (text: string | undefined) => {
    if (!text) return null;
    // Split by double newlines or single newlines that look like paragraph breaks
    const paragraphs = text.split(/\n\n+|\n(?=[A-Z])/).filter(p => p.trim());
    if (paragraphs.length <= 1) {
      // Try splitting by sentences for very long single blocks
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      if (sentences.length > 4) {
        const chunks: string[] = [];
        for (let i = 0; i < sentences.length; i += 3) {
          chunks.push(sentences.slice(i, i + 3).join(' ').trim());
        }
        return chunks.map((p, i) => (
          <p key={i} className="mb-3 last:mb-0 leading-relaxed">{p.trim()}</p>
        ));
      }
    }
    return paragraphs.map((p, i) => (
      <p key={i} className="mb-3 last:mb-0 leading-relaxed">{p.trim()}</p>
    ));
  };

  const handleCopyText = async () => {
    const text = `${story.title || "Daily Bible Story"}\n\n${story.description || ""}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Story copied to clipboard! ✅" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    const title = story.title || "Daily Bible Story";
    const text = story.description?.substring(0, 200) + "...";
    const shareData: ShareData = {
      title,
      text: `📖 ${title}\n\n${text}`,
    };

    // If there's an image, try to fetch and share it
    if (story.image_url && navigator.canShare) {
      try {
        const response = await fetch(story.image_url);
        const blob = await response.blob();
        const file = new File([blob], "bible-story.png", { type: blob.type });
        const shareWithImage = { ...shareData, files: [file] };
        if (navigator.canShare(shareWithImage)) {
          await navigator.share(shareWithImage);
          return;
        }
      } catch {
        // Fall through to text-only share
      }
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast({ title: "Sharing failed", variant: "destructive" });
        }
      }
    } else {
      // Fallback: copy to clipboard
      await handleCopyText();
    }
  };

  const handleAskScriptureGuide = () => {
    setAiChatOpen(true);
  };

  return (
    <>
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
                  className="w-full max-h-72 object-contain bg-muted/30 rounded-lg"
                />
              </div>
            )}

            {/* Story Text - formatted with paragraphs */}
            {expanded ? (
              <ScrollArea className="max-h-64 pr-3">
                <div className="text-foreground/90 text-sm">
                  {formatStoryText(displayedText || "")}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-foreground/90 text-sm">
                {formatStoryText(displayedText || "")}
              </div>
            )}

            {/* Expand/Collapse Button */}
            {isLongStory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 px-0 mt-2"
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

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyText}
                className="text-xs gap-1.5"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="text-xs gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleAskScriptureGuide}
                className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-600"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Ask Scripture Guide
              </Button>
            </div>
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

      {/* Scripture Guide AI Chat */}
      <BibleAIChat
        isOpen={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        initialMessage={`Tell me more about the story "${story.title}". Explain the full biblical context, key characters, spiritual lessons, and how it applies to my life today.`}
        autoSend
      />
    </>
  );
};

export default DailyBibleStory;
