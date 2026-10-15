import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, report } from './helpers.js';

test('administrators invite staff, grant multiple jurisdictions, suspend and are audited; nobody else can', async t => {
  const f = await fixture(t);
  const admin = await f.staff('admin'),
    department = await f.staff('department'),
    citizen = await f.register();
  const body = {
    name: 'New Field Officer',
    email: 'field.new@test.invalid',
    role: 'field',
    jurisdictions: [
      { district: 'Haridwar', category: 'Road & Transport' },
      { district: 'dehradun', category: 'Water supply' },
    ],
  };
  for (const other of [department, citizen])
    assert.equal((await f.request('POST', '/api/v1/admin/users', body, other.token)).status, 403);
  assert.equal(
    (await f.request('POST', '/api/v1/admin/users', { ...body, jurisdictions: [] }, admin.token)).data.error
      .code,
    'JURISDICTION_REQUIRED',
  );
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/admin/users',
        { ...body, jurisdictions: [{ district: 'Atlantis', category: 'Other' }] },
        admin.token,
      )
    ).data.error.code,
    'INVALID_DISTRICT',
  );
  const created = (await f.request('POST', '/api/v1/admin/users', body, admin.token)).data.user;
  assert.equal(created.jurisdictions.length, 2);
  assert.equal(created.jurisdictions[0].district, 'dehradun');
  assert.equal(
    (await f.request('POST', '/api/v1/admin/users', body, admin.token)).data.error.code,
    'EMAIL_EXISTS',
  );
  const invite = await f.lastCode('field.new@test.invalid');
  const signedIn = (
    await f.request('POST', '/api/v1/auth/password/reset', {
      email: 'field.new@test.invalid',
      code: invite,
      password: 'Field-officer-password-1',
    })
  ).data;
  assert.equal(signedIn.user.role, 'field');
  assert.equal(signedIn.user.emailVerified, true);
  assert.equal(
    (await f.request('PATCH', `/api/v1/admin/users/${admin.id}`, { status: 'suspended' }, admin.token)).data
      .error.code,
    'SELF_CHANGE',
  );
  assert.equal(
    (await f.request('PATCH', `/api/v1/admin/users/${citizen.user.id}`, { role: 'admin' }, admin.token)).data
      .error.code,
    'CITIZEN_ROLE',
  );
  const suspended = (
    await f.request('PATCH', `/api/v1/admin/users/${created.id}`, { status: 'suspended' }, admin.token)
  ).data.user;
  assert.equal(suspended.status, 'suspended');
  assert.equal((await f.request('GET', '/api/v1/auth/me', null, signedIn.token)).status, 401);
  assert.equal(
    (
      await f.request('POST', '/api/v1/auth/login', {
        email: 'field.new@test.invalid',
        password: 'Field-officer-password-1',
      })
    ).data.error.code,
    'ACCOUNT_SUSPENDED',
  );
  const listed = (await f.request('GET', '/api/v1/admin/users?q=field.new', null, admin.token)).data;
  assert.equal(listed.total, 1);
  const audit = (await f.request('GET', '/api/v1/admin/audit?action=admin.', null, admin.token)).data.entries;
  assert.deepEqual(audit.map(e => e.action).sort(), ['admin.user_created', 'admin.user_updated']);
  assert.equal(audit.find(e => e.action === 'admin.user_updated').details.after.status, 'suspended');
  assert.equal((await f.request('GET', '/api/v1/admin/audit', null, department.token)).status, 403);
});
test('ward routing, SLA deadlines, server filters, workload and responsible offices', async t => {
  const f = await fixture(t);
  const admin = await f.staff('admin'),
    citizen = await f.register();
  const wards = (await f.request('GET', '/api/v1/wards')).data.wards;
  assert.equal(wards.length, 40);
  assert.equal(wards[0].verified, false);
  const categories = (await f.request('GET', '/api/v1/categories')).data.categories;
  assert.ok(categories.some(c => c.name === 'Water supply' && c.scope === 'roorkee'));
  await f.request(
    'PATCH',
    '/api/v1/admin/wards/roorkee-7',
    { name: 'Ward 7 (Civil Lines)', localities: ['Civil Lines'], verified: true },
    admin.token,
  );
  const office = (
    await f.request(
      'POST',
      '/api/v1/admin/offices',
      {
        name: 'Roorkee Jal Sansthan desk',
        district: 'Haridwar',
        category: 'Water supply',
        wardId: 'roorkee-7',
        phone: '+911332000000',
      },
      admin.token,
    )
  ).data.office;
  await f.request(
    'POST',
    '/api/v1/admin/offices',
    { name: 'Haridwar district office', district: 'haridwar' },
    admin.token,
  );
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/admin/offices',
        { name: 'Wrong ward office', district: 'dehradun', wardId: 'roorkee-7' },
        admin.token,
      )
    ).data.error.code,
    'INVALID_WARD',
  );
  assert.equal(
    (
      await f.request('POST', '/api/v1/complaints', { ...report, district: 'Atlantis' }, citizen.token, {
        'Idempotency-Key': 'atlantis-key-0000001',
      })
    ).data.error.code,
    'INVALID_DISTRICT',
  );
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/complaints',
        { ...report, category: 'Not a category' },
        citizen.token,
        { 'Idempotency-Key': 'category-key-0000001' },
      )
    ).data.error.code,
    'INVALID_CATEGORY',
  );
  const water = await f.submit(citizen.token, {
    ...report,
    category: 'Water supply',
    title: 'No water supply today',
    district: 'Dehradun',
    wardId: 'roorkee-7',
    latitude: 29.8543,
    longitude: 77.888,
  });
  assert.equal(water.district, 'haridwar', 'ward decides the district');
  assert.equal(water.office.id, office.id);
  assert.equal(water.ward.name, 'Ward 7 (Civil Lines)');
  assert.equal(water.latitude, 29.8543);
  assert.equal(Math.round((Date.parse(water.dueAt) - Date.parse(water.createdAt)) / 3600000), 72);
  const road = await f.submit(citizen.token);
  assert.equal(road.office.name, 'Haridwar district office');
  const fieldA = await f.staff('field', 'haridwar', 'Water supply'),
    fieldB = await f.staff('field', 'haridwar', 'Water supply'),
    dept = await f.staff('department', 'haridwar', 'Water supply');
  await f.db.query('INSERT INTO staff_jurisdictions(user_id,district,category) VALUES(?,?,?)', [
    dept.id,
    'haridwar',
    'Road & Transport',
  ]);
  const deptToken = (
    await f.request('POST', '/api/v1/auth/login', {
      email: dept.email,
      password: 'Synthetic-test-password-123',
    })
  ).data.token;
  assert.equal(
    (await f.request('GET', '/api/v1/complaints', null, deptToken)).data.total,
    2,
    'two jurisdictions',
  );
  assert.equal(
    (await f.request('GET', '/api/v1/complaints?category=Water%20supply&q=water', null, deptToken)).data
      .total,
    1,
  );
  assert.equal(
    (await f.request('GET', '/api/v1/complaints?wardId=roorkee-7', null, deptToken)).data.complaints[0].id,
    water.id,
  );
  assert.equal((await f.request('GET', '/api/v1/complaints?limit=1.5', null, deptToken)).status, 400);
  await f.request(
    'POST',
    `/api/v1/complaints/${water.id}/assign`,
    { assigneeId: fieldA.id, version: 1, note: 'Please inspect.' },
    deptToken,
  );
  const staff = (await f.request('GET', `/api/v1/staff?complaintId=${water.id}`, null, deptToken)).data.staff;
  assert.deepEqual(
    staff.map(s => s.id),
    [fieldB.id, fieldA.id],
    'least loaded first',
  );
  assert.equal(staff[1].openAssignments, 1);
  const reassigned = (
    await f.request(
      'POST',
      `/api/v1/complaints/${water.id}/assign`,
      { assigneeId: fieldB.id, version: 2, note: 'Rebalancing workload.' },
      deptToken,
    )
  ).data.complaint;
  assert.equal(reassigned.events.at(-1).action, 'reassigned');
  assert.equal(reassigned.assignee.id, fieldB.id);
  assert.equal(
    (await f.request('GET', `/api/v1/complaints/${water.id}`, null, fieldA.token)).status,
    404,
    'previous assignee loses access',
  );
  const citizenView = (await f.request('GET', `/api/v1/complaints/${water.id}`, null, citizen.token)).data
    .complaint;
  assert.equal(citizenView.assignee, null);
  assert.ok(
    citizenView.events.every(e => !e.actor.includes('Synthetic')),
    'staff names stay internal',
  );
  assert.ok(
    (
      await f.db.query(`SELECT 1 FROM notifications WHERE user_id=? AND message LIKE '%assigned to you%'`, [
        fieldB.id,
      ])
    ).length,
  );
});
test('overdue reports escalate once per level and notify the right people; analytics and CSV export respect scope', async t => {
  const f = await fixture(t);
  const citizen = await f.register(),
    dept = await f.staff('department'),
    admin = await f.staff('admin'),
    exec = await f.staff('executive'),
    otherDept = await f.staff('department', 'dehradun');
  const c = await f.submit(citizen.token);
  const late = await f.submit(citizen.token, { ...report, title: '=HYPERLINK("http://x")' });
  await f.db.query(`UPDATE complaints SET due_at=? WHERE id=?`, [
    new Date(Date.now() - 2 * 168 * 3600000 - 60000).toISOString(),
    late.id,
  ]);
  assert.equal((await f.jobs.escalate()).escalated, 1);
  assert.equal((await f.jobs.escalate()).escalated, 0, 'idempotent');
  const row = (await f.request('GET', `/api/v1/complaints/${late.id}`, null, dept.token)).data.complaint;
  assert.equal(row.escalationLevel, 3);
  assert.equal(row.overdue, true);
  assert.equal(row.events.at(-1).action, 'escalated');
  assert.equal(row.events.at(-1).actor, 'Batra Connect');
  for (const who of [dept, admin, exec])
    assert.ok(
      (
        await f.db.query(
          `SELECT 1 FROM notifications WHERE user_id=? AND message LIKE '%service deadline%'`,
          [who.id],
        )
      ).length,
      who.user.role,
    );
  assert.equal(
    (
      await f.db.query(`SELECT 1 FROM notifications WHERE user_id=? AND message LIKE '%service deadline%'`, [
        otherDept.id,
      ])
    ).length,
    0,
  );
  assert.equal(
    (await f.request('GET', '/api/v1/complaints?overdue=true', null, dept.token)).data.complaints[0].id,
    late.id,
  );
  assert.equal(
    (await f.request('GET', '/api/v1/complaints?sort=due', null, dept.token)).data.complaints[0].id,
    late.id,
  );
  const insights = (await f.request('GET', '/api/v1/insights', null, exec.token)).data;
  assert.equal(insights.totals.total, 2);
  assert.equal(insights.totals.overdue, 1);
  assert.equal(insights.totals.escalated, 1);
  assert.equal(insights.byCategory[0].key, 'Road & Transport');
  assert.ok(insights.trend.length >= 12);
  assert.ok(insights.engagement);
  assert.equal((await f.request('GET', '/api/v1/insights', null, otherDept.token)).data.totals.total, 0);
  const csv = await f.request('GET', '/api/v1/insights/export.csv', null, dept.token);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  const lines = csv.data.replace(/^﻿/, '').split('\r\n');
  assert.equal(lines.length, 3);
  assert.ok(!csv.data.includes('Synthetic Citizen') && !csv.data.includes('HYPERLINK'), 'no titles or names');
  assert.equal((await f.request('GET', '/api/v1/insights/export.csv', null, citizen.token)).status, 403);
  void c;
});
test('delivery honours preferences, retries transient failures and drops unregistered push tokens', async t => {
  let fail = 'transient';
  const sent = [];
  const transports = {
    email: async m => {
      sent.push(m);
      return { ok: true };
    },
    sms: null,
    push: async m => {
      if (fail === 'transient') return { ok: false, permanent: false, error: 'timeout' };
      if (fail === 'gone')
        return { ok: false, permanent: true, unregister: true, error: 'DeviceNotRegistered' };
      sent.push(m);
      return { ok: true };
    },
  };
  const f = await fixture(t, { transports });
  const citizen = await f.register(),
    dept = await f.staff('department'),
    field = await f.staff('field');
  assert.equal(
    (await f.request('POST', '/api/v1/push-tokens', { token: 'not-a-token', platform: 'ios' }, citizen.token))
      .status,
    400,
  );
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/push-tokens',
        { token: 'ExponentPushToken[abc123]', platform: 'ios' },
        citizen.token,
      )
    ).status,
    204,
  );
  assert.equal(
    (await f.request('PUT', '/api/v1/notification-preferences', { email: false, sms: true }, citizen.token))
      .data.preferences.email,
    false,
  );
  const c = await f.submit(citizen.token);
  await f.db.query(`DELETE FROM outbox WHERE channel='email'`);
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/complaints/${c.id}/assign`,
        { assigneeId: field.id, version: 1, note: 'Starting the inspection now.' },
        dept.token,
      )
    ).status,
    200,
  );
  const queued = await f.db.query(`SELECT channel,status FROM outbox WHERE user_id=?`, [citizen.user.id]);
  assert.ok(
    queued.every(q => q.channel === 'push'),
    'email disabled and SMS has no verified phone',
  );
  await f.jobs.deliver();
  let [row] = await f.db.query(`SELECT * FROM outbox WHERE channel='push' ORDER BY created_at DESC LIMIT 1`);
  assert.equal(row.status, 'pending');
  assert.equal(row.attempts, 1);
  assert.equal(row.last_error, 'timeout');
  await f.db.query(`UPDATE outbox SET next_attempt_at=? WHERE status='pending'`, [new Date(0).toISOString()]);
  fail = 'gone';
  await f.jobs.deliver();
  [row] = await f.db.query(`SELECT * FROM outbox WHERE id=?`, [row.id]);
  assert.equal(row.status, 'failed');
  assert.equal((await f.db.query('SELECT * FROM push_tokens')).length, 0);
  const notes = (await f.request('GET', '/api/v1/notifications', null, citizen.token)).data;
  assert.ok(notes.unread >= 2);
  assert.ok(notes.notifications[0].link.startsWith('complaint:'));
  await f.request('POST', '/api/v1/notifications/read-all', null, citizen.token);
  assert.equal((await f.request('GET', '/api/v1/notifications', null, citizen.token)).data.unread, 0);
});
test('orphaned uploads are cleaned up and photos are re-encoded without metadata', async t => {
  const f = await fixture(t);
  const citizen = await f.register();
  const media = await f.photo(citizen.token);
  assert.equal(media.mimeType, 'image/jpeg');
  const bytes = Buffer.from((await f.request('GET', `/api/v1/media/${media.id}`, null, citizen.token)).data);
  assert.equal(bytes[0], 0xff);
  assert.ok(!bytes.includes(Buffer.from('synthetic')), 'EXIF removed');
  await f.db.query('UPDATE media SET created_at=? WHERE id=?', [
    new Date(Date.now() - 2 * 86400000).toISOString(),
    media.id,
  ]);
  assert.equal((await f.jobs.cleanup()).orphans, 1);
  assert.equal((await f.request('GET', `/api/v1/media/${media.id}`, null, citizen.token)).status, 404);
});
test('the work summary counts only what is waiting on each role', async t => {
  const f = await fixture(t);
  const citizen = await f.register(),
    dept = await f.staff('department'),
    field = await f.staff('field'),
    other = await f.staff('department', 'dehradun'),
    admin = await f.staff('admin');
  const a = await f.submit(citizen.token);
  await f.submit(citizen.token);
  await f.request(
    'POST',
    `/api/v1/complaints/${a.id}/assign`,
    { assigneeId: field.id, version: 1, note: 'Please inspect.' },
    dept.token,
  );
  const d = (await f.request('GET', '/api/v1/work', null, dept.token)).data.tasks;
  assert.equal(d.toAssign, 1);
  assert.equal(d.open, 2);
  assert.equal(d.fieldOfficers, 1);
  assert.equal((await f.request('GET', '/api/v1/work', null, other.token)).data.tasks.toAssign, 0);
  const w = (await f.request('GET', '/api/v1/work', null, field.token)).data.tasks;
  assert.equal(w.toStart, 1);
  assert.equal(w.inProgress, 0);
  assert.equal(w.toAssign, undefined);
  const ad = (await f.request('GET', '/api/v1/work', null, admin.token)).data.tasks;
  assert.equal(ad.toAssign, 1);
  assert.equal(ad.unverifiedWards, undefined, 'administration lives in the web dashboard');
  assert.equal((await f.request('GET', '/api/v1/work', null, citizen.token)).status, 403);
});
test('the database itself rejects unknown jurisdictions, idea categories and backwards slots', async t => {
  const f = await fixture(t);
  const field = await f.staff('field');
  const code = async (sql, values) => {
    try {
      await f.db.query(sql, values);
      return 'accepted';
    } catch (e) {
      return e.code;
    }
  };
  const id = field.user.id;
  assert.equal(
    await code('INSERT INTO staff_jurisdictions(user_id,district,category) VALUES(?,?,?)', [
      id,
      'atlantis',
      'Other',
    ]),
    '23503',
  );
  assert.equal(
    await code('INSERT INTO staff_jurisdictions(user_id,district,category) VALUES(?,?,?)', [
      id,
      'haridwar',
      'Nope',
    ]),
    '23503',
  );
  const time = new Date().toISOString();
  assert.equal(
    await code(
      `INSERT INTO ideas(id,reference,citizen_id,category,title,description,district,status,created_at,updated_at) VALUES('i1','ID-1',?,'Bogus','t','d','haridwar','Submitted',?,?)`,
      [id, time, time],
    ),
    '23514',
  );
  assert.equal(
    await code(
      `INSERT INTO appointment_slots(id,location,district,starts_at,ends_at,capacity,created_by,created_at) VALUES('s1','Office','haridwar',?,?,5,?,?)`,
      ['2030-01-01T10:00:00.000Z', '2030-01-01T09:00:00.000Z', id, time],
    ),
    '23514',
  );
});
