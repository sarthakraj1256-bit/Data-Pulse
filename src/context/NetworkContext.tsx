import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { OfflineSyncService, QueuedOperation } from '../services/offlineSyncService';

interface NetworkContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  pendingCount: number;
  queue: QueuedOperation[];
  lastSyncTime: string | null;
  isSyncing: boolean;
  toggleSimulatedOffline: () => void;
  syncPending: () => Promise<{ syncedCount: number; failedCount: number }>;
  clearQueue: () => void;
  enqueueOperation: (op: {
    type: QueuedOperation['type'];
    title: string;
    description?: string;
    datasetId?: string;
    payload?: Record<string, any>;
  }) => QueuedOperation;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => OfflineSyncService.isOnline());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() => OfflineSyncService.isSimulated());
  const [pendingCount, setPendingCount] = useState<number>(() => OfflineSyncService.getPendingCount());
  const [queue, setQueue] = useState<QueuedOperation[]>(() => OfflineSyncService.getQueue());
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => OfflineSyncService.getLastSyncTime());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const prevOnlineRef = useRef<boolean>(isOnline);

  const updateState = useCallback(() => {
    const currentOnline = OfflineSyncService.isOnline();
    setIsOnline(currentOnline);
    setIsSimulatedOffline(OfflineSyncService.isSimulated());
    setPendingCount(OfflineSyncService.getPendingCount());
    setQueue(OfflineSyncService.getQueue());
    setLastSyncTime(OfflineSyncService.getLastSyncTime());
  }, []);

  useEffect(() => {
    const unsubscribe = OfflineSyncService.subscribe(() => {
      updateState();
    });
    return unsubscribe;
  }, [updateState]);

  // Monitor connectivity transitions for alerts & auto-sync
  useEffect(() => {
    if (prevOnlineRef.current !== isOnline) {
      if (!isOnline) {
        // Transitioned to OFFLINE
        console.warn('DataPulse network state: OFFLINE. Local data operations queued.');
      } else {
        // Transitioned to ONLINE
        console.info('DataPulse network state: ONLINE. Synchronizing queued operations.');
        OfflineSyncService.syncPendingOperations();
      }
      prevOnlineRef.current = isOnline;
    }
  }, [isOnline]);

  const toggleSimulatedOffline = useCallback(() => {
    const nextVal = !isSimulatedOffline;
    OfflineSyncService.setSimulatedOffline(nextVal);
    updateState();
  }, [isSimulatedOffline, updateState]);

  const syncPending = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await OfflineSyncService.syncPendingOperations();
      updateState();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [updateState]);

  const clearQueue = useCallback(() => {
    OfflineSyncService.clearQueue();
    updateState();
  }, [updateState]);

  const enqueueOperation = useCallback(
    (op: {
      type: QueuedOperation['type'];
      title: string;
      description?: string;
      datasetId?: string;
      payload?: Record<string, any>;
    }) => {
      const created = OfflineSyncService.enqueue(op);
      updateState();
      return created;
    },
    [updateState]
  );

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isSimulatedOffline,
        pendingCount,
        queue,
        lastSyncTime,
        isSyncing,
        toggleSimulatedOffline,
        syncPending,
        clearQueue,
        enqueueOperation,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
