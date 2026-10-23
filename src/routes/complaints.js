import { randomUUID } from 'node:crypto';
import { digest } from '../security.js';
import { messages } from '../messages.js';
import { normalizeImage } from '../media-store.js';
import {
  parse,
  placeKey,
  complaint,
  assignment,
  transition,
  complaintFilters,
  canRead,
  covers,
  complaintView,
} from '../validation.js';
import { officeView, wardView } from './admin.js';
import { z } from 'zod';

const OPEN = `status NOT IN ('Resolved','Closed')`;
const like = value => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
const roleLabel = {
  citizen: 'Citizen',
  field: 'Field officer',
  department: 'Department',
  executive: 'Executive',
  admin: 'Office administrator',
};

export function routes(app, ctx) {
  const {
    db,
    one,
    now,
    check,
    roles,
    resident,
    feature,
    settings,
    verified,
    audit,
    notifier,
    store,
    upload,
    options,
  } = ctx;
  const staffRoles = ['field', 'department', 'admin'];
  // ---------- Media ----------
  app.post(
    '/api/v1/media',
    roles('citizen', 'field', 'department', 'admin'),
    upload.single('photo'),
    async (req, res) => {
      const bytes = req.file?.buffer;
      check(bytes?.length, 400, 'PHOTO_REQUIRED', 'Choose a photo.');
      // Citizens (and officers reporting as residents) upload evidence; officers upload proof of completed work; the admin uploads content photos.
      const purpose =
        req.user.role === 'citizen' || req.query.purpose === 'evidence'
          ? 'evidence'
          : req.query.purpose === 'gallery' && req.user.role === 'admin'
            ? 'gallery'
            : 'resolution';
      const [{ n }] = await db.query(
        'SELECT COUNT(*)::int AS n FROM media WHERE owner_id=? AND complaint_id IS NULL AND content_id IS NULL AND created_at>?',
        [req.user.id, new Date(Date.now() - 86400000).toISOString()],
      );
      check(
        n < 30,
        429,
        'UPLOAD_QUOTA',
        'Too many unattached photos. Send or discard your current report first.',
      );
      const image = await normalizeImage(bytes);
      const id = randomUUID(),
        filename = `${id}.jpg`;
      await store.put(filename, image.data, image.mimeType);
      try {
        await db.query(
          'INSERT INTO media(id,owner_id,complaint_id,filename,mime_type,size,created_at,purpose) VALUES(?,?,?,?,?,?,?,?)',
          [id, req.user.id, null, filename, image.mimeType, image.data.length, now(), purpose],
        );
      } catch (e) {
        await store.delete(filename).catch(() => {});
        throw e;
      }
      res.status(201).json({
        media: {
          id,
          mimeType: image.mimeType,
          size: image.data.length,
          width: image.width,
          height: image.height,
          purpose,
        },
      });
    },
  );
  app.get('/api/v1/media/:id', async (req, res) => {
    const media = await one('SELECT * FROM media WHERE id=?', [req.params.id]);
    check(media, 404, 'NOT_FOUND', 'Photo unavailable.');
    let allowed =
      media.owner_id === req.user.id || (media.purpose === 'gallery' && req.user.role === 'admin');
    if (!allowed && media.complaint_id) {
      const row = await one('SELECT * FROM complaints WHERE id=?', [media.complaint_id]);
      allowed = row && canRead(req.user, row);
    }
    if (!allowed && media.content_id)
      allowed = !!(await one(`SELECT 1 FROM content_entries WHERE id=? AND status='published'`, [
        media.content_id,
      ]));
    check(allowed, 404, 'NOT_FOUND', 'Photo unavailable.');
    const data = await store.get(media.filename);
    check(data, 404, 'NOT_FOUND', 'Photo unavailable.');
    res
      .type(media.mime_type)
      .set({ 'Content-Disposition': 'inline', 'Cache-Control': 'private, max-age=3600' })
      .send(data);
  });
  // ---------- Complaints ----------
  async function event(query, row, user, action, note, mediaIds = []) {
    const time = now();
    await query(
      'INSERT INTO complaint_events(id,complaint_id,actor_id,action,status,note,created_at,media_ids) VALUES(?,?,?,?,?,?,?,?)',
      [randomUUID(), row.id, user.id, action, row.status, note, time, mediaIds],
    );
    const link = `complaint:${row.id}`,
      text = messages.complaintStatus(row.reference, row.status);
    if (user.id !== row.citizen_id || action === 'submitted')
      await notifier.notify(query, row.citizen_id, text, link);
    if (user.id === row.citizen_id && action !== 'submitted') {
      if (row.assigned_to) await notifier.notify(query, row.assigned_to, text, link);
      await notifier.notifyMany(
        query,
        `SELECT DISTINCT u.id FROM users u JOIN staff_jurisdictions j ON j.user_id=u.id WHERE u.status='active' AND u.role='department' AND j.district=? AND j.category=?`,
        [row.district, row.category],
        text,
        link,
      );
    }
  }
  async function getComplaint(req, query = db.query) {
    const row = await one('SELECT * FROM complaints WHERE id=?', [req.params.id], query);
    check(row && canRead(req.user, row), 404, 'NOT_FOUND', 'Report unavailable.');
    return row;
  }
  /** Most specific active office for the report: ward+category, ward, district+category, then district. */
  async function responsibleOffice(row) {
    return one(
      `SELECT * FROM offices WHERE active AND district=? AND (category=? OR category IS NULL) AND (ward_id=? OR ward_id IS NULL)
   ORDER BY (ward_id IS NOT NULL) DESC,(category IS NOT NULL) DESC,name LIMIT 1`,
      [row.district, row.category, row.ward_id ?? null],
    );
  }
  async function detail(row, user) {
    const media = await db.query(
      'SELECT id,mime_type,size,purpose FROM media WHERE complaint_id=? ORDER BY created_at',
      [row.id],
    );
    const events = await db.query(
      'SELECT e.action,e.status,e.note,e.created_at,e.media_ids,u.name,u.role FROM complaint_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.complaint_id=? ORDER BY e.created_at,e.id',
      [row.id],
    );
    const staff = user.role !== 'citizen' && row.citizen_id !== user.id;
    const office = await responsibleOffice(row),
      ward = row.ward_id ? await one('SELECT * FROM wards WHERE id=?', [row.ward_id]) : null;
    const assignee =
      staff && row.assigned_to ? await one('SELECT id,name FROM users WHERE id=?', [row.assigned_to]) : null;
    return {
      ...complaintView(row),
      media: media.map(m => ({ id: m.id, mimeType: m.mime_type, size: m.size, purpose: m.purpose })),
      events: events.map(e => ({
        action: e.action,
        status: e.status,
        note: e.note,
        createdAt: e.created_at,
        mediaIds: e.media_ids,
        actor: e.role ? (staff ? `${e.name} · ${roleLabel[e.role]}` : roleLabel[e.role]) : 'Batra Connect',
      })),
      office: office ? officeView(office) : null,
      ward: ward ? wardView(ward) : null,
      assignee,
      mine: row.citizen_id === user.id,
    };
  }
  /** Attaches the caller's unattached photos in one statement, so two requests can never claim the same photo. */
  async function bindMedia(query, user, ids, purpose, complaintId) {
    if (!ids.length) return;
    const claimed = await query(
      'UPDATE media SET complaint_id=? WHERE id = ANY(?::text[]) AND owner_id=? AND purpose=? AND complaint_id IS NULL AND content_id IS NULL RETURNING id',
      [complaintId, ids, user.id, purpose],
    );
    check(claimed.length === ids.length, 400, 'INVALID_MEDIA', 'A photo is unavailable or already attached.');
  }
  app.post('/api/v1/complaints', resident, feature('reports'), verified, async (req, res) => {
    const input = parse(complaint, req.body),
      key = req.get('Idempotency-Key');
    check(
      key && /^[A-Za-z0-9_-]{16,100}$/.test(key),
      400,
      'IDEMPOTENCY_REQUIRED',
      'Provide an Idempotency-Key of 16–100 characters.',
    );
    const hash = digest(JSON.stringify(input));
    const result = await db.transaction(async query => {
      const previous = await one(
        'SELECT * FROM idempotency WHERE user_id=? AND request_key=?',
        [req.user.id, key],
        query,
      );
      if (previous) {
        check(
          previous.payload_hash === hash,
          409,
          'IDEMPOTENCY_CONFLICT',
          'This request key was used for a different report.',
        );
        return {
          row: await one('SELECT * FROM complaints WHERE id=?', [previous.complaint_id], query),
          created: false,
        };
      }
      const category = await one(
        'SELECT * FROM complaint_categories WHERE name=? AND active',
        [input.category],
        query,
      );
      check(category, 400, 'INVALID_CATEGORY', 'Choose an available category.');
      let district = placeKey(input.district),
        ward = null;
      if (input.wardId) {
        ward = await one('SELECT * FROM wards WHERE id=? AND active', [input.wardId], query);
        check(ward, 400, 'INVALID_WARD', 'Choose an available ward.');
        district = ward.district;
      }
      check(
        await one('SELECT 1 FROM districts WHERE key=?', [district], query),
        400,
        'INVALID_DISTRICT',
        'Choose an Uttarakhand district.',
      );
      const id = randomUUID(),
        time = now(),
        reference = `BC-${time.slice(0, 10).replaceAll('-', '')}-${id.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
      const due = new Date(Date.parse(time) + category.sla_hours * 3600000).toISOString();
      const row = {
        id,
        reference,
        citizen_id: req.user.id,
        category: category.name,
        title: input.title,
        description: input.description,
        district,
        locality: input.locality,
        status: 'Submitted',
        assigned_to: null,
        version: 1,
        resolution: null,
        created_at: time,
        updated_at: time,
        ward_id: ward?.id ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        due_at: due,
        escalation_level: 0,
      };
      await query(
        `INSERT INTO complaints(${Object.keys(row).join(',')}) VALUES(${Object.keys(row)
          .map(() => '?')
          .join(',')})`,
        Object.values(row),
      );
      await bindMedia(query, req.user, input.mediaIds, 'evidence', id);
      await query('INSERT INTO idempotency(user_id,request_key,payload_hash,complaint_id) VALUES(?,?,?,?)', [
        req.user.id,
        key,
        hash,
        id,
      ]);
      await event(query, row, req.user, 'submitted', 'Received by Batra Connect.');
      await notifier.notifyMany(
        query,
        `SELECT DISTINCT u.id FROM users u JOIN staff_jurisdictions j ON j.user_id=u.id WHERE u.status='active' AND u.role='department' AND j.district=? AND j.category=?`,
        [district, category.name],
        messages.complaintNew(reference, category.name),
        `complaint:${id}`,
      );
      return { row, created: true };
    });
    res.status(result.created ? 201 : 200).json({
      complaint: await detail(result.row, req.user),
      receipt: 'Batra Connect server receipt; not a government-system acknowledgement.',
    });
  });
  function scope(user) {
    if (user.role === 'citizen') return ['citizen_id=?', [user.id]];
    if (user.role === 'field') return ['assigned_to=?', [user.id]];
    if (user.role === 'department')
      return [
        'EXISTS (SELECT 1 FROM staff_jurisdictions j WHERE j.user_id=? AND j.district=complaints.district AND j.category=complaints.category)',
        [user.id],
      ];
    return ['1=1', []];
  }
  function filtered(user, f) {
    // own=true: reports this person sent as a resident, whatever their staff role.
    const [base, scoped] = f.own === 'true' ? ['citizen_id=?', [user.id]] : scope(user);
    const where = [base],
      values = [...scoped];
    if (f.q) {
      where.push('(title ILIKE ? OR reference ILIKE ? OR locality ILIKE ? OR description ILIKE ?)');
      values.push(...Array(4).fill(like(f.q)));
    }
    for (const [key, column] of [
      ['status', 'status'],
      ['category', 'category'],
      ['wardId', 'ward_id'],
    ])
      if (f[key]) {
        where.push(`${column}=?`);
        values.push(f[key]);
      }
    if (f.district) {
      where.push('district=?');
      values.push(placeKey(f.district));
    }
    if (f.overdue === 'true') {
      where.push(`${OPEN} AND due_at<?`);
      values.push(now());
    }
    if (f.escalated === 'true') where.push(`escalation_level>0 AND ${OPEN}`);
    if (f.mine === 'true') {
      where.push('assigned_to=?');
      values.push(user.id);
    }
    if (f.from) {
      where.push('created_at>=?');
      values.push(new Date(f.from).toISOString());
    }
    if (f.to) {
      where.push('created_at<?');
      values.push(new Date(f.to).toISOString());
    }
    return [where.join(' AND '), values];
  }
  app.get('/api/v1/complaints', async (req, res) => {
    const f = parse(complaintFilters, req.query);
    const [where, values] = filtered(req.user, f);
    const order = {
      newest: 'created_at DESC,id',
      oldest: 'created_at ASC,id',
      due: `CASE WHEN ${OPEN} THEN 0 ELSE 1 END,due_at ASC NULLS LAST,id`,
    }[f.sort];
    const total = await one(`SELECT COUNT(*) AS total FROM complaints WHERE ${where}`, values);
    const rows = await db.query(
      `SELECT * FROM complaints WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...values, f.limit, f.offset],
    );
    res.json({
      complaints: rows.map(complaintView),
      total: Number(total.total),
      limit: f.limit,
      offset: f.offset,
    });
  });
  app.get('/api/v1/complaints/:id', async (req, res) =>
    res.json({ complaint: await detail(await getComplaint(req), req.user) }),
  );
  app.get('/api/v1/staff', roles('admin', 'department'), async (req, res) => {
    const complaintId = typeof req.query.complaintId === 'string' ? req.query.complaintId : null;
    let target = null;
    if (complaintId) {
      target = await one('SELECT * FROM complaints WHERE id=?', [complaintId]);
      check(target && canRead(req.user, target), 404, 'NOT_FOUND', 'Report unavailable.');
    }
    const where = [`u.role='field'`, `u.status='active'`],
      values = [];
    if (target) {
      where.push('j.district=? AND j.category=?');
      values.push(target.district, target.category);
    }
    if (req.user.role === 'department') {
      where.push(
        'EXISTS (SELECT 1 FROM staff_jurisdictions mine WHERE mine.user_id=? AND mine.district=j.district AND mine.category=j.category)',
      );
      values.push(req.user.id);
    }
    const rows = await db.query(
      `SELECT u.id,u.name,u.role,MIN(j.district) AS district,MIN(j.category) AS category,
   (SELECT COUNT(*)::int FROM complaints c WHERE c.assigned_to=u.id AND c.${OPEN}) AS open_assignments,
   (SELECT COUNT(*)::int FROM complaints c WHERE c.assigned_to=u.id AND c.${OPEN} AND c.due_at<?) AS overdue_assignments
   FROM users u JOIN staff_jurisdictions j ON j.user_id=u.id WHERE ${where.join(' AND ')} GROUP BY u.id ORDER BY open_assignments,u.name`,
      [now(), ...values],
    );
    res.json({
      staff: rows.map(r => ({
        id: r.id,
        name: r.name,
        role: r.role,
        district: r.district,
        category: r.category,
        openAssignments: r.open_assignments,
        overdueAssignments: r.overdue_assignments,
      })),
    });
  });
  app.post('/api/v1/complaints/:id/assign', roles('department', 'admin'), async (req, res) => {
    const input = parse(assignment, req.body);
    const row = await db.transaction(async query => {
      const current = await getComplaint(req, query);
      check(
        current.citizen_id !== req.user.id,
        403,
        'OWN_REPORT',
        'You cannot act on a report you submitted. Another officer must handle it.',
      );
      check(
        ['Submitted', 'Assigned', 'Reopened', 'In progress'].includes(current.status),
        409,
        'INVALID_STATE',
        'This report cannot be assigned at its current stage.',
      );
      const assignee = await one(
        `SELECT * FROM users WHERE id=? AND role='field' AND status='active'`,
        [input.assigneeId],
        query,
      );
      const scope = assignee
        ? await query('SELECT district,category FROM staff_jurisdictions WHERE user_id=?', [assignee.id])
        : [];
      check(
        assignee && covers({ jurisdictions: scope }, current),
        400,
        'INVALID_ASSIGNEE',
        'Choose a field officer responsible for this district and category.',
      );
      const updated = await one(
        `UPDATE complaints SET assigned_to=?,status='Assigned',version=version+1,updated_at=? WHERE id=? AND version=? RETURNING *`,
        [assignee.id, now(), current.id, input.version],
        query,
      );
      check(updated, 409, 'VERSION_CONFLICT', 'This report changed. Refresh before trying again.');
      await event(
        query,
        updated,
        req.user,
        current.assigned_to && current.assigned_to !== assignee.id ? 'reassigned' : 'assigned',
        input.note,
      );
      await notifier.notify(
        query,
        assignee.id,
        messages.complaintAssignedToYou(updated.reference),
        `complaint:${updated.id}`,
      );
      return updated;
    });
    res.json({ complaint: await detail(row, req.user) });
  });
  app.post('/api/v1/complaints/:id/status', async (req, res) => {
    const input = parse(transition, req.body);
    const row = await db.transaction(async query => {
      const current = await getComplaint(req, query);
      const citizen = current.citizen_id === req.user.id,
        staff = staffRoles.includes(req.user.role) && !citizen;
      const allowed =
        (citizen && current.status === 'Resolved' && ['Closed', 'Reopened'].includes(input.status)) ||
        (staff && ['Assigned', 'Reopened'].includes(current.status) && input.status === 'In progress') ||
        (staff && current.status === 'In progress' && input.status === 'Resolved');
      check(
        allowed,
        403,
        'TRANSITION_DENIED',
        'This status change is not allowed for your role or the current report stage.',
      );
      // Closure photo: required unless switched off in the dashboard (or for the whole server by configuration).
      const closureRule =
        (await settings.get('app')).requireClosureEvidence && options.requireClosureEvidence;
      check(
        input.status !== 'Resolved' || !closureRule || input.mediaIds.length > 0,
        400,
        'EVIDENCE_REQUIRED',
        'Attach at least one photo showing the completed work.',
      );
      check(
        input.status === 'Resolved' || !input.mediaIds.length,
        400,
        'INVALID_MEDIA',
        'Photos can only be attached when resolving.',
      );
      await bindMedia(query, req.user, input.mediaIds, 'resolution', current.id);
      let extra = '',
        values = [];
      if (input.status === 'Resolved') {
        extra = ',resolved_at=?';
        values = [now()];
      }
      if (input.status === 'Reopened') {
        const { sla_hours } = (await one(
          'SELECT sla_hours FROM complaint_categories WHERE name=?',
          [current.category],
          query,
        )) ?? { sla_hours: 168 };
        extra = ',due_at=?,escalation_level=0,resolved_at=NULL';
        values = [new Date(Date.now() + sla_hours * 3600000).toISOString()];
      }
      const updated = await one(
        `UPDATE complaints SET status=?,resolution=?,version=version+1,updated_at=?${extra} WHERE id=? AND version=? RETURNING *`,
        [
          input.status,
          input.status === 'Resolved' ? input.note : current.resolution,
          now(),
          ...values,
          current.id,
          input.version,
        ],
        query,
      );
      check(updated, 409, 'VERSION_CONFLICT', 'This report changed. Refresh before trying again.');
      await event(query, updated, req.user, 'status_changed', input.note, input.mediaIds);
      return updated;
    });
    res.json({ complaint: await detail(row, req.user) });
  });
  // ---------- Insights ----------
  const analysts = roles('field', 'department', 'executive', 'admin');
  app.get('/api/v1/insights', analysts, async (req, res) => {
    const [where, values] = scope(req.user);
    const time = now();
    const counts = await db.query(
      `SELECT status,COUNT(*) AS count FROM complaints WHERE ${where} GROUP BY status`,
      values,
    );
    const group = column =>
      db.query(
        `SELECT ${column} AS key,COUNT(*)::int AS total,COUNT(*) FILTER (WHERE ${OPEN})::int AS open,
   COUNT(*) FILTER (WHERE ${OPEN} AND due_at<?)::int AS overdue,
   ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at::timestamptz - created_at::timestamptz))/3600) FILTER (WHERE resolved_at IS NOT NULL))::int AS avg_resolution_hours,
   COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at<=due_at)::int AS within_sla, COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::int AS resolved
   FROM complaints WHERE ${where} GROUP BY ${column} ORDER BY total DESC,key`,
        [time, ...values],
      );
    const shape = rows =>
      rows.map(r => ({
        key: r.key,
        total: r.total,
        open: r.open,
        overdue: r.overdue,
        avgResolutionHours: r.avg_resolution_hours,
        withinSlaPercent: r.resolved ? Math.round((r.within_sla * 100) / r.resolved) : null,
      }));
    const since = new Date(Date.now() - 12 * 7 * 86400000).toISOString();
    const trend = await db.query(
      `SELECT to_char(date_trunc('week',w),'YYYY-MM-DD') AS week,
   (SELECT COUNT(*)::int FROM complaints WHERE ${where} AND date_trunc('week',created_at::timestamptz)=date_trunc('week',w)) AS created,
   (SELECT COUNT(*)::int FROM complaints WHERE ${where} AND resolved_at IS NOT NULL AND date_trunc('week',resolved_at::timestamptz)=date_trunc('week',w)) AS resolved
   FROM generate_series(date_trunc('week',?::timestamptz),date_trunc('week',now()),interval '1 week') AS w ORDER BY w`,
      [...values, ...values, since],
    );
    const [totals] = await db.query(
      `SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE ${OPEN})::int AS open,COUNT(*) FILTER (WHERE ${OPEN} AND due_at<?)::int AS overdue,COUNT(*) FILTER (WHERE ${OPEN} AND escalation_level>0)::int AS escalated FROM complaints WHERE ${where}`,
      [time, ...values],
    );
    const engagement = ['executive', 'admin'].includes(req.user.role)
      ? {
          ideas: await db.query(`SELECT status,COUNT(*)::int AS count FROM ideas GROUP BY status`),
          appointments: await db.query(
            `SELECT a.status,COUNT(*)::int AS count FROM appointments a JOIN appointment_slots s ON s.id=a.slot_id WHERE s.starts_at>=? GROUP BY a.status`,
            [new Date(Date.now() - 30 * 86400000).toISOString()],
          ),
        }
      : null;
    res.json({
      byStatus: counts.map(r => ({ status: r.status, count: Number(r.count) })),
      totals,
      byCategory: shape(await group('category')),
      byDistrict: shape(await group('district')),
      trend,
      engagement,
    });
  });
  app.get('/api/v1/insights/export.csv', roles('department', 'executive', 'admin'), async (req, res) => {
    const f = parse(
      complaintFilters.extend({ limit: z.coerce.number().int().min(1).max(10000).default(10000) }),
      req.query,
    );
    const [where, values] = filtered(req.user, f);
    const rows = await db.query(
      `SELECT reference,category,district,(SELECT name FROM wards w WHERE w.id=complaints.ward_id) AS ward,status,created_at,due_at,resolved_at,escalation_level FROM complaints WHERE ${where} ORDER BY created_at DESC LIMIT ?`,
      [...values, f.limit],
    );
    const cell = v => {
      const s = v === null || v === undefined ? '' : String(v);
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
    };
    const header = [
      'reference',
      'category',
      'district',
      'ward',
      'status',
      'created_at',
      'due_at',
      'resolved_at',
      'escalation_level',
    ];
    await audit(db.query, req, 'insights.exported', 'complaints', null, { rows: rows.length, filters: f });
    res
      .type('text/csv; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="batra-connect-reports-${now().slice(0, 10)}.csv"`)
      .send(
        '﻿' + [header, ...rows.map(r => header.map(k => r[k]))].map(r => r.map(cell).join(',')).join('\r\n'),
      );
  });
}
