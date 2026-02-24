// IndexedDB wrapper for offline data storage
const DB_NAME = 'cya-offline-db';
const DB_VERSION = 2;
const MAX_SYNC_QUEUE_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_STORE_SIZE = 50 * 1024 * 1024; // 50 MB

interface SyncQueueItem {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: object;
  timestamp: number;
  retryCount?: number;
}

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Store for posts
      if (!database.objectStoreNames.contains('posts')) {
        database.createObjectStore('posts', { keyPath: 'id' });
      }

      // Store for tasks
      if (!database.objectStoreNames.contains('tasks')) {
        database.createObjectStore('tasks', { keyPath: 'id' });
      }

      // Store for activities
      if (!database.objectStoreNames.contains('activities')) {
        database.createObjectStore('activities', { keyPath: 'id' });
      }

      // Store for bible_verses
      if (!database.objectStoreNames.contains('bible_verses')) {
        database.createObjectStore('bible_verses', { keyPath: 'id' });
      }

      // Store for profiles
      if (!database.objectStoreNames.contains('profiles')) {
        database.createObjectStore('profiles', { keyPath: 'id' });
      }

      // Store for bible_games
      if (!database.objectStoreNames.contains('bible_games')) {
        database.createObjectStore('bible_games', { keyPath: 'id' });
      }

      // Store for game_progress
      if (!database.objectStoreNames.contains('game_progress')) {
        database.createObjectStore('game_progress', { keyPath: 'id' });
      }

      // Store for auth session
      if (!database.objectStoreNames.contains('auth_session')) {
        database.createObjectStore('auth_session', { keyPath: 'id' });
      }

      // Store for sync queue (offline changes to sync later)
      if (!database.objectStoreNames.contains('sync_queue')) {
        const syncStore = database.createObjectStore('sync_queue', { keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Store for metadata (last sync time, etc.)
      if (!database.objectStoreNames.contains('metadata')) {
        database.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
  });
};

export const getAll = async <T>(storeName: string): Promise<T[]> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as T[]);
  });
};

export const getById = async <T>(storeName: string, id: string): Promise<T | undefined> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as T | undefined);
  });
};

export const put = async <T extends { id: string }>(storeName: string, data: T): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const putAll = async <T extends { id: string }>(storeName: string, items: T[]): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    items.forEach(item => store.put(item));

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
};

export const remove = async (storeName: string, id: string): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const clearStore = async (storeName: string): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Sync queue operations
export const addToSyncQueue = async (item: { table: string; action: 'insert' | 'update' | 'delete'; data: object }): Promise<void> => {
  const database = await openDB();
  const syncItem: SyncQueueItem = {
    id: crypto.randomUUID(),
    table: item.table,
    action: item.action,
    data: item.data,
    timestamp: Date.now(),
  };
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('sync_queue', 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const request = store.put(syncItem);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getSyncQueue = async (): Promise<SyncQueueItem[]> => {
  return getAll<SyncQueueItem>('sync_queue');
};

export const clearSyncQueue = async (): Promise<void> => {
  await clearStore('sync_queue');
};

export const removeSyncQueueItem = async (id: string): Promise<void> => {
  await remove('sync_queue', id);
};

// Metadata operations
export const getMetadata = async (key: string): Promise<unknown | undefined> => {
  const result = await getById<{ key: string; value: unknown }>('metadata', key);
  return result?.value;
};

export const setMetadata = async (key: string, value: unknown): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('metadata', 'readwrite');
    const store = transaction.objectStore('metadata');
    const request = store.put({ key, value });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Auth session operations
export const saveAuthSession = async (session: { id: string; user: unknown; access_token: string; refresh_token: string; expires_at: number }): Promise<void> => {
  await clearStore('auth_session');
  await put('auth_session', session);
};

export const getAuthSession = async (): Promise<{ id: string; user: unknown; access_token: string; refresh_token: string; expires_at: number } | undefined> => {
  const sessions = await getAll<{ id: string; user: unknown; access_token: string; refresh_token: string; expires_at: number }>('auth_session');
  return sessions[0];
};

export const clearAuthSession = async (): Promise<void> => {
  await clearStore('auth_session');
};

// Pruning and maintenance operations
export const pruneSyncQueue = async (): Promise<{ removed: number }> => {
  const database = await openDB();
  const now = Date.now();
  let removed = 0;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('sync_queue', 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const index = store.index('timestamp');

    // Query items older than MAX_SYNC_QUEUE_AGE
    const range = IDBKeyRange.upperBound(now - MAX_SYNC_QUEUE_AGE);
    const request = index.openCursor(range);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        removed++;
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve({ removed });
    transaction.onerror = () => reject(transaction.error);
  });
};

export const pruneOldData = async (storeName: string, maxAge: number = 60 * 24 * 60 * 60 * 1000): Promise<{ removed: number }> => {
  const database = await openDB();
  const allItems = await getAll<{ id: string; created_at?: number; updated_at?: number; timestamp?: number }>(storeName);
  const now = Date.now();
  let removed = 0;

  for (const item of allItems) {
    const itemTime = item.updated_at || item.created_at || item.timestamp || 0;
    if (now - itemTime > maxAge) {
      await remove(storeName, item.id);
      removed++;
    }
  }

  return { removed };
};

export const getDBSize = async (): Promise<{ used: number; available: number; percentage: number }> => {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { used: 0, available: MAX_STORE_SIZE, percentage: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const available = estimate.quota || MAX_STORE_SIZE;
    const percentage = (used / available) * 100;
    return { used, available, percentage };
  } catch {
    return { used: 0, available: MAX_STORE_SIZE, percentage: 0 };
  }
};

export const requestPersistentStorage = async (): Promise<boolean> => {
  if (!navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    const isPersistent = await navigator.storage.persist();
    console.log('[offlineDb] Persistent storage granted:', isPersistent);
    return isPersistent;
  } catch (error) {
    console.error('[offlineDb] Error requesting persistent storage:', error);
    return false;
  }
};
