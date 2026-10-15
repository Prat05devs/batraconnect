import { createDatabase } from './db.js';
import { createApp } from './app.js';
import { config } from './config.js';
const options = config();
const db = await createDatabase(options);
const app = await createApp({ ...options, db, production: options.production });
const stopJobs = options.jobs ? app.locals.jobs.start(options.jobIntervalSeconds) : async () => {};
const server = app.listen(options.port, options.host, () =>
  console.log(
    `Batra Connect API listening on http://${options.host}:${options.port} (${db.engine}, jobs ${options.jobs ? 'on' : 'off'})`,
  ),
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, () => {
    server.close(async () => {
      await stopJobs();
      await db.close();
      process.exit(0);
    });
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), 10000).unref();
  });
