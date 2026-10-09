import { AuditLogEntry, AuditActionType, AuditCategoryType } from '../types';

const AUDIT_STORAGE_PREFIX = 'datapulse_audit_logs_';
type AuditListener = (entry: AuditLogEntry) => void;
const listeners = new Set<AuditListener>();

export const AuditService = {
  subscribe(listener: AuditListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getLogs(userId: string): AuditLogEntry[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(`${AUDIT_STORAGE_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to load audit logs', e);
      return [];
    }
  },

  log(
    user: { id: string; email: string; name: string },
    action: AuditActionType,
    category: AuditCategoryType,
    description: string,
    options?: {
      datasetId?: string;
      datasetName?: string;
      traceId?: string;
      metadata?: Record<string, any>;
      severity?: 'info' | 'success' | 'warning' | 'alert';
    }
  ): AuditLogEntry {
    if (!user || !user.id) throw new Error('Cannot log audit event without valid user context');

    const entry: AuditLogEntry = {
      id: 'aud_' + Math.random().toString(36).substring(2, 9) + Date.now(),
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      action,
      category,
      description,
      timestamp: new Date().toISOString(),
      datasetId: options?.datasetId,
      datasetName: options?.datasetName,
      traceId: options?.traceId,
      metadata: options?.metadata,
      severity: options?.severity || 'info',
    };

    try {
      const current = this.getLogs(user.id);
      const updated = [entry, ...current].slice(0, 200); // Keep latest 200 logs
      localStorage.setItem(`${AUDIT_STORAGE_PREFIX}${user.id}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist audit log', e);
    }

    // Notify live subscribers
    listeners.forEach(cb => {
      try {
        cb(entry);
      } catch (err) {
        console.error('Audit listener error', err);
      }
    });

    return entry;
  },

  clearLogs(userId: string): void {
    if (!userId) return;
    try {
      localStorage.removeItem(`${AUDIT_STORAGE_PREFIX}${userId}`);
    } catch (e) {
      console.error('Failed to clear audit logs', e);
    }
  },

  exportLogsToCSV(userId: string): void {
    const logs = this.getLogs(userId);
    if (logs.length === 0) return;

    const headers = ['ID', 'Timestamp', 'User', 'Action', 'Category', 'Description', 'Dataset', 'Trace ID', 'Severity'];
    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      l.userEmail,
      l.action,
      l.category,
      `"${l.description.replace(/"/g, '""')}"`,
      l.datasetName || '',
      l.traceId || '',
      l.severity,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DataPulse_User_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
