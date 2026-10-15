import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { guideTopics, officialSources } from '../src/content/catalog.ts';

test('every discovery journey and bilingual guide action resolves to an existing route', () => {
  const routes = [
    ...guideTopics.flatMap(t => [t.action?.en.route, t.action?.hi.route]).filter(Boolean),
  ] as string[];
  for (const route of routes) {
    const name = route.slice(1);
    assert.ok(
      [
        `../src/app/${name}.tsx`,
        ...(name.startsWith('service/') ? ['../src/app/service/[id].tsx'] : []),
        `../src/app/${name}/index.tsx`,
        `../src/app/(tabs)/${name}.tsx`,
      ].some(path => existsSync(new URL(path, import.meta.url))),
      `Missing destination: ${route}`,
    );
  }
  for (const topic of guideTopics) {
    assert.ok(topic.question.en && topic.question.hi && topic.answer.en && topic.answer.hi);
    if (topic.action) {
      assert.equal(topic.action.en.route, topic.action.hi.route);
      assert.equal(topic.action.en.url, topic.action.hi.url);
    }
  }
});

test('shared source identities are unique and links use approved government/institution hosts', () => {
  assert.equal(new Set(officialSources.map(s => s.id)).size, officialSources.length);
  const hosts = new Set(['transport.uk.gov.in', 'it.uk.gov.in', 'ucb.ac.in', 'cm.uk.gov.in']);
  for (const source of officialSources) {
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(hosts.has(url.hostname));
    assert.equal(url.username, '');
    assert.equal(url.password, '');
  }
});
