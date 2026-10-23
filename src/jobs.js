import { randomUUID } from 'node:crypto';
import { messages } from './messages.js';

const iso = date => date.toISOString();
const MAX_ATTEMPTS = 6;

/** Background work. Every step is conditional on current state, so concurrent replicas cannot double-send or double-escalate. */
export function createJobs({ db, transports, notifier, store, options = {}, now = () => new Date() }) {
  async function record(name, fn) {
    const started = iso(now());
    await db.query(
      'INSERT INTO job_runs(name,last_started_at,runs) VALUES(?,?,1) ON CONFLICT(name) DO UPDATE SET last_started_at=EXCLUDED.last_started_at,runs=job_runs.runs+1',
      [name, started],
    );
    try {
      const result = await fn();
      await db.query('UPDATE job_runs SET last_finished_at=?,last_error=NULL WHERE name=?', [
        iso(now()),
        name,
      ]);
      return result;
    } catch (e) {
      await db.query('UPDATE job_runs SET last_error=? WHERE name=?', [
        String(e.message).slice(0, 500),
        name,
      ]);
      throw e;
    }
  }
  async function deliver() {
    const claimed = await db.query(
      `UPDATE outbox SET attempts=attempts+1,next_attempt_at=? WHERE id IN (SELECT id FROM outbox WHERE status='pending' AND next_attempt_at<=? ORDER BY next_attempt_at LIMIT 100 FOR UPDATE SKIP LOCKED) RETURNING *`,
      [iso(new Date(now().getTime() + 5 * 60000)), iso(now())],
    );
    let sent = 0;
    for (const row of claimed) {
      const transport = (typeof transports === 'function' ? await transports() : transports)[row.channel];
      if (!transport) {
        await db.query(
          `UPDATE outbox SET status='skipped',last_error=?,body=CASE WHEN sensitive THEN NULL ELSE body END WHERE id=?`,
          [`No ${row.channel} provider configured`, row.id],
        );
        continue;
      }
      const result = await transport({
        destination: row.destination,
        subject: row.subject,
        body: row.body,
        data: row.data,
      }).catch(e => ({ ok: false, permanent: false, error: e.message }));
      if (result.ok) {
        sent++;
        await db.query(
          `UPDATE outbox SET status='sent',sent_at=?,last_error=NULL,body=CASE WHEN sensitive THEN NULL ELSE body END WHERE id=?`,
          [iso(now()), row.id],
        );
        continue;
      }
      if (result.unregister) await db.query('DELETE FROM push_tokens WHERE token=?', [row.destination]);
      const final = result.permanent || row.attempts >= MAX_ATTEMPTS;
      const retryAt = new Date(now().getTime() + Math.min(2 ** row.attempts * 30000, 6 * 3600000));
      await db.query(
        `UPDATE outbox SET status=?,last_error=?,next_attempt_at=?,body=CASE WHEN ? AND sensitive THEN NULL ELSE body END WHERE id=?`,
        [
          final ? 'failed' : 'pending',
          String(result.error ?? 'Delivery failed').slice(0, 500),
          iso(retryAt),
          final,
          row.id,
        ],
      );
    }
    return { claimed: claimed.length, sent };
  }
  async function escalate() {
    const due = await db.query(
      `SELECT c.*,k.sla_hours FROM complaints c JOIN complaint_categories k ON k.name=c.category WHERE c.status NOT IN ('Resolved','Closed') AND c.due_at<? AND c.escalation_level<3 ORDER BY c.due_at LIMIT 200`,
      [iso(now())],
    );
    let escalated = 0;
    for (const row of due) {
      const level = Math.min(
        3,
        Math.floor((now().getTime() - Date.parse(row.due_at)) / (row.sla_hours * 3600000)) + 1,
      );
      if (level <= row.escalation_level) continue;
      await db.transaction(async query => {
        const [updated] = await query(
          'UPDATE complaints SET escalation_level=? WHERE id=? AND escalation_level<? RETURNING *',
          [level, row.id, level],
        );
        if (!updated) return;
        escalated++;
        await query(
          'INSERT INTO complaint_events(id,complaint_id,actor_id,action,status,note,created_at) VALUES(?,?,?,?,?,?,?)',
          [
            randomUUID(),
            row.id,
            null,
            'escalated',
            row.status,
            `Service deadline passed. Escalation level ${level}.`,
            iso(now()),
          ],
        );
        const text = messages.complaintEscalated(row.reference, level),
          link = `complaint:${row.id}`;
        await notifier.notifyMany(
          query,
          `SELECT DISTINCT u.id FROM users u JOIN staff_jurisdictions j ON j.user_id=u.id WHERE u.status='active' AND u.role='department' AND j.district=? AND j.category=?`,
          [row.district, row.category],
          text,
          link,
        );
        if (row.assigned_to) await notifier.notify(query, row.assigned_to, text, link);
        if (level >= 2)
          await notifier.notifyMany(
            query,
            `SELECT id FROM users WHERE status='active' AND role='admin'`,
            [],
            text,
            link,
          );
        if (level >= 3)
          await notifier.notifyMany(
            query,
            `SELECT id FROM users WHERE status='active' AND role='executive'`,
            [],
            text,
            link,
          );
      });
    }
    return { escalated };
  }
  async function remind() {
    const soon = await db.query(
      `SELECT a.id,a.reference,a.citizen_id,s.starts_at,s.location FROM appointments a JOIN appointment_slots s ON s.id=a.slot_id WHERE a.status='Confirmed' AND a.reminder_sent_at IS NULL AND s.starts_at>? AND s.starts_at<=?`,
      [iso(now()), iso(new Date(now().getTime() + 24 * 3600000))],
    );
    for (const row of soon)
      await db.transaction(async query => {
        const [claimed] = await query(
          'UPDATE appointments SET reminder_sent_at=? WHERE id=? AND reminder_sent_at IS NULL RETURNING id',
          [iso(now()), row.id],
        );
        if (claimed)
          await notifier.notify(
            query,
            row.citizen_id,
            messages.appointmentReminder(
              row.reference,
              new Date(row.starts_at).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'short',
              }) + ' IST',
              row.location,
            ),
            `appointment:${row.id}`,
          );
      });
    return { reminded: soon.length };
  }
  // A file that cannot be deleted is logged rather than failing the cleanup; the database row is already gone.
  const removeFile = filename =>
    store
      .delete(filename)
      .catch(e => console.error(JSON.stringify({ job: 'cleanup', file: filename, error: e.message })));
  async function cleanup() {
    const cutoff = iso(new Date(now().getTime() - 24 * 3600000));
    await db.query('DELETE FROM sessions WHERE expires_at<?', [iso(now())]);
    await db.query('DELETE FROM one_time_codes WHERE expires_at<?', [cutoff]);
    await db.query('DELETE FROM rate_limits WHERE reset_at<now()');
    await db.query(`DELETE FROM outbox WHERE status IN ('sent','skipped','failed') AND created_at<?`, [
      iso(new Date(now().getTime() - 30 * 86400000)),
    ]);
    // Security records (who did what, from which address) are kept for one year, as the privacy policy states.
    await db.query('DELETE FROM audit_log WHERE created_at<?', [
      iso(new Date(now().getTime() - 365 * 86400000)),
    ]);
    const orphans = await db.query(
      'DELETE FROM media WHERE complaint_id IS NULL AND content_id IS NULL AND created_at<? AND id NOT IN (SELECT unnest(media_ids) FROM complaint_events) RETURNING filename',
      [cutoff],
    );
    for (const { filename } of orphans) await removeFile(filename);
    let redacted = 0;
    if (options.retentionDays > 0) {
      const old = iso(new Date(now().getTime() - options.retentionDays * 86400000));
      const rows = await db.query(
        `UPDATE complaints SET title='[Removed]',description='[Removed under the retention policy]',locality='[Removed]',latitude=NULL,longitude=NULL WHERE status IN ('Resolved','Closed') AND updated_at<? AND description<>'[Removed under the retention policy]' RETURNING id`,
        [old],
      );
      for (const { id } of rows)
        for (const { filename } of await db.query(
          'DELETE FROM media WHERE complaint_id=? RETURNING filename',
          [id],
        ))
          await removeFile(filename);
      redacted = rows.length;
    }
    return { orphans: orphans.length, redacted };
  }
  const steps = { deliver, escalate, remind, cleanup };
  async function runAll() {
    const results = {};
    for (const [name, fn] of Object.entries(steps)) {
      try {
        results[name] = await record(name, fn);
      } catch (e) {
        results[name] = { error: e.message };
      }
    }
    return results;
  }
  function start(intervalSeconds) {
    let timer,
      running = false,
      stopped = false;
    const tick = async () => {
      if (running || stopped) return;
      running = true;
      try {
        const r = await runAll();
        for (const [name, value] of Object.entries(r))
          if (value?.error) console.error(JSON.stringify({ job: name, error: value.error }));
      } finally {
        running = false;
        if (!stopped) timer = setTimeout(tick, intervalSeconds * 1000);
      }
    };
    timer = setTimeout(tick, 2000);
    return async () => {
      stopped = true;
      clearTimeout(timer);
      while (running) await new Promise(r => setTimeout(r, 100));
    };
  }
  return { ...steps, runAll, start };
}
