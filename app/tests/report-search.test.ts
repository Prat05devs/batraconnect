import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createReport, type Report } from '../src/model.ts';
import { emptyPlanning, parsePlanning } from '../src/planning.ts';
import { filterReports } from '../src/report-search.ts';
const makeReport = (patch: Partial<Report> = {}) => ({
  ...createReport({
    category: 'Road & Transport',
    title: 'Crossing needs repair',
    description: 'The crossing near the public library needs repair.',
    photos: [],
    district: 'Haridwar',
    locality: 'Library road',
  }),
  ...patch,
});
test('My requests search combines text, district and category, and orders by date without mutating', () => {
  const reports = [
    makeReport({ id: 'LOCAL-A', createdAt: '2026-10-01T10:00:00Z' }),
    makeReport({ id: 'LOCAL-B', district: 'Dehradun', category: 'Other', createdAt: '2026-10-02T10:00:00Z' }),
  ];
  assert.deepEqual(
    filterReports(reports, 'library crossing', ' HARIDWAR ', 'Road & Transport').map(r => r.id),
    ['LOCAL-A'],
  );
  assert.deepEqual(
    filterReports(reports).map(r => r.id),
    ['LOCAL-B', 'LOCAL-A'],
  );
  assert.deepEqual(
    filterReports(reports, '', '', '', 'oldest').map(r => r.id),
    ['LOCAL-A', 'LOCAL-B'],
  );
  assert.deepEqual(filterReports(reports, 'impossible'), []);
  assert.equal(reports[0].id, 'LOCAL-A');
});
test('saved data from older app versions still loads; retired preview notes are dropped', () => {
  const legacy = { ...emptyPlanning(), bookmarks: ['transport'], staffNotes: [{ id: 'REVIEW-1' }] };
  const loaded = parsePlanning(JSON.stringify(legacy));
  assert.deepEqual(loaded.bookmarks, ['transport']);
  assert.equal('staffNotes' in loaded, false);
});
