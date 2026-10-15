import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterSchemes, getScheme, schemes } from '../src/content/schemes.ts';
test('scheme discovery supports Hindi, aliases and combined category/scope filters', () => {
  assert.deepEqual(
    filterSchemes('किसान').map(s => s.id),
    ['pm-kisan'],
  );
  assert.deepEqual(
    filterSchemes('MSY').map(s => s.id),
    ['msy-2'],
  );
  assert.deepEqual(
    filterSchemes('OLD pension', 'Pensions', 'Uttarakhand').map(s => s.id),
    ['old-age-pension'],
  );
  assert.equal(filterSchemes('pension', 'Agriculture').length, 0);
  assert.equal(filterSchemes('', 'All', 'Central').length, 1);
  assert.deepEqual(filterSchemes('   '), schemes);
});
test('unknown queries and missing routes have safe empty results', () => {
  assert.deepEqual(filterSchemes('quantum pineapple'), []);
  assert.equal(getScheme('missing-scheme'), undefined);
});
test('each entry has unique identity, reviewed provenance and government links', () => {
  assert.equal(new Set(schemes.map(s => s.id)).size, schemes.length);
  for (const scheme of schemes) {
    assert.ok(scheme.source.publisher && scheme.source.title);
    assert.match(scheme.source.checkedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(scheme.eligibility.length);
    assert.ok(scheme.documents.length || scheme.documentsNote);
    for (const link of [scheme.source.url, scheme.application?.url].filter(Boolean) as string[]) {
      const url = new URL(link);
      assert.equal(url.protocol, 'https:');
      assert.ok(url.hostname.endsWith('.gov.in') || url.hostname.endsWith('.nic.in'));
    }
  }
});
test('incomplete sources and unconfirmed application destinations remain explicit', () => {
  assert.match(getScheme('widow-pension')!.benefit, /does not state an amount/);
  assert.equal(getScheme('mahalakshmi-kit')!.application, undefined);
  assert.match(getScheme('mahalakshmi-kit')!.documentsNote!, /does not publish/);
  assert.equal(getScheme('msy-2')!.application, undefined);
  assert.match(getScheme('msy-2')!.howToApply, /District Industries Centre/);
  assert.match(getScheme('msy-2')!.benefit, /not a guaranteed cash grant/);
  assert.match(getScheme('pm-kisan')!.application!.verificationNote!, /not confirmed/);
});
