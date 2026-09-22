import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  MobileOutboxItem,
  MobileSyncOpType,
  getOutbox,
  enqueueOperation,
  syncOutboxBatch,
  retryOutboxItem,
  removeOutboxItem,
  clearSyncedItems,
  probeConnectivity,
  startConnectivityMonitor,
  stopConnectivityMonitor,
  subscribeToOutbox,
  subscribeToConnectivity,
  subscribeToSyncState,
} from '../services/sync.service';

interface OfflineSyncContextType {
  outbox: MobileOutboxItem[];
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  enqueue: (
    type: MobileSyncOpType,
    entityIdOrPayload: string | Record<string, unknown>,
    payload?: Record<string, unknown>
  ) => string;
  syncNow: () => Promise<void>;
  retryItem: (id: string) => void;
  dismissItem: (id: string) => void;
  clearSynced: () => void;
  checkConnection: () => Promise<boolean>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | null>(null);

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [outbox, setOutbox] = useState<MobileOutboxItem[]>(getOutbox());
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    // Start background connectivity probe
    startConnectivityMonitor(15000);

    const unsubOutbox = subscribeToOutbox((items) => {
      setOutbox(items);
    });

    const unsubConn = subscribeToConnectivity((online) => {
      setIsOnline(online);
    });

    const unsubSync = subscribeToSyncState((syncing) => {
      setIsSyncing(syncing);
    });

    return () => {
      stopConnectivityMonitor();
      unsubOutbox();
      unsubConn();
      unsubSync();
    };
  }, []);

  const pendingCount = useMemo(() => {
    return outbox.filter((item) => item.status === 'QUEUED' || item.status === 'FAILED' || item.status === 'SYNCING').length;
  }, [outbox]);

  const conflictCount = useMemo(() => {
    return outbox.filter((item) => item.status === 'CONFLICT').length;
  }, [outbox]);

  const enqueue = useCallback(
    (
      type: MobileSyncOpType,
      entityIdOrPayload: string | Record<string, unknown>,
      payload?: Record<string, unknown>
    ): string => {
      let entityId: string;
      let opPayload: Record<string, unknown>;

      if (typeof entityIdOrPayload === 'string') {
        entityId = entityIdOrPayload;
        opPayload = payload || {};
      } else {
        opPayload = entityIdOrPayload || {};
        entityId =
          (opPayload.entityId as string) ||
          (opPayload.shipmentId as string) ||
          (opPayload.vehicleId as string) ||
          'mob_entity';
      }

      const item = enqueueOperation(type, entityId, opPayload);
      return item.id;
    },
    []
  );

  const syncNow = useCallback(async () => {
    await syncOutboxBatch();
  }, []);

  const retryItem = useCallback((id: string) => {
    retryOutboxItem(id);
  }, []);

  const dismissItem = useCallback((id: string) => {
    removeOutboxItem(id);
  }, []);

  const clearSynced = useCallback(() => {
    clearSyncedItems();
  }, []);

  const checkConnection = useCallback(async () => {
    return await probeConnectivity();
  }, []);

  const value = {
    outbox,
    isOnline,
    isSyncing,
    pendingCount,
    conflictCount,
    enqueue,
    syncNow,
    retryItem,
    dismissItem,
    clearSynced,
    checkConnection,
  };

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return ctx;
}
