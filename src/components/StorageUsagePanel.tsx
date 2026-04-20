import { useEffect, useState } from "react";
import { HardDrive, Trash2, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getImageCacheStats, clearImageCache } from "@/lib/imageCache";

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const StorageUsagePanel = () => {
  const [count, setCount] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const stats = await getImageCacheStats();
      setCount(stats.count);
      setTotalSize(stats.totalSize);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearImageCache();
      toast({
        title: "Image cache cleared",
        description: "All cached images have been removed.",
      });
      await refresh();
    } catch {
      toast({
        title: "Failed to clear",
        description: "Could not clear image cache.",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-4 card-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-primary" />
          Offline Storage
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Calculating…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <ImageIcon className="w-3.5 h-3.5" />
                Cached images
              </div>
              <p className="text-lg font-bold text-foreground">{count}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <HardDrive className="w-3.5 h-3.5" />
                Total size
              </div>
              <p className="text-lg font-bold text-foreground">{formatBytes(totalSize)}</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={clearing || count === 0}
            className="w-full"
          >
            {clearing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Clearing…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear image cache
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Frees space by removing cached images. They'll re-download when you're back online.
          </p>
        </>
      )}
    </div>
  );
};

export default StorageUsagePanel;
