import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWebPreview } from '../scripts/web-preview.mjs';

test('web export harness serves nested route shells, real assets and HEAD without masking missing bundles', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'batra-web-fixture-'));
  const server = createWebPreview(directory);
  try {
    await writeFile(join(directory, 'index.html'), '<div id="root">Batra Connect</div>');
    await writeFile(join(directory, 'entry.js'), '/* fixture */');
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const nested = await fetch(`${base}/scheme/pm-kisan?view=saved`);
    assert.equal(nested.status, 200);
    assert.match(await nested.text(), /Batra Connect/);
    const asset = await fetch(`${base}/entry.js`);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('content-type'), /javascript/);
    assert.equal((await fetch(`${base}/missing.js`)).status, 404);
    const head = await fetch(`${base}/entry.js`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    assert.equal((await fetch(`${base}/entry.js`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${base}/%2e%2e%2foutside.txt`)).status, 400);
    assert.equal((await fetch(`${base}/%ZZ`)).status, 400);
  } finally {
    if (server.listening) await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
