import { randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword, safeUser, newCode, codeHash, safeEqual } from '../security.js';
import {
  ApiError,
  parse,
  registration,
  login,
  otpRequest,
  otpVerify,
  verifyRequest,
  verifyConfirm,
  forgot,
  reset,
  accountUpdate,
  passwordChange,
  accountDelete,
} from '../validation.js';

const TTL = { verify_email: 30, verify_phone: 10, reset_password: 15, login: 10 };
const MAX_ATTEMPTS = 5,
  MAX_CODES_PER_HOUR = 5;

/** Shared one-time-code issue/verify. Attempt counters are written outside any caller transaction so failures persist. */
export function codes({ db, one, now, notifier }) {
  async function issue(query, user, purpose, destination, channel, ttlMinutes = TTL[purpose]) {
    const [{ n }] = await query(
      'SELECT COUNT(*)::int AS n FROM one_time_codes WHERE user_id=? AND purpose=? AND created_at>?',
      [user.id, purpose, new Date(Date.now() - 3600000).toISOString()],
    );
    if (n >= MAX_CODES_PER_HOUR)
      throw new ApiError(
        429,
        'TOO_MANY_CODES',
        'Too many codes were requested. Please wait an hour and try again.',
      );
    await query(
      'UPDATE one_time_codes SET consumed_at=? WHERE user_id=? AND purpose=? AND consumed_at IS NULL',
      [now(), user.id, purpose],
    );
    const id = randomUUID(),
      value = newCode();
    await query(
      'INSERT INTO one_time_codes(id,user_id,purpose,destination,code_hash,attempts,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)',
      [
        id,
        user.id,
        purpose,
        destination,
        codeHash(id, value),
        0,
        new Date(Date.now() + ttlMinutes * 60000).toISOString(),
        now(),
      ],
    );
    return value;
  }
  async function send(query, user, purpose, destination, channel, ttlMinutes = TTL[purpose]) {
    const value = await issue(query, user, purpose, destination, channel, ttlMinutes);
    await notifier.sendCode(query, user, purpose, destination, value, ttlMinutes, channel);
  }
  async function consume(userId, purpose, destination, value) {
    const row = await one(
      'SELECT * FROM one_time_codes WHERE user_id=? AND purpose=? AND destination=? AND consumed_at IS NULL AND expires_at>? ORDER BY created_at DESC LIMIT 1',
      [userId ?? '', purpose, destination, now()],
    );
    const invalid = new ApiError(
      400,
      'INVALID_CODE',
      'This code is incorrect or has expired. Request a new code.',
    );
    if (!row) throw invalid;
    // Claim an attempt atomically before comparing, so parallel guesses cannot exceed the limit.
    const [attempt] = await db.query(
      'UPDATE one_time_codes SET attempts=attempts+1 WHERE id=? AND attempts<? AND consumed_at IS NULL RETURNING id',
      [row.id, MAX_ATTEMPTS],
    );
    if (!attempt || !safeEqual(codeHash(row.id, value), row.code_hash)) throw invalid;
    const [used] = await db.query(
      'UPDATE one_time_codes SET consumed_at=? WHERE id=? AND consumed_at IS NULL RETURNING id',
      [now(), row.id],
    );
    if (!used) throw invalid;
  }
  return { send, issue, consume };
}

/** An email or mobile number that another account already uses becomes a clear 409 instead of the generic conflict. */
function contactTaken(e, emailMessage) {
  if (e.code !== '23505') throw e;
  const phone = e.constraint === 'users_phone';
  throw new ApiError(
    409,
    phone ? 'PHONE_EXISTS' : 'EMAIL_EXISTS',
    phone ? 'An account already uses this mobile number.' : emailMessage,
  );
}

export function publicRoutes(app, ctx) {
  const { db, one, now, check, session, authLimit, dummyHash, audit } = ctx;
  const code = codes(ctx);
  const quietly = async fn => {
    try {
      await fn();
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    }
  };
  app.post('/api/v1/auth/register', authLimit, async (req, res) => {
    const input = parse(registration, req.body);
    const hash = await hashPassword(input.password);
    const user = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      password_hash: hash,
      role: 'citizen',
      created_at: now(),
      phone: input.phone ?? null,
      status: 'active',
      language: req.get('Accept-Language')?.startsWith('hi') ? 'hi' : 'en',
    };
    await db
      .transaction(async query => {
        await query(
          'INSERT INTO users(id,name,email,password_hash,role,created_at,phone,status,language,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
          [...Object.values(user), user.created_at],
        );
        await code.send(query, user, 'verify_email', user.email, 'email');
      })
      .catch(e => contactTaken(e, 'An account already uses this email. Please sign in.'));
    await session(user, req, res, 201);
  });
  app.post('/api/v1/auth/login', authLimit, async (req, res) => {
    const input = parse(login, req.body);
    const user = await one(`SELECT * FROM users WHERE email=? AND status<>'deleted'`, [input.email]);
    const valid = await verifyPassword(input.password, user?.password_hash ?? dummyHash);
    check(user && valid, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    check(
      user.status === 'active',
      403,
      'ACCOUNT_SUSPENDED',
      'This account is suspended. Contact the Batra Connect office.',
    );
    await session(user, req, res);
  });
  app.post('/api/v1/auth/password/forgot', authLimit, async (req, res) => {
    const input = parse(forgot, req.body);
    const user = await one(`SELECT * FROM users WHERE email=? AND status='active'`, [input.email]);
    if (user)
      await quietly(() =>
        db.transaction(query => code.send(query, user, 'reset_password', user.email, 'email')),
      );
    res
      .status(202)
      .json({ status: 'sent', message: 'If an account uses this email, a reset code has been sent.' });
  });
  app.post('/api/v1/auth/password/reset', authLimit, async (req, res) => {
    const input = parse(reset, req.body);
    const user = await one(`SELECT * FROM users WHERE email=? AND status='active'`, [input.email]);
    await code.consume(user?.id, 'reset_password', input.email, input.code);
    const hash = await hashPassword(input.password);
    await db.transaction(async query => {
      await query(
        'UPDATE users SET password_hash=?,email_verified_at=COALESCE(email_verified_at,?),updated_at=? WHERE id=?',
        [hash, now(), now(), user.id],
      );
      await query('DELETE FROM sessions WHERE user_id=?', [user.id]);
      await audit(query, { user, ip: req.ip }, 'auth.password_reset', 'user', user.id);
    });
    await session({ ...user, email_verified_at: user.email_verified_at ?? now() }, req, res);
  });
  app.post('/api/v1/auth/otp/request', authLimit, async (req, res) => {
    const { destination } = parse(otpRequest, req.body);
    const byEmail = destination.includes('@');
    const user = await one(
      `SELECT * FROM users WHERE ${byEmail ? 'email=? AND email_verified_at IS NOT NULL' : 'phone=? AND phone_verified_at IS NOT NULL'} AND status='active'`,
      [destination],
    );
    if (user)
      await quietly(() =>
        db.transaction(query => code.send(query, user, 'login', destination, byEmail ? 'email' : 'sms')),
      );
    res.status(202).json({
      status: 'sent',
      message: 'If this email or verified mobile number has an account, a sign-in code has been sent.',
    });
  });
  app.post('/api/v1/auth/otp/verify', authLimit, async (req, res) => {
    const { destination, code: value } = parse(otpVerify, req.body);
    const byEmail = destination.includes('@');
    const user = await one(
      `SELECT * FROM users WHERE ${byEmail ? 'email=?' : 'phone=?'} AND status='active'`,
      [destination],
    );
    await code.consume(user?.id, 'login', destination, value);
    await session(user, req, res);
  });
}

export function routes(app, ctx) {
  const { db, now, check, audit } = ctx;
  const code = codes(ctx);
  const view = req => safeUser(req.user);
  app.get('/api/v1/auth/me', (req, res) => res.json({ user: view(req) }));
  app.post('/api/v1/auth/logout', async (req, res) => {
    await db.query('DELETE FROM sessions WHERE token_hash=?', [req.tokenHash]);
    res.status(204).end();
  });
  app.post('/api/v1/auth/verify/request', ctx.authLimit, async (req, res) => {
    const { channel } = parse(verifyRequest, req.body);
    const email = channel === 'email';
    check(email || req.user.phone, 400, 'PHONE_REQUIRED', 'Add a mobile number to your account first.');
    check(
      !(email ? req.user.email_verified_at : req.user.phone_verified_at),
      409,
      'ALREADY_VERIFIED',
      'This contact is already verified.',
    );
    await db.transaction(query =>
      code.send(
        query,
        req.user,
        email ? 'verify_email' : 'verify_phone',
        email ? req.user.email : req.user.phone,
        email ? 'email' : 'sms',
      ),
    );
    res.status(202).json({ status: 'sent' });
  });
  app.post('/api/v1/auth/verify/confirm', ctx.authLimit, async (req, res) => {
    const { channel, code: value } = parse(verifyConfirm, req.body);
    const email = channel === 'email';
    await code.consume(
      req.user.id,
      email ? 'verify_email' : 'verify_phone',
      email ? req.user.email : (req.user.phone ?? ''),
      value,
    );
    const [user] = await db.query(
      `UPDATE users SET ${email ? 'email_verified_at' : 'phone_verified_at'}=?,updated_at=? WHERE id=? RETURNING *`,
      [now(), now(), req.user.id],
    );
    res.json({ user: safeUser(user, req.user.jurisdictions) });
  });
  app.patch('/api/v1/account', async (req, res) => {
    const input = parse(accountUpdate, req.body);
    if (input.email && input.email !== req.user.email) {
      check(
        await verifyPassword(input.currentPassword, req.user.password_hash),
        403,
        'INVALID_CREDENTIALS',
        'Current password is incorrect.',
      );
    }
    const changes = [],
      values = [];
    if (input.name !== undefined) {
      changes.push('name=?');
      values.push(input.name);
    }
    if (input.language !== undefined) {
      changes.push('language=?');
      values.push(input.language);
    }
    if (input.phone !== undefined && input.phone !== req.user.phone) {
      changes.push('phone=?', 'phone_verified_at=NULL');
      values.push(input.phone);
    }
    if (input.email !== undefined && input.email !== req.user.email) {
      changes.push('email=?', 'email_verified_at=NULL');
      values.push(input.email);
    }
    if (!changes.length) return res.json({ user: view(req) });
    const user = await db
      .transaction(async query => {
        const [updated] = await query(
          `UPDATE users SET ${changes.join(',')},updated_at=? WHERE id=? RETURNING *`,
          [...values, now(), req.user.id],
        );
        if (input.email && input.email !== req.user.email) {
          await code.send(query, updated, 'verify_email', updated.email, 'email');
          await audit(query, req, 'account.email_changed', 'user', updated.id);
        }
        return updated;
      })
      .catch(e => contactTaken(e, 'An account already uses this email.'));
    res.json({ user: safeUser(user, req.user.jurisdictions) });
  });
  app.post('/api/v1/account/password', ctx.authLimit, async (req, res) => {
    const input = parse(passwordChange, req.body);
    check(
      await verifyPassword(input.currentPassword, req.user.password_hash),
      403,
      'INVALID_CREDENTIALS',
      'Current password is incorrect.',
    );
    const hash = await hashPassword(input.newPassword);
    await db.transaction(async query => {
      await query('UPDATE users SET password_hash=?,updated_at=? WHERE id=?', [hash, now(), req.user.id]);
      await query('DELETE FROM sessions WHERE user_id=? AND token_hash<>?', [req.user.id, req.tokenHash]);
      await audit(query, req, 'account.password_changed', 'user', req.user.id);
    });
    res.status(204).end();
  });
  app.get('/api/v1/account/sessions', async (req, res) => {
    const rows = await db.query(
      'SELECT token_hash,created_at,last_used_at,expires_at,user_agent FROM sessions WHERE user_id=? AND expires_at>? ORDER BY last_used_at DESC NULLS LAST',
      [req.user.id, now()],
    );
    res.json({
      sessions: rows.map(s => ({
        id: s.token_hash.slice(0, 16),
        current: s.token_hash === req.tokenHash,
        createdAt: s.created_at,
        lastUsedAt: s.last_used_at,
        expiresAt: s.expires_at,
        device: s.user_agent,
      })),
    });
  });
  app.post('/api/v1/account/sessions/revoke-others', async (req, res) => {
    await db.query('DELETE FROM sessions WHERE user_id=? AND token_hash<>?', [req.user.id, req.tokenHash]);
    res.status(204).end();
  });
  app.get('/api/v1/account/export', async (req, res) => {
    const id = req.user.id;
    const data = {
      exportedAt: now(),
      account: view(req),
      complaints: await db.query(
        'SELECT reference,category,title,description,district,locality,ward_id,latitude,longitude,status,resolution,created_at,updated_at FROM complaints WHERE citizen_id=? ORDER BY created_at',
        [id],
      ),
      complaintActivity: await db.query(
        'SELECT c.reference,e.action,e.status,e.note,e.created_at FROM complaint_events e JOIN complaints c ON c.id=e.complaint_id WHERE c.citizen_id=? ORDER BY e.created_at',
        [id],
      ),
      ideas: await db.query(
        'SELECT reference,category,title,description,district,status,created_at FROM ideas WHERE citizen_id=? ORDER BY created_at',
        [id],
      ),
      appointments: await db.query(
        'SELECT a.reference,a.subject,a.notes,a.status,a.office_note,s.location,s.starts_at FROM appointments a JOIN appointment_slots s ON s.id=a.slot_id WHERE a.citizen_id=? ORDER BY a.created_at',
        [id],
      ),
      notifications: await db.query(
        'SELECT message,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at',
        [id],
      ),
      notificationPreferences:
        (await db.query('SELECT push,email,sms FROM notification_preferences WHERE user_id=?', [id]))[0] ??
        null,
    };
    await audit(db.query, req, 'account.exported', 'user', id);
    res.set('Content-Disposition', 'attachment; filename="batra-connect-account.json"').json(data);
  });
  app.delete('/api/v1/account', ctx.authLimit, async (req, res) => {
    const input = parse(accountDelete, req.body);
    check(
      req.user.role === 'citizen',
      403,
      'STAFF_ACCOUNT',
      'Staff accounts are closed by an administrator.',
    );
    check(
      await verifyPassword(input.password, req.user.password_hash),
      403,
      'INVALID_CREDENTIALS',
      'Password is incorrect.',
    );
    const id = req.user.id;
    await db.transaction(async query => {
      await query(
        `UPDATE users SET name='Deleted account',email=?,phone=NULL,password_hash='!deleted',status='deleted',email_verified_at=NULL,phone_verified_at=NULL,updated_at=? WHERE id=?`,
        [`deleted-${id}@deleted.invalid`, now(), id],
      );
      for (const table of [
        'sessions',
        'push_tokens',
        'notification_preferences',
        'one_time_codes',
        'notifications',
      ])
        await query(`DELETE FROM ${table} WHERE user_id=?`, [id]);
      await query(
        `UPDATE appointments SET status='Cancelled',office_note='Account deleted',version=version+1,updated_at=? WHERE citizen_id=? AND status IN ('Requested','Confirmed')`,
        [now(), id],
      );
      // What the person wrote about themselves goes; the anonymous report of a public problem stays (privacy policy).
      await query(`UPDATE appointments SET subject='[Removed]',notes='' WHERE citizen_id=?`, [id]);
      await query(`UPDATE outbox SET status='skipped',body=NULL WHERE user_id=? AND status='pending'`, [id]);
      await audit(query, req, 'account.deleted', 'user', id);
    });
    res.status(204).end();
  });
}
