import assert from 'node:assert/strict';
import { test } from 'node:test';
import { webcrypto } from 'node:crypto';
import { createEncryptedStorage, isSealed } from '../src/encrypted-storage.ts';
async function aes() {
  const key = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  return {
    encrypt: async (text: string) => {
      const iv = webcrypto.getRandomValues(new Uint8Array(12));
      const sealed = new Uint8Array(
        await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)),
      );
      return Buffer.concat([iv, sealed]).toString('base64');
    },
    decrypt: async (b64: string) => {
      const bytes = Buffer.from(b64, 'base64');
      return new TextDecoder().decode(
        await webcrypto.subtle.decrypt(
          { name: 'AES-GCM', iv: bytes.subarray(0, 12) },
          key,
          bytes.subarray(12),
        ),
      );
    },
  };
}
test('values are sealed at rest, round-trip, and older plaintext snapshots remain readable', async () => {
  const raw = new Map<string, string>();
  const base = {
    getItem: async (k: string) => raw.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      raw.set(k, v);
    },
    removeItem: async (k: string) => {
      raw.delete(k);
    },
  };
  const storage = createEncryptedStorage(base, await aes());
  const secret = JSON.stringify({ draft: { title: 'Broken pipe near 12 Civil Lines' } });
  await storage.setItem('reports', secret);
  assert.ok(isSealed(raw.get('reports')!));
  assert.ok(!raw.get('reports')!.includes('Civil Lines'));
  assert.equal(await storage.getItem('reports'), secret);
  raw.set('legacy', '{"reports":[]}');
  assert.equal(await storage.getItem('legacy'), '{"reports":[]}');
  assert.equal(await storage.getItem('missing'), null);
  raw.set('tampered', raw.get('reports')!.slice(0, -4) + 'AAAA');
  await assert.rejects(() => storage.getItem('tampered'));
  const other = createEncryptedStorage(base, await aes());
  await assert.rejects(() => other.getItem('reports'), 'another key cannot read');
});
