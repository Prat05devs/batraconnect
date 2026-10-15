import { ApiError, type SubmittedComplaint } from './api-client.ts';
import type { Draft } from './model.ts';
import type { KeyValueStorage } from './encrypted-storage.ts';
export type QueueEntry = {
  localId: string;
  userId: string;
  draft: Draft;
  queuedAt: string;
  attempts: number;
  lastError?: string;
  needsAttention?: boolean;
};
export const QUEUE_KEY = 'batra-connect:submission-queue:v1';
const retryable = (error: unknown) =>
  !(error instanceof ApiError) || error.status === 0 || error.status === 429 || error.status >= 500;
/**
 * Reports waiting to reach Batra Connect. Network and server failures stay queued for automatic retry;
 * a definitive rejection (e.g. validation) waits for the citizen to correct or remove it.
 */
export function createSubmissionQueue({
  storage,
  submit,
  onSent,
  onChange = () => {},
}: {
  storage: KeyValueStorage;
  submit: (entry: QueueEntry) => Promise<SubmittedComplaint>;
  onSent: (entry: QueueEntry, complaint: SubmittedComplaint) => Promise<void>;
  onChange?: (entries: QueueEntry[]) => void;
}) {
  let entries: QueueEntry[] = [];
  let loaded: Promise<void> | null = null;
  let running: Promise<{ sent: number; failed: number }> | null = null;
  let writes = Promise.resolve();
  const save = () => {
    const snapshot = JSON.stringify(entries);
    writes = writes.catch(() => {}).then(() => storage.setItem(QUEUE_KEY, snapshot));
    onChange([...entries]);
    return writes;
  };
  function load() {
    loaded ??= storage.getItem(QUEUE_KEY).then(raw => {
      const value = raw ? JSON.parse(raw) : [];
      entries = Array.isArray(value)
        ? value.filter(e => e && typeof e.localId === 'string' && typeof e.userId === 'string' && e.draft)
        : [];
      onChange([...entries]);
    });
    return loaded;
  }
  async function enqueue(entry: Omit<QueueEntry, 'queuedAt' | 'attempts'>) {
    await load();
    if (entries.some(e => e.localId === entry.localId)) return;
    entries = [...entries, { ...entry, queuedAt: new Date().toISOString(), attempts: 0 }];
    await save();
  }
  async function process(userId: string, only?: string) {
    await load();
    if (running) {
      await running.catch(() => {});
    }
    running = (async () => {
      let sent = 0,
        failed = 0;
      for (const entry of entries.filter(
        e => e.userId === userId && (only ? e.localId === only : !e.needsAttention),
      )) {
        try {
          const complaint = await submit(entry);
          entries = entries.filter(e => e.localId !== entry.localId);
          await save();
          sent++;
          await onSent(entry, complaint).catch(() => {});
        } catch (error) {
          failed++;
          const message = error instanceof Error ? error.message : 'Sending failed.';
          entries = entries.map(e =>
            e.localId === entry.localId
              ? { ...e, attempts: e.attempts + 1, lastError: message, needsAttention: !retryable(error) }
              : e,
          );
          await save();
          if (retryable(error) && error instanceof ApiError && error.status === 0) break; // offline: stop until connectivity returns
        }
      }
      return { sent, failed };
    })().finally(() => {
      running = null;
    });
    return running;
  }
  async function remove(localId: string) {
    await load();
    entries = entries.filter(e => e.localId !== localId);
    await save();
  }
  return {
    load,
    enqueue,
    process,
    remove,
    list: () => [...entries],
    clear: async () => {
      entries = [];
      await storage.removeItem(QUEUE_KEY);
      onChange([]);
    },
  };
}
