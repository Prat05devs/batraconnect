'use client';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError, getToken, setToken } from './api';
export type Admin = { id: string; name: string; email: string; role: string };
type AuthState = {
  user: Admin | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<AuthState | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<Admin | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // The session token lives in this tab's sessionStorage; confirm it is still valid before showing the dashboard.
    const check = getToken()
      ? api<{ user: Admin }>('/auth/me')
          .then(r => setUser(r.user.role === 'admin' ? r.user : null))
          .catch(() => setToken(null))
      : Promise.resolve();
    void check.finally(() => setReady(true));
    const out = () => setUser(null);
    window.addEventListener('batra-signed-out', out);
    return () => window.removeEventListener('batra-signed-out', out);
  }, []);
  const signIn = useCallback(async (email: string, password: string) => {
    const result = await api<{ token: string; user: Admin }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (result.user.role !== 'admin') {
      setToken(result.token);
      await api('/auth/logout', { method: 'POST' }).catch(() => {});
      setToken(null);
      throw new ApiError('This dashboard is for administrators only.', 403, 'NOT_ADMIN');
    }
    setToken(result.token);
    setUser(result.user);
  }, []);
  const signOut = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setToken(null);
    setUser(null);
  }, []);
  return <Context.Provider value={{ user, ready, signIn, signOut }}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
