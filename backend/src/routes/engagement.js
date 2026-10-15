import { randomUUID } from 'node:crypto';
import { messages } from '../messages.js';
import {
  parse,
  placeKey,
  idea,
  ideaReview,
  slot,
  booking,
  reschedule,
  appointmentDecision,
} from '../validation.js';
import { z } from 'zod';

const reference = (prefix, id, time) =>
  `${prefix}-${time.slice(0, 10).replaceAll('-', '')}-${id.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
const like = value => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
const ideaView = r => ({
  id: r.id,
  reference: r.reference,
  category: r.category,
  title: r.title,
  description: r.description,
  district: r.district,
  status: r.status,
  version: r.version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  ...(r.citizen_name ? { citizen: r.citizen_name } : {}),
});
const slotView = s => ({
  id: s.id,
  location: s.location,
  district: s.district,
  startsAt: s.starts_at,
  endsAt: s.ends_at,
  capacity: s.capacity,
  remaining: s.remaining ?? null,
  cancelled: !!s.cancelled_at,
});
const appointmentView = a => ({
  id: a.id,
  reference: a.reference,
  slotId: a.slot_id,
  subject: a.subject,
  notes: a.notes,
  status: a.status,
  officeNote: a.office_note,
  version: a.version,
  mine: !!a.mine,
  createdAt: a.created_at,
  updatedAt: a.updated_at,
  slot: a.starts_at
    ? { location: a.location, district: a.district, startsAt: a.starts_at, endsAt: a.ends_at }
    : null,
  ...(a.citizen_name ? { citizen: a.citizen_name, citizenPhone: a.citizen_phone } : {}),
});
const ACTIVE = `('Requested','Confirmed')`;

export function routes(app, ctx) {
  const { db, one, now, check, roles, resident, feature, verified, audit, notifier } = ctx;
  const office = roles('department', 'admin');
  const isOffice = user => ['department', 'admin', 'executive'].includes(user.role);
  // ---------- Ideas ----------
  app.post('/api/v1/ideas', resident, feature('ideas'), verified, async (req, res) => {
    const input = parse(idea, req.body);
    const district = placeKey(input.district);
    const result = await db.transaction(async query => {
      check(
        await one('SELECT 1 FROM districts WHERE key=?', [district], query),
        400,
        'INVALID_DISTRICT',
        'Choose an Uttarakhand district.',
      );
      // A retried send of the same idea within ten minutes returns the original instead of a duplicate.
      const duplicate = await one(
        'SELECT * FROM ideas WHERE citizen_id=? AND title=? AND description=? AND created_at>?',
        [req.user.id, input.title, input.description, new Date(Date.now() - 600000).toISOString()],
        query,
      );
      if (duplicate) return { row: duplicate, created: false };
      const [{ n }] = await query(
        'SELECT COUNT(*)::int AS n FROM ideas WHERE citizen_id=? AND created_at>?',
        [req.user.id, new Date(Date.now() - 86400000).toISOString()],
      );
      check(n < 10, 429, 'IDEA_LIMIT', 'You can send up to 10 ideas a day.');
      const id = randomUUID(),
        time = now();
      const row = {
        id,
        reference: reference('ID', id, time),
        citizen_id: req.user.id,
        category: input.category,
        title: input.title,
        description: input.description,
        district,
        status: 'Submitted',
        version: 1,
        created_at: time,
        updated_at: time,
      };
      await query(
        `INSERT INTO ideas(${Object.keys(row).join(',')}) VALUES(${Object.keys(row)
          .map(() => '?')
          .join(',')})`,
        Object.values(row),
      );
      await query(
        'INSERT INTO idea_events(id,idea_id,actor_id,action,status,note,visible_to_citizen,created_at) VALUES(?,?,?,?,?,?,?,?)',
        [randomUUID(), id, req.user.id, 'submitted', 'Submitted', 'Received by Batra Connect.', true, time],
      );
      return { row, created: true };
    });
    res.status(result.created ? 201 : 200).json({ idea: ideaView(result.row) });
  });
  app.get('/api/v1/ideas', async (req, res) => {
    const f = parse(
      z
        .object({
          own: z.enum(['true', 'false']).optional(),
          q: z.string().trim().max(100).optional(),
          status: z
            .enum(['Submitted', 'Under review', 'Accepted', 'Implemented', 'Not taken forward', 'Hidden'])
            .optional(),
          category: z.string().max(60).optional(),
          limit: z.coerce.number().int().min(1).max(100).default(30),
          offset: z.coerce.number().int().min(0).max(100000).default(0),
        })
        .strip(),
      req.query,
    );
    const personal = req.user.role === 'citizen' || f.own === 'true' || !isOffice(req.user);
    const where = [],
      values = [];
    if (personal) {
      where.push('i.citizen_id=?');
      values.push(req.user.id);
    }
    if (f.status) {
      where.push('i.status=?');
      values.push(f.status);
    } else if (!personal) where.push(`i.status<>'Hidden'`);
    if (f.category) {
      where.push('i.category=?');
      values.push(f.category);
    }
    if (f.q) {
      where.push('(i.title ILIKE ? OR i.description ILIKE ? OR i.reference ILIKE ?)');
      values.push(like(f.q), like(f.q), like(f.q));
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = (await one(`SELECT COUNT(*)::int AS n FROM ideas i ${clause}`, values)).n;
    const rows = await db.query(
      `SELECT i.*${personal ? '' : ',u.name AS citizen_name'} FROM ideas i JOIN users u ON u.id=i.citizen_id ${clause} ORDER BY i.created_at DESC,i.id LIMIT ? OFFSET ?`,
      [...values, f.limit, f.offset],
    );
    res.json({ ideas: rows.map(ideaView), total, limit: f.limit, offset: f.offset });
  });
  async function getIdea(req, query = db.query) {
    const row = await one(
      'SELECT i.*,u.name AS citizen_name FROM ideas i JOIN users u ON u.id=i.citizen_id WHERE i.id=?',
      [req.params.id],
      query,
    );
    check(
      row && (row.citizen_id === req.user.id || isOffice(req.user)),
      404,
      'NOT_FOUND',
      'Idea unavailable.',
    );
    if (row.citizen_id === req.user.id) delete row.citizen_name;
    return row;
  }
  async function ideaDetail(row, user) {
    const events = await db.query(
      `SELECT e.*,u.role FROM idea_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.idea_id=? ${row.citizen_id === user.id ? 'AND e.visible_to_citizen' : ''} ORDER BY e.created_at,e.id`,
      [row.id],
    );
    return {
      ...ideaView(row),
      mine: row.citizen_id === user.id,
      events: events.map(e => ({
        action: e.action,
        status: e.status,
        note: e.note,
        visibleToCitizen: e.visible_to_citizen,
        createdAt: e.created_at,
        fromOffice: e.role !== 'citizen',
      })),
    };
  }
  app.get('/api/v1/ideas/:id', async (req, res) =>
    res.json({ idea: await ideaDetail(await getIdea(req), req.user) }),
  );
  app.post('/api/v1/ideas/:id/review', office, async (req, res) => {
    const input = parse(ideaReview, req.body);
    const row = await db.transaction(async query => {
      const current = await getIdea(req, query);
      check(
        current.citizen_id !== req.user.id,
        403,
        'OWN_REPORT',
        'You cannot review an idea you submitted.',
      );
      const [updated] = await query(
        'UPDATE ideas SET status=?,version=version+1,updated_at=? WHERE id=? AND version=? RETURNING *',
        [input.status, now(), current.id, input.version],
      );
      check(updated, 409, 'VERSION_CONFLICT', 'This idea changed. Refresh before trying again.');
      const visible = input.status !== 'Hidden' && input.visibleToCitizen;
      await query(
        'INSERT INTO idea_events(id,idea_id,actor_id,action,status,note,visible_to_citizen,created_at) VALUES(?,?,?,?,?,?,?,?)',
        [
          randomUUID(),
          current.id,
          req.user.id,
          input.status === 'Hidden' ? 'moderated' : 'reviewed',
          input.status,
          input.note,
          visible,
          now(),
        ],
      );
      if (input.status === 'Hidden')
        await audit(query, req, 'idea.hidden', 'idea', current.id, { note: input.note });
      if (visible)
        await notifier.notify(
          query,
          current.citizen_id,
          messages.ideaStatus(current.reference, input.status),
          `idea:${current.id}`,
        );
      return updated;
    });
    res.json({ idea: await ideaDetail(row, req.user) });
  });
  // ---------- Jan Samvad appointments ----------
  const remaining = `s.capacity - (SELECT COUNT(*)::int FROM appointments a WHERE a.slot_id=s.id AND a.status IN ${ACTIVE})`;
  app.get('/api/v1/appointments/slots', async (req, res) => {
    const district =
      typeof req.query.district === 'string' && req.query.district ? placeKey(req.query.district) : null;
    const includePast = req.query.past === 'true' && isOffice(req.user);
    const rows = await db.query(
      `SELECT s.*,${remaining} AS remaining FROM appointment_slots s WHERE s.cancelled_at IS NULL ${includePast ? '' : 'AND s.starts_at>?'} ${district ? 'AND s.district=?' : ''} ORDER BY s.starts_at LIMIT 200`,
      [...(includePast ? [] : [now()]), ...(district ? [district] : [])],
    );
    res.json({ slots: rows.map(slotView) });
  });
  app.post('/api/v1/appointments/slots', office, async (req, res) => {
    const input = parse(slot, req.body);
    const district = placeKey(input.district);
    check(Date.parse(input.startsAt) > Date.now(), 400, 'INVALID_SLOT', 'Choose a future time.');
    const row = await db.transaction(async query => {
      check(
        await one('SELECT 1 FROM districts WHERE key=?', [district], query),
        400,
        'INVALID_DISTRICT',
        'Choose an Uttarakhand district.',
      );
      const [row] = await query(
        'INSERT INTO appointment_slots(id,location,district,starts_at,ends_at,capacity,created_by,created_at) VALUES(?,?,?,?,?,?,?,?) RETURNING *',
        [
          randomUUID(),
          input.location,
          district,
          new Date(input.startsAt).toISOString(),
          new Date(input.endsAt).toISOString(),
          input.capacity,
          req.user.id,
          now(),
        ],
      );
      await audit(query, req, 'appointment.slot_created', 'slot', row.id, slotView(row));
      return row;
    });
    res.status(201).json({ slot: slotView({ ...row, remaining: row.capacity }) });
  });
  app.delete('/api/v1/appointments/slots/:id', office, async (req, res) => {
    await db.transaction(async query => {
      const [row] = await query(
        'UPDATE appointment_slots SET cancelled_at=? WHERE id=? AND cancelled_at IS NULL RETURNING *',
        [now(), req.params.id],
      );
      check(row, 404, 'NOT_FOUND', 'Slot unavailable.');
      const affected = await query(
        `UPDATE appointments SET status='Cancelled',office_note='The office cancelled this session.',version=version+1,updated_at=? WHERE slot_id=? AND status IN ${ACTIVE} RETURNING *`,
        [now(), row.id],
      );
      for (const a of affected)
        await notifier.notify(
          query,
          a.citizen_id,
          messages.appointmentSlotCancelled(a.reference),
          `appointment:${a.id}`,
        );
      await audit(query, req, 'appointment.slot_cancelled', 'slot', row.id, { affected: affected.length });
    });
    res.status(204).end();
  });
  async function reserve(query, slotId, citizenId, exceptId = null) {
    const s = await one(
      `SELECT s.*,${remaining} AS remaining FROM appointment_slots s WHERE s.id=? AND s.cancelled_at IS NULL`,
      [slotId],
      query,
    );
    check(
      s && Date.parse(s.starts_at) > Date.now() + 3600000,
      400,
      'SLOT_UNAVAILABLE',
      'This time is no longer available. Choose another time.',
    );
    check(s.remaining > 0, 409, 'SLOT_FULL', 'This time is fully booked. Choose another time.');
    check(
      !(await one(
        `SELECT 1 FROM appointments WHERE slot_id=? AND citizen_id=? AND status IN ${ACTIVE} AND id<>?`,
        [slotId, citizenId, exceptId ?? ''],
        query,
      )),
      409,
      'ALREADY_BOOKED',
      'You already have an appointment at this time.',
    );
    return s;
  }
  async function getAppointment(req, query = db.query) {
    const row = await one(
      'SELECT a.*,s.location,s.district,s.starts_at,s.ends_at,u.name AS citizen_name,u.phone AS citizen_phone FROM appointments a JOIN appointment_slots s ON s.id=a.slot_id JOIN users u ON u.id=a.citizen_id WHERE a.id=?',
      [req.params.id],
      query,
    );
    check(
      row && (row.citizen_id === req.user.id || isOffice(req.user)),
      404,
      'NOT_FOUND',
      'Appointment unavailable.',
    );
    if (row.citizen_id === req.user.id) {
      delete row.citizen_name;
      delete row.citizen_phone;
    }
    row.mine = row.citizen_id === req.user.id;
    return row;
  }
  app.post('/api/v1/appointments', resident, feature('appointments'), verified, async (req, res) => {
    const input = parse(booking, req.body);
    const id = await db.transaction(async query => {
      const [{ n }] = await query(
        `SELECT COUNT(*)::int AS n FROM appointments a JOIN appointment_slots s ON s.id=a.slot_id WHERE a.citizen_id=? AND a.status IN ${ACTIVE} AND s.starts_at>?`,
        [req.user.id, now()],
      );
      check(
        n < 3,
        409,
        'APPOINTMENT_LIMIT',
        'You can hold up to 3 upcoming appointments. Cancel one to book another.',
      );
      await reserve(query, input.slotId, req.user.id);
      const id = randomUUID(),
        time = now();
      await query(
        'INSERT INTO appointments(id,reference,slot_id,citizen_id,subject,notes,status,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
        [
          id,
          reference('JS', id, time),
          input.slotId,
          req.user.id,
          input.subject,
          input.notes,
          'Requested',
          1,
          time,
          time,
        ],
      );
      return id;
    });
    res.status(201).json({ appointment: appointmentView(await getAppointment({ ...req, params: { id } })) });
  });
  app.get('/api/v1/appointments', async (req, res) => {
    const f = parse(
      z
        .object({
          own: z.enum(['true', 'false']).optional(),
          status: z
            .enum(['Requested', 'Confirmed', 'Declined', 'Cancelled', 'Completed', 'Missed'])
            .optional(),
          upcoming: z.enum(['true', 'false']).optional(),
          slotId: z.string().uuid().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(50),
          offset: z.coerce.number().int().min(0).max(100000).default(0),
        })
        .strip(),
      req.query,
    );
    const personal = req.user.role === 'citizen' || f.own === 'true' || !isOffice(req.user);
    const where = ['1=1'],
      values = [];
    if (personal) {
      where.push('a.citizen_id=?');
      values.push(req.user.id);
    }
    if (f.status) {
      where.push('a.status=?');
      values.push(f.status);
    }
    if (f.slotId) {
      where.push('a.slot_id=?');
      values.push(f.slotId);
    }
    if (f.upcoming === 'true') {
      where.push('s.starts_at>?');
      values.push(now());
    }
    const rows = await db.query(
      `SELECT a.*,s.location,s.district,s.starts_at,s.ends_at${personal ? '' : ',u.name AS citizen_name,u.phone AS citizen_phone'} FROM appointments a JOIN appointment_slots s ON s.id=a.slot_id JOIN users u ON u.id=a.citizen_id WHERE ${where.join(' AND ')} ORDER BY s.starts_at ${f.upcoming === 'true' ? 'ASC' : 'DESC'},a.id LIMIT ? OFFSET ?`,
      [...values, f.limit, f.offset],
    );
    res.json({ appointments: rows.map(appointmentView) });
  });
  app.get('/api/v1/appointments/:id', async (req, res) =>
    res.json({ appointment: appointmentView(await getAppointment(req)) }),
  );
  app.post('/api/v1/appointments/:id/cancel', async (req, res) => {
    const { version } = parse(z.object({ version: z.number().int().positive() }).strict(), req.body);
    await db.transaction(async query => {
      const current = await getAppointment(req, query);
      check(current.citizen_id === req.user.id, 404, 'NOT_FOUND', 'Appointment unavailable.');
      check(
        ['Requested', 'Confirmed'].includes(current.status) && Date.parse(current.starts_at) > Date.now(),
        409,
        'INVALID_STATE',
        'This appointment can no longer be cancelled.',
      );
      const [updated] = await query(
        `UPDATE appointments SET status='Cancelled',version=version+1,updated_at=? WHERE id=? AND version=? RETURNING id`,
        [now(), current.id, version],
      );
      check(updated, 409, 'VERSION_CONFLICT', 'This appointment changed. Refresh before trying again.');
    });
    res.json({ appointment: appointmentView(await getAppointment(req)) });
  });
  app.post('/api/v1/appointments/:id/reschedule', async (req, res) => {
    const input = parse(reschedule, req.body);
    await db.transaction(async query => {
      const current = await getAppointment(req, query);
      check(current.citizen_id === req.user.id, 404, 'NOT_FOUND', 'Appointment unavailable.');
      check(
        ['Requested', 'Confirmed'].includes(current.status),
        409,
        'INVALID_STATE',
        'Only requested or confirmed appointments can be rescheduled.',
      );
      check(input.slotId !== current.slot_id, 400, 'SAME_SLOT', 'Choose a different time.');
      await reserve(query, input.slotId, req.user.id, current.id);
      const [updated] = await query(
        `UPDATE appointments SET slot_id=?,status='Requested',reminder_sent_at=NULL,office_note=NULL,version=version+1,updated_at=? WHERE id=? AND version=? RETURNING id`,
        [input.slotId, now(), current.id, input.version],
      );
      check(updated, 409, 'VERSION_CONFLICT', 'This appointment changed. Refresh before trying again.');
    });
    res.json({ appointment: appointmentView(await getAppointment(req)) });
  });
  app.post('/api/v1/appointments/:id/decision', office, async (req, res) => {
    const input = parse(appointmentDecision, req.body);
    await db.transaction(async query => {
      const current = await getAppointment(req, query);
      check(
        current.citizen_id !== req.user.id,
        403,
        'OWN_REPORT',
        'You cannot decide on your own appointment.',
      );
      const started = Date.parse(current.starts_at) <= Date.now();
      const allowed =
        (current.status === 'Requested' && ['Confirmed', 'Declined'].includes(input.status) && !started) ||
        (current.status === 'Confirmed' &&
          ((input.status === 'Declined' && !started) ||
            (['Completed', 'Missed'].includes(input.status) && started)));
      check(
        allowed,
        409,
        'INVALID_STATE',
        'This decision is not available for the appointment at this time.',
      );
      const [updated] = await query(
        'UPDATE appointments SET status=?,office_note=?,version=version+1,updated_at=? WHERE id=? AND version=? RETURNING *',
        [input.status, input.note ?? current.office_note, now(), current.id, input.version],
      );
      check(updated, 409, 'VERSION_CONFLICT', 'This appointment changed. Refresh before trying again.');
      await audit(query, req, 'appointment.decision', 'appointment', current.id, { status: input.status });
      if (['Confirmed', 'Declined'].includes(input.status))
        await notifier.notify(
          query,
          current.citizen_id,
          messages.appointmentStatus(current.reference, input.status),
          `appointment:${current.id}`,
        );
    });
    res.json({ appointment: appointmentView(await getAppointment(req)) });
  });
}
