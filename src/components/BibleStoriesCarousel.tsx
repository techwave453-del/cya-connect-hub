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
import { BookOpen, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

  const fetchStories = useCallback(async () => {
    if (!isOnline) {
      setLoading(false);
      return;
    }
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

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();
    return () => { api.off("select", onSelect); };
  }, [api]);

  if (loading) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="min-w-[260px] h-[180px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (stories.length === 0) return null;

  const truncate = (text: string | null, len: number) => {
    if (!text) return "";
    return text.length > len ? text.slice(0, len) + "…" : text;
  };

  return (
    <div className="py-3">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">
            Bible Stories
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {current + 1}/{stories.length}
        </span>
      </div>

      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: true }}
        plugins={[Autoplay({ delay: 4000, stopOnInteraction: true, stopOnMouseEnter: true })]}
        className="px-4"
      >
        <CarouselContent className="-ml-3">
          {stories.map((story) => {
            const isExpanded = expandedId === story.id;
            return (
              <CarouselItem key={story.id} className="pl-3 basis-[75%] sm:basis-[45%] md:basis-[35%]">
                <div
                  className="relative rounded-xl overflow-hidden border border-border bg-card shadow-sm cursor-pointer group"
                  style={{ minHeight: isExpanded ? "auto" : "200px" }}
                  onClick={() => setExpandedId(isExpanded ? null : story.id)}
                >
                  {story.image_url && (
                    <div className="h-28 w-full overflow-hidden">
                      <img
                        src={story.image_url}
                        alt={story.title || "Bible Story"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-heading text-sm font-semibold text-foreground leading-tight mb-1 flex items-center gap-1">
                      {story.title || "Bible Story"}
                      {!isExpanded && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isExpanded
                        ? story.description
                        : truncate(story.description, 80)}
                    </p>
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
                ? "w-4 bg-primary"
                : "w-1.5 bg-muted-foreground/30"
            }`}
            onClick={() => api?.scrollTo(i)}
            aria-label={`Go to story ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default BibleStoriesCarousel;
