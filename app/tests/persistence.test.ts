import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTransactions } from '../src/persistence.ts';
import { createIdea, emptyPlanning, parsePlanning } from '../src/planning.ts';

test('a failed save does not publish success or erase the last durable draft', async () => {
  const initial = {
    ...emptyPlanning(),
    ideaDraft: {
      category: 'Transport',
      title: 'Safer crossings',
      description: 'Add crossings near the public library.',
      district: 'Haridwar',
    },
  };
  let state = initial;
  let commits = 0;
  const transact = createTransactions(
    () => state,
    async () => {
      throw new Error('Storage full');
    },
    next => {
      state = next;
      commits++;
    },
  );
  await assert.rejects(
    transact(p => ({ ...p, ideas: [createIdea(p.ideaDraft)], ideaDraft: emptyPlanning().ideaDraft })),
    /Storage full/,
  );
  assert.equal(commits, 0);
  assert.deepEqual(state, initial);
});

test('simultaneous bookmarks and saved ideas survive restart without lost updates', async () => {
  let state = emptyPlanning();
  let disk: string | null = null;
  const transact = createTransactions(
    () => state,
    async next => {
      disk = JSON.stringify(next);
    },
    next => {
      state = next;
    },
  );
  const idea = createIdea({
    category: 'Transport',
    title: 'Safer crossings',
    description: 'Add crossings near the public library.',
    district: 'Haridwar',
  });
  await Promise.all([
    transact(p => ({ ...p, bookmarks: [...p.bookmarks, 'transport'] })),
    transact(p => ({ ...p, ideas: [idea, ...p.ideas] })),
    transact(p => ({ ...p, bookmarks: [...p.bookmarks, 'it'] })),
  ]);
  const restarted = parsePlanning(disk);
  assert.deepEqual(restarted.bookmarks, ['transport', 'it']);
  assert.deepEqual(restarted.ideas, [idea]);
  assert.deepEqual(restarted, state);
});

test('retry after quota failure succeeds and does not duplicate a saved item', async () => {
  let state = emptyPlanning();
  let attempts = 0;
  let disk: string | null = null;
  const transact = createTransactions(
    () => state,
    async next => {
      if (++attempts === 1) throw new Error('Quota');
      disk = JSON.stringify(next);
    },
    next => {
      state = next;
    },
  );
  const idea = createIdea({
    category: 'Transport',
    title: 'Safer crossings',
    description: 'Add crossings near the public library.',
    district: 'Haridwar',
  });
  const save = () => transact(p => ({ ...p, ideas: [idea, ...p.ideas] }));
  await assert.rejects(save(), /Quota/);
  await save();
  assert.equal(parsePlanning(disk).ideas.length, 1);
  assert.equal(state.ideas[0].id, idea.id);
});

test('clear waits for an in-flight save and remains empty after restart', async () => {
  let state = emptyPlanning();
  let disk: string | null = null;
  let release!: () => void;
  let started!: () => void;
  const saving = new Promise<void>(resolve => {
    started = resolve;
  });
  const hold = new Promise<void>(resolve => {
    release = resolve;
  });
  let writes = 0;
  const transact = createTransactions(
    () => state,
    async next => {
      if (++writes === 1) {
        started();
        await hold;
      }
      disk = JSON.stringify(next);
    },
    next => {
      state = next;
    },
  );
  const save = transact(p => ({ ...p, bookmarks: ['transport'] }));
  await saving;
  const clear = transact(() => emptyPlanning());
  assert.deepEqual(state, emptyPlanning());
  release();
  await Promise.all([save, clear]);
  assert.deepEqual(parsePlanning(disk), emptyPlanning());
  assert.equal(writes, 2);
});

test('a rejected change does not write and does not poison the next operation', async () => {
  let state = emptyPlanning();
  let writes = 0;
  const transact = createTransactions(
    () => state,
    async () => {
      writes++;
    },
    next => {
      state = next;
    },
  );
  await assert.rejects(
    transact(() => {
      throw new Error('Invalid input');
    }),
    /Invalid input/,
  );
  await transact(p => ({ ...p, bookmarks: ['transport'] }));
  assert.equal(writes, 1);
  assert.deepEqual(state.bookmarks, ['transport']);
});
