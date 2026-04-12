import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { BookOpen, ChevronDown, ChevronUp, Copy, Share2, MessageCircle, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import BibleAIChat from "@/components/BibleAIChat";

interface StorySnippet {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

const BibleStoriesCarousel = () => {
  const [stories, setStories] = useState<StorySnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const isOnline = useOnlineStatus();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiChat, setAiChat] = useState<{ open: boolean; title: string }>({ open: false, title: "" });

  const fetchStories = useCallback(async () => {
    if (!isOnline) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("posts")
        .select("id, title, description, image_url, created_at")
        .eq("hashtag", "#DailyBibleStory")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setStories(data);
    } catch (err) {
      console.error("Failed to fetch stories:", err);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();
    return () => { api.off("select", onSelect); };
  }, [api]);

  const formatStoryText = (text: string | undefined) => {
    if (!text) return null;
    const paragraphs = text.split(/\n\n+|\n(?=[A-Z])/).filter(p => p.trim());
    if (paragraphs.length <= 1) {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      if (sentences.length > 4) {
        const chunks: string[] = [];
        for (let i = 0; i < sentences.length; i += 3) {
          chunks.push(sentences.slice(i, i + 3).join(" ").trim());
        }
        return chunks.map((p, i) => (
          <p key={i} className="mb-3 last:mb-0 leading-relaxed">{p}</p>
        ));
      }
    }
    return paragraphs.map((p, i) => (
      <p key={i} className="mb-3 last:mb-0 leading-relaxed">{p.trim()}</p>
    ));
  };

  const handleCopy = async (story: StorySnippet) => {
    const text = `${story.title || "Bible Story"}\n\n${story.description || ""}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(story.id);
      toast({ title: "Story copied to clipboard! ✅" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleShare = async (story: StorySnippet) => {
    const title = story.title || "Bible Story";
    const shareData: ShareData = { title, text: `📖 ${title}\n\n${story.description?.substring(0, 200)}...` };
    if (story.image_url && navigator.canShare) {
      try {
        const response = await fetch(story.image_url);
        const blob = await response.blob();
        const file = new File([blob], "bible-story.png", { type: blob.type });
        const withImage = { ...shareData, files: [file] };
        if (navigator.canShare(withImage)) { await navigator.share(withImage); return; }
      } catch { /* fall through */ }
    }
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {
        if ((err as Error).name !== "AbortError") toast({ title: "Sharing failed", variant: "destructive" });
      }
    } else {
      await handleCopy(story);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    );
  }

  if (stories.length === 0) return null;

  return (
    <>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <BookOpen className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Bible Stories
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {current + 1} / {stories.length}
          </span>
        </div>

        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: true }}
          plugins={[Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })]}
        >
          <CarouselContent className="-ml-4">
            {stories.map((story) => {
              const isExpanded = expandedId === story.id;
              const isCopied = copiedId === story.id;
              const isLong = story.description && story.description.length > 300;
              const displayedText = isExpanded
                ? story.description
                : story.description?.substring(0, 300) + (isLong ? "..." : "");

              return (
                <CarouselItem key={story.id} className="pl-4 basis-full">
                  <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-card to-amber-50/50 dark:from-amber-950/20 dark:via-card dark:to-amber-950/10 border border-border rounded-xl card-shadow">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/10 dark:bg-amber-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-200/10 dark:bg-amber-600/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative">
                      {/* Header */}
                      <div className="px-6 pt-6 pb-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Bible Story</h3>
                            {story.title && (
                              <p className="text-lg font-semibold text-amber-900 dark:text-amber-300 line-clamp-2">
                                {story.title}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Image */}
                        {story.image_url && (
                          <div className="relative rounded-lg overflow-hidden mb-4">
                            <img
                              src={story.image_url}
                              alt={story.title || "Bible Story"}
                              className="w-full max-h-72 object-contain bg-muted/30 rounded-lg"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {/* Story Text */}
                        {isExpanded ? (
                          <div className="max-h-64 overflow-y-auto pr-3">
                            <div className="text-foreground/90 text-sm">
                              {formatStoryText(displayedText || "")}
                            </div>
                          </div>
                        ) : (
                          <div className="text-foreground/90 text-sm">
                            {formatStoryText(displayedText || "")}
                          </div>
                        )}

                        {/* Expand/Collapse */}
                        {isLong && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedId(isExpanded ? null : story.id)}
                            className="text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 px-0 mt-2"
                          >
                            {isExpanded ? (
                              <><ChevronUp className="h-4 w-4 mr-1" />Show Less</>
                            ) : (
                              <><ChevronDown className="h-4 w-4 mr-1" />Read More</>
                            )}
                          </Button>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => handleCopy(story)} className="text-xs gap-1.5">
                            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {isCopied ? "Copied!" : "Copy"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleShare(story)} className="text-xs gap-1.5">
                            <Share2 className="h-3.5 w-3.5" />
                            Share
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setAiChat({ open: true, title: story.title || "Bible Story" })}
                            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-600"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Ask Scripture Guide
                          </Button>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="px-6 py-3 border-t border-border/30 flex items-center justify-between bg-background/40">
                        <div className="text-xs text-muted-foreground">
                          Posted {new Date(story.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          #DailyBibleStory
                        </span>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1 mt-3">
          {stories.slice(0, Math.min(stories.length, 10)).map((_, i) => (
            <button
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current % Math.min(stories.length, 10)
                  ? "w-4 bg-amber-600 dark:bg-amber-400"
                  : "w-1.5 bg-muted-foreground/30"
              }`}
              onClick={() => api?.scrollTo(i)}
              aria-label={`Go to story ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Scripture Guide AI Chat */}
      <BibleAIChat
        isOpen={aiChat.open}
        onClose={() => setAiChat({ open: false, title: "" })}
        initialMessage={`Tell me more about the story "${aiChat.title}". Explain the full biblical context, key characters, spiritual lessons, and how it applies to my life today.`}
        autoSend
      />
    </>
  );
};

export default BibleStoriesCarousel;
