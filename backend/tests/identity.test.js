import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, password, report } from './helpers.js';
import { randomUUID } from 'node:crypto';

test('with REQUIRE_VERIFIED_CONTACT off, /config says so and unverified citizens can submit', async t => {
  const strict = await fixture(t);
  const on = (await strict.request('GET', '/api/v1/config')).data;
  assert.equal(on.verificationRequired, true);
  assert.equal(on.email, true, 'testing delivers codes');
  const f = await fixture(t, { requireVerified: false });
  assert.equal((await f.request('GET', '/api/v1/config')).data.verificationRequired, false);
  const a = await f.register('open@test.invalid', { verified: false });
  const sent = await f.request('POST', '/api/v1/complaints', report, a.token, {
    'Idempotency-Key': randomUUID(),
  });
  assert.equal(sent.status, 201);
});

test('unverified citizens cannot submit; codes verify once, expire on misuse and are delivered then scrubbed', async t => {
  const f = await fixture(t);
  const a = await f.register('new@test.invalid', { verified: false });
  assert.equal(a.user.emailVerified, false);
  const blocked = await f.request('POST', '/api/v1/complaints', report, a.token, {
    'Idempotency-Key': randomUUID(),
  });
  assert.equal(blocked.data.error.code, 'VERIFICATION_REQUIRED');
  const code = await f.lastCode('new@test.invalid');
  assert.match(code, /^\d{6}$/);
  const wrong = code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await f.request('POST', '/api/v1/auth/verify/confirm', { channel: 'email', code: wrong }, a.token))
        .data.error.code,
      'INVALID_CODE',
    );
  assert.equal(
    (await f.request('POST', '/api/v1/auth/verify/confirm', { channel: 'email', code }, a.token)).status,
    400,
    'locked after five failures',
  );
  assert.equal(
    (await f.request('POST', '/api/v1/auth/verify/request', { channel: 'email' }, a.token)).status,
    202,
  );
  const fresh = await f.lastCode('new@test.invalid');
  const ok = await f.request(
    'POST',
    '/api/v1/auth/verify/confirm',
    { channel: 'email', code: fresh },
    a.token,
  );
  assert.equal(ok.data.user.emailVerified, true);
  assert.equal(
    (await f.request('POST', '/api/v1/auth/verify/confirm', { channel: 'email', code: fresh }, a.token))
      .status,
    400,
    'single use',
  );
  assert.equal(
    (await f.request('POST', '/api/v1/complaints', report, a.token, { 'Idempotency-Key': randomUUID() }))
      .status,
    201,
  );
  await f.jobs.runAll();
  assert.ok(
    f.sent.some(m => m.channel === 'email' && m.destination === 'new@test.invalid' && m.body.includes(fresh)),
  );
  const [stored] = await f.db.query(
    `SELECT body,status FROM outbox WHERE destination='new@test.invalid' AND sensitive ORDER BY created_at DESC LIMIT 1`,
  );
  assert.equal(stored.status, 'sent');
  assert.equal(stored.body, null);
});
test('password reset never reveals accounts, revokes sessions and replaces the password', async t => {
  const f = await fixture(t);
  const a = await f.register();
  const unknown = await f.request('POST', '/api/v1/auth/password/forgot', { email: 'nobody@test.invalid' });
  const known = await f.request('POST', '/api/v1/auth/password/forgot', { email: a.user.email });
  assert.equal(unknown.status, 202);
  assert.deepEqual(unknown.data, known.data);
  assert.equal(
    (
      await f.request('POST', '/api/v1/auth/password/reset', {
        email: 'nobody@test.invalid',
        code: '123456',
        password: 'Another-long-password-1',
      })
    ).status,
    400,
  );
  const code = await f.lastCode(a.user.email);
  const reset = await f.request('POST', '/api/v1/auth/password/reset', {
    email: a.user.email,
    code,
    password: 'Another-long-password-1',
  });
  assert.equal(reset.status, 200);
  assert.ok(reset.data.token);
  assert.equal((await f.request('GET', '/api/v1/auth/me', null, a.token)).status, 401);
  assert.equal(
    (await f.request('POST', '/api/v1/auth/login', { email: a.user.email, password })).status,
    401,
  );
  assert.equal(
    (
      await f.request('POST', '/api/v1/auth/login', {
        email: a.user.email,
        password: 'Another-long-password-1',
      })
    ).status,
    200,
  );
});
test('mobile number verification enables OTP sign-in; email OTP works for verified email', async t => {
  const f = await fixture(t);
  const a = await f.register();
  assert.equal(
    (await f.request('POST', '/api/v1/auth/verify/request', { channel: 'phone' }, a.token)).data.error.code,
    'PHONE_REQUIRED',
  );
  assert.equal(
    (
      await f.request(
        'PATCH',
        '/api/v1/account',
        { phone: '+919876543210', name: 'Renamed Citizen', language: 'hi' },
        a.token,
      )
    ).data.user.phoneVerified,
    false,
  );
  assert.equal(
    (await f.request('POST', '/api/v1/auth/otp/request', { destination: '+919876543210' })).status,
    202,
  );
  assert.equal(await f.lastCode('+919876543210'), undefined, 'no login code for an unverified number');
  await f.request('POST', '/api/v1/auth/verify/request', { channel: 'phone' }, a.token);
  const phoneCode = await f.lastCode('+919876543210');
  const verified = (
    await f.request('POST', '/api/v1/auth/verify/confirm', { channel: 'phone', code: phoneCode }, a.token)
  ).data.user;
  assert.equal(verified.phoneVerified, true);
  assert.equal(verified.language, 'hi');
  assert.equal(verified.name, 'Renamed Citizen');
  await f.request('POST', '/api/v1/auth/otp/request', { destination: '+919876543210' });
  const login = await f.lastCode('+919876543210');
  assert.notEqual(login, phoneCode);
  const session = await f.request('POST', '/api/v1/auth/otp/verify', {
    destination: '+919876543210',
    code: login,
  });
  assert.equal(session.status, 200);
  assert.equal(session.data.user.id, a.user.id);
  await f.request('POST', '/api/v1/auth/otp/request', { destination: a.user.email });
  const emailLogin = await f.lastCode(a.user.email);
  assert.equal(
    (await f.request('POST', '/api/v1/auth/otp/verify', { destination: a.user.email, code: emailLogin }))
      .status,
    200,
  );
  const b = await f.register('b@test.invalid');
  assert.equal(
    (await f.request('PATCH', '/api/v1/account', { phone: '+919876543210' }, b.token)).data.error.code,
    'PHONE_EXISTS',
  );
});
test('sessions can be listed and revoked; password change keeps only the current device', async t => {
  const f = await fixture(t);
  const a = await f.register();
  const other = (await f.request('POST', '/api/v1/auth/login', { email: a.user.email, password })).data;
  const list = (await f.request('GET', '/api/v1/account/sessions', null, a.token)).data.sessions;
  assert.equal(list.length, 2);
  assert.equal(list.filter(s => s.current).length, 1);
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/account/password',
        { currentPassword: 'wrong', newPassword: 'Another-long-password-1' },
        a.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/account/password',
        { currentPassword: password, newPassword: 'Another-long-password-1' },
        a.token,
      )
    ).status,
    204,
  );
  assert.equal((await f.request('GET', '/api/v1/auth/me', null, other.token)).status, 401);
  assert.equal((await f.request('GET', '/api/v1/auth/me', null, a.token)).status, 200);
  const third = (
    await f.request('POST', '/api/v1/auth/login', {
      email: a.user.email,
      password: 'Another-long-password-1',
    })
  ).data;
  await f.request('POST', '/api/v1/account/sessions/revoke-others', null, third.token);
  assert.equal((await f.request('GET', '/api/v1/auth/me', null, a.token)).status, 401);
});
test('account export contains the owner data; deletion anonymises and blocks sign-in; staff cannot self-delete', async t => {
  const f = await fixture(t);
  const a = await f.register();
  await f.submit(a.token);
  const exported = await f.request('GET', '/api/v1/account/export', null, a.token);
  assert.equal(exported.data.complaints.length, 1);
  assert.match(exported.headers.get('content-disposition'), /attachment/);
  assert.equal(
    (await f.request('DELETE', '/api/v1/account', { password, confirm: 'DELETE'.toLowerCase() }, a.token))
      .status,
    400,
  );
  assert.equal(
    (await f.request('DELETE', '/api/v1/account', { password: 'wrong', confirm: 'DELETE' }, a.token)).status,
    403,
  );
  assert.equal(
    (await f.request('DELETE', '/api/v1/account', { password, confirm: 'DELETE' }, a.token)).status,
    204,
  );
  assert.equal((await f.request('GET', '/api/v1/auth/me', null, a.token)).status, 401);
  assert.equal(
    (await f.request('POST', '/api/v1/auth/login', { email: a.user.email, password })).status,
    401,
  );
  const [row] = await f.db.query('SELECT name,email,phone,status FROM users WHERE id=?', [a.user.id]);
  assert.equal(row.status, 'deleted');
  assert.doesNotMatch(row.email, /citizen@/);
  assert.equal(
    (await f.db.query('SELECT COUNT(*)::int AS n FROM complaints WHERE citizen_id=?', [a.user.id]))[0].n,
    1,
    'reports are retained without identity',
  );
  assert.equal(
    (await f.db.query(`SELECT COUNT(*)::int AS n FROM sessions WHERE user_id=?`, [a.user.id]))[0].n,
    0,
    'every sign-in session is ended',
  );
  assert.equal(
    (await f.register('citizen@test.invalid', { verified: false })).user.email,
    'citizen@test.invalid',
    'email can be reused',
  );
  const staff = await f.staff('department');
  assert.equal(
    (await f.request('DELETE', '/api/v1/account', { password, confirm: 'DELETE' }, staff.token)).data.error
      .code,
    'STAFF_ACCOUNT',
  );
});
test('parallel wrong guesses cannot exceed the five attempts on a code', async t => {
  const f = await fixture(t);
  const a = await f.register('guess@test.invalid', { verified: false });
  const code = await f.lastCode('guess@test.invalid');
  const wrong = code === '000000' ? '111111' : '000000';
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      f.request('POST', '/api/v1/auth/verify/confirm', { channel: 'email', code: wrong }, a.token),
    ),
  );
  assert.ok(results.every(r => r.data.error?.code === 'INVALID_CODE'));
  const [row] = await f.db.query(
    `SELECT attempts FROM one_time_codes WHERE destination='guess@test.invalid' AND consumed_at IS NULL`,
  );
  assert.equal(row.attempts, 5);
  const late = await f.request('POST', '/api/v1/auth/verify/confirm', { channel: 'email', code }, a.token);
  assert.equal(late.status, 400, 'the right code no longer works once the attempts are used up');
});
