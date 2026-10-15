import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categories, createReport, emptyDraft, validateReport, validateStep } from '../src/model.ts';
const valid = () => ({
  ...emptyDraft(),
  category: categories[0].name,
  title: 'Damaged road',
  description: 'A large pothole is blocking access near the bus stop.',
  district: 'Haridwar',
  locality: 'Roorkee bus stand',
});
test('an incomplete or unknown category cannot become a report', () => {
  assert.match(validateReport(emptyDraft())!, /category/);
  assert.throws(() => createReport({ ...valid(), category: 'Unknown department' }), /category/);
});
test('validation rejects whitespace-only details and missing location', () => {
  assert.ok(validateStep(1, { ...valid(), title: '     ' }));
  assert.ok(validateStep(1, { ...valid(), description: '                    ' }));
  assert.ok(validateStep(3, { ...valid(), district: ' ' }));
  assert.ok(validateStep(3, { ...valid(), locality: '' }));
});
test('optional evidence does not block a complete report', () => {
  const draft = valid();
  assert.equal(validateReport(draft), null);
  const report = createReport(draft);
  assert.equal(report.status, 'Saved locally');
  assert.match(report.id, /^LOCAL-/);
  assert.deepEqual(report.photos, []);
  assert.ok(!Number.isNaN(Date.parse(report.createdAt)));
});
test('saved reports trim inputs and do not share mutable photo arrays', () => {
  const draft = { ...valid(), title: '  Damaged road  ', photos: ['file:///photo.jpg'] };
  const report = createReport(draft);
  draft.photos.push('file:///second.jpg');
  assert.equal(report.title, 'Damaged road');
  assert.equal(report.photos.length, 1);
});
test('corrupted stored data is rejected before rendering', async () => {
  const { isDraft, isReport } = await import('../src/model.ts');
  assert.equal(isDraft({ ...emptyDraft(), title: 42 }), false);
  assert.equal(isDraft({ ...emptyDraft(), photos: [null] }), false);
  assert.equal(isReport({ ...valid(), id: 'OFFICIAL-1', createdAt: 'today', status: 'Resolved' }), false);
  assert.equal(isReport(createReport(valid())), true);
});
