import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, png } from './helpers.js';

const idea = {
  category: 'Public spaces',
  title: 'Benches at the bus stand',
  description: 'Add shaded benches at the Roorkee bus stand for older passengers.',
  district: 'Haridwar',
};
test('ideas are private to their author, reviewed by the office, moderated and deduplicated on retry', async t => {
  const f = await fixture(t);
  const a = await f.register(),
    b = await f.register('b@test.invalid'),
    dept = await f.staff('department'),
    exec = await f.staff('executive'),
    field = await f.staff('field');
  const created = await f.request('POST', '/api/v1/ideas', idea, a.token);
  assert.equal(created.status, 201);
  assert.match(created.data.idea.reference, /^ID-/);
  assert.equal(
    (await f.request('POST', '/api/v1/ideas', idea, a.token)).status,
    200,
    'retry returns original',
  );
  const id = created.data.idea.id;
  assert.equal((await f.request('GET', `/api/v1/ideas/${id}`, null, b.token)).status, 404);
  assert.equal(
    (await f.request('GET', '/api/v1/ideas', null, field.token)).data.total,
    0,
    'field officers see only ideas they sent themselves',
  );
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/ideas/${id}/review`,
        { status: 'Accepted', version: 1, note: 'Approved.' },
        exec.token,
      )
    ).status,
    403,
  );
  await f.request(
    'POST',
    `/api/v1/ideas/${id}/review`,
    {
      status: 'Under review',
      version: 1,
      note: 'Internal check of the bus stand area.',
      visibleToCitizen: false,
    },
    dept.token,
  );
  const reviewed = (
    await f.request(
      'POST',
      `/api/v1/ideas/${id}/review`,
      { status: 'Accepted', version: 2, note: 'We will add benches this year.' },
      dept.token,
    )
  ).data.idea;
  assert.equal(reviewed.status, 'Accepted');
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/ideas/${id}/review`,
        { status: 'Implemented', version: 2, note: 'Stale update.' },
        dept.token,
      )
    ).status,
    409,
  );
  const mine = (await f.request('GET', `/api/v1/ideas/${id}`, null, a.token)).data.idea;
  assert.deepEqual(
    mine.events.map(e => e.status),
    ['Submitted', 'Accepted'],
    'internal notes hidden',
  );
  assert.equal(mine.citizen, undefined);
  assert.equal(
    (await f.request('GET', '/api/v1/ideas', null, exec.token)).data.ideas[0].citizen,
    'Synthetic Citizen',
  );
  const spam = (await f.request('POST', '/api/v1/ideas', { ...idea, title: 'Abusive text example' }, b.token))
    .data.idea;
  await f.request(
    'POST',
    `/api/v1/ideas/${spam.id}/review`,
    { status: 'Hidden', version: 1, note: 'Abusive language.' },
    dept.token,
  );
  assert.equal(
    (await f.request('GET', '/api/v1/ideas', null, dept.token)).data.total,
    1,
    'hidden ideas leave the default queue',
  );
  assert.equal((await f.request('GET', '/api/v1/ideas?status=Hidden', null, dept.token)).data.total, 1);
  assert.equal(
    (await f.db.query(`SELECT COUNT(*)::int AS n FROM notifications WHERE user_id=?`, [b.user.id]))[0].n,
    0,
    'moderation does not notify',
  );
  assert.ok(
    (await f.request('GET', '/api/v1/admin/audit?action=idea.', null, (await f.staff('admin')).token)).data
      .entries.length,
  );
});
test('Jan Samvad slots enforce capacity under concurrency; booking, rescheduling, cancellation, decisions and reminders', async t => {
  const f = await fixture(t);
  const a = await f.register(),
    b = await f.register('b@test.invalid'),
    c = await f.register('c@test.invalid'),
    dept = await f.staff('department');
  const hours = h => new Date(Date.now() + h * 3600000).toISOString();
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/appointments/slots',
        {
          location: 'Camp office, Roorkee',
          district: 'Haridwar',
          startsAt: hours(-2),
          endsAt: hours(-1),
          capacity: 1,
        },
        dept.token,
      )
    ).data.error.code,
    'INVALID_SLOT',
  );
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/appointments/slots',
        {
          location: 'Camp office, Roorkee',
          district: 'Haridwar',
          startsAt: hours(30),
          endsAt: hours(29),
          capacity: 1,
        },
        dept.token,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/appointments/slots',
        {
          location: 'Camp office, Roorkee',
          district: 'Haridwar',
          startsAt: hours(20),
          endsAt: hours(21),
          capacity: 1,
        },
        a.token,
      )
    ).status,
    403,
  );
  const one = (
    await f.request(
      'POST',
      '/api/v1/appointments/slots',
      {
        location: 'Camp office, Roorkee',
        district: 'Haridwar',
        startsAt: hours(20),
        endsAt: hours(21),
        capacity: 1,
      },
      dept.token,
    )
  ).data.slot;
  const two = (
    await f.request(
      'POST',
      '/api/v1/appointments/slots',
      {
        location: 'Camp office, Roorkee',
        district: 'Haridwar',
        startsAt: hours(48),
        endsAt: hours(49),
        capacity: 5,
      },
      dept.token,
    )
  ).data.slot;
  const book = user =>
    f.request(
      'POST',
      '/api/v1/appointments',
      {
        slotId: one.id,
        subject: 'Street lights in my ward',
        notes: 'Five street lights have not worked for a month near the market.',
      },
      user.token,
    );
  const results = await Promise.all([book(a), book(b)]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  const winner = results.find(r => r.status === 201).data.appointment;
  const owner = winner && results[0].status === 201 ? a : b;
  assert.equal(winner.status, 'Requested');
  assert.match(winner.reference, /^JS-/);
  assert.equal(
    (await f.request('GET', '/api/v1/appointments/slots', null, c.token)).data.slots.find(
      s => s.id === one.id,
    ).remaining,
    0,
  );
  assert.equal((await f.request('GET', `/api/v1/appointments/${winner.id}`, null, c.token)).status, 404);
  const confirmed = (
    await f.request(
      'POST',
      `/api/v1/appointments/${winner.id}/decision`,
      { status: 'Confirmed', version: 1, note: 'Please bring photos.' },
      dept.token,
    )
  ).data.appointment;
  assert.equal(confirmed.status, 'Confirmed');
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/appointments/${winner.id}/decision`,
        { status: 'Completed', version: 2 },
        dept.token,
      )
    ).status,
    409,
    'cannot complete before it starts',
  );
  assert.equal((await f.jobs.remind()).reminded, 1);
  await f.jobs.remind();
  assert.equal(
    (
      await f.db.query(
        `SELECT COUNT(*)::int AS n FROM notifications WHERE user_id=? AND message LIKE 'Reminder%'`,
        [owner.user.id],
      )
    )[0].n,
    1,
  );
  const moved = (
    await f.request(
      'POST',
      `/api/v1/appointments/${winner.id}/reschedule`,
      { slotId: two.id, version: 2 },
      owner.token,
    )
  ).data.appointment;
  assert.equal(moved.status, 'Requested');
  assert.equal(moved.slot.startsAt, two.startsAt);
  assert.equal((await book(c)).status, 201, 'freed capacity is reusable');
  const cancelled = (
    await f.request(
      'POST',
      `/api/v1/appointments/${winner.id}/cancel`,
      { version: moved.version },
      owner.token,
    )
  ).data.appointment;
  assert.equal(cancelled.status, 'Cancelled');
  await f.request(
    'POST',
    '/api/v1/appointments',
    {
      slotId: two.id,
      subject: 'Water supply timing',
      notes: 'Water supply timings in ward 12 have changed without notice.',
    },
    a.token,
  );
  assert.equal(
    (await f.request('DELETE', `/api/v1/appointments/slots/${two.id}`, null, dept.token)).status,
    204,
  );
  const list = (await f.request('GET', '/api/v1/appointments', null, a.token)).data.appointments;
  assert.ok(list.filter(x => x.slotId === two.id).every(x => x.status === 'Cancelled'));
  assert.ok(
    (
      await f.db.query(
        `SELECT 1 FROM notifications WHERE user_id=? AND message LIKE '%cancelled by the office%'`,
        [a.user.id],
      )
    ).length,
  );
  const office = (await f.request('GET', '/api/v1/appointments', null, dept.token)).data.appointments;
  assert.ok(office[0].citizen);
});
test('content is edited with versions by the admin, published publicly with photos, and hidden when archived', async t => {
  const f = await fixture(t);
  const admin = await f.staff('admin'),
    citizen = await f.register();
  const form = new FormData();
  form.append('photo', new Blob([png], { type: 'image/png' }), 'p.png');
  const media = (await f.request('POST', '/api/v1/media?purpose=gallery', form, admin.token)).data.media;
  assert.equal(media.purpose, 'gallery');
  const entry = {
    type: 'project',
    slug: 'roorkee-drainage',
    title: { en: 'Roorkee drainage upgrade', hi: 'रुड़की नाली सुधार' },
    summary: { en: 'Phase 1 of drainage works.' },
    fields: { budgetCrore: 12.5, status: 'In progress', milestone: 'Tender issued' },
    mediaIds: [media.id],
    sourceUrl: 'https://example.gov.in/notice',
    status: 'draft',
  };
  assert.equal((await f.request('POST', '/api/v1/admin/content', entry, citizen.token)).status, 403);
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/admin/content',
        { ...entry, sourceUrl: 'http://insecure.example' },
        admin.token,
      )
    ).status,
    400,
  );
  const draft = (await f.request('POST', '/api/v1/admin/content', entry, admin.token)).data.entry;
  assert.equal(draft.version, 1);
  assert.equal(
    (await f.request('GET', '/api/v1/content?type=project')).data.entries.length,
    0,
    'drafts are private',
  );
  assert.equal((await f.request('GET', `/api/v1/public/media/${media.id}`)).status, 404);
  const published = (
    await f.request(
      'PUT',
      `/api/v1/admin/content/${draft.id}`,
      { ...entry, status: 'published', version: 1 },
      admin.token,
    )
  ).data.entry;
  assert.ok(published.publishedAt);
  assert.equal(
    (
      await f.request(
        'PUT',
        `/api/v1/admin/content/${draft.id}`,
        { ...entry, status: 'published', version: 1 },
        admin.token,
      )
    ).status,
    409,
  );
  const pub = (await f.request('GET', '/api/v1/content?type=project')).data.entries[0];
  assert.equal(pub.title.hi, 'रुड़की नाली सुधार');
  assert.equal(pub.fields.budgetCrore, 12.5);
  assert.equal(pub.status, undefined);
  assert.equal((await f.request('GET', `/api/v1/public/media/${media.id}`)).status, 200);
  await f.request(
    'PUT',
    `/api/v1/admin/content/${draft.id}`,
    { ...entry, status: 'archived', version: 2 },
    admin.token,
  );
  assert.equal((await f.request('GET', '/api/v1/content/project/roorkee-drainage')).status, 404);
  assert.equal((await f.request('GET', `/api/v1/public/media/${media.id}`)).status, 404);
  assert.equal(
    (await f.request('POST', '/api/v1/admin/content', entry, admin.token)).status,
    409,
    'slugs are unique per type',
  );
});
test('staff can also act as residents, but never handle their own reports, ideas or appointments', async t => {
  const f = await fixture(t);
  const dept = await f.staff('department'),
    colleague = await f.staff('department'),
    field = await f.staff('field');
  const own = await f.submit(dept.token);
  assert.equal(own.status, 'Submitted');
  assert.deepEqual(
    (await f.request('GET', '/api/v1/complaints?own=true', null, dept.token)).data.complaints.map(c => c.id),
    [own.id],
  );
  assert.equal(
    (await f.request('GET', '/api/v1/complaints?own=true', null, colleague.token)).data.total,
    0,
    'own=true is personal',
  );
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/complaints/${own.id}/assign`,
        { assigneeId: field.id, version: 1, note: 'Assigning my own report.' },
        dept.token,
      )
    ).data.error.code,
    'OWN_REPORT',
  );
  let c = (
    await f.request(
      'POST',
      `/api/v1/complaints/${own.id}/assign`,
      { assigneeId: field.id, version: 1, note: 'Colleague assigns it.' },
      colleague.token,
    )
  ).data.complaint;
  c = (
    await f.request(
      'POST',
      `/api/v1/complaints/${c.id}/status`,
      { status: 'In progress', version: c.version, note: 'Work has started now.' },
      field.token,
    )
  ).data.complaint;
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/complaints/${c.id}/status`,
        {
          status: 'Resolved',
          version: c.version,
          note: 'Resolving my own report.',
          mediaIds: [(await f.photo(dept.token)).id],
        },
        dept.token,
      )
    ).status,
    403,
    'cannot resolve own report',
  );
  c = (
    await f.request(
      'POST',
      `/api/v1/complaints/${c.id}/status`,
      {
        status: 'Resolved',
        version: c.version,
        note: 'Repaired and checked.',
        mediaIds: [(await f.photo(field.token)).id],
      },
      field.token,
    )
  ).data.complaint;
  const asOwner = (await f.request('GET', `/api/v1/complaints/${c.id}`, null, dept.token)).data.complaint;
  assert.equal(asOwner.assignee, null, 'owner sees the resident view');
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/complaints/${c.id}/status`,
        { status: 'Closed', version: c.version, note: 'Fixed, thank you.' },
        dept.token,
      )
    ).data.complaint.status,
    'Closed',
  );
  const form = new FormData();
  form.append('photo', new Blob([(await import('./helpers.js')).png], { type: 'image/png' }), 'p.png');
  assert.equal(
    (await f.request('POST', '/api/v1/media?purpose=evidence', form, field.token)).data.media.purpose,
    'evidence',
  );
  const idea = (
    await f.request(
      'POST',
      '/api/v1/ideas',
      {
        category: 'Transport',
        title: 'Cycle lane on canal road',
        description: 'A safe cycle lane along the canal road for students.',
        district: 'Haridwar',
      },
      dept.token,
    )
  ).data.idea;
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/ideas/${idea.id}/review`,
        { status: 'Accepted', version: 1, note: 'Approving my own idea.' },
        dept.token,
      )
    ).data.error.code,
    'OWN_REPORT',
  );
  assert.equal((await f.request('GET', '/api/v1/ideas?own=true', null, dept.token)).data.total, 1);
  const start = new Date(Date.now() + 48 * 3600000).toISOString(),
    end = new Date(Date.now() + 50 * 3600000).toISOString();
  const slot = (
    await f.request(
      'POST',
      '/api/v1/appointments/slots',
      { location: 'Camp office', district: 'Haridwar', startsAt: start, endsAt: end, capacity: 5 },
      colleague.token,
    )
  ).data.slot;
  const appt = (
    await f.request(
      'POST',
      '/api/v1/appointments',
      {
        slotId: slot.id,
        subject: 'Drainage in my ward',
        notes: 'Drains overflow every monsoon near our colony.',
      },
      dept.token,
    )
  ).data.appointment;
  assert.equal(
    (
      await f.request(
        'POST',
        `/api/v1/appointments/${appt.id}/decision`,
        { status: 'Confirmed', version: 1 },
        dept.token,
      )
    ).data.error.code,
    'OWN_REPORT',
  );
  assert.equal(
    (await f.request('POST', `/api/v1/appointments/${appt.id}/cancel`, { version: 1 }, colleague.token))
      .status,
    404,
    'only the owner cancels',
  );
  assert.equal(
    (await f.request('POST', `/api/v1/appointments/${appt.id}/cancel`, { version: 1 }, dept.token)).data
      .appointment.status,
    'Cancelled',
  );
  assert.equal(
    (await f.request('GET', '/api/v1/appointments?own=true', null, dept.token)).data.appointments.length,
    1,
  );
});
test('executives oversee everything but cannot report, suggest or book', async t => {
  const f = await fixture(t);
  const exec = await f.staff('executive'),
    citizen = await f.register();
  const c = await f.submit(citizen.token);
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/complaints',
        {
          category: 'Water supply',
          title: 'Executive test report',
          description: 'This should never be accepted from an executive.',
          district: 'Haridwar',
          locality: 'Civil Lines',
        },
        exec.token,
        { 'Idempotency-Key': 'executive-attempt-0001' },
      )
    ).data.error.code,
    'OVERSIGHT_ONLY',
  );
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/ideas',
        {
          category: 'Transport',
          title: 'Executive idea',
          description: 'Executives do not send ideas from this account.',
          district: 'Haridwar',
        },
        exec.token,
      )
    ).data.error.code,
    'OVERSIGHT_ONLY',
  );
  assert.equal(
    (
      await f.request(
        'POST',
        '/api/v1/appointments',
        {
          slotId: '00000000-0000-4000-8000-000000000000',
          subject: 'Not allowed',
          notes: 'Executives do not book appointments from this account.',
        },
        exec.token,
      )
    ).data.error.code,
    'OVERSIGHT_ONLY',
  );
  const form = new FormData();
  form.append('photo', new Blob([(await import('./helpers.js')).png], { type: 'image/png' }), 'p.png');
  assert.equal((await f.request('POST', '/api/v1/media', form, exec.token)).status, 403);
  assert.equal(
    (await f.request('GET', `/api/v1/complaints/${c.id}`, null, exec.token)).status,
    200,
    'can read every report',
  );
  assert.equal((await f.request('GET', '/api/v1/insights', null, exec.token)).status, 200);
  assert.equal((await f.request('GET', '/api/v1/insights/export.csv', null, exec.token)).status, 200);
});
