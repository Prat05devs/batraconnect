import { parse, pushToken, preferences } from '../validation.js';
import { z } from 'zod';

const view = n => ({
  id: n.id,
  link: n.link,
  message: n.message,
  read_at: n.read_at,
  created_at: n.created_at,
});

export function routes(app, { db, one, now, check }) {
  app.get('/api/v1/notifications', async (req, res) => {
    const { limit } = parse(
      z.object({ limit: z.coerce.number().int().min(1).max(200).default(100) }).strip(),
      req.query,
    );
    const rows = await db.query(
      'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ?',
      [req.user.id, limit],
    );
    const { n } = await one(
      'SELECT COUNT(*)::int AS n FROM notifications WHERE user_id=? AND read_at IS NULL',
      [req.user.id],
    );
    res.json({ notifications: rows.map(view), unread: n });
  });
  app.post('/api/v1/notifications/read-all', async (req, res) => {
    await db.query('UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL', [
      now(),
      req.user.id,
    ]);
    res.status(204).end();
  });
  app.post('/api/v1/notifications/:id/read', async (req, res) => {
    const row = await one(
      'UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=? RETURNING id',
      [now(), req.params.id, req.user.id],
    );
    check(row, 404, 'NOT_FOUND', 'Notification unavailable.');
    res.status(204).end();
  });
  app.post('/api/v1/push-tokens', async (req, res) => {
    const input = parse(pushToken, req.body);
    // A device token moves to whichever account last signed in on that device.
    await db.query(
      'INSERT INTO push_tokens(token,user_id,platform,created_at,last_seen_at) VALUES(?,?,?,?,?) ON CONFLICT(token) DO UPDATE SET user_id=EXCLUDED.user_id,platform=EXCLUDED.platform,last_seen_at=EXCLUDED.last_seen_at',
      [input.token, req.user.id, input.platform, now(), now()],
    );
    res.status(204).end();
  });
  app.delete('/api/v1/push-tokens', async (req, res) => {
    const { token } = parse(z.object({ token: z.string().max(300) }).strict(), req.body);
    await db.query('DELETE FROM push_tokens WHERE token=? AND user_id=?', [token, req.user.id]);
    res.status(204).end();
  });
  const prefs = async id => {
    const p = await one('SELECT push,email,sms FROM notification_preferences WHERE user_id=?', [id]);
    return p ?? { push: true, email: true, sms: false };
  };
  app.get('/api/v1/notification-preferences', async (req, res) =>
    res.json({ preferences: await prefs(req.user.id) }),
  );
  app.put('/api/v1/notification-preferences', async (req, res) => {
    const input = parse(preferences, req.body);
    const next = { ...(await prefs(req.user.id)), ...input };
    await db.query(
      'INSERT INTO notification_preferences(user_id,push,email,sms,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET push=EXCLUDED.push,email=EXCLUDED.email,sms=EXCLUDED.sms,updated_at=EXCLUDED.updated_at',
      [req.user.id, next.push, next.email, next.sms, now()],
    );
    res.json({ preferences: next });
  });
}
