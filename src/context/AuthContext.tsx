import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { AuthService } from '../services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (email: string, pass: string, name: string, org?: string) => Promise<User>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const session = AuthService.getCurrentSession();
      if (session) {
        setUser(session.user);
      }
    } catch (e) {
      console.error('Session load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const loggedUser = await AuthService.login(email, pass);
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (email: string, pass: string, name: string, org?: string) => {
    const registered = await AuthService.register(email, pass, name, org);
    setUser(registered);
    return registered;
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  const updateProfile = (updates: Partial<User>) => {
    if (!user) return;
    const updated = AuthService.updateProfile(user.id, updates);
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
