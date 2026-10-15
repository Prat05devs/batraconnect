import assert from 'node:assert/strict';
import { test } from 'node:test';
import { officialSources } from '../src/content/catalog.ts';
import {
  departmentGuides,
  reviewedOn,
  searchDepartments,
  searchServiceTasks,
  serviceTasks,
} from '../src/content/services.ts';
test('every department and task has offline content and provenance', () => {
  assert.equal(reviewedOn, '2026-10-08');
  assert.equal(new Set(serviceTasks.map(t => t.id)).size, serviceTasks.length);
  for (const source of officialSources) assert.ok(departmentGuides[source.id]?.overview);
  for (const task of serviceTasks) {
    assert.ok(officialSources.some(s => s.id === task.department));
    assert.ok(task.audience && task.documents.length && task.steps.length >= 3 && task.note);
    assert.ok(task.references.length);
    for (const reference of task.references) {
      assert.ok(reference.title && reference.publisher);
      assert.equal(new URL(reference.url).protocol, 'https:');
    }
  }
});
test('task search discovers departments and preserves saved-only filtering', () => {
  assert.deepEqual(
    searchDepartments('learner', false, [], officialSources).map(s => s.id),
    ['transport'],
  );
  assert.deepEqual(
    searchDepartments('apuni', false, [], officialSources).map(s => s.id),
    ['it'],
  );
  assert.deepEqual(searchDepartments('learner', true, ['it'], officialSources), []);
  assert.equal(searchDepartments('  ', true, ['science'], officialSources)[0].id, 'science');
});
test('external actions are transactions or application forms on official hosts', () => {
  const hosts = new Set([
    'sarathi.parivahan.gov.in',
    'vahan.parivahan.gov.in',
    'eservices.uk.gov.in',
    'cmhelpline.uk.gov.in',
    'ucb.ac.in',
  ]);
  for (const task of serviceTasks)
    if (task.transaction) {
      const url = new URL(task.transaction.url);
      assert.equal(url.protocol, 'https:');
      assert.ok(hosts.has(url.hostname));
      assert.ok(['application', 'form', 'grievance'].includes(task.transaction.kind));
      assert.doesNotMatch(task.transaction.label, /open official website/i);
    }
  assert.equal(serviceTasks.find(t => t.id === 'science-programmes')?.transaction, undefined);
});
test('uncertain admissions and address information remain explicit and local reports are not official grievances', () => {
  assert.match(serviceTasks.find(t => t.id === 'biotech-training')!.note, /263145.*263146/);
  assert.match(serviceTasks.find(t => t.id === 'biotech-training')!.note, /availability is not verified/);
  assert.match(serviceTasks.find(t => t.id === 'cm-helpline')!.note, /not registered/);
});
test('new vehicle guides keep the published document distinctions', () => {
  assert.match(serviceTasks.find(task => task.id === 'duplicate-rc')!.documents.join(' '), /Form 26.*FIR/);
  assert.match(serviceTasks.find(task => task.id === 'rc-address')!.documents.join(' '), /Form 33/);
  for (const id of ['science-enterprise', 'science-travel']) {
    assert.equal(serviceTasks.find(task => task.id === id)!.transaction, undefined);
    assert.match(serviceTasks.find(task => task.id === id)!.note, /not.*verified|No active.*verified/);
  }
});

test('Hindi aliases and document searches return the task directly and respect bookmarks', () => {
  assert.deepEqual(
    searchServiceTasks('खोई आरसी', false, []).map(task => task.id),
    ['duplicate-rc'],
  );
  assert.deepEqual(
    searchServiceTasks('Form 33', false, []).map(task => task.id),
    ['rc-address'],
  );
  assert.deepEqual(
    searchServiceTasks('यात्रा अनुदान', false, []).map(task => task.id),
    ['science-travel'],
  );
  assert.deepEqual(searchServiceTasks('खोई आरसी', true, ['science']), []);
  assert.equal(searchServiceTasks('Form 33', true, ['transport'])[0].id, 'rc-address');
});
