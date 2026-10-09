import { Dataset, User, AppNotification, QualityConfigSettings } from '../types';

const USERS_KEY = 'datapulse_users_v1';
const SESSION_KEY = 'datapulse_session_v1';
const DATASETS_KEY_PREFIX = 'datapulse_datasets_';
const NOTIFICATIONS_KEY_PREFIX = 'datapulse_notifs_';
const SETTINGS_KEY_PREFIX = 'datapulse_settings_';

// Default system quality settings
export const DEFAULT_QUALITY_SETTINGS: QualityConfigSettings = {
  completenessThreshold: 95,
  outlierIqrMultiplier: 1.5,
  maxGapSeconds: 300,
  customPlausibilityRules: [
    { column: 'temperature', min: -40, max: 85 },
    { column: 'humidity', min: 0, max: 100 },
    { column: 'pressure', min: 300, max: 1100 },
    { column: 'voltage', min: 0, max: 24 },
    { column: 'soil_moisture', min: 0, max: 100 },
  ],
};

// Simple cryptographic hash simulation for client demonstration
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password + '_datapulse_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const StorageService = {
  // Users & Auth
  getUsers(): User[] {
    try {
      const data = localStorage.getItem(USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load users from storage', e);
      return [];
    }
  },

  saveUsers(users: User[]): void {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users to storage', e);
    }
  },

  getSession(): { user: User; token: string } | null {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setSession(user: User, token: string): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
    } catch (e) {
      console.error('Failed to save session', e);
    }
  },

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  // Datasets (Scoped strictly per user)
  getUserDatasets(userId: string): Dataset[] {
    if (!userId) return [];
    try {
      const key = `${DATASETS_KEY_PREFIX}${userId}`;
      const data = localStorage.getItem(key);
      if (!data) return [];
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to retrieve user datasets', e);
      return [];
    }
  },

  saveUserDatasets(userId: string, datasets: Dataset[]): void {
    if (!userId) return;
    try {
      const key = `${DATASETS_KEY_PREFIX}${userId}`;
      localStorage.setItem(key, JSON.stringify(datasets));
    } catch (e) {
      console.error('Failed to save datasets for user (storage limit might be exceeded)', e);
    }
  },

  getDatasetById(userId: string, datasetId: string): Dataset | null {
    const list = this.getUserDatasets(userId);
    return list.find(d => d.id === datasetId) || null;
  },

  saveOrUpdateDataset(userId: string, dataset: Dataset): void {
    const list = this.getUserDatasets(userId);
    const existingIndex = list.findIndex(d => d.id === dataset.id);
    if (existingIndex >= 0) {
      list[existingIndex] = dataset;
    } else {
      list.unshift(dataset);
    }
    this.saveUserDatasets(userId, list);
  },

  deleteDataset(userId: string, datasetId: string): boolean {
    const list = this.getUserDatasets(userId);
    const filtered = list.filter(d => d.id !== datasetId);
    if (filtered.length !== list.length) {
      this.saveUserDatasets(userId, filtered);
      return true;
    }
    return false;
  },

  deleteMultipleDatasets(userId: string, datasetIds: string[]): number {
    const list = this.getUserDatasets(userId);
    const idSet = new Set(datasetIds);
    const filtered = list.filter(d => !idSet.has(d.id));
    const deletedCount = list.length - filtered.length;
    if (deletedCount > 0) {
      this.saveUserDatasets(userId, filtered);
    }
    return deletedCount;
  },

  // Notifications
  getUserNotifications(userId: string): AppNotification[] {
    if (!userId) return [];
    try {
      const data = localStorage.getItem(`${NOTIFICATIONS_KEY_PREFIX}${userId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveUserNotifications(userId: string, notifs: AppNotification[]): void {
    if (!userId) return;
    try {
      localStorage.setItem(`${NOTIFICATIONS_KEY_PREFIX}${userId}`, JSON.stringify(notifs));
    } catch (e) {
      console.error('Failed to save notifications', e);
    }
  },

  addNotification(userId: string, notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): void {
    const notifs = this.getUserNotifications(userId);
    const newNotif: AppNotification = {
      ...notification,
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      read: false,
    };
    this.saveUserNotifications(userId, [newNotif, ...notifs].slice(0, 50));
  },

  // User Settings
  getSettings(userId: string): QualityConfigSettings {
    try {
      const data = localStorage.getItem(`${SETTINGS_KEY_PREFIX}${userId}`);
      return data ? { ...DEFAULT_QUALITY_SETTINGS, ...JSON.parse(data) } : DEFAULT_QUALITY_SETTINGS;
    } catch {
      return DEFAULT_QUALITY_SETTINGS;
    }
  },

  saveSettings(userId: string, settings: QualityConfigSettings): void {
    try {
      localStorage.setItem(`${SETTINGS_KEY_PREFIX}${userId}`, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  },
};
