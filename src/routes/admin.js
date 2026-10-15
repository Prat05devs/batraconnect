import { randomUUID } from 'node:crypto';
import { hashPassword, newToken, safeUser } from '../security.js';
import { messages, subjects } from '../messages.js';
import {
  ApiError,
  parse,
  placeKey,
  staffRoles,
  staffCreate,
  staffUpdate,
  categoryUpdate,
  categoryCreate,
  wardUpdate,
  office,
} from '../validation.js';
import { codes } from './auth.js';
import { z } from 'zod';

const INVITE_HOURS = 72;
const categoryView = c => ({
  name: c.name,
  hindiName: c.hindi_name,
  scope: c.scope,
  slaHours: c.sla_hours,
  active: c.active,
  sort: c.sort,
});
const wardView = w => ({
  id: w.id,
  district: w.district,
  town: w.town,
  number: w.number,
  name: w.name,
  hindiName: w.hindi_name,
  localities: w.localities,
  verified: w.verified,
  active: w.active,
});
const officeView = o => ({
  id: o.id,
  name: o.name,
  hindiName: o.hindi_name,
  district: o.district,
  category: o.category,
  wardId: o.ward_id,
  phone: o.phone,
  email: o.email,
  address: o.address,
  hours: o.hours,
  active: o.active,
});
export { categoryView, wardView, officeView };

export function publicRoutes(app, { db }) {
  app.get('/api/v1/districts', async (_req, res) =>
    res.set('Cache-Control', 'public, max-age=3600').json({
      districts: (await db.query('SELECT key,name,hindi_name FROM districts ORDER BY name')).map(d => ({
        key: d.key,
        name: d.name,
        hindiName: d.hindi_name,
      })),
    }),
  );
  app.get('/api/v1/categories', async (_req, res) =>
    res.set('Cache-Control', 'public, max-age=600').json({
      categories: (await db.query('SELECT * FROM complaint_categories WHERE active ORDER BY sort,name')).map(
        categoryView,
      ),
    }),
  );
  app.get('/api/v1/wards', async (req, res) => {
    const town = typeof req.query.town === 'string' ? req.query.town : 'Roorkee';
    res.set('Cache-Control', 'public, max-age=600').json({
      wards: (await db.query('SELECT * FROM wards WHERE active AND town=? ORDER BY number', [town])).map(
        wardView,
      ),
    });
  });
  app.get('/api/v1/offices', async (req, res) => {
    const district = typeof req.query.district === 'string' ? placeKey(req.query.district) : null;
    res.set('Cache-Control', 'public, max-age=600').json({
      offices: (
        await db.query(
          `SELECT * FROM offices WHERE active ${district ? 'AND district=?' : ''} ORDER BY name`,
          district ? [district] : [],
        )
      ).map(officeView),
    });
  });
}

export function routes(app, ctx) {
  const { db, one, now, check, roles, audit, notifier, jurisdictionsOf } = ctx;
  const code = codes(ctx);
  const admin = roles('admin');
  async function validJurisdictions(query, list) {
    const normalized = [
      ...new Map(
        list.map(j => [
          `${placeKey(j.district)}|${j.category}`,
          { district: placeKey(j.district), category: j.category },
        ]),
      ).values(),
    ];
    for (const j of normalized) {
      check(
        await one('SELECT 1 FROM districts WHERE key=?', [j.district], query),
        400,
        'INVALID_DISTRICT',
        `Unknown district: ${j.district}.`,
      );
      check(
        await one('SELECT 1 FROM complaint_categories WHERE name=?', [j.category], query),
        400,
        'INVALID_CATEGORY',
        `Unknown category: ${j.category}.`,
      );
    }
    return normalized;
  }
  async function setJurisdictions(query, userId, list) {
    await query('DELETE FROM staff_jurisdictions WHERE user_id=?', [userId]);
    for (const j of list)
      await query('INSERT INTO staff_jurisdictions(user_id,district,category) VALUES(?,?,?)', [
        userId,
        j.district,
        j.category,
      ]);
  }
  async function invite(query, user) {
    const value = await code.issue(query, user, 'reset_password', user.email, 'email', INVITE_HOURS * 60);
    const language = user.language === 'hi' ? 'hi' : 'en';
    await notifier.outbox(query, {
      userId: user.id,
      channel: 'email',
      destination: user.email,
      subject: subjects.invite[language],
      body: messages.invite(value, INVITE_HOURS)[language],
      sensitive: true,
    });
  }
  const staffView = async (user, query = db.query) => ({
    ...safeUser(user, await jurisdictionsOf(user.id, query)),
    createdAt: user.created_at,
    openAssignments: Number(
      (
        await one(
          `SELECT COUNT(*)::int AS n FROM complaints WHERE assigned_to=? AND status NOT IN ('Resolved','Closed')`,
          [user.id],
          query,
        )
      ).n,
    ),
  });

  app.get('/api/v1/admin/users', admin, async (req, res) => {
    const f = parse(
      z
        .object({
          q: z.string().trim().max(100).optional(),
          role: z.enum(['citizen', ...staffRoles]).optional(),
          status: z.enum(['active', 'suspended', 'deleted']).optional(),
          limit: z.coerce.number().int().min(1).max(100).default(50),
          offset: z.coerce.number().int().min(0).max(100000).default(0),
        })
        .strip(),
      req.query,
    );
    const where = ['1=1'],
      values = [];
    if (f.q) {
      where.push('(name ILIKE ? OR email ILIKE ? OR phone ILIKE ?)');
      const like = `%${f.q.replace(/[\\%_]/g, '\\$&')}%`;
      values.push(like, like, like);
    }
    if (f.role) {
      where.push('role=?');
      values.push(f.role);
    } else where.push(`role<>'citizen'`);
    if (f.status) {
      where.push('status=?');
      values.push(f.status);
    } else where.push(`status<>'deleted'`);
    const total = (await one(`SELECT COUNT(*)::int AS n FROM users WHERE ${where.join(' AND ')}`, values)).n;
    const rows = await db.query(
      `SELECT * FROM users WHERE ${where.join(' AND ')} ORDER BY role,name LIMIT ? OFFSET ?`,
      [...values, f.limit, f.offset],
    );
    res.json({
      users: await Promise.all(rows.map(u => staffView(u))),
      total,
      limit: f.limit,
      offset: f.offset,
    });
  });
  app.post('/api/v1/admin/users', admin, async (req, res) => {
    const input = parse(staffCreate, req.body);
    const result = await db
      .transaction(async query => {
        const jurisdictions = await validJurisdictions(query, input.jurisdictions);
        check(
          !['field', 'department'].includes(input.role) || jurisdictions.length,
          400,
          'JURISDICTION_REQUIRED',
          'Field and department staff need at least one district and category.',
        );
        const user = {
          id: randomUUID(),
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          role: input.role,
          status: 'active',
          language: 'en',
          created_at: now(),
        };
        await query(
          'INSERT INTO users(id,name,email,password_hash,role,phone,status,language,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
          [
            user.id,
            user.name,
            user.email,
            await hashPassword(newToken()),
            user.role,
            user.phone,
            'active',
            'en',
            user.created_at,
            user.created_at,
          ],
        );
        await setJurisdictions(query, user.id, jurisdictions);
        await invite(query, user);
        await audit(query, req, 'admin.user_created', 'user', user.id, { role: user.role, jurisdictions });
        return staffView(user, query);
      })
      .catch(e => {
        if (e.code === '23505')
          throw new ApiError(
            409,
            e.constraint === 'users_phone' ? 'PHONE_EXISTS' : 'EMAIL_EXISTS',
            'An account already uses this email or mobile number.',
          );
        throw e;
      });
    res.status(201).json({ user: result });
  });
  app.patch('/api/v1/admin/users/:id', admin, async (req, res) => {
    const input = parse(staffUpdate, req.body);
    const result = await db.transaction(async query => {
      const current = await one(
        `SELECT * FROM users WHERE id=? AND status<>'deleted'`,
        [req.params.id],
        query,
      );
      check(current, 404, 'NOT_FOUND', 'User unavailable.');
      check(
        current.id !== req.user.id || (input.role === undefined && input.status === undefined),
        409,
        'SELF_CHANGE',
        'You cannot change your own role or status. Ask another administrator.',
      );
      check(
        current.role !== 'citizen' || input.role === undefined,
        400,
        'CITIZEN_ROLE',
        'Citizen accounts cannot be converted to staff. Create a separate staff account.',
      );
      const before = await staffView(current, query);
      const role = input.role ?? current.role;
      if (input.jurisdictions)
        await setJurisdictions(query, current.id, await validJurisdictions(query, input.jurisdictions));
      const scope = await jurisdictionsOf(current.id, query);
      check(
        !['field', 'department'].includes(role) || scope.length,
        400,
        'JURISDICTION_REQUIRED',
        'Field and department staff need at least one district and category.',
      );
      const [updated] = await query(
        'UPDATE users SET name=?,role=?,status=?,updated_at=? WHERE id=? RETURNING *',
        [input.name ?? current.name, role, input.status ?? current.status, now(), current.id],
      );
      if (
        input.status === 'suspended' ||
        (input.role !== undefined && input.role !== current.role) ||
        input.jurisdictions
      ) {
        await query('DELETE FROM sessions WHERE user_id=?', [current.id]);
      }
      if (input.status === 'suspended') await query('DELETE FROM push_tokens WHERE user_id=?', [current.id]);
      const after = await staffView(updated, query);
      await audit(query, req, 'admin.user_updated', 'user', current.id, {
        before: { role: before.role, status: before.status, jurisdictions: before.jurisdictions },
        after: { role: after.role, status: after.status, jurisdictions: after.jurisdictions },
      });
      return after;
    });
    res.json({ user: result });
  });
  app.post('/api/v1/admin/users/:id/invite', admin, async (req, res) => {
    await db.transaction(async query => {
      const user = await one(
        `SELECT * FROM users WHERE id=? AND status='active' AND role<>'citizen'`,
        [req.params.id],
        query,
      );
      check(user, 404, 'NOT_FOUND', 'Staff account unavailable.');
      await invite(query, user);
      await audit(query, req, 'admin.invite_sent', 'user', user.id);
    });
    res.status(202).json({ status: 'sent' });
  });
  app.get('/api/v1/admin/audit', admin, async (req, res) => {
    const f = parse(
      z
        .object({
          actorId: z.string().uuid().optional(),
          action: z.string().max(60).optional(),
          targetId: z.string().max(60).optional(),
          limit: z.coerce.number().int().min(1).max(200).default(50),
          offset: z.coerce.number().int().min(0).max(100000).default(0),
        })
        .strip(),
      req.query,
    );
    const where = ['1=1'],
      values = [];
    if (f.actorId) {
      where.push('a.actor_id=?');
      values.push(f.actorId);
    }
    if (f.action) {
      where.push('a.action LIKE ?');
      values.push(`${f.action.replace(/[\\%_]/g, '\\$&')}%`);
    }
    if (f.targetId) {
      where.push('a.target_id=?');
      values.push(f.targetId);
    }
    const rows = await db.query(
      `SELECT a.*,u.name AS actor_name,u.role AS actor_role FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC,a.id LIMIT ? OFFSET ?`,
      [...values, f.limit, f.offset],
    );
    res.json({
      entries: rows.map(r => ({
        id: r.id,
        action: r.action,
        actor: r.actor_id ? { id: r.actor_id, name: r.actor_name, role: r.actor_role } : null,
        targetType: r.target_type,
        targetId: r.target_id,
        details: r.details,
        ip: r.ip,
        createdAt: r.created_at,
      })),
    });
  });
  app.get('/api/v1/admin/categories', admin, async (_req, res) =>
    res.json({
      categories: (await db.query('SELECT * FROM complaint_categories ORDER BY sort,name')).map(categoryView),
    }),
  );
  app.post('/api/v1/admin/categories', admin, async (req, res) => {
    const input = parse(categoryCreate, req.body);
    const [row] = await db.transaction(async query => {
      const rows = await query(
        'INSERT INTO complaint_categories(name,hindi_name,scope,sla_hours,sort) VALUES(?,?,?,?,?) RETURNING *',
        [input.name, input.hindiName, input.scope, input.slaHours, input.sort],
      );
      await audit(query, req, 'admin.category_created', 'category', input.name, input);
      return rows;
    });
    res.status(201).json({ category: categoryView(row) });
  });
  app.patch('/api/v1/admin/categories/:name', admin, async (req, res) => {
    const input = parse(categoryUpdate, req.body);
    const row = await db.transaction(async query => {
      const current = await one('SELECT * FROM complaint_categories WHERE name=?', [req.params.name], query);
      check(current, 404, 'NOT_FOUND', 'Category unavailable.');
      const [row] = await query(
        'UPDATE complaint_categories SET hindi_name=?,sla_hours=?,active=?,scope=?,sort=? WHERE name=? RETURNING *',
        [
          input.hindiName ?? current.hindi_name,
          input.slaHours ?? current.sla_hours,
          input.active ?? current.active,
          input.scope ?? current.scope,
          input.sort ?? current.sort,
          current.name,
        ],
      );
      await audit(query, req, 'admin.category_updated', 'category', current.name, {
        before: categoryView(current),
        after: categoryView(row),
      });
      return row;
    });
    res.json({ category: categoryView(row) });
  });
  app.patch('/api/v1/admin/wards/:id', admin, async (req, res) => {
    const input = parse(wardUpdate, req.body);
    const row = await db.transaction(async query => {
      const current = await one('SELECT * FROM wards WHERE id=?', [req.params.id], query);
      check(current, 404, 'NOT_FOUND', 'Ward unavailable.');
      const [row] = await query(
        'UPDATE wards SET name=?,hindi_name=?,localities=?,verified=?,active=?,updated_at=? WHERE id=? RETURNING *',
        [
          input.name ?? current.name,
          input.hindiName === undefined ? current.hindi_name : input.hindiName,
          input.localities ?? current.localities,
          input.verified ?? current.verified,
          input.active ?? current.active,
          now(),
          current.id,
        ],
      );
      await audit(query, req, 'admin.ward_updated', 'ward', current.id, {
        before: wardView(current),
        after: wardView(row),
      });
      return row;
    });
    res.json({ ward: wardView(row) });
  });
  async function saveOffice(req, id) {
    const input = parse(office, req.body);
    const district = placeKey(input.district);
    return db.transaction(async query => {
      check(
        await one('SELECT 1 FROM districts WHERE key=?', [district], query),
        400,
        'INVALID_DISTRICT',
        'Unknown district.',
      );
      if (input.category)
        check(
          await one('SELECT 1 FROM complaint_categories WHERE name=?', [input.category], query),
          400,
          'INVALID_CATEGORY',
          'Unknown category.',
        );
      if (input.wardId)
        check(
          await one('SELECT 1 FROM wards WHERE id=? AND district=?', [input.wardId, district], query),
          400,
          'INVALID_WARD',
          'This ward is not in the selected district.',
        );
      const values = [
        input.name,
        input.hindiName ?? null,
        district,
        input.category ?? null,
        input.wardId ?? null,
        input.phone ?? null,
        input.email ?? null,
        input.address ?? null,
        input.hours ?? null,
        input.active,
        now(),
      ];
      const [row] = id
        ? await query(
            'UPDATE offices SET name=?,hindi_name=?,district=?,category=?,ward_id=?,phone=?,email=?,address=?,hours=?,active=?,updated_at=? WHERE id=? RETURNING *',
            [...values, id],
          )
        : await query(
            'INSERT INTO offices(name,hindi_name,district,category,ward_id,phone,email,address,hours,active,updated_at,id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *',
            [...values, randomUUID()],
          );
      check(row, 404, 'NOT_FOUND', 'Office unavailable.');
      await audit(
        query,
        req,
        id ? 'admin.office_updated' : 'admin.office_created',
        'office',
        row.id,
        officeView(row),
      );
      return row;
    });
  }
  app.post('/api/v1/admin/offices', admin, async (req, res) =>
    res.status(201).json({ office: officeView(await saveOffice(req)) }),
  );
  app.put('/api/v1/admin/offices/:id', admin, async (req, res) =>
    res.json({ office: officeView(await saveOffice(req, req.params.id)) }),
  );
}
