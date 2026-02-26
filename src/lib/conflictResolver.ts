/**
 * Conflict resolution strategies for offline-first sync
 */

export type ConflictResolution = 'server-wins' | 'local-wins' | 'merged' | 'user-choice';

export interface ConflictItem {
  id: string;
  table: string;
  localVersion: any;
  serverVersion: any;
  localUpdatedAt: number;
  serverUpdatedAt: number;
}

export interface ConflictResolutionResult {
  id: string;
  strategy: ConflictResolution;
  resolvedData: any;
  requiresUserAction: boolean;
  reason: string;
}

/**
 * Attempt intelligent merge of local and server versions
 * Works best for additive changes (new fields, list additions)
 */
export const intelligentMerge = (
  local: any,
  server: any
): { merged: any; conflicts: string[] } => {
  const conflicts: string[] = [];
  const merged = { ...server };

  if (!local || typeof local !== 'object' || !server || typeof server !== 'object') {
    return { merged: server, conflicts: [] };
  }

  // Merge all keys from local and server
  const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);

  for (const key of allKeys) {
    const localVal = local[key];
    const serverVal = server[key];

    // If only in server, keep server
    if (!(key in local)) {
      merged[key] = serverVal;
      continue;
    }

    // If only in local, add it (new field from local)
    if (!(key in server)) {
      merged[key] = localVal;
      continue;
    }

    // Both have the key
    if (localVal === serverVal) {
      merged[key] = serverVal;
      continue;
    }

    // Array fields: merge unique items
    if (Array.isArray(localVal) && Array.isArray(serverVal)) {
      const merged_arr = [...new Set([...serverVal, ...localVal])];
      merged[key] = merged_arr;
      continue;
    }

    // For primitives or objects, prefer server but track conflict
    merged[key] = serverVal;
    conflicts.push(`Field '${key}' differs: local="${localVal}", server="${serverVal}"`);
  }

  return { merged, conflicts };
};

/**
 * Resolve a conflict using specified strategy
 */
export const resolveConflict = (
  conflict: ConflictItem,
  strategy: ConflictResolution = 'merged'
): ConflictResolutionResult => {
  const { id, table, localVersion, serverVersion, localUpdatedAt, serverUpdatedAt } = conflict;

  // Strategy: prefer most recent
  const serverWins = serverUpdatedAt > localUpdatedAt;

  switch (strategy) {
    case 'server-wins':
      return {
        id,
        strategy: 'server-wins',
        resolvedData: serverVersion,
        requiresUserAction: false,
        reason: 'Server version kept (strategy: server-wins)'
      };

    case 'local-wins':
      return {
        id,
        strategy: 'local-wins',
        resolvedData: localVersion,
        requiresUserAction: false,
        reason: 'Local version kept (strategy: local-wins)'
      };

    case 'merged':
      const { merged, conflicts } = intelligentMerge(localVersion, serverVersion);
      return {
        id,
        strategy: 'merged',
        resolvedData: merged,
        requiresUserAction: conflicts.length > 0,
        reason: conflicts.length > 0 
          ? `Merged with ${conflicts.length} field conflict(s): ${conflicts.join('; ')}`
          : 'Successfully merged without conflicts'
      };

    case 'user-choice':
    default:
      return {
        id,
        strategy: 'user-choice',
        resolvedData: null,
        requiresUserAction: true,
        reason: `Conflict requires user decision. Server: ${JSON.stringify(serverVersion)}, Local: ${JSON.stringify(localVersion)}`
      };
  }
};

/**
 * Batch resolve multiple conflicts
 */
export const resolveBatchConflicts = (
  conflicts: ConflictItem[],
  strategy: ConflictResolution = 'merged'
): ConflictResolutionResult[] => {
  return conflicts.map(conflict => resolveConflict(conflict, strategy));
};

/**
 * Detect if a conflict would occur
 */
export const detectConflict = (
  localVersion: any,
  serverVersion: any,
  lastSyncedVersion: any
): boolean => {
  // No conflict if versions are identical
  if (JSON.stringify(localVersion) === JSON.stringify(serverVersion)) {
    return false;
  }

  // Conflict if both local and server changed from last synced
  const localChanged = JSON.stringify(localVersion) !== JSON.stringify(lastSyncedVersion);
  const serverChanged = JSON.stringify(serverVersion) !== JSON.stringify(lastSyncedVersion);

  return localChanged && serverChanged;
};
