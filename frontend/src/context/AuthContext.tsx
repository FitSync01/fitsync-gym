import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  user_id: string;
  email: string;
  name: string;
  role: string;
  gym_id: string | null;
  must_reset_password: boolean;
  [key: string]: any;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string, phone: string, role: string) => Promise<User>;
  googleAuth: (idToken: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        await api.setToken(token);
        const u = await api.get('/api/auth/me');
        setUser(u);
      }
    } catch {
      await api.clearToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });
    await api.setToken(res.access_token);
    await AsyncStorage.setItem('refresh_token', res.refresh_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (email: string, password: string, name: string, phone: string, role: string) => {
    const res = await api.post('/api/auth/register', { email, password, name, phone, role });
    await api.setToken(res.access_token);
    await AsyncStorage.setItem('refresh_token', res.refresh_token);
    setUser(res.user);
    return res.user;
  };

  const googleAuth = async (idToken: string) => {
    const res = await api.post('/api/auth/google-session', { id_token: idToken });
    await api.setToken(res.access_token);
    await AsyncStorage.setItem('refresh_token', res.refresh_token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch {}
    await api.clearToken();
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const u = await api.get('/api/auth/me');
      setUser(u);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleAuth, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
