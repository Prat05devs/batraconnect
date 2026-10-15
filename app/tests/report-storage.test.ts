import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createReportOperations,
  emptyReports,
  parseReports,
  type ReportSnapshot,
} from '../src/report-storage.ts';
const draft = {
  category: 'Road & Transport',
  title: 'TEST Crossing',
  description: 'The crossing near the public library needs repair.',
  district: 'Haridwar',
  locality: 'Public library',
  photos: [],
};
function fixture(
  persist?: (next: ReportSnapshot) => Promise<void>,
  remove?: () => Promise<void>,
  cleanup?: () => Promise<void>,
) {
  let state: ReportSnapshot = { ...emptyReports(), draft };
  let disk: string | null = null;
  const operations = createReportOperations(
    () => state,
    next => {
      state = next;
    },
    persist ??
      (async next => {
        disk = JSON.stringify(next);
      }),
    remove ??
      (async () => {
        disk = null;
      }),
    cleanup ?? (async () => {}),
  );
  return { ...operations, state: () => state, restart: () => parseReports(disk) };
}
test('failed report save retains the draft and retry publishes one durable local report', async () => {
  let fail = true;
  let disk: string | null = null;
  const f = fixture(async next => {
    if (fail) throw new Error('Quota');
    disk = JSON.stringify(next);
  });
  await assert.rejects(f.saveReport(), /Quota/);
  assert.deepEqual(f.state().draft, draft);
  assert.equal(f.state().reports.length, 0);
  fail = false;
  const report = await f.saveReport();
  assert.equal(parseReports(disk).reports[0].id, report.id);
  assert.equal(f.state().reports.length, 1);
  assert.deepEqual(f.state().draft, emptyReports().draft);
});
test('rapid draft updates persist the latest value and preserve evidence-array ownership', async () => {
  const f = fixture();
  const photos = ['file:///test.jpg'];
  const first = f.updateDraft({ title: 'First title', photos });
  photos.push('file:///extra.jpg');
  const second = f.updateDraft({ title: 'Latest title' });
  await Promise.all([first, second]);
  assert.equal(f.restart().draft.title, 'Latest title');
  assert.deepEqual(f.restart().draft.photos, ['file:///test.jpg']);
});
test('overlapping save calls return one report and reject draft changes during saving', async () => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => {
    release = resolve;
  });
  let writes = 0;
  const f = fixture(async () => {
    writes++;
    await hold;
  });
  const first = f.saveReport();
  const second = f.saveReport();
  assert.equal(first, second);
  await assert.rejects(f.updateDraft({ title: 'Unexpected edit' }), /Wait/);
  release();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.id, b.id);
  assert.equal(writes, 1);
  assert.equal(f.state().reports.length, 1);
});
test('clear queued behind saving removes the saved report and blocks new work until cleanup finishes', async () => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => {
    release = resolve;
  });
  let state: ReportSnapshot = { ...emptyReports(), draft };
  let disk: string | null = null;
  const operations = createReportOperations(
    () => state,
    next => {
      state = next;
    },
    async next => {
      await hold;
      disk = JSON.stringify(next);
    },
    async () => {
      disk = null;
    },
    async () => {},
  );
  const save = operations.saveReport();
  const clear = operations.clear();
  await assert.rejects(operations.saveReport(), /clearing/);
  await assert.rejects(operations.updateDraft({ title: 'New draft' }), /Wait/);
  release();
  await save;
  assert.equal(await clear, false);
  assert.deepEqual(state, emptyReports());
  assert.deepEqual(parseReports(disk), emptyReports());
});
test('failed removal preserves reports and retries; failed photo cleanup reports partial completion', async () => {
  let failRemove = true;
  let cleanupCalls = 0;
  const f = fixture(
    undefined,
    async () => {
      if (failRemove) throw new Error('Removal failed');
    },
    async () => {
      cleanupCalls++;
      throw new Error('Photo cleanup failed');
    },
  );
  await f.saveReport();
  await assert.rejects(f.clear(), /Removal failed/);
  assert.equal(f.state().reports.length, 1);
  assert.equal(cleanupCalls, 0);
  failRemove = false;
  assert.equal(await f.clear(), true);
  assert.deepEqual(f.state(), emptyReports());
  assert.equal(cleanupCalls, 1);
});
test('report restoration rejects malformed snapshots and retains valid saved data', async () => {
  for (const raw of ['null', '{bad', '{}', '{"draft":null,"reports":[]}'])
    assert.throws(() => parseReports(raw));
  const f = fixture();
  await f.saveReport();
  assert.deepEqual(f.restart(), f.state());
  assert.deepEqual(parseReports(null), emptyReports());
});
