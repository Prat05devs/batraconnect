import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyPlanning, parsePlanning } from '../src/planning.ts';
import { filterSchemes } from '../src/content/schemes.ts';
import { toggleSavedScheme, visibleSavedSchemes } from '../src/saved-schemes.ts';
test('saved schemes toggle without mutating input and survive storage round-trip', () => {
  const original: string[] = [];
  const saved = toggleSavedScheme(original, 'pm-kisan');
  assert.deepEqual(original, []);
  assert.deepEqual(saved, ['pm-kisan']);
  assert.deepEqual(
    parsePlanning(JSON.stringify({ ...emptyPlanning(), savedSchemes: saved })).savedSchemes,
    saved,
  );
  assert.deepEqual(toggleSavedScheme(saved, 'pm-kisan'), []);
  assert.throws(() => toggleSavedScheme(saved, 'unknown'), /unavailable/);
});
test('saved-only results combine search/category/scope and ignore unavailable catalogue entries', () => {
  const saved = ['pm-kisan', 'old-age-pension', 'retired-entry'];
  assert.deepEqual(
    visibleSavedSchemes(filterSchemes('किसान'), saved, true).map(s => s.id),
    ['pm-kisan'],
  );
  assert.deepEqual(visibleSavedSchemes(filterSchemes('pension', 'Pensions', 'Central'), saved, true), []);
  assert.equal(visibleSavedSchemes(filterSchemes(''), saved, true).length, 2);
  assert.deepEqual(visibleSavedSchemes(filterSchemes(''), [], false), filterSchemes(''));
});
test('legacy saved data gains an empty scheme list without losing notes or source bookmarks', () => {
  const old = { ...emptyPlanning(), bookmarks: ['transport'] } as Partial<ReturnType<typeof emptyPlanning>>;
  delete old.savedSchemes;
  const migrated = parsePlanning(JSON.stringify(old));
  assert.deepEqual(migrated.savedSchemes, []);
  assert.deepEqual(migrated.bookmarks, ['transport']);
  assert.deepEqual(
    parsePlanning(JSON.stringify({ ...emptyPlanning(), savedSchemes: ['pm-kisan', 'pm-kisan'] }))
      .savedSchemes,
    ['pm-kisan'],
  );
  for (const value of [null, [42], [' ']])
    assert.throws(() => parsePlanning(JSON.stringify({ ...emptyPlanning(), savedSchemes: value })));
});
