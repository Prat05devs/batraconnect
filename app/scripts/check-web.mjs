import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWebPreview } from './web-preview.mjs';

const app = fileURLToPath(new URL('../', import.meta.url));
const directory = resolve(app, process.env.BATRA_WEB_BUILD_DIR ?? '.web-test-build');
if (!process.argv.includes('--skip-export')) {
  const result = spawnSync(process.execPath, [resolve(app, 'node_modules/expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', directory], { cwd: app, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const server = createWebPreview(directory);
await new Promise((resolveReady, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveReady); });
const base = `http://127.0.0.1:${server.address().port}`;
const evidence = { checkedAt: new Date().toISOString(), layer: 'HTTP export smoke; does not execute app JavaScript', routes: [], scripts: [] };
try {
  let index;
  for (const route of ['/achievements', '/roorkee', '/ministries', '/projects', '/gallery', '/gallery/24', '/gallery/44', '/', '/schemes', '/scheme/pm-kisan', '/requests', '/request/LOCAL-TEST', '/profile', '/ideas', '/meeting/new', '/services', '/service/transport', '/service/task/learner-licence', '/service/biotechnology', '/service/task/biotech-training', '/sign-in', '/forgot-password', '/verify', '/account', '/notification-settings', '/submitted', '/updates', '/submitted-ideas', '/appointments', '/appointments/book', '/appointments/slots', '/admin', '/admin/users', '/admin/audit', '/admin/categories', '/admin/wards', '/admin/offices', '/admin/content', '/insights', '/workspace']) {
    const response = await fetch(`${base}${route}`, { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200, route); assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    const html = await response.text(); assert.match(html, /id="root"/); assert.match(html, /Batra Connect/);
    index ??= html; evidence.routes.push(route);
  }
  const scripts = [...index.matchAll(/<script[^>]*src="([^"]+)"/g)].map(match => match[1]);
  assert.ok(scripts.length > 0, 'Export must reference a JavaScript bundle');
  for (const source of scripts) {
    const url = new URL(source, base); assert.equal(url.origin, base, 'Bundle must be local to the export');
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200, source); assert.match(response.headers.get('content-type') ?? '', /javascript/);
    assert.ok((await response.arrayBuffer()).byteLength > 0, 'Bundle must not be empty'); evidence.scripts.push(source);
  }
  const missing = await fetch(`${base}/_expo/missing-bundle.js`); assert.equal(missing.status, 404);
  await mkdir(resolve(app, 'test-results'), { recursive: true });
  await writeFile(resolve(app, 'test-results/web-smoke.json'), JSON.stringify({ ...evidence, passed: true }, null, 2));
  console.log(`HTTP smoke passed: ${evidence.routes.length} route shells, ${scripts.length} bundle(s), missing asset returns 404. Browser rendering remains a separate check.`);
} finally { await new Promise(resolveClosed => server.close(resolveClosed)); }
