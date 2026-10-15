import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { translate } from '../src/translations.ts';
import { createLanguagePreference, languageKey } from '../src/language-preference.ts';
import { hindiServices } from '../src/content/hindi-services.ts';
import { hindiSchemes } from '../src/content/hindi-schemes.ts';
import { serviceTasks, departmentGuides } from '../src/content/services.ts';
import { schemes } from '../src/content/schemes.ts';
test('every service and scheme has complete Hindi instructions without changing source data', () => {
  for (const task of serviceTasks) {
    const hindi = hindiServices[task.id];
    assert.ok(hindi, task.id);
    for (const key of ['title', 'summary', 'audience', 'note'] as const)
      assert.match(translate(task[key], 'hi'), /[\u0900-\u097f]/, `${task.id}.${key}`);
    for (const key of ['documents', 'steps'] as const) {
      assert.equal(hindi[key].length, task[key].length);
      for (const text of task[key]) assert.match(translate(text, 'hi'), /[\u0900-\u097f]/);
    }
    if (task.transaction) {
      assert.match(translate(task.transaction.label, 'hi'), /[\u0900-\u097f]/);
      assert.equal(translate(task.transaction.url, 'hi'), task.transaction.url);
    }
  }
  for (const department of Object.values(departmentGuides)) {
    assert.match(translate(department.overview, 'hi'), /[\u0900-\u097f]/);
    for (const fact of department.facts) assert.match(translate(fact, 'hi'), /[\u0900-\u097f]/);
  }
  for (const scheme of schemes) {
    const hindi = hindiSchemes[scheme.id];
    assert.ok(hindi, scheme.id);
    assert.equal(translate(scheme.name, 'hi'), scheme.hindiName);
    for (const key of ['summary', 'benefit', 'howToApply'] as const)
      assert.match(translate(scheme[key], 'hi'), /[\u0900-\u097f]/);
    for (const key of ['eligibility', 'documents'] as const) {
      assert.equal(hindi[key].length, scheme[key].length);
      for (const text of scheme[key]) assert.match(translate(text, 'hi'), /[\u0900-\u097f]/);
    }
    if (scheme.documentsNote) assert.match(translate(scheme.documentsNote, 'hi'), /[\u0900-\u097f]/);
  }
});
test('screen prose has a Hindi translation; proper names and user values remain stable', () => {
  const retained = new Set(['Batra', 'Connect', 'IST']);
  for (const file of [
    'screens.tsx',
    'ReportScreen.tsx',
    'PlanningScreens.tsx',
    'SchemeScreens.tsx',
    'ServiceScreens.tsx',
  ]) {
    const code = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node: ts.Node) {
      if (ts.isJsxText(node)) {
        // Same rule JSX uses at runtime: each line trimmed, blank lines dropped, lines joined with one space.
        const text = node.text.split('\n').map(line => line.trim()).filter(Boolean).join(' ');
        if (/[A-Za-z]/.test(text) && !retained.has(text))
          assert.notEqual(translate(text, 'hi'), text, `${file}: ${text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.equal(translate('LOCAL-ABC123', 'hi'), 'LOCAL-ABC123');
  assert.equal(translate('आरसी पता', 'en'), 'आरसी पता');
  assert.equal(translate('__proto__', 'hi'), '__proto__');
  assert.equal(translate('Report a problem', 'en'), 'Report a problem');
  assert.equal(translate('2 locally saved requests', 'hi'), '2 स्थानीय रूप से सहेजी रिपोर्ट');
});
test('a manual language change wins over a slow stored preference load', async () => {
  let finish!: (value: string) => void;
  const seen: string[] = [];
  const controller = createLanguagePreference(
    {
      getItem: () =>
        new Promise(resolve => {
          finish = resolve;
        }),
      setItem: async () => {},
    },
    value => seen.push(value),
    () => {},
  );
  const load = controller.hydrate();
  await controller.select('hi');
  finish('en');
  await load;
  assert.deepEqual(seen, ['hi']);
});
test('rapid switches persist in order and restart restores the last selection', async () => {
  const writes: string[] = [];
  let stored: string | null = null;
  const storage = {
    getItem: async () => stored,
    setItem: async (key: string, value: string) => {
      assert.equal(key, languageKey);
      writes.push(value);
      stored = value;
    },
  };
  const controller = createLanguagePreference(
    storage,
    () => {},
    () => {},
  );
  void controller.select('hi');
  await controller.select('en');
  assert.deepEqual(writes, ['hi', 'en']);
  let restored = '';
  await createLanguagePreference(
    storage,
    value => {
      restored = value;
    },
    () => {},
  ).hydrate();
  assert.equal(restored, 'en');
});
test('storage failure keeps session language and a later switch recovers', async () => {
  const seen: string[] = [];
  const errors: boolean[] = [];
  let fail = true;
  const controller = createLanguagePreference(
    {
      getItem: async () => null,
      setItem: async () => {
        if (fail) throw Error('disk');
      },
    },
    value => seen.push(value),
    error => errors.push(error),
  );
  await controller.select('hi');
  fail = false;
  await controller.select('en');
  assert.deepEqual(seen, ['hi', 'en']);
  assert.deepEqual(errors, [true, false]);
});
test('invalid preference and unmounted loads do not update the screen', async () => {
  const seen: string[] = [];
  const controller = createLanguagePreference(
    { getItem: async () => 'other', setItem: async () => {} },
    value => seen.push(value),
    () => {},
  );
  await controller.hydrate();
  controller.dispose();
  await controller.select('hi');
  assert.equal(seen.length, 0);
  let finish!: (value: string) => void;
  const loading = createLanguagePreference(
    {
      getItem: () =>
        new Promise(resolve => {
          finish = resolve;
        }),
      setItem: async () => {},
    },
    value => seen.push(value),
    () => {},
  );
  const hydrate = loading.hydrate();
  loading.dispose();
  finish('hi');
  await hydrate;
  assert.equal(seen.length, 0);
});
test('every stored category has a translated display label while retaining canonical values', async () => {
  const { categories } = await import('../src/model.ts');
  const { ideaCategories } = await import('../src/planning.ts');
  for (const text of [
    ...categories.flatMap(category => [category.name, category.detail]),
    ...ideaCategories,
  ]) {
    assert.match(translate(text, 'hi'), /[\u0900-\u097f]/, text);
    assert.equal(translate(text, 'en'), text);
  }
});

test('dynamic progress, filters and evidence labels translate in Hindi', () => {
  for (const text of [
    'STEP 1 OF 5',
    'Filter: All',
    'Evidence photo 1',
    'Report evidence 2',
    'Remove photo 3',
    '1 local report',
    '3 local reports',
    'completed',
    'current step',
    'upcoming',
  ]) {
    assert.match(translate(text, 'hi'), /[\u0900-\u097f]/, text);
    assert.equal(translate(text, 'en'), text);
  }
  assert.equal(translate('Remove photo 3', 'hi'), 'फोटो हटाएँ 3');
  assert.equal(translate('STEP 1 OF 5', 'hi'), 'चरण 1 / 5');
});
