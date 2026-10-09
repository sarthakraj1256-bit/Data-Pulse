// Offline Detection, Local Operations Queue, and Synchronization Engine

export interface QueuedOperation {
  id: string;
  type: 'DATASET_CLEAN' | 'DATASET_UPDATE_TAGS' | 'DATASET_DELETE' | 'DATASET_UPLOAD' | 'AUDIT_LOG' | 'SETTINGS_UPDATE';
  title: string;
  description?: string;
  datasetId?: string;
  timestamp: string;
  payload: Record<string, any>;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
}

const STORAGE_QUEUE_KEY = 'datapulse_offline_queue_v1';
const SIMULATED_OFFLINE_KEY = 'datapulse_simulated_offline_v1';
const LAST_SYNC_KEY = 'datapulse_last_sync_v1';

type Listener = () => void;

class OfflineSyncServiceClass {
  private queue: QueuedOperation[] = [];
  private listeners: Set<Listener> = new Set();
  private simulatedOffline: boolean = false;
  private isSyncing: boolean = false;

  constructor() {
    this.simulatedOffline = localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
    this.loadQueue();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkChange);
      window.addEventListener('offline', this.handleNetworkChange);
    }
  }

  private handleNetworkChange = () => {
    this.notify();
    if (this.isOnline()) {
      this.syncPendingOperations();
    }
  };

  private loadQueue(): void {
    try {
      const data = localStorage.getItem(STORAGE_QUEUE_KEY);
      if (data) {
        this.queue = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load offline queue from storage', e);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.error('Failed to persist offline queue to storage', e);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error('Error in offline subscriber callback', err);
      }
    });
  }

  /**
   * Evaluates if the application has active network connectivity.
   * Takes into account simulated offline testing mode.
   */
  public isOnline(): boolean {
    if (this.simulatedOffline) return false;
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  public isSimulated(): boolean {
    return this.simulatedOffline;
  }

  public setSimulatedOffline(value: boolean): void {
    this.simulatedOffline = value;
    try {
      localStorage.setItem(SIMULATED_OFFLINE_KEY, String(value));
    } catch (e) {
      console.error('Failed to persist simulated offline state', e);
    }
    this.notify();
    if (!value && this.isOnline()) {
      this.syncPendingOperations();
    }
  }

  public getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  public getPendingCount(): number {
    return this.queue.filter(q => q.status === 'pending').length;
  }

  public getLastSyncTime(): string | null {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Enqueues an operation to be performed locally and synced to remote when restored.
   */
  public enqueue(operation: {
    type: QueuedOperation['type'];
    title: string;
    description?: string;
    datasetId?: string;
    payload?: Record<string, any>;
  }): QueuedOperation {
    const newOp: QueuedOperation = {
      id: 'op_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: operation.type,
      title: operation.title,
      description: operation.description,
      datasetId: operation.datasetId,
      timestamp: new Date().toISOString(),
      payload: operation.payload || {},
      status: 'pending',
      retryCount: 0,
    };

    this.queue.unshift(newOp);
    this.saveQueue();
    this.notify();

    // If online, attempt instant sync
    if (this.isOnline()) {
      setTimeout(() => this.syncPendingOperations(), 100);
    }

    return newOp;
  }

  /**
   * Synchronizes all pending local operations.
   */
  public async syncPendingOperations(): Promise<{ syncedCount: number; failedCount: number }> {
    if (this.isSyncing) return { syncedCount: 0, failedCount: 0 };
    if (!this.isOnline()) return { syncedCount: 0, failedCount: 0 };

    const pending = this.queue.filter(q => q.status === 'pending');
    if (pending.length === 0) {
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, now);
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    this.notify();

    let syncedCount = 0;
    let failedCount = 0;

    try {
      for (const op of pending) {
        op.status = 'syncing';
        this.notify();

        // Simulate network processing latency for realistic feedback
        await new Promise(res => setTimeout(res, 250));

        // Mark as synced
        op.status = 'synced';
        syncedCount++;
      }

      // Retain the last 15 synced items for audit history, remove older ones
      this.queue = this.queue.filter(q => q.status === 'pending' || q.status === 'failed')
        .concat(this.queue.filter(q => q.status === 'synced').slice(0, 15));

      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, now);
      this.saveQueue();
    } catch (err) {
      console.error('Failed to sync offline queue', err);
      failedCount++;
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return { syncedCount, failedCount };
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    this.notify();
  }
}

export const OfflineSyncService = new OfflineSyncServiceClass();
