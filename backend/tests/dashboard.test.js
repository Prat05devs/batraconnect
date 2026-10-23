import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, report } from './helpers.js';

test('dashboard keys are stored encrypted, shown masked, testable and restorable', async t => {
  const f = await fixture(t);
  const admin = await f.staff('admin'),
    dept = await f.staff('department');
  assert.equal((await f.request('GET', '/api/v1/admin/integrations', null, dept.token)).status, 403);
  const res = await f.request(
    'PUT',
    '/api/v1/admin/integrations/email',
    {
      values: { from: 'Batra Connect <noreply@example.in>' },
      secrets: { smtpUrl: 'smtps://user:SuperSecret-9f3a@smtp.example.in:465' },
    },
    admin.token,
  );
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.integration.secrets.smtpUrl, { set: true, hint: '••••:465' });
  assert.equal(res.data.integration.source, 'dashboard');
  assert.ok(!JSON.stringify(res.data).includes('SuperSecret'), 'secret never returned');
  const [row] = await f.db.query(`SELECT secret FROM app_settings WHERE key='integration.email'`);
  assert.ok(row.secret && !row.secret.includes('SuperSecret'), 'secret encrypted at rest');
  assert.equal(
    (
      await f.request(
        'PUT',
        '/api/v1/admin/integrations/email',
        { secrets: { smtpUrl: 'not-a-url' } },
        admin.token,
      )
    ).status,
    400,
  );
  await f.request(
    'PUT',
    '/api/v1/admin/integrations/email',
    { values: { from: 'Changed <x@example.in>' } },
    admin.token,
  );
  assert.equal(
    (await f.request('POST', '/api/v1/admin/settings/integration.email/restore', null, admin.token)).data[
      'integration.email'
    ].from,
    'Batra Connect <noreply@example.in>',
  );
  const test1 = await f.request(
    'POST',
    '/api/v1/admin/integrations/email/test',
    { to: 'someone@example.in' },
    admin.token,
  );
  assert.equal(test1.data.ok, true);
  const audit = (await f.request('GET', '/api/v1/admin/audit?action=integration.', null, admin.token)).data
    .entries;
  assert.ok(audit.length >= 2);
  assert.ok(!JSON.stringify(audit).includes('SuperSecret'), 'audit never stores keys');
  const health = (await f.request('GET', '/api/v1/admin/health', null, admin.token)).data;
  assert.equal(health.database, 'ok');
  assert.equal(health.providers.email, 'dashboard');
});
test('feature switches and the maintenance banner apply immediately and are enforced by the server', async t => {
  const f = await fixture(t);
  const admin = await f.staff('admin'),
    citizen = await f.register(),
    dept = await f.staff('department');
  assert.equal((await f.request('GET', '/api/v1/config')).data.features.reports.citizens, true);
  await f.request(
    'PUT',
    '/api/v1/admin/settings/features',
    {
      reports: { citizens: false, officers: true },
      ideas: { citizens: true, officers: false },
      appointments: { citizens: true, officers: true },
    },
    admin.token,
  );
  await f.request(
    'PUT',
    '/api/v1/admin/settings/app',
    { maintenanceMessage: 'Scheduled maintenance tonight 10–11 pm.', requireClosureEvidence: false },
    admin.token,
  );
  const cfg = (await f.request('GET', '/api/v1/config')).data;
  assert.equal(cfg.features.reports.citizens, false);
  assert.equal(cfg.maintenanceMessage, 'Scheduled maintenance tonight 10–11 pm.');
  assert.equal(
    (
      await f.request('POST', '/api/v1/complaints', report, citizen.token, {
        'Idempotency-Key': 'feature-off-key-00001',
      })
    ).data.error.code,
    'FEATURE_OFF',
  );
  assert.equal(
    (
      await f.request('POST', '/api/v1/complaints', report, dept.token, {
        'Idempotency-Key': 'feature-on-key-000001',
      })
    ).status,
    201,
    'officers still can',
  );
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/ideas',
        {
          category: 'Transport',
          title: 'Officer idea here',
          description: 'Ideas are switched off for officers today.',
          district: 'Haridwar',
        },
        dept.token,
      )
    ).data.error.code,
    'FEATURE_OFF',
  );
  assert.equal(
    (await f.request('PUT', '/api/v1/admin/settings/features', { reports: { citizens: 'no' } }, admin.token))
      .status,
    400,
  );
  // Closure photo rule switched off from the dashboard.
  const field = await f.staff('field');
  const c = (await f.request('GET', '/api/v1/complaints?limit=1', null, admin.token)).data.complaints[0];
  let r = (
    await f.request(
      'POST',
      `/api/v1/complaints/${c.id}/assign`,
      { assigneeId: field.id, version: c.version, note: 'Please inspect.' },
      admin.token,
    )
  ).data.complaint;
  r = (
    await f.request(
      'POST',
      `/api/v1/complaints/${r.id}/status`,
      { status: 'In progress', version: r.version, note: 'Inspection started now.' },
      field.token,
    )
  ).data.complaint;
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/complaints/${r.id}/status`,
        { status: 'Resolved', version: r.version, note: 'Fixed without a photo today.' },
        field.token,
      )
    ).data.complaint.status,
    'Resolved',
  );
});
test("admins reset each other's passwords; codes are never resent; failed messages can be resent", async t => {
  const f = await fixture(t);
  const a1 = await f.staff('admin'),
    a2 = await f.staff('admin'),
    dept = await f.staff('department');
  assert.equal(
    (await f.request('POST', `/api/v1/admin/users/${a2.id}/password`, { password: 'short' }, a1.token))
      .status,
    400,
  );
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/admin/users/${a1.id}/password`,
        { password: 'Another-long-password-1' },
        a1.token,
      )
    ).data.error.code,
    'USE_ACCOUNT_PAGE',
  );
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/admin/users/${a2.id}/password`,
        { password: 'Another-long-password-1' },
        dept.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/admin/users/${a2.id}/password`,
        { password: 'Reset-by-colleague-12' },
        a1.token,
      )
    ).status,
    204,
  );
  assert.equal((await f.request('GET', '/api/v1/auth/me', null, a2.token)).status, 401, 'old sessions end');
  assert.equal(
    (await f.request('POST', '/api/v1/auth/login', { email: a2.email, password: 'Reset-by-colleague-12' }))
      .status,
    200,
  );
  const citizen = await f.register('needs.code@test.invalid', { verified: false });
  await f.db.query(
    `UPDATE outbox SET status='failed',last_error='SMTP 550' WHERE destination='needs.code@test.invalid'`,
  );
  const list = (await f.request('GET', '/api/v1/admin/deliveries?status=failed', null, a1.token)).data
    .deliveries;
  assert.equal(list[0].isCode, true);
  assert.equal(list[0].body, null, 'codes are hidden');
  assert.equal(
    (await f.request('POST', `/api/v1/admin/deliveries/${list[0].id}/resend`, null, a1.token)).data.error
      .code,
    'CODE_NOT_RESENT',
  );
  const c = await f.submit(citizen.token).catch(() => null);
  void c;
  await f.db.query(
    `INSERT INTO outbox(id,user_id,channel,destination,subject,body,status,attempts,next_attempt_at,created_at,last_error) VALUES('11111111-1111-4111-8111-111111111111',?, 'email','x@example.in','Update','Report BC-1 updated.','failed',6,?,?,'SMTP timeout')`,
    [citizen.user.id, new Date().toISOString(), new Date().toISOString()],
  );
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/admin/deliveries/11111111-1111-4111-8111-111111111111/resend',
        null,
        a1.token,
      )
    ).status,
    202,
  );
  assert.equal(
    (await f.db.query(`SELECT status FROM outbox WHERE id='11111111-1111-4111-8111-111111111111'`))[0].status,
    'pending',
  );
});
