import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../src/db.js';
import { fixture, password, report, png } from './helpers.js';
test('registration cannot grant roles; credentials, CORS, logout and expiry are enforced', async t => {
  const f = await fixture(t);
  assert.equal(
    (
      await f.request('POST', '/api/v1/auth/register', {
        name: 'Intruder',
        email: 'intruder@test.invalid',
        password,
        role: 'admin',
      })
    ).status,
    400,
  );
  const a = await f.register();
  assert.equal(a.user.role, 'citizen');
  assert.ok(!('password_hash' in a.user));
  assert.equal(
    (await f.request('POST', '/api/v1/auth/login', { email: a.user.email, password: 'wrong-password' }))
      .status,
    401,
  );
  assert.equal(
    (await f.request('GET', '/api/v1/auth/me', null, a.token, { Origin: 'http://evil.test' })).status,
    403,
  );
  assert.equal((await f.request('POST', '/api/v1/auth/logout', null, a.token)).status, 204);
  assert.equal((await f.request('GET', '/api/v1/auth/me', null, a.token)).status, 401);
  const b = await f.register('second@test.invalid');
  await f.db.query("UPDATE sessions SET expires_at='2000-01-01T00:00:00.000Z' WHERE user_id=?", [b.user.id]);
  assert.equal((await f.request('GET', '/api/v1/auth/me', null, b.token)).status, 401);
});
test('reports are private, validated, paginated and idempotent under concurrent retries', async t => {
  const f = await fixture(t),
    a = await f.register(),
    b = await f.register('other@test.invalid');
  assert.equal((await f.request('POST', '/api/v1/complaints', report)).status, 401);
  assert.equal(
    (
      await f.request('POST', '/api/v1/complaints', { ...report, status: 'Resolved' }, a.token, {
        'Idempotency-Key': randomUUID(),
      })
    ).status,
    400,
  );
  const key = randomUUID();
  const [first, retry] = await Promise.all([
    f.request('POST', '/api/v1/complaints', report, a.token, { 'Idempotency-Key': key }),
    f.request('POST', '/api/v1/complaints', report, a.token, { 'Idempotency-Key': key }),
  ]);
  assert.deepEqual([first.status, retry.status].sort(), [200, 201]);
  const c = first.data.complaint;
  assert.equal(c.id, retry.data.complaint.id);
  assert.match(c.reference, /^BC-/);
  assert.equal(c.events.length, 1);
  assert.equal(
    (
      await f.request('POST', '/api/v1/complaints', { ...report, title: 'Different road problem' }, a.token, {
        'Idempotency-Key': key,
      })
    ).status,
    409,
  );
  assert.equal((await f.request('GET', `/api/v1/complaints/${c.id}`, null, b.token)).status, 404);
  assert.equal((await f.request('GET', '/api/v1/complaints', null, b.token)).data.total, 0);
  assert.equal((await f.request('GET', '/api/v1/complaints?limit=1', null, a.token)).data.total, 1);
  assert.equal((await f.request('GET', '/api/v1/complaints?limit=1.5', null, a.token)).status, 400);
});
test('private uploads reject non-images and cannot be stolen or rebound', async t => {
  const f = await fixture(t),
    a = await f.register(),
    b = await f.register('other@test.invalid');
  const invalid = new FormData();
  invalid.append('photo', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'bad.png');
  assert.equal((await f.request('POST', '/api/v1/media', invalid, a.token)).status, 400);
  const form = new FormData();
  form.append('photo', new Blob([png], { type: 'image/png' }), 'photo.png');
  const media = (await f.request('POST', '/api/v1/media', form, a.token)).data.media;
  assert.equal((await f.request('GET', `/api/v1/media/${media.id}`, null, b.token)).status, 404);
  assert.equal(
    (
      await f.request('POST', '/api/v1/complaints', { ...report, mediaIds: [media.id] }, b.token, {
        'Idempotency-Key': randomUUID(),
      })
    ).status,
    400,
  );
  const c = await f.request('POST', '/api/v1/complaints', { ...report, mediaIds: [media.id] }, a.token, {
    'Idempotency-Key': randomUUID(),
  });
  assert.equal(c.status, 201);
  assert.equal(c.data.complaint.media[0].id, media.id);
  assert.equal(
    (
      await f.request('POST', '/api/v1/complaints', { ...report, mediaIds: [media.id] }, a.token, {
        'Idempotency-Key': randomUUID(),
      })
    ).status,
    400,
  );
});
test('staff scopes, stale writes, resolution review and notifications follow the workflow', async t => {
  const f = await fixture(t),
    citizen = await f.register(),
    department = await f.staff('department'),
    field = await f.staff('field'),
    foreign = await f.staff('department', 'dehradun'),
    foreignField = await f.staff('field', 'dehradun'),
    executive = await f.staff('executive');
  let c = (
    await f.request('POST', '/api/v1/complaints', report, citizen.token, { 'Idempotency-Key': randomUUID() })
  ).data.complaint;
  assert.equal((await f.request('GET', `/api/v1/complaints/${c.id}`, null, field.token)).status, 404);
  assert.equal((await f.request('GET', `/api/v1/complaints/${c.id}`, null, foreign.token)).status, 404);
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/complaints/${c.id}/assign`,
        { assigneeId: field.id, version: 1, note: 'Inspect the damaged road.' },
        citizen.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/complaints/${c.id}/assign`,
        { assigneeId: foreignField.id, version: 1, note: 'Inspect the damaged road.' },
        department.token,
      )
    ).status,
    400,
  );
  c = (
    await f.request(
      'POST',
      `/api/v1/complaints/${c.id}/assign`,
      { assigneeId: field.id, version: 1, note: 'Inspect the damaged road.' },
      department.token,
    )
  ).data.complaint;
  assert.equal(c.version, 2);
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/complaints/${c.id}/status`,
        { status: 'In progress', version: 2, note: 'Inspection has started.' },
        executive.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/complaints/${c.id}/status`,
        { status: 'In progress', version: 1, note: 'Inspection has started.' },
        field.token,
      )
    ).status,
    409,
  );
  c = (
    await f.request(
      'POST',
      `/api/v1/complaints/${c.id}/status`,
      { status: 'In progress', version: 2, note: 'Inspection has started.' },
      field.token,
    )
  ).data.complaint;
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/complaints/${c.id}/status`,
        { status: 'Resolved', version: 3, note: 'The pothole has been repaired.' },
        field.token,
      )
    ).data.error.code,
    'EVIDENCE_REQUIRED',
  );
  const closure = await f.photo(field.token);
  c = (
    await f.request(
      'POST',
      `/api/v1/complaints/${c.id}/status`,
      { status: 'Resolved', version: 3, note: 'The pothole has been repaired.', mediaIds: [closure.id] },
      field.token,
    )
  ).data.complaint;
  assert.equal(c.media.find(m => m.id === closure.id).purpose, 'resolution');
  assert.ok(c.resolvedAt);
  assert.equal(c.events.length, 4);
  c = (
    await f.request(
      'POST',
      `/api/v1/complaints/${c.id}/status`,
      { status: 'Reopened', version: 4, note: 'The repair has failed again.' },
      citizen.token,
    )
  ).data.complaint;
  assert.equal(c.status, 'Reopened');
  assert.equal(c.events.length, 5);
  const n = (await f.request('GET', '/api/v1/notifications', null, citizen.token)).data.notifications;
  assert.equal(n.length, 4);
  assert.equal(
    (await f.request('POST', `/api/v1/notifications/${n[0].id}/read`, null, field.token)).status,
    404,
  );
  assert.equal((await f.request('GET', '/api/v1/insights', null, citizen.token)).status, 403);
  assert.equal(
    (await f.request('GET', '/api/v1/insights', null, department.token)).data.byStatus[0].count,
    1,
  );
});
test('PostgreSQL records remain after a new connection pool is opened', async t => {
  const f = await fixture(t);
  const citizen = await f.register();
  const reopened = await createDatabase({ url: f.url });
  try {
    const rows = await reopened.query('SELECT id,email FROM users WHERE id=?', [citizen.user.id]);
    assert.equal(rows[0].email, 'citizen@test.invalid');
  } finally {
    await reopened.close();
  }
});
