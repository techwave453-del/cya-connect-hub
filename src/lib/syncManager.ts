import { supabase } from "@/integrations/supabase/client";
import { getSyncQueue, removeSyncQueueItem, setMetadata, getMetadata } from "./offlineDb";

type TableName = 'posts' | 'post_comments' | 'post_likes' | 'tasks' | 'activities';

let isSyncing = false;

export const syncWithServer = async (): Promise<{ success: boolean; synced: number; errors: number }> => {
  if (isSyncing || !navigator.onLine) {
    return { success: false, synced: 0, errors: 0 };
  }

  isSyncing = true;
  let synced = 0;
  let errors = 0;

  try {
    const queue = await getSyncQueue();
    
    for (const item of queue) {
      try {
        const tableName = item.table as TableName;
        const itemData = item.data as { id?: string };
        const itemId = itemData.id || '';
        
        switch (item.action) {
          case 'insert':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await supabase.from(tableName).insert(item.data as any);
            break;
          case 'update':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await supabase.from(tableName).update(item.data as any).eq('id', itemId);
            break;
          case 'delete':
            await supabase.from(tableName).delete().eq('id', itemId);
            break;
        }
        
        await removeSyncQueueItem(item.id);
        synced++;
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        errors++;
      }
    }

    await setMetadata('lastSync', Date.now());
    
    return { success: true, synced, errors };
  } finally {
    isSyncing = false;
  }
};

export const getLastSyncTime = async (): Promise<number | null> => {
  const lastSync = await getMetadata('lastSync');
  return lastSync as number | null;
};

// Listen for online status and trigger sync
export const initSyncListener = () => {
  window.addEventListener('online', async () => {
    console.log('[SyncManager] Online - triggering sync');
    const result = await syncWithServer();
    if (result.synced > 0) {
      console.log(`[SyncManager] Synced ${result.synced} items`);
      // Dispatch custom event for UI updates
      window.dispatchEvent(new CustomEvent('sync-complete', { detail: result }));
    }
  });
};
