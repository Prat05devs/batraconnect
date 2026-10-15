/** Counts of work waiting on the signed-in officer or the minister's office, for the app's Today screen.
 * (Administration tasks live in the web dashboard's Overview instead.) */
export function routes(app, { db, roles, now }) {
  const OPEN = `status NOT IN ('Resolved','Closed')`;
  const inScope = `EXISTS (SELECT 1 FROM staff_jurisdictions j WHERE j.user_id=? AND j.district=complaints.district AND j.category=complaints.category)`;
  const count = async (sql, values) => (await db.query(sql, values))[0].n;
  app.get('/api/v1/work', roles('field', 'department', 'executive', 'admin'), async (req, res) => {
    const user = req.user,
      time = now(),
      soon = new Date(Date.now() + 24 * 3600000).toISOString();
    const startOfDay = new Date(
      new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00+05:30',
    );
    const dayStart = startOfDay.toISOString(),
      dayEnd = new Date(startOfDay.getTime() + 86400000).toISOString();
    const tasks = {};
    if (user.role === 'field') {
      const mine = 'assigned_to=?';
      tasks.toStart = await count(
        `SELECT COUNT(*)::int AS n FROM complaints WHERE ${mine} AND status IN ('Assigned','Reopened')`,
        [user.id],
      );
      tasks.inProgress = await count(
        `SELECT COUNT(*)::int AS n FROM complaints WHERE ${mine} AND status='In progress'`,
        [user.id],
      );
      tasks.overdue = await count(
        `SELECT COUNT(*)::int AS n FROM complaints WHERE ${mine} AND ${OPEN} AND due_at<?`,
        [user.id, time],
      );
      tasks.dueSoon = await count(
        `SELECT COUNT(*)::int AS n FROM complaints WHERE ${mine} AND ${OPEN} AND due_at>=? AND due_at<?`,
        [user.id, time, soon],
      );
    }
    if (['department', 'admin', 'executive'].includes(user.role)) {
      const [scope, values] = user.role === 'department' ? [inScope, [user.id]] : ['1=1', []];
      tasks.toAssign = await count(
        `SELECT COUNT(*)::int AS n FROM complaints WHERE ${scope} AND status='Submitted'`,
        values,
      );
      tasks.reopened = await count(
        `SELECT COUNT(*)::int AS n FROM complaints WHERE ${scope} AND status='Reopened'`,
        values,
      );
      tasks.overdue = await count(
        `SELECT COUNT(*)::int AS n FROM complaints WHERE ${scope} AND ${OPEN} AND due_at<?`,
        [...values, time],
      );
      tasks.escalated = await count(
        `SELECT COUNT(*)::int AS n FROM complaints WHERE ${scope} AND ${OPEN} AND escalation_level>0`,
        values,
      );
      tasks.open = await count(
        `SELECT COUNT(*)::int AS n FROM complaints WHERE ${scope} AND ${OPEN}`,
        values,
      );
      tasks.awaitingCitizen = await count(
        `SELECT COUNT(*)::int AS n FROM complaints WHERE ${scope} AND status='Resolved'`,
        values,
      );
      tasks.ideasToReview = await count(`SELECT COUNT(*)::int AS n FROM ideas WHERE status='Submitted'`, []);
      tasks.appointmentRequests = await count(
        `SELECT COUNT(*)::int AS n FROM appointments a JOIN appointment_slots s ON s.id=a.slot_id WHERE a.status='Requested' AND s.starts_at>?`,
        [time],
      );
      tasks.appointmentsToday = await count(
        `SELECT COUNT(*)::int AS n FROM appointments a JOIN appointment_slots s ON s.id=a.slot_id WHERE a.status='Confirmed' AND s.starts_at>=? AND s.starts_at<?`,
        [dayStart, dayEnd],
      );
      tasks.appointmentsToClose = await count(
        `SELECT COUNT(*)::int AS n FROM appointments a JOIN appointment_slots s ON s.id=a.slot_id WHERE a.status='Confirmed' AND s.ends_at<?`,
        [time],
      );
      tasks.fieldOfficers = await count(
        user.role === 'department'
          ? `SELECT COUNT(DISTINCT u.id)::int AS n FROM users u JOIN staff_jurisdictions j ON j.user_id=u.id WHERE u.role='field' AND u.status='active' AND EXISTS (SELECT 1 FROM staff_jurisdictions m WHERE m.user_id=? AND m.district=j.district AND m.category=j.category)`
          : `SELECT COUNT(*)::int AS n FROM users WHERE role='field' AND status='active'`,
        user.role === 'department' ? [user.id] : [],
      );
    }
    res.json({ role: user.role, tasks });
  });
}
