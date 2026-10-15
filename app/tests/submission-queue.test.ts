import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, type SubmittedComplaint } from '../src/api-client.ts';
import { createSubmissionQueue, QUEUE_KEY, type QueueEntry } from '../src/submission-queue.ts';
const draft = {
  category: 'Water supply',
  title: 'No water today',
  description: 'There has been no water supply since morning.',
  district: 'Haridwar',
  locality: 'Civil Lines',
  photos: [],
};
const memory = () => {
  const m = new Map<string, string>();
  return {
    m,
    getItem: async (k: string) => m.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      m.set(k, v);
    },
    removeItem: async (k: string) => {
      m.delete(k);
    },
  };
};
test('offline reports wait, survive restart, send once when online and record the receipt', async () => {
  const storage = memory();
  let online = false;
  const sent: string[] = [];
  const received: string[] = [];
  const submit = async (e: QueueEntry) => {
    if (!online) throw new ApiError('offline', 0, 'NETWORK_ERROR');
    sent.push(e.localId);
    return { id: `srv-${e.localId}`, reference: 'BC-1' } as SubmittedComplaint;
  };
  const queue = createSubmissionQueue({
    storage,
    submit,
    onSent: async (e, c) => {
      received.push(`${e.localId}>${c.id}`);
    },
  });
  await queue.enqueue({ localId: 'LOCAL-A', userId: 'u1', draft });
  await queue.enqueue({ localId: 'LOCAL-B', userId: 'u1', draft });
  await queue.enqueue({ localId: 'LOCAL-A', userId: 'u1', draft });
  assert.deepEqual(
    await queue.process('u1'),
    { sent: 0, failed: 1 },
    'stops after the first offline failure',
  );
  const restarted = createSubmissionQueue({
    storage,
    submit,
    onSent: async (e, c) => {
      received.push(`${e.localId}>${c.id}`);
    },
  });
  await restarted.load();
  assert.equal(restarted.list().length, 2);
  assert.equal(restarted.list()[0].attempts, 1);
  online = true;
  await Promise.all([restarted.process('u1'), restarted.process('u1')]);
  assert.deepEqual(sent, ['LOCAL-A', 'LOCAL-B'], 'concurrent triggers do not double-send');
  assert.deepEqual(received, ['LOCAL-A>srv-LOCAL-A', 'LOCAL-B>srv-LOCAL-B']);
  assert.equal(JSON.parse(storage.m.get(QUEUE_KEY)!).length, 0);
});
test('a rejected report needs attention and other accounts are untouched', async () => {
  const storage = memory();
  const calls: string[] = [];
  const queue = createSubmissionQueue({
    storage,
    submit: async e => {
      calls.push(e.localId);
      if (e.localId === 'LOCAL-BAD')
        throw new ApiError('Choose an Uttarakhand district.', 400, 'INVALID_DISTRICT');
      return { id: 'x' } as SubmittedComplaint;
    },
    onSent: async () => {},
  });
  await queue.enqueue({ localId: 'LOCAL-BAD', userId: 'u1', draft: { ...draft, district: 'Atlantis' } });
  await queue.enqueue({ localId: 'LOCAL-OTHER', userId: 'u2', draft });
  await queue.process('u1');
  const [bad] = queue.list();
  assert.equal(bad.needsAttention, true);
  assert.equal(bad.lastError, 'Choose an Uttarakhand district.');
  await queue.process('u1');
  assert.deepEqual(calls, ['LOCAL-BAD'], 'not retried automatically');
  await queue.process('u1', 'LOCAL-BAD');
  assert.equal(calls.length, 2, 'explicit retry is allowed');
  await queue.remove('LOCAL-BAD');
  assert.deepEqual(
    queue.list().map(e => e.userId),
    ['u2'],
  );
});
