import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiClient, ApiError, type SubmittedComplaint } from '../src/api-client.ts';
import { submitDraft } from '../src/submit-report.ts';
test('API client sends credentials, preserves server errors and handles missing network', async () => {
  const seen: { url?: string; options?: RequestInit } = {};
  const request = createApiClient('https://example.invalid/', (async (url, options) => {
    seen.url = String(url);
    seen.options = options;
    return new Response(JSON.stringify({ complaints: [] }), { status: 200 });
  }) as typeof fetch);
  await request('/complaints', { token: 'test-token' });
  assert.equal(seen.url, 'https://example.invalid/api/v1/complaints');
  assert.equal((seen.options?.headers as Record<string, string>).Authorization, 'Bearer test-token');
  const denied = createApiClient(
    'https://example.invalid',
    async () =>
      new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } }), {
        status: 401,
      }),
  );
  await assert.rejects(
    () => denied('/complaints'),
    (e: unknown) => e instanceof ApiError && e.status === 401 && e.code === 'UNAUTHENTICATED',
  );
  const offline = createApiClient('https://example.invalid', async () => {
    throw new Error('network');
  });
  await assert.rejects(
    () => offline('/complaints'),
    (e: unknown) => e instanceof ApiError && e.code === 'NETWORK_ERROR',
  );
});
test('submission retry preserves request key and uploaded photos across a lost receipt', async () => {
  const saved = new Map<string, string>();
  const storage = {
    getItem: async (k: string) => saved.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      saved.set(k, v);
    },
    removeItem: async (k: string) => {
      saved.delete(k);
    },
  };
  const draft = {
    category: 'Road & Transport',
    title: 'Road repair needed',
    description: 'The road outside school needs a repair.',
    district: 'Haridwar',
    locality: 'School gate',
    photos: ['file://evidence.jpg'],
  };
  let uploads = 0;
  const keys: string[] = [];
  let sends = 0;
  const result = { id: 'received-id' } as SubmittedComplaint;
  const send = async (_body: unknown, key: string) => {
    keys.push(key);
    sends++;
    if (sends === 1) throw new ApiError('Response lost', 0, 'NETWORK_ERROR');
    return result;
  };
  const args = {
    draft,
    userId: 'citizen-a',
    storage,
    upload: async () => {
      uploads++;
      return 'media-id';
    },
    send,
  };
  await assert.rejects(() => submitDraft(args));
  assert.equal((await submitDraft(args)).id, 'received-id');
  assert.equal(uploads, 1);
  assert.equal(keys[0], keys[1]);
  await submitDraft({ ...args, userId: 'citizen-b' });
  assert.equal(uploads, 2);
  assert.notEqual(keys[1], keys[2]);
});
