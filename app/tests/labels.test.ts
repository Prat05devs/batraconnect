import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { ApiError } from '../src/api-client.ts';
import { errorCodes, errorText, statusLabel } from '../src/labels.ts';
test('every error code the backend can return has a Hindi message', () => {
  const dir = new URL('../../backend/src/', import.meta.url);
  const files = [
    ...readdirSync(dir)
      .filter(f => f.endsWith('.js'))
      .map(f => new URL(f, dir)),
    ...readdirSync(new URL('routes/', dir)).map(f => new URL(`routes/${f}`, dir)),
  ];
  const codes = new Set(
    files.flatMap(f =>
      [...readFileSync(f, 'utf8').matchAll(/\b[1-5]\d\d\s*,\s*'([A-Z][A-Z_]{3,})'/g)].map(m => m[1]),
    ),
  );
  assert.ok(codes.size > 40, `found ${codes.size} codes`);
  for (const code of codes) assert.ok(errorCodes.includes(code), `missing Hindi for ${code}`);
  assert.match(errorText(new ApiError('Choose an available ward.', 400, 'INVALID_WARD'), 'hi'), /[ऀ-ॿ]/);
  assert.equal(
    errorText(new ApiError('Choose an available ward.', 400, 'INVALID_WARD'), 'en'),
    'Choose an available ward.',
  );
  for (const s of [
    'Submitted',
    'Assigned',
    'In progress',
    'Resolved',
    'Closed',
    'Reopened',
    'Requested',
    'Confirmed',
  ])
    assert.match(statusLabel(s, 'hi'), /[ऀ-ॿ]/);
});
