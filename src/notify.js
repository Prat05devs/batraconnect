import { randomUUID } from 'node:crypto';
import { messages, subjects } from './messages.js';

/** Writes the in-app notification and queues push/email/SMS copies in the same transaction as the change that caused it. */
export function createNotifier() {
  const now = () => new Date().toISOString();
  async function outbox(
    query,
    { userId = null, channel, destination, subject, body, data = {}, sensitive = false },
  ) {
    await query(
      'INSERT INTO outbox(id,user_id,channel,destination,subject,body,data,sensitive,status,attempts,next_attempt_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        randomUUID(),
        userId,
        channel,
        destination,
        subject,
        body,
        JSON.stringify(data),
        sensitive,
        'pending',
        0,
        now(),
        now(),
      ],
    );
  }
  async function notify(query, userId, text, link) {
    const [user] = await query(
      'SELECT u.id,u.email,u.email_verified_at,u.phone,u.phone_verified_at,u.status,u.language,p.push,p.email AS by_email,p.sms FROM users u LEFT JOIN notification_preferences p ON p.user_id=u.id WHERE u.id=?',
      [userId],
    );
    if (!user || user.status !== 'active') return;
    const language = user.language === 'hi' ? 'hi' : 'en',
      message = text[language],
      subject = subjects.update[language];
    await query('INSERT INTO notifications(id,user_id,link,message,read_at,created_at) VALUES(?,?,?,?,?,?)', [
      randomUUID(),
      userId,
      link,
      message,
      null,
      now(),
    ]);
    if (user.push ?? true)
      for (const { token } of await query('SELECT token FROM push_tokens WHERE user_id=?', [userId]))
        await outbox(query, {
          userId,
          channel: 'push',
          destination: token,
          subject,
          body: message,
          data: { link },
        });
    if ((user.by_email ?? true) && user.email_verified_at)
      await outbox(query, { userId, channel: 'email', destination: user.email, subject, body: message });
    if ((user.sms ?? false) && user.phone && user.phone_verified_at)
      await outbox(query, { userId, channel: 'sms', destination: user.phone, subject, body: message });
  }
  /** Notifies every active user matching the SQL condition, e.g. department staff covering a complaint. */
  async function notifyMany(query, sql, values, text, link) {
    for (const { id } of await query(sql, values)) await notify(query, id, text, link);
  }
  async function sendCode(query, user, purpose, destination, value, ttlMinutes, channel) {
    const language = user.language === 'hi' ? 'hi' : 'en';
    await outbox(query, {
      userId: user.id,
      channel,
      destination,
      subject: subjects.code[language],
      body: messages.code(purpose, value, ttlMinutes)[language],
      sensitive: true,
    });
  }
  return { notify, notifyMany, outbox, sendCode };
}
