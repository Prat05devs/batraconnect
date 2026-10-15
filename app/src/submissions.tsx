import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addNetworkStateListener } from 'expo-network';
import type { SubmittedComplaint } from './api-client';
import { useAuth } from './auth';
import { useStore } from './store';
import { secureStorage } from './secure-storage';
import { createSubmissionQueue, type QueueEntry } from './submission-queue';
import { pendingKey, submitDraft } from './submit-report';
import type { Report } from './model';
type SendResult =
  { status: 'sent'; complaint: SubmittedComplaint } | { status: 'queued' | 'attention'; error: string };
type State = {
  entries: QueueEntry[];
  send: (report: Report) => Promise<SendResult>;
  retry: (localId?: string) => Promise<void>;
  remove: (localId: string) => Promise<void>;
  clear: () => Promise<void>;
};
const Context = createContext<State | null>(null);
const PROMPTED = 'batra-connect.push-prompted.v1';
type Bridge = {
  call: ReturnType<typeof useAuth>['call'] | null;
  markSent: ReturnType<typeof useStore>['markSent'] | null;
  onChange: (entries: QueueEntry[]) => void;
  delivered: Map<string, SubmittedComplaint>;
};
// One queue per app process; the provider connects it to the signed-in account's request function.
const bridge: Bridge = { call: null, markSent: null, onChange: () => {}, delivered: new Map() };
const callApi: ReturnType<typeof useAuth>['call'] = (path, options) => {
  if (!bridge.call) throw new Error('Not ready');
  return bridge.call(path, options);
};
const queue = createSubmissionQueue({
  storage: secureStorage,
  onChange: entries => bridge.onChange(entries),
  submit: entry =>
    submitDraft({
      draft: entry.draft,
      userId: entry.userId,
      slot: entry.localId,
      storage: secureStorage,
      upload: async uri => {
        const form = new FormData();
        if (Platform.OS === 'web') form.append('photo', await fetch(uri).then(r => r.blob()), 'evidence.jpg');
        else form.append('photo', { uri, name: 'evidence.jpg', type: 'image/jpeg' } as unknown as Blob);
        return (await callApi<{ media: { id: string } }>('/media', { method: 'POST', body: form })).media.id;
      },
      send: async (body, key) =>
        (
          await callApi<{ complaint: SubmittedComplaint }>('/complaints', {
            method: 'POST',
            body,
            headers: { 'Idempotency-Key': key },
          })
        ).complaint,
    }),
  onSent: async (entry, complaint) => {
    bridge.delivered.set(entry.localId, complaint);
    await bridge.markSent?.(entry.localId, {
      id: complaint.id,
      reference: complaint.reference,
      sentAt: new Date().toISOString(),
    });
    await secureStorage.removeItem(pendingKey(entry.userId, entry.localId));
  },
});
export function SubmissionProvider({ children }: React.PropsWithChildren) {
  const { session, call, registerPush } = useAuth();
  const { markSent } = useStore();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  // Staff are residents too: anyone signed in can send reports from this phone.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    bridge.call = call;
    bridge.markSent = markSent;
    bridge.onChange = setEntries;
  }, [call, markSent]);
  const delivered = bridge.delivered;
  const process = useCallback(
    async (only?: string) => {
      if (userId) await queue.process(userId, only).catch(() => {});
    },
    [userId],
  );
  useEffect(() => {
    void queue.load().catch(() => {});
  }, []);
  useEffect(() => {
    if (!userId) return;
    void process();
    const network = addNetworkStateListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) void process();
    });
    const app = AppState.addEventListener('change', state => {
      if (state === 'active') void process();
    });
    const timer = setInterval(() => {
      if (queue.list().some(e => e.userId === userId && !e.needsAttention)) void process();
    }, 120000);
    return () => {
      network.remove();
      app.remove();
      clearInterval(timer);
    };
  }, [process, userId]);
  async function send(report: Report): Promise<SendResult> {
    if (!userId) return { status: 'attention', error: 'Sign in to send reports.' };
    const { id: _id, createdAt: _created, status: _status, sent: _sent, ...draft } = report;
    await queue.enqueue({ localId: report.id, userId, draft });
    await queue.process(userId, report.id);
    const complaint = delivered.get(report.id);
    if (complaint) {
      delivered.delete(report.id);
      // Ask for notification permission once, right after the first report that will produce updates.
      if ((await AsyncStorage.getItem(PROMPTED).catch(() => '1')) === null) {
        await AsyncStorage.setItem(PROMPTED, '1').catch(() => {});
        void registerPush(true);
      }
      return { status: 'sent', complaint };
    }
    const left = queue.list().find(e => e.localId === report.id);
    return { status: left?.needsAttention ? 'attention' : 'queued', error: left?.lastError ?? '' };
  }
  return (
    <Context.Provider
      value={{
        entries: userId ? entries.filter(e => e.userId === userId) : [],
        send,
        retry: async localId => {
          await process(localId);
        },
        remove: async localId => {
          await queue.remove(localId);
          if (userId) await secureStorage.removeItem(pendingKey(userId, localId)).catch(() => {});
        },
        clear: () => queue.clear(),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSubmissions() {
  const value = useContext(Context);
  if (!value) throw new Error('SubmissionProvider missing');
  return value;
}
