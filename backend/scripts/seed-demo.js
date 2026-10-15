import { randomUUID } from 'node:crypto';
import { createDatabase } from '../src/db.js';
import { config } from '../src/config.js';
import { hashPassword } from '../src/security.js';

/**
 * Loads a demonstration dataset for client walkthroughs. Refuses to run in production.
 * Usage: DEMO_RESET=true npm run seed:demo   (needs DEMO_PASSWORD in .env)   (DEMO_RESET wipes all existing data first)
 */
const options = config();
if (options.production) throw new Error('seed-demo is for development and demo databases only.');
const db = await createDatabase(options);
// The shared demo password lives in the local .env (DEMO_PASSWORD), never in the repository.
const PASSWORD = process.env.DEMO_PASSWORD;
if (!PASSWORD || PASSWORD.length < 12)
  throw new Error('Set DEMO_PASSWORD (12+ characters) in .env to seed demo accounts.');
const iso = d => d.toISOString();
const ago = (days, hours = 0) => new Date(Date.now() - days * 86400000 - hours * 3600000);
const ref = (prefix, id, t) =>
  `${prefix}-${iso(t).slice(0, 10).replaceAll('-', '')}-${id
    .replaceAll('-', '')
    .slice(0, prefix === 'BC' ? 12 : 8)
    .toUpperCase()}`;
try {
  if (process.env.DEMO_RESET === 'true') {
    for (const table of [
      'app_settings_history',
      'app_settings',
      'outbox',
      'push_tokens',
      'notification_preferences',
      'notifications',
      'idea_events',
      'ideas',
      'appointments',
      'appointment_slots',
      'complaint_events',
      'idempotency',
      'media',
      'complaints',
      'content_entries',
      'one_time_codes',
      'sessions',
      'staff_jurisdictions',
      'audit_log',
      'offices',
      'rate_limits',
      'users',
    ])
      await db.query(`DELETE FROM ${table}`);
    await db.query(`UPDATE wards SET name='Ward ' || number, verified=false, localities='{}'`);
  }
  const hash = await hashPassword(PASSWORD);
  const verified = iso(ago(60));
  const user = async (name, email, role, extra = {}) => {
    const id = randomUUID();
    await db.query(
      'INSERT INTO users(id,name,email,password_hash,role,status,email_verified_at,phone,phone_verified_at,language,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        id,
        name,
        email,
        hash,
        role,
        'active',
        verified,
        extra.phone ?? null,
        extra.phone ? verified : null,
        extra.language ?? 'en',
        iso(ago(70)),
        iso(ago(70)),
      ],
    );
    for (const [district, category] of extra.scope ?? [])
      await db.query('INSERT INTO staff_jurisdictions(user_id,district,category) VALUES(?,?,?)', [
        id,
        district,
        category,
      ]);
    return id;
  };
  const roorkee = [
    'Water supply',
    'Drainage & sewerage',
    'Street lighting',
    'Waste & sanitation',
    'Road & Transport',
  ].map(c => ['haridwar', c]);
  const citizen = await user('Asha Verma', 'citizen@batraconnect.demo', 'citizen', {
    phone: '+919000000001',
  });
  const others = [
    await user('Rahul Saini', 'rahul.saini@batraconnect.demo', 'citizen'),
    await user('Meena Rawat', 'meena.rawat@batraconnect.demo', 'citizen', { language: 'hi' }),
  ];
  const minister = await user('Minister’s Office (Demo)', 'minister@batraconnect.demo', 'executive');
  const dept = await user('Roorkee Civic Desk (Demo)', 'department@batraconnect.demo', 'department', {
    scope: roorkee,
  });
  const field = await user('Vikas Kumar', 'field@batraconnect.demo', 'field', { scope: roorkee });
  const field2 = await user('Pooja Negi', 'field2@batraconnect.demo', 'field', { scope: roorkee });
  const admin = await user('Office Administrator (Demo)', 'admin@batraconnect.demo', 'admin');
  // Web dashboard logins. Any admin can reset another admin's password from the dashboard.
  for (const n of [1, 2, 3])
    await user(`Dashboard Admin ${n} (Demo)`, `admin${n}@batraconnect.demo`, 'admin');
  for (const [n, name, localities] of [
    [3, 'Ward 3', ['Ramnagar']],
    [7, 'Ward 7', ['Civil Lines']],
    [12, 'Ward 12', ['Adarsh Nagar']],
    [18, 'Ward 18', ['Malviya Chowk']],
  ])
    await db.query('UPDATE wards SET name=?,localities=?,verified=true WHERE id=?', [
      name,
      localities,
      `roorkee-${n}`,
    ]);
  await db.query(
    'INSERT INTO offices(id,name,hindi_name,district,category,ward_id,phone,email,address,hours,active,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      randomUUID(),
      'Roorkee Civic Desk (Demo)',
      'रुड़की नागरिक डेस्क (डेमो)',
      'haridwar',
      null,
      null,
      null,
      null,
      'Demo office · Roorkee',
      'Mon–Sat, 10:00–17:00',
      true,
      iso(ago(30)),
    ],
  );

  const event = (complaintId, actor, action, status, note, at) =>
    db.query(
      'INSERT INTO complaint_events(id,complaint_id,actor_id,action,status,note,created_at) VALUES(?,?,?,?,?,?,?)',
      [randomUUID(), complaintId, actor, action, status, note, iso(at)],
    );
  const notify = (userId, complaintId, message, at, read) =>
    db.query('INSERT INTO notifications(id,user_id,link,message,read_at,created_at) VALUES(?,?,?,?,?,?)', [
      randomUUID(),
      userId,
      `complaint:${complaintId}`,
      message,
      read ? iso(at) : null,
      iso(at),
    ]);
  const sla = {
    'Water supply': 72,
    'Drainage & sewerage': 72,
    'Street lighting': 72,
    'Waste & sanitation': 48,
    'Road & Transport': 168,
  };
  // [owner, category, title, description, ward, locality, daysAgo, stage, lat, lng]
  const reports = [
    [
      citizen,
      'Water supply',
      'No water supply since yesterday',
      'Our lane has had no water supply since yesterday morning. Elderly residents are affected.',
      7,
      'Civil Lines, behind the park',
      0.2,
      'Submitted',
      29.8667,
      77.8901,
    ],
    [
      citizen,
      'Street lighting',
      'Four street lights not working',
      'Four street lights near the market have been off for a week; the road is dark after 7 pm.',
      18,
      'Malviya Chowk market',
      2,
      'In progress',
      29.8721,
      77.8889,
    ],
    [
      citizen,
      'Drainage & sewerage',
      'Drain overflowing onto the road',
      'The main drain overflows whenever it rains and water enters shops.',
      12,
      'Adarsh Nagar main road',
      9,
      'Resolved',
      29.8601,
      77.8812,
    ],
    [
      citizen,
      'Waste & sanitation',
      'Garbage not collected for 3 days',
      'Garbage has not been collected from our street for three days.',
      3,
      'Ramnagar, lane 4',
      24,
      'Closed',
      29.8755,
      77.895,
    ],
    [
      others[0],
      'Road & Transport',
      'Large pothole near bus stand',
      'A deep pothole near the Roorkee bus stand is causing two-wheeler accidents.',
      7,
      'Near Roorkee bus stand',
      12,
      'Assigned',
      29.869,
      77.892,
    ],
    [
      others[0],
      'Water supply',
      'Dirty water from the tap',
      'Tap water has been muddy for two days in our colony.',
      12,
      'Adarsh Nagar, block B',
      6,
      'Assigned',
      null,
      null,
    ],
    [
      others[1],
      'Street lighting',
      'Street light pole damaged',
      'A street light pole is leaning dangerously after a truck hit it.',
      3,
      'Ramnagar crossing',
      5,
      'Submitted',
      null,
      null,
    ],
    [
      others[1],
      'Waste & sanitation',
      'Public toilet not cleaned',
      'The public toilet near the vegetable market has not been cleaned.',
      18,
      'Sabzi mandi',
      1,
      'In progress',
      null,
      null,
    ],
    [
      others[0],
      'Drainage & sewerage',
      'Open manhole on main road',
      'An open manhole on the main road is a danger to children going to school.',
      7,
      'Civil Lines school road',
      0.5,
      'Submitted',
      29.866,
      77.8899,
    ],
    [
      others[1],
      'Road & Transport',
      'Broken footpath tiles',
      'Footpath tiles are broken along the canal road.',
      12,
      'Canal road',
      35,
      'Closed',
      null,
      null,
    ],
    [
      citizen,
      'Water supply',
      'Low water pressure in mornings',
      'Water pressure is very low between 6 and 9 am.',
      7,
      'Civil Lines',
      48,
      'Closed',
      null,
      null,
    ],
    [
      others[0],
      'Street lighting',
      'Lights on during daytime',
      'Street lights stay on all day near the college, wasting electricity.',
      18,
      'Near the college gate',
      62,
      'Closed',
      null,
      null,
    ],
    [
      others[1],
      'Waste & sanitation',
      'Dustbins overflowing',
      'Community dustbins overflow every evening.',
      3,
      'Ramnagar park',
      16,
      'Reopened',
      null,
      null,
    ],
  ];
  const stages = ['Submitted', 'Assigned', 'In progress', 'Resolved', 'Closed'];
  for (const [owner, category, title, description, ward, locality, days, stage, lat, lng] of reports) {
    const id = randomUUID(),
      created = ago(days),
      due = new Date(created.getTime() + sla[category] * 3600000),
      officer = days % 2 ? field2 : field;
    const reached = stage === 'Reopened' ? 3 : stages.indexOf(stage);
    const doneAt =
      reached >= 3
        ? new Date(Math.min(created.getTime() + sla[category] * 3600000 * 0.7, Date.now() - 3600000))
        : null;
    const open = !['Resolved', 'Closed'].includes(stage);
    const overdueHours = open ? (Date.now() - due.getTime()) / 3600000 : 0;
    const level = overdueHours > 0 ? Math.min(3, Math.floor(overdueHours / sla[category]) + 1) : 0;
    const reference = ref('BC', id, created);
    await db.query(
      'INSERT INTO complaints(id,reference,citizen_id,category,title,description,district,locality,ward_id,latitude,longitude,status,assigned_to,version,resolution,due_at,escalation_level,resolved_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        id,
        reference,
        owner,
        category,
        title,
        description,
        'haridwar',
        locality,
        `roorkee-${ward}`,
        lat,
        lng,
        stage,
        reached >= 1 ? officer : null,
        1 + reached + (stage === 'Reopened' ? 1 : 0),
        reached >= 3 ? 'Work completed and checked on site.' : null,
        iso(stage === 'Reopened' ? new Date(Date.now() - 6 * 3600000) : due),
        stage === 'Reopened' ? 0 : level,
        doneAt ? iso(doneAt) : null,
        iso(created),
        iso(doneAt ?? created),
      ],
    );
    const step = (n, h) => new Date(Math.min(created.getTime() + h * 3600000, Date.now() - (5 - n) * 60000));
    await event(id, owner, 'submitted', 'Submitted', 'Received by Batra Connect.', created);
    if (owner === citizen)
      await notify(citizen, id, `Report ${reference}: status is now Submitted.`, created, true);
    if (reached >= 1) {
      await event(id, dept, 'assigned', 'Assigned', 'Please inspect the site and report back.', step(1, 3));
      if (owner === citizen)
        await notify(citizen, id, `Report ${reference}: status is now Assigned.`, step(1, 3), true);
    }
    if (reached >= 2) {
      await event(
        id,
        officer,
        'status_changed',
        'In progress',
        'Team reached the site; work has started.',
        step(2, 6),
      );
      if (owner === citizen)
        await notify(
          citizen,
          id,
          `Report ${reference}: status is now In progress.`,
          step(2, 6),
          stage !== 'In progress',
        );
    }
    if (reached >= 3) {
      await event(id, officer, 'status_changed', 'Resolved', 'Work completed and checked on site.', doneAt);
      if (owner === citizen)
        await notify(
          citizen,
          id,
          `Report ${reference}: status is now Resolved.`,
          doneAt,
          stage !== 'Resolved',
        );
    }
    if (stage === 'Closed')
      await event(
        id,
        owner,
        'status_changed',
        'Closed',
        'Thank you, the problem is fixed.',
        new Date(doneAt.getTime() + 3600000),
      );
    if (stage === 'Reopened')
      await event(
        id,
        owner,
        'status_changed',
        'Reopened',
        'The dustbins are overflowing again this week.',
        new Date(Date.now() - 6 * 3600000),
      );
    if (level)
      await event(id, null, 'escalated', stage, `Service deadline passed. Escalation level ${level}.`, due);
  }
  // Ideas
  for (const [owner, category, title, description, status, reply, days] of [
    [
      citizen,
      'Public spaces',
      'Shaded seating at the bus stand',
      'Add shaded benches at the Roorkee bus stand for older passengers and families waiting in the heat.',
      'Accepted',
      'Thank you. Shaded seating is planned in the next quarter’s works.',
      20,
    ],
    [
      citizen,
      'Environment',
      'Tree plantation along the canal road',
      'Plant shade trees along the canal road walking path.',
      'Under review',
      'We are checking the available space with the irrigation department.',
      8,
    ],
    [
      others[0],
      'Digital services',
      'SMS alerts for water supply timings',
      'Send SMS alerts when water supply timings change in a ward.',
      'Submitted',
      null,
      1,
    ],
  ]) {
    const id = randomUUID(),
      t = ago(days);
    await db.query(
      'INSERT INTO ideas(id,reference,citizen_id,category,title,description,district,status,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      [
        id,
        ref('ID', id, t),
        owner,
        category,
        title,
        description,
        'haridwar',
        status,
        reply ? 2 : 1,
        iso(t),
        iso(t),
      ],
    );
    await db.query(
      'INSERT INTO idea_events(id,idea_id,actor_id,action,status,note,visible_to_citizen,created_at) VALUES(?,?,?,?,?,?,?,?)',
      [randomUUID(), id, owner, 'submitted', 'Submitted', 'Received by Batra Connect.', true, iso(t)],
    );
    if (reply)
      await db.query(
        'INSERT INTO idea_events(id,idea_id,actor_id,action,status,note,visible_to_citizen,created_at) VALUES(?,?,?,?,?,?,?,?)',
        [randomUUID(), id, dept, 'reviewed', status, reply, true, iso(ago(days - 2))],
      );
  }
  // Jan Samvad sessions (IST 10:00–13:00 on the next weekdays) and bookings
  const sessions = [];
  for (const offset of [1, 3, 6]) {
    const day = new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    });
    const id = randomUUID();
    sessions.push(id);
    await db.query(
      'INSERT INTO appointment_slots(id,location,district,starts_at,ends_at,capacity,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)',
      [
        id,
        'Camp office, Civil Lines, Roorkee (Demo)',
        'haridwar',
        iso(new Date(`${day}T10:00:00+05:30`)),
        iso(new Date(`${day}T13:00:00+05:30`)),
        15,
        dept,
        iso(ago(3)),
      ],
    );
  }
  for (const [owner, slot, subject, notes, status] of [
    [
      citizen,
      sessions[1],
      'Drainage in Adarsh Nagar',
      'I would like to discuss the yearly monsoon drain overflow in Adarsh Nagar and a permanent solution.',
      'Confirmed',
    ],
    [
      others[1],
      sessions[0],
      'Street lights in Ramnagar',
      'Several street lights in Ramnagar need replacement; residents have signed a request.',
      'Requested',
    ],
    [
      others[0],
      sessions[2],
      'Road safety near the bus stand',
      'Speed breakers and a zebra crossing are needed near the bus stand.',
      'Requested',
    ],
  ]) {
    const id = randomUUID(),
      t = ago(1);
    await db.query(
      'INSERT INTO appointments(id,reference,slot_id,citizen_id,subject,notes,status,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
      [
        id,
        ref('JS', id, t),
        slot,
        owner,
        subject,
        notes,
        status,
        status === 'Confirmed' ? 2 : 1,
        iso(t),
        iso(t),
      ],
    );
    if (owner === citizen)
      await db.query(
        'INSERT INTO notifications(id,user_id,link,message,read_at,created_at) VALUES(?,?,?,?,?,?)',
        [
          randomUUID(),
          citizen,
          `appointment:${id}`,
          `Jan Samvad appointment ${ref('JS', id, t)}: Confirmed.`,
          null,
          iso(ago(0, 5)),
        ],
      );
  }
  // One office announcement
  await db.query(
    'INSERT INTO content_entries(id,type,slug,data,status,sort,version,updated_by,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
    [
      randomUUID(),
      'announcement',
      'jan-samvad-sessions',
      JSON.stringify({
        title: { en: 'Jan Samvad sessions this week (Demo)', hi: 'इस सप्ताह जन संवाद सत्र (डेमो)' },
        summary: {
          en: 'Book a time in the app to meet the office at the Civil Lines camp office, Roorkee.',
          hi: 'रुड़की के सिविल लाइंस कैंप कार्यालय में मिलने के लिए ऐप में समय बुक करें।',
        },
        body: null,
        fields: {},
        mediaIds: [],
        sourceUrl: null,
      }),
      'published',
      0,
      1,
      admin,
      iso(ago(1)),
      iso(ago(1)),
      iso(ago(1)),
    ],
  );
  void minister;
  console.log(`Demo data ready. Password for every demo account: ${PASSWORD}`);
} finally {
  await db.close();
}
