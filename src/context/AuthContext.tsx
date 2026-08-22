import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Profile } from '../types/index.js';
import { api, setApiAuthToken } from '../lib/api.js';
import { realtime } from '../lib/websocket.js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  effectiveRole: 'admin' | 'employee';
  activeViewRole: 'admin' | 'employee';
  viewingAsEmployee: Profile | null;
  isLoading: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  signUp: (data: any) => Promise<{ verificationToken: string; email: string }>;
  verifyEmail: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  setViewAsEmployee: (employee: Profile | null) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewingAsEmployee, setViewingAsEmployee] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('dayflow_theme') as 'light' | 'dark';
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('dayflow_theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Check initial session
  useEffect(() => {
    async function checkAuth() {
      try {
        const savedToken = localStorage.getItem('dayflow_jwt');
        if (savedToken) {
          setApiAuthToken(savedToken);
          const data = await api.auth.me();
          setUser(data.user);
          setProfile(data.profile);
          realtime.connect(savedToken);
        }
      } catch (err) {
        localStorage.removeItem('dayflow_jwt');
        setApiAuthToken(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const signIn = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const data = await api.auth.signIn(credentials);
      setUser(data.user);
      setProfile(data.profile);
      setViewingAsEmployee(null);
      localStorage.setItem('dayflow_jwt', data.accessToken);
      setApiAuthToken(data.accessToken);
      realtime.connect(data.accessToken);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (data: any) => {
    const res = await api.auth.signUp(data);
    return { verificationToken: res.verificationToken, email: res.email };
  };

  const verifyEmail = async (token: string) => {
    await api.auth.verifyEmail(token);
  };

  const signOut = async () => {
    try {
      await api.auth.signOut();
    } catch {}
    setUser(null);
    setProfile(null);
    setViewingAsEmployee(null);
    localStorage.removeItem('dayflow_jwt');
    setApiAuthToken(null);
    realtime.disconnect();
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setProfile(data.profile);
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  };

  const effectiveRole = user?.role || 'employee';
  const activeViewRole = viewingAsEmployee ? 'employee' : effectiveRole;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        effectiveRole,
        activeViewRole,
        viewingAsEmployee,
        isLoading,
        theme,
        setTheme,
        toggleTheme,
        signIn,
        signUp,
        verifyEmail,
        signOut,
        setViewAsEmployee: setViewingAsEmployee,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
