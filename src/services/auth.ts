import { User } from '../types';
import { StorageService, hashPassword } from './storage';
import { AuditService } from './auditService';

interface StoredAccount {
  user: User;
  passwordHash: string;
}

const ACCOUNTS_KEY = 'datapulse_accounts_db_v1';

function getStoredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredAccounts(accounts: StoredAccount[]) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save accounts database', e);
  }
}

export const AuthService = {
  getCurrentSession(): { user: User; token: string } | null {
    return StorageService.getSession();
  },

  async register(email: string, password: string, name: string, organization?: string): Promise<User> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Please enter a valid corporate or academic email address.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const accounts = getStoredAccounts();
    const existing = accounts.find(a => a.user.email.toLowerCase() === trimmedEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    const passwordHash = await hashPassword(password);
    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 10),
      email: trimmedEmail,
      name: name.trim() || trimmedEmail.split('@')[0],
      organization: organization?.trim() || 'Independent Lab',
      role: 'analyst',
      createdAt: new Date().toISOString(),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || trimmedEmail)}&backgroundColor=641b32&textColor=fff8ef`,
    };

    accounts.push({ user: newUser, passwordHash });
    saveStoredAccounts(accounts);

    // Create session token
    const token = 'dpt_' + Math.random().toString(36).substring(2) + Date.now();
    StorageService.setSession(newUser, token);

    AuditService.log(
      newUser,
      'AUTH_REGISTERED',
      'security',
      `Account created for analyst "${newUser.name}" (${newUser.email})`,
      { severity: 'success' }
    );

    // Record welcome notification
    StorageService.addNotification(newUser.id, {
      type: 'success',
      title: 'Welcome to DataPulse',
      message: 'Your account is active. You can now ingest datasets, run 6-dimension quality assessments, and trace transformations.',
    });

    return newUser;
  },

  async login(email: string, password: string): Promise<User> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      throw new Error('Please provide both email and password.');
    }

    const accounts = getStoredAccounts();
    const account = accounts.find(a => a.user.email.toLowerCase() === trimmedEmail);
    if (!account) {
      throw new Error('Invalid email or password. Please verify your credentials or register a new account.');
    }

    const passwordHash = await hashPassword(password);
    if (account.passwordHash !== passwordHash) {
      throw new Error('Invalid email or password. Please verify your credentials.');
    }

    const token = 'dpt_' + Math.random().toString(36).substring(2) + Date.now();
    StorageService.setSession(account.user, token);

    AuditService.log(
      account.user,
      'AUTH_LOGIN',
      'security',
      `Session established for "${account.user.email}"`,
      { severity: 'info' }
    );

    return account.user;
  },

  async resetPassword(email: string, newPassword: string): Promise<void> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !newPassword) {
      throw new Error('Please provide your email and new password.');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const accounts = getStoredAccounts();
    const accountIdx = accounts.findIndex(a => a.user.email.toLowerCase() === trimmedEmail);
    if (accountIdx === -1) {
      throw new Error('No registered account was found with that email address.');
    }

    const newHash = await hashPassword(newPassword);
    accounts[accountIdx].passwordHash = newHash;
    saveStoredAccounts(accounts);
  },

  logout(): void {
    const session = StorageService.getSession();
    if (session) {
      AuditService.log(
        session.user,
        'AUTH_LOGOUT',
        'security',
        `User "${session.user.email}" signed out securely`,
        { severity: 'info' }
      );
    }
    StorageService.clearSession();
  },

  updateProfile(userId: string, updates: Partial<User>): User {
    const session = StorageService.getSession();
    if (!session || session.user.id !== userId) {
      throw new Error('Unauthorized profile modification attempt.');
    }

    const accounts = getStoredAccounts();
    const accountIdx = accounts.findIndex(a => a.user.id === userId);
    if (accountIdx === -1) {
      throw new Error('User record not found.');
    }

    const updatedUser: User = {
      ...accounts[accountIdx].user,
      ...updates,
      id: userId, // Ensure immutable ID
    };

    accounts[accountIdx].user = updatedUser;
    saveStoredAccounts(accounts);
    StorageService.setSession(updatedUser, session.token);

    return updatedUser;
  },
};
