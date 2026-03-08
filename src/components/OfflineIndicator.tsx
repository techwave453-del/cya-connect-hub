import { useOffline } from "@/contexts/OfflineContext";
import { RefreshCw, Cloud, CloudOff, WifiOff, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const OfflineIndicator = () => {
  const { isOnline, pendingSyncCount, lastSyncTime, triggerSync, preCacheStatus } = useOffline();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Track offline→online transitions
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      setWasOffline(false);
      // Auto-sync when coming back online
      handleSync(true);
    }
  }, [isOnline]);

  const handleSync = async (silent = false) => {
    if (!isOnline) {
      if (!silent) toast.error("Cannot sync while offline");
      return;
    }

    setIsSyncing(true);
    try {
      await triggerSync();
      if (!silent) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        toast.success("All changes synced!");
      }
    } catch {
      if (!silent) toast.error("Sync failed — will retry");
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (time: number | null) => {
    if (!time) return null;
    const diff = Math.floor((Date.now() - time) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // When online with nothing pending and no pre-cache running, hide
  if (isOnline && pendingSyncCount === 0 && !showSuccess && preCacheStatus !== 'running') {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 animate-in slide-in-from-left-4">
      {/* Offline badge */}
      {!isOnline && (
        <Badge
          variant="destructive"
          className="flex items-center gap-1.5 px-3 py-1.5 shadow-lg backdrop-blur-sm"
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Offline</span>
          {pendingSyncCount > 0 && (
            <span className="text-xs opacity-80">• {pendingSyncCount} queued</span>
          )}
        </Badge>
      )}

      {/* Online with pending sync */}
      {isOnline && pendingSyncCount > 0 && (
        <Badge
          variant="secondary"
          className="flex items-center gap-1.5 px-3 py-1.5 shadow-lg"
        >
          <Cloud className="h-3.5 w-3.5" />
          <span className="text-xs">{pendingSyncCount} pending</span>
        </Badge>
      )}

      {/* Sync success flash */}
      {showSuccess && (
        <Badge
          className="flex items-center gap-1.5 px-3 py-1.5 shadow-lg bg-green-600 text-white border-green-600"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="text-xs">Synced!</span>
        </Badge>
      )}

      {/* Pre-caching indicator */}
      {isOnline && preCacheStatus === 'running' && pendingSyncCount === 0 && (
        <Badge
          variant="secondary"
          className="flex items-center gap-1.5 px-3 py-1.5 shadow-lg"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs">Caching for offline…</span>
        </Badge>
      )}

      {/* Sync button */}
      {isOnline && pendingSyncCount > 0 && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleSync()}
          disabled={isSyncing}
          className="h-7 px-2 shadow-lg"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
};

export default OfflineIndicator;
