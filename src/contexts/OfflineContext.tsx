import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { initSyncListener, syncWithServer, getLastSyncTime } from "@/lib/syncManager";
import { getSyncQueue } from "@/lib/offlineDb";
import { runPreCache } from "@/lib/offlinePreCache";

type PreCacheStatus = 'idle' | 'running' | 'done';

interface OfflineContextType {
  isOnline: boolean;
  pendingSyncCount: number;
  lastSyncTime: number | null;
  triggerSync: () => Promise<void>;
  preCacheStatus: PreCacheStatus;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [preCacheStatus, setPreCacheStatus] = useState<PreCacheStatus>('idle');

  // Refresh sync status
  const refreshStatus = useCallback(async () => {
    try {
      const queue = await getSyncQueue();
      setPendingSyncCount(queue.length);
      const time = await getLastSyncTime();
      setLastSyncTime(time);
    } catch {
      // IndexedDB may fail silently
    }
  }, []);

  useEffect(() => {
    initSyncListener();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync + pre-cache when coming back online
      syncWithServer().then(() => refreshStatus());
      runPreCacheQuietly();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleSyncComplete = () => refreshStatus();
    window.addEventListener('sync-complete', handleSyncComplete);

    refreshStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, [refreshStatus]);

  // Smart pre-caching on first load when online
  const runPreCacheQuietly = useCallback(async () => {
    if (!navigator.onLine) return;
    setPreCacheStatus('running');
    try {
      await runPreCache();
    } catch (err) {
      console.error('[OfflineContext] Pre-cache error:', err);
    } finally {
      setPreCacheStatus('done');
      // Reset after a brief display
      setTimeout(() => setPreCacheStatus('idle'), 2000);
    }
  }, []);

  // Run pre-cache on initial load
  useEffect(() => {
    if (isOnline) {
      // Delay slightly so it doesn't block initial render
      const timer = setTimeout(runPreCacheQuietly, 3000);
      return () => clearTimeout(timer);
    }
  }, []); // only on mount

  // Periodic pending count check
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const queue = await getSyncQueue();
        setPendingSyncCount(queue.length);
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerSync = useCallback(async () => {
    if (isOnline) {
      await syncWithServer();
      await refreshStatus();
    }
  }, [isOnline, refreshStatus]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingSyncCount, lastSyncTime, triggerSync, preCacheStatus }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
