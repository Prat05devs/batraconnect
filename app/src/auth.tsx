import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiError, createApiClient, type Session, type Account } from './api-client';
import { useLanguage } from './language';
import { devicePushToken } from './push';
// Release builds never fall back to a local address: without EXPO_PUBLIC_API_URL they use the production API.
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  (!__DEV__
    ? 'https://api.batraconnect.com'
    : Platform.OS === 'android'
      ? 'http://10.0.2.2:4000'
      : 'http://127.0.0.1:4000');
export const api = createApiClient(API_BASE);
const KEY = 'batra-connect.session.v1',
  PUSH_KEY = 'batra-connect.push-token.v1';
type Options = Parameters<typeof api>[1];
type AuthState = {
  session: Session | null;
  ready: boolean;
  signIn: (email: string, password: string, name?: string, phone?: string) => Promise<void>;
  acceptSession: (session: Session) => Promise<void>;
  /** remote=false only clears this device, for when the server has already ended the session (account deleted). */
  signOut: (remote?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (user: Account) => void;
  /** Authenticated request; an expired session signs the device out. */
  call: <T>(path: string, options?: Options) => Promise<T>;
  registerPush: (prompt: boolean) => Promise<boolean>;
};
const Context = createContext<AuthState | null>(null);
const persist = async (value: Session) => {
  if (Platform.OS !== 'web')
    await SecureStore.setItemAsync(KEY, JSON.stringify(value), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
};
export function AuthProvider({ children }: React.PropsWithChildren) {
  const { language } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const generation = useRef(0);
  const current = useRef<Session | null>(null);
  const publish = useCallback((value: Session | null) => {
    current.current = value;
    setSession(value);
  }, []);
  useEffect(() => {
    const started = generation.current;
    let active = true;
    void (async () => {
      if (Platform.OS === 'web') return;
      const raw = await SecureStore.getItemAsync(KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Session;
      if (
        !stored.token ||
        !stored.user?.id ||
        !Number.isFinite(Date.parse(stored.expiresAt)) ||
        Date.parse(stored.expiresAt) <= Date.now()
      ) {
        await SecureStore.deleteItemAsync(KEY);
        return;
      }
      if (active && started === generation.current) publish(stored);
      try {
        const result = await api<{ user: Account }>('/auth/me', { token: stored.token });
        if (active && started === generation.current) {
          const next = { ...stored, user: result.user };
          publish(next);
          await persist(next);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && started === generation.current) {
          await SecureStore.deleteItemAsync(KEY);
          if (active) publish(null);
        }
      }
    })()
      .catch(() => {
        /* A missing/invalid secure session leaves the account signed out. */
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [publish]);
  async function acceptSession(result: Session) {
    const started = ++generation.current;
    try {
      await persist(result);
    } catch {
      await api('/auth/logout', { method: 'POST', token: result.token }).catch(() => {});
      throw new Error('Your session could not be saved securely. Please try again.');
    }
    if (started === generation.current) {
      publish(result);
      void registerFor(result, false);
    }
  }
  async function signIn(email: string, password: string, name?: string, phone?: string) {
    const result = await api<Session>(name === undefined ? '/auth/login' : '/auth/register', {
      method: 'POST',
      headers: { 'Accept-Language': language },
      body: { email, password, ...(name === undefined ? {} : { name, ...(phone ? { phone } : {}) }) },
    });
    await acceptSession(result);
  }
  async function signOut(remote = true) {
    ++generation.current;
    const token = remote ? current.current?.token : undefined;
    // Delete the device credential before publishing a signed-out UI.
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(KEY);
    const push = Platform.OS === 'web' ? null : await SecureStore.getItemAsync(PUSH_KEY).catch(() => null);
    publish(null);
    if (token && push)
      await api('/push-tokens', { method: 'DELETE', token, body: { token: push } }).catch(() => {});
    if (token) await api('/auth/logout', { method: 'POST', token });
  }
  const updateUser = useCallback(
    (user: Account) => {
      const value = current.current;
      if (!value) return;
      const next = { ...value, user };
      publish(next);
      void persist(next).catch(() => {});
    },
    [publish],
  );
  const call = useCallback(
    async <T,>(path: string, options: Options = {}) => {
      const value = current.current;
      if (!value)
        throw new ApiError(
          language === 'hi' ? 'कृपया लॉगिन करें।' : 'Please sign in.',
          401,
          'UNAUTHENTICATED',
        );
      try {
        return await api<T>(path, { ...options, token: value.token });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && current.current?.token === value.token) {
          ++generation.current;
          publish(null);
          if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(KEY).catch(() => {});
        }
        throw error;
      }
    },
    [language, publish],
  );
  async function refresh() {
    const result = await call<{ user: Account }>('/auth/me');
    updateUser(result.user);
  }
  async function registerFor(value: Session, prompt: boolean) {
    try {
      const token = await devicePushToken(prompt);
      if (!token) return false;
      await api('/push-tokens', {
        method: 'POST',
        token: value.token,
        body: { token, platform: Platform.OS },
      });
      if (Platform.OS !== 'web') await SecureStore.setItemAsync(PUSH_KEY, token);
      return true;
    } catch {
      return false;
    }
  }
  const registerPush = (prompt: boolean) =>
    current.current ? registerFor(current.current, prompt) : Promise.resolve(false);
  // Keeps the server-side language (used for push, email and SMS text) in step with the app.
  useEffect(() => {
    if (!session || (session.user.language ?? 'en') === language) return;
    void api<{ user: Account }>('/account', { method: 'PATCH', token: session.token, body: { language } })
      .then(r => updateUser(r.user))
      .catch(() => {});
  }, [language, session, updateUser]);
  return (
    <Context.Provider
      value={{ session, ready, signIn, acceptSession, signOut, refresh, updateUser, call, registerPush }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
