import { z } from 'zod';
import { hashPassword } from '../security.js';
import { createTransports } from '../delivery.js';
import { definitions } from '../settings.js';
import { parse, password } from '../validation.js';

const INTEGRATIONS = ['email', 'sms', 'push'];
// Loopback and private-network addresses: seeing one for a real visitor means TRUST_PROXY_HOPS is too low.
const privateAddress = ip =>
  /^(::ffff:)?(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|^::1$|^f[cd]/i.test(ip ?? '');

/** Public: what the mobile app needs to know at launch (feature switches, maintenance banner). */
export function publicRoutes(app, { settings }) {
  app.get('/api/v1/config', async (_req, res) => {
    const app_ = await settings.get('app');
    res
      .set('Cache-Control', 'public, max-age=30')
      .json({ features: await settings.get('features'), maintenanceMessage: app_.maintenanceMessage });
  });
}

/** Web dashboard (administrators only): settings, provider keys, system health, message log, password resets. */
export function routes(app, ctx) {
  const { db, one, now, check, roles, audit, settings, options, authLimit } = ctx;
  const admin = roles('admin');
  app.get('/api/v1/admin/settings', admin, async (_req, res) =>
    res.json({ features: await settings.view('features'), app: await settings.view('app') }),
  );
  app.put('/api/v1/admin/settings/:name', admin, async (req, res) => {
    const name = req.params.name;
    check(['features', 'app'].includes(name), 404, 'NOT_FOUND', 'Unknown setting.');
    const value = parse(definitions[name].schema, req.body);
    await db.transaction(async query => {
      await settings.save(query, name, value, null, req.user.id);
      await audit(query, req, 'settings.updated', 'setting', name, value);
    });
    res.json({ [name]: await settings.view(name) });
  });
  app.post('/api/v1/admin/settings/:name/restore', admin, async (req, res) => {
    const name = req.params.name;
    check(definitions[name], 404, 'NOT_FOUND', 'Unknown setting.');
    const restored = await db.transaction(async query => {
      const done = await settings.restorePrevious(query, name, req.user.id);
      if (done) await audit(query, req, 'settings.restored', 'setting', name);
      return done;
    });
    check(restored, 409, 'NO_HISTORY', 'There is no earlier version to restore.');
    res.json({ [name]: await settings.view(name) });
  });
  app.get('/api/v1/admin/integrations', admin, async (_req, res) => {
    const out = {};
    for (const n of INTEGRATIONS)
      out[n] = {
        ...(await settings.view(`integration.${n}`)),
        source: await settings.source(`integration.${n}`, options.delivery),
      };
    res.json({ integrations: out });
  });
  app.put('/api/v1/admin/integrations/:name', admin, async (req, res) => {
    const name = req.params.name;
    check(INTEGRATIONS.includes(name), 404, 'NOT_FOUND', 'Unknown integration.');
    const def = definitions[`integration.${name}`];
    const body = parse(
      z
        .object({
          values: z.record(z.string(), z.string()).default({}),
          secrets: z.record(z.string(), z.string()).default({}),
        })
        .strict(),
      req.body,
    );
    const values = parse(def.schema.partial(), body.values),
      secrets = parse(def.secrets ?? z.object({}).strict(), body.secrets);
    await db.transaction(async query => {
      await settings.save(query, `integration.${name}`, values, secrets, req.user.id);
      // Never log key values, only which fields changed.
      await audit(query, req, 'integration.updated', 'integration', name, {
        fields: [...Object.keys(values), ...Object.keys(secrets)],
      });
    });
    res.json({
      integration: {
        ...(await settings.view(`integration.${name}`)),
        source: await settings.source(`integration.${name}`, options.delivery),
      },
    });
  });
  // Test messages can cost money (SMS), so they share the tight sign-in limit.
  app.post('/api/v1/admin/integrations/:name/test', admin, authLimit, async (req, res) => {
    const name = req.params.name;
    check(INTEGRATIONS.includes(name), 404, 'NOT_FOUND', 'Unknown integration.');
    const { to } = parse(z.object({ to: z.string().trim().min(3).max(300) }).strict(), req.body);
    const transports = await createTransports(await settings.delivery(options.delivery), {
      testing: options.testing,
    });
    const channel = name === 'email' ? transports.email : name === 'sms' ? transports.sms : transports.push;
    if (!channel) return res.json({ ok: false, error: `No ${name} provider is configured.` });
    const result = await channel({
      destination: to,
      subject: 'Batra Connect test message',
      body: `This is a test ${name} message from the Batra Connect dashboard, sent ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`,
      data: {},
    }).catch(e => ({ ok: false, error: e.message }));
    await audit(db.query, req, 'integration.tested', 'integration', name, { ok: !!result.ok });
    res.json({ ok: !!result.ok, error: result.ok ? null : String(result.error ?? 'Sending failed') });
  });
  app.get('/api/v1/admin/health', admin, async (req, res) => {
    const day = new Date(Date.now() - 86400000).toISOString(),
      week = new Date(Date.now() - 7 * 86400000).toISOString();
    const jobs = await db.query(
      'SELECT name,last_started_at,last_finished_at,last_error,runs FROM job_runs ORDER BY name',
    );
    const deliveries = await db.query(
      `SELECT channel,status,COUNT(*)::int AS n FROM outbox WHERE created_at>? GROUP BY channel,status`,
      [day],
    );
    const { failed } = await one(
      `SELECT COUNT(*)::int AS failed FROM outbox WHERE status IN ('failed','skipped') AND created_at>?`,
      [week],
    );
    const providers = {};
    for (const n of INTEGRATIONS) providers[n] = await settings.source(`integration.${n}`, options.delivery);
    const counts = await one(
      `SELECT (SELECT COUNT(*)::int FROM users WHERE role='citizen' AND status='active') AS citizens,(SELECT COUNT(*)::int FROM users WHERE role<>'citizen' AND status='active') AS staff,(SELECT COUNT(*)::int FROM complaints) AS reports`,
    );
    res.json({
      database: 'ok',
      checkedAt: now(),
      providers,
      devLogging: !!options.delivery.allowLog,
      // Rate limits and the audit log rely on the real visitor address; behind a host's proxy this checks it.
      yourAddress: req.ip,
      proxyMisconfigured: !!options.production && privateAddress(req.ip),
      jobs: jobs.map(j => ({
        name: j.name,
        lastFinishedAt: j.last_finished_at,
        lastError: j.last_error,
        runs: j.runs,
      })),
      deliveriesLast24h: deliveries,
      failedLast7d: failed,
      counts,
    });
  });
  app.get('/api/v1/admin/deliveries', admin, async (req, res) => {
    const f = parse(
      z
        .object({
          status: z.enum(['pending', 'sent', 'failed', 'skipped']).optional(),
          channel: z.enum(['email', 'sms', 'push']).optional(),
          q: z.string().trim().max(200).optional(),
          limit: z.coerce.number().int().min(1).max(200).default(100),
        })
        .strip(),
      req.query,
    );
    const where = ['1=1'],
      values = [];
    if (f.status) {
      where.push('status=?');
      values.push(f.status);
    }
    if (f.channel) {
      where.push('channel=?');
      values.push(f.channel);
    }
    if (f.q) {
      where.push('destination ILIKE ?');
      values.push(`%${f.q.replace(/[\\%_]/g, '\\$&')}%`);
    }
    const rows = await db.query(
      `SELECT id,channel,destination,subject,body,sensitive,status,attempts,last_error,created_at,sent_at FROM outbox WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?`,
      [...values, f.limit],
    );
    res.json({
      deliveries: rows.map(r => ({
        id: r.id,
        channel: r.channel,
        destination: r.destination,
        subject: r.subject,
        body: r.sensitive ? null : r.body,
        isCode: r.sensitive,
        status: r.status,
        attempts: r.attempts,
        error: r.last_error,
        createdAt: r.created_at,
        sentAt: r.sent_at,
      })),
    });
  });
  app.post('/api/v1/admin/deliveries/:id/resend', admin, async (req, res) => {
    const row = await one('SELECT * FROM outbox WHERE id=?', [req.params.id]);
    check(row, 404, 'NOT_FOUND', 'Message not found.');
    check(
      !row.sensitive,
      400,
      'CODE_NOT_RESENT',
      'Sign-in and verification codes are never resent. Ask the person to request a new code in the app.',
    );
    await db.query(
      `UPDATE outbox SET status='pending',attempts=0,last_error=NULL,next_attempt_at=? WHERE id=?`,
      [now(), row.id],
    );
    await audit(db.query, req, 'delivery.resent', 'delivery', row.id, { channel: row.channel });
    res.status(202).json({ status: 'queued' });
  });
  app.post('/api/v1/admin/users/:id/password', admin, async (req, res) => {
    const { password: next } = parse(z.object({ password }).strict(), req.body);
    check(
      req.params.id !== req.user.id,
      400,
      'USE_ACCOUNT_PAGE',
      'Change your own password from your account page.',
    );
    const target = await one(`SELECT id,role FROM users WHERE id=? AND status<>'deleted'`, [req.params.id]);
    check(target, 404, 'NOT_FOUND', 'User unavailable.');
    const hash = await hashPassword(next);
    await db.transaction(async query => {
      await query('UPDATE users SET password_hash=?,updated_at=? WHERE id=?', [hash, now(), target.id]);
      await query('DELETE FROM sessions WHERE user_id=?', [target.id]);
      await audit(query, req, 'admin.password_reset', 'user', target.id, { role: target.role });
    });
    res.status(204).end();
  });
}
