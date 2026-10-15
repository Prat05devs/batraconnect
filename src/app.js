import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { digest, hashPassword, newToken, safeEqual, safeUser } from './security.js';
import { ApiError, requireCondition as check } from './validation.js';
import { createMediaStore } from './media-store.js';
import { createNotifier } from './notify.js';
import { createTransports } from './delivery.js';
import { createJobs } from './jobs.js';
import { PostgresRateStore } from './rate-store.js';
import { createSettings } from './settings.js';
import * as auth from './routes/auth.js';
import * as admin from './routes/admin.js';
import * as complaints from './routes/complaints.js';
import * as engagement from './routes/engagement.js';
import * as content from './routes/content.js';
import * as notifications from './routes/notifications.js';
import * as work from './routes/work.js';
import * as dashboard from './routes/dashboard.js';

export async function createApp({
  db,
  mediaDir = './data/media',
  s3 = null,
  origins = [],
  sessionDays = 7,
  trustProxyHops = 0,
  testing = false,
  requireVerified = true,
  requireClosureEvidence = true,
  retentionDays = 0,
  metricsToken = '',
  masterKey = '',
  production = false,
  delivery = { allowLog: true },
  transports: injectedTransports,
}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxyHops);
  const store = await createMediaStore({ mediaDir, s3 });
  const settings = createSettings({ db, masterKey, production });
  // Provider keys can change from the dashboard at any time; transports are rebuilt when they do.
  let built = { signature: null, value: null };
  const transports = injectedTransports
    ? () => Promise.resolve(injectedTransports)
    : async () => {
        const config = await settings.delivery(delivery),
          signature = testing ? 'testing' : JSON.stringify(config);
        if (signature !== built.signature)
          built = { signature, value: await createTransports(config, { testing }) };
        return built.value;
      };
  const notifier = createNotifier();
  const jobs = createJobs({ db, transports, notifier, store, options: { retentionDays } });
  const dummyHash = await hashPassword('dummy-password-for-timing-only');
  const metrics = { requests: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 } };
  app.use(helmet());
  app.use((req, res, next) => {
    req.id = randomUUID();
    res.set('X-Request-ID', req.id);
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      metrics.requests[`${String(res.statusCode)[0]}xx`]++;
      if (!testing)
        console.log(
          JSON.stringify({
            t: new Date().toISOString(),
            requestId: req.id,
            method: req.method,
            route: req.route?.path ?? req.path.replace(/[0-9a-f-]{36}/g, ':id'),
            status: res.statusCode,
            ms: Number(process.hrtime.bigint() - started) / 1e6,
          }),
        );
    });
    next();
  });
  app.use(
    cors({
      origin(origin, done) {
        if (!origin || origins.includes(origin)) done(null, true);
        else done(new ApiError(403, 'ORIGIN_DENIED', 'This web origin is not allowed.'));
      },
      exposedHeaders: ['X-Request-ID', 'Content-Disposition'],
    }),
  );
  app.use(express.json({ limit: '128kb' }));
  const limiter = (prefix, windowMs, limit) =>
    rateLimit({
      windowMs,
      limit: testing ? 100000 : limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      store: new PostgresRateStore(db, prefix),
      handler: (_req, _res, next) =>
        next(new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please wait and try again.')),
    });
  app.use('/api', limiter('api:', 60000, 240));
  const authLimit = limiter('auth:', 15 * 60000, 30);
  const now = () => new Date().toISOString();
  const one = async (sql, values, query = db.query) => (await query(sql, values))[0];
  const audit = (query, req, action, targetType = null, targetId = null, details = {}) =>
    query(
      'INSERT INTO audit_log(id,actor_id,action,target_type,target_id,details,ip,created_at) VALUES(?,?,?,?,?,?,?,?)',
      [
        randomUUID(),
        req.user?.id ?? null,
        action,
        targetType,
        targetId,
        JSON.stringify(details),
        req.ip ?? null,
        now(),
      ],
    );
  const jurisdictionsOf = (id, query = db.query) =>
    query('SELECT district,category FROM staff_jurisdictions WHERE user_id=? ORDER BY district,category', [
      id,
    ]);
  async function authenticate(req, _res, next) {
    const header = req.get('Authorization') ?? '';
    check(/^Bearer [A-Za-z0-9_-]{43}$/.test(header), 401, 'UNAUTHENTICATED', 'Please sign in.');
    req.tokenHash = digest(header.slice(7));
    const user = await one(
      `SELECT u.*,s.last_used_at AS session_used FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.status='active'`,
      [req.tokenHash, now()],
    );
    check(user, 401, 'UNAUTHENTICATED', 'Your session has expired. Please sign in.');
    user.jurisdictions = user.role === 'citizen' ? [] : await jurisdictionsOf(user.id);
    req.user = user;
    if (!user.session_used || Date.parse(user.session_used) < Date.now() - 5 * 60000)
      db.query('UPDATE sessions SET last_used_at=? WHERE token_hash=?', [now(), req.tokenHash]).catch(
        () => {},
      );
    next();
  }
  const roles =
    (...allowed) =>
    (req, _res, next) => {
      check(allowed.includes(req.user.role), 403, 'FORBIDDEN', 'You do not have permission for this action.');
      next();
    };
  // Executives (the minister's level) oversee; they do not send reports, ideas or bookings themselves.
  const resident = (req, _res, next) => {
    check(
      req.user.role !== 'executive',
      403,
      'OVERSIGHT_ONLY',
      'This account is for oversight. Reports, ideas and bookings are sent from resident or officer accounts.',
    );
    next();
  };
  // Dashboard switches: a feature can be turned off for citizens, for officers, or both.
  const feature = name => async (req, _res, next) => {
    const flags = await settings.get('features');
    check(
      flags[name]?.[req.user.role === 'citizen' ? 'citizens' : 'officers'] !== false,
      403,
      'FEATURE_OFF',
      'This service is currently unavailable. Please try again later.',
    );
    next();
  };
  const verified = (req, _res, next) => {
    check(
      !requireVerified ||
        req.user.role !== 'citizen' ||
        req.user.email_verified_at ||
        req.user.phone_verified_at,
      403,
      'VERIFICATION_REQUIRED',
      'Verify your email address or mobile number before sending this.',
    );
    next();
  };
  async function session(user, req, res, status = 200) {
    const token = newToken(),
      created = now(),
      expires = new Date(Date.now() + sessionDays * 86400000).toISOString();
    await db.query(
      'INSERT INTO sessions(token_hash,user_id,expires_at,created_at,last_used_at,user_agent) VALUES(?,?,?,?,?,?)',
      [
        digest(token),
        user.id,
        expires,
        created,
        created,
        (req.get('User-Agent') ?? '').slice(0, 200) || null,
      ],
    );
    res
      .set('Cache-Control', 'no-store')
      .status(status)
      .json({
        user: safeUser(user, user.role === 'citizen' ? [] : await jurisdictionsOf(user.id)),
        token,
        expiresAt: expires,
      });
  }
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 },
  });
  const ctx = {
    db,
    one,
    now,
    audit,
    check,
    roles,
    resident,
    feature,
    settings,
    verified,
    session,
    notifier,
    store,
    upload,
    jobs,
    transports,
    jurisdictionsOf,
    dummyHash,
    authLimit,
    options: { requireClosureEvidence, testing, sessionDays, delivery, production },
  };

  app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ status: 'ready', database: db.engine, media: store.kind });
  });
  app.get('/metrics', async (req, res) => {
    check(
      metricsToken && safeEqual(req.get('Authorization') ?? '', `Bearer ${metricsToken}`),
      404,
      'NOT_FOUND',
      'Endpoint not found.',
    );
    const outbox = await db.query(
      'SELECT channel,status,COUNT(*)::int AS n FROM outbox GROUP BY channel,status',
    );
    const runs = await db.query('SELECT name,last_finished_at,last_error FROM job_runs');
    const [open] = await db.query(
      `SELECT COUNT(*) FILTER (WHERE status NOT IN ('Resolved','Closed'))::int AS open, COUNT(*) FILTER (WHERE status NOT IN ('Resolved','Closed') AND due_at<?)::int AS overdue FROM complaints`,
      [now()],
    );
    const lines = [
      '# TYPE batra_http_responses_total counter',
      ...Object.entries(metrics.requests).map(([k, v]) => `batra_http_responses_total{class="${k}"} ${v}`),
      '# TYPE batra_outbox_messages gauge',
      ...outbox.map(r => `batra_outbox_messages{channel="${r.channel}",status="${r.status}"} ${r.n}`),
      '# TYPE batra_job_last_success_seconds gauge',
      ...runs.map(
        r =>
          `batra_job_last_success_seconds{job="${r.name}"} ${r.last_finished_at ? Date.parse(r.last_finished_at) / 1000 : 0}`,
      ),
      ...runs.map(r => `batra_job_failing{job="${r.name}"} ${r.last_error ? 1 : 0}`),
      '# TYPE batra_complaints_open gauge',
      `batra_complaints_open ${open.open}`,
      `batra_complaints_overdue ${open.overdue}`,
    ];
    res.type('text/plain; version=0.0.4').send(lines.join('\n') + '\n');
  });
  for (const module of [auth, admin, complaints, engagement, content, notifications, dashboard])
    module.publicRoutes?.(app, ctx);
  app.use('/api/v1', authenticate, (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  for (const module of [auth, admin, complaints, engagement, content, notifications, work, dashboard])
    module.routes?.(app, ctx);
  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Endpoint not found.')));
  app.use((error, req, res, _next) => {
    if (res.headersSent) return res.end();
    if (error instanceof multer.MulterError)
      error = new ApiError(400, 'INVALID_UPLOAD', 'Upload one JPEG, PNG, WebP or AVIF photo up to 10 MB.');
    if (error.type === 'entity.too.large')
      error = new ApiError(413, 'BODY_TOO_LARGE', 'Request is too large.');
    if (error instanceof SyntaxError && error.status === 400)
      error = new ApiError(400, 'INVALID_JSON', 'Request body must contain valid JSON.');
    if (error.code === '23505' && !(error instanceof ApiError))
      error = new ApiError(409, 'CONFLICT', 'This record already exists.');
    if (error.code === '23503' && !(error instanceof ApiError))
      error = new ApiError(400, 'INVALID_REFERENCE', 'A linked record does not exist.');
    const status =
      error instanceof ApiError || (error.status >= 400 && error.status < 500) ? error.status : 500;
    if (status >= 500 && !testing)
      console.error(
        JSON.stringify({
          requestId: req.id,
          code: error.code ?? 'SERVER_ERROR',
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 4).join(' | '),
        }),
      );
    res.status(status).json({
      error: {
        code: status >= 500 ? 'SERVER_ERROR' : (error.code ?? 'REQUEST_FAILED'),
        message: status >= 500 ? 'The server could not complete this request.' : error.message,
        requestId: req.id,
      },
    });
  });
  app.locals.jobs = jobs;
  app.locals.transports = injectedTransports ?? (await transports());
  app.locals.settings = settings;
  return app;
}
