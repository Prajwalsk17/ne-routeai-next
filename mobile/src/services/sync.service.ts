/**
 * AuraNER / NER-Route AI — Driver Mobile Offline Synchronization Service
 * 
 * Manages local-first outbox queuing, connectivity probing, exponential backoff retries,
 * conflict state tracking, and batch synchronization with the backend API.
 */

import { MOBILE_CONFIG } from './config';

export type MobileSyncOpType =
  | 'GPS_PING'
  | 'CHECKPOINT_CLEARANCE'
  | 'HAZARD_REPORT'
  | 'PROOF_OF_DELIVERY'
  | 'SOS_TRIGGER';

export type MobileSyncStatus =
  | 'QUEUED'
  | 'SYNCING'
  | 'SYNCED'
  | 'CONFLICT'
  | 'FAILED'
  | 'AUTH_REQUIRED';

export interface MobileConflictInfo {
  conflictType: string;
  serverStatus?: string;
  resolution: string;
  resolutionReason: string;
}

export interface MobileOutboxItem {
  id: string;
  type: MobileSyncOpType;
  entityId: string;
  payload: Record<string, unknown>;
  clientTimestamp: string;
  status: MobileSyncStatus;
  retryCount: number;
  lastAttemptAt?: string;
  error?: string;
  conflict?: MobileConflictInfo;
}

// In-memory outbox state
let outboxItems: MobileOutboxItem[] = [];
let isOnlineState: boolean = true;
let isSyncingState: boolean = false;
let authExpiredState: boolean = false;
let connectivityTimer: ReturnType<typeof setInterval> | null = null;

const outboxListeners: Set<(items: MobileOutboxItem[]) => void> = new Set();
const connectivityListeners: Set<(online: boolean) => void> = new Set();
const syncStateListeners: Set<(syncing: boolean) => void> = new Set();

/**
 * Enqueues an operation into the local outbox
 */
export function enqueueOperation(
  type: MobileSyncOpType,
  entityId: string,
  payload: Record<string, unknown>
): MobileOutboxItem {
  // Enforce outbox capacity
  if (outboxItems.length >= MOBILE_CONFIG.maxQueuedItems) {
    // Drop oldest synced or lowest priority GPS item if capacity exceeded
    const oldestIdx = outboxItems.findIndex((i) => i.status === 'SYNCED' || i.type === 'GPS_PING');
    if (oldestIdx >= 0) {
      outboxItems.splice(oldestIdx, 1);
    } else {
      outboxItems.shift();
    }
  }

  const id = `mob_out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const item: MobileOutboxItem = {
    id,
    type,
    entityId,
    payload,
    clientTimestamp: new Date().toISOString(),
    status: 'QUEUED',
    retryCount: 0,
  };

  outboxItems.unshift(item);
  notifyOutboxListeners();

  // If online, attempt background sync immediately
  if (isOnlineState && !isSyncingState) {
    syncOutboxBatch().catch((err) => console.warn('Auto-sync cycle error:', err));
  }

  return item;
}

/**
 * Returns current outbox items
 */
export function getOutbox(): MobileOutboxItem[] {
  return [...outboxItems];
}

/**
 * Calculates exponential backoff delay in milliseconds
 */
export function calculateBackoffMs(retryCount: number): number {
  const delay = MOBILE_CONFIG.retryDelayMs * Math.pow(2, Math.min(retryCount, 5));
  return Math.min(delay, 30000);
}

/**
 * Synchronizes queued and failed outbox items with the server
 */
export async function syncOutboxBatch(): Promise<{
  synced: number;
  conflicts: number;
  failed: number;
}> {
  if (isSyncingState) {
    return { synced: 0, conflicts: 0, failed: 0 };
  }

  const pendingItems = outboxItems.filter(
    (item) => item.status === 'QUEUED' || item.status === 'FAILED'
  );

  if (pendingItems.length === 0) {
    return { synced: 0, conflicts: 0, failed: 0 };
  }

  isSyncingState = true;
  notifySyncStateListeners();

  // Mark pending items as SYNCING
  const pendingIds = new Set(pendingItems.map((i) => i.id));
  outboxItems = outboxItems.map((i) =>
    pendingIds.has(i.id) ? { ...i, status: 'SYNCING' as MobileSyncStatus } : i
  );
  notifyOutboxListeners();

  let syncedCount = 0;
  let conflictCount = 0;
  let failedCount = 0;

  try {
    const payload = {
      device_id: 'mobile_cab_unit',
      operations: pendingItems.map((item) => ({
        id: item.id,
        type: item.type,
        entity_id: item.entityId,
        payload: item.payload,
        client_timestamp: item.clientTimestamp,
      })),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MOBILE_CONFIG.requestTimeoutMs);

    const res = await fetch(`${MOBILE_CONFIG.apiBaseUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 401) {
      // Authentication expired: freeze outbox, do not drop field records
      authExpiredState = true;
      outboxItems = outboxItems.map((i) =>
        pendingIds.has(i.id)
          ? { ...i, status: 'AUTH_REQUIRED' as MobileSyncStatus, error: 'Session expired. Re-authenticate to sync.' }
          : i
      );
      notifyOutboxListeners();
      return { synced: 0, conflicts: 0, failed: pendingItems.length };
    }

    if (res.ok) {
      const data = await res.json();
      const resultsMap = new Map<string, any>();
      if (data.data && Array.isArray(data.data.results)) {
        for (const r of data.data.results) {
          resultsMap.set(r.id, r);
        }
      }

      // Apply per-item partial sync results
      outboxItems = outboxItems.map((item) => {
        if (!pendingIds.has(item.id)) return item;

        const serverResult = resultsMap.get(item.id);
        if (!serverResult) {
          // Fallback: If server processed batch successfully but item missing from result
          syncedCount++;
          return { ...item, status: 'SYNCED' as MobileSyncStatus, error: undefined };
        }

        if (serverResult.status === 'SYNCED') {
          syncedCount++;
          return {
            ...item,
            status: 'SYNCED' as MobileSyncStatus,
            conflict: serverResult.conflict,
            error: undefined,
          };
        } else if (serverResult.status === 'CONFLICT') {
          conflictCount++;
          return {
            ...item,
            status: 'CONFLICT' as MobileSyncStatus,
            conflict: serverResult.conflict,
            error: serverResult.conflict?.resolutionReason,
          };
        } else {
          failedCount++;
          return {
            ...item,
            status: 'FAILED' as MobileSyncStatus,
            error: serverResult.error || 'Server rejected operation',
            retryCount: item.retryCount + 1,
            lastAttemptAt: new Date().toISOString(),
          };
        }
      });

      isOnlineState = true;
      notifyConnectivityListeners();
    } else {
      // HTTP Error: mark pending items failed with backoff increment
      failedCount = pendingItems.length;
      handleNetworkSyncFailure(pendingIds, `Server responded with ${res.status}`);
    }
  } catch (err: unknown) {
    // Network timeout or complete offline disconnection
    failedCount = pendingItems.length;
    isOnlineState = false;
    notifyConnectivityListeners();
    const errorMsg = err instanceof Error ? err.message : 'Network unreachable in shadow zone';
    handleNetworkSyncFailure(pendingIds, errorMsg);
  } finally {
    isSyncingState = false;
    notifySyncStateListeners();
    notifyOutboxListeners();
  }

  return { synced: syncedCount, conflicts: conflictCount, failed: failedCount };
}

function handleNetworkSyncFailure(pendingIds: Set<string>, errorMsg: string): void {
  const now = new Date().toISOString();
  outboxItems = outboxItems.map((item) => {
    if (!pendingIds.has(item.id)) return item;

    const newRetryCount = item.retryCount + 1;
    const isExceeded = newRetryCount >= MOBILE_CONFIG.maxRetryAttempts;

    return {
      ...item,
      status: isExceeded ? ('FAILED' as MobileSyncStatus) : ('QUEUED' as MobileSyncStatus),
      retryCount: newRetryCount,
      lastAttemptAt: now,
      error: errorMsg,
    };
  });
}

/**
 * Retries a specific item or resolves a conflict
 */
export function retryOutboxItem(id: string): void {
  outboxItems = outboxItems.map((item) =>
    item.id === id
      ? { ...item, status: 'QUEUED' as MobileSyncStatus, retryCount: 0, error: undefined }
      : item
  );
  notifyOutboxListeners();

  if (isOnlineState && !isSyncingState) {
    syncOutboxBatch().catch((err) => console.warn('Retry sync error:', err));
  }
}

/**
 * Removes an item from the outbox (e.g. driver acknowledged and dismissed a rejected conflict)
 */
export function removeOutboxItem(id: string): void {
  outboxItems = outboxItems.filter((item) => item.id !== id);
  notifyOutboxListeners();
}

/**
 * Clears all successfully synced items from outbox
 */
export function clearSyncedItems(): void {
  outboxItems = outboxItems.filter((item) => item.status !== 'SYNCED');
  notifyOutboxListeners();
}

/**
 * Probes network health against the backend health probe
 */
export async function probeConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${MOBILE_CONFIG.apiBaseUrl.replace('/api/v1', '')}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const prevOnline = isOnlineState;
    isOnlineState = res.ok;

    if (!prevOnline && isOnlineState) {
      // Transition from offline to online: auto-flush pending outbox!
      notifyConnectivityListeners();
      syncOutboxBatch().catch((err) => console.warn('Auto-reconnection sync error:', err));
    } else if (prevOnline !== isOnlineState) {
      notifyConnectivityListeners();
    }

    return isOnlineState;
  } catch {
    const prevOnline = isOnlineState;
    isOnlineState = false;
    if (prevOnline) {
      notifyConnectivityListeners();
    }
    return false;
  }
}

/**
 * Programmatically updates online/offline state (e.g. from NetInfo or offline simulation)
 */
export function setOnlineState(online: boolean): void {
  const prevOnline = isOnlineState;
  isOnlineState = online;

  if (!prevOnline && isOnlineState) {
    notifyConnectivityListeners();
    syncOutboxBatch().catch((err) => console.warn('Auto-reconnection sync error:', err));
  } else if (prevOnline !== isOnlineState) {
    notifyConnectivityListeners();
  }
}

/**
 * Starts periodic background connectivity polling
 */
export function startConnectivityMonitor(intervalMs = 15000): void {
  if (connectivityTimer) clearInterval(connectivityTimer);
  probeConnectivity();
  connectivityTimer = setInterval(() => {
    probeConnectivity();
  }, intervalMs);
}

/**
 * Stops periodic connectivity polling
 */
export function stopConnectivityMonitor(): void {
  if (connectivityTimer) {
    clearInterval(connectivityTimer);
    connectivityTimer = null;
  }
}

/**
 * State listeners
 */
export function subscribeToOutbox(listener: (items: MobileOutboxItem[]) => void): () => void {
  outboxListeners.add(listener);
  return () => {
    outboxListeners.delete(listener);
  };
}

export function subscribeToConnectivity(listener: (online: boolean) => void): () => void {
  connectivityListeners.add(listener);
  return () => {
    connectivityListeners.delete(listener);
  };
}

export function subscribeToSyncState(listener: (syncing: boolean) => void): () => void {
  syncStateListeners.add(listener);
  return () => {
    syncStateListeners.delete(listener);
  };
}

function notifyOutboxListeners(): void {
  const copy = [...outboxItems];
  outboxListeners.forEach((listener) => {
    listener(copy);
  });
}

function notifyConnectivityListeners(): void {
  connectivityListeners.forEach((listener) => {
    listener(isOnlineState);
  });
}

function notifySyncStateListeners(): void {
  syncStateListeners.forEach((listener) => {
    listener(isSyncingState);
  });
}

/**
 * Resets sync service state for clean testing
 */
export function _resetSyncService(): void {
  stopConnectivityMonitor();
  outboxItems = [];
  isOnlineState = true;
  isSyncingState = false;
  authExpiredState = false;
  outboxListeners.clear();
  connectivityListeners.clear();
  syncStateListeners.clear();
}
