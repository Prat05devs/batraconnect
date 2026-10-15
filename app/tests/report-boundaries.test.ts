import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categories, createReport, emptyDraft, isReport, validateReport } from '../src/model.ts';
const valid = () => ({
  ...emptyDraft(),
  category: categories[0].name,
  title: 'Road crossing',
  description: 'Marked crossing needs repair near the library.',
  district: 'Haridwar',
  locality: 'Public library',
});

test('report limits are enforced by the model as well as the form', () => {
  for (const [field, limit] of [
    ['title', 100],
    ['description', 1000],
    ['district', 80],
    ['locality', 160],
  ] as const) {
    assert.equal(validateReport({ ...valid(), [field]: 'x'.repeat(limit) }), null);
    const oversized = { ...valid(), [field]: 'x'.repeat(limit + 1) };
    assert.ok(validateReport(oversized), `${field} must reject oversized input`);
    assert.throws(() => createReport(oversized));
  }
});

test('evidence supports zero through three photos and rejects over-limit or empty references', () => {
  for (let count = 0; count <= 3; count++)
    assert.equal(
      validateReport({
        ...valid(),
        photos: Array.from({ length: count }, (_, i) => `file:///test-${i}.jpg`),
      }),
      null,
    );
  assert.throws(() => createReport({ ...valid(), photos: ['a', 'b', 'c', 'd'] }));
  assert.throws(() => createReport({ ...valid(), photos: ['  '] }));
});

test('restored reports reject oversized data while valid Hindi text round-trips', () => {
  const report = createReport({
    ...valid(),
    title: 'सड़क की मरम्मत',
    description: 'पुस्तकालय के पास सड़क की मरम्मत की आवश्यकता है।',
    locality: 'पुस्तकालय के पास',
  });
  assert.equal(isReport(JSON.parse(JSON.stringify(report))), true);
  assert.equal(isReport({ ...report, description: 'x'.repeat(1001) }), false);
});
