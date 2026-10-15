import { ApiError, type SubmittedComplaint } from './api-client.ts';
import type { Draft } from './model.ts';
type Pending = { fingerprint: string; key: string; mediaIds: string[]; complaintId?: string };
type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
/** Retains the request key and successful photo uploads across timeout, retry and app restart. */
export const pendingKey = (userId: string, slot?: string) =>
  `batra-connect.pending-submission:${userId}${slot ? `:${slot}` : ''}`;
export async function submitDraft({
  draft,
  userId,
  slot,
  storage,
  upload,
  send,
}: {
  draft: Draft;
  userId: string;
  slot?: string;
  storage: Storage;
  upload: (uri: string) => Promise<string>;
  send: (body: Omit<Draft, 'photos'> & { mediaIds: string[] }, key: string) => Promise<SubmittedComplaint>;
}) {
  const storageKey = pendingKey(userId, slot);
  const fingerprint = JSON.stringify(draft);
  const raw = await storage.getItem(storageKey);
  let pending: Pending | null = null;
  if (raw) {
    try {
      const value = JSON.parse(raw);
      if (value.fingerprint === fingerprint && typeof value.key === 'string' && Array.isArray(value.mediaIds))
        pending = value;
    } catch {
      /* Rebuild a malformed unsent retry record. */
    }
  }
  if (!pending) {
    pending = {
      fingerprint,
      key: `REQUEST-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
      mediaIds: [],
    };
    await storage.setItem(storageKey, JSON.stringify(pending));
  }
  for (let index = pending.mediaIds.length; index < draft.photos.length; index++) {
    pending.mediaIds.push(await upload(draft.photos[index]));
    await storage.setItem(storageKey, JSON.stringify(pending));
  }
  const { photos: _photos, ...body } = draft;
  try {
    const result = await send({ ...body, mediaIds: pending.mediaIds }, pending.key);
    pending.complaintId = result.id;
    await storage.setItem(storageKey, JSON.stringify(pending)).catch(() => {});
    return result;
  } catch (error) {
    // Definitive client rejection did not create a report; allow corrected retries to upload fresh photos.
    if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429)
      await storage.removeItem(storageKey);
    throw error;
  }
}
