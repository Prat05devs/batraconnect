import { createDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
// Runs delivery, escalation, reminders and cleanup once (for cron-based hosts with RUN_JOBS=false).
const options = config();
const db = await createDatabase(options);
try {
  const app = await createApp({ ...options, db });
  console.log(JSON.stringify(await app.locals.jobs.runAll()));
} finally {
  await db.close();
}
